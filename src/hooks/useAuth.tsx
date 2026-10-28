import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Currency, type Company } from '@/types';
import { hasSessionHint, isAdminContext, purgeLegacyTokens, setSessionHint } from '@/lib/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  emailVerified: string | null;
  isSuperAdmin?: boolean;
  isExpertReviewer?: boolean;
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
  login: (token: string | null | undefined, user: User, company: Company, role: string, accountType?: 'workspace' | 'academy_learner') => void;
  logout: () => void;
  exitImpersonation: () => void;
}

/** Exported for tests that render auth-aware components without a live session. */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    purgeLegacyTokens();
    // Oturum HttpOnly çerezdedir; yalnız daha önce giriş yapılmışsa sunucuya sorulur.
    if (!hasSessionHint()) {
      // Yalnızca geliştirme sunucusunda (npm run dev) otomatik demo erişimi sağlanır.
      // Üretim build'inde (import.meta.env.DEV === false) kullanıcı null kalır ve
      // ProtectedRoute normal şekilde /login'e yönlendirir.
      if (import.meta.env.DEV) enterDemoMode();
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'same-origin',
        headers: isAdminContext() ? { 'X-BM-Context': 'admin' } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setCompany(data.company);
        setRole(data.role);
        setAccountType(data.accountType ?? 'workspace');
        setLearnerProfile(data.learnerProfile ?? null);
      } else {
        if (res.status === 401) setSessionHint(false);
        if (import.meta.env.DEV) enterDemoMode();
      }
    } catch (e) {
      if (import.meta.env.DEV) enterDemoMode();
    } finally {
      setLoading(false);
    }
  };

  const clearLocalSession = () => {
    setSessionHint(false);
    setUser(null);
    setCompany(null);
    setRole(null);
    setAccountType(null);
    setLearnerProfile(null);
    setIsDemoMode(false);
  };

  // `token` yalnız API istemcileri içindir; tarayıcı oturumu sunucunun yazdığı HttpOnly çerezdedir.
  const login = (token: string | null | undefined, nextUser: User, nextCompany: Company, nextRole: string, nextAccountType: 'workspace' | 'academy_learner' = 'workspace') => {
    setSessionHint(true);
    setUser(nextUser);
    setCompany(nextCompany);
    setRole(nextRole);
    setAccountType(nextAccountType);
    setLearnerProfile(null);
    setIsDemoMode(token === 'demo-token');
    toast.success("Hizmete erişim sağlandı.");
  };

  const logout = () => {
    // Çerezleri yalnız sunucu silebilir; ağ hatasında bile yerel durum temizlenir.
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
    clearLocalSession();
    toast.info("Oturum kapatıldı.");
  };

  const exitImpersonation = async () => {
    let adminRestored = false;
    try {
      const response = await fetch('/api/auth/impersonate/exit', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok && response.status !== 401) throw new Error('Impersonation revocation failed');
      adminRestored = response.ok ? Boolean((await response.json()).adminRestored) : false;
    } catch (e) {
      console.error('Failed to notify impersonation exit:', e);
      toast.error('Oturum sunucuda sonlandırılamadı. Lütfen tekrar deneyin.');
      return;
    }
    if (adminRestored) {
      toast.info("Admin oturumuna dönülüyor...");
      window.location.href = '/admin/tenants';
    } else {
      clearLocalSession();
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, company, role, accountType, learnerProfile, loading, isDemoMode, login, logout, exitImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

/** For components that also render on public pages outside AuthProvider; returns undefined there. */
export function useOptionalAuth(): AuthContextType | undefined {
  return useContext(AuthContext);
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
