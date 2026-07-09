import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Truck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Loading';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { SalesOrderItem } from '@/types';

export function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sales-order', id],
    queryFn: () => api.getSalesOrder(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (status: string) => api.updateSalesOrder(id!, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-order', id] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      toast('Status updated');
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed', 'error'),
  });

  const shipMutation = useMutation({
    mutationFn: () => api.shipSalesOrder(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-order', id] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      toast('Order shipped successfully');
    },
    onError: (err) => {
      if (err instanceof ApiError && err.details) {
        const details = err.details as Array<{ product: string; required: number; available: number }>;
        toast(`Insufficient stock: ${details.map((d) => `${d.product} (need ${d.required}, have ${d.available})`).join(', ')}`, 'error');
      } else {
        toast(err instanceof ApiError ? err.message : 'Failed to ship', 'error');
      }
    },
  });

  if (isLoading) return <PageLoader />;
  const so = data?.salesOrder;
  if (!so) return <div>Not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sales-orders')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{so.soNumber}</h1>
            <Badge status={so.status} />
          </div>
          <p className="text-gray-500">{so.customer?.name}</p>
        </div>
        <div className="flex gap-2">
          {so.status === 'draft' && (
            <Button onClick={() => updateMutation.mutate('confirmed')} loading={updateMutation.isPending}>
              Confirm Order
            </Button>
          )}
          {so.status === 'confirmed' && (
            <Button onClick={() => shipMutation.mutate()} loading={shipMutation.isPending}>
              <Truck className="h-4 w-4" /> Ship Order
            </Button>
          )}
          {(so.status === 'draft' || so.status === 'confirmed') && (
            <Button variant="danger" onClick={() => updateMutation.mutate('cancelled')}>Cancel</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><h2 className="font-semibold">Line Items</h2></CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Unit Price</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {so.items?.map((item: SalesOrderItem) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.product?.name}</p>
                      <p className="text-xs text-gray-500">{item.product?.sku} · stock: {item.product?.currentStock}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(Number(item.unitPrice) * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold">Total</td>
                  <td className="px-4 py-3 text-right font-bold">{formatCurrency(so.total)}</td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold">Details</h2></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{so.customer?.name}</span></div>
            <div><span className="text-gray-500">Order Date:</span> {formatDate(so.orderDate)}</div>
            <div><span className="text-gray-500">Shipped Date:</span> {formatDate(so.shippedDate)}</div>
            <div><span className="text-gray-500">Created By:</span> {so.createdBy?.name}</div>
            {so.notes && <div><span className="text-gray-500">Notes:</span> {so.notes}</div>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
