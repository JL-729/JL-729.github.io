import { Env } from "./types";

export interface User {
  username: string;
  passwordHash: string;
  role: 'head' | 'admin' | 'user';
  createdAt: number;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Authentication
    const user = await authenticate(request, env);

    // 2. API Routes
    if (path.startsWith('/api/')) {
      return handleAPI(path, request, env, user);
    }

    // 3. WebDAV Routes (mapped to specific directories)
    if (path.startsWith('/exhibition/') || path.startsWith('/alumni/') || path.startsWith('/confession/')) {
      if (!user) {
        return new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="Galaxy Memory"' }
        });
      }
      return handleWebDAV(path, request, env, user);
    }

    // 4. Static Assets
    // Block sensitive files
    const forbiddenFiles = ['.git', '.gitignore', 'wrangler.jsonc', 'package.json', 'tsconfig.json', 'worker.ts', 'types.ts'];
    if (forbiddenFiles.some(f => path.endsWith(f))) {
      return new Response('Forbidden', { status: 403 });
    }

    // Fallback to ASSETS binding
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) {
      return response;
    }

    // If 404 and it's a page request, maybe serve index.html?
    // But let's just return what ASSETS gives for now.
    return response;
  }
};

async function authenticate(request: Request, env: Env): Promise<User | null> {
  // Try Basic Auth (for WebDAV)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Basic ')) {
    const [username, password] = atob(authHeader.split(' ')[1]).split(':');
    const userJson = await env.GALAXY_ACCOUNTS.get(username);
    if (userJson) {
      const user = JSON.parse(userJson) as User;
      if (await verifyPassword(password, user.passwordHash)) {
        return user;
      }
    }
  }

  // Try Cookie (for Web UI)
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/session=([^;]+)/);
    if (match) {
      const username = match[1]; // In a real app, use a signed token!
      const userJson = await env.GALAXY_ACCOUNTS.get(username);
      if (userJson) {
        return JSON.parse(userJson) as User;
      }
    }
  }

  return null;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hexHash === hash;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleAPI(path: string, request: Request, env: Env, user: User | null): Promise<Response> {
  if (path === '/api/login' && request.method === 'POST') {
    const { username, password } = await request.json() as any;
    const userJson = await env.GALAXY_ACCOUNTS.get(username);
    if (userJson) {
      const u = JSON.parse(userJson) as User;
      if (await verifyPassword(password, u.passwordHash)) {
        return new Response(JSON.stringify({ success: true, role: u.role }), {
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `session=${username}; Path=/; HttpOnly; SameSite=Strict`
          }
        });
      }
    }
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
  }

  if (path === '/api/logout') {
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
      }
    });
  }

  if (!user) return new Response('Unauthorized', { status: 401 });

  if (path === '/api/me') {
    return new Response(JSON.stringify({ username: user.username, role: user.role }));
  }

  // Admin/Head: Approve content
  if (path === '/api/approve' && request.method === 'POST') {
    if (user.role === 'user') return new Response('Forbidden', { status: 403 });
    const { filename } = await request.json() as any;
    const obj = await env.GALAXY_STORAGE.head(`exhibition/pending/${filename}`);
    if (!obj) return new Response('Not found', { status: 404 });

    if (user.role === 'admin' && obj.customMetadata?.uploader === user.username) {
      return new Response("Cannot approve own content", { status: 403 });
    }

    // Move to approved
    const body = await env.GALAXY_STORAGE.get(`exhibition/pending/${filename}`);
    if (!body) return new Response('Error reading file', { status: 500 });
    
    await env.GALAXY_STORAGE.put(`exhibition/approved/${filename}`, body.body, {
      customMetadata: { 
        ...obj.customMetadata, 
        approver: user.username,
        approvedAt: Date.now().toString()
      }
    });
    await env.GALAXY_STORAGE.delete(`exhibition/pending/${filename}`);
    return new Response(JSON.stringify({ success: true }));
  }

  // Head: Account management
  if (path.startsWith('/api/accounts')) {
    if (user.role !== 'head') return new Response('Forbidden', { status: 403 });

    if (request.method === 'GET') {
      const list = await env.GALAXY_ACCOUNTS.list();
      const accounts = [];
      for (const key of list.keys) {
        const val = await env.GALAXY_ACCOUNTS.get(key.name);
        if (val) {
          const u = JSON.parse(val);
          delete u.passwordHash;
          accounts.push(u);
        }
      }
      return new Response(JSON.stringify(accounts));
    }

    if (request.method === 'POST') {
      const { username, password, role } = await request.json() as any;
      
      // Bootstrap: if no accounts exist, allow creating the first head account
      const list = await env.GALAXY_ACCOUNTS.list({ limit: 1 });
      if (list.keys.length > 0 && (!user || user.role !== 'head')) {
        return new Response('Forbidden', { status: 403 });
      }

      const existing = await env.GALAXY_ACCOUNTS.get(username);
      if (existing) return new Response('User exists', { status: 400 });

      const newUser: User = {
        username,
        passwordHash: await hashPassword(password),
        role,
        createdAt: Date.now()
      };
      await env.GALAXY_ACCOUNTS.put(username, JSON.stringify(newUser));
      return new Response(JSON.stringify({ success: true }));
    }

    if (request.method === 'DELETE') {
      const { username } = await request.json() as any;
      if (username === user.username) return new Response('Cannot delete self', { status: 400 });
      await env.GALAXY_ACCOUNTS.delete(username);
      return new Response(JSON.stringify({ success: true }));
    }
  }

  // List pending (for Admin/Head)
  if (path === '/api/pending' && request.method === 'GET') {
    if (user.role === 'user') return new Response('Forbidden', { status: 403 });
    const list = await env.GALAXY_STORAGE.list({ prefix: 'exhibition/pending/' });
    return new Response(JSON.stringify(list.objects));
  }

  return new Response('Not found', { status: 404 });
}

