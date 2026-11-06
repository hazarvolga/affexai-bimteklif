import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Loader2, Lock, Mail, User, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PublicMetadata } from '@/components/PublicMetadata';
import { EmailVerificationNotice } from '@/components/auth/EmailVerificationNotice';
import { buildSimpleRegistrationPayload } from '@/features/registration/simple-registration';

/**
 * Plain workspace registration used while REGISTER_PLAN_PICKER_ENABLED is false (expert test
 * period). Same fields, consent rules and API as src/pages/Register.tsx, without the commercial
 * offer. The original page stays untouched and returns when the flag is flipped.
 */

const INPUT_CLASS =
  'w-full bg-input/40 border border-border rounded-md h-10 pl-9 pr-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus:outline-none transition-colors';

interface FieldProps {
  id: string;
  label: string;
  icon: LucideIcon;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  minLength?: number;
}

function Field({ id, label, icon: Icon, type, value, onChange, placeholder, autoComplete, minLength }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground">{label}</label>
      <div className="relative group">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          className={INPUT_CLASS}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

interface ConsentProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}

function Consent({ id, checked, onChange, required = false, ariaLabel, children }: ConsentProps) {
  return (
    <label htmlFor={id} className="flex min-h-6 items-start gap-2.5 py-1 cursor-pointer">
      <input
        id={id}
        aria-label={ariaLabel}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        required={required}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span>{children}</span>
    </label>
  );
}

const LINK_CLASS = 'text-primary underline underline-offset-2 hover:opacity-80';

export function RegisterSimple() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState<{ email: string; deliveryPending: boolean } | null>(null);
  const formStartedAt = useRef(Date.now());

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSimpleRegistrationPayload({
          email, password, fullName, companyName, termsAccepted, privacyAccepted, marketingConsent, website,
          formStartedAt: formStartedAt.current,
        })),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.user?.email) {
        setRegistered({ email: data.user.email, deliveryPending: Boolean(data.emailVerificationDeliveryPending) });
      } else {
        toast.error(data?.error || 'Kayıt başarısız.');
      }
    } catch {
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-background bg-hairline-grid flex flex-col items-center justify-center p-4 sm:p-6">
        <PublicMetadata title="E-postanızı Doğrulayın | BIMMetraj" description="Hesabınızı kullanmak için e-posta adresinizi doğrulayın." canonicalPath="/register" noIndex />
        <div className="w-full max-w-md space-y-4">
          <h1 className="font-display-serif text-3xl text-foreground text-center">Hesabınız oluşturuldu</h1>
          <EmailVerificationNotice email={registered.email} deliveryPending={registered.deliveryPending} />
          <Link to={`/login?next=${encodeURIComponent('/app/smartcheck')}`} className="pafta-button w-full !justify-center">Giriş Ekranına Git</Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background bg-hairline-grid flex flex-col items-center justify-center p-4 sm:p-6">
      <PublicMetadata
        title="Kayıt Ol | BIMMetraj"
        description="BIMMetraj çalışma alanı hesabı oluşturun; e-posta doğrulamasının ardından giriş yapın."
        canonicalPath="/register"
        noIndex
      />
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <Link to="/" className="inline-flex items-center gap-3 focus:outline-none">
            <span className="flex h-8 w-8 items-center justify-center border border-primary bg-primary text-xs font-mono font-bold text-primary-foreground">BM</span>
            <span className="font-display-serif text-2xl text-foreground tracking-tight">BIMMetraj</span>
          </Link>
          <ThemeToggle showLabel={false} />
        </div>

        <div className="text-center space-y-2">
          <h1 className="font-display-serif text-3xl sm:text-4xl text-foreground">Çalışma Alanı Kaydı</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bilgilerinizi girin; e-posta adresinizi doğruladıktan sonra giriş yapabilirsiniz.
          </p>
        </div>

        <Card className="border border-border bg-card shadow-lg rounded-md">
          <CardContent className="pt-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="absolute -left-[10000px]" aria-hidden="true">
                <label>
                  Web sitesi
                  <input tabIndex={-1} autoComplete="off" aria-hidden="true" aria-label="Web sitesi" value={website} onChange={(event) => setWebsite(event.target.value)} />
                </label>
              </div>

              <Field id="register-fullname" label="Ad Soyad" icon={User} type="text" value={fullName} onChange={setFullName} placeholder="Ahmet Yılmaz" autoComplete="name" />
              <Field id="register-company" label="Şirket / Ofis Adı" icon={Building2} type="text" value={companyName} onChange={setCompanyName} placeholder="Örn: Yılmaz İnşaat Taahhüt Ltd." autoComplete="organization" />
              <Field id="register-email" label="E-posta Adresi" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="ahmet@sirketiniz.com" autoComplete="email" />
              <Field id="register-password" label="Şifre (En az 8 karakter)" icon={Lock} type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="new-password" minLength={8} />

              <div className="space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                <Consent id="register-terms" checked={termsAccepted} onChange={setTermsAccepted} required ariaLabel="Kullanım koşullarını okudum ve kabul ediyorum">
                  <Link to="/terms" target="_blank" className={LINK_CLASS}>Kullanım koşullarını</Link> okudum ve kabul ediyorum.
                </Consent>
                <Consent id="register-privacy" checked={privacyAccepted} onChange={setPrivacyAccepted} required ariaLabel="Gizlilik bildirimini okudum ve kabul ediyorum">
                  <Link to="/privacy" target="_blank" className={LINK_CLASS}>Gizlilik bildirimini</Link> okudum ve kabul ediyorum.
                </Consent>
                <Consent id="register-marketing" checked={marketingConsent} onChange={setMarketingConsent} ariaLabel="Ürün ve teknik eğitim duyurularını e-posta ile almak istiyorum">
                  Ürün ve teknik eğitim duyurularını e-posta ile almak istiyorum.
                </Consent>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 h-10 text-primary-foreground font-semibold text-sm gap-2 shadow-xs">
                {loading ? <Loader2 className="animate-spin" size={16} /> : <>Kaydı Tamamla <ArrowRight size={16} /></>}
              </Button>
            </form>

            <div className="pt-3 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Zaten hesabınız var mı?{' '}
                <Link to="/login" className="text-primary font-medium underline underline-offset-2 hover:opacity-80">Oturum Açın</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
