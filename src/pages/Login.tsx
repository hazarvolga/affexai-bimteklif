import React, { useState } from 'react';
import { ACADEMY_ENABLED } from '@/config/features';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
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
    } catch {
      toast.error('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-hairline-grid flex flex-col justify-between p-6 relative">
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <Link to="/" className="inline-flex items-center gap-3 focus:outline-none">
          <span className="flex h-8 w-8 items-center justify-center border border-primary bg-primary text-xs font-mono font-bold text-primary-foreground">
            BM
          </span>
          <span className="font-display-serif text-2xl text-foreground tracking-tight">BIMMetraj</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto space-y-6 relative z-10 my-10">
        <div className="text-center space-y-2">
          <div className="eyebrow justify-center">
            <span className="status-dot" />
            <span>MİMARİ METRAJ &amp; 5D İHALE PAFTASI</span>
          </div>
          <h1 className="font-display-serif text-4xl text-foreground">
            İhale Masasına <em>Giriş Yapın</em>
          </h1>
          <p className="text-muted-foreground text-xs">
            Hesabınıza giriş yaparak projelerinizi ve metrajlarınızı yönetin
          </p>
        </div>

        <Card className="border border-border bg-card">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] uppercase tracking-wider text-foreground">E-posta Adresi</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border h-11 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    placeholder="muhendis@sirketiniz.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[10px] uppercase tracking-wider text-foreground">Şifre</label>
                  <Link to="/forgot-password" tabIndex={-1} className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors">
                    Şifrenizi mi unuttunuz?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-border h-11 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="pafta-button w-full !justify-center mt-2"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <><span>Oturum Aç</span> <ArrowRight size={15} /></>}
              </button>
            </form>

            <div className="pt-3 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Hesabınız yok mu?{' '}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  14 Gün Ücretsiz Kaydolun
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>openBIM &amp; ÇŞB 2026 UYUMLU METRAJ PLATFORMU</span>
      </div>
    </div>
  );
}
