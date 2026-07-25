import React, { useState } from "react";
import { ExamInterface } from "../components/academy/ExamInterface";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import { Award, CheckCircle, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AcademyExamPage() {
  const [examActive, setExamActive] = useState(false);
  const [lastScore, setLastScore] = useState<{ score: number; total: number; percentage: number; passed: boolean } | null>(null);
  const navigate = useNavigate();

  if (examActive) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <ExamInterface
          onClose={() => setExamActive(false)}
          onFinishExam={(score, total, percentage, passed) => {
            setLastScore({ score, total, percentage, passed });
            setExamActive(false);
            if (passed) {
              toast.success(`Tebrikler! Sınavı %${percentage} puanla geçtiniz. Sertifikanız oluşturuldu!`);
            } else {
              toast.error(`Sınav tamamlandı. Puanınız: %${percentage}. Baraj: %70`);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="BIM & ALLPLAN Sertifikasyon Sınavı"
        description="Eurocode 2, OpenBIM ve Allplan 3D donatı konularını kapsayan resmi bitirme sınavı."
      />

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-600/20 text-orange-500 rounded-xl border border-orange-500/30">
            <GraduationCap size={32} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">ALLPLAN Uzmanlık Sertifika Sınavı</h2>
            <p className="text-xs text-zinc-400 font-mono mt-1">Süre: 10 Dakika · Soru Sayısı: 5 · Baraj Puanı: %70</p>
          </div>
        </div>

        {lastScore && (
          <div className={`p-4 rounded-xl border text-xs font-mono ${
            lastScore.passed
              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-400"
              : "bg-red-950/30 border-red-500/40 text-red-400"
          }`}>
            <div className="font-bold text-sm flex items-center gap-2">
              {lastScore.passed ? <CheckCircle size={16} /> : <Award size={16} />}
              Son Sınav Sonucunuz: {lastScore.score} / {lastScore.total} (%{lastScore.percentage}) - {lastScore.passed ? "BAŞARILI (Sertifika Hak Kazandınız)" : "BAŞARISIZ"}
            </div>
            {lastScore.passed && (
              <Button
                onClick={() => navigate("/app/academy/certificates")}
                className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase h-8 px-4"
              >
                Sertifikalarımı Görüntüle
              </Button>
            )}
          </div>
        )}

        <div className="space-y-3 text-xs text-zinc-300 font-sans leading-relaxed border-t border-zinc-800 pt-4">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Sınav Kuralları ve Konuları:</h4>
          <ul className="list-disc list-inside space-y-1 text-zinc-400 font-mono text-[11px]">
            <li>Donatı Modelleme Standartları & Eurocode 2 Paspayı Kuralları</li>
            <li>OpenBIM ve Allplan Bimplus Bulut Koordinasyon Metodolojisi</li>
            <li>Katman Kesişim Öncelikleri (Priority Values & Layers)</li>
            <li>BAMTEC Otomatik Donatı Halıları & LOD 400 İmalat Detaylandırması</li>
          </ul>
        </div>

        <Button
          onClick={() => setExamActive(true)}
          className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 h-12 text-white font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-orange-950/40"
        >
          <GraduationCap size={18} /> SINAVA BAŞLA (10 DAKİKA)
        </Button>
      </div>
    </div>
  );
}
