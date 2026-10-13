import React, { useRef, useState } from 'react';
import { ACADEMY_ENABLED } from '@/config/features';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Lock, Loader2, User, Building2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const formStartedAt = useRef(Date.now());
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPilot = searchParams.get('intent') === 'pilot';
  const isAcademy = ACADEMY_ENABLED && searchParams.get('intent') === 'academy';
  const requestedNext = searchParams.get('next');
  const nextPath = isAcademy ? '/app/academy/allplan' : requestedNext?.startsWith('/app/') ? requestedNext : '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          fullName, 
          companyName, 
          intent: isAcademy ? 'academy' : 'workspace', 
          termsAccepted, 
          privacyAccepted, 
          marketingConsent, 
          website, 
          formStartedAt: formStartedAt.current, 
          acquisitionId: localStorage.getItem('academyAcquisitionId') 
        })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user, data.company, 'owner', data.accountType);
        navigate(nextPath);
      } else {
        toast.error(data.error || "Kayıt başarısız.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
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
              {isAcademy ? 'BP' : 'BM'}
            </span>
            <span className="text-2xl font-bold text-foreground tracking-tight">
              {isAcademy ? 'BIMPlan Academy' : 'BIMMetraj'}
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {isAcademy ? 'Ücretsiz Öğrenci Hesabı' : isPilot ? 'Pilot Hesabınızı Oluşturun' : 'Yeni Çalışma Alanı Açın'}
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {isAcademy ? 'Doğrulanmış Allplan derslerine hemen erişin. Kredi kartı gerekmez.' : isPilot ? 'BIMMetraj pilot akışına kontrollü bir başlangıç yapın.' : '14 gün boyunca ücretsiz deneyin. Kredi kartı gerekmez.'}
          </p>
        </div>

        <Card className="border border-border bg-card shadow-lg rounded-md">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="absolute -left-[10000px]" aria-hidden="true">
                <label>Web sitesi<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Ad Soyad</label>
                <div className="relative group">
                   <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                   <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-input/40 border border-border rounded-md h-10 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    placeholder="Ahmet Yılmaz"
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{isAcademy ? 'Okul / Şirket (isteğe bağlı)' : 'Şirket Adı'}</label>
                <div className="relative group">
                   <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                   <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required={!isAcademy}
                    className="w-full bg-input/40 border border-border rounded-md h-10 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    placeholder={isAcademy ? 'Üniversite veya kurumunuz' : 'Örn: Yılmaz İnşaat Taahhüt Ltd.'}
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">E-posta Adresi</label>
                <div className="relative group">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                   <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-input/40 border border-border rounded-md h-10 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    placeholder="ahmet@sirketiniz.com"
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Şifre</label>
                <div className="relative group">
                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                   <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-input/40 border border-border rounded-md h-10 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    placeholder="••••••••"
                   />
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} required className="mt-0.5 accent-primary" />
                  <span><Link to="/terms" target="_blank" className="text-primary hover:underline">Kullanım koşullarını</Link> okudum ve kabul ediyorum.</span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={privacyAccepted} onChange={event => setPrivacyAccepted(event.target.checked)} required className="mt-0.5 accent-primary" />
                  <span><Link to="/privacy" target="_blank" className="text-primary hover:underline">Gizlilik bildirimini</Link> okudum ve kabul ediyorum.</span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={marketingConsent} onChange={event => setMarketingConsent(event.target.checked)} className="mt-0.5 accent-primary" />
                  <span>Ürün ve teknik eğitim duyurularını e-posta ile almak istiyorum.</span>
                </label>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 h-10 text-white font-semibold text-sm gap-2 shadow-xs"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <>{isAcademy ? 'Ücretsiz Öğrenci Kaydı' : isPilot ? 'Pilot Hesabı Oluştur' : 'Hemen Başlayın'} <ArrowRight size={16} /></>}
              </Button>
            </form>
            
            <div className="pt-3 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Zaten hesabınız var mı?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Oturum Açın
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
