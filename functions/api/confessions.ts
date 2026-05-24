import { Env } from "../../types";
import { getWebDAVClient } from "../_utils";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const client = await getWebDAVClient(env);

  if (request.method === 'GET') {
    const res = await client.get('/db/confessions.json');
    if (!res) return new Response(JSON.stringify([]));
    return new Response(res.body, { headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method === 'POST') {
    const newEntry = await request.json() as any;
    const res = await client.get('/db/confessions.json');
    const confessions = res ? await res.json() : [];
    confessions.push({
        ...newEntry,
        createdAt: Date.now()
    });
    await client.put('/db/confessions.json', JSON.stringify(confessions), 'application/json');
    return new Response(JSON.stringify({ success: true }));
  }

  return new Response('Method not allowed', { status: 405 });
};
