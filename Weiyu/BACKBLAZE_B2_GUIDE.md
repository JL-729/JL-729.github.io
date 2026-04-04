# Backblaze B2 集成详细指南

本文档提供 Backblaze B2 与 Weiyu 平台集成的详细步骤和最佳实践。

---

## 目录

- [Backblaze B2 简介](#backblaze-b2-简介)
- [账户注册与设置](#账户注册与设置)
- [Bucket 管理](#bucket-管理)
- [API 密钥管理](#api-密钥管理)
- [Cloudflare Worker 配置](#cloudflare-worker-配置)
- [前端集成](#前端集成)
- [高级功能](#高级功能)
- [监控与日志](#监控与日志)
- [常见问题](#常见问题)

---

## Backblaze B2 简介

### 什么是 Backblaze B2？

Backblaze B2 是一款云对象存储服务，提供：

- **低成本**：$0.005/GB/月，比 AWS S3 便宜 80%
- **高可用性**：99.9% 可用性 SLA
- **简单 API**：RESTful API，易于集成
- **全球 CDN**：可与 Cloudflare 结合使用

### B2 vs 其他存储服务

| 特性 | Backblaze B2 | AWS S3 | Google Cloud Storage |
|------|-------------|--------|---------------------|
| 存储价格 | $0.005/GB/月 | $0.023/GB/月 | $0.02/GB/月 |
| 下载价格 | $0.01/GB | $0.09/GB | $0.12/GB |
| 免费额度 | 10GB | 5GB | 5GB |
| API 简洁度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 账户注册与设置

### 步骤 1：注册账户

1. 访问 [https://www.backblaze.com/b2/cloud-storage.html](https://www.backblaze.com/b2/cloud-storage.html)
2. 点击 "Try B2 Cloud Storage Free"
3. 选择注册类型：
   - **Personal**：个人使用
   - **Business**：企业使用
4. 填写信息：
   - 邮箱地址
   - 密码（建议使用密码管理器生成）
   - 国家/地区
5. 同意服务条款
6. 点击 "Create Account"

### 步骤 2：邮箱验证

1. 检查收件箱（包括垃圾邮件文件夹）
2. 找到来自 Backblaze 的验证邮件
3. 点击验证链接
4. 验证成功后自动登录

### 步骤 3：设置双因素认证（推荐）

1. 登录后，点击右上角用户名
2. 选择 "Account Settings"
3. 找到 "Two-Factor Authentication"
4. 选择认证方式：
   - **Authenticator App**（推荐）：Google Authenticator、Authy 等
   - **SMS**：短信验证码
5. 扫描 QR 码或输入手机号
6. 保存恢复码（重要！）

### 步骤 4：配置支付方式（可选）

如需超过免费额度，需配置支付方式：

1. 进入 "Account Settings"
2. 点击 "Payment Method"
3. 选择支付类型：
   - 信用卡
   - PayPal
4. 填写支付信息

> **注意**：B2 按实际使用量计费，不会预扣费用。

---

## Bucket 管理

### 什么是 Bucket？

Bucket 是 B2 中存储文件的容器，类似文件夹。

### 创建 Bucket

1. 登录 B2 控制台
2. 点击左侧菜单 "Buckets"
3. 点击 "Create a Bucket"
4. 填写配置：

   | 配置项 | 说明 | 推荐值 |
   |--------|------|--------|
   | Bucket Name | 桶名称（全局唯一） | `weiyu-videos-{随机后缀}` |
   | Files in Bucket | 文件可见性 | Private |
   | Encryption | 加密设置 | Default |
   | Object Lock | 对象锁定（防删除） | Disabled |

5. 点击 "Create a Bucket"

### Bucket 命名规则

- 长度：6-50 字符
- 字符：小写字母、数字、连字符
- 不能以连字符开头或结尾
- 不能包含连续连字符
- 必须**全局唯一**

**示例：**
- ✅ `weiyu-videos-2024`
- ✅ `my-course-storage`
- ❌ `Weiyu-Videos`（大写）
- ❌ `weiyu--videos`（连续连字符）
- ❌ `-weiyu-videos`（以连字符开头）

### Bucket 权限类型

#### Public Bucket

- **特点**：文件可通过公开 URL 访问
- **优点**：无需签名 URL
- **缺点**：任何人都可以访问文件
- **适用**：公开教育资源

#### Private Bucket（推荐）

- **特点**：必须通过 API 签名访问
- **优点**：安全性高
- **缺点**：每次访问需要签名
- **适用**：付费课程、私有内容

### Bucket 设置

#### 1. 配置生命周期规则

自动删除旧文件：

1. 进入 Bucket 详情页
2. 点击 "Bucket Settings"
3. 选择 "Lifecycle Rules"
4. 添加规则：
   - **规则名称**：`delete-old-videos`
   - **文件前缀**：`videos/`
   - **保留天数**：`365`（1年）
   - **操作**：Delete file

#### 2. 配置 CORS 规则

允许前端跨域访问（推荐通过 Worker 代理，不直接配置）：

如果需要直接从浏览器访问 B2：

```json
{
  "corsRules": [
    {
      "corsRuleName": "weiyu-cors",
      "allowedOrigins": [
        "https://your-domain.com"
      ],
      "allowedOperations": [
        "s3_delete",
        "s3_get",
        "s3_head",
        "s3_post",
        "s3_put"
      ],
      "allowedHeaders": [
        "*"
      ],
      "exposeHeaders": [
        "x-bz-file-id",
        "x-bz-file-name",
        "x-bz-content-sha1"
      ],
      "maxAgeSeconds": 3600
    }
  ]
}
```

---

## API 密钥管理

### API 密钥类型

#### Master Application Key

- **权限**：所有 Bucket 的完全访问
- **用途**：管理操作
- **安全等级**：极高风险
- **建议**：不要在前端使用

#### Restricted Application Key（推荐）

- **权限**：限制到特定 Bucket
- **用途**：日常操作
- **安全等级**：可控
- **建议**：用于 Cloudflare Worker

### 创建 Restricted Application Key

1. 点击左侧菜单 "App Keys"
2. 点击 "Create Application Key"
3. 配置密钥：

   | 配置项 | 说明 | 推荐值 |
   |--------|------|--------|
   | Name | 密钥名称 | `weiyu-worker-key` |
   | Allow access to Bucket(s) | 访问的 Bucket | 选择你的 Bucket |
   | Type of Access | 权限类型 | Read and Write |
   | Duration | 有效期 | 无限制 |
   | IP Restriction | IP 限制 | 空（或填 Worker IP） |
   | Allow List Bucket | 允许列出 Bucket | 不勾选 |

4. 点击 "Create New Key"
5. **重要**：立即复制以下信息：
   ```
   keyID: 001a2b3c4d5e6f7000000001
   applicationKey: K0012a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2
   ```

> ⚠️ **警告**：这些信息只显示一次，之后无法查看！

### API 密钥安全最佳实践

1. **不要**将密钥提交到 Git 仓库
2. **不要**在前端代码中硬编码密钥
3. **使用**环境变量存储密钥
4. **定期**轮换密钥（建议每 90 天）
5. **监控**异常 API 调用

### 轮换 API 密钥

1. 创建新的 Application Key
2. 更新 Worker 中的环境变量
3. 部署 Worker 并测试
4. 确认正常后，删除旧密钥

---

## Cloudflare Worker 配置

### Worker 架构

```
浏览器请求
    ↓
Cloudflare Worker（代理）
    ↓
Backblaze B2 API
```

### 完整 Worker 代码

```javascript
// ============================================
// Weiyu B2 Proxy Worker
// ============================================

// B2 配置（建议使用环境变量）
const B2_CONFIG = {
    accountId: env.B2_ACCOUNT_ID || 'your-account-id',
    appKey: env.B2_APPLICATION_KEY || 'your-app-key',
    bucketId: env.B2_BUCKET_ID || 'your-bucket-id',
    bucketName: env.B2_BUCKET_NAME || 'your-bucket-name'
};

// ============================================
// B2 API 函数
// ============================================

/**
 * 获取 B2 认证令牌
 */
async function getB2Authorization() {
    const credentials = btoa(`${B2_CONFIG.accountId}:${B2_CONFIG.appKey}`);
    
    const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${credentials}`
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`B2 认证失败: ${error.message || response.statusText}`);
    }
    
    const data = await response.json();
    return {
        authorizationToken: data.authorizationToken,
        apiUrl: data.apiUrl,
        downloadUrl: data.downloadUrl,
        allowed: data.allowed
    };
}

/**
 * 获取上传 URL
 */
async function getUploadUrl(auth) {
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bucketId: B2_CONFIG.bucketId
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`获取上传 URL 失败: ${error.message || response.statusText}`);
    }
    
    return await response.json();
}

/**
 * 上传文件到 B2
 */
async function uploadFile(uploadUrl, auth, fileData, fileName, contentType) {
    const sha1 = await calculateSHA1(fileData);
    
    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type': contentType,
            'Content-Length': fileData.size.toString(),
            'X-Bz-File-Name': encodeURIComponent(fileName),
            'X-Bz-Content-Sha1': sha1,
            'X-Bz-Info-Upload-Time': new Date().toISOString()
        },
        body: fileData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`上传失败: ${error.message || response.statusText}`);
    }
    
    return await response.json();
}

/**
 * 计算文件 SHA1
 */
async function calculateSHA1(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 获取文件下载 URL
 */
function getDownloadUrl(auth, fileName) {
    return `${auth.downloadUrl}/file/${B2_CONFIG.bucketName}/${fileName}`;
}

/**
 * 列出文件
 */
async function listFiles(auth, prefix = '', maxFiles = 100) {
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
        method: 'POST',
        headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bucketId: B2_CONFIG.bucketId,
            prefix: prefix,
            maxFileCount: maxFiles
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`列出文件失败: ${error.message || response.statusText}`);
    }
    
    return await response.json();
}

/**
 * 删除文件
 */
async function deleteFile(auth, fileId, fileName) {
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
        method: 'POST',
        headers: {
            'Authorization': auth.authorizationToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fileId: fileId,
            fileName: fileName
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`删除文件失败: ${error.message || response.statusText}`);
    }
    
    return await response.json();
}

