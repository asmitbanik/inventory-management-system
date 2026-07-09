import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute, AdminRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { SuppliersPage } from '@/pages/SuppliersPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { PurchaseOrdersPage } from '@/pages/PurchaseOrdersPage';
import { PurchaseOrderDetailPage } from '@/pages/PurchaseOrderDetailPage';
import { SalesOrdersPage } from '@/pages/SalesOrdersPage';
import { SalesOrderDetailPage } from '@/pages/SalesOrderDetailPage';
import { StockMovementsPage } from '@/pages/StockMovementsPage';
import { UsersPage } from '@/pages/UsersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                  <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                  <Route path="/sales-orders" element={<SalesOrdersPage />} />
                  <Route path="/sales-orders/:id" element={<SalesOrderDetailPage />} />
                  <Route path="/stock-movements" element={<StockMovementsPage />} />
                  <Route element={<AdminRoute />}>
                    <Route path="/users" element={<UsersPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
