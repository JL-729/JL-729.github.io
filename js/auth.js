// 星河记忆 - 前端权限认证模块
// 使用 localStorage 管理登录态，彻底移除硬编码验证

const Auth = (() => {
    const STORAGE_KEY = 'galaxy_memory_session';

    // 统一异步 SHA-256 哈希算法
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    return {
        hashPassword,

        async login(username, password) {
            // Try to authenticate against WebDAV accounts.json
            try {
                const accountsData = await Storage.readJSON('/db/accounts.json');
                if (accountsData && Array.isArray(accountsData)) {
                    const hashedInput = await hashPassword(password);
                    const user = accountsData.find(u => u.username === username && u.passwordHash === hashedInput);
                    if (user) {
                        const session = {
                            username: user.username,
                            role: user.role,
                            loginTime: Date.now()
                        };
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
                        return { success: true, role: user.role };
                    }
                }
            } catch (e) {
                console.warn('[Auth] WebDAV 账户验证失败:', e);
            }

            return { success: false };
        },

        logout() {
            localStorage.removeItem(STORAGE_KEY);
        },

        getUser() {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return null;
            try {
                return JSON.parse(data);
            } catch {
                return null;
            }
        },

        isLoggedIn() {
            return this.getUser() !== null;
        },

        hasRole(minRole) {
            const user = this.getUser();
            if (!user) return false;
            const roles = ['user', 'admin', 'head'];
            const minIndex = roles.indexOf(minRole);
            const userIndex = roles.indexOf(user.role);
            return userIndex >= minIndex;
        },

        isHead() {
            return this.hasRole('head');
        },

        isAdminOrAbove() {
            return this.hasRole('admin');
        }
    };
})();
