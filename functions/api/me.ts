import { Env } from "../../types";
import { getAuthenticatedUser } from "../_utils";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const user = await getAuthenticatedUser(request, env);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  return new Response(JSON.stringify({ 
    username: user.username, 
    role: user.role 
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
