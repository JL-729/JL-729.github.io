# Weiyu B2 Worker 部署说明

## 概述

这是 Weiyu 网课视频共享平台的 Cloudflare Worker 后端代码，用于代理 Backblaze B2 存储服务的 API 请求。

## 功能

- 获取 B2 上传 URL
- 获取 B2 下载 URL
- 删除 B2 文件
- 健康检查

## 部署步骤

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 配置环境变量

```bash
wrangler secret put B2_ACCOUNT_ID
# 输入你的 B2 Account ID

wrangler secret put B2_APPLICATION_KEY
# 输入你的 B2 Application Key

wrangler secret put B2_BUCKET_ID
# 输入你的 B2 Bucket ID

wrangler secret put B2_BUCKET_NAME
# 输入你的 B2 Bucket 名称
```

### 4. 部署 Worker

```bash
wrangler deploy
```

## API 接口

### 获取上传 URL

```
GET /api/upload-url
```

响应：
```json
{
  "uploadUrl": "https://...",
  "authorizationToken": "..."
}
```

### 获取下载 URL

```
GET /api/download-url?file=videos/lessonId/filename.mp4
```

响应：
```json
{
  "url": "https://..."
}
```

### 删除文件

```
POST /api/delete-file
Content-Type: application/json

{
  "fileId": "b2_file_id",
  "fileName": "videos/lessonId/filename.mp4"
}
```

响应：
```json
{
  "success": true
}
```

### 健康检查

```
GET /api/health
```

响应：
```json
{
  "status": "ok",
  "service": "weiyu-b2-proxy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 注意事项

- 环境变量通过 `wrangler secret` 设置，不会暴露在代码中
- Worker 自动使用 Cloudflare 的全球 CDN 网络
- 免费版每天有 100,000 次请求额度
