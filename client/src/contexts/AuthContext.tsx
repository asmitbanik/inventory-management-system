import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, setOrganizationId, ApiError } from '@/lib/api';
import type { User, Organization } from '@/types';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isOwner: boolean;
  refreshUser: () => Promise<void>;
  setOrganization: (org: Organization) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ORG_STORAGE_KEY = 'inventory_org_id';

function applyUserState(
  profile: User,
  setUser: (u: User) => void,
  setOrganization: (org: Organization) => void,
  setOrganizationState: (org: Organization | null) => void
) {
  setUser(profile);

  if (profile.organizations.length === 1) {
    setOrganization(profile.organizations[0]);
  } else if (profile.organizations.length > 1) {
    const savedId = localStorage.getItem(ORG_STORAGE_KEY);
    const saved = profile.organizations.find((o) => o.id === savedId);
    if (saved) setOrganization(saved);
    else setOrganizationState(null);
  } else {
    setOrganizationState(null);
    setOrganizationId(null);
    localStorage.removeItem(ORG_STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganizationState] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const setOrganization = useCallback((org: Organization) => {
    setOrganizationState(org);
    setOrganizationId(org.id);
    localStorage.setItem(ORG_STORAGE_KEY, org.id);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user: profile } = await api.me();
      if (!profile) {
        setUser(null);
        setOrganizationState(null);
        setOrganizationId(null);
        return;
      }
      applyUserState(profile, setUser, setOrganization, setOrganizationState);
    } catch {
      setUser(null);
      setOrganizationState(null);
      setOrganizationId(null);
    }
  }, [setOrganization]);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { user: profile } = await api.login({ email, password });
    applyUserState(profile, setUser, setOrganization, setOrganizationState);
  };

  const register = async (email: string, password: string, name: string) => {
    const { user: profile } = await api.register({ email, password, name });
    applyUserState(profile, setUser, setOrganization, setOrganizationState);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) throw err;
    }
    setUser(null);
    setOrganizationState(null);
    setOrganizationId(null);
    localStorage.removeItem(ORG_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        login,
        register,
        logout,
        isOwner: organization?.role === 'owner',
        refreshUser,
        setOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
