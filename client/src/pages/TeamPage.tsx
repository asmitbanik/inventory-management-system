import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageLoader, EmptyState } from '@/components/ui/Loading';
import { formatDate } from '@/lib/utils';

export function TeamPage() {
  const { isOwner } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'staff' });

  const { data, isLoading } = useQuery({ queryKey: ['team'], queryFn: () => api.getMembers() });

  const inviteMutation = useMutation({
    mutationFn: () => api.inviteMember(form.email, form.role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] });
      toast('Invitation sent');
      setModalOpen(false);
      setForm({ email: '', role: 'staff' });
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed', 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.removeMember(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team'] }); toast('Member removed'); },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Failed', 'error'),
  });

  if (!isOwner) return null;
  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-gray-500">Manage organization members</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Invite Member</Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Joined</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.members.length === 0 ? (
              <tr><td colSpan={5}><EmptyState message="No team members yet" /></td></tr>
            ) : data?.members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{m.user.name}</td>
                <td className="px-4 py-3 text-gray-500">{m.user.email}</td>
                <td className="px-4 py-3 text-center"><Badge status={m.role} /></td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(m.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => { if (confirm('Remove this member?')) removeMutation.mutate(m.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Invite Team Member">
        <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="staff@company.com"
            required
          />
          <Select
            label="Role"
            options={[
              { value: 'staff', label: 'Staff' },
              { value: 'owner', label: 'Owner' },
            ]}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          <p className="text-xs text-gray-500">
            If they haven't signed up yet, they'll be added when they sign in with this email.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={inviteMutation.isPending}>Send Invite</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
