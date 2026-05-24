import { readJSON, writeJSON, ensureDataFile } from './_webdav.js';
import { verifyJWT, extractToken } from './_jwt.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  // Verify admin auth
  const token = extractToken(request);
  const jwtSecret = env.JWT_SECRET || 'default-jwt-secret-change-me';
  const payload = token ? await verifyJWT(token, jwtSecret) : null;

  if (!payload || payload.role !== 'admin') {
    return new Response(JSON.stringify({ error: '未授权，请使用管理员账号登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'GET') {
    const data = await ensureDataFile(env, 'accounts.json', [
      { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: '管理员', createdAt: new Date().toISOString() }
    ]);

    // Don't expose passwords in response
    const safeData = data.map(({ password, ...rest }) => rest);
    return new Response(JSON.stringify(safeData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { username, password, role, name } = body;

      if (!username || !password) {
        return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const data = await ensureDataFile(env, 'accounts.json', [
        { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: '管理员', createdAt: new Date().toISOString() }
      ]);

      // Check duplicate username
      if (data.some(a => a.username === username)) {
        return new Response(JSON.stringify({ error: '用户名已存在' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const maxId = data.reduce((max, a) => Math.max(max, a.id), 0);
      const newAccount = {
        id: maxId + 1,
        username,
        password,
        role: role || 'user',
        name: name || username,
        createdAt: new Date().toISOString(),
      };

      data.push(newAccount);
      await writeJSON(env, 'accounts.json', data);

      const { password: _, ...safeNew } = newAccount;
      return new Response(JSON.stringify(safeNew), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: '请求数据格式错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === 'PUT') {
    try {
      const body = await request.json();
      const { username, password, role, name } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: '缺少 id 参数' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const data = await ensureDataFile(env, 'accounts.json', [
        { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: '管理员', createdAt: new Date().toISOString() }
      ]);

      const index = data.findIndex(a => a.id === parseInt(id));
      if (index === -1) {
        return new Response(JSON.stringify({ error: '未找到该账号' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (username && username !== data[index].username) {
        if (data.some((a, i) => i !== index && a.username === username)) {
          return new Response(JSON.stringify({ error: '用户名已存在' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        data[index].username = username;
      }
      if (password) data[index].password = password;
      if (role) data[index].role = role;
      if (name) data[index].name = name;

      await writeJSON(env, 'accounts.json', data);

      const { password: _, ...safeUpdated } = data[index];
      return new Response(JSON.stringify(safeUpdated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: '请求数据格式错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method === 'DELETE') {
    if (!id) {
      return new Response(JSON.stringify({ error: '缺少 id 参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (id === '1' || id === 1) {
      return new Response(JSON.stringify({ error: '不能删除默认管理员' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await ensureDataFile(env, 'accounts.json', [
      { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: '管理员', createdAt: new Date().toISOString() }
    ]);

    const filtered = data.filter(a => a.id !== parseInt(id));
    if (filtered.length === data.length) {
      return new Response(JSON.stringify({ error: '未找到该账号' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await writeJSON(env, 'accounts.json', filtered);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}