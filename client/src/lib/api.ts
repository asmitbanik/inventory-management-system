const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || 'Request failed', res.status, data.details);
  }

  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: import('@/types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request<{ user: import('@/types').User }>('/auth/me'),

  getUsers: () => request<{ users: import('@/types').User[] }>('/auth/users'),
  createUser: (data: { email: string; password: string; name: string; role: string }) =>
    request('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Record<string, unknown>) =>
    request(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request(`/auth/users/${id}`, { method: 'DELETE' }),

  getCategories: () => request<{ categories: import('@/types').Category[] }>('/categories'),
  createCategory: (data: { name: string; description?: string }) =>
    request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: { name?: string; description?: string }) =>
    request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),

  getProducts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ products: import('@/types').Product[] }>(`/products${qs}`);
  },
  createProduct: (data: Record<string, unknown>) =>
    request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Record<string, unknown>) =>
    request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),

  getSuppliers: () => request<{ suppliers: import('@/types').Supplier[] }>('/suppliers'),
  createSupplier: (data: Record<string, unknown>) =>
    request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: Record<string, unknown>) =>
    request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => request(`/suppliers/${id}`, { method: 'DELETE' }),

  getCustomers: () => request<{ customers: import('@/types').Customer[] }>('/customers'),
  createCustomer: (data: Record<string, unknown>) =>
    request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: Record<string, unknown>) =>
    request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => request(`/customers/${id}`, { method: 'DELETE' }),

  getPurchaseOrders: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<{ purchaseOrders: import('@/types').PurchaseOrder[] }>(`/purchase-orders${qs}`);
  },
  getPurchaseOrder: (id: string) =>
    request<{ purchaseOrder: import('@/types').PurchaseOrder }>(`/purchase-orders/${id}`),
  createPurchaseOrder: (data: Record<string, unknown>) =>
    request('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseOrder: (id: string, data: Record<string, unknown>) =>
    request(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  receivePurchaseOrder: (id: string) =>
    request(`/purchase-orders/${id}/receive`, { method: 'POST' }),

  getSalesOrders: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<{ salesOrders: import('@/types').SalesOrder[] }>(`/sales-orders${qs}`);
  },
  getSalesOrder: (id: string) =>
    request<{ salesOrder: import('@/types').SalesOrder }>(`/sales-orders/${id}`),
  createSalesOrder: (data: Record<string, unknown>) =>
    request('/sales-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateSalesOrder: (id: string, data: Record<string, unknown>) =>
    request(`/sales-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  shipSalesOrder: (id: string) => request(`/sales-orders/${id}/ship`, { method: 'POST' }),

  getStockMovements: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ movements: import('@/types').StockMovement[] }>(`/stock-movements${qs}`);
  },
  adjustStock: (data: { productId: string; quantity: number; notes: string }) =>
    request('/stock-movements/adjust', { method: 'POST', body: JSON.stringify(data) }),

  getDashboardStats: () =>
    request<{ stats: import('@/types').DashboardStats }>('/dashboard/stats'),
};

export { ApiError };
