# 🌌 星河记忆 (Galaxy Memory)

> 纯前端静态架构的毕业纪念站点 · 基于 WebDAV 数据持久化

## 概述

星河记忆是一个纯前端静态网站，采用 GitHub Pages 部署，通过 **WebDAV** 协议直接在前端浏览器中完成所有数据读写操作（无需后端服务器）。包含以下功能模块：

- **记忆展览馆** - 展示毕业照片/视频（需审核）
- **星图同学录** - 同学信息展示，每人都是一颗星
- **孔明灯表白墙** - 带有银河背景的孔明灯寄语墙
- **管理后台** - 内容审批、账号管理、密码修改
- **权限系统** - Head（总管）/ Admin（管理员）/ User（用户）三级权限

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
4. 在 WebDAV 目录下创建以下结构：
   ```
   /galaxy/
   ├── db/
   │   ├── users.json          # 用户账号数据
   │   ├── confessions.json    # 表白寄语
   │   ├── alumni.json         # 同学录数据
   │   └── metadata.json       # 文件元数据
   └── exhibition/
       ├── pending/             # 待审批内容
       └── approved/            # 已通过内容
   ```

### 2. 配置 WebDAV 连接

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

### 3. 初始化数据

首次使用前，需要在 WebDAV 的 `/db/` 目录下创建初始数据文件。

**创建 `users.json`：**
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

> **注意**：硬编码总管账号 `admin729 / nahida#1027` 直接在前端 `js/config.js` 中验证，不在 `users.json` 中存储。`users.json` 只存储通过管理后台添加的普通账号。

**创建 `confessions.json`：**
```json
[]
```

**创建 `alumni.json`：**
```json
[]
```

**创建 `metadata.json`：**
```json
{}
```

### 4. 部署到 GitHub Pages

1. 将代码推送到 GitHub 仓库
2. 仓库名需为 `<用户名>.github.io`
3. GitHub Pages 设置中选择 `main` 分支，根目录
4. 访问 `https://<用户名>.github.io` 即可

## 权限系统

| 角色 | 权限 |
|------|------|
| **Head (总管)** | 账号管理（增删改）、内容审批、修改密码、打印凭据 |
| **Admin (管理员)** | 内容审批（不能审批自己上传的内容）、修改密码 |
| **User (用户)** | 查看内容、发表寄语、加入同学录、修改密码 |

### 登录方式

1. **硬编码总管**：`admin729` / `nahida#1027`（角色为 Head）
2. **普通账号**：通过管理后台添加的账号，存储在 WebDAV 的 `users.json` 中

## 技术栈

- **HTML/CSS/JavaScript** - 纯前端，无框架依赖
- **Canvas API** - 银河视觉效果（高密度 1px 星星，算法分布形成银河带）
- **WebDAV** - 数据持久化（直接从前端浏览器调用 WebDAV API）
- **GitHub Pages** - 静态部署

## 项目结构

```
/
├── js/
│   ├── config.js      # 用户配置（WebDAV URL 在此填写）
│   ├── storage.js     # WebDAV 客户端模块
│   ├── auth.js        # 前端权限认证模块
│   └── galaxy.js      # 银河视觉引擎
├── index.html          # 首页 - 记忆展览馆
├── confession.html     # 表白墙 - 孔明灯寄语
├── alumni.html         # 同学录 - 星图
├── admin.html          # 管理后台
├── login.html          # 登录页
├── print-tickets.html  # 打印凭据
├── style.css           # 全局样式
└── Weiyu/              # ⚠️ 此文件夹内容不可修改
```

## 注意事项

1. **CORS 配置**：WebDAV 服务器必须允许来自部署域名的跨域请求
2. **凭据可见性**：WebDAV 账号密码在前端代码中可见，请使用低权限的 WebDAV 账号
3. **HTTPS**：WebDAV 服务器请使用 HTTPS，避免密码明文传输
4. **/Weiyu 文件夹**：此文件夹内容为独立子项目，请勿修改其中的文件

## 环境变量（本地开发）

如使用本地开发服务器，可在 `js/config.js` 中直接配置 WebDAV 连接：

```javascript
const GALAXY_WEBDAV_URL = 'https://你的用户名:你的密码@你的服务器.com/路径/';
```

> 💡 没有 `GALAXY_WEBDAV_URL` 环境变量文件，配置直接在 `js/config.js` 中完成。