# 🌌 星河记忆 3.0 (Galaxy Memory)

> 纯前端静态架构的毕业纪念站点 · 基于 WebDAV 数据持久化

## 概述

星河记忆是一个纯前端静态网站，采用 GitHub Pages 部署，通过 **WebDAV** 协议直接在前端浏览器中完成所有数据读写操作（无需后端服务器）。包含以下功能模块：

- **记忆展览馆** - 展示毕业照片/视频（需审核）
- **星图同学录 3.0** - 可编辑个性名片、拍照回传、邀请填写、离线打印
- **留言长廊** - 合并表白墙与展览馆，支持图文混排及评论互动
- **小宇宙** - 总管创建私密空间，含独立回忆展和聊天室
- **管理后台** - 内容审批、账号管理、密码修改
- **权限系统** - Head（总管）/ Admin（管理员）/ User（用户）三级权限
- **系统初始化** - `ready.html` 首次运行引导，自动建立目录树

## 快速开始

### 1. WebDAV 服务器准备

你需要一个 WebDAV 服务器来存储数据。推荐以下方案：

- **[AList](https://github.com/AlistGo/alist)** - 推荐，支持多种存储后端，自带 WebDAV 接口
- **InfiniCLOUD** - 支持 WebDAV 的云盘
- **Nginx + WebDAV 模块** - 自建方案
- **NextCloud** - 自带 WebDAV 支持

> ⚠️ **重要**：WebDAV 服务器需要配置 **CORS** 允许来自你的部署域名（如 `https://jl-729.github.io`）的跨域请求。

#### AList 配置示例

1. 部署 AList，设置管理员账号
2. 在 AList 后台开启 WebDAV
3. 创建存储目录（如 `/galaxy`）
4. 确保 AList 的 CORS 配置允许以下方法：
   ```
   GET, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY
   ```
   以及以下 Headers：
   ```
   Authorization, Content-Type, Destination, Depth
   ```

### 2. 自动初始化（推荐）

星河记忆 3.0 新增了自动初始化功能，无需手动创建目录结构：

1. 部署完成后，访问 `https://<你的域名>/ready.html`
2. 输入 WebDAV 地址（格式：`https://用户名:密码@你的服务器.com/路径/`）
3. 点击"测试连接"验证 WebDAV 是否可用
4. 点击"创建目录"自动建立所需目录结构
5. 点击"完成初始化"写入初始数据
6. 系统自动跳转至首页

**初始化完成后，再次访问 `ready.html` 会自动跳转至首页，防止重复初始化。**

### 3. 手动配置方式

编辑项目根目录下的 `js/config.js` 文件：

```javascript
// 将下方的空字符串替换为你的 WebDAV 连接地址
const GALAXY_WEBDAV_URL = 'https://用户名:密码@你的服务器.com/路径/';
```

**URL 格式说明：**

| 组成部分 | 说明 | 示例 |
|---------|------|------|
| `用户名:密码` | WebDAV 认证凭据 | `admin:myPassword123` |
| `你的服务器.com` | WebDAV 服务器域名 | `dav.example.com` |
| `/路径/` | WebDAV 根路径 | `/galaxy/` |

**完整示例：**
```
https://admin:mypassword@alist.example.com/dav/galaxy/
```

> **注意**：WebDAV URL 也支持通过 `ready.html` 存储在 `localStorage` 中，方便零配置部署。

### 4. 手动初始化数据

如果选择手动配置，需要在 WebDAV 根目录下创建以下目录结构：

```
/
├── accounts.json          # 管理员账号（由 ready.html 自动创建）
├── db/
│   ├── users.json         # 用户账号数据
│   ├── confessions.json   # 留言寄语
│   ├── alumni.json        # 同学录数据
│   └── metadata.json      # 文件元数据
├── alumni/
│   └── assets/            # 同学录上传的图片
├── gallery/
│   ├── data.json          # 留言长廊数据
│   └── media/             # 留言媒体文件
├── exhibition/
│   ├── pending/           # 待审批内容
│   └── approved/          # 已通过内容
└── cosmos/                # 小宇宙空间（每个子文件夹为一个空间）
    ├── 空间名/
    │   ├── config.json    # 空间配置
    │   ├── chat.json      # 聊天记录
    │   └── media/         # 空间媒体文件
    └── ...
```

**创建 `accounts.json`（总管账号）：**
```json
[
  {
    "username": "admin729",
    "passwordHash": "sha256-fake-1a2b3c4d",
    "role": "head",
    "createdAt": 1700000000000
  }
]
```

> 硬编码总管账号 `admin729 / nahida#1027` 同时在前端 `js/config.js` 中验证。

### 5. 部署到 GitHub Pages

1. 将代码推送到 GitHub 仓库
2. 仓库名需为 `<用户名>.github.io`
3. GitHub Pages 设置中选择 `main` 分支，根目录
4. 访问 `https://<用户名>.github.io` 即可
5. 首次使用请访问 `https://<用户名>.github.io/ready.html` 进行初始化

## 功能模块详解

### 🌟 同学录 3.0

- **个性名片编辑器**：支持预设渐变背景色（7种主题色）或上传自定义背景图
- **卡片/列表双视图**：切换展示方式
- **拍照回传**：集成摄像头 API，拍照后自动上传至 WebDAV
- **邀请函生成**：一键生成邀请链接，新同学打开直接进入填写界面
- **离线打印**：优化 `@media print` 样式，支持批量打印拍立得样式卡片

### 🎭 留言长廊

- **功能合并**：将原"孔明灯表白墙"与"展览馆"统一为留言长廊
- **图文混排**：发布留言支持文字 + 图片/视频同时上传
- **评论系统**：每条留言支持评论互动，评论数据持久化存储
- **孔明灯视觉**：保留孔明灯动画展示最近的寄语

### 🌌 小宇宙

- **空间管理**：总管（Head）可创建私密空间
- **独立回忆展**：每个空间拥有独立的媒体展览
- **聊天室**：通过轮询读取 `chat.json` 实现轻量级聊天
- **表情支持**：内置常用表情快捷输入

## 权限系统

| 角色 | 权限 |
|------|------|
| **Head (总管)** | 账号管理（增删改）、内容审批、创建小宇宙、修改密码、打印凭据 |
| **Admin (管理员)** | 内容审批、创建小宇宙、修改密码 |
| **User (用户)** | 查看内容、发表留言、加入同学录、发布评论、修改密码 |

### 登录方式

1. **硬编码总管**：`admin729` / `nahida#1027`（角色为 Head）
2. **普通账号**：通过管理后台添加的账号，存储在 WebDAV 的 `users.json` 中

## 技术栈

- **HTML/CSS/JavaScript** - 纯前端，无框架依赖
- **Canvas API** - 银河视觉效果（高密度 1px 星星，算法分布形成银河带）
- **WebDAV** - 数据持久化（直接从前端浏览器调用 WebDAV API）
- **GitHub Pages** - 静态部署
- **CSS3D** - 孔明灯 3D Y 轴旋转动画
- **MediaDevices API** - 摄像头拍照功能

## 项目结构

```
/
├── js/
│   ├── config.js      # 用户配置（WebDAV URL，支持 localStorage 覆盖）
│   ├── storage.js     # WebDAV 客户端模块（含 mkdir、exists 方法）
│   ├── auth.js        # 前端权限认证模块
│   └── galaxy.js      # 银河视觉引擎
├── index.html          # 首页 - 记忆展览馆
├── ready.html          # 🆕 系统初始化引导页
├── alumni.html         # 🆕 同学录 3.0（编辑器/拍照/邀请/打印）
├── gallery.html        # 🆕 留言长廊（图文混排+评论）
├── cosmos.html         # 🆕 小宇宙（私密空间+聊天室）
├── admin.html          # 管理后台
├── login.html          # 登录页
├── print-tickets.html  # 打印凭据
├── style.css           # 全局样式（渐变边框/3D动画/打印优化）
└── Weiyu/              # ⚠️ 此文件夹内容不可修改
```

## 注意事项

1. **CORS 配置**：WebDAV 服务器必须允许来自部署域名的跨域请求，并支持 `MKCOL`、`PROPFIND` 等方法
2. **凭据可见性**：WebDAV 账号密码在前端代码中可见，请使用低权限的 WebDAV 账号
3. **HTTPS**：WebDAV 服务器请使用 HTTPS，避免密码明文传输
4. **初始化安全**：`ready.html` 检测到 `/accounts.json` 存在时自动跳转，防止重复初始化
5. **/Weiyu 文件夹**：此文件夹内容为独立子项目，请勿修改其中的文件
6. **聊天室轮询**：小宇宙聊天室轮询间隔为 4 秒，避免 WebDAV 响应过载

## WebDAV 配置指南

### AList CORS 配置

AList 默认不开放跨域，需要在 AList 的配置文件中添加：

```yaml
cors:
  allow_origins:
    - "https://你的域名.github.io"
    - "http://localhost:8000"  # 本地开发
  allow_methods:
    - "GET"
    - "PUT"
    - "DELETE"
    - "PROPFIND"
    - "MKCOL"
  allow_headers:
    - "Authorization"
    - "Content-Type"
    - "Destination"
    - "Depth"
```

### Nginx WebDAV 配置

```nginx
location /webdav/ {
    root /var/www/webdav;
    dav_methods PUT DELETE MKCOL COPY MOVE;
    create_full_put_path on;
    dav_access user:rw group:rw all:r;
    
    auth_basic "WebDAV";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    add_header 'Access-Control-Allow-Origin' 'https://你的域名.github.io';
    add_header 'Access-Control-Allow-Methods' 'GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Destination, Depth';
}
```

## 本地开发

可在 `js/config.js` 中直接配置 WebDAV 连接，或通过 `ready.html` 页面配置。

```javascript
const GALAXY_WEBDAV_URL = 'https://你的用户名:你的密码@你的服务器.com/路径/';
```

> 💡 WebDAV URL 配置会持久化在 `localStorage` 中，刷新页面后依然有效。
