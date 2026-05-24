export interface Env {
  WEBDAV_URL: string;
  WEBDAV_USER: string;
  WEBDAV_PASS: string;
  JWT_SECRET: string;
}

export interface User {
  username: string;
  passwordHash: string;
  role: 'head' | 'admin' | 'user';
  createdAt: number;
}
// Final check
