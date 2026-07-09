import { useQuery } from '@tanstack/react-query';
import { Package, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Product, PurchaseOrder, SalesOrder } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Loading';
import { Link } from 'react-router-dom';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboardStats(),
  });

  if (isLoading) return <PageLoader />;

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your inventory</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts ?? 0}
          icon={Package}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Stock Value"
          value={formatCurrency(stats?.stockValue ?? 0)}
          icon={DollarSign}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.lowStockCount ?? 0}
          icon={AlertTriangle}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold">Low Stock Alerts</h2>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {stats?.lowStockProducts?.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-500">All products are well stocked</p>
            ) : (
              <div className="divide-y">
                {stats?.lowStockProducts?.map((p: Product) => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-600">{p.currentStock} left</p>
                      <p className="text-xs text-gray-400">reorder at {p.reorderLevel}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary-600" />
                <h2 className="font-semibold">Recent Orders</h2>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y">
              {stats?.recentPurchaseOrders?.slice(0, 3).map((po: PurchaseOrder) => (
                <Link
                  key={po.id}
                  to={`/purchase-orders/${po.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium">{po.poNumber}</p>
                    <p className="text-xs text-gray-500">{po.supplier?.name}</p>
                  </div>
                  <Badge status={po.status} />
                </Link>
              ))}
              {stats?.recentSalesOrders?.slice(0, 3).map((so: SalesOrder) => (
                <Link
                  key={so.id}
                  to={`/sales-orders/${so.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium">{so.soNumber}</p>
                    <p className="text-xs text-gray-500">{so.customer?.name}</p>
                  </div>
                  <Badge status={so.status} />
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
