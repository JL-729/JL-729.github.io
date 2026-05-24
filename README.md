# 🌟 星河记忆 (Star River Memory)

> 基于 Cloudflare Pages + WebDAV 架构的毕业纪念网站

包含 **同学录**、**电子展览馆**、**表白墙** 三大功能模块，支持账号登录及后台管理。

---

## 📋 功能特性

- **📖 同学录** - 留下联系方式与祝福，让友谊永不散场
- **🖼️ 电子展览馆** - 展示作品与回忆，上传图片和描述
- **💌 表白墙** - 匿名或实名表白，青春不留遗憾
- **🔐 账号系统** - 登录注册，管理员后台管理
- **🖨️ 打印账号** - 一键打印带账号密码的纸条，方便分发
- **☁️ WebDAV 存储** - 数据存储在 WebDAV 服务器（如 AList），持久化可靠

---

## 🚀 部署指南

### 环境要求

- Cloudflare 账号
- WebDAV 服务器（推荐 [AList](https://github.com/AlistGo/alist)）
- Node.js (本地开发)

### 部署到 Cloudflare Pages

1. **Fork 或克隆本项目到 GitHub**

2. **在 Cloudflare Dashboard 中创建 Pages 项目**
   - 连接到你的 Git 仓库
   - 构建命令：`npm run build`（如果不需要构建可留空）
   - 构建输出目录：`.`（根目录）
   - 框架：None

3. **配置环境变量**
   在 Cloudflare Pages 项目设置 → 环境变量中添加：

   | 变量名 | 说明 | 示例值 |
   |-------|------|--------|
   | `WEBDAV_URL` | WebDAV 服务器地址 | `https://alist.example.com/dav` |
   | `WEBDAV_USER` | WebDAV 用户名 | `admin` |
   | `WEBDAV_PASS` | WebDAV 密码 | `your-password` |
   | `JWT_SECRET` | JWT 签名密钥（请使用随机字符串） | `your-random-secret-key` |

   > ⚠️ **重要提示**：请务必在 Cloudflare 后台配置以上环境变量！否则应用将无法正常工作。

4. **部署**
   - 保存环境变量后，重新部署项目

### 初始化

首次部署后，系统会自动创建默认管理员账号：
- **用户名**: `admin`
- **密码**: `admin123`
- **角色**: 管理员

> ⚠️ **安全提示**：首次登录后请通过后台管理修改默认密码！

---

## 📁 项目结构

```
/
├── wrangler.jsonc          # Cloudflare Pages 配置
├── index.html              # 首页（星河记忆入口）
├── login.html              # 登录页
├── alumni.html             # 同学录
├── exhibition.html         # 电子展览馆
├── confession.html         # 表白墙
├── admin.html              # 后台管理
├── print-tickets.html      # 打印账号纸条
├── css/
│   └── style.css           # 全局样式（星空主题）
├── js/
│   └── api.js              # API 客户端
├── functions/
│   ├── _middleware.js      # 全局中间件（CORS）
│   └── api/
│       ├── _webdav.js      # WebDAV 适配器
│       ├── _jwt.js         # JWT 认证工具
│       ├── login.js        # 登录 API
│       ├── alumni.js       # 同学录 API
│       ├── exhibition.js   # 展览馆 API
│       ├── confessions.js  # 表白墙 API
│       ├── accounts.js     # 账号管理 API
│       └── print-tickets.js# 打印数据 API
├── Weiyu/                  # 原有项目（未修改）
└── README.md               # 本文档
```

---

## 🛠️ 本地开发

### 1. 安装依赖

```bash
npm install -g wrangler
```

### 2. 配置环境变量

创建 `.dev.vars` 文件：

```env
WEBDAV_URL=https://your-webdav-server/dav
WEBDAV_USER=your-username
WEBDAV_PASS=your-password
JWT_SECRET=your-random-secret-key
```

### 3. 启动开发服务器

```bash
npx wrangler pages dev . --binding env=.dev.vars
```

---

## 📡 API 接口

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|---------|
| POST | `/api/login` | 登录 | 否 |
| GET | `/api/alumni` | 获取同学录 | 否 |
| POST | `/api/alumni` | 添加同学录 | 否 |
| DELETE | `/api/alumni?id=` | 删除同学录 | 是(admin) |
| GET | `/api/exhibition` | 获取展览列表 | 否 |
| POST | `/api/exhibition` | 添加展览作品 | 否 |
| DELETE | `/api/exhibition?id=` | 删除展览作品 | 是(admin) |
| GET | `/api/confessions` | 获取表白列表 | 否 |
| POST | `/api/confessions` | 发布表白 | 否 |
| DELETE | `/api/confessions?id=` | 删除表白 | 是(admin) |
| GET | `/api/accounts` | 获取账号列表 | 是(admin) |
| POST | `/api/accounts` | 创建账号 | 是(admin) |
| PUT | `/api/accounts?id=` | 修改账号 | 是(admin) |
| DELETE | `/api/accounts?id=` | 删除账号 | 是(admin) |
| GET | `/api/print-tickets` | 获取打印数据 | 是(admin) |

---

## 📝 数据存储

所有数据通过 WebDAV 协议存储在云端，文件包括：

| 文件 | 说明 |
|------|------|
| `accounts.json` | 用户账号信息 |
| `alumni.json` | 同学录数据 |
| `exhibition.json` | 展览作品数据 |
| `confessions.json` | 表白数据 |

---

## 🎨 设计风格

- 深色星空主题背景
- 渐变色彩（紫→粉→青）视觉风格
- 毛玻璃效果卡片
- 响应式布局，适配移动端
- 流畅的动效与过渡

---

## 📄 许可证

MIT License

---

> ✦ 星河记忆 · 献给永远的我们 ✦
