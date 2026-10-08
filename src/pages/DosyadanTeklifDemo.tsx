import React, { useState } from 'react';
import { Upload, CheckCircle2, ChevronRight, FileText, Calculator, FileCheck2, Loader2 } from 'lucide-react';

type Step = 'upload' | 'review' | 'price' | 'quote';

export function DosyadanTeklifDemo() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNextStep = (next: Step) => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep(next);
    }, 800); // Simulate processing time
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8 px-8 max-w-3xl mx-auto">
      {[
        { id: 'upload', icon: Upload, label: '1. Yükle' },
        { id: 'review', icon: FileText, label: '2. İncele' },
        { id: 'price', icon: Calculator, label: '3. Fiyatlandır' },
        { id: 'quote', icon: FileCheck2, label: '4. Teklif Oluştur' },
      ].map((s, index) => {
        const Icon = s.icon;
        const isActive = currentStep === s.id;
        const isPast = ['upload', 'review', 'price', 'quote'].indexOf(currentStep) > index;
        return (
          <div key={s.id} className="flex items-center">
            <div className={`flex flex-col items-center ${isActive ? 'text-primary' : isPast ? 'text-zinc-100' : 'text-zinc-600'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mb-2 ${isActive ? 'border-primary bg-primary/10' : isPast ? 'border-zinc-200 bg-zinc-900' : 'border-zinc-800 bg-zinc-900'}`}>
                {isPast ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Icon className="w-6 h-6" />}
              </div>
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            {index < 3 && (
              <div className="mx-4 text-zinc-700">
                <ChevronRight className="w-6 h-6" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto text-zinc-100">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Dosyadan Teklif (Prototip)</h1>
        <p className="text-zinc-400">Tek tıkla IFC veya Excel dosyalarınızdan metraj çıkarıp teklif hazırlayın.</p>
      </div>

      <StepIndicator />

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 min-h-[400px] flex flex-col justify-center relative">
        {isProcessing && (
          <div className="absolute inset-0 bg-zinc-950/80 rounded-xl flex flex-col items-center justify-center z-10 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium text-zinc-200">İşleniyor...</p>
          </div>
        )}

        {currentStep === 'upload' && (
          <div className="text-center">
            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-12 hover:border-primary/50 transition-colors cursor-pointer bg-zinc-950/50" onClick={() => handleNextStep('review')}>
              <Upload className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Dosyanızı Buraya Bırakın</h3>
              <p className="text-zinc-500 mb-6">IFC veya Excel dosyaları desteklenir (Maks. 50MB)</p>
              <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90">
                Dosya Seç
              </button>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-xl font-semibold">Çıkarılan Metraj Verileri</h3>
                <p className="text-zinc-400">Sistem dosyanızdaki elemanları tespit etti.</p>
              </div>
              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">35 Kalem Bulundu</span>
            </div>
            
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950 text-zinc-400">
                  <tr>
                    <th className="p-4 font-medium">Poz No</th>
                    <th className="p-4 font-medium">Tanım</th>
                    <th className="p-4 font-medium text-right">Miktar</th>
                    <th className="p-4 font-medium">Birim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr className="bg-zinc-900 hover:bg-zinc-800/50">
                    <td className="p-4">15.120.1001</td>
                    <td className="p-4">C25/30 Hazır Beton</td>
                    <td className="p-4 text-right">450.5</td>
                    <td className="p-4">m³</td>
                  </tr>
                  <tr className="bg-zinc-900 hover:bg-zinc-800/50">
                    <td className="p-4">15.130.1005</td>
                    <td className="p-4">Ø 14-32 mm Nervürlü Çelik</td>
                    <td className="p-4 text-right">32.4</td>
                    <td className="p-4">Ton</td>
                  </tr>
                  <tr className="bg-zinc-900 hover:bg-zinc-800/50">
                    <td className="p-4">15.150.1002</td>
                    <td className="p-4">Ahşap Kalıp</td>
                    <td className="p-4 text-right">1250.0</td>
                    <td className="p-4">m²</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end mt-6">
              <button onClick={() => handleNextStep('price')} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 flex items-center">
                Onayla ve Fiyatlandır <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'price' && (
          <div className="space-y-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-xl font-semibold">Fiyatlandırma</h3>
                <p className="text-zinc-400">Birim fiyatları belirleyin veya otomatik pazar fiyatlarını kullanın.</p>
              </div>
            </div>
            
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950 text-zinc-400">
                  <tr>
                    <th className="p-4 font-medium">Tanım</th>
                    <th className="p-4 font-medium text-right">Miktar</th>
                    <th className="p-4 font-medium text-right">Birim Fiyat (₺)</th>
                    <th className="p-4 font-medium text-right">Toplam (₺)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr className="bg-zinc-900">
                    <td className="p-4">C25/30 Hazır Beton</td>
                    <td className="p-4 text-right">450.5 m³</td>
                    <td className="p-4 text-right">
                      <input type="text" defaultValue="2,450.00" className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-right w-24 text-zinc-100" />
                    </td>
                    <td className="p-4 text-right font-medium">1,103,725.00</td>
                  </tr>
                  <tr className="bg-zinc-900">
                    <td className="p-4">Ø 14-32 mm Nervürlü Çelik</td>
                    <td className="p-4 text-right">32.4 Ton</td>
                    <td className="p-4 text-right">
                      <input type="text" defaultValue="24,500.00" className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-right w-24 text-zinc-100" />
                    </td>
                    <td className="p-4 text-right font-medium">793,800.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-950 p-4 rounded-lg flex justify-between items-center border border-zinc-800">
               <span className="text-zinc-400 font-medium">Ara Toplam:</span>
               <span className="text-xl font-bold">₺ 1,897,525.00</span>
            </div>
            
            <div className="flex justify-between mt-6">
              <button onClick={() => setCurrentStep('review')} className="text-zinc-400 hover:text-zinc-200 font-medium px-4 py-2">
                Geri Dön
              </button>
              <button onClick={() => handleNextStep('quote')} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 flex items-center">
                Teklifi Hazırla <CheckCircle2 className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'quote' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Teklifiniz Hazır!</h3>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
              TKF-2026-0045 numaralı teklifiniz başarıyla oluşturuldu. Müşterinize PDF olarak gönderebilirsiniz.
            </p>
            <div className="flex justify-center space-x-4">
              <button className="bg-zinc-800 text-zinc-100 px-6 py-2 rounded-lg font-medium hover:bg-zinc-700">
                PDF Olarak İndir
              </button>
              <button onClick={() => setCurrentStep('upload')} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90">
                Yeni Teklif Başlat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DosyadanTeklifDemo;
