import { readJson } from '../utils/webdav.js';

async function sign(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${data}.${encodedSignature}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { username, password } = await request.json();
    const accounts = await readJson('accounts.json', env);

    if (!accounts) {
      return new Response(JSON.stringify({ error: 'Accounts configuration not found on server' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = accounts.find(u => u.username === username && u.password === password);

    if (user) {
      const token = await sign({ username, exp: Math.floor(Date.now() / 1000) + 86400 }, env.JWT_SECRET);
      return new Response(JSON.stringify({ token, username }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
