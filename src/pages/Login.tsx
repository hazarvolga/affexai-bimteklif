import React, { useState } from 'react';
import { ACADEMY_ENABLED } from '@/config/features';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PublicMetadata } from '@/components/PublicMetadata';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedNext = searchParams.get('next');
  const nextPath = requestedNext?.startsWith('/app/') ? requestedNext : '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(challenge ? '/api/auth/mfa/verify' : '/api/auth/login', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(challenge ? { challenge, code: code.trim() } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : (challenge ? 'Doğrulama başarısız. Tekrar deneyin.' : 'E-posta veya şifre hatalı.'));
        return;
      }
      if (data.mfaRequired === true) {
        if (typeof data.challenge !== 'string' || !data.challenge) {
          toast.error('Doğrulama başlatılamadı. Tekrar deneyin.');
          return;
        }
        setChallenge(data.challenge);
        setPassword('');
        setCode('');
        return;
      }
      if (!data.user || typeof data.user.isSuperAdmin !== 'boolean') {
        toast.error('Oturum bilgileri alınamadı. Tekrar deneyin.');
        return;
      }
      login(data.token, data.user, data.company, data.role, data.accountType);
      const finalPath = data.user.isSuperAdmin ? '/admin' : (ACADEMY_ENABLED && data.accountType === 'academy_learner' && nextPath === '/app' ? '/app/academy/allplan' : nextPath);
      navigate(finalPath);
    } catch {
      toast.error('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background bg-hairline-grid flex flex-col justify-between p-6 relative">
      <PublicMetadata
        title="Giriş Yap — Kurumsal İhale ve BIM Masası | BIMMetraj"
        description="BIMMetraj kurumsal teklif, openBIM IFC metraj ve SmartCheck çalışma alanınıza giriş yapın."
        canonicalPath="/login"
        noIndex
      />
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
              {!challenge ? <>
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="font-mono text-[10px] uppercase tracking-wider text-foreground">E-posta Adresi</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border h-11 pl-9 pr-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus:outline-none transition-colors"
                    placeholder="muhendis@sirketiniz.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="font-mono text-[10px] uppercase tracking-wider text-foreground">Şifre</label>
                  <Link to="/forgot-password" className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors">
                    Şifrenizi mi unuttunuz?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-border h-11 pl-9 pr-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus:outline-none transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              </> : <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Doğrulayıcı uygulamanızdaki kodu veya tek kullanımlık kurtarma kodunu girin.</p>
                <label htmlFor="login-mfa-code" className="block text-sm font-medium text-foreground">Doğrulama veya kurtarma kodu</label>
                <input id="login-mfa-code" value={code} onChange={event => setCode(event.target.value)} autoComplete="one-time-code" autoFocus required maxLength={40} className="w-full bg-background border border-border h-11 px-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary focus:outline-none" />
                <button type="button" disabled={loading} onClick={() => { setChallenge(null); setCode(''); }} className="text-sm text-primary underline underline-offset-2">Girişe dön</button>
              </div>}
              <button
                type="submit"
                disabled={loading}
                className="pafta-button w-full !justify-center mt-2"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <><span>{challenge ? 'Doğrula ve Giriş Yap' : 'Oturum Aç'}</span> <ArrowRight size={15} /></>}
              </button>
            </form>

            <div className="pt-3 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Hesabınız yok mu?{' '}
                <Link to="/register" className="text-primary font-semibold underline underline-offset-2 hover:opacity-80">
                  14 Gün Ücretsiz Kaydolun
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>openBIM &amp; ÇŞB 2026 POZ ESASLI METRAJ PLATFORMU</span>
      </div>
    </main>
  );
}
