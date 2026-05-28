// 星河记忆 - WebDAV 存储模块
// 前端直连 WebDAV 进行所有数据读写操作

const Storage = (() => {
    const encoder = new TextEncoder();

    function getAuth() {
        if (!GALAXY_WEBDAV_URL) {
            console.warn('[Storage] GALAXY_WEBDAV_URL 未配置，存储操作将不可用');
            return null;
        }
        try {
            const url = new URL(GALAXY_WEBDAV_URL);
            const user = decodeURIComponent(url.username);
            const pass = decodeURIComponent(url.password);
            return btoa(`${user}:${pass}`);
        } catch {
            // Try to parse user:pass@host format
            const match = GALAXY_WEBDAV_URL.match(/https?:\/\/([^:]+):([^@]+)@/);
            if (match) {
                return btoa(`${match[1]}:${match[2]}`);
            }
            console.warn('[Storage] 无法解析 WebDAV URL 中的认证信息');
            return null;
        }
    }

    function getBaseUrl() {
        if (!GALAXY_WEBDAV_URL) return null;
        // Remove trailing auth info for actual requests - keep the base path
        let url = GALAXY_WEBDAV_URL.replace(/\/+$/, '');
        // Extract just the protocol+host+path without auth
        try {
            const parsed = new URL(url);
            // Rebuild URL without auth
            return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, '');
        } catch {
            return url;
        }
    }

    async function request(method, path, body = null, contentType = 'application/octet-stream') {
        const auth = getAuth();
        const baseUrl = getBaseUrl();
        if (!auth || !baseUrl) {
            throw new Error('WebDAV 未配置');
        }

        const fullUrl = `${baseUrl}${path}`;
        const headers = {
            'Authorization': `Basic ${auth}`
        };

        if (body && method !== 'DELETE' && method !== 'PROPFIND' && method !== 'MOVE') {
            headers['Content-Type'] = contentType;
        }

        if (method === 'MOVE' && body) {
            headers['Destination'] = `${baseUrl}${body}`;
        }

        const res = await fetch(fullUrl, {
            method,
            headers,
            body: body || undefined
        });

        if (res.status === 404) return null;
        if (res.status === 405 || res.status === 403) {
            // Method not allowed - folder might not support PROPFIND
            return null;
        }
        if (!res.ok && res.status !== 404) {
            console.warn(`[Storage] ${method} ${path} failed: ${res.status} ${res.statusText}`);
            return null;
        }
        return res;
    }

    return {
        async get(path) {
            return request('GET', path);
        },

        async put(path, data, contentType = 'application/json') {
            const body = typeof data === 'string' ? data : JSON.stringify(data);
            return request('PUT', path, body, contentType);
        },

        async delete(path) {
            return request('DELETE', path);
        },

        async list(path) {
            const res = await request('PROPFIND', path ? `${path}/` : '/', null);
            if (!res) return [];
            const text = await res.text();
            const hrefs = [...text.matchAll(/<d:href>([^<]+)<\/d:href>/g)].map(m => m[1]);
            const normalizedPath = path ? `${path}/` : '/';
            return hrefs.filter(h => h !== normalizedPath && h !== `/${normalizedPath}`);
        },

        async readJSON(path) {
            const res = await this.get(path);
            if (!res) return null;
            return res.json();
        },

        async writeJSON(path, data) {
            return this.put(path, JSON.stringify(data, null, 2), 'application/json');
        }
    };
})();