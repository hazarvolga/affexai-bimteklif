import { canPreviewIfcInBrowser } from "@/ifc/browser-preview";
import React, { useState } from 'react';
import { Upload, CheckCircle2, ChevronRight, FileText, Calculator, FileCheck2, Loader2, FileCode, AlertTriangle, Box } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parseIfcText } from '@/ifc/parser/legacy-parser';
import { fetchWithAuth } from '@/lib/api';
import { toast } from 'sonner';

type ParsedIfcData = ReturnType<typeof parseIfcText>;

type Step = 'upload' | 'review' | 'price' | 'quote';

export function DosyadanTeklifDemo() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedIfcData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  
  // Slide-over inspector state
  const [isSlideoverOpen, setIsSlideoverOpen] = useState(false);
  const [selectedElements, setSelectedElements] = useState<any[]>([]);
  const [pozDraftByGuid, setPozDraftByGuid] = useState<Record<string, string>>({});

  // Birim fiyat state'leri (teklif taslağına aktarılır)
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({
    'beton': 2450.00,
    'donati': 24500.00,
    'kalip': 1250.00,
  });

  const handleAssignPoz = (guid: string) => {
    const code = (pozDraftByGuid[guid] ?? '').trim();
    if (!code) {
      toast.warning('Lütfen geçerli bir poz numarası girin (örn. 15.120.1001).');
      return;
    }
    setParsedData((prev) => {
      if (!prev) return prev;
      const nextElements = prev.elements.map((el) => el.guid === guid ? { ...el, pozNo: code } : el);
      const withPoz = nextElements.filter((el) => Boolean(el.pozNo)).length;
      return {
        ...prev,
        elements: nextElements,
        summary: {
          ...prev.summary,
          elementsWithPozNoCount: withPoz,
          elementsMissingPozNoCount: nextElements.length - withPoz,
        },
      };
    });
    setSelectedElements((prev) => prev.filter((el) => el.guid !== guid));
    toast.success(`Poz (${code}) elemana atandı.`);
  };

  const handleFileUpload = async (file: File) => {
    if (!canPreviewIfcInBrowser(file.size)) {
      toast.warning('Tarayıcı önizleme sınırı 25 MB. Büyük IFC dosyanızı SmartCheck üzerinden yükleyin.');
      navigate('/app/smartcheck');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      toast.error('Şimdilik sadece geçerli bir .ifc uzantılı dosya desteklenmektedir.');
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);

    try {
      const quotaRes = await fetchWithAuth('/api/ifc/quick-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size }),
      });
      if (!quotaRes.ok) {
        const errBody = await quotaRes.json().catch(() => ({}));
        toast.error(errBody.error || errBody.message || 'IFC hızlı kontrol kotası doğrulanamadı.');
        setIsProcessing(false);
        return;
      }
    } catch {
      toast.error('Sunucu kota kontrolüne ulaşılamadı.');
      setIsProcessing(false);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => { setIsProcessing(false); toast.error('Dosya okunamadı.'); };
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setTimeout(() => {
        try {
          const result = parseIfcText(text);
          if (result.summary.parseStatus === 'failed') {
            toast.error('Dosya okunamadı veya desteklenen IFC elemanı bulunamadı.');
            setIsProcessing(false);
            return;
          }
          
          setParsedData(result);
          setIsProcessing(false);
          setCurrentStep('review');
          toast.success('IFC başarıyla analiz edildi.');
        } catch (err) {
          console.error(err);
          toast.error('Dosya ayrıştırılırken bir hata oluştu.');
          setIsProcessing(false);
        }
      }, 300);
    };
    reader.readAsText(file);
  };

  const handleCreateQuote = () => {
    if (!parsedData) return;
    setIsProcessing(true);
    
    const evidenceElementCount = parsedData.elements.filter((e) => e.quantitySource === 'qto' || e.quantitySource === 'property').length;
    sessionStorage.setItem('teklifpro_ifc_extracted', JSON.stringify({
      source: 'dosyadan-teklif',
      transferredAt: new Date().toISOString(),
      evidenceElementCount,
      summary: parsedData.summary,
      unitPrices,
    }));

    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep('quote');
    }, 300);
  };

  const StepIndicator = () => (
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-8 px-2 sm:px-8 max-w-3xl mx-auto">
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
            <div className={`flex flex-col items-center ${isActive ? 'text-primary' : isPast ? 'text-zinc-100' : 'text-zinc-400'}`}>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 mb-2 ${isActive ? 'border-primary bg-primary/10' : isPast ? 'border-zinc-200 bg-zinc-900' : 'border-zinc-800 bg-zinc-900'}`}>
                {isPast ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" /> : <Icon className="w-5 h-5 sm:w-6 sm:h-6" />}
              </div>
              <span className="text-xs sm:text-sm font-medium">{s.label}</span>
            </div>
            {index < 3 && (
              <div className="hidden sm:block mx-2 md:mx-4 text-zinc-600">
                <ChevronRight className="w-5 h-5" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const getConcreteVol = () => parsedData?.summary?.totalVolumeM3 || 0;
  const getSteelTon = () => parsedData?.summary?.totalRebarTon || 0;
  const getFormworkArea = () => parsedData?.summary?.totalFormworkM2 || 0;
  const getPozCount = () => parsedData?.summary?.elementsWithPozNoCount || 0;
  
  const totalPrice = 
    (getConcreteVol() * unitPrices.beton) + 
    (getSteelTon() * unitPrices.donati) + 
    (getFormworkArea() * unitPrices.kalip);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto text-zinc-100">
      <div className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dosyadan Teklif Oluştur</h1>
        <p className="text-sm sm:text-base text-zinc-400">25 MB’a kadar IFC ön incelemesi. Büyük dosyalar için SmartCheck kullanın; miktarlar teknik onay, örnek fiyatlar doğrulama bekler.</p>
      </div>

      <StepIndicator />

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-8 min-h-[400px] flex flex-col justify-center relative shadow-2xl">
        {isProcessing && (
          <div className="absolute inset-0 bg-zinc-950/80 rounded-xl flex flex-col items-center justify-center z-10 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium text-zinc-200">İşleniyor...</p>
          </div>
        )}

        {currentStep === 'upload' && (
          <div className="text-center max-w-2xl mx-auto w-full">
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-zinc-700 rounded-xl p-8 sm:p-16 hover:border-primary/50 transition-colors cursor-pointer bg-zinc-950/50 flex flex-col items-center justify-center group"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileCode className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">BIM Dosyanızı Buraya Bırakın</h3>
              <p className="text-zinc-400 mb-8 max-w-sm">IFC formatındaki Allplan, Revit veya Archicad modelinizi sürükleyip bırakın.</p>
              
              <label className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 cursor-pointer shadow-lg">
                Dosya Seç
                <input type="file" accept=".ifc" className="hidden" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]);
                }} />
              </label>
            </div>
          </div>
        )}

        {currentStep === 'review' && parsedData && (
          <div className="space-y-6 max-w-3xl mx-auto w-full">
            <div className="flex flex-wrap justify-between items-end gap-3 mb-4">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Metraj Özeti</h3>
                <p className="text-zinc-400">"{fileName}" dosyasından çıkarılan temel değerler.</p>
              </div>
              {getPozCount() > 0 ? (
                <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {getPozCount()} ÇŞB Pozu Yakalandı
                </span>
              ) : (
                <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> ÇŞB Pozu Bulunamadı
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl">
                <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Toplam Beton</div>
                <div className="text-2xl font-black text-white">{getConcreteVol().toLocaleString('tr-TR', { maximumFractionDigits: 2 })} <span className="text-sm font-normal text-zinc-400">m³</span></div>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl">
                <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Toplam Donatı</div>
                <div className="text-2xl font-black text-white">{getSteelTon().toLocaleString('tr-TR', { maximumFractionDigits: 2 })} <span className="text-sm font-normal text-zinc-400">Ton</span></div>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl">
                <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Toplam Kalıp</div>
                <div className="text-2xl font-black text-white">{getFormworkArea().toLocaleString('tr-TR', { maximumFractionDigits: 2 })} <span className="text-sm font-normal text-zinc-400">m²</span></div>
              </div>
            </div>
            
            {(() => {
              const missingPozElements = parsedData.elements.filter(e => !e.pozNo);
              if (missingPozElements.length > 0) {
                return (
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5 mt-6 transition-all hover:bg-orange-500/10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 bg-orange-500/20 text-orange-400 rounded-lg">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-orange-400 font-bold text-lg">Uçuş Öncesi Kontrol: {missingPozElements.length} Sorun Bulundu</h4>
                          <p className="text-zinc-400 text-sm mt-1 mb-3">Modeldeki bazı elemanlarda ÇŞB poz numarası eksik. Bu durum fiyatlandırmada sapmalara yol açabilir.</p>
                          <button 
                            onClick={() => { setSelectedElements(missingPozElements); setIsSlideoverOpen(true); }}
                            className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-500/30 transition-colors"
                          >
                            Sorunları İncele & Çöz ({missingPozElements.length} Eleman)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 mt-6 flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 text-green-400 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-green-400 font-bold text-base">Tüm Kontroller Başarılı</h4>
                    <p className="text-green-400/80 text-sm">Modeldeki tüm taşıyıcı elemanlar ÇŞB pozlarıyla tam uyumlu.</p>
                  </div>
                </div>
              );
            })()}
            
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-zinc-800">
               <button onClick={() => setCurrentStep('upload')} className="text-zinc-400 hover:text-white font-medium px-4 py-2 transition-colors">
                İptal Et
              </button>
              <button onClick={() => setCurrentStep('price')} className="bg-white text-zinc-950 px-8 py-3 rounded-xl font-bold hover:bg-zinc-200 flex items-center transition-colors">
                Devam Et: Fiyatlandır <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'price' && parsedData && (
          <div className="space-y-6 max-w-4xl mx-auto w-full">
            <div>
              <h3 className="text-2xl font-bold mb-1">Birim Fiyatlandırma</h3>
              <p className="text-zinc-400">Güncel poz fiyatları üzerinden maliyetinizi hesaplayın.</p>
            </div>
            
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900 border-b border-zinc-800">
                  <tr>
                    <th className="p-4 font-bold text-zinc-300">Kalem</th>
                    <th className="p-4 font-bold text-zinc-300 text-right">Miktar</th>
                    <th className="p-4 font-bold text-zinc-300 text-right">Birim Fiyat (₺)</th>
                    <th className="p-4 font-bold text-zinc-300 text-right">Toplam (₺)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  <tr className="hover:bg-zinc-900/50 transition-colors">
                    <td className="p-4 font-medium text-white">Hazır Beton</td>
                    <td className="p-4 text-right text-zinc-400">{getConcreteVol().toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m³</td>
                    <td className="p-4 text-right">
                      <input 
                        type="number" 
                        value={unitPrices.beton} 
                        onChange={(e) => setUnitPrices({...unitPrices, beton: Number(e.target.value)})}
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-right w-32 text-white focus:outline-none focus:border-primary" 
                      />
                    </td>
                    <td className="p-4 text-right font-bold text-white">
                      {(getConcreteVol() * unitPrices.beton).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-zinc-900/50 transition-colors">
                    <td className="p-4 font-medium text-white">Nervürlü Çelik (Donatı)</td>
                    <td className="p-4 text-right text-zinc-400">{getSteelTon().toLocaleString('tr-TR', { maximumFractionDigits: 2 })} Ton</td>
                    <td className="p-4 text-right">
                      <input 
                        type="number" 
                        value={unitPrices.donati} 
                        onChange={(e) => setUnitPrices({...unitPrices, donati: Number(e.target.value)})}
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-right w-32 text-white focus:outline-none focus:border-primary" 
                      />
                    </td>
                    <td className="p-4 text-right font-bold text-white">
                       {(getSteelTon() * unitPrices.donati).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                   <tr className="hover:bg-zinc-900/50 transition-colors">
                    <td className="p-4 font-medium text-white">Kalıp İskelesi & Yüzeyi</td>
                    <td className="p-4 text-right text-zinc-400">{getFormworkArea().toLocaleString('tr-TR', { maximumFractionDigits: 2 })} m²</td>
                    <td className="p-4 text-right">
                      <input 
                        type="number" 
                        value={unitPrices.kalip} 
                        onChange={(e) => setUnitPrices({...unitPrices, kalip: Number(e.target.value)})}
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-right w-32 text-white focus:outline-none focus:border-primary" 
                      />
                    </td>
                    <td className="p-4 text-right font-bold text-white">
                       {(getFormworkArea() * unitPrices.kalip).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-950 p-6 rounded-xl flex justify-between items-center border border-zinc-800">
               <span className="text-zinc-400 font-medium">Ara Toplam:</span>
               <span className="text-3xl font-black text-white">₺ {totalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-zinc-800">
              <button onClick={() => setCurrentStep('review')} className="text-zinc-400 hover:text-white font-medium px-4 py-2 transition-colors">
                Geri Dön
              </button>
              <button onClick={handleCreateQuote} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 flex items-center shadow-lg transition-colors">
                Teklifi Hazırla <CheckCircle2 className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'quote' && (
          <div className="text-center py-12 max-w-md mx-auto">
            <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-green-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-black text-white mb-3">Ön İnceleme Aktarıma Hazır!</h3>
            <p className="text-zinc-400 mb-10 leading-relaxed">
              Beton, donatı ve kalıp metrajlarınız ile girdiğiniz birim fiyatlar yeni teklif taslağına aktarılmak üzere hazırlandı.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/app/quotes/new')} className="bg-white text-zinc-950 px-8 py-4 rounded-xl font-bold hover:bg-zinc-200 transition-colors w-full shadow-lg">
                Teklif Cetveline Aktar
              </button>
              <button onClick={() => { setParsedData(null); setCurrentStep('upload'); }} className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-8 py-4 rounded-xl font-bold hover:bg-zinc-800 transition-colors w-full">
                Yeni Dosya Yükle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Element Inspector Panel */}
      {isSlideoverOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsSlideoverOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Box className="w-5 h-5 text-primary" /> Eksik Pozlu Eleman Denetçisi
              </h3>
              <button onClick={() => setIsSlideoverOpen(false)} className="text-zinc-400 hover:text-white transition-colors" aria-label="Paneli kapat">
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Element Breakdown Summary */}
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Poz Bekleyen Eleman Sayısı</span>
                  <strong className="font-mono text-orange-400">{selectedElements.length} adet</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Toplam Etkilenen Hacim</span>
                  <strong className="font-mono text-white">
                    {selectedElements.reduce((sum, el) => sum + Number(el.volumeM3 || 0), 0).toFixed(2)} m³
                  </strong>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-zinc-300 mb-3 uppercase tracking-wider">Eksik Poz Listesi</h4>
                <div className="space-y-3">
                  {selectedElements.slice(0, 10).map((el) => (
                    <div key={el.guid} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-orange-500/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-white font-medium text-sm">{el.name || el.type}</span>
                        <span className="text-zinc-400 text-xs font-mono">GUID: {el.guid.substring(0, 8)}...</span>
                      </div>
                      <div className="text-zinc-400 text-xs mb-3">Hacim: {Number(el.volumeM3 || 0).toFixed(2)} m³ · Kat: {el.storey}</div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          aria-label={`Poz numarası ${el.guid}`}
                          placeholder="15.120.1001"
                          value={pozDraftByGuid[el.guid] ?? ''}
                          onChange={(e) => setPozDraftByGuid((prev) => ({ ...prev, [el.guid]: e.target.value }))}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm text-white focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAssignPoz(el.guid)}
                          className="bg-primary text-primary-foreground px-3 py-1.5 rounded font-bold text-sm hover:bg-primary/90"
                        >
                          Ata
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedElements.length > 10 && (
                    <div className="text-center text-zinc-400 text-xs mt-4">
                      + {selectedElements.length - 10} eleman daha...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DosyadanTeklifDemo;
