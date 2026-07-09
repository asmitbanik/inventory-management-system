export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  _count?: { products: number };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  costPrice: number | string;
  sellPrice: number | string;
  currentStock: number;
  reorderLevel: number;
  category?: { id: string; name: string } | null;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number | string;
  product?: { id: string; sku: string; name: string };
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  createdAt?: string;
  supplierId: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  orderDate?: string | null;
  receivedDate?: string | null;
  total: number | string;
  notes?: string | null;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
  createdBy?: { id: string; name: string; email: string };
}

export interface SalesOrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number | string;
  product?: { id: string; sku: string; name: string; currentStock?: number };
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  createdAt?: string;
  customerId: string;
  status: 'draft' | 'confirmed' | 'shipped' | 'cancelled';
  orderDate?: string | null;
  shippedDate?: string | null;
  total: number | string;
  notes?: string | null;
  customer?: Customer;
  items?: SalesOrderItem[];
  createdBy?: { id: string; name: string; email: string };
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  referenceType: string;
  referenceId?: string | null;
  notes?: string | null;
  createdAt: string;
  product?: { id: string; sku: string; name: string };
  createdBy?: { id: string; name: string };
}

export interface DashboardStats {
  totalProducts: number;
  stockValue: number;
  lowStockCount: number;
  lowStockProducts: Product[];
  recentPurchaseOrders: PurchaseOrder[];
  recentSalesOrders: SalesOrder[];
}
