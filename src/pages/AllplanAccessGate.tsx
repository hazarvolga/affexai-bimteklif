import { ArrowRight, BookOpen, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicMetadata } from '@/components/PublicMetadata';
import type { ReactNode } from 'react';

export function AllplanAccessGate() {
  const next = '/app/academy/allplan';
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/register?intent=academy&next=${encodeURIComponent(next)}`;

  return <div className="min-h-screen bg-[#09090b] font-sans text-zinc-100">
    <PublicMetadata title="Allplan Akademisi | BIMPlan Academy" description="BIMPlan Academy Allplan uzmanlık programı kayıtlı kullanıcılar içindir." canonicalPath="/academy/allplan" noIndex />
    <header className="border-b border-zinc-800/80 px-6 md:px-8"><nav className="mx-auto flex h-20 max-w-7xl items-center justify-between"><Link to="/academy" className="flex items-center gap-3 font-semibold tracking-tight text-white"><span className="flex h-9 w-9 items-center justify-center rounded bg-orange-600 text-sm font-bold">BP</span>BIMPlan Academy</Link><Link to="/login" className="text-sm text-zinc-400 transition-colors hover:text-white">Oturum aç</Link></nav></header>
    <main className="px-6 py-20 md:px-8 md:py-32"><div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_0.7fr] md:items-center"><section><div className="flex items-center gap-3 text-orange-300"><LockKeyhole size={18} /><p className="text-sm font-medium">Ücretsiz öğrenci alanı</p></div><h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-white md:text-7xl">Allplan öğrenme alanına ücretsiz katılın.</h1><p className="mt-7 max-w-2xl text-lg leading-relaxed text-zinc-400">Doğrulanmış derslere, uygulamalı laboratuvarlara ve ilerleme takibine öğrenci hesabınızla erişin. Kredi kartı gerekmez; hazırlanan Structural modüller teknik inceleme tamamlandıkça açılır.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link to={registerHref} className="inline-flex h-12 items-center justify-center rounded-md bg-orange-600 px-6 text-sm font-medium text-white transition-colors hover:bg-orange-700">Ücretsiz öğrenci kaydı <ArrowRight size={17} className="ml-2" /></Link><Link to={loginHref} className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-700 px-6 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800">Oturum aç</Link></div><p className="mt-5 text-xs text-zinc-600">Ücretsiz erişim · Kredi kartı gerekmez · İçerik durumu şeffaf</p></section><aside className="border border-zinc-800 bg-[#0c0c0e] p-7 md:p-8"><div className="space-y-6"><AccessPoint icon={<BookOpen />} title="27 doğrulanmış ders" text="Mevcut dersler hemen açılır; hazırlanan modüller tamamlanmış gibi gösterilmez." /><AccessPoint icon={<ShieldCheck />} title="Hesaba bağlı ilerleme" text="Notlarınız, laboratuvar sonuçlarınız ve ilerlemeniz öğrenci hesabınızda korunur." /><AccessPoint icon={<LockKeyhole />} title="Structural erken erişim" text="Dokuz Structural modül ekran kanıtı ve teknik review tamamlandıkça güvenli biçimde yayınlanır." /></div></aside></div></main>
  </div>;
}

function AccessPoint({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="flex gap-4 border-b border-zinc-800 pb-5 last:border-b-0 last:pb-0"><div className="text-orange-400">{icon}</div><div><h2 className="text-sm font-medium text-white">{title}</h2><p className="mt-2 text-sm leading-relaxed text-zinc-500">{text}</p></div></div>;
}