// ============================================
// CORS 配置
// ============================================

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',  // 生产环境替换为具体域名
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400'
};

// ============================================
// Worker 主函数
// ============================================

export default {
    async fetch(request, env) {
        // 更新配置
        if (env.B2_ACCOUNT_ID) B2_CONFIG.accountId = env.B2_ACCOUNT_ID;
        if (env.B2_APPLICATION_KEY) B2_CONFIG.appKey = env.B2_APPLICATION_KEY;
        if (env.B2_BUCKET_ID) B2_CONFIG.bucketId = env.B2_BUCKET_ID;
        if (env.B2_BUCKET_NAME) B2_CONFIG.bucketName = env.B2_BUCKET_NAME;
        
        const url = new URL(request.url);
        const method = request.method;
        
        // 处理 OPTIONS 预检请求
        if (method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }
        
        // 路由处理
        try {
            // 健康检查
            if (url.pathname === '/health') {
                return handleHealthCheck();
            }
            
            // 获取上传 URL
            if (url.pathname === '/api/upload-url') {
                return await handleGetUploadUrl();
            }
            
            // 获取下载 URL
            if (url.pathname === '/api/download-url') {
                const fileName = url.searchParams.get('file');
                return await handleGetDownloadUrl(fileName);
            }
            
            // 列出文件
            if (url.pathname === '/api/files') {
                const prefix = url.searchParams.get('prefix') || '';
                return await handleListFiles(prefix);
            }
            
            // 删除文件
            if (url.pathname === '/api/delete') {
                const body = await request.json();
                return await handleDeleteFile(body.fileId, body.fileName);
            }
            
            // 404
            return new Response('Not Found', { 
                status: 404,
                headers: CORS_HEADERS
            });
            
        } catch (error) {
            console.error('Worker error:', error);
            return new Response(JSON.stringify({ 
                error: error.message,
                timestamp: new Date().toISOString()
            }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }
    }
};

// ============================================
// 路由处理函数
// ============================================

function handleHealthCheck() {
    return new Response(JSON.stringify({ 
        status: 'ok',
        service: 'weiyu-b2-proxy',
        timestamp: new Date().toISOString()
    }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
}

async function handleGetUploadUrl() {
    const auth = await getB2Authorization();
    const uploadData = await getUploadUrl(auth);
    
    return new Response(JSON.stringify({
        uploadUrl: uploadData.uploadUrl,
        authorizationToken: uploadData.authorizationToken,
        bucketId: uploadData.bucketId
    }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
}

async function handleGetDownloadUrl(fileName) {
    if (!fileName) {
        return new Response(JSON.stringify({ error: '缺少文件名参数' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
    
    const auth = await getB2Authorization();
    const downloadUrl = getDownloadUrl(auth, fileName);
    
    return new Response(JSON.stringify({ url: downloadUrl }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
}

async function handleListFiles(prefix) {
    const auth = await getB2Authorization();
    const files = await listFiles(auth, prefix);
    
    return new Response(JSON.stringify({
        files: files.files,
        nextFileId: files.nextFileId,
        nextFileName: files.nextFileName
    }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
}

async function handleDeleteFile(fileId, fileName) {
    if (!fileId || !fileName) {
        return new Response(JSON.stringify({ error: '缺少必要参数' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
    
    const auth = await getB2Authorization();
    await deleteFile(auth, fileId, fileName);
    
    return new Response(JSON.stringify({ success: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
}
```

### 设置 Worker 环境变量

1. 在 Cloudflare Dashboard 中，进入 Worker 设置
2. 点击 "Settings" → "Variables and Secrets"
3. 添加以下环境变量：

   | 变量名 | 值 | 说明 |
   |--------|-----|------|
   | `B2_ACCOUNT_ID` | 你的 Account ID | B2 账户 ID |
   | `B2_APPLICATION_KEY` | 你的 Application Key | B2 API 密钥 |
   | `B2_BUCKET_ID` | 你的 Bucket ID | 存储桶 ID |
   | `B2_BUCKET_NAME` | 你的 Bucket 名称 | 存储桶名称 |

4. 点击 "Deploy"

### 测试 Worker

```bash
# 健康检查
curl https://your-worker.workers.dev/health

# 获取上传 URL
curl https://your-worker.workers.dev/api/upload-url

# 获取下载 URL
curl "https://your-worker.workers.dev/api/download-url?file=videos/lesson1/video.mp4"
```

---

## 前端集成

### 安装依赖

Weiyu 使用纯 JavaScript，无需额外依赖。

### 配置 Worker URL

创建 `js/config.js` 文件：

```javascript
const CONFIG = {
    // Cloudflare Worker URL
    WORKER_URL: 'https://your-worker.workers.dev',
    
    // 存储模式：'local' | 'b2'
    STORAGE_MODE: 'b2',
    
    // 最大文件大小（字节）
    MAX_FILE_SIZE: 5 * 1024 * 1024 * 1024,  // 5GB
    
    // 允许的视频类型
    ALLOWED_VIDEO_TYPES: [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-matroska'
    ]
};
```

### 上传视频到 B2

```javascript
/**
 * 上传视频到 Backblaze B2
 * @param {File} file - 视频文件
 * @param {string} lessonId - 课次 ID
 * @returns {Promise<Object>} 上传结果
 */
async function uploadVideoToB2(file, lessonId) {
    // 验证文件
    validateVideoFile(file);
    
    const fileName = `videos/${lessonId}/${Date.now()}-${file.name}`;
    const contentType = file.type || 'application/octet-stream';
    
    try {
        // 1. 获取上传 URL
        showToast('正在获取上传授权...', 'info');
        const uploadUrlData = await fetch(`${CONFIG.WORKER_URL}/api/upload-url`)
            .then(res => res.json());
        
        // 2. 计算 SHA1
        const sha1 = await calculateSHA1(file);
        
        // 3. 上传文件
        showToast('正在上传视频...', 'info');
        const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': uploadUrlData.authorizationToken,
                'Content-Type': contentType,
                'X-Bz-File-Name': encodeURIComponent(fileName),
                'X-Bz-Content-Sha1': sha1,
                'X-Bz-Info-Upload-Time': new Date().toISOString(),
                'X-Bz-Info-Lesson-Id': lessonId
            },
            body: file
        });
        
        if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            throw new Error(error.message || '上传失败');
        }
        
        const result = await uploadResponse.json();
        
        // 4. 保存元数据
        const videoMetadata = {
            id: generateId(),
            name: file.name,
            size: file.size,
            type: contentType,
            storageType: 'b2',
            storagePath: fileName,
            fileId: result.fileId,
            bucketId: result.bucketId,
            uploadedAt: new Date().toISOString()
        };
        
        saveVideo(videoMetadata);
        
        showToast('视频上传成功！', 'success');
        return videoMetadata;
        
    } catch (error) {
        console.error('上传错误:', error);
        showToast('上传失败: ' + error.message, 'error');
        throw error;
    }
}

/**
 * 计算文件 SHA1
 */
async function calculateSHA1(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 验证视频文件
 */
function validateVideoFile(file) {
    // 检查类型
    if (!CONFIG.ALLOWED_VIDEO_TYPES.includes(file.type)) {
        throw new Error(`不支持的视频类型: ${file.type}`);
    }
    
    // 检查大小
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        throw new Error(`文件过大：最大 ${formatFileSize(CONFIG.MAX_FILE_SIZE)}`);
    }
    
    return true;
}
```

### 下载视频

```javascript
/**
 * 下载视频
 * @param {Object} video - 视频元数据对象
 */
async function downloadVideo(video) {
    try {
        let videoUrl;
        
        if (video.storageType === 'b2') {
            // 从 B2 获取下载 URL
            showToast('正在获取下载链接...', 'info');
            const response = await fetch(
                `${CONFIG.WORKER_URL}/api/download-url?file=${encodeURIComponent(video.storagePath)}`
            );
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '获取下载链接失败');
            }
            
            const data = await response.json();
            videoUrl = data.url;
        } else if (video.data) {
            // LocalStorage 模式（兼容旧数据）
            videoUrl = video.data;
        } else {
            throw new Error('无效的视频数据');
        }
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = video.name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('下载开始', 'success');
        
    } catch (error) {
        console.error('下载错误:', error);
        showToast('下载失败: ' + error.message, 'error');
    }
}
```

### 上传进度显示

```javascript
/**
 * 带进度的上传（使用 XMLHttpRequest）
 */
function uploadVideoWithProgress(file, lessonId, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const progress = (e.loaded / e.total) * 100;
                if (onProgress) onProgress(progress);
            }
        });
        
        xhr.addEventListener('load', async () => {
            if (xhr.status === 200) {
                const result = JSON.parse(xhr.responseText);
                resolve(result);
            } else {
                reject(new Error('上传失败'));
            }
        });
        
        xhr.addEventListener('error', () => {
            reject(new Error('网络错误'));
        });
        
        // 先获取上传 URL
        fetch(`${CONFIG.WORKER_URL}/api/upload-url`)
            .then(res => res.json())
            .then(uploadUrlData => {
                // 计算 SHA1
                return calculateSHA1(file).then(sha1 => {
                    // 上传文件
                    xhr.open('POST', uploadUrlData.uploadUrl);
                    xhr.setRequestHeader('Authorization', uploadUrlData.authorizationToken);
                    xhr.setRequestHeader('Content-Type', file.type);
                    xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(`videos/${lessonId}/${file.name}`));
                    xhr.setRequestHeader('X-Bz-Content-Sha1', sha1);
                    xhr.send(file);
                });
            })
            .catch(reject);
    });
}

// 使用示例
uploadVideoWithProgress(file, lessonId, (progress) => {
    console.log(`上传进度: ${progress.toFixed(1)}%`);
    showToast(`上传中: ${progress.toFixed(1)}%`, 'info');
});
```

---

## 高级功能

### 1. 分片上传

对于大于 100MB 的文件，使用 B2 分片上传 API：

```javascript
/**
 * 分片上传大文件
 * @param {File} file - 文件
 * @param {string} lessonId - 课次 ID
 * @param {Function} onProgress - 进度回调
 */
async function uploadLargeFile(file, lessonId, onProgress) {
    const MIN_PART_SIZE = 5 * 1024 * 1024;  // 5MB
    const RECOMMENDED_PART_SIZE = 100 * 1024 * 1024;  // 100MB
    const MAX_PARTS = 10000;
    
    // 计算分片大小
    const fileSize = file.size;
    let partSize = RECOMMENDED_PART_SIZE;
    
    // 确保分片不超过最大数量
    while (Math.ceil(fileSize / partSize) > MAX_PARTS) {
        partSize *= 2;
    }
    
    const totalParts = Math.ceil(fileSize / partSize);
    
    try {
        // 1. 开始大文件上传
        const auth = await getB2Authorization();
        const startResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_start_large_file`, {
            method: 'POST',
            headers: {
                'Authorization': auth.authorizationToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketId: B2_CONFIG.bucketId,
                fileName: `videos/${lessonId}/${file.name}`,
                contentType: file.type
            })
        });
        
        const { fileId } = await startResponse.json();
        
        // 2. 上传各个分片
        const partSha1Array = [];
        
        for (let i = 0; i < totalParts; i++) {
            const start = i * partSize;
            const end = Math.min(start + partSize, fileSize);
            const partNumber = i + 1;
            const partData = file.slice(start, end);
            
            // 获取分片上传 URL
            const uploadUrlData = await getUploadUrl(auth);
            
            // 上传分片
            const sha1 = await calculateSHA1(partData);
            await fetch(uploadUrlData.uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': uploadUrlData.authorizationToken,
                    'Content-Type': file.type,
                    'X-Bz-File-Name': encodeURIComponent(`videos/${lessonId}/${file.name}`),
                    'X-Bz-Content-Sha1': sha1,
                    'X-Bz-Part-Number': partNumber.toString()
                },
                body: partData
            });
            
            partSha1Array.push(sha1);
            
            // 更新进度
            const progress = ((i + 1) / totalParts) * 100;
            if (onProgress) onProgress(progress);
        }
        
        // 3. 完成大文件上传
        await fetch(`${auth.apiUrl}/b2api/v2/b2_finish_large_file`, {
            method: 'POST',
            headers: {
                'Authorization': auth.authorizationToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileId: fileId,
                partSha1Array: partSha1Array
            })
        });
        
        return { fileId, fileName: file.name };
        
    } catch (error) {
        console.error('分片上传失败:', error);
        throw error;
    }
}
```

### 2. 取消上传

```javascript
/**
 * 可取消的上传
 */
class CancellableUpload {
    constructor(file, lessonId) {
        this.file = file;
        this.lessonId = lessonId;
        this.controller = new AbortController();
        this.uploadPromise = null;
    }
    
    async start() {
        this.uploadPromise = this._doUpload();
        return this.uploadPromise;
    }
    
    async _doUpload() {
        // 实现上传逻辑，使用 this.controller.signal
    }
    
    cancel() {
        this.controller.abort();
    }
}

// 使用
const upload = new CancellableUpload(file, lessonId);
upload.start();

// 取消
upload.cancel();
```

### 3. 断点续传

```javascript
/**
 * 断点续传上传
 */
async function resumableUpload(file, lessonId) {
    const CHUNK_SIZE = 50 * 1024 * 1024;  // 50MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    // 从 LocalStorage 获取已上传的分片
    const uploadedChunks = JSON.parse(
        localStorage.getItem(`upload_${file.name}`) || '[]'
    );
    
    for (let i = 0; i < totalChunks; i++) {
        if (uploadedChunks.includes(i)) {
            continue;  // 跳过已上传的分片
        }
        
        // 上传分片
        await uploadChunk(file, i, CHUNK_SIZE);
        
        // 记录已上传的分片
        uploadedChunks.push(i);
        localStorage.setItem(
            `upload_${file.name}`,
            JSON.stringify(uploadedChunks)
        );
    }
    
    // 上传完成后清除记录
    localStorage.removeItem(`upload_${file.name}`);
}
```

---

## 监控与日志

### Cloudflare Analytics

1. 登录 Cloudflare Dashboard
2. 进入 Worker 详情
3. 查看 "Analytics" 标签：
   - 请求数量
   - 响应时间
   - 错误率
   - 流量

### B2 Usage Dashboard

1. 登录 B2 控制台
2. 点击 "Buckets"
3. 选择 Bucket
4. 查看 "Usage" 标签：
   - 存储使用量
   - API 调用次数
   - 下载流量

### 自定义日志记录

在 Worker 中添加日志：

```javascript
// 记录到 Cloudflare Workers Logs
console.log('[UPLOAD]', {
    fileName: fileName,
    size: file.size,
    timestamp: new Date().toISOString()
});

// 发送到外部日志服务
async function logToExternal(data) {
    await fetch('https://your-log-service.com/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}
```

---

## 常见问题

### Q1: 上传速度慢怎么办？

**A:** 
- 检查网络连接
- 使用分片上传
- 考虑使用 CDN 加速

### Q2: 如何降低成本？

**A:** 
- 启用生命周期规则自动删除旧文件
- 压缩视频文件
- 使用 Cloudflare Cache 减少下载流量

### Q3: 能否直接从浏览器访问 B2？

**A:** 
- 可以，但不推荐（安全性低）
- 建议使用 Cloudflare Worker 代理

### Q4: B2 数据中心在哪里？

**A:** 
- 主要在美国西部
- 中国访问可能有延迟
- 可结合 Cloudflare CDN 加速

### Q5: 如何迁移到其他存储服务？

**A:** 
- 使用 B2 的导出工具
- 或编写脚本批量下载后上传到新服务

---

## 附录

### B2 API 端点

| 操作 | 端点 |
|------|------|
| 认证 | `b2_authorize_account` |
| 获取上传 URL | `b2_get_upload_url` |
| 列出文件 | `b2_list_file_names` |
| 删除文件 | `b2_delete_file_version` |
| 开始大文件上传 | `b2_start_large_file` |
| 完成大文件上传 | `b2_finish_large_file` |

### 有用的工具

- **b2 CLI**: B2 官方命令行工具
- **rclone**: 支持多种云存储的同步工具
- **Cyberduck**: 图形化 S3/B2 客户端

### 参考资源

- [B2 官方文档](https://www.backblaze.com/b2/docs/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Weiyu 部署文档](./DEPLOY.md)

---

**文档版本**：v1.0  
**最后更新**：2024年4月
