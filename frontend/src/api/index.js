import axios from 'axios';

const api = axios.create({ baseURL: (import.meta.env.VITE_API_BASE_URL || '') + '/api' });

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    const msg = err.response?.data?.error || err.message || 'Terjadi kesalahan';
    return Promise.reject(new Error(msg));
  }
);

// Categories
export const getCategories    = ()        => api.get('/categories');
export const createCategory   = (data)    => api.post('/categories', data);
export const updateCategory   = (id, data)=> api.put(`/categories/${id}`, data);
export const deleteCategory   = (id)      => api.delete(`/categories/${id}`);

// Products
export const getProducts      = (params)  => api.get('/products', { params });
export const getProduct       = (id)      => api.get(`/products/${id}`);
export const createProduct    = (data)    => api.post('/products', data);
export const updateProduct    = (id, data)=> api.put(`/products/${id}`, data);
export const deleteProduct    = (id)      => api.delete(`/products/${id}`);

// Store Settings
export const getSettings    = ()     => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

// Users (admin only)
export const getUsers      = ()        => api.get('/users');
export const createUser    = (data)    => api.post('/users', data);
export const updateUser    = (id, data)=> api.put(`/users/${id}`, data);
export const toggleUser    = (id)      => api.patch(`/users/${id}/toggle`);

// Image upload
export const uploadProductImage = (file) => {
  const form = new FormData();
  form.append('image', file);
  return api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const deleteProductImage = (filename) => api.delete('/uploads', { data: { filename } });

// Auth
export const changePassword = (data) => api.put('/auth/change-password', data);

// Transactions
export const getTransactions  = (params)  => api.get('/transactions', { params });
export const getTransaction   = (id)      => api.get(`/transactions/${id}`);
export const createTransaction= (data)    => api.post('/transactions', data);
export const deleteTransaction= (id)      => api.delete(`/transactions/${id}`);

// Dashboard
export const getDashboardSummary = ()     => api.get('/dashboard/summary');
export const getDashboardChart   = (days) => api.get('/dashboard/chart', { params: { days } });

export default api;
