/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Layers, RefreshCw, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WallLayer {
  name: string;
  color: string;
  hatchPattern: string;
  width: number; // in cm
  priority: number; // Allplan priority value: 100 - 900
}

interface WallIntersectionSimulatorProps {
  onValueChange?: (val: string) => void;
  initialPriority?: number;
}

export const WallIntersectionSimulator: React.FC<WallIntersectionSimulatorProps> = ({
  onValueChange,
  initialPriority = 300
}) => {
  const [layers, setLayers] = useState<WallLayer[]>([
    { name: 'Taşıyıcı Betonarme (Core)', color: '#4b5563', hatchPattern: 'stripes', width: 20, priority: initialPriority },
    { name: 'Isı Yalıtım Levhası', color: '#fbbf24', hatchPattern: 'dots', width: 12, priority: 300 },
    { name: 'Dış Tuğla Duvar Kaplaması', color: '#b91c1c', hatchPattern: 'brick', width: 10, priority: 400 },
  ]);

  const [activeLayerIdx, setActiveLayerIdx] = useState<number>(0);

  const updateLayer = (index: number, fields: Partial<WallLayer>) => {
    setLayers(prev => prev.map((layer, idx) => {
      if (idx === index) {
        const nextLayer = { ...layer, ...fields };
        if (index === 0 && fields.priority !== undefined && onValueChange) {
          onValueChange(fields.priority.toString());
        }
        return nextLayer;
      }
      return layer;
    }));
  };

  const sortedLayersByPriority = useMemo(() => {
    return [...layers].map((l, originalIdx) => ({ ...l, originalIdx })).sort((a, b) => b.priority - a.priority);
  }, [layers]);

  const resetSimulator = () => {
    setLayers([
      { name: 'Taşıyıcı Betonarme (Core)', color: '#4b5563', hatchPattern: 'stripes', width: 20, priority: 300 },
      { name: 'Isı Yalıtım Levhası', color: '#fbbf24', hatchPattern: 'dots', width: 12, priority: 300 },
      { name: 'Dış Tuğla Duvar Kaplaması', color: '#b91c1c', hatchPattern: 'brick', width: 10, priority: 400 },
    ]);
    if (onValueChange) {
      onValueChange('300');
    }
  };

  const p0 = layers[0].priority;
  const p1 = layers[1].priority;

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 space-y-6">
      {/* Disclaimer and Non-authoritative Demo labels */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-[10px] text-orange-500 font-sans space-y-1">
        <p className="font-black uppercase tracking-wider">⚠️ INTERACTIVE DEMO SIMULATOR / NON-AUTHORITATIVE DEMO</p>
        <p className="leading-relaxed">
          Bu araç yalnız etkileşimli demo amacıyla hazırlanmıştır. Tasarım, uygulama veya imalat kararlarında kullanılamaz. Priority 500, ALLPLAN’ın evrensel standardı değildir. Bu değer simüle edilmiş demo ofis kuralıdır. Not for design or construction decisions.
        </p>
      </div>

      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="text-orange-500" size={18} />
          <h4 className="font-black text-zinc-100 uppercase tracking-widest text-[10px]">ALLPLAN Sandbox: Katman Priority Simülasyonu (Demo)</h4>
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
        Her katmanın <strong className="text-orange-500">Priority (Öncelik) değerini</strong> ayarlayın. ALLPLAN'da, köşelerde yüksek priority değerine sahip katmanlar düşük priority katmanlarını keser. Betonarme katmanının priority değerini tuğla (400) ve yalıtım (300) katmanlarından yüksek (en az 500) yaparak birleşimi düzeltin!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sliders Console */}
        <div className="col-span-12 md:col-span-5 space-y-4">
          <div className="space-y-3">
            {layers.map((layer, idx) => {
              const isSelected = activeLayerIdx === idx;
              return (
                <div
                  key={layer.name}
                  onClick={() => setActiveLayerIdx(idx)}
                  className={`p-3 border transition-all cursor-pointer rounded-xl ${
                    isSelected ? 'bg-zinc-900 border-orange-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-sm" style={{ backgroundColor: layer.color }} />
                      <span className="text-xs font-black text-zinc-100">{layer.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-orange-500 bg-orange-600/10 px-1.5 py-0.5 rounded-md font-bold">
                      PRIO: {layer.priority}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-zinc-800">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                          <span>PRIORITY (ÖNCELİK DEĞERİ)</span>
                          <span>{layer.priority} (100 - 900)</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="900"
                          step="50"
                          value={layer.priority}
                          onChange={(e) => updateLayer(idx, { priority: parseInt(e.target.value) })}
                          className="w-full accent-orange-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                          <span>KALINLIK (GENİŞLİK)</span>
                          <span>{layer.width} cm</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="40"
                          value={layer.width}
                          onChange={(e) => updateLayer(idx, { width: parseInt(e.target.value) })}
                          className="w-full accent-orange-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 space-y-2 font-mono text-[10px] rounded-xl">
            <div className="flex items-center gap-1 text-emerald-500">
              <Sparkles size={12} />
              <span className="font-black uppercase text-[9px] tracking-wider">Hiyerarşik Sıralama</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-zinc-400">
              {sortedLayersByPriority.map((layer, i) => (
                <li key={layer.name}>
                  <span className="text-zinc-200 font-bold">{layer.name}</span> (Prio: {layer.priority}) - {i === 0 ? 'Ana Taşıyıcı Core' : i === 1 ? 'İkincil Katman' : 'Tali Katman'}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Dynamic CAD Canvas View */}
        <div className="col-span-12 md:col-span-7 bg-zinc-950 border border-zinc-800 p-4 flex flex-col items-center justify-center relative min-h-[300px] rounded-xl">
          <div className="absolute top-3 left-3 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            2D CAD Köşe Detayı (Kat Planı Görünümü)
          </div>

          <div className="w-full max-w-[280px] aspect-square relative flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                <pattern id="stripes" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#ea580c" strokeWidth="1" opacity="0.3" />
                </pattern>
                <pattern id="dots" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.2" fill="#fbbf24" opacity="0.4" />
                </pattern>
                <pattern id="brick" width="12" height="12" patternUnits="userSpaceOnUse">
                  <rect width="12" height="6" fill="none" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" />
                  <line x1="6" y1="6" x2="6" y2="12" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" />
                </pattern>
              </defs>

              {(() => {
                const w0 = layers[0].width * 1.5;
                const w1 = layers[1].width * 1.5;
                const w2 = layers[2].width * 1.5;

                const p2 = layers[2].priority;

                const ConcreteCutsInsulation = p0 >= p1;
                const InsulationCutsBrick = p1 >= p2;

                return (
                  <g className="transition-all duration-300">
                    <rect x="0" y="0" width="200" height="200" fill="transparent" />
                    <line x1="100" y1="0" x2="100" y2="200" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 4" />
                    <line x1="0" y1="100" x2="200" y2="100" stroke="#27272a" strokeWidth="0.5" strokeDasharray="2 4" />

                    {/* Dış Tuğla Duvar Kaplaması */}
                    <path
                      d={`M 0,20 L 180,20 L 180,200 L ${180 - w2},200 L ${180 - w2},${20 + w2} L 0,${20 + w2} Z`}
                      fill="#b91c1c"
                      fillOpacity="0.15"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                    />
                    <path
                      d={`M 0,20 L 180,20 L 180,200 L ${180 - w2},200 L ${180 - w2},${20 + w2} L 0,${20 + w2} Z`}
                      fill="url(#brick)"
                    />

                    {/* Isı Yalıtım Levhası */}
                    {InsulationCutsBrick ? (
                      <path
                        d={`M 0,${20 + w2} L ${180 - w2},${20 + w2} L ${180 - w2},200 L ${180 - w2 - w1},200 L ${180 - w2 - w1},${20 + w2 + w1} L 0,${20 + w2 + w1} Z`}
                        fill="#fbbf24"
                        fillOpacity="0.15"
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                      />
                    ) : (
                      <path
                        d={`M 0,${20 + w2} L ${180 - w2},${20 + w2} L ${180 - w2},200 L ${180 - w2 - w1},200 L ${180 - w2 - w1},${20 + w2 + w1} L 0,${20 + w2 + w1} Z`}
                        fill="#fbbf24"
                        fillOpacity="0.05"
                        stroke="#27272a"
                        strokeWidth="1"
                        opacity="0.8"
                      />
                    )}
                    <path
                      d={`M 0,${20 + w2} L ${180 - w2},${20 + w2} L ${180 - w2},200 L ${180 - w2 - w1},200 L ${180 - w2 - w1},${20 + w2 + w1} L 0,${20 + w2 + w1} Z`}
                      fill="url(#dots)"
                    />

                    {/* Taşıyıcı Betonarme */}
                    {ConcreteCutsInsulation ? (
                      <path
                        d={`M 0,${20 + w2 + w1} L ${180 - w2 - w1},${20 + w2 + w1} L ${180 - w2 - w1},200 L ${180 - w2 - w1 - w0},200 L ${180 - w2 - w1 - w0},${20 + w2 + w1 + w0} L 0,${20 + w2 + w1 + w0} Z`}
                        fill="#4b5563"
                        fillOpacity="0.3"
                        stroke="#ea580c"
                        strokeWidth="2"
                      />
                    ) : (
                      <path
                        d={`M 0,${20 + w2 + w1} L ${180 - w2 - w1},${20 + w2 + w1} L ${180 - w2 - w1},200 L ${180 - w2 - w1 - w0},200 L ${180 - w2 - w1 - w0},${20 + w2 + w1 + w0} L 0,${20 + w2 + w1 + w0} Z`}
                        fill="#4b5563"
                        fillOpacity="0.15"
                        stroke="#475569"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}
                    <path
                      d={`M 0,${20 + w2 + w1} L ${180 - w2 - w1},${20 + w2 + w1} L ${180 - w2 - w1},200 L ${180 - w2 - w1 - w0},200 L ${180 - w2 - w1 - w0},${20 + w2 + w1 + w0} L 0,${20 + w2 + w1 + w0} Z`}
                      fill="url(#stripes)"
                    />

                    {/* Visual indicators */}
                    <circle cx={180 - w2 - w1} cy={20 + w2 + w1} r="4" fill={ConcreteCutsInsulation ? "#10b981" : "#ef4444"} />
                    <text x={180 - w2 - w1 + 8} y={20 + w2 + w1 + 3} fill="#f4f4f5" fontSize="6" fontFamily="monospace" fontWeight="bold">
                      {ConcreteCutsInsulation ? 'KÖŞE BAĞLANTISI DOĞRU' : 'ÇAKIŞMA (GEÇERSİZ BİRLEŞİM)'}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Educational Status message */}
          <div className="w-full text-center mt-3 text-[10px] font-mono text-zinc-300">
            {layers[0].priority >= layers[1].priority ? (
              <span className="text-emerald-500 flex items-center justify-center gap-1">
                <CheckCircle size={12} /> Betonarme taşıyıcı yalıtımı doğru şekilde kesiyor (Concrete {layers[0].priority} &gt; Insulation {layers[1].priority}).
              </span>
            ) : (
              <span className="text-red-500 flex items-center justify-center gap-1 font-bold">
                <AlertCircle size={12} /> HATA: Isı Yalıtımı ({layers[1].priority}) betonarme çekirdeği ({layers[0].priority}) kesiyor. Taşıyıcı bütünlük bozuldu!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
