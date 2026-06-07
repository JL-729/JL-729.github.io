import { Env } from "../../types";
import { getWebDAVClient, getUsers, hashPassword, signJWT } from "../_utils";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const { username, password } = await request.json() as any;

  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Missing credentials' }), { status: 400 });
  }

  const users = await getUsers(env);
  const user = users.find(u => u.username === username);

  if (user && user.passwordHash === await hashPassword(password)) {
    const token = await signJWT({ username, role: user.role }, env.JWT_SECRET);
    return new Response(JSON.stringify({ success: true, role: user.role }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
      }
    });
  }

  return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
};
