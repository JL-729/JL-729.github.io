import { Env } from "../../types";
import { getAuthenticatedUser, getWebDAVClient } from "../_utils";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const client = await getWebDAVClient(env);

  if (request.method === 'GET') {
    const res = await client.get('/db/alumni.json');
    if (!res) return new Response(JSON.stringify([]));
    return new Response(res.body, { headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method === 'POST') {
    const user = await getAuthenticatedUser(request, env);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const newEntry = await request.json() as any;
    const res = await client.get('/db/alumni.json');
    const alumni = res ? await res.json() : [];
    alumni.push(newEntry);
    await client.put('/db/alumni.json', JSON.stringify(alumni), 'application/json');
    return new Response(JSON.stringify({ success: true }));
  }

  return new Response('Method not allowed', { status: 405 });
};
