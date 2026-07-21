import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface Company {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  role: string | null;
  accountType: 'workspace' | 'academy_learner' | null;
  learnerProfile: { onboardingCompletedAt: string | null; selectedLessonSlug: string | null } | null;
  loading: boolean;
  login: (token: string, user: User, company: Company, role: string, accountType?: 'workspace' | 'academy_learner') => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'workspace' | 'academy_learner' | null>(null);
  const [learnerProfile, setLearnerProfile] = useState<AuthContextType['learnerProfile']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
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
      } else {
        localStorage.removeItem('token');
      }
    } catch (e) {
      console.error("Auth check failed", e);
    } finally {
      setLoading(false);
    }
  };

  const login = (token: string, user: User, company: Company, role: string, nextAccountType: 'workspace' | 'academy_learner' = 'workspace') => {
    localStorage.setItem('token', token);
    setUser(user);
    setCompany(company);
    setRole(role);
    setAccountType(nextAccountType);
    setLearnerProfile(null);
    toast.success("Hizmete erişim sağlandı.");
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCompany(null);
    setRole(null);
    setAccountType(null);
    setLearnerProfile(null);
    toast.info("Oturum kapatıldı.");
  };

  return (
    <AuthContext.Provider value={{ user, company, role, accountType, learnerProfile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
