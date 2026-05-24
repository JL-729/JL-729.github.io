import { Env } from "../../types";
import { getAuthenticatedUser, getWebDAVClient } from "../_utils";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const user = await getAuthenticatedUser(request, env);

  if (!user || user.role === 'user') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const client = await getWebDAVClient(env);
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const type = url.searchParams.get('type') || 'pending';
    const folder = `/exhibition/${type}/`;
    try {
      const files = await client.list(folder);
      // We also need uploader info. Let's look at db/metadata.json
      const metaRes = await client.get('/db/metadata.json');
      const metadata = metaRes ? await metaRes.json() : {};
      
      const result = files.map(f => {
        const name = f.split('/').pop();
        return {
          name,
          url: f,
          uploader: metadata[name]?.uploader || 'unknown',
          uploadedAt: metadata[name]?.uploadedAt || 0
        };
      });
      
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (request.method === 'POST') {
    const { name, action } = await request.json() as any;
    if (action === 'approve') {
      const metaRes = await client.get('/db/metadata.json');
      const metadata = metaRes ? await metaRes.json() : {};
      
      if (user.role === 'admin' && metadata[name]?.uploader === user.username) {
        return new Response(JSON.stringify({ error: 'Cannot approve own content' }), { status: 403 });
      }

      await client.move(`/exhibition/pending/${name}`, `/exhibition/approved/${name}`);
      
      if (metadata[name]) {
        metadata[name].approvedBy = user.username;
        metadata[name].approvedAt = Date.now();
        await client.put('/db/metadata.json', JSON.stringify(metadata), 'application/json');
      }
      
      return new Response(JSON.stringify({ success: true }));
    }
  }

  if (request.method === 'DELETE') {
    const { name, type } = await request.json() as any;
    const folder = type === 'approved' ? 'approved' : 'pending';
    await client.delete(`/exhibition/${folder}/${name}`);
    
    const metaRes = await client.get('/db/metadata.json');
    if (metaRes) {
      const metadata = await metaRes.json();
      delete metadata[name];
      await client.put('/db/_metadata.json', JSON.stringify(metadata), 'application/json');
    }
    
    return new Response(JSON.stringify({ success: true }));
  }

  return new Response('Method not allowed', { status: 405 });
};
