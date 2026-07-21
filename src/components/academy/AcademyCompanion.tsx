import { useState } from 'react';
import { Bot, ExternalLink, Loader2, SearchCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { fetchWithAuth } from '@/lib/api';

type CompanionResponse = {
  answer: string;
  grounded: boolean;
  citations: Array<{ lessonSlug: string; lessonTitle: string; section: string; excerpt: string }>;
};

export function AcademyCompanion() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<CompanionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const normalized = question.trim();
    if (normalized.length < 3) return setError('En az 3 karakterlik teknik bir soru yazın.');
    setLoading(true);
    setError('');
    try {
      const response = await fetchWithAuth('/api/academy/allplan/companion/query', { method: 'POST', body: JSON.stringify({ question: normalized }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Companion yanıt veremedi.');
      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Companion yanıt veremedi.');
    } finally {
      setLoading(false);
    }
  };

  return <section className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.035] p-6">
    <div className="flex items-start gap-3"><Bot size={18} className="mt-0.5 text-sky-400" /><div><h2 className="text-xs font-black uppercase tracking-widest text-zinc-200">Kaynaklı Academy Companion</h2><p className="mt-2 text-xs leading-relaxed text-zinc-500">Yalnız doğrulanmış 27 Allplan dersinde arama yapar. Model çağrısı ve ek maliyet üretmez; kaynak dışı cevap vermez.</p></div></div>
    <div className="mt-5 flex flex-col gap-2 sm:flex-row"><input value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !loading) submit(); }} maxLength={500} placeholder="Örn. IFC property mapping nasıl doğrulanır?" className="h-10 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-xs text-zinc-200 outline-none focus:border-sky-500" /><Button onClick={submit} disabled={loading} className="h-10 gap-2 bg-sky-600 text-white hover:bg-sky-700">{loading ? <Loader2 size={14} className="animate-spin" /> : <SearchCheck size={14} />} Kaynaklarda ara</Button></div>
    {error && <p className="mt-3 text-xs text-amber-300">{error}</p>}
    {result && <div className="mt-5 space-y-4 border-t border-sky-500/15 pt-5"><p className={`text-sm leading-relaxed ${result.grounded ? 'text-zinc-200' : 'text-zinc-500'}`}>{result.answer}</p>{result.citations.length > 0 && <div className="grid gap-2 md:grid-cols-3">{result.citations.map(citation => <Link key={`${citation.lessonSlug}-${citation.section}`} to={`/app/academy/allplan/lesson/${citation.lessonSlug}`} className="border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-sky-500/40"><p className="text-[9px] font-black uppercase tracking-widest text-sky-400">{citation.section}</p><p className="mt-2 text-xs font-semibold text-zinc-200">{citation.lessonTitle}</p><span className="mt-3 inline-flex items-center gap-1 text-[9px] uppercase text-zinc-500">Dersi aç <ExternalLink size={10} /></span></Link>)}</div>}</div>}
  </section>;
}
