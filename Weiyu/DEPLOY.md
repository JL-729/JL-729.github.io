# Weiyu 部署文档

本文档介绍 Weiyu 网课视频共享平台的部署方案，包括 LocalStorage 模式和 Backblaze B2 生产模式。

---

## 目录

- [模式一：LocalStorage 模式](#模式一localstorage-模式)
- [模式二：Backblaze B2 生产模式](#模式二backblaze-b2-生产模式)
- [数据存储选择](#数据存储选择)
- [成本估算](#成本估算)
- [安全注意事项](#安全注意事项)
- [故障排查](#故障排查)

---

## 模式一：LocalStorage 模式

### 概述

Weiyu 默认使用浏览器的 LocalStorage 存储所有数据，包括课程、课次、视频、学生名单和管理员密码等。

### 特点

- **优点**：
  - 零配置，开箱即用
  - 无需后端服务器
  - 数据存储在用户浏览器中
  - 完全免费

- **缺点**：
  - 存储空间受限（通常 5-10MB）
  - 数据仅在当前浏览器中可用
  - 无法跨设备同步
  - 清除浏览器数据会丢失所有内容

### 适用场景

- 个人测试和演示
- 单用户使用
- 视频文件较小且数量少
- 无需跨设备访问

### 部署步骤

1. 将整个 `Weiyu` 目录部署到任意静态托管服务（如 GitHub Pages、Netlify、Vercel）
2. 访问部署后的 URL 即可使用

### 存储限制

- Chrome/Firefox/Edge: 约 5-10MB
- Safari: 约 5MB
- 移动浏览器: 约 2-5MB

---

## 模式二：Backblaze B2 生产模式

### 概述

使用 Backblaze B2 云存储服务存储视频文件，解决 LocalStorage 空间限制问题。此模式适合需要存储大量视频文件的生产环境。

### 架构

```
用户浏览器 → Cloudflare Worker → Backblaze B2 API
                ↑
              CORS 代理
            (隐藏 API 密钥)
```

### 步骤 1：创建 Backblaze B2 账户

1. 访问 [https://www.backblaze.com/b2/cloud-storage.html](https://www.backblaze.com/b2/cloud-storage.html)
2. 点击 "Sign Up" 注册账户
3. 填写注册信息：
   - 邮箱地址
   - 密码
   - 账户名称
4. 验证邮箱（检查收件箱并点击验证链接）
5. 完成注册后登录 B2 控制台

### 步骤 2：创建 Bucket

1. 登录 B2 控制台后，点击左侧菜单的 **"Buckets"**
2. 点击 **"Create a Bucket"** 按钮
3. 填写 Bucket 信息：
   - **Bucket Name**（桶名称）：例如 `weiyu-videos`
     - 注意：名称必须全局唯一，建议添加唯一标识
     - 只能包含字母、数字和连字符
   - **Files in Bucket**（文件类型）：选择 **"Private"**（私有）或 **"Public"**（公开）
     - Private: 需要通过 API 访问（推荐，更安全）
     - Public: 文件可通过公开 URL 访问
4. 点击 **"Create a Bucket"** 确认
5. 记录 **Bucket ID**（后续配置需要）

### 步骤 3：获取 API 凭证

1. 在 B2 控制台左侧菜单中，点击 **"App Keys"**
2. 点击 **"Create Application Key"** 按钮
3. 配置应用密钥：
   - **Name**：例如 `weiyu-worker-key`
   - **Allow access to Bucket(s)**：选择步骤 2 创建的 Bucket
   - **Type of Access**：选择 **"Read and Write"**（读写权限）
4. 点击 **"Create New Key"**
5. **重要**：立即复制以下信息（仅显示一次）：
   - **keyID**：类似 `001a...` 的 ID
   - **applicationKey**：长字符串密钥
   - **bucketName**：Bucket 名称
   - **allowedBucketID**：允许访问的 Bucket ID
6. 保存这些信息，配置 Worker 时需要使用

### 步骤 4：创建 Cloudflare Worker 代理

#### 为什么需要 Cloudflare Worker？

Backblaze B2 的 API 密钥不能直接暴露在前端代码中，否则会被恶意使用。Cloudflare Worker 充当代理服务器，隐藏真实密钥并提供安全的 API 接口。

#### 创建 Worker

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击左侧菜单的 **"Workers & Pages"**
3. 点击 **"Create application"**
4. 选择 **"Create Worker"**
5. 命名 Worker（例如 `weiyu-b2-proxy`）
6. 点击 **"Deploy"**

#### 配置 Worker 代码

1. 部署后，点击 **"Edit code"**
2. 删除默认代码，粘贴以下代码：

```javascript
// Cloudflare Worker 作为 B2 代理
const B2_ACCOUNT_ID = 'your-account-id';          // 替换为你的 B2 Account ID
const B2_APPLICATION_KEY = 'your-app-key';        // 替换为你的 Application Key
const B2_BUCKET_ID = 'your-bucket-id';            // 替换为你的 Bucket ID
const B2_BUCKET_NAME = 'your-bucket-name';        // 替换为你的 Bucket 名称

async function getB2Token() {
    const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: {
            'Authorization': 'Basic ' + btoa(B2_ACCOUNT_ID + ':' + B2_APPLICATION_KEY)
        }
    });
    
    if (!response.ok) {
        throw new Error('B2 认证失败: ' + response.statusText);
    }
    
    const data = await response.json();
    return {
        token: data.authorizationToken,
        apiUrl: data.apiUrl,
        downloadUrl: data.downloadUrl
    };
}

async function getUploadUrl(authToken, apiUrl) {
    const response = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bucketId: B2_BUCKET_ID })
    });
    
    if (!response.ok) {
        throw new Error('获取上传 URL 失败: ' + response.statusText);
    }
    
    return await response.json();
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // CORS 头配置
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };
        
        // 处理 OPTIONS 预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        // 获取上传 URL
        if (url.pathname === '/api/upload-url') {
            try {
                const auth = await getB2Token();
                const uploadUrl = await getUploadUrl(auth.token, auth.apiUrl);
                return new Response(JSON.stringify(uploadUrl), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }
        
        // 获取下载 URL
        if (url.pathname === '/api/download-url') {
            const fileName = url.searchParams.get('file');
            
            if (!fileName) {
                return new Response(JSON.stringify({ error: '缺少文件名参数' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            try {
                const auth = await getB2Token();
                const downloadUrl = `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${fileName}`;
                return new Response(JSON.stringify({ url: downloadUrl }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }
        
        // 健康检查
        if (url.pathname === '/health') {
            return new Response('OK', {
                headers: corsHeaders
            });
        }
        
        return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
};
```

3. 替换代码顶部的四个常量：
   - `B2_ACCOUNT_ID`: 你的 B2 Account ID
   - `B2_APPLICATION_KEY`: 你的 Application Key
   - `B2_BUCKET_ID`: 你的 Bucket ID
   - `B2_BUCKET_NAME`: 你的 Bucket 名称

4. 点击 **"Save and Deploy"**

5. 部署成功后，记下 Worker URL（例如：`https://weiyu-b2-proxy.your-account.workers.dev`）

#### 测试 Worker

在浏览器中访问：
```
https://your-worker.workers.dev/health
```

应该返回 "OK"。

### 步骤 5：修改前端代码

#### 5.1 在 js/teacher.js 中添加 B2 上传函数

在 `js/teacher.js` 文件中添加以下代码（建议放在文件末尾）：

```javascript
// 上传视频到 Backblaze B2
async function uploadVideoToB2(file, lessonId) {
    const WORKER_URL = 'https://your-worker.workers.dev';  // 替换为你的 Worker URL
    
    showToast('正在获取上传授权...', 'info');
    
    try {
        // 1. 从 Worker 获取上传 URL
        const response = await fetch(`${WORKER_URL}/api/upload-url`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '获取上传授权失败');
        }
        const { uploadUrl, authorizationToken } = await response.json();
        
        // 2. 计算 SHA1（B2 要求）
        const sha1 = await calculateSHA1(file);
        
        // 3. 上传文件到 B2
        showToast('正在上传视频...', 'info');
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': authorizationToken,
                'Content-Type': file.type || 'application/octet-stream',
                'X-Bz-File-Name': encodeURIComponent(`videos/${lessonId}/${file.name}`),
                'X-Bz-Content-Sha1': sha1,
                'X-Bz-Info-Author': getCurrentTeacher().username,
                'X-Bz-Info-Upload-Time': new Date().toISOString()
            },
            body: file
        });
        
        if (!uploadResponse.ok) {
            throw new Error('上传失败: ' + uploadResponse.statusText);
        }
        
        const result = await uploadResponse.json();
        return {
            fileId: result.fileId,
            fileName: file.name,
            storagePath: `videos/${lessonId}/${file.name}`,
            size: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('B2 上传错误:', error);
        throw error;
    }
}

// 计算 SHA1 哈希值
async function calculateSHA1(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

#### 5.2 修改视频上传逻辑

找到 `js/teacher.js` 中的视频上传函数（通常类似 `handleVideoUpload`），将 LocalStorage 存储改为调用 B2 上传：

**修改前：**
```javascript
async function handleVideoUpload(file, lessonId) {
    // 将文件转为 Base64 存储（不推荐）
    const reader = new FileReader();
    reader.readAsDataURL(file);
    // ... 存储 Base64 数据到 LocalStorage
}
```

**修改后：**
```javascript
async function handleVideoUpload(file, lessonId) {
    try {
        const b2Data = await uploadVideoToB2(file, lessonId);
        
        // 只保存元数据到 LocalStorage
        const video = {
            name: b2Data.fileName,
            size: b2Data.size,
            type: b2Data.mimeType,
            storageType: 'b2',
            storagePath: b2Data.storagePath,
            fileId: b2Data.fileId,
            uploadedAt: b2Data.uploadedAt
        };
        
        saveVideo(video);
        showToast('视频上传成功', 'success');
        return video;
    } catch (error) {
        showToast('上传失败: ' + error.message, 'error');
        throw error;
    }
}
```

#### 5.3 在 js/student.js 中添加 B2 下载函数

在 `js/student.js` 文件中添加以下代码：

```javascript
// 获取视频下载 URL
async function getVideoUrlFromB2(storagePath) {
    const WORKER_URL = 'https://your-worker.workers.dev';  // 替换为你的 Worker URL
    
    try {
        const response = await fetch(`${WORKER_URL}/api/download-url?file=${encodeURIComponent(storagePath)}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '获取下载链接失败');
        }
        const { url } = await response.json();
        return url;
    } catch (error) {
        console.error('B2 下载错误:', error);
        throw error;
    }
}

// 下载视频（根据存储类型选择）
async function downloadVideo(video) {
    let videoUrl;
    
    if (video.storageType === 'b2') {
        // 从 B2 获取下载链接
        videoUrl = await getVideoUrlFromB2(video.storagePath);
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
    
    // 记录下载
    recordDownload(video.lessonId, currentStudentName);
}
```

### 步骤 6：数据存储选择

根据使用场景选择合适的数据存储方案：

#### 方案 A：LocalStorage + B2（单用户）

**架构：**
- 元数据（课程、课次、学生列表）→ LocalStorage
- 视频文件 → Backblaze B2

**优点：**
- 配置简单
- 无需额外数据库
- 适合个人使用

**缺点：**
- 无法跨设备同步
- 多人使用会数据冲突

**适用场景：**
- 单教师使用
- 学生在同一台设备上下载
- 演示和测试

---

#### 方案 B：Supabase + B2（多用户，推荐）

**架构：**
- 元数据（课程、课次、学生列表、下载记录）→ Supabase PostgreSQL
- 视频文件 → Backblaze B2

**优点：**
- 支持多用户
- 数据实时同步
- 支持权限管理
- 数据安全备份

**缺点：**
- 需要配置数据库
- 有学习成本

**适用场景：**
- 多教师协作
- 学生跨设备访问
- 生产环境

**Supabase 集成步骤（简要）：**

1. 创建 Supabase 项目
2. 创建数据表：
   - `courses`（课程）
   - `lessons`（课次）
   - `videos`（视频）
   - `teachers`（教师）
   - `downloads`（下载记录）
3. 启用 Row Level Security (RLS)
4. 在前端使用 Supabase SDK 替换 LocalStorage 操作

**示例代码：**

```javascript
// 使用 Supabase 替代 LocalStorage
const { createClient } = supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 获取课程
async function getCourses() {
    const { data, error } = await supabase
        .from('courses')
        .select('*');
    return data || [];
}

// 保存课程
async function saveCourse(course) {
    const { data, error } = await supabase
        .from('courses')
        .upsert(course);
    return data;
}
```

---

## Backblaze B2 定价

### 当前价格（2024年）

| 项目 | 价格 |
|------|------|
| 存储 | $0.005/GB/月 |
| 下载流量 | 前 1GB/天免费，超出 $0.01/GB |
| 上传流量 | 免费 |
| API 调用 | 前 2500 次/天免费 |
| 类 A 操作 | $0.004/1000 次 |
| 类 B 操作 | $0.0004/1000 次 |

### 免费额度

- 新用户可享受 **10GB 免费存储**
- 前 1GB/天 下载流量免费
- 前 2500 次 API 调用/天免费

---

## 成本估算

### 场景 1：小型课程网站

**假设条件：**
- 视频总大小：50GB
- 每月下载量：100GB
- 学生数量：50人

**月成本：**
- 存储：50GB × $0.005 = **$0.25**（约 1.8 元）
- 下载流量：100GB × $0.01 = **$1.00**（约 7.2 元）
- **总计：$1.25/月（约 9 元）**

### 场景 2：中型教育平台

**假设条件：**
- 视频总大小：200GB
- 每月下载量：500GB
- 学生数量：500人

**月成本：**
- 存储：200GB × $0.005 = **$1.00**（约 7.2 元）
- 下载流量：500GB × $0.01 = **$5.00**（约 36 元）
- **总计：$6.00/月（约 43 元）**

### 场景 3：大型在线学校

**假设条件：**
- 视频总大小：1TB
- 每月下载量：5TB
- 学生数量：5000人

**月成本：**
- 存储：1000GB × $0.005 = **$5.00**（约 36 元）
- 下载流量：5000GB × $0.01 = **$50.00**（约 360 元）
- **总计：$55.00/月（约 396 元）**

> **注意**：Cloudflare Worker 有免费额度（每天 100,000 次请求），对于大多数教育场景完全够用。超出后按 $0.50/百万请求收费。

---

## 安全注意事项

### 1. API 密钥保护

- ❌ **不要**将 B2 Application Key 直接写在前端代码中
- ✅ **必须**使用 Cloudflare Worker 作为代理
- ✅ 定期轮换 API Key

### 2. CORS 配置

在 Worker 中限制 CORS 域名：

```javascript
const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://your-domain.com',  // 替换为你的域名
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

### 3. Bucket 权限

- 生产环境使用 **Private** Bucket
- 仅通过 Worker API 访问文件
- 不要直接暴露 B2 下载 URL

### 4. 速率限制

在 Worker 中添加速率限制，防止滥用：

```javascript
// 使用 Cloudflare KV 存储访问计数
async function checkRateLimit(ip) {
    const key = `rate_limit_${ip}`;
    const count = await env.KV.get(key) || 0;
    
    if (count > 100) {  // 每小时 100 次限制
        return false;
    }
    
    await env.KV.put(key, count + 1, { expirationTtl: 3600 });
    return true;
}
```

### 5. 文件验证

在上传前验证文件类型和大小：

```javascript
function validateVideoFile(file) {
    // 允许的视频类型
    const allowedTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime'
    ];
    
    // 检查类型
    if (!allowedTypes.includes(file.type)) {
        throw new Error('不支持的文件类型');
    }
    
    // 检查大小（例如最大 2GB）
    const MAX_SIZE = 2 * 1024 * 1024 * 1024;  // 2GB
    if (file.size > MAX_SIZE) {
        throw new Error('文件大小超过限制（最大 2GB）');
    }
    
    return true;
}
```

### 6. 管理员密码

- ✅ 修改默认管理员密码
- ✅ 使用强密码（建议 12 位以上，包含大小写字母、数字、特殊字符）
- ✅ 定期更换密码

---

## 故障排查

### 问题 1：上传失败 - "B2 认证失败"

**可能原因：**
- B2 Account ID 或 Application Key 错误
- API Key 已过期或被撤销

**解决方法：**
1. 检查 Worker 中的 B2_ACCOUNT_ID 和 B2_APPLICATION_KEY
2. 登录 B2 控制台确认 API Key 状态
3. 如果密钥已失效，创建新的 Application Key

---

### 问题 2：上传失败 - "SHA1 计算错误"

**可能原因：**
- 文件过大，计算 SHA1 超时
- 浏览器不支持 Web Crypto API

**解决方法：**
1. 对于大文件（>500MB），使用 Web Worker 计算 SHA1
2. 检查浏览器兼容性（现代浏览器均支持）

**优化代码：**

```javascript
// 使用 Web Worker 计算 SHA1（适用于大文件）
function calculateSHA1LargeFile(file) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('sha1-worker.js');
        
        worker.onmessage = (e) => {
            resolve(e.data);
        };
        
        worker.onerror = (e) => {
            reject(new Error('SHA1 计算失败'));
        };
        
        worker.postMessage(file);
    });
}
```

---

### 问题 3：下载失败 - "获取下载链接失败"

**可能原因：**
- Bucket 是 Private 类型，但没有正确签名 URL
- 文件路径错误
- Worker URL 配置错误

**解决方法：**
1. 检查 B2_BUCKET_NAME 是否正确
2. 确认 storagePath 格式（应为 `videos/lessonId/filename.ext`）
3. 测试 Worker API 是否正常：
   ```
   curl https://your-worker.workers.dev/health
   ```

---

### 问题 4：CORS 错误

**错误信息：**
```
Access to fetch at 'https://api.backblazeb2.com/...' from origin 'https://your-site.com' 
has been blocked by CORS policy
```

**可能原因：**
- Worker CORS 配置不正确
- 直接从浏览器调用 B2 API（不安全）

**解决方法：**
1. 确保所有请求都通过 Worker 代理
2. 不要在前端直接调用 B2 API
3. 检查 Worker 的 CORS 头配置

---

### 问题 5：文件大小限制

**错误信息：**
```
Payload too large
```

**可能原因：**
- Cloudflare Worker 请求体限制（默认 100MB）
- B2 单文件限制（最大 5GB）

**解决方法：**
1. 对于 >100MB 文件，使用分片上传
2. 前端添加文件大小限制提示

**分片上传示例：**

```javascript
async function uploadLargeFileInChunks(file, lessonId) {
    const CHUNK_SIZE = 50 * 1024 * 1024;  // 50MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        // 上传分片
        await uploadChunk(chunk, file.name, i, totalChunks);
        
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        showToast(`上传进度: ${progress}%`, 'info');
    }
}
```

---

### 问题 6：Worker 部署失败

**可能原因：**
- 代码语法错误
- 环境变量未配置
- 账户配额限制

**解决方法：**
1. 在本地测试代码语法
2. 检查 Cloudflare 账户状态
3. 查看 Worker 部署日志

---

## 性能优化建议

### 1. 视频压缩

上传前压缩视频以节省存储和流量：

```javascript
async function compressVideo(file) {
    // 使用 FFmpeg.wasm 在浏览器中压缩视频
    const ffmpeg = new FFmpeg();
    await ffmpeg.load();
    
    const input = file.name;
    await ffmpeg.writeFile(input, await fetchFile(file));
    
    await ffmpeg.exec([
        '-i', input,
        '-c:v', 'libx264',
        '-crf', '28',  // 压缩质量（18-28，数字越大质量越低）
        '-preset', 'slow',
        'output.mp4'
    ]);
    
    const data = await ffmpeg.readFile('output.mp4');
    return new Blob([data.buffer], { type: 'video/mp4' });
}
```

### 2. 缓存策略

在 Worker 中添加缓存：

```javascript
// 使用 Cloudflare Cache API
async function getCachedUploadUrl() {
    const cache = caches.default;
    const cacheKey = new Request('https://api.upload-url');
    
    let response = await cache.match(cacheKey);
    if (response) {
        return await response.json();
    }
    
    // 获取新的上传 URL
    const uploadUrl = await getUploadUrl();
    
    // 缓存 1 小时
    await cache.put(cacheKey, new Response(JSON.stringify(uploadUrl)));
    return uploadUrl;
}
```

### 3. CDN 加速

- Cloudflare Worker 自动使用 Cloudflare CDN
- 可以进一步配置 Cloudflare 的 Page Rules 优化缓存

---

## 总结

### 部署建议

| 场景 | 推荐方案 | 成本 |
|------|---------|------|
| 个人测试 | LocalStorage | 免费 |
| 小型课程（<10GB） | LocalStorage | 免费 |
| 中型课程（10-100GB） | LocalStorage + B2 | ~$2/月 |
| 大型平台（>100GB） | Supabase + B2 | ~$10-50/月 |

### 快速开始

1. **测试阶段**：直接使用 LocalStorage 模式
2. **小规模部署**：配置 Backblaze B2 + Cloudflare Worker
3. **生产环境**：集成 Supabase 数据库

### 支持与反馈

如遇到问题，请检查：
1. 控制台错误信息
2. Worker 日志
3. B2 API 状态页面：https://status.backblaze.com/

---

## 快速集成指南

### 一键配置 B2 存储

Weiyu 已经集成了 Cloudflare Worker + Backblaze B2 存储方案。按照以下步骤快速启用：

#### 1. 部署 Cloudflare Worker

```bash
# 进入 worker 目录
cd Weiyu/worker

# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 设置环境变量
wrangler secret put B2_ACCOUNT_ID
wrangler secret put B2_APPLICATION_KEY
wrangler secret put B2_BUCKET_ID
wrangler secret put B2_BUCKET_NAME

# 部署
wrangler deploy
```

#### 2. 更新前端配置

编辑 `js/b2-storage.js`，修改 Worker URL：

```javascript
const WORKER_BASE_URL = 'https://your-worker-name.your-account.workers.dev';
```

#### 3. 切换存储模式

编辑各个 JS 文件中的配置：

```javascript
const USE_B2_STORAGE = true;  // true = 使用 B2，false = 使用 LocalStorage
```

### Worker API 端点

部署后的 Worker 提供以下接口：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/upload-url` | GET | 获取 B2 上传 URL |
| `/api/download-url?file=path` | GET | 获取 B2 下载 URL |
| `/api/delete-file` | POST | 删除 B2 文件 |
| `/api/health` | GET | 健康检查 |

### 数据存储架构

启用 B2 后，数据将按以下方式存储：

```
LocalStorage (浏览器)          Backblaze B2 (云端)
├─ 课程信息                     ├─ videos/
├─ 课次信息                     │  └─ {lessonId}/
├─ 学生名单                     │     ├─ {timestamp}_video1.mp4
├─ 视频元数据 (storagePath)    │     └─ {timestamp}_video2.mp4
│  ├─ storageType: 'b2'
│  ├─ b2FileId: '...'
│  └─ storagePath: 'videos/...'
└─ 下载记录
```

### 混合存储支持

系统支持混合存储模式：
- 新上传的视频 → 自动存储到 B2
- 旧视频（storageType: 'local'）→ 仍然可以从 LocalStorage 访问

### 迁移现有视频

如需将现有 LocalStorage 视频迁移到 B2：

```javascript
// 在浏览器控制台执行
async function migrateToB2() {
    const videos = getVideos().filter(v => v.storageType !== 'b2' && v.data);
    for (const video of videos) {
        // 从 data URL 创建文件
        const res = await fetch(video.data);
        const blob = await res.blob();
        const file = new File([blob], video.name, { type: video.type });
        
        // 上传到 B2
        const result = await B2Storage.uploadVideo(file, video.lessonId);
        if (result.success) {
            // 更新视频记录
            video.storageType = 'b2';
            video.b2FileId = result.fileId;
            video.storagePath = result.storagePath;
            delete video.data; // 删除 base64 数据以节省空间
            saveVideo(video);
        }
    }
}
```

---

## 完整 B2 部署步骤

### 步骤 1：创建 Backblaze B2 账户

1. 访问 [https://www.backblaze.com/b2/cloud-storage.html](https://www.backblaze.com/b2/cloud-storage.html)
2. 点击 "Sign Up" 注册账户
3. 验证邮箱并完成注册
4. 登录 B2 控制台

### 步骤 2：创建 Bucket

1. 点击左侧菜单的 **"Buckets"**
2. 点击 **"Create a Bucket"**
3. 配置：
   - **Bucket Name**: `weiyu-videos`（全局唯一）
   - **Files in Bucket**: **Private**（推荐）
4. 记录 **Bucket ID**（如：`abc123def456`）

### 步骤 3：获取 API 凭证

1. 点击左侧菜单的 **"App Keys"**
2. 点击 **"Create Application Key"**
3. 配置：
   - **Name**: `weiyu-app-key`
   - **Allow access to Bucket(s)**: 选择你的 bucket
   - **Type of Access**: **Read and Write**
4. 立即复制 **keyID** 和 **applicationKey**（只显示一次）

### 步骤 4：创建 Cloudflare Worker

#### 4.1 使用 Wrangler CLI 部署（推荐）

```bash
# 进入 worker 目录
cd Weiyu/worker

# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 设置环境变量（交互式输入）
wrangler secret put B2_ACCOUNT_ID
# 输入你的 B2 Account ID（在 B2 控制台右上角显示）

wrangler secret put B2_APPLICATION_KEY
# 输入步骤 3 的 applicationKey

wrangler secret put B2_BUCKET_ID
# 输入步骤 2 的 Bucket ID

wrangler secret put B2_BUCKET_NAME
# 输入步骤 2 的 Bucket Name（如：weiyu-videos）

# 部署
wrangler deploy
```

部署成功后，会显示 Worker URL，例如：
```
https://weiyu-b2-proxy.your-account.workers.dev
```

#### 4.2 或使用 Cloudflare Dashboard 部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击 **"Workers & Pages"** → **"Create application"**
3. 选择 **"Create Worker"**
4. 命名 Worker（如：`weiyu-b2-proxy`）
5. 点击 **"Deploy"** → **"Edit code"**
6. 将 `worker.js` 的内容粘贴到代码编辑器
7. 在 **Settings** → **Variables** 中添加环境变量：
   - `B2_ACCOUNT_ID`
   - `B2_APPLICATION_KEY`
   - `B2_BUCKET_ID`
   - `B2_BUCKET_NAME`
8. 点击 **"Save and Deploy"**

### 步骤 5：配置前端

编辑 `Weiyu/js/b2-storage.js`：

```javascript
const WORKER_BASE_URL = 'https://weiyu-b2-proxy.your-account.workers.dev';
```

确保以下文件中的 `USE_B2_STORAGE = true`：
- `js/teacher.js`
- `js/student.js`
- `js/manage.js`

### 步骤 6：部署前端到 GitHub Pages

```bash
# 将代码推送到 GitHub
git add .
git commit -m "feat: integrate Backblaze B2 storage"
git push origin main

# 在 GitHub 仓库设置中启用 GitHub Pages
# Settings → Pages → Source → Deploy from a branch → main / root
```

### 步骤 7：测试部署

1. 访问 Worker 健康检查端点：
   ```
   https://your-worker.workers.dev/api/health
   ```
   应返回：`{"status":"ok","service":"weiyu-b2-proxy",...}`

2. 访问 GitHub Pages 网站

3. 测试视频上传、预览、下载功能

---

**文档版本**：v2.0  
**最后更新**：2024年4月  
**维护者**：Weiyu Team
