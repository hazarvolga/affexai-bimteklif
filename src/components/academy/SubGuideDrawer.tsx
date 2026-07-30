import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, BookOpen, CheckCircle2, ShieldCheck, ArrowRight, Table, Cpu, Lightbulb, HelpCircle } from 'lucide-react';
import { SubGuide } from '../../academy/subGuidesData';

interface SubGuideDrawerProps {
  guide: SubGuide | null;
  onClose: () => void;
}

export const SubGuideDrawer: React.FC<SubGuideDrawerProps> = ({ guide, onClose }) => {
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  if (!guide) return null;

  const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl border-l border-zinc-800 bg-[#0c0c0e] text-zinc-100 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5 bg-[#09090b]">
            <div className="space-y-1">
              <span className="inline-block rounded bg-orange-500/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-orange-400 border border-orange-500/20">
                {guide.badge}
              </span>
              <h2 className="text-xl font-semibold text-white tracking-tight leading-snug">{guide.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              title="Kapat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {/* Overview Summary */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5">
              <p className="text-sm leading-relaxed text-zinc-300">{guide.summary}</p>
            </div>

            {/* Formula / Rule Container */}
            {guide.formulaOrRule && (
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-5 space-y-3">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-medium uppercase tracking-wider">
                  <Cpu size={15} />
                  <span>Formül & Matematiksel / Mantıksal İfade</span>
                </div>
                <div className="overflow-x-auto rounded-lg bg-[#09090b] border border-orange-500/10 p-4 font-mono text-sm text-orange-200 text-center">
                  <code>{guide.formulaOrRule}</code>
                </div>
              </div>
            )}

            {/* Applicable Standards */}
            {guide.standards && guide.standards.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                  <ShieldCheck size={15} className="text-emerald-400" />
                  <span>Dayanak Standartlar & Teknik Kodlar</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {guide.standards.map((std) => (
                    <span key={std} className="rounded-md bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300 border border-zinc-700/50">
                      {std}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Engineering Tables */}
            {guide.tables && guide.tables.length > 0 && (
              <div className="space-y-6">
                {guide.tables.map((table, tIdx) => (
                  <div key={tIdx} className="space-y-3">
                    {table.title && (
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                        <Table size={16} className="text-orange-400" />
                        <span>{table.title}</span>
                      </div>
                    )}
                    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#09090b]">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-zinc-400 uppercase tracking-wider">
                          <tr>
                            {table.headers.map((h, i) => (
                              <th key={i} className="px-4 py-3 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                          {table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-zinc-800/20 transition-colors">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className={`px-4 py-3 leading-relaxed ${cIdx === 0 ? 'font-medium text-white' : ''}`}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Key Takeaways */}
            {guide.keyTakeaways && guide.keyTakeaways.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                  <CheckCircle2 size={15} className="text-orange-400" />
                  <span>Kritik Saha & Mühendislik Prensipleri</span>
                </div>
                <ul className="space-y-2.5 text-sm text-zinc-300">
                  {guide.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/20 p-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold font-mono text-orange-400">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interactive Checkpoint Quiz Engine */}
            {guide.checkpointQuestions && guide.checkpointQuestions.length > 0 && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.04] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400">
                    <HelpCircle size={16} />
                    <span>Ders İçi Anlık Mühendislik Checkpoint Testi</span>
                  </div>
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-300">
                    {Object.keys(quizAnswers).length} / {guide.checkpointQuestions.length} Yanıtlandı
                  </span>
                </div>

                <div className="space-y-6 pt-2">
                  {guide.checkpointQuestions.map((q, qIdx) => {
                    const selectedOpt = quizAnswers[qIdx];
                    const isAnswered = selectedOpt !== undefined;
                    const isCorrect = selectedOpt === q.correctIndex;

                    return (
                      <div key={qIdx} className="space-y-3 rounded-lg border border-zinc-800 bg-[#09090b] p-4">
                        <p className="text-sm font-medium text-white flex gap-2">
                          <span className="font-mono text-sky-400 font-bold">S{qIdx + 1}.</span>
                          <span>{q.question}</span>
                        </p>

                        <div className="space-y-2 pt-1">
                          {q.options.map((opt, optIdx) => {
                            let btnStyle = 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/80';
                            if (isAnswered) {
                              if (optIdx === q.correctIndex) {
                                btnStyle = 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200 font-medium';
                              } else if (selectedOpt === optIdx) {
                                btnStyle = 'border-rose-500/60 bg-rose-500/20 text-rose-200';
                              } else {
                                btnStyle = 'border-zinc-800 bg-zinc-900/30 text-zinc-500 opacity-60';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleOptionSelect(qIdx, optIdx)}
                                disabled={isAnswered}
                                className={`w-full text-left rounded-md border px-3.5 py-2 text-xs transition-all flex items-center justify-between ${btnStyle}`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] opacity-70">[{String.fromCharCode(65 + optIdx)}]</span>
                                  <span>{opt}</span>
                                </span>
                                {isAnswered && optIdx === q.correctIndex && (
                                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation Box */}
                        {isAnswered && (
                          <div className={`mt-3 rounded-md p-3 text-xs leading-relaxed border animate-in fade-in ${
                            isCorrect ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                          }`}>
                            <p className="font-semibold mb-1">{isCorrect ? '✓ Doğru Yanıt!' : '✗ Yanlış Yanıt'}</p>
                            <p className="opacity-90">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Practical Case Study */}
            {guide.practicalCaseStudy && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-400">
                  <Lightbulb size={15} />
                  <span>Gerçek Saha Örnek Vakası (Case Study)</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">{guide.practicalCaseStudy}</p>
              </div>
            )}

            {/* TeklifPro Integration Banner */}
            {guide.teklifProIntegrationNote && (
              <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/[0.08] to-transparent p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-orange-300">
                  <BookOpen size={17} />
                  <span>TeklifPro openBIM Engine Entegrasyonu</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{guide.teklifProIntegrationNote}</p>
                <div className="pt-1">
                  <a
                    href="/pilot"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20"
                  >
                    <span>TeklifPro'da Canlı Test Et</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-800 bg-[#09090b] px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-zinc-500">BIMPlan Academy · Mühendislik Standart Rehberi</span>
            <button
              onClick={onClose}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
