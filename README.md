# JL-729.github.io

## Weiyu - 网课视频共享平台

一个纯前端实现的网课视频共享平台，采用 Fluent Design 设计风格。

### 功能特性

- **学生下载页** - 输入下载码和姓名验证后查看、预览和下载视频
- **教师上传页** - 管理课程、课次，上传视频文件
- **管理后台** - 教师管理、视频管理、下载记录统计、数据备份

### 技术栈

- 纯 HTML/CSS/JavaScript
- LocalStorage 本地数据存储
- Fluent Design 设计风格
- 响应式布局

### 目录结构

```
/Weiyu/
├── index.html              # 学生下载页
├── teacher/
│   └── index.html          # 教师上传页
├── manage/
│   └── index.html          # 管理后台
├── css/
│   ├── common.css          # 共享样式（Fluent Design）
│   ├── student.css         # 学生页样式
│   ├── teacher.css         # 教师页样式
│   └── manage.css          # 管理页样式
└── js/
    ├── storage.js          # LocalStorage 数据管理
    ├── auth.js             # 登录认证
    ├── student.js          # 学生页逻辑
    ├── teacher.js          # 教师页逻辑
    └── manage.js           # 管理页逻辑
```

### 默认账号

- **教师**: `teacher1` / `teacher123`
- **管理员**: `nahida#1027`

> ⚠️ **安全提示**：首次登录后请立即修改默认密码！

### 部署文档

如需部署到生产环境或解决 LocalStorage 存储限制，请查看详细部署文档：

- **[Weiyu/DEPLOY.md](./Weiyu/DEPLOY.md)** - 完整部署指南
  - LocalStorage 模式（默认）
  - Backblaze B2 生产模式（推荐用于视频存储）
  - 成本估算和优化建议

- **[Weiyu/BACKBLAZE_B2_GUIDE.md](./Weiyu/BACKBLAZE_B2_GUIDE.md)** - Backblaze B2 详细集成指南

### 注意事项

- 视频文件使用 Base64 存储在 LocalStorage 中，受浏览器存储限制（通常 5-10MB）
- 建议仅用于演示或小规模使用，生产环境请参考部署文档配置 Backblaze B2
- 数据完全存储在浏览器本地，清除浏览器数据会导致数据丢失
- 如需多用户协作或跨设备同步，建议使用 Supabase + B2 方案

### 本地运行

直接在浏览器中打开 `Weiyu/index.html` 即可使用。

### GitHub Pages 部署

此项目可以直接部署到 GitHub Pages，访问路径：`https://<username>.github.io/Weiyu/`
