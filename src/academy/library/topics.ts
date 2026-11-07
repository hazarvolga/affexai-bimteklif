/**
 * Lean Academy v1 content (Hazar, 2026-11-06). Five vendor-neutral topics in one page template.
 * Rules: no software brand names, no engineering or cost figures until they are reviewed with
 * the yuksek-muhendis-mimar skill, no claims about features the product does not have.
 * Brand-specific guides come later, one brand at a time, in their own files.
 */
import { ACADEMY_GUIDES } from './guides';

export interface AcademyModule {
  title: string;
  body: string;
  points: readonly string[];
}

export interface AcademyTopic {
  slug: string;
  title: string;
  /** One sentence for the list card and the search-engine description. */
  summary: string;
  /** Why the topic matters in daily technical-office work. */
  why: string;
  modules: readonly AcademyModule[];
  /** Standards and references the topic is built on. */
  sources: readonly string[];
  /** Where to try the idea in BIMMetraj; must be an existing public page. */
  tryIn: { label: string; href: string };
}

export const ACADEMY_TOPICS: readonly AcademyTopic[] = [
  {
    slug: 'bim-temelleri',
    title: 'BIM temelleri ve ISO 19650',
    summary: 'BIM’i yazılım kullanımından önce bir bilgi yönetimi disiplini olarak anlatır: kim, hangi bilgiyi, ne zaman ve hangi kanıtla üretir.',
    why: 'Modeldeki bir kolon yalnız bir şekil değildir; maliyet, süre, malzeme ve işletme bilgisi taşır. Bu bilginin sahibi ve teslim biçimi baştan belli değilse model ne kadar ayrıntılı olursa olsun teklif ve sahada güven vermez.',
    modules: [
      {
        title: 'Bilgi gereksinimleri: OIR, PIR, AIR ve EIR',
        body: 'ISO 19650-1 ve 19650-2, kurumun hedeflerinden yüklenicinin teslim şartnamesine uzanan bir zincir tanımlar.',
        points: [
          'OIR: kurumun neden bilgiye ihtiyaç duyduğu',
          'PIR ve AIR: proje ve varlık için hangi bilginin gerektiği',
          'EIR: yükleniciden istenen bilginin içeriği, biçimi ve teslim zamanı',
        ],
      },
      {
        title: 'Ortak veri ortamı (CDE) ve bilgi durumları',
        body: 'Bilgi konteynerleri üzerinde çalışılır, paylaşılır, yayımlanır ve arşivlenir. Her geçişin bir onayı ve kaydı vardır.',
        points: [
          'Çalışma (WIP): disiplin içinde, henüz paylaşılmamış bilgi',
          'Paylaşılan (Shared): koordinasyon için diğer disiplinlerin okuduğu bilgi',
          'Yayımlanan (Published): sözleşmeye ve ödemeye esas, onaylı bilgi',
          'Arşiv (Archived): geçmiş sürümlerin denetlenebilir kaydı',
        ],
      },
      {
        title: 'Teslim planları ve sorumluluk: BEP, TIDP, MIDP, RACI',
        body: 'Kimin neyi üreteceği ve kimin onaylayacağı yazılı olmadıkça bilgi yönetimi kişilere bağlı kalır.',
        points: [
          'BEP: yüklenicinin bilgiyi nasıl üreteceğini anlatan uygulama planı',
          'TIDP ve MIDP: görev bazlı teslim planlarından ana teslim planına geçiş',
          'RACI: sorumlu, hesap veren, danışılan ve bilgilendirilen tarafların ayrımı',
        ],
      },
      {
        title: 'Bilgi ihtiyacı seviyesi (LOIN)',
        body: 'EN 17412-1, geometrik ayrıntı (LOG) ile alfanümerik bilgiyi (LOI) ihtiyaca göre dengelemeyi önerir.',
        points: [
          'Her aşama için gereken bilgi önceden tanımlanır',
          'Gereksiz geometri modeli ağırlaştırır; bilgi çoğu zaman bir özellik değeri olarak yeterlidir',
          'Teslimde eksik bilgi, tanımlanan seviyeye göre kontrol edilir',
        ],
      },
      {
        title: 'openBIM: IFC ve BCF',
        body: 'Yazılımdan bağımsız veri alışverişi için buildingSMART standartları kullanılır.',
        points: [
          'IFC: nesnelerin, özelliklerin ve ilişkilerin ortak şeması',
          'BCF: model üzerindeki sorunların yazılımlar arası takibi',
          'Geometrik model ile statik analiz modeli aynı şey değildir; aktarımın sınırları bilinmelidir',
        ],
      },
      {
        title: 'Teslimden işletmeye: PIM, AIM ve COBie',
        body: 'ISO 19650-3, inşaat sırasında üretilen proje bilgisinin işletme için varlık bilgisine dönüşmesini ele alır.',
        points: [
          'PIM: tasarım ve inşaat süresince biriken proje bilgisi',
          'AIM: bakım, garanti ve ekipman bilgisini taşıyan işletme modeli',
          'COBie: tesis yönetimine aktarılacak verinin yapılandırılmış biçimi',
        ],
      },
    ],
    sources: ['ISO 19650-1, -2, -3 ve -5', 'EN 17412-1 (LOIN)', 'buildingSMART: IFC, BCF', 'COBie'],
    tryIn: { label: 'BIM ve mevzuat sözlüğünü açın', href: '/bim-sozlugu' },
  },
  {
    slug: '4d-5d-maliyet',
    title: '4D ve 5D: zaman, maliyet ve metraj',
    summary: 'Metraj listesini iş programına ve maliyet takibine bağlar; model "ne kadar" sorusunun yanında "ne zaman" sorusunu da yanıtlar.',
    why: 'Teklif hazırlarken kullanılan miktarlar ile sahada takip edilen işler aynı kaynaktan gelmezse hakediş, revizyon ve fark hesabında tutarsızlık çıkar. 4D ve 5D bu iki dünyayı aynı veriyle konuşturur.',
    modules: [
      {
        title: 'Model elemanlarını iş programına bağlamak',
        body: 'Her model elemanının benzersiz kimliği (GUID), iş programındaki bir görevle eşleştirilir.',
        points: [
          'Eleman ile görev eşleşmesi kimlik üzerinden yapılır, ad üzerinden değil',
          'Temel, kaba inşaat ve ince işler gibi aşamalar modelde görselleştirilir',
          'Geçici yapılar ve şantiye lojistiği de zaman planına dahil edilir',
        ],
      },
      {
        title: 'Kazanılmış değer analizi (EVM)',
        body: 'Planlanan, gerçekleşen ve harcanan değeri aynı çerçevede okuyarak gidişatı ölçer.',
        points: [
          'PV: iş programına göre bugüne kadar harcanması planlanan bütçe',
          'EV: sahada tamamlanan işin bütçedeki karşılığı',
          'AC: gerçekleşen maliyet; SPI ve CPI ile zaman ve maliyet performansı',
        ],
      },
      {
        title: 'Metraj kuralları ve boşluk düşümü',
        body: 'Aynı modelden farklı kurallarla farklı miktar çıkar. Hangi kuralın uygulandığı teklifte açıkça yazılmalıdır.',
        points: [
          'Boşluk düşümü kuralları ülkeye, şartnameye ve iş kalemine göre değişir',
          'Türkiye’de birim fiyat analizlerinin ölçü maddeleri esas alınır',
          'Kesişen elemanların iki kez sayılmaması için öncelik kuralı tanımlanır',
        ],
      },
      {
        title: 'Sözleşme tipi ve teklif riski',
        body: 'Risk kimde kalıyorsa teklifin varsayımları da o tarafın kaydında olmalıdır.',
        points: [
          'Götürü bedelde miktar riski yüklenicide, birim fiyatta işverende kalır',
          'Süre, fiyat değişimi ve modelin bilgi seviyesi teklif varsayımı olarak kayda alınır',
          'Varsayımlar kesin sonuç değil, izlenebilir senaryo olarak sunulur',
        ],
      },
      {
        title: 'IFC 4.3 altyapı: köprü, yol ve demiryolu metrajı',
        body: 'ISO 16739-1:2024 (IFC 4.3) ile köprü, yol ve demiryolu projelerinde IfcBridge, IfcRoad, IfcRailway ve Qto_EarthworksCut/FillBaseQuantities kullanımı.',
        points: [
          'IfcBridge: kenar ayak (ABUTMENT), orta ayak (PIER), temel (FOUNDATION) ve tabliye (DECK) bazlı bölümleme',
          'IfcAlignment ve IfcReferent: kilometraj tabanlı metraj ve hakediş',
          'Qto_EarthworksCutBaseQuantities: doğal kazı (UndisturbedVolume) ve kabarmış hacim (ExpandedVolume)',
        ],
      },
      {
        title: '4734 / 4735 kamu ihale ve e-PYS hakediş protokolü',
        body: '4734 ve 4735 sayılı kanunlar çerçevesinde götürü bedel, birim fiyat ve karma sözleşme tiplerinin 5D BIM ile hakediş belgeleri (Yeşil Defter, Ataşman, Mukayeseli Keşif) üretimine etkisi.',
        points: [
          'Götürü bedel: pursantaj tablosu ve iki IFC revizyonu arasındaki mukayeseli keşif',
          'Birim fiyat: IfcCostItem GUID bazlı yeşil defter ve ataşman üretimi',
          'RG 33331 e-PYS: zorunlu IFC model teslim takvimi ve kapsam',
        ],
      },
    ],
    sources: ['ISO 19650-2 (teslim aşaması)', 'Kazanılmış değer yönetimi (EVM) ilkeleri', 'ÇŞB birim fiyat analizleri, ölçü maddeleri', '4734 ve 4735 sayılı kanunlar', 'ISO 16739-1:2024 (IFC 4.3)', 'RG 33331 (5 Agustos 2026) e-PYS'],
    tryIn: { label: 'Ücretsiz hesaplayıcıları deneyin', href: '/hesaplayicilar' },
  },
  {
    slug: '6d-surdurulebilirlik',
    title: '6D sürdürülebilirlik ve karbon',
    summary: 'Model verisini enerji, yaşam döngüsü ve gömülü karbon sorularına bağlayan giriş konusu.',
    why: 'Malzeme ve sistem kararları binanın ömrü boyunca enerji ve karbon sonucunu belirler. Bu sonuçlar tek bir "yeşil puan" değildir; her biri farklı bir soruya ve farklı bir veri sınırına dayanır.',
    modules: [
      {
        title: 'Enerji performansı (BEM)',
        body: 'Modelin geometrisi ve yapı kabuğu bilgisi yıllık enerji ihtiyacı hesabına taşınır.',
        points: [
          'Bölgesel iklim verisi hesabın girdisidir',
          'Yapı kabuğunun ısıl özellikleri ısıtma ve soğutma yükünü belirler',
          'Gün ışığı kullanımı aydınlatma ihtiyacını etkiler',
        ],
      },
      {
        title: 'Yaşam döngüsü analizi (LCA)',
        body: 'EN 15978, bir binanın çevresel etkisini aşamalara ayırarak tanımlar.',
        points: [
          'A1–A3 ürün, A4–A5 inşaat, B kullanım, C ömür sonu aşamalarıdır',
          'D modülü, sistem sınırı dışındaki geri kazanım ve yeniden kullanım etkisini ayrı gösterir',
          'Malzeme verisi için üretici çevresel ürün beyanları (EPD) kullanılır',
        ],
      },
      {
        title: 'Gömülü ve işletme karbonu',
        body: 'Malzemelerin üretim ve inşaattan gelen etkisi ile binanın kullanımından gelen etkisi ayrı hesaplanır.',
        points: [
          'Küresel ısınma potansiyeli karbondioksit eşdeğeri olarak ifade edilir',
          'Düşük karbonlu malzeme seçimi tasarımın erken aşamasında en çok etkiyi yapar',
          'Hesabın veri sınırı ve varsayımları sonuçla birlikte yazılır',
        ],
      },
      {
        title: 'Yeşil bina sertifikaları',
        body: 'LEED, BREEAM ve EDGE gibi sistemler modelden gelen verinin bir kısmını kullanır.',
        points: [
          'Her sistemin kendi ölçütleri ve belgelendirme süreci vardır',
          'Su ve enerji verimliliği tesisat ve yapı kabuğu verisine dayanır',
          'Sertifika sonucu bağımsız değerlendiricinin onayıyla kesinleşir',
        ],
      },
    ],
    sources: ['ISO 52000-1', 'ISO 14040 / 14044, EN 15978', 'ISO 16745-1, GHG Protocol', 'LEED, BREEAM, EDGE'],
    tryIn: { label: 'BIMMetraj özelliklerine bakın', href: '/features' },
  },
  {
    slug: 'scan-to-bim',
    title: 'Scan-to-BIM ve yapay zekâ sınırları',
    summary: 'Nokta bulutundan modele geçerken doğruluğun, toleransın ve kullanım amacının birlikte belirlenmesini anlatır.',
    why: 'Aynı nokta bulutu her iş için aynı ayrıntıyı gerektirmez. Doğruluk seviyesi sözleşmede yazılı değilse taraflar aynı modelden farklı şeyler bekler.',
    modules: [
      {
        title: 'Doğruluk seviyeleri (LOA)',
        body: 'LOA seviyeleri ölçülen ve modellenen verinin hangi doğruluk aralığında olduğunu tanımlar.',
        points: [
          'Seviye, modelin hangi kararı destekleyeceğine göre seçilir',
          'Kavramsal çalışma, koordinasyon ve restorasyon farklı seviyeler ister',
          'Seçilen seviye ve tolerans sözleşmede açıkça yazılır',
        ],
      },
      {
        title: 'Nokta bulutu ile modelin karşılaştırılması',
        body: 'Mevcut yapının modeli, tarama verisiyle çakıştırılarak sapmalar görünür hâle getirilir.',
        points: [
          'Sapmalar renkli bir fark haritasıyla gösterilir',
          'Duvar düşeyliği ve döşeme seviyesi gibi kontroller sahada doğrulanır',
          'Tarama tarihi ve ekipmanı kayda geçirilir',
        ],
      },
      {
        title: 'Üretken tasarım ve insan onayı',
        body: 'Algoritmalar maliyet ve enerji gibi birbiriyle çatışan hedefler için çok sayıda seçenek üretebilir.',
        points: [
          'Algoritma öneri üretir; mühendislik sorumluluğu insandadır',
          'Girdilerin doğruluğu sonucun doğruluğunu belirler',
          'Kabul edilen önerinin kim tarafından ve ne zaman onaylandığı kaydedilir',
        ],
      },
    ],
    sources: ['USIBD LOA tanımları', 'IFC ve nokta bulutu bilgi akışı', 'Yapay zekâ çıktısı: öneridir, doğrulama gerektirir'],
    tryIn: { label: 'SmartCheck demosunu açın', href: '/smartcheck' },
  },
  {
    slug: 'guvenlik-ve-saha',
    title: 'Bilgi güvenliği, e-Ruhsat ve saha',
    summary: 'Modelin erişim yetkileri, ruhsat kontrolleri, çakışma yönetimi ve sahada üretilebilirlikle buluştuğu noktaları anlatır.',
    why: 'Doğru bir model yanlış kişinin elinde, onaysız bir revizyonla ya da sahada üretilemeyecek bir detayla değer kaybeder. Güvenlik ve saha pratiği bilgi yönetiminin parçasıdır.',
    modules: [
      {
        title: 'Rol tabanlı erişim (ISO 19650-5)',
        body: 'Mimar, statik, mekanik ve işveren temsilcisinin CDE üzerindeki okuma, yazma ve onay hakları ayrı tanımlanır.',
        points: [
          'Disiplin kendi çalışma alanına yazar, diğerlerinin paylaşılan bilgisini okur',
          'Hassas bilgi sınıflandırılır ve erişimi sınırlandırılır',
          'Onay ve revizyon hareketlerinin silinemez bir kaydı tutulur',
        ],
      },
      {
        title: 'e-Ruhsat ve kural denetimi',
        body: 'IFC modeli imar ve yönetmelik kurallarına göre otomatik ön kontrolden geçirilebilir.',
        points: [
          'TAKS ve KAKS gibi değerler model ve parsel verisinden hesaplanır',
          'Kaçış yolu ve kapı kuralları gibi kontroller kural motoruyla yapılır',
          'Otomatik kontrolün sonucu yetkili mimar veya mühendisin onayının yerini tutmaz',
        ],
      },
      {
        title: 'Çakışma yönetimi',
        body: 'Disiplinler arası çakışmalar sınıflandırılır ve BCF ile sorumlusuna iletilir.',
        points: [
          'Fiziksel çakışma: iki elemanın aynı hacmi kullanması',
          'Tolerans çakışması: bakım ve çalışma boşluğunun ihlali',
          'Zaman çakışması: geçici yapıların ve ekipmanların aynı anda aynı yere ihtiyaç duyması',
        ],
      },
      {
        title: 'Üretilebilirlik ve donatı detayı',
        body: 'Sahada üretilemeyen bir detay, modelde ne kadar doğru görünürse görünsün yeniden iş demektir.',
        points: [
          'Donatı bükme bilgisi standart bir formatta üretim makinesine aktarılabilir',
          'Ticari boy ve nakliye sınırları bindirme ve ek yerlerini belirler',
          'Saha kabulü ayrıca belgelenir',
        ],
      },
    ],
    sources: ['ISO 19650-5', 'buildingSMART BCF', '3194 sayılı İmar Kanunu ve ilgili yönetmelikler', 'TS 500'],
    tryIn: { label: 'SmartCheck demosunu açın', href: '/smartcheck' },
  },
  {
    slug: 'openbim',
    title: 'OpenBIM: IDS, bSDD ve IFC Standartları',
    summary: 'buildingSMART açık standartlarını (IDS 1.0, bSDD, MVD) model kalite denetimi ve yazılımdan bağımsız veri alışverişi perspektifinden ele alır.',
    why: 'Teslim alınan model, kural ve kalite kontrolünden geçirilmeden metraj ve hakediş süreçlerine alınamaz. IDS standartı bu kontrolü otomatize ederken bSDD, farklı yazılımlardan gelen özellikleri ortak bir dile çevirir.',
    modules: [
      {
        title: 'IDS ve bSDD ile otomatik model denetimi',
        body: 'IDS 1.0 (Information Delivery Specification) XML kural dosyaları ile IFC modelleri otomatik olarak denetlenir; bSDD ise dil ve yazılım farklarını URI ile çözer.',
        points: [
          'IDS kural dosyası: applicability (kapsam) ve requirements (gereksinim) bölümleri',
          '6 Facet türü: entity, attribute, property, material, classification, partOf',
          'bSDD URI: farklı yazılımlardan gelen özellik adları tek standartta buluşur',
        ],
      },
    ],
    sources: ['buildingSMART IDS 1.0 (github.com/buildingSMART/IDS)', 'buildingSMART Data Dictionary bSDD (github.com/buildingSMART/bSDD)', 'BS EN 17412-1:2020 (LOIN)'],
    tryIn: { label: 'Akademi rehberlerini inceleyin', href: '/academy' },
  },
];

/** Every published library page: the list, the topics and their guides (src/academy/library/guides.ts). */
export const ACADEMY_LIBRARY_PATHS: readonly string[] = [
  '/academy',
  ...ACADEMY_TOPICS.map(topic => `/academy/${topic.slug}`),
  ...ACADEMY_GUIDES.map(guide => `/academy/${guide.topicSlug}/${guide.slug}`),
];

export function findAcademyTopic(slug: string | undefined): AcademyTopic | undefined {
  return slug ? ACADEMY_TOPICS.find(topic => topic.slug === slug) : undefined;
}
