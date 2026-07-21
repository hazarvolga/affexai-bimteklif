import { useState } from 'react';
import { Keyboard, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const questions = [{ prompt: 'Pan görünümünü hızlıca değiştirmek için hangi komut ailesini kişiselleştirirsiniz?', answer: 'Viewport navigation' }, { prompt: 'Bir çizim komutunu klavyeye bağlarken ilk kontrol nedir?', answer: 'Command mapping' }, { prompt: 'Office standardını korumak için hangi dosyayı yedeklersiniz?', answer: 'Workspace profile' }];

export function ShortcutTrainer({ onComplete }: { onComplete?: () => void }) {
  const [index, setIndex] = useState(0); const [selected, setSelected] = useState(''); const [score, setScore] = useState(0); const [done, setDone] = useState(false);
  const options = [questions[index]?.answer, 'Layer priority', 'IFC schema'];
  const submit = () => { if (!selected) return; if (selected === questions[index].answer) setScore(value => value + 1); if (index === questions.length - 1) { setDone(true); onComplete?.(); } else { setIndex(value => value + 1); setSelected(''); } };
  const reset = () => { setIndex(0); setSelected(''); setScore(0); setDone(false); };
  return <div className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6"><div className="flex items-center justify-between border-b border-zinc-800 pb-3"><div className="flex items-center gap-2"><Keyboard size={18} className="text-orange-500" /><h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-100">Shortcut Trainer · Lab</h3></div><Button variant="ghost" onClick={reset} className="h-auto p-0 text-[9px] font-mono uppercase tracking-widest text-zinc-500"><RotateCcw size={11} className="mr-1 inline" /> Sıfırla</Button></div>{done ? <div className="border border-emerald-500/20 bg-emerald-500/[0.05] p-5 text-sm text-emerald-300">Checkpoint tamamlandı. Skor: {score}/{questions.length}. Kişisel kısayollarınızı gerçek ofis standardınızla ayrıca doğrulayın.</div> : <><p className="text-xs leading-relaxed text-zinc-300">Soru {index + 1}/{questions.length}: {questions[index].prompt}</p><div className="grid gap-2">{options.map(option => <button key={option} onClick={() => setSelected(option)} className={`border p-3 text-left text-xs transition-colors ${selected === option ? 'border-orange-500 bg-orange-500/10 text-orange-200' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'}`}>{option}</button>)}</div><Button onClick={submit} className="h-9 w-full bg-orange-600 text-[9px] font-black uppercase tracking-widest text-white hover:bg-orange-700">Cevabı doğrula</Button></>}</div>;
}
