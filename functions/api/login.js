import { readJSON, writeJSON } from './_webdav.js';
import { createJWT } from './_jwt.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: accounts, exists } = await readJSON(env, 'accounts.json');

    if (!exists || !accounts) {
      // First run: create default admin account
      const defaultAccounts = [
        { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: '管理员', createdAt: new Date().toISOString() }
      ];
      await writeJSON(env, 'accounts.json', defaultAccounts);

      if (username === 'admin' && password === 'admin123') {
        const jwtSecret = env.JWT_SECRET || 'default-jwt-secret-change-me';
        const token = await createJWT({ id: 1, username: 'admin', role: 'admin', name: '管理员' }, jwtSecret);
        return new Response(JSON.stringify({ token, user: { id: 1, username: 'admin', role: 'admin', name: '管理员' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = accounts.find(a => a.username === username && a.password === password);
    if (!user) {
      return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = env.JWT_SECRET || 'default-jwt-secret-change-me';
    const token = await createJWT(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      jwtSecret
    );

    return new Response(JSON.stringify({
      token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Login error:', err);
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
