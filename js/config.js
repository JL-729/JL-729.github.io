// 星河记忆 - 配置
// 请将下方的 GALAXY_WEBDAV_URL 替换为你的 WebDAV 服务器地址
// 格式: https://用户名:密码@域名/路径/
// 例如: https://admin:password@dav.example.com/galaxy/
// 注意：WebDAV 服务器需配置 CORS 允许来自你部署域名的请求

// 优先从 localStorage 读取，若不存在则使用硬编码值
let GALAXY_WEBDAV_URL = (() => {
    try {
        const saved = localStorage.getItem('galaxy_webdav_url');
        if (saved && saved.trim()) return saved;
    } catch (e) { /* ignore */ }
    return ''; // 在此填写你的 WebDAV 连接地址（仅作为后备）
})();
