import { Env, User } from "../types";

export async function getWebDAVClient(env: Env) {
  const { WEBDAV_URL, WEBDAV_USER, WEBDAV_PASS } = env;
  const auth = btoa(`${WEBDAV_USER}:${WEBDAV_PASS}`);
  
  return {
    async get(path: string) {
      const res = await fetch(`${WEBDAV_URL}${path}`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`WebDAV get failed: ${res.statusText}`);
      return res;
    },
    async put(path: string, body: any, contentType = 'application/octet-stream') {
      const res = await fetch(`${WEBDAV_URL}${path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': contentType
        },
        body
      });
      if (!res.ok) throw new Error(`WebDAV put failed: ${res.statusText}`);
      return res;
    },
    async delete(path: string) {
      const res = await fetch(`${WEBDAV_URL}${path}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });
      if (res.status === 404) return;
      if (!res.ok) throw new Error(`WebDAV delete failed: ${res.statusText}`);
    },
    async list(path: string) {
      const res = await fetch(`${WEBDAV_URL}${path}`, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Depth': '1'
        }
      });
      if (!res.ok) throw new Error(`WebDAV list failed: ${res.statusText}`);
      const text = await res.text();
      // Simple parser for WebDAV PROPFIND XML
      const hrefs = [...text.matchAll(/<d:href>([^<]+)<\/d:href>/g)].map(m => m[1]);
      return hrefs.filter(h => h !== path && h !== `${path}/`);
    },
    async move(from: string, to: string) {
      const res = await fetch(`${WEBDAV_URL}${from}`, {
        method: 'MOVE',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Destination': `${WEBDAV_URL}${to}`
        }
      });
      if (!res.ok) throw new Error(`WebDAV move failed: ${res.statusText}`);
    }
  };
}

export async function getUsers(env: Env): Promise<User[]> {
  const client = await getWebDAVClient(env);
  const res = await client.get('/db/accounts.json');
  if (!res) return [];
  return await res.json();
}

export async function saveUsers(env: Env, users: User[]) {
  const client = await getWebDAVClient(env);
  await client.put('/db/accounts.json', JSON.stringify(users), 'application/json');
}

export async function verifyJWT(token: string, secret: string): Promise<any> {
    try {
        const [headerB64, payloadB64, signatureB64] = token.split('.');
        const encoder = new TextEncoder();
        const data = encoder.encode(`${headerB64}.${payloadB64}`);
        const signature = new Uint8Array(Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
        
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        
        const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
        if (!isValid) return null;
        
        return JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    } catch (e) {
        return null;
    }
}

export async function signJWT(payload: any, secret: string): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encoder = new TextEncoder();
    
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${headerB64}.${payloadB64}`));
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getAuthenticatedUser(request: Request, env: Env): Promise<User | null> {
    const cookie = request.headers.get('Cookie');
    if (!cookie) return null;
    
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return null;
    
    const token = match[1];
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload || !payload.username) return null;
    
    const users = await getUsers(env);
    return users.find(u => u.username === payload.username) || null;
}
