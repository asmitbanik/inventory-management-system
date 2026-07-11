import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { PageLoader, EmptyState } from '@/components/ui/Loading';
import type { Category } from '@/types';

export function CategoriesPage() {
  const { isOwner } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const saveMutation = useMutation({
    mutationFn: () => editing ? api.updateCategory(editing.id, form) : api.createCategory(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast(editing ? 'Category updated' : 'Category created');
      setModalOpen(false);
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast('Category deleted');
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed', 'error'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-gray-500">Organize your products</p>
        </div>
        {isOwner && (
          <Button onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.categories.length === 0 ? (
          <EmptyState message="No categories yet" />
        ) : (
          data?.categories.map((cat) => (
            <div key={cat.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{cat.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{cat.description || 'No description'}</p>
                  <p className="mt-2 text-xs text-gray-400">{cat._count?.products ?? 0} products</p>
                </div>
                {isOwner && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(cat); setForm({ name: cat.name, description: cat.description || '' }); setModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-primary-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(cat.id); }} className="p-1.5 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
