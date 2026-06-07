import { Env } from "../../types";
import { getAuthenticatedUser, getUsers, saveUsers, hashPassword } from "../_utils";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const user = await getAuthenticatedUser(request, env);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { newPassword } = await request.json() as any;
  if (!newPassword) {
    return new Response(JSON.stringify({ error: 'Missing new password' }), { status: 400 });
  }

  const users = await getUsers(env);
  const userIdx = users.findIndex(u => u.username === user.username);
  if (userIdx === -1) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }

  users[userIdx].passwordHash = await hashPassword(newPassword);
  await saveUsers(env, users);

  return new Response(JSON.stringify({ success: true }));
};
