import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Attach JWT to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kvm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Remove token on 401 so the user gets redirected to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('kvm_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export interface Host {
  id: number;
  name: string;
  slug: string;
  url: string;
  order_index: number;
  max_body_size: string;
  created_at: string;
  updated_at: string;
}
