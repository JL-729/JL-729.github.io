export async function webdavRequest(path, method, body = null, env) {
  const url = `${env.WEBDAV_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const auth = btoa(`${env.WEBDAV_USER}:${env.WEBDAV_PASS}`);
  
  const headers = {
    'Authorization': `Basic ${auth}`,
  };

  if (body && (method === 'PUT' || method === 'POST')) {
    headers['Content-Type'] = 'application/json';
    if (typeof body !== 'string') {
      body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body
  });

  return response;
}

export async function readJson(path, env) {
  const response = await webdavRequest(path, 'GET', null, env);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to read ${path}: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

export async function writeJson(path, data, env) {
  const response = await webdavRequest(path, 'PUT', data, env);
  if (!response.ok) {
    throw new Error(`Failed to write ${path}: ${response.status} ${response.statusText}`);
  }
}
