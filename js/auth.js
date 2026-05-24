// 星河记忆 - 前端权限认证模块
// 使用 localStorage 管理登录态，硬编码 admin729 / nahida#1027 为 Head 角色

const Auth = (() => {
    const STORAGE_KEY = 'galaxy_memory_session';

    function hashPassword(password) {
        let hash = 0;
        const str = `${password}`;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `sha256-fake-${Math.abs(hash).toString(16)}`;
    }

    return {
        async login(username, password) {
            // Check hardcoded admin first
            if (username === HARDCODED_ADMIN.username && password === HARDCODED_ADMIN.password) {
                const session = {
                    username: HARDCODED_ADMIN.username,
                    role: HARDCODED_ADMIN.role,
                    loginTime: Date.now()
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
                return { success: true, role: HARDCODED_ADMIN.role };
            }

            // Try to authenticate against WebDAV accounts.json
            try {
                const accountsData = await Storage.readJSON('/db/users.json');
                if (accountsData && Array.isArray(accountsData)) {
                    const hashedInput = hashPassword(password);
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
            return roles.indexOf(user.role) >= roles.indexOf(minRole);
        },

        isHead() {
            return this.hasRole('head');
        },

        isAdminOrAbove() {
            return this.hasRole('admin');
        }
    };
})();