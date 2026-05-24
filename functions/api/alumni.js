import { readJSON, writeJSON, ensureDataFile } from './_webdav.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (request.method === 'GET') {
    const data = await ensureDataFile(env, 'alumni.json', []);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { name, class: className, graduationYear, message, contact } = body;

      if (!name) {
        return new Response(JSON.stringify({ error: '姓名不能为空' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const data = await ensureDataFile(env, 'alumni.json', []);
      const newEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        class: className || '',
        graduationYear: graduationYear || '',
        message: message || '',
        contact: contact || '',
        createdAt: new Date().toISOString(),
      };

      data.push(newEntry);
      await writeJSON(env, 'alumni.json', data);

      return new Response(JSON.stringify(newEntry), {
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

  if (request.method === 'DELETE') {
    if (!id) {
      return new Response(JSON.stringify({ error: '缺少 id 参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const data = await ensureDataFile(env, 'alumni.json', []);
    const filtered = data.filter(item => item.id !== id);
    if (filtered.length === data.length) {
      return new Response(JSON.stringify({ error: '未找到该记录' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    await writeJSON(env, 'alumni.json', filtered);
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
