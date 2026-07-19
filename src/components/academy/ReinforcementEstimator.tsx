/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Scale, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReinforcementEstimatorProps {
  onValueChange?: (val: string) => void;
  initialCover?: number;
}

export const ReinforcementEstimator: React.FC<ReinforcementEstimatorProps> = ({
  onValueChange,
  initialCover = 20
}) => {
  const [concreteGrade, setConcreteGrade] = useState<string>('C30/37');
  const [barDiameter, setBarDiameter] = useState<number>(16); // in mm
  const [bondCondition, setBondCondition] = useState<'good' | 'poor'>('good');
  const [forceLevel, setForceLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [coverMm, setCoverMm] = useState<number>(initialCover);

  const concreteTensileStrengths: Record<string, number> = {
    'C20/25': 1.5,
    'C25/30': 1.8,
    'C30/37': 2.0,
    'C35/45': 2.2,
    'C40/50': 2.5,
  };

  const calculatedLapLength = useMemo(() => {
    const fctk = concreteTensileStrengths[concreteGrade] || 2.0;
    const fctd = fctk / 1.5;

    const eta1 = bondCondition === 'good' ? 1.0 : 0.7;
    const eta2 = 1.0;

    const fbd = 2.25 * eta1 * eta2 * fctd;

    const loadFactors = { low: 150, medium: 300, high: 435 };
    const sigmaSd = loadFactors[forceLevel];

    const lbrqd = (barDiameter / 4) * (sigmaSd / fbd);

    const alpha1 = 1.0;
    const alpha2 = 1.0;
    const alpha6 = 1.5;

    const l0 = alpha1 * alpha2 * alpha6 * lbrqd;
    const lmin = Math.max(0.3 * alpha6 * lbrqd, 15 * barDiameter, 200);

    return Math.round(Math.max(l0, lmin));
  }, [concreteGrade, barDiameter, bondCondition, forceLevel]);

  const handleCoverChange = (val: number) => {
    setCoverMm(val);
    if (onValueChange) {
      onValueChange(`${val} mm`);
    }
  };

  const resetSimulator = () => {
    setConcreteGrade('C30/37');
    setBarDiameter(16);
    setBondCondition('good');
    setForceLevel('medium');
    setCoverMm(20);
    if (onValueChange) {
      onValueChange('20 mm');
    }
  };

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 space-y-6">
      {/* Disclaimer and Non-authoritative Demo labels */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-[10px] text-orange-500 font-sans space-y-1">
        <p className="font-black uppercase tracking-wider">⚠️ Donatı Detaylandırma Demo Simülatörü</p>
        <p className="leading-relaxed font-bold">
          Bu araç, donatı çapı, aderans koşulları ve seçili demo katsayılarının bindirme boyu üzerindeki etkisini görselleştiren etkileşimli bir demodur. Standart uyumluluk hesabı veya proje tasarım aracı değildir. Non-authoritative interactive demo. Not for design or construction decisions.
        </p>
        <p className="leading-relaxed mt-1">
          Bu araç yalnız etkileşimli demo amacıyla hazırlanmıştır. Tasarım, uygulama veya imalat kararlarında kullanılamaz. İlgili Eurocode 2 standardı, ulusal ek, beton sınıfı, donatı koşulları ve proje gereksinimleri yetkili mühendis tarafından doğrulanmalıdır.
        </p>
      </div>

      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="text-orange-500" size={18} />
          <h4 className="font-black text-zinc-100 uppercase tracking-widest text-[10px]">ALLPLAN Sandbox: Donatı Detaylandırma Simülatörü (Demo)</h4>
        </div>
        <Button
          variant="ghost"
          onClick={resetSimulator}
          className="text-zinc-500 hover:text-zinc-300 font-mono text-[9px] h-auto p-0 flex items-center gap-1 uppercase tracking-widest"
        >
          <RefreshCw size={10} /> Sıfırla
        </Button>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
        XC3 etiketli demo senaryosunda hedef demo değeri 35 mm olarak seçilmiştir. Gerçek nominal beton örtüsü; maruziyet sınıfı, yapısal sınıf, aderans gereksinimi, uygulama toleransı, ulusal ek ve proje koşullarına göre belirlenmelidir. Aşağıdaki paspayı ayarını 35 mm yaparak donatı yerleşim simülasyonunu tamamlayın!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sliders Console */}
        <div className="col-span-12 md:col-span-5 space-y-4">
          <div className="space-y-3">
            {/* Cover range slider */}
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400 font-bold">
                <span>AKTİF PASPAYI (COVER)</span>
                <span className={coverMm >= 35 ? "text-emerald-500" : "text-red-500"}>{coverMm} mm</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="5"
                value={coverMm}
                onChange={(e) => handleCoverChange(parseInt(e.target.value))}
                className="w-full accent-orange-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-zinc-600 font-mono">
                <span>15 mm (Minimum)</span>
                <span>35 mm (Gerekli)</span>
                <span>50 mm (Maksimum)</span>
              </div>
            </div>

            {/* Concrete Selection */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Beton Sınıfı</label>
              <div className="grid grid-cols-5 gap-1">
                {['C20/25', 'C25/30', 'C30/37', 'C35/45', 'C40/50'].map(grade => (
                  <button
                    key={grade}
                    onClick={() => setConcreteGrade(grade)}
                    className={`font-mono text-[9px] py-1 border rounded-md transition-colors ${
                      concreteGrade === grade ? 'bg-orange-600 border-orange-600 text-white font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Bar Diameter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                <span className="uppercase font-black text-zinc-500 tracking-wider">DONATI ÇAPI (Φ)</span>
                <span className="text-orange-500 font-bold">{barDiameter} mm</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[8, 12, 16, 20, 25, 32].map(dia => (
                  <button
                    key={dia}
                    onClick={() => setBarDiameter(dia)}
                    className={`font-mono text-[9px] py-1 border rounded-md transition-colors ${
                      barDiameter === dia ? 'bg-orange-600 border-orange-600 text-white font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    Φ{dia}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Structural drawing */}
        <div className="col-span-12 md:col-span-7 bg-zinc-950 border border-zinc-800 p-4 flex flex-col items-center justify-center relative min-h-[300px] rounded-xl">
          <div className="absolute top-3 left-3 text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1">
            <Info size={10} /> Ölçekli Donatı Bindirme Çizimi
          </div>

          <div className="w-full max-w-[340px] aspect-[4/3] flex items-center justify-center">
            <svg viewBox="0 0 320 240" className="w-full h-full">
              {/* Outer Concrete boundary */}
              <rect x="20" y="70" width="280" height="100" fill="#1e293b" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <text x="30" y="85" fill="#64748b" fontSize="8" fontFamily="monospace">KOLON ELEMANI: {concreteGrade}</text>

              {/* Draw cover lines offset visually based on coverMm */}
              {/* Offset from outer boundaries (x=20 to x=300, y=70 to y=170) */}
              {/* Cover line on top and bottom */}
              <line x1="20" y1={70 + coverMm} x2="300" y2={70 + coverMm} stroke="#ea580c" strokeWidth="0.5" strokeDasharray="1 3" opacity="0.8" />
              <line x1="20" y1={170 - coverMm} x2="300" y2={170 - coverMm} stroke="#ea580c" strokeWidth="0.5" strokeDasharray="1 3" opacity="0.8" />

              {/* Bar 1 (Left bar) */}
              <path d={`M 10,${120 - coverMm/4} L 210,${120 - coverMm/4}`} stroke="#f43f5e" strokeWidth={Math.max(2, barDiameter/4)} strokeLinecap="round" />
              <path d={`M 10,${120 - coverMm/4} L 10,145`} stroke="#f43f5e" strokeWidth={Math.max(2, barDiameter/4)} strokeLinecap="round" />

              {/* Bar 2 (Right bar) */}
              <path d={`M 110,${120 + coverMm/4} L 310,${120 + coverMm/4}`} stroke="#3b82f6" strokeWidth={Math.max(2, barDiameter/4)} strokeLinecap="round" />
              <path d={`M 310,${120 + coverMm/4} L 310,95`} stroke="#3b82f6" strokeWidth={Math.max(2, barDiameter/4)} strokeLinecap="round" />

              {/* Overlap area highlighting */}
              <rect x="110" y="90" width="100" height="60" fill="#3b82f6" fillOpacity="0.08" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2 2" />

              {/* Overlap dimensioning line */}
              <line x1="110" y1="175" x2="210" y2="175" stroke="#f59e0b" strokeWidth="1" />
              <line x1="110" y1="170" x2="110" y2="180" stroke="#f59e0b" strokeWidth="1" />
              <line x1="210" y1="170" x2="210" y2="180" stroke="#f59e0b" strokeWidth="1" />
              <text x="160" y="190" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">
                l0 = {calculatedLapLength} mm
              </text>
            </svg>
          </div>

          {/* Results Summary Box */}
          <div className="w-full bg-zinc-900 border border-zinc-800 p-3 flex justify-between items-center font-mono text-[10px] mt-2 rounded-xl">
            <div>
              <p className="text-zinc-500 uppercase text-[8px] font-bold">Simülasyon sonucu (l0)</p>
              <p className="text-sm font-black text-zinc-100">{calculatedLapLength} mm <span className="text-[9px] text-zinc-400">({(calculatedLapLength/10).toFixed(1)} cm)</span></p>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 uppercase text-[8px] font-bold">Paspayı Durumu</p>
              <p className={`text-[10px] font-bold uppercase ${coverMm >= 35 ? "text-emerald-500" : "text-red-500 animate-pulse"}`}>
                {coverMm >= 35 ? "Hedef Değer Sağlandı" : "Yetersiz Paspayı"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
