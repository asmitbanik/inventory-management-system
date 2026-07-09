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
  quantityOrdered: number;
  unitCost: number;
}

export function PurchaseOrdersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantityOrdered: 1, unitCost: 0 }]);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () => api.getPurchaseOrders(statusFilter || undefined),
  });

  const { data: suppliersData } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.getSuppliers() });
  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => api.getProducts() });

  const createMutation = useMutation({
    mutationFn: () => api.createPurchaseOrder({ supplierId, notes, items: items.filter((i) => i.productId) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast('Purchase order created');
      setModalOpen(false);
      resetForm();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed', 'error'),
  });

  const resetForm = () => {
    setSupplierId('');
    setNotes('');
    setItems([{ productId: '', quantityOrdered: 1, unitCost: 0 }]);
  };

  const productOptions = [
    { value: '', label: 'Select product' },
    ...(productsData?.products.map((p) => ({ value: p.id, label: `${p.sku} - ${p.name}` })) || []),
  ];

  const supplierOptions = [
    { value: '', label: 'Select supplier' },
    ...(suppliersData?.suppliers.map((s) => ({ value: s.id, label: s.name })) || []),
  ];

  const addItem = () => setItems([...items, { productId: '', quantityOrdered: 1, unitCost: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-gray-500">Manage incoming stock from suppliers</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> New PO</Button>
      </div>

      <select
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="ordered">Ordered</option>
        <option value="received">Received</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">PO Number</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Supplier</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Date</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.purchaseOrders.length === 0 ? (
              <tr><td colSpan={6}><EmptyState message="No purchase orders" /></td></tr>
            ) : data?.purchaseOrders.map((po) => (
              <tr key={po.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{po.poNumber}</td>
                <td className="px-4 py-3">{po.supplier?.name}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(po.orderDate || po.createdAt)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(po.total)}</td>
                <td className="px-4 py-3 text-center"><Badge status={po.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/purchase-orders/${po.id}`} className="inline-flex p-1.5 text-gray-400 hover:text-primary-600">
                    <Eye className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Purchase Order" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <Select label="Supplier" options={supplierOptions} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required />
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
                    <Input type="number" min="1" placeholder="Qty" value={item.quantityOrdered} onChange={(e) => updateItem(idx, 'quantityOrdered', parseInt(e.target.value))} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" step="0.01" min="0" placeholder="Cost" value={item.unitCost} onChange={(e) => updateItem(idx, 'unitCost', parseFloat(e.target.value))} />
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
            <Button type="submit" loading={createMutation.isPending}>Create PO</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
