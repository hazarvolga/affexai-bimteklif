import { useEffect, useState } from 'react';
import { Calendar, Search, ShieldAlert, CheckCircle, Info, Database, Layers, ArrowRight, Award, ExternalLink } from 'lucide-react';
import { TimelineEvent, PozCode } from '../../types';
import { fetchWithAuth } from '@/lib/api';
import {
  CAPABILITY_REGISTRY,
  CAPABILITY_REGISTRY_VERSION,
  getLiveCapabilities,
  getPilotCapabilities,
  getRoadmapCapabilities,
} from '../../capabilities/registry';

interface LiveRegulationItem {
  id: string;
  code: string;
  title: string;
  category?: string;
}

export default function LegislationView() {
  const [activeYear, setActiveYear] = useState<string>('2026');
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
      year: '2026',
      title: 'RG 33331: İkiz Dijital Proje & e-PYS Yönetmelikleri',
      description: '5 Ağustos 2026 tarihli ve 33331 sayılı Resmî Gazete\'de Dijital Hazırlama Yönetmeliği (EK-1..EK-9) ile Elektronik Ortamda Teslim ve Yönetim Yönetmeliği (e-PYS) yayımlandı. 6 haneli proje kodu, 9 alanlı dosya şablonu, IFC4X3 (TS EN ISO 16739-1) ve EK-9 kalite kontrol çerçevesi resmileşti.',
      status: 'completed'
    },
    {
      year: '2027',
      title: '1 Eylül 2027 — 1. Faz: PDF/A ve EK-2 Dosya Düzeni Zorunluluğu',
      description: 'Nüfusu 2 milyonu aşan illerin nüfusu 600 bini aşan belediyelerinde, toplam inşaat alanı 5.000 m² üstü yapılarda ISO 19005 (PDF/A) formatı, ISO 216 A4 katları pafta boyutu (m.8(1)), çizim paftalarında tek pafta kuralı (m.8(2)) ve EK-2 adlandırma standardı yürürlüğe girer.',
      status: 'ongoing'
    },
    {
      year: '2028',
      title: '1 Eylül 2028 — 2. Faz: e-PYS Elektronik Teslim ve e-İmza',
      description: 'Elektronik Teslim Yönetmeliği yürürlüğe girer (m.8). Projeler müelliflerce 5070 sayılı Kanuna uygun güvenli elektronik imza ile imzalanarak e-PYS\'ye yüklenir (m.6(1)-(2)). Taranmış PDF\'ler reddedilir (m.6(4)) ve e-PYS dışında elektronik onay ortamı kullanılamaz (m.7(7)).',
      status: 'ongoing'
    },
    {
      year: '2029',
      title: '2029 — 3. Faz: Tüm Yapılarda PDF/A ve 10.000 m² Üstü IFC4X3 Başlangıcı',
      description: '1 Mart 2029\'da diğer tüm yapılarda PDF/A zorunlu olur. 1 Eylül 2029\'da ise büyükşehir merkez belediyelerinde (>2M il / >600B belediye) 10.000 m² üstü yapılarda IFC4X3 (BIM) model teslimi, EK-5/6/7/8 (LOD 300) ve EK-9 (Tablo 9.1 Mimari / Tablo 9.2 Diğer Disiplinler) kontrolü başlar.',
      status: 'future'
    },
    {
      year: '2030-2033',
      title: '4. Faz: Kademeli IFC (BIM) Yaygınlaştırması ve Tam Geçiş',
      description: '1 Eylül 2030 (il >2M, belediye >400B, >10.000 m²), 1 Eylül 2031 (il >1M, belediye >300B, >10.000 m²) ve 1 Eylül 2032\'de diğer tüm konut ve konut+ticaret yapılarda IFC zorunlu olur. Konut ve konut+ticaret karma dışındaki yapılar için uygulama 1 Eylül 2033\'te başlar (Geçici m.1(2)).',
      status: 'future'
    }
  ];

  const activeEvent = timelineEvents.find(e => e.year === activeYear) || timelineEvents[0];

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
      <section className="bg-card text-foreground rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl"></div>
        <div className="max-w-3xl space-y-4">
          <span className="text-[11px] font-extrabold text-orange-500 uppercase tracking-widest block">T.C. ÇEVRE, ŞEHİRCİLİK VE İKLİM DEĞİŞİKLİĞİ BAKANLIĞI · RG 5.8.2026 / 33331</span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">Ulusal BIM Mevzuatı &amp; e-PYS Entegrasyonu</h1>
          <p className="text-sm text-foreground dark:text-muted-foreground leading-relaxed">
            33331 sayılı Resmî Gazete'de yayımlanan Dijital Hazırlama ve Elektronik Teslim Yönetmelikleri çerçevesinde yürütülen PDF/A ve IFC4X3 (openBIM) süreçlerini, EK-1..EK-9 teknik eklerini, e-PYS onay mekanizmalarını ve 5D birim fiyat entegrasyonunu keşfedin.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            BIMMetraj çıktıları ön kontroldür. Repo içindeki e-PYS belge kopyası nihai resmî nüshayla kimlik/hash eşleştirmesi tamamlanana kadar “identity_pending”; ISO/TS tam metinleri ise lisanslı erişim gerektirir. Otomatik başarı idare veya uzman uygunluk kararı değildir.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Paket Havale/EFT akışındaki sipariş ve dekont tekilleştirmesi yalnız ticari işlem güvenliğidir; e-PYS, vergi, banka mutabakatı veya mevzuat uygunluğu kanıtı sayılmaz.
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
        <div className="lg:col-span-4 bg-white border border-border p-8 rounded-2xl shadow-sm">
          <h3 className="text-lg font-black text-foreground tracking-tight mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            RG 33331 Geçiş Takvimi
          </h3>

          <div className="relative border-l border-border pl-4 ml-2 space-y-8">
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
                      : 'bg-white border-border group-hover:border-orange-500'
                  }`}></span>

                  <div>
                    <span className={`text-xs font-black mono ${isActive ? 'text-orange-600' : 'text-muted-foreground'}`}>
                      {ev.year}
                    </span>
                    <h4 className={`text-sm font-extrabold transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                      {ev.title}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Milestone details */}
        <div className="lg:col-span-8 bg-white border border-border p-8 sm:p-10 rounded-2xl shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-border">
            <div className="text-sm font-black text-muted-foreground uppercase tracking-wider">Mevzuat Detayları (RG 33331)</div>
            <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-md border ${
              activeEvent.status === 'completed' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : activeEvent.status === 'ongoing'
                ? 'bg-blue-50 text-blue-700 border-blue-100'
                : 'bg-orange-50 text-orange-700 border-orange-100'
            }`}>
              {activeEvent.status === 'completed' && 'YAYIMLANDI (RG 33331)'}
              {activeEvent.status === 'ongoing' && 'YAKLAŞAN ZORUNLULUK'}
              {activeEvent.status === 'future' && 'KADEMELİ GEÇİŞ'}
            </span>
          </div>

          <div className="space-y-4">
            <div className="mono text-4xl font-black text-orange-600">{activeEvent.year}</div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">{activeEvent.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              {activeEvent.description}
            </p>
          </div>

          {/* Core Legal Requirement Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-border text-xs text-muted-foreground">
            <div className="space-y-2">
              <span className="font-extrabold text-foreground text-[11px] block uppercase tracking-wider">KAPSAM DIŞI İSTİSNALAR (MADDE 2)</span>
              <p className="leading-relaxed">
                Bodrum hariç en çok 2 katlı ve toplam inşaat alanı 200 m²'yi geçmeyen müstakil yapılar, entegre tesis niteliğinde olmayan tarım/hayvancılık yapıları ve uygulama imar planı bulunmayan alanlar kapsam dışıdır.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-extrabold text-foreground text-[11px] block uppercase tracking-wider">MÜELLİF SORUMLULUĞU VE DENETİM (MADDE 5)</span>
              <p className="leading-relaxed">
                Bilgilerin doğruluğundan kaydı yapan proje müellifi sorumludur (Teslim Yön. m.5(2)). İlgili idare ve yapı denetim kuruluşları e-PYS üzerinden uygunluk incelemesini yürütür.
              </p>
            </div>
          </div>
        </div>

      </section>

      {/* CORE SPECIFICATIONS METRICS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* e-PYS System */}
        <div className="bg-white border border-border rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-bold">
              e
            </div>
            <div>
              <h4 className="font-extrabold text-lg text-foreground leading-tight">e-PYS Teslim &amp; İnceleme Kuralları</h4>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Elektronik Proje Yönetim Sistemi (RG 33331)</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            2B teslimlerde PDF/A (ISO 19005) ve ISO 216 A4 katları pafta boyutu (m.8(1)); 3B teslimlerde TS EN ISO 16739-1 (IFC4X3), Türkiye Ulusal Koordinat Sistemi (m.10(4)) ve EK-9 Model Kalite Kontrol Formu (Mimari için Tablo 9.1 — 21 satır; Statik/Mekanik/Elektrik için Tablo 9.2 — 16 satır) uygulanır.
          </p>

          <p className="text-xs text-muted-foreground leading-relaxed">
            BIMMetraj hızlı tarayıcı önizlemesini tam metraj saymaz. Sunucu IFC işçisi QTO önceliğini, bağımsız alan/hacim/kütle birimlerini, aggregate parça dışlamalarını ve dosya–işlem–STEP kimlik zincirini raporlar. Geometriden türetilen miktarlar otomatik metraj kanıt satırına alınmaz; kaynak yolu ve bulgular incelenmelidir. Sonuç proje müellifi ve ilgili disiplin uzmanının incelemesini gerektirir.
          </p>

          <p className="text-xs text-muted-foreground leading-relaxed">
            EK-9 ön kontrol satırları otomatik veya manuel olarak işaretlenir ve kanıt referansı taşır. Belge kimliği doğrulanmadığı sürece bulgu üretmeyen rapor dahi <code>manual_review_required</code> durumunda kalır.
          </p>

          <p className="text-xs text-muted-foreground leading-relaxed">
            PDF ön kontrolündeki <code>signed</code> durumu yalnız imza sözlüğü, ByteRange ve Contents yapısının bulunduğunu gösterir; sertifika güven zinciri, iptal ve zaman damgası doğrulaması değildir. PDF/A kimlik beyanı da tek başına uygunluk sayılmaz: sunucu <code>ifc-worker</code> imajında sabitlenmiş veraPDF 1.30.3 çalıştırılarak ham XML rapor (<code>verapdf_report_xml</code>) ve doğrulama sonucu ayrı kanıt olarak saklanır; çalışma ortamı bulunmayan yerel koşularda sonuç <code>unavailable</code> kalır ve lisanslı dönüşüm sağlayıcısı seçilmeden sistem dosyayı dönüştürmez. 3B IFC görüntüleyici kaynak hash + işlem + STEP kimliğiyle incelemeye yardım eder; görüntü geometrisinden teklif miktarı üretmez.
          </p>

          <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-xs text-orange-800 font-bold">
            Önemli (m.6): Kâğıda yazdırılıp taranarak oluşturulan PDF'ler kullanılamaz (m.6(4)) ve tüm teslim dosyaları 5070 sayılı Kanuna uygun güvenli elektronik imza ile imzalanır (m.6(1)-(2)).
          </div>
        </div>

        {/* Technical Annexes EK-1 to EK-9 */}
        <div className="bg-white border border-border rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-card text-foreground rounded-xl flex items-center justify-center font-bold">
              EK
            </div>
            <div>
              <h4 className="font-extrabold text-lg text-foreground leading-tight">Resmî Teknik Ekler (EK-1 – EK-9)</h4>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sınıf, Özellik Seti ve İsimlendirme Standartları</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            EK-1 (6 haneli proje kodu), EK-2 (9 alanlı dosya adı, Tablo 2.1–2.14), EK-3 (Kat_Fonksiyon_Sıra mahal kodu ve ~130 standart mahal kısaltması), EK-5 (69 zorunlu + 67 isteğe bağlı IFC sınıfı, IfcBuildingElementProxy yasağı), EK-6 (68 tablo ve TREpys_* özellik setleri) ve EK-7 (Tablo 7.1–7.9) kuralları tanımlanmıştır.
          </p>

          <div className="bg-card border border-border p-4 rounded-xl text-xs text-foreground font-bold">
            Kriter (m.11–15): Eleman adları Disiplin-Kategori-Açıklama (m.12(3)), malzeme adları Malzeme İsmi_Dayanım (m.13(3)) ve emsal alanları IfcSpatialZone + TREpys_EmsalOzellikSeti (m.15) ile modellenir.
          </div>
        </div>

      </section>

      {/* MINISTRY POZ INTEGRATION (5D) MATCHER TOOL */}
      <section className="bg-white border border-border rounded-3xl p-8 sm:p-10 shadow-sm" id="poz-matcher">
        <div className="max-w-3xl mb-8">
          <div className="flex items-center gap-1.5 text-orange-600 font-extrabold text-xs uppercase tracking-widest mb-2">
            <Database className="w-4 h-4" />
            5D MALİYET ENTEGRASYONU
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            T.C. Bakanlık Birim Fiyat (Poz) Eşleştirici
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            IFC sınıfları için örnek poz adaylarını ve birimlerini inceleyin. Bu eğitim tablosu güncel katalog, imalat koşulu, ticari kullanım yetkisi veya teklif fiyatı onayı değildir; gerçek seçim yetkilendirilmiş tenant kaynağında ayrıca doğrulanır.
          </p>
        </div>

        {/* Matcher interface */}
        <div className="space-y-6">
          {/* Search box */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="IFC Sınıfı veya Poz No ara (örn: IfcWall, 15.150...)"
              value={pozSearch}
              onChange={(e) => setPozSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500 text-foreground"
              id="search-poz"
            />
          </div>

          {/* Database table */}
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-card text-muted-foreground font-black tracking-wider uppercase border-b border-border text-[10px]">
                  <th className="p-4">IFC Yapı Sınıfı</th>
                  <th className="p-4">Bakanlık Poz No</th>
                  <th className="p-4">İmalat Açıklaması</th>
                  <th className="p-4 text-right">Ölçü Birimi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium text-foreground">
                {filteredPoz.map((poz, idx) => (
                  <tr key={idx} className="hover:bg-orange-50/20 transition-colors">
                    <td className="p-4 font-extrabold text-orange-600 mono">{poz.ifcClass}</td>
                    <td className="p-4 font-bold text-foreground mono">{poz.pozNo}</td>
                    <td className="p-4 max-w-sm sm:max-w-md truncate md:whitespace-normal">{poz.description}</td>
                    <td className="p-4 text-right font-black text-muted-foreground mono">{poz.unit}</td>
                  </tr>
                ))}
                {filteredPoz.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      Arama kelimesine ait poz veya sınıf eşleşmesi bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-3 bg-orange-50/50 border border-orange-100 p-4 rounded-xl">
            <Info className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
              <strong>Önemli 5D Eşleştirme Kuralı (6 Resmi Kitap · 18.848 Satır):</strong> Modellerinizde 5D metraj ve teklif köprüsü kurarken IFC yapı elemanlarına <code>TREpys_PozOzellikSeti.PozNo</code> (veya geriye dönük uyumluluk için <code>Tr_Pset_CSB.PozNo</code>) eklenebilir. Sistemde 6 resmi 2026 ÇŞB PDF kitabındaki toplam 18.848 poz ve rayiç satırı SHA-256 özetiyle kayıtlıdır; ancak satır varlığı tek başına ticari kullanım yetkisi, yürürlük dönemi güncelliği veya bağımsız maliyet uzmanı onayı anlamına gelmez. SmartCheck bu kodu aday olarak okur; birim, semantik, geçerlilik ve kaynak kullanım yetkisi doğrulanmadan fiyat üretmez veya teklifi kilitlemez.
            </p>
          </div>
          <div className="mt-3 flex items-start gap-3 border border-amber-500/30 bg-amber-500/5 p-4 rounded-xl">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
              <strong>Hakediş kapsam sınırı:</strong> Dönemsel ve kümülatif hakediş çekirdeği pilot/L2 düzeyindedir ve varsayılan olarak kapalıdır. Kaynak ölçüm ve review kayıtları teknik çalışma cetveline bağlanır; çıktı resmî Yeşil Defter, OSKA/AMP uyumluluk belgesi veya EKAP gönderimi değildir. Bu kabuller için izinli vendor dosyası, bağımsız teknik ofis fikstürü ve adlı ihale uzmanı imzası gerekir.
            </p>
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 space-y-3" id="capability-registry-summary">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                Tek Kaynaklı Yetenek Kaydı Durumu ({CAPABILITY_REGISTRY_VERSION})
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                Canlı (L3/L4): {getLiveCapabilities().length} · Pilot (L2): {getPilotCapabilities().length} · Yol Haritası (L1): {getRoadmapCapabilities().length} · Toplam: {CAPABILITY_REGISTRY.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Bu sayfadaki mevzuat, ön kontrol ve hesap açıklamaları <code>CAPABILITY_REGISTRY</code> ile aynı kanıt sınırını paylaşır; bağımsız uzman imzası tamamlanmadan hiçbir yetenek L3/canlı onaylı olarak sunulmaz.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
