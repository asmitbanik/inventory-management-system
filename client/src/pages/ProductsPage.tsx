import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { PageLoader, EmptyState } from '@/components/ui/Loading';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';

const emptyForm = {
  sku: '',
  name: '',
  description: '',
  categoryId: '',
  costPrice: 0,
  sellPrice: 0,
  currentStock: 0,
  reorderLevel: 10,
};

export function ProductsPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (categoryFilter) params.categoryId = categoryFilter;
  if (lowStockOnly) params.lowStock = 'true';

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: () => api.getProducts(params),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) =>
      editing ? api.updateProduct(editing.id, data) : api.createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast(editing ? 'Product updated' : 'Product created');
      closeModal();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed to save', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast('Product deleted');
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed to delete', 'error'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      categoryId: product.categoryId || '',
      costPrice: Number(product.costPrice),
      sellPrice: Number(product.sellPrice),
      currentStock: product.currentStock,
      reorderLevel: product.reorderLevel,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...(categoriesData?.categories.map((c) => ({ value: c.id, label: c.name })) || []),
  ];

  const formCategoryOptions = [
    { value: '', label: 'No Category' },
    ...(categoriesData?.categories.map((c) => ({ value: c.id, label: c.name })) || []),
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-gray-500">Manage your product inventory</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categoryOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Category</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Stock</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600 hidden sm:table-cell">Cost</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600 hidden sm:table-cell">Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {productsData?.products.length === 0 ? (
              <tr>
                <td colSpan={7}><EmptyState message="No products found" /></td>
              </tr>
            ) : (
              productsData?.products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.currentStock <= p.reorderLevel ? 'text-orange-600 font-semibold' : ''}>
                      {p.currentStock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">{formatCurrency(p.costPrice)}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">{formatCurrency(p.sellPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded">
                        <Pencil className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(p.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Product' : 'Add Product'} size="lg">
        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required disabled={!!editing} />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <Select label="Category" options={formCategoryOptions} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cost Price" type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) })} required />
            <Input label="Sell Price" type="number" step="0.01" min="0" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: parseFloat(e.target.value) })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Current Stock" type="number" min="0" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: parseInt(e.target.value) })} />
            <Input label="Reorder Level" type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: parseInt(e.target.value) })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
