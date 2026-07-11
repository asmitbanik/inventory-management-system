import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/Loading';

export function ProtectedRoute() {
  const { user, organization, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.organizations.length === 0) return <Navigate to="/onboarding" replace />;
  if (!organization && user.organizations.length > 1) {
    return <Navigate to="/select-org" replace />;
  }
  return <Outlet />;
}

export function OwnerRoute() {
  const { isOwner, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!isOwner) return <Navigate to="/" replace />;
  return <Outlet />;
}
