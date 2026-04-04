/**
 * Backblaze B2 存储管理模块
 * 通过 Cloudflare Worker 代理访问 B2
 */

const WORKER_BASE_URL = 'https://simple.32871830.workers.dev';

// 计算文件的 SHA1 哈希（B2 要求）
async function calculateSHA1(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 上传视频到 B2
 * @param {File} file - 视频文件
 * @param {string} lessonId - 课次ID
 * @param {function} onProgress - 进度回调 (percent)
 * @returns {Promise<Object>} 上传结果
 */
async function uploadVideoToB2(file, lessonId, onProgress = null) {
    try {
        // 1. 获取上传授权
        const authResponse = await fetch(`${WORKER_BASE_URL}/api/upload-url`);
        if (!authResponse.ok) {
            throw new Error('获取上传授权失败');
        }
        const { uploadUrl, authorizationToken } = await authResponse.json();
        
        // 2. 计算 SHA1
        const sha1 = await calculateSHA1(file);
        
        // 3. 上传文件到 B2
        const filePath = `videos/${lessonId}/${Date.now()}_${file.name}`;
        
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': authorizationToken,
                'Content-Type': file.type || 'application/octet-stream',
                'X-Bz-File-Name': encodeURIComponent(filePath),
                'X-Bz-Content-Sha1': sha1,
                'X-Bz-Info-original-name': encodeURIComponent(file.name)
            },
            body: file
        });
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`上传失败: ${errorText}`);
        }
        
        const result = await uploadResponse.json();
        
        return {
            success: true,
            fileId: result.fileId,
            fileName: file.name,
            storagePath: filePath,
            size: file.size,
            formattedSize: formatFileSize(file.size),
            mimeType: file.type,
            uploadTimestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('B2 上传错误:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 获取视频下载 URL
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 下载 URL
 */
async function getVideoDownloadUrl(filePath) {
    try {
        const response = await fetch(
            `${WORKER_BASE_URL}/api/download-url?file=${encodeURIComponent(filePath)}`
        );
        
        if (!response.ok) {
            throw new Error('获取下载链接失败');
        }
        
        const data = await response.json();
        return data.url;
        
    } catch (error) {
        console.error('获取下载 URL 错误:', error);
        return null;
    }
}

/**
 * 删除 B2 文件
 * @param {string} fileId - B2 文件ID
 * @param {string} filePath - 文件路径
 * @returns {Promise<boolean>} 是否成功
 */
async function deleteVideoFromB2(fileId, filePath) {
    try {
        const response = await fetch(`${WORKER_BASE_URL}/api/delete-file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId, fileName: filePath })
        });
        
        if (!response.ok) {
            throw new Error('删除失败');
        }
        
        const data = await response.json();
        return data.success;
        
    } catch (error) {
        console.error('删除 B2 文件错误:', error);
        return false;
    }
}

/**
 * 检查 Worker 服务状态
 * @returns {Promise<boolean>} 是否可用
 */
async function checkB2ServiceHealth() {
    try {
        const response = await fetch(`${WORKER_BASE_URL}/api/health`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

// 导出模块
const B2Storage = {
    uploadVideo: uploadVideoToB2,
    getDownloadUrl: getVideoDownloadUrl,
    deleteVideo: deleteVideoFromB2,
    checkHealth: checkB2ServiceHealth,
    formatFileSize: formatFileSize,
    calculateSHA1: calculateSHA1,
    WORKER_BASE_URL: WORKER_BASE_URL
};

// 兼容 CommonJS 和浏览器环境
if (typeof module !== 'undefined' && module.exports) {
    module.exports = B2Storage;
}

if (typeof window !== 'undefined') {
    window.B2Storage = B2Storage;
}
