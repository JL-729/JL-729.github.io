// Cloudflare Worker - Backblaze B2 代理服务
// 部署地址: https://simple.32871830.workers.dev

// B2 配置（通过环境变量设置）
const B2_CONFIG = {
    accountId: typeof B2_ACCOUNT_ID !== 'undefined' ? B2_ACCOUNT_ID : '',
    applicationKey: typeof B2_APPLICATION_KEY !== 'undefined' ? B2_APPLICATION_KEY : '',
    bucketId: typeof B2_BUCKET_ID !== 'undefined' ? B2_BUCKET_ID : '',
    bucketName: typeof B2_BUCKET_NAME !== 'undefined' ? B2_BUCKET_NAME : ''
};

// CORS 响应头
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400'
};

// 获取 B2 授权令牌
async function getB2Token() {
    const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: {
            'Authorization': 'Basic ' + btoa(B2_CONFIG.accountId + ':' + B2_CONFIG.applicationKey)
        }
    });
    
    if (!response.ok) {
        throw new Error('B2 authorization failed');
    }
    
    const data = await response.json();
    return {
        token: data.authorizationToken,
        apiUrl: data.apiUrl,
        downloadUrl: data.downloadUrl
    };
}

// 获取上传 URL
async function getUploadUrl(authToken, apiUrl) {
    const response = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bucketId: B2_CONFIG.bucketId })
    });
    
    if (!response.ok) {
        throw new Error('Failed to get upload URL');
    }
    
    return await response.json();
}

// 删除文件
async function deleteFile(authToken, apiUrl, fileId, fileName) {
    const response = await fetch(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
        method: 'POST',
        headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fileId: fileId,
            fileName: fileName
        })
    });
    
    return response.ok;
}

// 主处理函数
export default {
    async fetch(request, env, ctx) {
        // 从环境变量读取配置
        const config = {
            accountId: env.B2_ACCOUNT_ID,
            applicationKey: env.B2_APPLICATION_KEY,
            bucketId: env.B2_BUCKET_ID,
            bucketName: env.B2_BUCKET_NAME
        };
        
        // 更新全局配置
        Object.assign(B2_CONFIG, config);
        
        const url = new URL(request.url);
        
        // 处理 CORS 预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        try {
            // 获取上传 URL 接口
            if (url.pathname === '/api/upload-url' && request.method === 'GET') {
                const auth = await getB2Token();
                const uploadData = await getUploadUrl(auth.token, auth.apiUrl);
                
                return new Response(JSON.stringify({
                    uploadUrl: uploadData.uploadUrl,
                    authorizationToken: uploadData.authorizationToken
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 获取下载 URL 接口
            if (url.pathname === '/api/download-url' && request.method === 'GET') {
                const fileName = url.searchParams.get('file');
                if (!fileName) {
                    return new Response(JSON.stringify({ error: 'File name required' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
                
                const auth = await getB2Token();
                const downloadUrl = `${auth.downloadUrl}/file/${B2_CONFIG.bucketName}/${fileName}`;
                
                return new Response(JSON.stringify({ url: downloadUrl }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 删除文件接口
            if (url.pathname === '/api/delete-file' && request.method === 'POST') {
                const { fileId, fileName } = await request.json();
                const auth = await getB2Token();
                const success = await deleteFile(auth.token, auth.apiUrl, fileId, fileName);
                
                return new Response(JSON.stringify({ success }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 健康检查接口
            if (url.pathname === '/api/health' && request.method === 'GET') {
                return new Response(JSON.stringify({ 
                    status: 'ok', 
                    service: 'weiyu-b2-proxy',
                    timestamp: new Date().toISOString()
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 404 响应
            return new Response(JSON.stringify({ error: 'Not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
            
        } catch (error) {
            return new Response(JSON.stringify({ 
                error: error.message,
                timestamp: new Date().toISOString()
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};