async function handleWebDAV(path: string, request: Request, env: Env, user: User): Promise<Response> {
  const method = request.method;
  const r2Path = path.startsWith('/') ? path.slice(1) : path;

  // Rule: Exhibition uploads by user/admin go to pending, unless Head.
  let targetPath = r2Path;
  if (method === 'PUT' && r2Path.startsWith('exhibition/') && user.role !== 'head') {
    const filename = r2Path.split('/').pop();
    targetPath = `exhibition/pending/${filename}`;
  }

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Allow': 'OPTIONS, GET, HEAD, POST, PUT, DELETE, PROPFIND',
        'DAV': '1',
      }
    });
  }

  if (method === 'PROPFIND') {
    // Basic PROPFIND implementation
    const isFolder = path.endsWith('/');
    const prefix = r2Path;
    const list = await env.GALAXY_STORAGE.list({ prefix, delimiter: '/' });
    
    let xml = `<?xml version="1.0" encoding="utf-8" ?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>${path}</d:href>
    <d:propstat>
      <d:prop>
        <d:resourcetype><d:collection/></d:resourcetype>
        <d:getlastmodified>${new Date().toUTCString()}</d:getlastmodified>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>`;

    for (const obj of list.objects) {
      xml += `
  <d:response>
    <d:href>/${obj.key}</d:href>
    <d:propstat>
      <d:prop>
        <d:getcontentlength>${obj.size}</d:getcontentlength>
        <d:getlastmodified>${obj.uploaded.toUTCString()}</d:getlastmodified>
        <d:resourcetype/>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>`;
    }

    for (const commonPrefix of list.delimitedPrefixes) {
      xml += `
  <d:response>
    <d:href>/${commonPrefix}</d:href>
    <d:propstat>
      <d:prop>
        <d:resourcetype><d:collection/></d:resourcetype>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>`;
    }

    xml += `\n</d:multistatus>`;
    return new Response(xml, {
      status: 207,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    });
  }

  if (method === 'GET' || method === 'HEAD') {
    const obj = await env.GALAXY_STORAGE.get(r2Path);
    if (!obj) return new Response('Not found', { status: 404 });
    
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    
    return new Response(obj.body, { headers });
  }

  if (method === 'PUT') {
    await env.GALAXY_STORAGE.put(targetPath, request.body, {
      customMetadata: {
        uploader: user.username,
        uploadedAt: Date.now().toString()
      }
    });
    return new Response(null, { status: 201 });
  }

  if (method === 'DELETE') {
    // RBAC for Delete
    if (user.role === 'head') {
      await env.GALAXY_STORAGE.delete(r2Path);
      return new Response(null, { status: 204 });
    }

    const obj = await env.GALAXY_STORAGE.head(r2Path);
    if (!obj) return new Response('Not found', { status: 404 });

    if (obj.customMetadata?.uploader === user.username) {
      // Users can only delete their own
      await env.GALAXY_STORAGE.delete(r2Path);
      return new Response(null, { status: 204 });
    }

    return new Response('Forbidden', { status: 403 });
  }

  return new Response('Method not allowed', { status: 405 });
}
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
/home/engine/.bashrc: line 1: syntax error near unexpected token `('
/home/engine/.bashrc: line 1: `. /etc/profile.d/workload-containment.shn# ~/.bashrc: executed by bash(1) for non-login shells.'
