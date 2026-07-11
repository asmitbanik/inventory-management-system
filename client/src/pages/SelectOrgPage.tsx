import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import type { Organization } from '@/types';

export function SelectOrgPage() {
  const { user, setOrganization } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>('');

  if (!user) return <Navigate to="/login" replace />;
  if (user.organizations.length <= 1) return <Navigate to="/" replace />;

  const handleContinue = () => {
    const org = user.organizations.find((o) => o.id === selected);
    if (org) {
      setOrganization(org);
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-xl font-bold mb-2">Select Organization</h1>
        <p className="text-gray-500 text-sm mb-6">Choose which workspace to open</p>
        <div className="space-y-2 mb-6">
          {user.organizations.map((org: Organization) => (
            <label
              key={org.id}
              className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                selected === org.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="org"
                value={org.id}
                checked={selected === org.id}
                onChange={() => setSelected(org.id)}
              />
              <div>
                <p className="font-medium">{org.name}</p>
                <p className="text-xs text-gray-500 capitalize">{org.role}</p>
              </div>
            </label>
          ))}
        </div>
        <Button className="w-full" disabled={!selected} onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
