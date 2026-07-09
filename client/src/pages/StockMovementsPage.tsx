import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageLoader, EmptyState } from '@/components/ui/Loading';
import { formatDate } from '@/lib/utils';

export function StockMovementsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ productId: '', quantity: 0, notes: '' });

  const params: Record<string, string> = {};
  if (typeFilter) params.type = typeFilter;
  if (productFilter) params.productId = productFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', params],
    queryFn: () => api.getStockMovements(params),
  });

  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => api.getProducts() });

  const adjustMutation = useMutation({
    mutationFn: () => api.adjustStock(adjustForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast('Stock adjusted');
      setAdjustModal(false);
      setAdjustForm({ productId: '', quantity: 0, notes: '' });
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed', 'error'),
  });

  const productOptions = [
    { value: '', label: 'All Products' },
    ...(productsData?.products.map((p) => ({ value: p.id, label: `${p.sku} - ${p.name}` })) || []),
  ];

  const adjustProductOptions = [
    { value: '', label: 'Select product' },
    ...(productsData?.products.map((p) => ({
      value: p.id,
      label: `${p.sku} - ${p.name} (current: ${p.currentStock})`,
    })) || []),
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Movements</h1>
          <p className="text-gray-500">Audit log of all stock changes</p>
        </div>
        <Button onClick={() => setAdjustModal(true)}><Plus className="h-4 w-4" /> Adjust Stock</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
          <option value="adjustment">Adjustment</option>
        </select>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm flex-1"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        >
          {productOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Qty</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Notes</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">By</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.movements.length === 0 ? (
              <tr><td colSpan={6}><EmptyState message="No stock movements" /></td></tr>
            ) : data?.movements.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{m.product?.name}</p>
                  <p className="text-xs text-gray-500">{m.product?.sku}</p>
                </td>
                <td className="px-4 py-3 text-center"><Badge status={m.type} /></td>
                <td className="px-4 py-3 text-right font-medium">
                  <span className={m.type === 'in' ? 'text-green-600' : m.type === 'out' ? 'text-orange-600' : 'text-purple-600'}>
                    {m.type === 'out' ? '-' : m.type === 'in' ? '+' : '±'}{Math.abs(m.quantity)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{m.notes || '—'}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{m.createdBy?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={adjustModal} onClose={() => setAdjustModal(false)} title="Manual Stock Adjustment">
        <form onSubmit={(e) => { e.preventDefault(); adjustMutation.mutate(); }} className="space-y-4">
          <Select
            label="Product"
            options={adjustProductOptions}
            value={adjustForm.productId}
            onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
            required
          />
          <Input
            label="Quantity Change"
            type="number"
            value={adjustForm.quantity}
            onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value) })}
            required
          />
          <p className="text-xs text-gray-500">Use positive numbers to add stock, negative to remove.</p>
          <Textarea
            label="Reason"
            value={adjustForm.notes}
            onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
            rows={2}
            required
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setAdjustModal(false)}>Cancel</Button>
            <Button type="submit" loading={adjustMutation.isPending}>Apply Adjustment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
