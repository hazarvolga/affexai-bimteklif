import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicMetadata } from '@/components/PublicMetadata';

const initialForm = { fullName: '', companyName: '', email: '', phone: '', teamSize: '', currentWorkflow: '', consent: false };

export function PilotApplication() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const update = (field: keyof typeof initialForm, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/pilot-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Başvuru alınamadı.');
      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Başvuru alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-6 text-zinc-100"><PublicMetadata title="Pilot Başvurusu Alındı | BIMMetraj" description="BIMMetraj kurumsal teknik ofis pilot başvurusu." canonicalPath="/pilot" /><div className="w-full max-w-lg border border-zinc-800 bg-[#0c0c0e] p-8 text-center md:p-12"><CheckCircle2 className="mx-auto text-orange-400" size={42} /><h1 className="mt-6 text-3xl font-semibold text-white">Başvurunuz alındı.</h1><p className="mt-4 leading-relaxed text-zinc-400">Ekibimiz verdiğiniz bilgilerle pilot kapsamını değerlendirecek ve sizinle iletişime geçecek. Henüz ödeme veya otomatik abonelik başlatılmadı.</p><Link to="/" className="mt-8 inline-flex items-center text-sm font-medium text-orange-400 hover:text-orange-300">Ana sayfaya dön <ArrowRight size={16} className="ml-2" /></Link></div></div>;
  }

  return <div className="min-h-screen bg-[#09090b] px-6 py-12 text-zinc-100 md:px-8"><PublicMetadata title="Pilot Programı Başvurusu | BIMMetraj" description="Gerçek IFC ve Excel proje dosyalarınızla BIMMetraj 5D metraj ve SmartCheck denetim akışını teknik ekibimizle birlikte test edin." canonicalPath="/pilot" /><div className="mx-auto max-w-2xl"><Link to="/" className="text-lg font-semibold tracking-tight text-white"><span className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded bg-orange-600 text-sm font-bold">BP</span>BIMPlan Academy</Link><div className="mt-16"><p className="text-sm font-medium text-orange-400">TEKLİFPRO PİLOT PROGRAMI</p><h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">Gerçek teklif akışınızı birlikte test edelim.</h1><p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">Bu form satış baskısı veya otomatik abonelik başlatmaz. Uygun ekipleri seçip kapsamı, onboarding süresini ve fiyatı birlikte netleştiriyoruz.</p></div><form onSubmit={handleSubmit} className="mt-10 space-y-5 border border-zinc-800 bg-[#0c0c0e] p-6 md:p-8"><Field label="Ad soyad" value={form.fullName} onChange={(value) => update('fullName', value)} required placeholder="Ad Soyad" /><Field label="Şirket adı" value={form.companyName} onChange={(value) => update('companyName', value)} required placeholder="Şirketiniz" /><div className="grid gap-5 md:grid-cols-2"><Field label="İş e-postası" type="email" value={form.email} onChange={(value) => update('email', value)} required placeholder="siz@sirketiniz.com" /><Field label="Telefon (opsiyonel)" value={form.phone} onChange={(value) => update('phone', value)} placeholder="+90" /></div><label className="block text-sm text-zinc-400">Ekip büyüklüğü<select value={form.teamSize} onChange={(event) => update('teamSize', event.target.value)} className="mt-2 h-12 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-orange-500"><option value="">Seçin</option><option value="1-2">1–2 kişi</option><option value="3-5">3–5 kişi</option><option value="6-15">6–15 kişi</option><option value="16+">16+ kişi</option></select></label><label className="block text-sm text-zinc-400">Bugün teklif/metraj süreciniz nasıl ilerliyor? <textarea value={form.currentWorkflow} onChange={(event) => update('currentWorkflow', event.target.value)} rows={4} maxLength={2000} className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-orange-500" placeholder="Excel, mevcut yazılım, ekip yapısı veya en büyük darboğazınızı kısaca yazın." /></label><label className="flex items-start gap-3 text-sm leading-relaxed text-zinc-400"><input type="checkbox" checked={form.consent} onChange={(event) => update('consent', event.target.checked)} required className="mt-1 accent-orange-600" />Pilot görüşmesi için verdiğim iletişim bilgilerimin BIMPlan Academy tarafından kullanılmasını kabul ediyorum.</label>{error && <p role="alert" className="text-sm text-red-400">{error}</p>}<Button type="submit" disabled={loading} className="h-12 w-full bg-orange-600 text-white hover:bg-orange-700">{loading ? <Loader2 className="animate-spin" size={18} /> : <>Pilot başvurusunu gönder <ArrowRight size={18} className="ml-2" /></>}</Button><p className="text-xs leading-relaxed text-zinc-600">Başvuru gönderildiğinde hesap, ödeme veya abonelik otomatik olarak başlatılmaz.</p></form></div></div>;
}

function Field({ label, value, onChange, required = false, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder: string }) {
  return <label className="block text-sm text-zinc-400">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} className="mt-2 h-12 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-orange-500" /></label>;
}
