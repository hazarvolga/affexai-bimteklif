import React, { useState } from 'react';
import { ACADEMY_ENABLED } from '@/config/features';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedNext = searchParams.get('next');
  const nextPath = requestedNext?.startsWith('/app/') ? requestedNext : '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        login(data.token, data.user, data.company, data.role, data.accountType);
        const finalPath = data.user.isSuperAdmin ? '/admin' : (ACADEMY_ENABLED && data.accountType === 'academy_learner' && nextPath === '/app' ? '/app/academy/allplan' : nextPath);
        navigate(finalPath);
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'E-posta veya şifre hatalı.');
      }
    } catch (e) {
      toast.error('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-hairline-grid flex items-center justify-center p-6 relative">
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-5 focus:outline-none">
            <span className="flex h-9 w-9 items-center justify-center rounded-xs bg-primary text-sm font-mono font-black text-white shadow-xs">
              BM
            </span>
            <span className="text-2xl font-bold text-foreground tracking-tight">BIMMetraj</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">İhale Masasına Giriş Yapın</h1>
          <p className="text-muted-foreground mt-1.5 text-xs">Hesabınıza giriş yaparak projelerinizi ve metrajlarınızı yönetin</p>
        </div>

        <Card className="border border-border bg-card shadow-lg rounded-md">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">E-posta Adresi</label>
                <div className="relative group">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                   <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-input/40 border border-border rounded-md h-10 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    placeholder="muhendis@sirketiniz.com"
                    required
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Şifre</label>
                  <Link to="/forgot-password" tabIndex={-1} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Şifrenizi mi unuttunuz?
                  </Link>
                </div>
                <div className="relative group">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                   <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-input/40 border border-border rounded-md h-10 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    placeholder="••••••••"
                    required
                   />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 h-10 text-white font-semibold text-sm gap-2 mt-2 shadow-xs"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <>Oturum Aç <ArrowRight size={16} /></>}
              </Button>
            </form>
            
            <div className="pt-3 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Hesabınız yok mu?{' '}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  14 Gün Ücretsiz Kaydolun
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center font-mono text-[11px] text-muted-foreground">
          <span>openBIM & ÇŞB 2026 Uyumlu Metraj Platformu</span>
        </div>
      </div>
    </div>
  );
}
