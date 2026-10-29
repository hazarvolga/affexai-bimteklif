import { useEffect, useState } from 'react';

async function requestJson(path: string, payload?: object) {
  const response = await fetch(path, { method: payload === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-BM-Context': 'admin' }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'İşlem tamamlanamadı. Tekrar deneyin.');
  return data;
}

export function AdminSecurity() {
  const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled' | 'error'>('loading');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    requestJson('/api/auth/mfa/status').then(data => {
      if (active) setStatus(typeof data.enabled === 'boolean' ? (data.enabled ? 'enabled' : 'disabled') : 'error');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, []);

  const start = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const data = await requestJson('/api/auth/mfa/enroll/start', { password });
      if (typeof data.secret !== 'string' || !data.secret || !Array.isArray(data.recoveryCodes) || data.recoveryCodes.length !== 10 || !data.recoveryCodes.every((item: unknown) => typeof item === 'string' && item.length > 0)) throw new Error('Kurulum bilgileri alınamadı. Yeniden başlatın.');
      setSecret(data.secret); setRecoveryCodes(data.recoveryCodes); setRecoverySaved(false); setPassword('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Kurulum başlatılamadı.'); }
    finally { setBusy(false); }
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!recoverySaved) throw new Error('Önce kurtarma kodlarını güvenle sakladığınızı onaylayın.');
      await requestJson('/api/auth/mfa/enroll/confirm', { code: code.trim(), recoverySaved: true });
      setSecret(''); setCode(''); setStatus('enabled');
    } catch (err) { setError(`${err instanceof Error ? err.message : 'Doğrulama tamamlanamadı.'} Yanıt alınamadıysa yeniden giriş yapın; kaydettiğiniz kurtarma kodlarını kullanabilirsiniz.`); }
    finally { setBusy(false); }
  };

  const inputStyle = 'w-full min-w-0 h-11 border border-border bg-background px-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary focus:outline-none';
  return <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
    <div><p className="eyebrow">YÖNETİCİ GÜVENLİĞİ</p><h1 className="font-display-serif text-3xl text-foreground">İki aşamalı doğrulama</h1>
      <p className="mt-2 text-sm text-muted-foreground">Yönetici oturumunuz için doğrulayıcı uygulama ve tek kullanımlık kurtarma kodları kullanın.</p></div>
    {error && <p role="alert" className="border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
    {status === 'loading' && <p role="status">Güvenlik durumu yükleniyor…</p>}
    {status === 'error' && <p role="alert" className="text-sm text-destructive">Güvenlik durumu alınamadı. Sayfayı yenileyip tekrar deneyin.</p>}
    {status === 'enabled' && recoveryCodes.length > 0 ? <section className="space-y-4 border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">İki aşamalı doğrulama etkin</h2>
      <h3 className="font-semibold">Kurtarma kodlarınızı saklayın</h3>
      <p className="text-sm text-muted-foreground">Bu kodlar yalnızca şimdi gösterilir. Her biri bir kez kullanılabilir. Güvenli bir yerde saklayın; sayfadan ayrılmadan önce kaydedin.</p>
      <ul className="grid gap-2 sm:grid-cols-2" aria-label="Kurtarma kodları">{recoveryCodes.map(item => <li key={item} className="break-all border border-border p-2 font-mono text-sm">{item}</li>)}</ul>
      <button type="button" onClick={() => setRecoveryCodes([])} className="pafta-button">Kodları güvenle sakladım</button>
    </section> : status === 'enabled' ? <section className="border border-border bg-card p-5"><h2 className="font-semibold">İki aşamalı doğrulama etkin</h2><p className="mt-2 text-sm text-muted-foreground">Girişte doğrulayıcı kodunuz veya kullanılmamış bir kurtarma kodunuz istenir.</p></section>
      : status === 'disabled' && <section className="space-y-4 border border-border bg-card p-5">
        {!secret ? <form onSubmit={start} className="space-y-4"><h2 className="font-semibold">Kurulumu başlat</h2>
          <p className="text-sm text-muted-foreground">Önce şifrenizi doğrulayın. Doğrulayıcı uygulamadaki kodu onaylayana kadar koruma etkinleşmez.</p>
          <label htmlFor="mfa-password" className="block text-sm font-medium">Mevcut şifre</label><input id="mfa-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className={inputStyle} />
          <button data-testid="mfa-start" disabled={busy} type="submit" className="pafta-button">{busy ? 'Bekleyin…' : 'Kurulumu başlat'}</button>
        </form> : <form onSubmit={confirm} className="space-y-4"><h2 className="font-semibold">Doğrulayıcı uygulamaya ekleyin</h2>
          <p className="text-sm text-muted-foreground">Uygulamanızda zaman tabanlı hesap ekleyin ve aşağıdaki gizli anahtarı girin. Bu anahtarı kimseyle paylaşmayın.</p>
          <p className="break-all border border-border bg-background p-3 font-mono text-sm" aria-label="Kurulum anahtarı">{secret}</p>
          <h3 className="font-semibold">Kurtarma kodlarınızı etkinleştirmeden önce saklayın</h3>
          <p className="text-sm text-muted-foreground">Bu kodlar yalnızca bu kurulumda gösterilir ve her biri bir kez kullanılabilir. Doğrulayıcıya erişiminizi kaybederseniz giriş için gereklidir. Sayfadan ayrılmadan önce güvenli bir yere kaydedin.</p>
          <ul className="grid gap-2 sm:grid-cols-2" aria-label="Kurtarma kodları">{recoveryCodes.map(item => <li key={item} className="break-all border border-border p-2 font-mono text-sm">{item}</li>)}</ul>
          <label htmlFor="mfa-recovery-saved" className="flex items-start gap-2 text-sm"><input id="mfa-recovery-saved" type="checkbox" checked={recoverySaved} onChange={event => setRecoverySaved(event.target.checked)} className="mt-1" />Kurtarma kodlarını güvenli bir yere kaydettim.</label>
          <label htmlFor="mfa-enroll-code" className="block text-sm font-medium">Uygulamadaki doğrulama kodu</label><input id="mfa-enroll-code" value={code} onChange={event => setCode(event.target.value)} autoComplete="one-time-code" inputMode="numeric" maxLength={6} required className={inputStyle} />
          <button data-testid="mfa-confirm" disabled={busy || !recoverySaved} type="submit" className="pafta-button">{busy ? 'Doğrulanıyor…' : 'Doğrula ve etkinleştir'}</button>
        </form>}
      </section>}
  </div>;
}
