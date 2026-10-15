import { useEffect, useState } from 'react';
import { Calendar, Search, ShieldAlert, CheckCircle, Info, Database, Layers, ArrowRight, Award, ExternalLink } from 'lucide-react';
import { TimelineEvent, PozCode } from '../../types';
import { fetchWithAuth } from '@/lib/api';

interface LiveRegulationItem {
  id: string;
  code: string;
  title: string;
  category?: string;
}

export default function LegislationView() {
  const [activeYear, setActiveYear] = useState<string>('2023');
  const [pozSearch, setPozSearch] = useState<string>('');
  const [liveRegulationsCount, setLiveRegulationsCount] = useState<number | null>(null);

  useEffect(() => {
    fetchWithAuth('/api/regulations')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setLiveRegulationsCount(data.length);
        } else if (data && Array.isArray((data as { regulations?: LiveRegulationItem[] }).regulations)) {
          setLiveRegulationsCount((data as { regulations: LiveRegulationItem[] }).regulations.length);
        }
      })
      .catch(() => {});
  }, []);

  const timelineEvents: TimelineEvent[] = [
    {
      year: '2021',
      title: 'Kamu Binaları BIM Kılavuzu Yayınlandı',
      description: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı öncülüğünde ilk resmi ulusal kılavuz yayınlandı. Kamu binalarında standartların çerçevesi çizildi.',
      status: 'completed'
    },
    {
      year: '2023',
      title: 'Büyük Ölçekli Yapılarda BIM Zorunluluğu',
      description: 'Toplam inşaat alanı 30.000 m² üzerindeki tüm hastaneler, toplu konutlar ve raylı sistem projelerinde ISO 19650 uyumlu model teslimatı zorunlu hale getirildi.',
      status: 'completed'
    },
    {
      year: '2025',
      title: 'Yerel Yönetimler ve İmar Entegrasyonu',
      description: 'Belediyelerin dijital ruhsat süreçlerinde model tabanlı imar kontrollerinin pilot bölgelerde başlatılması ve yaygınlaştırılması süreci.',
      status: 'ongoing'
    },
    {
      year: '2027',
      title: 'Otonom Denetim ve Tam e-PYS Entegrasyonu',
      description: 'Tüm kamu projelerinde insan faktöründen bağımsız, otonom bulut çakışma kontrolleri ve Elektronik Proje Yönetim Sistemi (e-PYS) üzerinden tam dijital hak ediş onayları hedefi.',
      status: 'future'
    }
  ];

  const activeEvent = timelineEvents.find(e => e.year === activeYear) || timelineEvents[1];

  // Ministry Poz database mapping
  const pozDatabase: PozCode[] = [
    { ifcClass: 'IfcSlab', pozNo: '15.150.1001', description: 'C 25/30 hazır beton dökülmesi (Döşeme ve Radye Temel için)', unit: 'm³' },
    { ifcClass: 'IfcSlab', pozNo: '15.180.1005', description: 'Çelik hasır montajı ve yerine konulması', unit: 'ton' },
    { ifcClass: 'IfcWall', pozNo: '15.150.1002', description: 'C 30/37 hazır beton dökülmesi (Betonarme Perde Duvarlar için)', unit: 'm³' },
    { ifcClass: 'IfcWall', pozNo: '15.220.1010', description: '19x19x13.5 cm yatay delikli tuğla ile duvar yapılması', unit: 'm²' },
    { ifcClass: 'IfcColumn', pozNo: '15.150.1004', description: 'C 35/45 hazır beton dökülmesi (Kolon ve Yüksek Mukavemetli Elemanlar)', unit: 'm³' },
    { ifcClass: 'IfcColumn', pozNo: '15.160.1001', description: 'Ahşaptan düz yüzeyli betonarme kolon kalıbı yapılması', unit: 'm²' },
    { ifcClass: 'IfcDoor', pozNo: '15.390.2001', description: 'MDF üzeri laminat kaplı iç mekan ahşap kapı imalatı', unit: 'Adet' },
    { ifcClass: 'IfcWindow', pozNo: '15.410.3005', description: 'Isıcamlı (4+12+4) çift açılır PVC pencere doğraması yapılması', unit: 'm²' },
    { ifcClass: 'IfcFooting', pozNo: '15.140.1001', description: 'Temel altı grobeton dökülmesi (C 16/20)', unit: 'm³' },
    { ifcClass: 'IfcPile', pozNo: '15.130.2050', description: 'Ø 80 cm çapında yerinde dökme fore kazık yapılması', unit: 'metre' },
    { ifcClass: 'IfcFlowSegment', pozNo: '15.520.1001', description: 'Ø 110 mm PVC pis su borusu döşenmesi ve kaynak yapılması', unit: 'metre' },
    { ifcClass: 'IfcFlowTerminal', pozNo: '15.540.2001', description: 'Porselen ayaklı lavabo montajı ve aksesuarları', unit: 'Adet' }
  ];

  const filteredPoz = pozDatabase.filter(p => {
    const term = pozSearch.toLowerCase();
    return p.ifcClass.toLowerCase().includes(term) || 
           p.pozNo.toLowerCase().includes(term) || 
           p.description.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-16">
      
      {/* SECTION HEADER */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl"></div>
        <div className="max-w-3xl space-y-4">
          <span className="text-[11px] font-extrabold text-orange-500 uppercase tracking-widest block">T.C. ÇEVRE, ŞEHİRCİLİK VE İKLİM DEĞİŞİKLİĞİ BAKANLIĞI</span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">Ulusal BIM Mevzuatı &amp; Kamu Entegrasyonu</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Türkiye kamu ihale kanunları çerçevesinde yürütülen BIM süreçlerini, e-PYS Elektronik onay mekanizmalarını ve bakanlık birim fiyat entegrasyon formüllerini keşfedin.
          </p>
          {liveRegulationsCount !== null && liveRegulationsCount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Database className="w-3.5 h-3.5" />
              Sistemde {liveRegulationsCount} aktif mevzuat / yönetmelik kaydı senkronize
            </div>
          )}
        </div>
      </section>

      {/* TIMELINE SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Side: Timeline Navigation */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
          <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            Yol Haritası Milatları
          </h3>

          <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-8">
            {timelineEvents.map((ev) => {
              const isActive = ev.year === activeYear;
              return (
                <div 
                  key={ev.year}
                  onClick={() => setActiveYear(ev.year)}
                  className="relative cursor-pointer group"
                  id={`timeline-node-${ev.year}`}
                >
                  {/* Indicator Dot */}
                  <span className={`absolute -left-[25px] top-1 w-4 h-4 rounded-full border-2 transition-all ${
                    isActive
                      ? 'bg-orange-600 border-white ring-4 ring-orange-100 scale-125'
                      : 'bg-white border-slate-300 group-hover:border-orange-500'
                  }`}></span>

                  <div>
                    <span className={`text-xs font-black mono ${isActive ? 'text-orange-600' : 'text-slate-400'}`}>
                      {ev.year}
                    </span>
                    <h4 className={`text-sm font-extrabold transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-800'}`}>
                      {ev.title}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Milestone details */}
        <div className="lg:col-span-8 bg-white border border-slate-200 p-8 sm:p-10 rounded-2xl shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div className="text-sm font-black text-slate-400 uppercase tracking-wider">Mevzuat Detayları</div>
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-md border ${
              activeEvent.status === 'completed' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : activeEvent.status === 'ongoing'
                ? 'bg-blue-50 text-blue-700 border-blue-100'
                : 'bg-orange-50 text-orange-700 border-orange-100'
            }`}>
              {activeEvent.status === 'completed' && 'YÜRÜRLÜKTE'}
              {activeEvent.status === 'ongoing' && 'HAZIRLIK AŞAMASINDA'}
              {activeEvent.status === 'future' && 'GELECEK HEDEF'}
            </span>
          </div>

          <div className="space-y-4">
            <div className="mono text-4xl font-black text-orange-600">{activeEvent.year}</div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{activeEvent.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {activeEvent.description}
            </p>
          </div>

          {/* Core Legal Requirement Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-100 text-xs text-slate-500">
            <div className="space-y-2">
              <span className="font-extrabold text-slate-800 text-[11px] block uppercase tracking-wider">İHALE BİLEŞENİ GEREKÇESİ</span>
              <p className="leading-relaxed">
                4734 Sayılı Kamu İhale Kanununa göre, teknik personel listesinde "BIM Mühendisi/Koordinatörü" unvanı ve yetkinlik belgeleri ihale şartı olarak aranır.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-extrabold text-slate-800 text-[11px] block uppercase tracking-wider">DENETİM ŞARTI</span>
              <p className="leading-relaxed">
                Yüklenicinin model teslimatları, çakışma raporları ve koordinasyon ispatları idarelerin kontrol mühendisleri tarafından resmi olarak tescil edilir.
              </p>
            </div>
          </div>
        </div>

      </section>

      {/* CORE SPECIFICATIONS METRICS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* e-PYS System */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-bold">
              e
            </div>
            <div>
              <h4 className="font-extrabold text-lg text-slate-900 leading-tight">e-PYS Entegrasyonu Prosedürleri</h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Elektronik Proje Yönetim Sistemi</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Devlet projelerinde, onay aşamasındaki 3D BIM modelleri e-PYS bulut denetim altyapısına yüklenir. Sistem, modelleri otomatik olarak ISO 19650 adlandırma standardına ve IFC yapısına göre kontrol eder. Hatalı dosyalar otomatik olarak reddedilir.
          </p>

          <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-xs text-orange-800 font-bold">
            Önemli: Çakışma ve uyum raporları e-PYS onayından geçmeyen projelerin hakediş imalat ödemeleri sistemsel olarak bloke edilir.
          </div>
        </div>

        {/* Public Tender specifications */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold">
              K
            </div>
            <div>
              <h4 className="font-extrabold text-lg text-slate-900 leading-tight">Kamu İhale Şartnameleri (4734)</h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hukuksal &amp; Teknik Altyapı</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            İhale aşamasında idarelerin şartnameye eklemesi gereken teknik normlar, yükleniciye ait yetkinlik analiz tablosu ve alt yüklenici sözleşme maddeleri detaylandırılmıştır. Şartnamede EIR belgesinin bulunması kanunen zorunludur.
          </p>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-700 font-bold">
            Kriter: Yüklenicinin BIM personeli yetkinliği, mezuniyet belgeleri, sertifikaları ve geçmiş projelerdeki referans referans kodları teyit edilir.
          </div>
        </div>

      </section>

      {/* MINISTRY POZ INTEGRATION (5D) MATCHER TOOL */}
      <section className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm" id="poz-matcher">
        <div className="max-w-3xl mb-8">
          <div className="flex items-center gap-1.5 text-orange-600 font-extrabold text-xs uppercase tracking-widest mb-2">
            <Database className="w-4 h-4" />
            5D MALİYET ENTEGRASYONU
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            T.C. Bakanlık Birim Fiyat (Poz) Eşleştirici
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            OpenBIM standardındaki IFC sınıflarını arayarak, Çevre, Şehircilik ve İklim Değişikliği Bakanlığı'nın resmi birim fiyat poz numaralarıyla olan ilişkisini ve birimlerini anında görüntüleyin.
          </p>
        </div>

        {/* Matcher interface */}
        <div className="space-y-6">
          {/* Search box */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="IFC Sınıfı veya Poz No ara (örn: IfcWall, 15.150...)"
              value={pozSearch}
              onChange={(e) => setPozSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500 text-slate-800"
              id="search-poz"
            />
          </div>

          {/* Database table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-black tracking-wider uppercase border-b border-slate-200 text-[10px]">
                  <th className="p-4">IFC Yapı Sınıfı</th>
                  <th className="p-4">Bakanlık Poz No</th>
                  <th className="p-4">İmalat Açıklaması</th>
                  <th className="p-4 text-right">Ölçü Birimi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPoz.map((poz, idx) => (
                  <tr key={idx} className="hover:bg-orange-50/20 transition-colors">
                    <td className="p-4 font-extrabold text-orange-600 mono">{poz.ifcClass}</td>
                    <td className="p-4 font-bold text-slate-900 mono">{poz.pozNo}</td>
                    <td className="p-4 max-w-sm sm:max-w-md truncate md:whitespace-normal">{poz.description}</td>
                    <td className="p-4 text-right font-black text-slate-500 mono">{poz.unit}</td>
                  </tr>
                ))}
                {filteredPoz.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      Arama kelimesine ait poz veya sınıf eşleşmesi bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-3 bg-orange-50/50 border border-orange-100 p-4 rounded-xl">
            <Info className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
              <strong>Önemli 5D Eşleştirme Kuralı:</strong> Modellerinizde metraj üretirken, IFC sınıflarının içine `Bakanlik_Poz_No` parametresi ekleyerek yukarıdaki kodları tanımlamanız gerekir. Metraj alma yazılımları bu parametre sayesinde saniyeler içinde resmi kamu hakediş dosyası üretebilir.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
