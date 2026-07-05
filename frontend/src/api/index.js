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
    // Pertahankan payload & status agar pemanggil bisa baca flag terstruktur
    // (mis. { unverified: true }, { attemptsLeft }) — Error standar membuangnya.
    const e = new Error(msg);
    e.data   = err.response?.data;
    e.status = err.response?.status;
    return Promise.reject(e);
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
export const uploadProductImage = (file, type) => {
  const form = new FormData();
  form.append('image', file);
  const url = type ? `/uploads?type=${encodeURIComponent(type)}` : '/uploads';
  return api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const deleteProductImage = (filename) => api.delete('/uploads', { data: { filename } });

// Auth
export const changePassword = (data)    => api.put('/auth/change-password', data);
export const updateAvatar   = (avatar)  => api.patch('/auth/avatar', { avatar });

// Transactions
export const getTransactions        = (params) => api.get('/transactions', { params });
export const getTransaction         = (id)     => api.get(`/transactions/${id}`);
export const getTransactionSummary  = ()       => api.get('/transactions/summary');
export const createTransaction      = (data)   => api.post('/transactions', data);
export const deleteTransaction      = (id)     => api.delete(`/transactions/${id}`);

// Dashboard
export const getDashboardSummary = ()     => api.get('/dashboard/summary');
export const getDashboardChart   = (days) => api.get('/dashboard/chart', { params: { days } });

// Accounts (Chart of Accounts)
export const getAccounts    = ()        => api.get('/accounts');
export const createAccount  = (data)    => api.post('/accounts', data);
export const updateAccount  = (id,data) => api.put(`/accounts/${id}`, data);
export const deleteAccount  = (id)      => api.delete(`/accounts/${id}`);

// GoPay (Midtrans)
export const gopayCharge     = (data)     => api.post('/gopay/charge', data);
export const gopayStatus     = (order_id) => api.get(`/gopay/status/${order_id}`);
export const gopayCancel     = (order_id) => api.post(`/gopay/cancel/${order_id}`);

// QRIS dinamis (Midtrans) — nominal otomatis, terima DANA/OVO/GoPay/ShopeePay
export const qrisCharge      = (data)     => api.post('/qris/charge', data);
export const qrisStatus      = (order_id) => api.get(`/qris/status/${order_id}`);
export const qrisCancel      = (order_id) => api.post(`/qris/cancel/${order_id}`);

// Laporan Penjualan
export const getSalesReport   = (month) => api.get('/reports/sales',   { params: { month } });
export const getMonthlyReport = (year)  => api.get('/reports/monthly', { params: { year } });

// Buku Besar (General Ledger)
export const getLedgerMonths  = ()             => api.get('/ledger/months');
export const getLedger        = (month)        => api.get('/ledger', { params: { month } });
export const getLedgerAccount = (id, month)    => api.get(`/ledger/account/${id}`, { params: { month } });
export const getLedgerSummary = (year)         => api.get('/ledger/summary', { params: { year } });
export const postManualJournal = (data)        => api.post('/ledger/manual', data);

export default api;
