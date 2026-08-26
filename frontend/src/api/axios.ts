import axios from 'axios';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
if (!rawApiUrl && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  console.warn('⚠️ [API] VITE_API_URL is not configured. Defaulting to /api. In production (Render), set VITE_API_URL=https://<your-backend>.onrender.com');
}

const apiBaseUrl = rawApiUrl
  ? `${rawApiUrl.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token (excluding public auth endpoints)
api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isPublicAuthEndpoint = url.includes('/auth/login') || 
                               url.includes('/auth/register') || 
                               url.includes('/auth/google');

  if (!isPublicAuthEndpoint) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isPublicAuthEndpoint = url.includes('/auth/login') || 
                                 url.includes('/auth/register') || 
                                 url.includes('/auth/google');

    // Only handle global session expiration for protected endpoints
    if (error.response?.status === 401 && !isPublicAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
