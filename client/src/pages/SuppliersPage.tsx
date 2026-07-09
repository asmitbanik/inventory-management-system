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
import type { Supplier } from '@/types';

const emptyForm = { name: '', email: '', phone: '', address: '' };

export function SuppliersPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.getSuppliers() });

  const saveMutation = useMutation({
    mutationFn: () => editing ? api.updateSupplier(editing.id, form) : api.createSupplier(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast(editing ? 'Updated' : 'Created'); setModalOpen(false); },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSupplier(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast('Deleted'); },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed', 'error'),
  });

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, email: s.email || '', phone: s.phone || '', address: s.address || '' });
    setModalOpen(true);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-gray-500">Manage your suppliers</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Phone</th>
              {isAdmin && <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.suppliers.length === 0 ? (
              <tr><td colSpan={4}><EmptyState message="No suppliers" /></td></tr>
            ) : data?.suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{s.email || '—'}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{s.phone || '—'}</td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-primary-600"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(s.id); }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Textarea label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
