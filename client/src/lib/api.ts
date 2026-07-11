import type {
  User,
  Organization,
  OrgMember,
  Category,
  Product,
  Supplier,
  Customer,
  PurchaseOrder,
  SalesOrder,
  StockMovement,
  DashboardStats,
} from '@/types';

const API_BASE = '/api';

function formatErrorMessage(data: {
  error?: string;
  details?: { path: string; message: string }[];
}) {
  const detailMessage = Array.isArray(data.details)
    ? data.details
        .map((d) => {
          const field = d.path === 'email' ? 'Email' : d.path === 'password' ? 'Password' : d.path === 'name' ? 'Name' : d.path;
          if (d.path === 'email' && d.message === 'Invalid email') {
            return `${field}: use a real address like you@gmail.com`;
          }
          return `${field}: ${d.message}`;
        })
        .join(', ')
    : undefined;

  if (data.error === 'Validation failed' && detailMessage) return detailMessage;
  return data.error || detailMessage || 'Request failed';
}

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

let organizationId: string | null = null;

export function setOrganizationId(id: string | null) {
  organizationId = id;
}

async function request<T>(path: string, options: RequestInit = {}, needsOrg = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (needsOrg) {
    if (!organizationId) throw new ApiError('No organization selected', 400);
    headers['X-Organization-Id'] = organizationId;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new ApiError(formatErrorMessage(data), res.status, data.details);
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out. The server may be starting up — try again.', 504);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  register: (data: { email: string; password: string; name: string }) =>
    request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false),

  login: (data: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false),

  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }, false),

  me: () => request<{ user: User | null }>('/auth/me', {}, false),

  createOrganization: (name: string) =>
    request<{ organization: Organization }>('/auth/organizations', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }, false),

  getMembers: () => request<{ members: OrgMember[] }>(`/auth/organizations/${organizationId}/members`),
  inviteMember: (email: string, role: string) =>
    request(`/auth/organizations/${organizationId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  removeMember: (memberId: string) =>
    request(`/auth/organizations/${organizationId}/members/${memberId}`, { method: 'DELETE' }),

  getCategories: () => request<{ categories: Category[] }>('/categories'),
  createCategory: (data: { name: string; description?: string }) =>
    request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: { name?: string; description?: string }) =>
    request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),

  getProducts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ products: Product[] }>(`/products${qs}`);
  },
  createProduct: (data: Record<string, unknown>) =>
    request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Record<string, unknown>) =>
    request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),

  getSuppliers: () => request<{ suppliers: Supplier[] }>('/suppliers'),
  createSupplier: (data: Record<string, unknown>) =>
    request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: Record<string, unknown>) =>
    request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => request(`/suppliers/${id}`, { method: 'DELETE' }),

  getCustomers: () => request<{ customers: Customer[] }>('/customers'),
  createCustomer: (data: Record<string, unknown>) =>
    request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: Record<string, unknown>) =>
    request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => request(`/customers/${id}`, { method: 'DELETE' }),

  getPurchaseOrders: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<{ purchaseOrders: PurchaseOrder[] }>(`/purchase-orders${qs}`);
  },
  getPurchaseOrder: (id: string) =>
    request<{ purchaseOrder: PurchaseOrder }>(`/purchase-orders/${id}`),
  createPurchaseOrder: (data: Record<string, unknown>) =>
    request('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseOrder: (id: string, data: Record<string, unknown>) =>
    request(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  receivePurchaseOrder: (id: string) =>
    request(`/purchase-orders/${id}/receive`, { method: 'POST' }),

  getSalesOrders: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<{ salesOrders: SalesOrder[] }>(`/sales-orders${qs}`);
  },
  getSalesOrder: (id: string) =>
    request<{ salesOrder: SalesOrder }>(`/sales-orders/${id}`),
  createSalesOrder: (data: Record<string, unknown>) =>
    request('/sales-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateSalesOrder: (id: string, data: Record<string, unknown>) =>
    request(`/sales-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  shipSalesOrder: (id: string) => request(`/sales-orders/${id}/ship`, { method: 'POST' }),

  getStockMovements: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ movements: StockMovement[] }>(`/stock-movements${qs}`);
  },
  adjustStock: (data: { productId: string; quantity: number; notes: string }) =>
    request('/stock-movements/adjust', { method: 'POST', body: JSON.stringify(data) }),

  getDashboardStats: () =>
    request<{ stats: DashboardStats }>('/dashboard/stats'),
};

export { ApiError };
