import { ArrowRight, BookOpen, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicMetadata } from '@/components/PublicMetadata';
import { useEffect, type ReactNode } from 'react';

export function AllplanAccessGate() {
  const next = '/app/academy/allplan';
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/register?intent=academy&next=${encodeURIComponent(next)}`;
  useEffect(() => {
    const acquisitionId = localStorage.getItem('academyAcquisitionId') || crypto.randomUUID();
    localStorage.setItem('academyAcquisitionId', acquisitionId);
    fetch('/api/auth/academy-acquisition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acquisitionId, landingPath: '/academy/allplan' }) }).catch(() => undefined);
  }, []);

  return <div className="min-h-screen bg-[#09090b] font-sans text-foreground">
    <PublicMetadata title="Allplan Akademisi | BIMPlan Academy" description="BIMPlan Academy Allplan uzmanlık programı kayıtlı kullanıcılar içindir." canonicalPath="/academy/allplan" noIndex />
    <header className="border-b border-border px-6 md:px-8"><nav className="mx-auto flex h-20 max-w-7xl items-center justify-between"><Link to="/academy" className="flex items-center gap-3 font-semibold tracking-tight text-foreground"><span className="flex h-9 w-9 items-center justify-center rounded bg-orange-600 text-sm font-bold">BP</span>BIMPlan Academy</Link><Link to="/app/academy/allplan" className="text-sm text-orange-400 font-bold transition-colors hover:text-orange-300">Doğrudan İncele ➔</Link></nav></header>
    <main className="px-6 py-20 md:px-8 md:py-32"><div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_0.7fr] md:items-center"><section><div className="flex items-center gap-3 text-orange-300"><LockKeyhole size={18} /><p className="text-sm font-medium">Geliştirme & Demo Serbest İnceleme Alanı</p></div><h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-foreground md:text-7xl">Allplan öğrenme alanına serbestçe katılın.</h1><p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">Doğrulanmış derslere, uygulamalı laboratuvarlara ve ilerleme takibine giriş yapmadan anında erişin. Kredi kartı veya form doldurma gerekmez.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link to="/app/academy/allplan" className="inline-flex h-14 items-center justify-center rounded-md bg-gradient-to-r from-orange-600 to-amber-600 px-8 text-sm font-bold text-foreground transition-colors hover:from-orange-700 hover:to-amber-700 shadow-lg shadow-orange-950/40">DEMO / MİSAFİR OLARAK DOĞRUDAN DERSLERE GİRİŞ YAP <ArrowRight size={18} className="ml-2" /></Link><Link to={loginHref} className="inline-flex h-14 items-center justify-center rounded-md border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated">Hesapla Giriş</Link></div><p className="mt-5 text-xs text-muted-foreground">Serbest İnceleme Modu Aktif · Kredi kartı gerekmez · Tüm dersler açık</p></section><aside className="border border-border bg-[#0c0c0e] p-7 md:p-8"><div className="space-y-6"><AccessPoint icon={<BookOpen />} title="27 doğrulanmış ders" text="Mevcut dersler hemen açılır; hazırlanan modüller tamamlanmış gibi gösterilmez." /><AccessPoint icon={<ShieldCheck />} title="Hesaba bağlı ilerleme" text="Notlarınız, laboratuvar sonuçlarınız ve ilerlemeniz öğrenci hesabınızda korunur." /><AccessPoint icon={<LockKeyhole />} title="Structural erken erişim" text="Dokuz Structural modül ekran kanıtı ve teknik review tamamlandıkça güvenli biçimde yayınlanır." /></div></aside></div></main>
  </div>;
}

function AccessPoint({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="flex gap-4 border-b border-border pb-5 last:border-b-0 last:pb-0"><div className="text-orange-400">{icon}</div><div><h2 className="text-sm font-medium text-foreground">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div></div>;
}
