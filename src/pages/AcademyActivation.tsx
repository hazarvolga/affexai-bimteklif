import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchWithAuth } from '@/lib/api';

type Summary = {
  counts: { landingViews: number; registrations: number; verifiedLearners: number; firstLessonLearners: number; secondLessonLearners: number; activeLearners7d: number; structuralEarlyAccessRequests: number };
  conversion: { landingToRegistrationPercent: number; registrationToVerifiedPercent: number; registrationToFirstLessonPercent: number; firstToSecondLessonPercent: number };
};

export function AcademyActivation() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true); setError('');
    const response = await fetchWithAuth('/api/academy/activation/summary');
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Aktivasyon raporu yüklenemedi.'); else setSummary(data);
    setLoading(false);
  };
  useEffect(() => { load().catch(() => { setError('Aktivasyon raporu yüklenemedi.'); setLoading(false); }); }, []);

  return <PageContainer maxWidth="lg"><Link to="/app/academy" className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={15} /> Akademiye dön</Link><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><PageHeader title="Academy aktivasyon raporu" description="Ücretsiz öğrenci edinimi ve ilk öğrenme davranışının platform genelindeki ölçümü." /><Button type="button" variant="outline" onClick={load} disabled={loading} className="border-zinc-700 bg-zinc-900 text-zinc-200"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Yenile</Button></div>
    {error ? <div className="mt-8 border border-amber-500/25 bg-amber-500/[0.06] p-6"><ShieldAlert className="text-amber-400" size={20} /><h2 className="mt-3 font-semibold text-zinc-100">Rapor erişimi kapalı</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{error} Erişim için doğrulanmış hesabı <code className="text-zinc-300">ACADEMY_ADMIN_EMAILS</code> listesine ekleyin.</p></div> : summary && <div className="mt-8 space-y-8"><section className="flex flex-wrap border-y border-zinc-800 bg-zinc-950">{[['Landing', summary.counts.landingViews], ['Kayıt', summary.counts.registrations], ['Doğrulanmış', summary.counts.verifiedLearners], ['7 gün aktif', summary.counts.activeLearners7d], ['Structural talep', summary.counts.structuralEarlyAccessRequests]].map(([label, value]) => <div key={String(label)} className="min-w-36 flex-1 border-b border-zinc-800 px-5 py-4 last:border-r-0 sm:border-b-0 sm:border-r"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p></div>)}</section><section><h2 className="mb-4 text-base font-semibold text-zinc-100">Dönüşüm adımları</h2><Table><TableHeader><TableRow className="border-zinc-800"><TableHead>Adım</TableHead><TableHead>Ulaşan öğrenci</TableHead><TableHead>Dönüşüm</TableHead></TableRow></TableHeader><TableBody><FunnelRow label="Landing → kayıt" value={summary.counts.registrations} rate={summary.conversion.landingToRegistrationPercent} /><FunnelRow label="Kayıt → e-posta doğrulama" value={summary.counts.verifiedLearners} rate={summary.conversion.registrationToVerifiedPercent} /><FunnelRow label="Kayıt → ilk ders" value={summary.counts.firstLessonLearners} rate={summary.conversion.registrationToFirstLessonPercent} /><FunnelRow label="İlk ders → ikinci ders" value={summary.counts.secondLessonLearners} rate={summary.conversion.firstToSecondLessonPercent} /></TableBody></Table></section><p className="text-xs leading-5 text-zinc-500">Yedi günlük aktif öğrenci değeri, son yedi gün içinde en az bir doğrulanmış Academy aktivitesi olan benzersiz kullanıcıları gösterir.</p></div>}
  </PageContainer>;
}

function FunnelRow({ label, value, rate }: { label: string; value: number; rate: number }) { return <TableRow className="border-zinc-800"><TableCell className="font-medium text-zinc-200">{label}</TableCell><TableCell className="text-zinc-400">{value}</TableCell><TableCell><span className="font-mono text-zinc-200">%{rate.toLocaleString('tr-TR')}</span></TableCell></TableRow>; }
