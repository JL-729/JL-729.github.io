import { readJSON, ensureDataFile } from './_webdav.js';
import { verifyJWT, extractToken } from './_jwt.js';

export async function onRequest(context) {
  const { request, env } = context;

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

  const data = await ensureDataFile(env, 'accounts.json', [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: '管理员', createdAt: new Date().toISOString() }
  ]);

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
