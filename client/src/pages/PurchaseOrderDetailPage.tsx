import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PackageCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Loading';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseOrderItem } from '@/types';

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => api.getPurchaseOrder(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (status: string) => api.updatePurchaseOrder(id!, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-order', id] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast('Status updated');
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed', 'error'),
  });

  const receiveMutation = useMutation({
    mutationFn: () => api.receivePurchaseOrder(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-order', id] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      toast('Stock received successfully');
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed to receive', 'error'),
  });

  if (isLoading) return <PageLoader />;
  const po = data?.purchaseOrder;
  if (!po) return <div>Not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/purchase-orders')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{po.poNumber}</h1>
            <Badge status={po.status} />
          </div>
          <p className="text-gray-500">{po.supplier?.name}</p>
        </div>
        <div className="flex gap-2">
          {po.status === 'draft' && (
            <Button onClick={() => updateMutation.mutate('ordered')} loading={updateMutation.isPending}>
              Mark as Ordered
            </Button>
          )}
          {po.status === 'ordered' && (
            <Button onClick={() => receiveMutation.mutate()} loading={receiveMutation.isPending}>
              <PackageCheck className="h-4 w-4" /> Receive Stock
            </Button>
          )}
          {(po.status === 'draft' || po.status === 'ordered') && (
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
                  <th className="px-4 py-2 text-right">Ordered</th>
                  <th className="px-4 py-2 text-right">Received</th>
                  <th className="px-4 py-2 text-right">Unit Cost</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {po.items?.map((item: PurchaseOrderItem) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.product?.name}</p>
                      <p className="text-xs text-gray-500">{item.product?.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantityOrdered}</td>
                    <td className="px-4 py-3 text-right">{item.quantityReceived}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.unitCost)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(Number(item.unitCost) * item.quantityOrdered)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold">Total</td>
                  <td className="px-4 py-3 text-right font-bold">{formatCurrency(po.total)}</td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold">Details</h2></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{po.supplier?.name}</span></div>
            <div><span className="text-gray-500">Order Date:</span> {formatDate(po.orderDate)}</div>
            <div><span className="text-gray-500">Received Date:</span> {formatDate(po.receivedDate)}</div>
            <div><span className="text-gray-500">Created By:</span> {po.createdBy?.name}</div>
            {po.notes && <div><span className="text-gray-500">Notes:</span> {po.notes}</div>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
