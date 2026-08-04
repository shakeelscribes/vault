const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vault_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    // Try to refresh
    const refreshed = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) {
      const { token: newToken } = await refreshed.json();
      localStorage.setItem('vault_token', newToken);
      // Retry original request
      return request(path, options);
    }
    localStorage.removeItem('vault_token');
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw Object.assign(new Error(err.error || 'API error'), { status: res.status, data: err });
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  setupComplete: () => request('/auth/setup-complete', { method: 'PATCH' }),

  // Dashboard
  summary: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/dashboard/summary${q ? '?' + q : ''}`);
  },
  analytics: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/dashboard/analytics${q ? '?' + q : ''}`);
  },

  // Transactions
  getTransactions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions${q ? '?' + q : ''}`);
  },
  getTransaction: (id) => request(`/transactions/${id}`),
  updateTransaction: (id, body) => request(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  createManual: (body) => request('/transactions/manual', { method: 'POST', body: JSON.stringify(body) }),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (body) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) => request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  bulkRemap: (body) => request('/categories/bulk-remap', { method: 'POST', body: JSON.stringify(body) }),

  // Budgets
  getBudgets: () => request('/budgets'),
  createBudget: (body) => request('/budgets', { method: 'POST', body: JSON.stringify(body) }),
  updateBudget: (id, body) => request(`/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),
  getAlerts: () => request('/budgets/alerts'),
  markAlertRead: (id) => request(`/budgets/alerts/${id}/read`, { method: 'PATCH' }),

  // Export
  exportCSV: (params = {}) => {
    const q = new URLSearchParams({ ...params, format: 'csv' }).toString();
    return `${BASE}/api/export?${q}&token=${getToken()}`;
  },

  // PDF history
  getPDFHistory: () => request('/pdf/history'),

  // Health
  health: () => request('/health'),
};
