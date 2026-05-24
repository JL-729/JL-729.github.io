import { Env, User } from "../../types";
import { getAuthenticatedUser, getUsers, saveUsers, hashPassword } from "../_utils";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const user = await getAuthenticatedUser(request, env);

  if (!user || user.role !== 'head') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const method = request.method;
  const users = await getUsers(env);

  if (method === 'GET') {
    const safeUsers = users.map(u => {
      const { passwordHash, ...safe } = u;
      return safe;
    });
    return new Response(JSON.stringify(safeUsers), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (method === 'POST') {
    const { username, password, role } = await request.json() as any;
    if (!username || !password || !role) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }
    if (users.find(u => u.username === username) || username === 'admin729') {
      return new Response(JSON.stringify({ error: 'User already exists' }), { status: 400 });
    }

    const newUser: User = {
      username,
      passwordHash: await hashPassword(password),
      role,
      createdAt: Date.now()
    };
    users.push(newUser);
    await saveUsers(env, users);
    return new Response(JSON.stringify({ success: true }));
  }

  if (method === 'DELETE') {
    const { username } = await request.json() as any;
    const newUsers = users.filter(u => u.username !== username);
    await saveUsers(env, newUsers);
    return new Response(JSON.stringify({ success: true }));
  }

  return new Response('Method not allowed', { status: 405 });
};
