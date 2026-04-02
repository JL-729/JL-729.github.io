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
- **管理员**: `admin123`

### 注意事项

- 视频文件使用 Base64 存储在 LocalStorage 中，受浏览器存储限制（通常 5-10MB）
- 建议仅用于演示或小规模使用，生产环境需要后端支持
- 数据完全存储在浏览器本地，清除浏览器数据会导致数据丢失

### 本地运行

直接在浏览器中打开 `Weiyu/index.html` 即可使用。

### GitHub Pages 部署

此项目可以直接部署到 GitHub Pages，访问路径：`https://<username>.github.io/Weiyu/`
