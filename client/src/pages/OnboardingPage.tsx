import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/Loading';

export function OnboardingPage() {
  const { user, loading, setOrganization, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.organizations.length > 0) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { organization } = await api.createOrganization(name);
      await refreshUser();
      setOrganization(organization);
      toast('Organization created!');
      navigate('/', { replace: true });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to create organization', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your organization</h1>
          <p className="mt-1 text-gray-500">Set up your business workspace to get started</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="orgName"
              label="Organization / Business Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Traders"
              required
            />
            <Button type="submit" className="w-full" loading={submitting}>
              Create Organization
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
