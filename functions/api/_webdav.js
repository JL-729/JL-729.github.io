/**
 * WebDAV 适配器 - 通过 fetch 读写云端 JSON 文件
 * 环境变量: WEBDAV_URL, WEBDAV_USER, WEBDAV_PASS
 */

const BASE_PATH = '/data';

function getConfig(env) {
  const baseUrl = env.WEBDAV_URL || '';
  const user = env.WEBDAV_USER || '';
  const pass = env.WEBDAV_PASS || '';
  const encoded = btoa(`${user}:${pass}`);
  return { baseUrl, encoded };
}

export async function readJSON(env, filename) {
  const { baseUrl, encoded } = getConfig(env);
  if (!baseUrl) {
    return { data: null, exists: false };
  }

  const url = `${baseUrl.replace(/\/+$/, '')}${BASE_PATH}/${filename}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encoded}`,
      },
    });

    if (res.status === 404) {
      return { data: null, exists: false };
    }

    if (!res.ok) {
      return { data: null, exists: false };
    }

    const text = await res.text();
    try {
      return { data: JSON.parse(text), exists: true };
    } catch {
      return { data: null, exists: false };
    }
  } catch (err) {
    console.error('WebDAV read error:', err);
    return { data: null, exists: false };
  }
}

export async function writeJSON(env, filename, data) {
  const { baseUrl, encoded } = getConfig(env);
  if (!baseUrl) {
    return { success: false, error: 'WEBDAV_URL not configured' };
  }

  const url = `${baseUrl.replace(/\/+$/, '')}${BASE_PATH}/${filename}`;
  const content = JSON.stringify(data, null, 2);

  try {
    // First try PUT
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: content,
    });

    if (res.ok) {
      return { success: true };
    }

    // If PUT fails (e.g. directory doesn't exist), try MKCOL then PUT
    const dirUrl = `${baseUrl.replace(/\/+$/, '')}${BASE_PATH}`;
    await fetch(dirUrl, {
      method: 'MKCOL',
      headers: {
        'Authorization': `Basic ${encoded}`,
      },
    }).catch(() => {});

    const retryRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: content,
    });

    return { success: retryRes.ok, error: retryRes.ok ? undefined : `HTTP ${retryRes.status}` };
  } catch (err) {
    console.error('WebDAV write error:', err);
    return { success: false, error: err.message };
  }
}

export async function ensureDataFile(env, filename, defaultData) {
  const { data, exists } = await readJSON(env, filename);
  if (exists) {
    return data;
  }
  await writeJSON(env, filename, defaultData);
  return defaultData;
}
