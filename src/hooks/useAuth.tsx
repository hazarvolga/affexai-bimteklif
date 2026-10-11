import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Currency, type Company } from '@/types';

interface User {
  id: string;
  email: string;
  fullName: string;
  emailVerified: string | null;
  isSuperAdmin?: boolean;
  impersonatedBy?: string;
  readOnly?: boolean;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  role: string | null;
  accountType: 'workspace' | 'academy_learner' | null;
  learnerProfile: { onboardingCompletedAt: string | null; selectedLessonSlug: string | null } | null;
  loading: boolean;
  isDemoMode: boolean;
  login: (token: string, user: User, company: Company, role: string, accountType?: 'workspace' | 'academy_learner') => void;
  logout: () => void;
  exitImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_DEMO_USER: User = {
  id: 'demo-user-id',
  email: 'admin@teklifpro.ai',
  fullName: 'Demo Kullanıcı / Misafir İnceleyen',
  emailVerified: new Date().toISOString(),
};

const DEFAULT_DEMO_COMPANY: Company = {
  id: 'demo-company-id',
  name: 'BIMPlan & TeklifPro Demo Şirketi',
  defaultCurrency: Currency.TRY,
  defaultVatRate: 20,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'workspace' | 'academy_learner' | null>(null);
  const [learnerProfile, setLearnerProfile] = useState<AuthContextType['learnerProfile']>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const enterDemoMode = () => {
    setUser(DEFAULT_DEMO_USER);
    setCompany(DEFAULT_DEMO_COMPANY);
    setRole('owner');
    setAccountType('workspace');
    setIsDemoMode(true);
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Yalnızca geliştirme sunucusunda (npm run dev) otomatik demo erişimi sağlanır.
      // Üretim build'inde (import.meta.env.DEV === false) kullanıcı null kalır ve
      // ProtectedRoute normal şekilde /login'e yönlendirir.
      if (import.meta.env.DEV) enterDemoMode();
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setCompany(data.company);
        setRole(data.role);
        setAccountType(data.accountType ?? 'workspace');
        setLearnerProfile(data.learnerProfile ?? null);
      } else if (import.meta.env.DEV) {
        enterDemoMode();
      }
    } catch (e) {
      if (import.meta.env.DEV) enterDemoMode();
    } finally {
      setLoading(false);
    }
  };

  const login = (token: string, nextUser: User, nextCompany: Company, nextRole: string, nextAccountType: 'workspace' | 'academy_learner' = 'workspace') => {
    localStorage.setItem('token', token);
    setUser(nextUser);
    setCompany(nextCompany);
    setRole(nextRole);
    setAccountType(nextAccountType);
    setLearnerProfile(null);
    setIsDemoMode(token === 'demo-token');
    toast.success("Hizmete erişim sağlandı.");
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin_session_backup');
    setUser(null);
    setCompany(null);
    setRole(null);
    setAccountType(null);
    setLearnerProfile(null);
    setIsDemoMode(false);
    toast.info("Oturum kapatıldı.");
  };

  const exitImpersonation = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await fetch('/api/auth/impersonate/exit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok && response.status !== 401) throw new Error('Impersonation revocation failed');
      }
    } catch (e) {
      console.error('Failed to notify impersonation exit:', e);
      toast.error('Oturum sunucuda sonlandırılamadı. Lütfen tekrar deneyin.');
      return;
    }
    const backup = localStorage.getItem('admin_session_backup');
    if (backup) {
      localStorage.setItem('token', backup);
      localStorage.removeItem('admin_session_backup');
      toast.info("Admin oturumuna dönülüyor...");
      window.location.href = '/admin/tenants';
    } else {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, company, role, accountType, learnerProfile, loading, isDemoMode, login, logout, exitImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
