// 星河记忆 - API 客户端

const API_BASE = '/api';

async function request(method, path, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('网络连接失败，请检查后端服务');
    }
    throw err;
  }
}

const API = {
  // 登录
  login: (username, password) => request('POST', '/login', { username, password }),

  // 同学录
  getAlumni: () => request('GET', '/alumni'),
  addAlumni: (data) => request('POST', '/alumni', data),
  deleteAlumni: (id) => request('DELETE', `/alumni?id=${id}`, null, true),

  // 展览馆
  getExhibitions: () => request('GET', '/exhibition'),
  addExhibition: (data) => request('POST', '/exhibition', data),
  deleteExhibition: (id) => request('DELETE', `/exhibition?id=${id}`, null, true),

  // 表白墙
  getConfessions: () => request('GET', '/confessions'),
  addConfession: (data) => request('POST', '/confessions', data),
  deleteConfession: (id) => request('DELETE', `/confessions?id=${id}`, null, true),

  // 账号管理 (admin)
  getAccounts: () => request('GET', '/accounts', null, true),
  addAccount: (data) => request('POST', '/accounts', data, true),
  updateAccount: (id, data) => request('PUT', `/accounts?id=${id}`, data, true),
  deleteAccount: (id) => request('DELETE', `/accounts?id=${id}`, null, true),

  // 打印
  getPrintData: () => request('GET', '/print-tickets', null, true),
};

// Toast 提示
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// 检查登录状态
function checkAuth(requireAdmin = false) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user) {
    window.location.href = '/login.html';
    return null;
  }
  if (requireAdmin && user.role !== 'admin') {
    window.location.href = '/';
    return null;
  }
  return user;
}

// 退出登录
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

// 格式化日期
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
