import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageLoader, EmptyState } from '@/components/ui/Loading';
import { formatCurrency, formatDate } from '@/lib/utils';

interface LineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export function SalesOrdersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);

  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders', statusFilter],
    queryFn: () => api.getSalesOrders(statusFilter || undefined),
  });

  const { data: customersData } = useQuery({ queryKey: ['customers'], queryFn: () => api.getCustomers() });
  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => api.getProducts() });

  const createMutation = useMutation({
    mutationFn: () => api.createSalesOrder({ customerId, notes, items: items.filter((i) => i.productId) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      toast('Sales order created');
      setModalOpen(false);
      resetForm();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed', 'error'),
  });

  const resetForm = () => {
    setCustomerId('');
    setNotes('');
    setItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const productOptions = [
    { value: '', label: 'Select product' },
    ...(productsData?.products.map((p) => ({
      value: p.id,
      label: `${p.sku} - ${p.name} (stock: ${p.currentStock})`,
    })) || []),
  ];

  const customerOptions = [
    { value: '', label: 'Select customer' },
    ...(customersData?.customers.map((c) => ({ value: c.id, label: c.name })) || []),
  ];

  const addItem = () => setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'productId' && typeof value === 'string') {
      const product = productsData?.products.find((p) => p.id === value);
      if (product) updated[idx].unitPrice = Number(product.sellPrice);
    }
    setItems(updated);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Orders</h1>
          <p className="text-gray-500">Manage outgoing stock to customers</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> New SO</Button>
      </div>

      <select
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="confirmed">Confirmed</option>
        <option value="shipped">Shipped</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">SO Number</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Date</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.salesOrders.length === 0 ? (
              <tr><td colSpan={6}><EmptyState message="No sales orders" /></td></tr>
            ) : data?.salesOrders.map((so) => (
              <tr key={so.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{so.soNumber}</td>
                <td className="px-4 py-3">{so.customer?.name}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(so.orderDate || so.createdAt)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(so.total)}</td>
                <td className="px-4 py-3 text-center"><Badge status={so.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/sales-orders/${so.id}`} className="inline-flex p-1.5 text-gray-400 hover:text-primary-600">
                    <Eye className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Sales Order" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <Select label="Customer" options={customerOptions} value={customerId} onChange={(e) => setCustomerId(e.target.value)} required />
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Line Items</label>
              <Button type="button" variant="ghost" size="sm" onClick={addItem}>+ Add Item</Button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Select options={productOptions} value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value))} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" step="0.01" min="0" placeholder="Price" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value))} />
                  </div>
                  <div className="col-span-1">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-sm">×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create SO</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
