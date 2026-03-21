import axios from 'axios';

/**
 * Axios instance with automatic Authorization header injection
 * from the stored session token.
 */
const api = axios.create();

api.interceptors.request.use((config) => {
  try {
    const session = JSON.parse(localStorage.getItem('session') || 'null');
    if (session?.token) {
      config.headers.set('Authorization', `Bearer ${session.token}`);
    }
  } catch {
    // ignore
  }
  return config;
});

export default api;
