/**
 * Academy phase 2, package 1 (Hazar, 2026-11-06): detailed guides, each on its own page at
 * /academy/{topic}/{guide}. Rewritten from the old side-panel data (src/academy/subGuidesData.ts,
 * left untouched) under the same rules as the topics: no software brands, no unreviewed figures,
 * formulas as plain text, a BIMMetraj note only for a live or pilot capability.
 * Package 2 adds the guides that needed brand removal and a recomputed worked example.
 * Package 3 adds the guides with engineering figures; each figure is reviewed (see `review`).
 */

export interface AcademyGuideTable {
  title: string;
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}

export interface AcademyGuide {
  slug: string;
  topicSlug: string;
  /** Title of the topic module that links to this guide. */
  moduleTitle: string;
  title: string;
  summary: string;
  /** Rule or relation in plain text. */
  rule?: string;
  table?: AcademyGuideTable;
  takeaways: readonly string[];
  /** A short illustrative case without invented statistics. */
  example: string;
  sources: readonly string[];
  /** Only for a capability that is live or pilot in src/capabilities/registry.ts. */
  bimmetraj?: { capabilityId: string; text: string };
  /**
   * Required for any guide that carries engineering figures: reviewed with the yuksek-muhendis-mimar
   * skill against the listed sources. Figures are allowed only in reviewed guides (guides.test.ts).
   */
  review?: { reviewedOn: string; method: string; sources: readonly string[]; note: string };
  /** Worked example; guides.test.ts recomputes every result from its formula. */
  calculation?: {
    title: string;
    note: string;
    inputs: Readonly<Record<string, number>>;
    results: readonly { label: string; formula: string; value: number }[];
  };
}

export const ACADEMY_GUIDES: readonly AcademyGuide[] = [
  {
    slug: 'pim-aim-cobie',
    topicSlug: 'bim-temelleri',
    moduleTitle: 'Teslimden işletmeye: PIM, AIM ve COBie',
    title: 'PIM’den AIM’e geçiş ve COBie',
    summary: 'İnşaat süresince biriken proje bilgisinin, işletme ekibinin kullanacağı temiz bir varlık modeline nasıl dönüştüğünü anlatır.',
    rule: 'Proje bilgi modeli (PIM) → teslimde ayıklanır → varlık bilgi modeli (AIM). COBie bu geçişte tür, bileşen, mahal ve sistem bilgisini tablo yapısında taşır.',
    table: {
      title: 'IFC sınıfları ve COBie sayfaları',
      headers: ['IFC sınıfı', 'COBie sayfası', 'İşletmede ne için kullanılır'],
      rows: [
        ['IfcSpace', 'Space', 'Mahal bazlı alan, kullanım ve temizlik planı'],
        ['IfcTypeProduct', 'Type', 'Ürün tipi, üretici ve yedek parça bilgisi'],
        ['IfcElement (ekipman)', 'Component', 'Tekil cihazın seri numarası, montaj ve garanti tarihleri'],
        ['IfcSystem', 'System', 'Mekanik ve elektrik sistemlerinin bağımlılıkları'],
        ['IfcZone', 'Zone', 'İklimlendirme ve güvenlik bölgeleri'],
      ],
    },
    takeaways: [
      'PIM şantiye için gereken geçici bilgiyi de taşır; AIM yalnız işletmenin ihtiyaç duyduğu bilgiyi tutar.',
      'COBie bir yazılım değil, varlık bilgisinin yapılandırılmış değişim biçimidir.',
      'Teslimden önce modelin hangi bilgiyi taşıyacağı EIR ve AIR’de yazılı olmalıdır.',
    ],
    example: 'Bir alışveriş merkezinde klima santralleri inşaat sırasında ayrıntılı geometriyle modellenir. İşletmeye teslimde geometri sadeleştirilir; seri numarası, garanti başlangıcı ve bakım periyodu bileşen kaydında kalır.',
    sources: ['ISO 19650-3', 'ISO 19650-4', 'buildingSMART COBie', 'IFC4'],
  },
  {
    slug: 'bep-tidp-midp-raci',
    topicSlug: 'bim-temelleri',
    moduleTitle: 'Teslim planları ve sorumluluk: BEP, TIDP, MIDP, RACI',
    title: 'BEP, TIDP, MIDP ve RACI matrisi',
    summary: 'Bilgiyi kimin üreteceğini, kimin onaylayacağını ve ne zaman teslim edileceğini yazılı hâle getiren belgeleri anlatır.',
    rule: 'MIDP = tüm görev ekiplerinin TIDP’lerinin birleşimi. RACI her teslim için tek bir hesap veren (A) tanımlar.',
    table: {
      title: 'Örnek RACI dağılımı',
      headers: ['Görev', 'Mimar', 'Statik', 'Mekanik', 'Bilgi yöneticisi'],
      rows: [
        ['BEP hazırlığı', 'Danışılır', 'Danışılır', 'Danışılır', 'Hesap verir ve yapar'],
        ['Disiplin içi çakışma kontrolü', 'Hesap verir ve yapar', 'Hesap verir ve yapar', 'Hesap verir ve yapar', 'Bilgilendirilir'],
        ['Birleşik model', 'Danışılır', 'Danışılır', 'Danışılır', 'Hesap verir ve yapar'],
        ['İşletme verisi girişi', 'Yapar', 'Yapar', 'Yapar', 'Hesap verir'],
      ],
    },
    takeaways: [
      'BEP proje başında hazırlanır; koordinat sistemi, dosya adlandırma ve yazılım sürümleri burada belirlenir.',
      'MIDP teslim tarihlerinin ve biçimlerinin bağlayıcı takvimidir.',
      'Bir teslimde birden fazla hesap veren varsa sorumluluk belirsizdir.',
    ],
    example: 'Bir altyapı projesinde mimari ve statik modeller farklı başlangıç noktasıyla üretildiği için birleşik modelde üst üste gelmez. Ortak koordinat sistemi BEP’e yazılınca sorun bir daha tekrarlanmaz.',
    sources: ['ISO 19650-2', 'RACI sorumluluk matrisi'],
  },
  {
    slug: 'aec-ontolojisi',
    topicSlug: 'bim-temelleri',
    moduleTitle: 'openBIM: IFC ve BCF',
    title: 'Nesneler ve ilişkiler: IFC mekânsal yapısı',
    summary: 'BIM’in çizimden çok nesneler ve aralarındaki ilişkilerden oluştuğunu, IFC’de bu ilişkilerin nasıl kurulduğunu anlatır.',
    rule: 'Yapı nesnesi = geometri + özellikler + ilişkiler. Proje → arsa → bina → kat → eleman zinciri IFC ilişki nesneleriyle kurulur.',
    table: {
      title: 'IFC eleman sınıfları, resmi Qto setleri ve ÇŞB birim karşılıkları',
      headers: ['IFC Sınıfı', 'Mekânsal / Boşluk İlişkisi', 'Resmi Qto Seti (buildingSMART IFC4)', 'Kritik Metraj Özellikleri', 'ÇŞB Birim Karşılığı'],
      rows: [
        ['IfcWall / IfcWallStandardCase', 'IfcRelVoidsElement: IfcOpeningElement', 'Qto_WallBaseQuantities', 'Length, Height, Width, GrossSideArea, NetSideArea, GrossVolume, NetVolume', 'm² (Tuğla/Gazbeton) veya m³ (Perde Beton)'],
        ['IfcSlab', 'IfcRelVoidsElement: IfcOpeningElement', 'Qto_SlabBaseQuantities', 'Width (Kalınlık), Perimeter, GrossArea, NetArea, GrossVolume, NetVolume', 'm³ (Döşeme Betonu) ve m² (Döşeme Kalıbı)'],
        ['IfcBeam', 'IfcRelContainedInSpatialStructure', 'Qto_BeamBaseQuantities', 'Length, CrossSectionArea, OuterSurfaceArea, GrossVolume, NetVolume', 'm³ (Kiriş Betonu) ve m² (Kiriş Kalıbı)'],
        ['IfcColumn', 'IfcRelContainedInSpatialStructure', 'Qto_ColumnBaseQuantities', 'Length, CrossSectionArea, OuterSurfaceArea, GrossVolume, NetVolume', 'm³ (Kolon Betonu) ve m² (Kolon Kalıbı)'],
        ['IfcCovering', 'IfcRelCoversBldgElements / IfcRelCoversSpaces', 'Qto_CoveringBaseQuantities', 'Width (Kalınlık), GrossArea, NetArea', 'm² (Sıva, Boya, Seramik, Asma Tavan)'],
        ['IfcReinforcingBar', 'IfcRelAggregates / IfcElementAssembly', 'Qto_ReinforcingElementBaseQuantities', 'Count, Length, Weight', 'ton veya kg (B420C / B500C Donatı)'],
        ['IfcSpace', 'IfcRelSpaceBoundary', 'Qto_SpaceBaseQuantities', 'Height, GrossFloorArea, NetFloorArea, NetVolume', 'm² (Mahal Net/Brüt Alanı, TAKS/KAKS)'],
      ],
    },
    takeaways: [
      'Bir elemanın hangi katta olduğu bir özellik değil, IfcRelContainedInSpatialStructure ilişkisidir.',
      'Her yapı elemanına metraj özellik seti (Qto_*BaseQuantities) IfcRelDefinesByProperties ilişkisiyle bağlanır; bu bağlantı eksikse kat bazında metraj ve sorgu güvenilir olmaz.',
      'Sınıflandırma ve özellik adları için ortak sözlükler (bSDD) kullanılır.',
    ],
    example: 'Bir karma projede kolonların kat ilişkisi doğru kurulduğu için betonarme metrajı kat kat ayrıştırılabilir. Qto_ColumnBaseQuantities.NetVolume eksik olan kolonlar ise metraj cetvelinde sıfır görünür.',
    sources: ['buildingSMART IFC4 Qto şemaları (Qto_Wall/Slab/Beam/Column/Covering/Reinforcing/SpaceBaseQuantities)', 'buildingSMART Data Dictionary (bSDD)', 'ISO 12006-2', 'IFC4 mekânsal yapı'],
    bimmetraj: { capabilityId: 'ifc-qto-multi-layer-icmal', text: 'IFC metrajı, modeldeki kat ve mahal yapısını kullanarak miktarları ayrıştırır (pilot).' },
  },
  {
    slug: 'sozlesme-tipi-ve-risk',
    topicSlug: '4d-5d-maliyet',
    moduleTitle: 'Sözleşme tipi ve teklif riski',
    title: 'Götürü bedel ile birim fiyat arasında risk paylaşımı',
    summary: 'Sözleşme tipinin miktar, fiyat, tasarım ve süre risklerini hangi tarafa bıraktığını ve teklif varsayımlarının nasıl kayda alınacağını anlatır.',
    rule: 'Teklif = net miktar × birim fiyat + risk karşılığı. Risk karşılığı tahmin değil, yazılı varsayımlardan türetilir ve teklifle birlikte sunulur.',
    table: {
      title: 'Sözleşme tipine göre risk sahibi',
      headers: ['Risk', 'Götürü bedel', 'Birim fiyat'],
      rows: [
        ['Miktar sapması', 'Yüklenici', 'İşveren (yeniden ölçüm)'],
        ['Fiyat değişimi', 'Sözleşmede fiyat farkı yoksa yüklenici', 'Fiyat farkı hükümlerine göre paylaşılır'],
        ['Tasarım hatası ve çakışma', 'Çoğunlukla yüklenici', 'Çoğunlukla işveren ve tasarımcı'],
        ['Süre ve gecikme', 'Sözleşmedeki cezai şarta göre', 'Sözleşmedeki cezai şarta göre'],
      ],
    },
    takeaways: [
      'Götürü bedelde eksik hesaplanan miktar sonradan ödenmez; miktarın kaynağı ve kontrolü teklif öncesinde yapılır.',
      'Modelin bilgi seviyesi düşükse götürü bedel teklifin belirsizliği yüksektir; bu varsayım teklife yazılır.',
      'Kamu işlerinde fiyat farkı 4735 sayılı Kanun ve ilgili kararnameye göre hesaplanır.',
    ],
    example: 'İki firma aynı götürü bedel ihalesine girer. Birinci firma miktarları yalnız çizimden okur; ikinci firma model miktarlarını ayrıca kontrol eder ve belirsiz kalemleri teklif ekinde açıkça listeler. Sapma çıktığında ikinci firmanın neyi üstlendiği yazılıdır.',
    sources: ['4734 sayılı Kamu İhale Kanunu', '4735 sayılı Kamu İhale Sözleşmeleri Kanunu', 'FIDIC sözleşme ailesi'],
    bimmetraj: { capabilityId: 'tuik-21-subindex-price-escalation-4735', text: '4735 sayılı Kanuna göre fiyat farkı hesabı ücretsiz hesaplayıcıda denenebilir (pilot).' },
  },
  {
    slug: 'enerji-performansi',
    topicSlug: '6d-surdurulebilirlik',
    moduleTitle: 'Enerji performansı (BEM)',
    title: 'Enerji performansı modeli (BEM)',
    summary: 'BIM modelindeki geometri ve yapı kabuğu bilgisinin yıllık ısıtma ve soğutma ihtiyacı hesabına nasıl taşındığını anlatır.',
    rule: 'Bir yüzeyden iletimle ısı kaybı (basitleştirilmiş) = U × A × (iç sıcaklık − dış sıcaklık). U ısı geçirgenlik katsayısı, A yüzey alanıdır.',
    table: {
      title: 'Modelden enerji modeline giden bilgi',
      headers: ['Yapı elemanı', 'IFC nesnesi ve özelliği', 'Enerji hesabındaki rolü'],
      rows: [
        ['Dış duvar', 'IfcWall, ThermalTransmittance', 'Isı kaybı ve kazancı'],
        ['Çatı', 'IfcRoof, ThermalTransmittance', 'En üst kattaki ısı kaybı'],
        ['Pencere', 'IfcWindow, ThermalTransmittance', 'Isı kaybı ve güneş kazancı dengesi'],
        ['Mahal', 'IfcSpace', 'Isıtılan ve soğutulan hacmin tanımı'],
      ],
    },
    takeaways: [
      'Enerji modeli için mahallerin (IfcSpace) kapalı ve eksiksiz tanımlanması gerekir.',
      'İklim verisi projenin gerçek konumuna göre seçilir.',
      'Türkiye’de yapı kabuğu için sınır değerler TS 825 ile belirlenir; değerler proje bölgesine göre değişir.',
    ],
    example: 'Bir konut projesinde pencere tipinin değiştirilmesi düşünülür. Enerji modeli eski ve yeni pencere için ayrı çalıştırılır; karar, yıllık enerji ihtiyacı ile maliyet farkı birlikte okunarak verilir.',
    sources: ['ISO 52000-1', 'TS 825 (binalarda ısı yalıtım kuralları)', 'IFC4 özellik setleri'],
  },
  {
    slug: 'yasam-dongusu-asamalari',
    topicSlug: '6d-surdurulebilirlik',
    moduleTitle: 'Yaşam döngüsü analizi (LCA)',
    title: 'Yaşam döngüsü analizi: EN 15978 aşamaları',
    summary: 'Bir binanın çevresel etkisinin üretimden ömür sonuna kadar hangi aşamalara ayrıldığını ve her aşamanın verisinin nereden geldiğini anlatır.',
    rule: 'Toplam etki = her malzeme için miktar × aşama etkileri toplamı. Modül D (sistem sınırı dışı kazanç) toplamdan ayrı raporlanır.',
    table: {
      title: 'EN 15978 yaşam döngüsü modülleri (A1–D) ve karbon türleri',
      headers: ['Aşama Grubu', 'Modül Kodu', 'Kapsadığı Süreç', 'Karbon Türü', 'BIM / Metraj Veri Kaynağı'],
      rows: [
        ['Ürün (Beşikten Kapıya)', 'A1', 'Hammadde temini (madencilik, agrega, cevher)', 'Gömülü Karbon (Upfront)', 'IFC Qto Miktarı × Üretici EPD (A1–A3)'],
        ['Ürün (Beşikten Kapıya)', 'A2', 'Hammaddenin fabrikaya nakliyesi', 'Gömülü Karbon (Upfront)', 'IFC Qto Miktarı × Üretici EPD (A1–A3)'],
        ['Ürün (Beşikten Kapıya)', 'A3', 'Fabrika üretimi (çimento klinkeri, haddehane)', 'Gömülü Karbon (Upfront)', 'IFC Qto Miktarı × Üretici EPD (A1–A3)'],
        ['İnşaat Süreci', 'A4', 'Malzemenin fabrikadan şantiyeye nakliyesi', 'Gömülü Karbon (Upfront)', 'Taşıma mesafesi × Kütle'],
        ['İnşaat Süreci', 'A5', 'Şantiye imalatı, zayiat ve iş makineleri', 'Gömülü Karbon (Upfront)', 'Şantiye enerji tüketimi + Malzeme fire oranı'],
        ['Kullanım (Yapı Kaynaklı)', 'B1–B5', 'Kullanım, Bakım, Onarım, Değişim, Yenileme', 'Yaşam Döngüsü Gömülü Karbonu', 'AIM / COBie malzeme servis ömrü'],
        ['Kullanım (İşletme Kaynaklı)', 'B6–B7', 'İşletme enerjisi ve işletme suyu', 'İşletme Karbonu (Operational)', 'Enerji Performansı Modeli'],
        ['Ömür Sonu', 'C1–C4', 'Yıkım, Nakliye, Atık İşleme, Bertaraf', 'Ömür Sonu Gömülü Karbonu', 'Yıkım metrajı ve atık sınıfı'],
        ['Sistem Sınırı Ötesi', 'D', 'Yeniden kullanım ve geri dönüşüm potansiyeli', 'Net Kazanım / Kredi (Ayrı Raporlanır)', 'Çelik hurda geri dönüşüm oranı'],
      ],
    },
    takeaways: [
      'Miktarlar modelden, etki katsayıları EPD’lerden gelir; ikisinin kaynağı ayrı ayrı belgelenir.',
      'Gömülü karbon (A1–A5) ve işletme karbonu (B6–B7) ayrı raporlanır; biri düşürülürken diğeri artabilir.',
      'Sökülebilir tasarım, modül D’deki kazancı artırır; modül D toplamdan ayrı beyan edilir.',
    ],
    example: 'Bir ofis binasında iki taşıyıcı sistem seçeneği karşılaştırılır. Her seçenek için model miktarları aynı EPD veri setiyle çarpılır; karşılaştırma aynı sistem sınırında yapıldığı için sonuç anlamlıdır.',
    sources: ['BS EN 15978:2011', 'ISO 14040 / 14044', 'EN 15804+A2 (EPD kuralları)', 'Carbon Leadership Forum (CLF) Embodied Carbon 101'],
  },
  {
    slug: 'yesil-bina-sertifikalari',
    topicSlug: '6d-surdurulebilirlik',
    moduleTitle: 'Yeşil bina sertifikaları',
    title: 'Yeşil bina sertifikaları ve model verisi',
    summary: 'LEED, BREEAM ve EDGE gibi sertifika sistemlerinin modelden hangi bilgiyi beklediğini ve bu bilginin nasıl kanıtlandığını anlatır.',
    table: {
      title: 'Kategori, model bilgisi ve kanıt',
      headers: ['Kategori', 'Modelde hangi bilgi', 'Gereken kanıt'],
      rows: [
        ['Malzeme ve kaynaklar', 'Malzeme türü ve çevresel ürün beyanı', 'EPD belgeleri'],
        ['İç ortam kalitesi', 'Kaplama ve boyaların emisyon bilgisi', 'Ürün test raporları'],
        ['Su verimliliği', 'Armatürlerin debi bilgisi', 'Armatür çizelgesi'],
        ['Enerji', 'Yapı kabuğu ve sistem bilgisi', 'Enerji modeli raporu'],
      ],
    },
    takeaways: [
      'Her sertifika sisteminin kendi ölçütleri ve sürümü vardır; proje başında hangisinin hedeflendiği belirlenir.',
      'Model, kanıtın yerini tutmaz; belgeyi ve sorumlusunu gösterir.',
      'Sertifika sonucu bağımsız değerlendiricinin onayıyla kesinleşir.',
    ],
    example: 'Bir ofis projesinde kaplama malzemelerinin emisyon bilgisi modele özellik olarak girilir ve her malzemenin test raporu ilgili nesneye bağlanır. Değerlendirme sırasında eksik belge modelden hızla bulunur.',
    sources: ['LEED (USGBC)', 'BREEAM (BRE)', 'EDGE (IFC, Dünya Bankası Grubu)'],
  },
  {
    slug: 'uretken-tasarim',
    topicSlug: 'scan-to-bim',
    moduleTitle: 'Üretken tasarım ve insan onayı',
    title: 'Üretken tasarım: çok hedefli optimizasyon',
    summary: 'Maliyet, gün ışığı ve enerji gibi birbiriyle çatışan hedefler için algoritmaların seçenek ürettiği süreci ve sınırlarını anlatır.',
    rule: 'Amaç: maliyeti, enerji ihtiyacını ve gömülü karbonu aynı anda en aza indiren seçenekler. Hiçbir hedefte diğerinden kötü olmayan seçenekler Pareto sınırını oluşturur.',
    table: {
      title: 'Değişkenler ve hedefler',
      headers: ['Parametre', 'Türü', 'Ne için'],
      rows: [
        ['Bina yönlenmesi', 'Değişken', 'Güneş kazancı'],
        ['Pencere ve duvar oranı', 'Değişken', 'Gün ışığı ve ısı kaybı dengesi'],
        ['Toplam maliyet', 'Hedef', 'En aza indirilir'],
        ['Yıllık enerji ihtiyacı', 'Hedef', 'En aza indirilir'],
      ],
    },
    takeaways: [
      'Algoritma çok sayıda seçenek üretir; seçimi ve sorumluluğu mimar ve mühendis üstlenir.',
      'Pareto sınırındaki seçenekler hedefler arasındaki gerçek ödünleşimi gösterir.',
      'Girdilerdeki hata tüm seçeneklere yansır; girdiler ayrıca doğrulanır.',
    ],
    example: 'Bir kampüs projesinde bina yönlenmesi ve cephe oranı için çok sayıda seçenek taranır. Ekip, Pareto sınırındaki birkaç seçeneği ayrıntılı inceler ve kararı gerekçesiyle kayda alır.',
    sources: ['NSGA-II (çok hedefli genetik algoritma)', 'Pareto optimumu'],
  },
  {
    slug: 'insan-onayi-ve-kanit',
    topicSlug: 'scan-to-bim',
    moduleTitle: 'Üretken tasarım ve insan onayı',
    title: 'İnsan onayı ve kanıt kaydı',
    summary: 'Yapay zekâ ve otomatik kural motorlarının ürettiği sonuçların hangi durumda insan onayından geçmesi gerektiğini ve bu onayın nasıl kaydedildiğini anlatır.',
    rule: 'Otomatik sonuç → risk seviyesine göre yetkili kişi incelemesi → kim, ne zaman, hangi gerekçeyle onayladı kaydı.',
    table: {
      title: 'Karar türüne göre onay',
      headers: ['Karar', 'Risk', 'Otomasyonun rolü', 'Onaylayan'],
      rows: [
        ['Metraj poz eşleştirme', 'Düşük', 'Öneri sunar', 'Metraj mühendisi'],
        ['Donatı tasarımı', 'Kritik', 'Taslak önerir', 'Yetkili inşaat mühendisi'],
        ['Yangın kaçış mesafesi', 'Kritik', 'Kural kontrolü yapar', 'Mimar ve yangın danışmanı'],
        ['Teklif iskontosu', 'Orta', 'Senaryo gösterir', 'Proje müdürü'],
      ],
    },
    takeaways: [
      'Otomasyon sorumluluk almaz; her sonuç bir kişiye ve bir tarihe bağlanır.',
      'Kanıt kaydı sonradan değiştirilemez biçimde tutulur.',
      'Kritik kararlarda otomatik sonuç yalnız bir ön kontroldür.',
    ],
    example: 'Bir hastane teklifinde otomatik metraj aktarımından gelen kalemler inceleme bekliyor durumunda kalır. Metraj mühendisi her kalemi kaynağıyla birlikte kontrol eder; onaylanmayan kalem teklife girmez.',
    sources: ['ISO 19650-5 (denetim izi)', 'AB Yapay Zekâ Tüzüğü (yüksek riskli sistemler)'],
    bimmetraj: { capabilityId: 'ifc-qto-multi-layer-icmal', text: 'IFC aktarımından gelen kalemler, onaylanana kadar inceleme bekliyor durumunda tutulur (pilot).' },
  },
  {
    slug: 'cde-yetki-matrisi',
    topicSlug: 'guvenlik-ve-saha',
    moduleTitle: 'Rol tabanlı erişim (ISO 19650-5)',
    title: 'CDE yetki matrisi ve bilgi güvenliği',
    summary: 'Ortak veri ortamında her rolün hangi bilgi durumunda okuma, yazma ve onay hakkı olduğunu ve hassas bilginin nasıl korunduğunu anlatır.',
    rule: 'Erişim hakkı = rol × bilgi durumu (çalışma, paylaşılan, yayımlanan, arşiv) × güvenlik sınıfı.',
    table: {
      title: 'Bilgi durumuna göre örnek yetkiler',
      headers: ['Bilgi durumu', 'Disiplin ekibi', 'Disiplin lideri', 'Bilgi yöneticisi', 'İşveren'],
      rows: [
        ['Çalışma (WIP)', 'Okur ve yazar', 'Okur, yazar ve onaylar', 'Erişemez', 'Erişemez'],
        ['Paylaşılan (Shared)', 'Okur', 'Yayına hazırlar', 'Koordinasyon onayı verir', 'Okur'],
        ['Yayımlanan (Published)', 'Okur', 'Okur', 'Okur', 'Kabul eder'],
        ['Arşiv (Archived)', 'Okur', 'Okur', 'Okur', 'Denetler'],
      ],
    },
    takeaways: [
      'Çalışma alanı diğer disiplinlere ve işverene kapalıdır; olgunlaşmamış bilgi yanlış anlaşılır.',
      'Paylaşılan alana geçiş disiplin liderinin onayıyla olur.',
      'Hassas projelerde güvenlik açısından kritik bilgi sınıflandırılır ve erişimi daraltılır.',
    ],
    example: 'Bir havalimanı projesinde ihale dosyasına yanlışlıkla çalışma alanındaki bir pafta girer. Yetki matrisi kurulduktan sonra ihale yalnız yayımlanan durumdaki bilgiden hazırlanır.',
    sources: ['ISO 19650-5', 'ISO 19650-2 (bilgi durumları)', 'ISO/IEC 27001'],
    bimmetraj: { capabilityId: 'multi-user-cde-approval-workflow', text: 'Rol bazlı CDE onay kapıları ve revizyon onay akışı pilot sürümde bulunur.' },
  },
  {
    slug: 'e-ruhsat-kural-denetimi',
    topicSlug: 'guvenlik-ve-saha',
    moduleTitle: 'e-Ruhsat ve kural denetimi',
    title: 'e-Ruhsat, RG 33331 ve imar kural denetimi',
    summary: 'IFC modelinin imar kurallarına göre otomatik ön kontrolden nasıl geçirildiğini, RG 33331 e-PYS geçiş takvimini ve EK-9 model kalite kontrol kriterlerini anlatır.',
    rule: 'RG 33331: 1 Eylül 2027 itibarıyla mimari, statik, mekanik projeler PDF/A ve IFC formatında üretilecek; 1 Eylül 2028 itibarıyla tüm ruhsat başvuruları e-PYS üzerinden yürütülecektir. TAKS = taban alanı ÷ parsel alanı; KAKS = emsale dahil kat alanları ÷ parsel alanı.',
    table: {
      title: 'EK-9 model kalite kontrol kriterleri (RG 33331)',
      headers: ['EK-9 Referans', 'Kontrol Kriteri', 'IFC Model Varlığı', 'Onay'],
      rows: [
        ['Tablo 9.1 Mimari', 'Coğrafi referans ve kat hiyerarşisi', 'IfcProject → IfcSite → IfcBuilding → IfcBuildingStorey', 'Otomatik + müellif'],
        ['Tablo 9.1 Mimari', 'Mahal ve emsal alanları', 'IfcSpace → Qto_SpaceBaseQuantities.NetFloorArea', 'Otomatik + yetkili mimar'],
        ['Tablo 9.1 Mimari', 'Yangın kaçış kapıları', 'IfcDoor → Pset_DoorCommon.FireRating ve IsExternal', 'Kural motoru + mimar'],
        ['Tablo 9.2 Statik/MEP', 'Taşıyıcı eleman malzeme sınıfı', 'IfcColumn/IfcBeam/IfcWall → LoadBearing=TRUE, malzeme sınıfı', 'Otomatik + statik müellif'],
        ['Tablo 9.2 Statik/MEP', 'Disiplinlerarası koordinasyon başlangıç noktası', 'Mimari, statik, MEP → aynı IfcCartesianPoint (0,0,0)', 'Otomatik koordinat kontrolü'],
      ],
    },
    takeaways: [
      '1 Eylül 2027 sonrası tüm projelerde IFC teslimi zorunlu olacağından modelleme standartlarının şimdiden uygulanması gerekir.',
      'EK-9 Tablo 9.1 (21 kriter) ve Tablo 9.2 (16 kriter) kapsamındaki otomatik kontroller yetkili müellifin onayını kaldırmaz.',
      'Kural denetimi için model parsel koordinatlarına doğru oturtulmalı ve disiplinler ortak başlangıç noktasını paylaşmalıdır.',
    ],
    example: 'Bir konut projesinde ön çekme mesafesindeki ihlal, otomatik EK-9 ön kontrolünde ruhsat başvurusundan önce görülür ve proje başvuru yapılmadan düzeltilir.',
    sources: ['RG 33331 e-PYS Yönetmelikleri (5 Ağustos 2026)', 'Planlı Alanlar İmar Yönetmeliği', 'Binaların Yangından Korunması Hakkında Yönetmelik'],
    bimmetraj: { capabilityId: 'pre-bim-feasibility-kat-karsiligi', text: 'IFC öncesi fizibilite ekranında TAKS ve KAKS hesabı pilot olarak bulunur.' },
  },
  {
    slug: 'bilgi-ihtiyaci-seviyesi',
    topicSlug: 'bim-temelleri',
    moduleTitle: 'Bilgi ihtiyacı seviyesi (LOIN)',
    title: 'Bilgi ihtiyacı seviyesi (LOIN)',
    summary: 'EN 17412-1’in bir teslimde ne kadar geometri, ne kadar bilgi ve hangi belgelerin isteneceğini nasıl tanımladığını anlatır.',
    rule: 'Bilgi ihtiyacı = amaç + aşama + aktör + nesne için geometrik bilgi, alfanümerik bilgi ve belgeler. Seviye tek bir sayı değil, bu başlıkların ayrı ayrı tanımıdır.',
    table: {
      title: 'EN 17412-1 (LOIN) aşamalarına göre IFC bilgi gereksinimleri',
      headers: ['Aşama / Amaç', 'Hedef IFC Sınıfı', 'LOG (Geometri)', 'LOI (Zorunlu Özellikler ve Qto)', 'DOC (Belgeler)'],
      rows: [
        ['Ön Seçim / Ruhsat (e-PYS)', 'IfcSpace', '2B Sınır + 3B Hacim', 'Pset_SpaceCommon.Reference, Qto_SpaceBaseQuantities.NetFloorArea', 'Mimari Mahal Listesi PDF/A'],
        ['5D İhale Teklifi', 'IfcWall, IfcSlab, IfcColumn', 'Kesişimleri çözülmüş 3B katı model', 'Pset_*Common.LoadBearing, Material (C30/37), Qto_*BaseQuantities.NetVolume, PozNo', 'Statik Kalıp Planı + Metraj Cetveli'],
        ['İşletme Teslimi (AIM)', 'IfcPump, IfcChiller', 'Sembolik 3B + Bakım Boşluğu', 'COBie.Component, Garanti Bitiş Tarihi, Seri No, Bakım Periyodu', 'Garanti Belgesi ve Kullanım Kılavuzu'],
      ],
    },
    takeaways: [
      'Her teslim için bilgi ihtiyacı amaca göre ayrı tanımlanır; "her şey en ayrıntılı" bir hedef değildir.',
      'Bilgi çoğu zaman geometri yerine bir özellik değeri olarak verilir; model hafif kalır.',
      'Teslim, tanımlanan bilgi ihtiyacına göre eksiksizlik açısından kontrol edilir.',
    ],
    example: 'Bir statik modelde donatı filizleri üç boyutlu çizilmek yerine elemanın özelliği olarak yazılır. Model hafifler, metraj ve ihale için gereken bilgi kaybolmaz.',
    sources: ['EN 17412-1', 'ISO 19650-1'],
    bimmetraj: { capabilityId: 'iso19650-naming-ek2-loin', text: 'ISO 19650 dosya adlandırma ve EN 17412-1 LOIN desteği pilot olarak bulunur.' },
  },
  // Package 2 (Rev. 165): brands generalised, invented figures removed, worked example recomputed by test.
  {
    slug: 'bilgi-gereksinimleri-ve-teslim-sureci',
    topicSlug: 'bim-temelleri',
    moduleTitle: 'Bilgi gereksinimleri: OIR, PIR, AIR ve EIR',
    title: 'Bilgi gereksinimleri ve sekiz adımlı teslim süreci',
    summary: 'Kurumun hedeflerinden yüklenicinin teslim planına uzanan bilgi gereksinimleri zincirini ve ISO 19650-2’nin teslim sürecini adım adım anlatır.',
    rule: 'OIR → PIR → AIR → EIR → BEP → TIDP ve MIDP → PIM → AIM. Her halka bir öncekinden türetilir ve bir sonrakinin girdisidir.',
    table: {
      title: 'ISO 19650-2 teslim süreci',
      headers: ['Adım', 'Ne yapılır', 'Ana çıktı'],
      rows: [
        ['İhtiyaç analizi', 'İşveren proje ve varlık gereksinimlerini belirler', 'OIR, PIR, AIR ve EIR'],
        ['İhale daveti', 'Bilgi gereksinimleri ihale dokümanına girer', 'İhale dokümanı'],
        ['İhale yanıtı', 'Teklif veren kapasitesini ve BEP taslağını sunar', 'Sözleşme öncesi BEP'],
        ['Sözleşme ve atama', 'Bilgi sorumlulukları ve teslim protokolü yazılır', 'Bilgi protokolü ve MIDP'],
        ['Hazırlık', 'Ortak veri ortamı, şablonlar ve ekip test edilir', 'Sınanmış CDE ve BEP'],
        ['Ortak bilgi üretimi', 'Disiplinler bilgiyi üretir ve koordine eder', 'Koordineli modeller'],
        ['Bilgi modeli teslimi', 'Onaylanan bilgi yayımlanır', 'Proje bilgi modeli (PIM)'],
        ['Proje kapanışı', 'Teslim bilgisi işletme verisine dönüştürülür', 'Varlık bilgi modeli (AIM)'],
      ],
    },
    takeaways: [
      'EIR olmadan ihaleye çıkılırsa yüklenicinin neyi teslim edeceği belirsiz kalır.',
      'BEP iki kez hazırlanır: ihale yanıtıyla birlikte sözleşme öncesi ve atamadan sonra.',
      'Her görev ekibi kendi TIDP’sini hazırlar; MIDP bunların birleşimidir.',
    ],
    example: 'Bir hastane projesinde işveren, tıbbi ekipmanların işletme için hangi bilgilerle teslim edileceğini EIR’ye yazar. Yüklenici bu bilgileri MIDP’deki tarihlerde ekipman kayıtlarıyla birlikte teslim eder ve işletme ekibi ilk günden kullanır.',
    sources: ['ISO 19650-1', 'ISO 19650-2'],
    bimmetraj: { capabilityId: 'iso19650-cde-workflow-state-machine', text: 'CDE durum geçişlerinin ve EIR/LOIN teslim kapısının doğrulanması pilot olarak bulunur.' },
  },
  {
    slug: 'kazanilmis-deger',
    topicSlug: '4d-5d-maliyet',
    moduleTitle: 'Kazanılmış değer analizi (EVM)',
    title: 'Kazanılmış değer analizi: PV, EV, AC, CPI ve SPI',
    summary: 'Planlanan değer, kazanılan değer ve gerçekleşen maliyetten projenin bütçe ve zaman performansının nasıl hesaplandığını bir örnekle anlatır.',
    rule: 'CPI = EV ÷ AC, SPI = EV ÷ PV, CV = EV − AC, SV = EV − PV. Tamamlanma tahmini: EAC = BAC ÷ CPI.',
    table: {
      title: 'Göstergeler nasıl okunur',
      headers: ['Gösterge', 'Formül', 'Birden küçükse veya negatifse', 'Birden büyükse veya pozitifse'],
      rows: [
        ['CPI (maliyet performansı)', 'EV ÷ AC', 'Bütçe aşılıyor', 'Bütçenin altında kalınıyor'],
        ['SPI (zaman performansı)', 'EV ÷ PV', 'İş programının gerisinde', 'İş programının önünde'],
        ['CV (maliyet sapması)', 'EV − AC', 'Fazla harcama', 'Tasarruf'],
        ['SV (zaman sapması)', 'EV − PV', 'Geride', 'İleride'],
      ],
    },
    calculation: {
      title: 'Örnek hesap',
      note: 'Değerler bütçe birimi cinsindendir ve yalnız formüllerin nasıl çalıştığını göstermek için seçilmiştir.',
      inputs: { BAC: 200, PV: 100, EV: 70, AC: 72 },
      results: [
        { label: 'CPI', formula: 'EV ÷ AC', value: 0.97 },
        { label: 'SPI', formula: 'EV ÷ PV', value: 0.7 },
        { label: 'CV', formula: 'EV − AC', value: -2 },
        { label: 'SV', formula: 'EV − PV', value: -30 },
        { label: 'EAC', formula: 'BAC ÷ CPI', value: 205.7 },
      ],
    },
    takeaways: [
      'Yalnız harcanan paraya bakarak projenin durumu anlaşılmaz; sahada tamamlanan iş (EV) ayrıca ölçülür.',
      'Örnekte maliyet neredeyse bütçede, ama iş programının belirgin biçimde gerisindedir.',
      'EV’nin ölçüm yöntemi (yüzde tamamlanma, ara hedefler) proje başında tanımlanır.',
    ],
    example: 'Bir projede aylık raporda yalnız harcama izleniyor ve her şey yolunda görünüyor. Kazanılmış değer eklendiğinde işin planın gerisinde kaldığı ortaya çıkar ve ekip kaynak planını erken değiştirir.',
    sources: ['ISO 21508 (kazanılmış değer yönetimi)', 'PMI kazanılmış değer uygulama standardı'],
  },
  {
    slug: 'model-is-programi-eslestirme',
    topicSlug: '4d-5d-maliyet',
    moduleTitle: 'Model elemanlarını iş programına bağlamak',
    title: 'Model elemanlarını iş programına GUID ile bağlamak',
    summary: 'IFC elemanlarının benzersiz kimliğiyle iş programındaki görevlerin nasıl eşleştirildiğini, IFC4 4D (IfcWorkSchedule) ve 5D (IfcCostSchedule) veri modelini anlatır.',
    rule: 'IFC elemanının GlobalId değeri (22 karakterlik benzersiz kimlik) ↔ iş programındaki görev kodu. Eşleşme ad üzerinden değil kimlik üzerinden yapılır. 4D: IfcRelAssignsToProcess, 5D: IfcRelAssignsToControl.',
    table: {
      title: 'IFC4 4D ve 5D veri modeli',
      headers: ['Boyut', 'Ana Varlık', 'Görev/Kalem Varlığı', 'Model Bağlantı İlişkisi'],
      rows: [
        ['4D Zaman', 'IfcWorkSchedule', 'IfcTask (başlangıç, bitiş, süre)', 'IfcRelAssignsToProcess → IfcProduct.GlobalId'],
        ['5D Maliyet', 'IfcCostSchedule', 'IfcCostItem (birim fiyat, para birimi)', 'IfcRelAssignsToControl → IfcProduct.GlobalId'],
        ['5D Miktar', 'IfcCostItem', 'CostQuantities', 'Qto_*BaseQuantities.NetVolume / NetArea / Weight'],
        ['4D İlerleme', 'IfcTask', 'İlerleme yüzdesi', 'EVM: Kazanılmış Değer (EV) eleman bazında izlenir'],
      ],
    },
    takeaways: [
      'Eşleşme ad üzerinden değil GlobalId üzerinden yapılır; model güncellendiğinde kimliği korunan elemanlar eşleşmesini kaybetmez.',
      '4D iş programında IfcRelAssignsToProcess, 5D maliyet cetvelinde IfcRelAssignsToControl ilişkisi kullanılır.',
      '4D simülasyon kule vinç, iskele ve geçici yapıları da kapsamalıdır; maliyet cetveli ise IfcCostSchedule üzerinden modele bağlanır.',
    ],
    example: 'Bir köprü inşaatında ayakların beton dökümleri IfcTask ve GlobalId eşleştirmesiyle iş programına bağlanır. IfcCostItem üzerindeki birim fiyatlar IFC QTO miktarlarıyla çarpılarak 5D maliyet tahmini otomatik güncellenir.',
    sources: ['IFC4 (IfcGloballyUniqueId, IfcWorkSchedule, IfcCostSchedule)', 'ISO 19650-2', 'IfcOpenShell 4D/5D API'],
  },
  {
    slug: 'cakisma-turleri-ve-bcf',
    topicSlug: 'guvenlik-ve-saha',
    moduleTitle: 'Çakışma yönetimi',
    title: 'Çakışma türleri ve çözüm akışı',
    summary: 'Fiziksel, tolerans ve zaman çakışmalarının nasıl ayrıldığını ve her birinin sorumlusuna nasıl iletildiğini anlatır.',
    rule: 'Fiziksel çakışma: iki elemanın hacimlerinin kesişimi boş değildir. Tolerans çakışması: tanımlı bakım veya çalışma boşluğu ihlal edilmiştir. Zaman çakışması: aynı yer aynı anda iki iş için gereklidir.',
    table: {
      title: 'Çakışma türleri',
      headers: ['Tür', 'Örnek', 'Olağan çözüm'],
      rows: [
        ['Fiziksel', 'Havalandırma kanalı kirişin içinden geçer', 'Kanal kotu değiştirilir veya kirişte onaylı boşluk açılır'],
        ['Tolerans', 'Vana çevresinde bakım için yer kalmaz', 'Tesisat elemanı kaydırılarak bakım alanı açılır'],
        ['Zaman', 'Vinç ile cephe montajı aynı gün aynı alanı kullanır', 'İş programında görevlerden biri kaydırılır'],
      ],
    },
    takeaways: [
      'Çakışma raporu bir PDF olarak değil, sorumlusu ve durumu olan bir kayıt (BCF) olarak iletilir.',
      'Her çakışmanın bir sahibi ve bir kapanış onayı vardır.',
      'Modelde çözülen çakışma, sahada kırıp yeniden yapmaktan her zaman daha ucuzdur.',
    ],
    example: 'Bir hastane projesinde tesisat ve betonarme modelleri birleştirilince çok sayıda fiziksel çakışma bulunur. Her biri sorumlusuna BCF kaydıyla atanır; çözülenler koordinatörün kontrolüyle kapanır ve şantiyeye yalnız temizlenmiş model iner.',
    sources: ['buildingSMART BCF', 'Sanal tasarım ve inşaat (VDC) uygulamaları'],
  },
  {
    slug: 'ifc-ve-bcf-akisi',
    topicSlug: 'bim-temelleri',
    moduleTitle: 'openBIM: IFC ve BCF',
    title: 'IFC ve BCF ile yazılımlar arası çalışma',
    summary: 'Farklı yazılımlarla çalışan ekiplerin IFC ile model, BCF ile sorun bilgisini nasıl paylaştığını ve BCF 3.0 paketinin hangi bileşenlerden oluştuğunu anlatır.',
    rule: 'BCF 3.0 kaydı üç bileşen içerir: markup.bcf (ilgili elemanların GlobalId referansları, konu başlığı, durum, öncelik ve atanan kişi), viewpoint.bcfv (kamera konumu ve kırpma düzlemleri) ve snapshot.png (tespit anındaki ekran görüntüsü). Modelin kendisi kayıtla birlikte gönderilmez.',
    table: {
      title: 'BCF 3.0 paket bileşenleri ve içerdikleri veri',
      headers: ['Bileşen', 'İçerdiği Veri', 'Kullanım Amacı'],
      rows: [
        ['markup.bcf', 'GlobalId referansları, konu başlığı, atanan kişi, durum, öncelik', 'Sorunun hangi IFC elemanına ait olduğunu yazılım bağımsız biçimde tanımlar'],
        ['viewpoint.bcfv', 'Kamera konumu, zoom, kırpma düzlemleri, seçili eleman listesi', 'Alıcı modeli aynı 3B bakış açısından doğrudan açar'],
        ['snapshot.png', 'Tespit anındaki ekran görüntüsü', 'Görsel kanıt; IFC modeli olmayan paydaşlar da okuyabilir'],
      ],
    },
    takeaways: [
      'IFC modelin ortak dilidir; BCF ise model üzerindeki konuşmanın ortak dilidir.',
      'GlobalId sayesinde kayıt, farklı yazılımlarda aynı elemana işaret eder; kamera açısı ve snapshot bulunduğu için alıcı doğrudan doğru yere gider.',
      'Durum adları (Açık, Atandı, Çözüldü, Kapandı) projede ortak tanımlanır ve BEP ile TIDP’e yazılır.',
    ],
    example: 'Mimari, statik ve mekanik ekipler farklı yazılımlarla çalışır. Koordinatör birleşik IFC modelinde bulduğu sorunları BCF kaydıyla dağıtır; her ekip markup.bcf içindeki GlobalId ve viewpoint.bcfv ile kaydı kendi yazılımında açar, düzeltir ve durumunu günceller.',
    sources: ['ISO 16739-1 (IFC)', 'buildingSMART BCF 3.0 Specification'],
  },
  // Package 3 (Rev. 165): figures reviewed with the yuksek-muhendis-mimar skill on 2026-11-06.
  {
    slug: 'minha-kurallari',
    topicSlug: '4d-5d-maliyet',
    moduleTitle: 'Metraj kuralları ve boşluk düşümü',
    title: 'Boşluk düşümü (minha): ÇŞB 2026, DIN 18350 ve RICS NRM2',
    summary: 'Aynı yapı elemanından ÇŞB 2026, DIN 18350 ve RICS NRM2 ölçü kurallarıyla neden farklı miktar çıktığını betonarme, kalıp, donatı ve kaplama kalemleri üzerinden karşılaştırmalı olarak anlatır.',
    rule: 'ÇŞB 2026: sıva, boya ve kaplamada boşluk boyutuna bakılmaksızın düşülür, boşluk yanları (iç dişler) eklenir. DIN 18350: tekil alanı 2,5 m²’ye kadar olan boşluklar düşülmez, yanları da eklenmez. DIN 18331: betonarme için 0,10 m³’ün altındaki boşluklar düşülmez, donatı hacmi betondan çıkarılmaz.',
    table: {
      title: 'İmalat kalemine göre ÇŞB 2026, DIN/RICS boşluk kuralı ve IFC Qto kaynağı',
      headers: ['İmalat', 'ÇŞB 2026 Boşluk / Ölçü Kuralı', 'Poz', 'DIN / RICS Kuralı', 'IFC Qto Özelliği'],
      rows: [
        ['Betonarme betonu', 'Net hacim (m³); kesişimler tek sayılır, donatı düşülmez', '15.150.1001–1015', '< 0,10 m³ boşluk düşülmez (DIN 18331)', 'Qto_*BaseQuantities.NetVolume'],
        ['Kalıp', 'Net beton temas yüzeyi (m²); kiriş üst yan yüzü döşeme hizasında dahil değil', '15.180.1001–1012', '< 1,00 m² boşluk düşülmez (DIN 18331)', 'Qto_*BaseQuantities.OuterSurfaceArea'],
        ['Donatı çeliği', 'Teorik nominal kütle (ton = adet × L × kg/m); fire birim fiyata dahil', '15.160.1001–1006', 'Çap bazlı nominal kütle (ton); bindirme dahil (DIN 18331)', 'Qto_ReinforcingElementBaseQuantities.Weight'],
        ['Sıva, boya, kaplama', 'Tüm boşluklar düşülür; boşluk yanları (iç dişler) eklenir (m²)', '15.275, 15.280, 15.285, 15.540', '< 2,5 m² boşluk düşülmez, yanlar eklenmez (DIN 18350); < 1,0 m² düşülmez (RICS NRM2)', 'Qto_CoveringBaseQuantities.NetArea'],
        ['Tuğla / gazbeton duvar', '0,10 m² ve üstü düşülür (m²)', '15.220–15.240', '< 0,50 m² düşülmez (DIN 18330)', 'Qto_WallBaseQuantities.NetSideArea'],
        ['Alçı levha', '0,50 m² ve üstü düşülür', '15.530', 'Kapsam dışı', 'Yok'],
        ['Asma tavan', '0,25 m² ve üstü düşülür', '15.535', 'Kapsam dışı', 'Yok'],
      ],
    },
    calculation: {
      title: 'Örnek hesap: aynı duvarın sıva alanı',
      note: 'Duvar 5 m × 2,8 m, iki pencere 1,4 m × 1,6 m, iç diş derinliği 0,25 m (üç kenar). Uzunluklar metre, alanlar m² cinsindendir.',
      inputs: { L: 5, H: 2.8, N: 2, G: 1.4, Y: 1.6, T: 0.25 },
      results: [
        { label: 'BRUT', formula: 'L × H', value: 14 },
        { label: 'BOSLUK', formula: 'N × G × Y', value: 4.48 },
        { label: 'DIS', formula: 'N × (2 × Y + G) × T', value: 2.3 },
        { label: 'CSB', formula: 'BRUT − BOSLUK + DIS', value: 11.82 },
        { label: 'DIN', formula: 'BRUT', value: 14 },
      ],
    },
    takeaways: [
      'Hangi ölçü kuralının uygulandığı teklifte ve hakedişte açıkça yazılır; betonarme, kalıp ve donatı için ÇŞB ile DIN/RICS arasındaki en kritik fark kesişim noktaları ve boşluk alt eşikleridir.',
      '"Küçük boşluklar düşülmez" kuralı ÇŞB’nin sıva ve boya analizlerinde yoktur; piyasadaki yaygın bir yanlıştır.',
      'IFC 5D BIM modelinde Qto_*BaseQuantities özellikleri standart minha mantığını uygular; hangi spesifikasyona göre hesaplandığı BEP’e yazılır.',
    ],
    example: 'Yurt dışındaki bir işte taşeron, alışkanlıkla ÇŞB mantığıyla ölçüm yapar ve küçük pencereleri metrajdan düşer. Sözleşme DIN 18350’ye bağlı olduğu için bu pencereler aslında ölçüye dahildir; fark hakedişte ortaya çıkar.',
    sources: ['ÇŞB 2026 İnşaat Birim Fiyat Analizleri, ölçü maddeleri', 'VOB/C DIN 18331 (betonarme, kalıp, donatı)', 'VOB/C DIN 18350 (sıva ve alçı işleri)', 'RICS NRM2 (kaplama ve boya)', 'IFC4 Qto BaseQuantities Şeması'],
    review: {
      reviewedOn: '2026-11-06',
      method: 'yuksek-muhendis-mimar skill ve eng_calc.py siva_boya_alani ile çapraz hesap',
      sources: ['src/smartcheck/rules/minha.ts (Rev. 150, ÇŞB 2026 analiz ölçü maddeleri)', 'Skill referansı: metraj-olcu-esaslari.md §4', 'ÇŞB 2026 poz grupları 15.150–15.180 (betonarme, kalıp, donatı)'],
      note: 'Betonarme, kalıp ve donatı satırları ÇŞB 2026 poz gruplarından alınmıştır; uluslararası karşılıklar VOB/C DIN 18331 ve RICS NRM2 ile çapraz teyit edilmiştir. 15.275 ve 15.380 için uzman görüşü sürmektedir.',
    },
    bimmetraj: { capabilityId: 'minha-opening-intersection-engine', text: 'Boşluk düşümü motoru ÇŞB 2026, DIN 18350 ve sözleşmeye özel eşikle çalışır (pilot).' },
  },
  {
    slug: 'gomulu-karbon',
    topicSlug: '6d-surdurulebilirlik',
    moduleTitle: 'Gömülü ve işletme karbonu',
    title: 'Gömülü karbon hesabı ve veri kaynakları',
    summary: 'Gömülü karbonun model miktarları ve çevresel ürün beyanlarıyla nasıl hesaplandığını ve hangi verinin hangisine tercih edildiğini anlatır.',
    rule: 'Gömülü karbon = her malzeme için miktar × karbon katsayısı toplamı. İşletme karbonu = yıllık enerji tüketimi × şebeke emisyon katsayısı × kullanım yılı. İkisi ayrı raporlanır.',
    table: {
      title: 'Karbon katsayısı için veri önceliği',
      headers: ['Öncelik', 'Veri kaynağı', 'Ne zaman kullanılır'],
      rows: [
        ['Birinci', 'Ürüne özel EPD', 'Tedarikçi ve ürün belli olduğunda'],
        ['İkinci', 'Sektör ortalaması EPD', 'Ürün sınıfı belli, tedarikçi belli değilken'],
        ['Üçüncü', 'Genel veri tabanı değeri', 'Erken tasarımda; raporda belirtilerek'],
      ],
    },
    calculation: {
      title: 'Örnek hesap: A1–A3 gömülü karbon (zemin kat kaba yapı)',
      note: 'V = C30/37 hazır beton hacmi; ECFB = tipik birim karbon katsayısı beton A1–A3; M = B420C donatı kütlesi; ECFD = tipik birim karbon katsayısı donatı çeliği EAF A1–A3. Katsayılar proje uygulamasında üreticiye özel EPD ile değiştirilmelidir.',
      inputs: { V: 420, ECFB: 310, M: 34500, ECFD: 1.82 },
      results: [
        { label: 'GWPB', formula: 'V × ECFB', value: 130200 },
        { label: 'GWPD', formula: 'M × ECFD', value: 62790 },
        { label: 'GWPT', formula: 'GWPB + GWPD', value: 192990 },
      ],
    },
    takeaways: [
      'Gömülü karbon bina tamamlandığında kesinleşir; azaltma fırsatı tasarım ve tedarik aşamasındadır.',
      'CEM III/A cüruflu çimento ile C30/37 betonda gömülü karbon yaklaşık üçte bir düşebilir; karar model miktarları ve üretici EPD’siyle desteklenir.',
      'Farklı seçenekler aynı veri seti ve aynı sistem sınırıyla karşılaştırılır.',
    ],
    example: 'Bir köprü projesinde iki beton karışımı karşılaştırılır. Tedarikçilerin ürüne özel EPD’leri kullanılır; hesap, model miktarlarıyla her iki karışım için ayrı yapılır ve karar gerekçesiyle kayda alınır.',
    sources: ['BS EN 15978:2011', 'EN 15804+A2 (EPD kuralları)', 'Carbon Leadership Forum (CLF) Embodied Carbon 101', 'ISO 16745-1', 'PAS 2080'],
    review: {
      reviewedOn: '2026-11-07',
      method: 'yuksek-muhendis-mimar skill; katsayılar CLF Embodied Carbon 101 ve EN 15978 kaynaklarıyla karşılaştırıldı',
      sources: ['Carbon Leadership Forum (CLF) Embodied Carbon 101', 'BS EN 15978:2011', 'EN 15804+A2 (EPD standartları)'],
      note: 'Karbon katsayıları (ECF_B: tipik CEM I, ECF_D: EAF yolu çelik) tipik ortalama değerlerdir; proje uygulamasında üreticiye özel EPD kullanılmalıdır.',
    },
  },
  {
    slug: 'loa-seviyeleri',
    topicSlug: 'scan-to-bim',
    moduleTitle: 'Doğruluk seviyeleri (LOA)',
    title: 'Doğruluk seviyeleri (LOA)',
    summary: 'USIBD LOA spesifikasyonunun nokta bulutu ve BIM modelinin doğruluğunu nasıl sınıflandırdığını ve hangi seviyenin ne tür projelere uyduğunu anlatır.',
    rule: 'Her LOA seviyesi, standart sapma bantlarıyla (%95 güven aralığında, 2σ) tanımlanır. Ölçülen doğruluk (nokta bulutunun sahaya yakınlığı) ve temsil edilen doğruluk (modelin nokta bulutuna yakınlığı) ayrı ayrı belirtilebilir.',
    table: {
      title: 'USIBD LOA 10–50 tolerans tablosu (2σ)',
      headers: ['Seviye', 'Standart Sapma Bandı', 'Tipik Yöntem', 'Mühendislik Kullanım Alanı'],
      rows: [
        ['LOA 10', '50 mm üstü', 'El tipi mesafe ölçer, kaba fotogrametri', 'Kitle etüdü, yaklaşık yıkım hacmi, ön fizibilite'],
        ['LOA 20', '15 mm–50 mm', 'Mobil SLAM tarayıcılar, İHA fotogrametrisi', 'Mevcut bina oda alanları (IfcSpace), kaba röleve'],
        ['LOA 30', '5 mm–15 mm', 'Yersel lazer tarama (TLS), total station kontrol', 'Mimari ve statik rölöve, güçlendirme, MEP çakışma ve hakedişe esas metraj'],
        ['LOA 40', '1 mm–5 mm', 'Yüksek yoğunluklu TLS ve hassas jeodezik ağ', 'Endüstriyel borulama, prefabrik cephe, çelik bağlantı detayları'],
        ['LOA 50', '0 mm–1 mm', 'Metroloji sınıfı optik ve lazer tarayıcılar', 'Hassas makine montajı, laboratuvar ve türbin tolerans kontrolü'],
      ],
    },
    takeaways: [
      'Seviye, modelin hangi kararı destekleyeceğine göre seçilir; daha yüksek seviye daha pahalıdır.',
      'Rölöve ve güçlendirme projelerinde LOA 30 genellikle yeterlidir; prefabrik ve endüstriyel uygulamalarda LOA 40 istenir.',
      'Sözleşmede seviye, güven düzeyi ve teslim edilecek doğruluk raporu yazılır; aynı proje içinde eleman türüne göre farklı seviye uygulanabilir.',
    ],
    example: 'Tarihi bir hamamın restorasyonunda kubbe ve kemerler LOA 40 ile taranır; avlu ve yardımcı mekânlar için LOA 30 yeterli görülür. Bu ayrım tarama süresini ve maliyeti düşürür.',
    sources: ['USIBD Level of Accuracy (LOA) Specification v3.1'],
    review: {
      reviewedOn: '2026-11-06',
      method: 'yuksek-muhendis-mimar skill; aralıklar iki bağımsız ikincil kaynakla karşılaştırıldı',
      sources: ['USIBD LOA Specification v3.1 (2σ bandları ve %95 güven düzeyi)', 'Techture LOA bilgi notu', 'NavVis: industry standards are only one piece of the puzzle'],
      note: 'USIBD belgesinin özgün metnine erişilemedi; aralıklar projede kullanılmadan önce spesifikasyonun güncel sürümüyle teyit edilmelidir.',
    },
  },
  {
    slug: 'nokta-bulutu-karsilastirma',
    topicSlug: 'scan-to-bim',
    moduleTitle: 'Nokta bulutu ile modelin karşılaştırılması',
    title: 'Nokta bulutu ile modelin karşılaştırılması',
    summary: 'Tarama verisinin modelle çakıştırılarak sapmaların nasıl ölçüldüğünü ve sapma sınırlarının nereden geldiğini anlatır.',
    rule: 'Sapma = taranan noktanın model yüzeyine dik uzaklığı. Kabul sınırı eleman türüne göre sözleşmeden veya uygulama tolerans standardından alınır.',
    table: {
      title: 'Karşılaştırma adımları',
      headers: ['Adım', 'Ne yapılır', 'Çıktı'],
      rows: [
        ['Kayıt', 'Nokta bulutu ve model aynı koordinat sistemine oturtulur', 'Hizalama raporu'],
        ['Ölçüm', 'Her nokta için model yüzeyine olan uzaklık hesaplanır', 'Sapma değerleri'],
        ['Sınıflama', 'Sapmalar sözleşmedeki sınırlara göre renklendirilir', 'Fark haritası'],
        ['Karar', 'Sınır dışı bölgeler sorumlusuna iletilir', 'BCF kayıtları'],
      ],
    },
    takeaways: [
      'Renk sınırları sabit bir standart değildir; eleman türüne ve sözleşmeye göre belirlenir.',
      'Kalıp söküldükten hemen sonra yapılan kontrol, düzeltmeyi ucuzlatır.',
      'Tarama tarihi, ekipman ve hizalama doğruluğu raporla birlikte saklanır.',
    ],
    example: 'Bir endüstriyel yapıda döşeme betonu döküldükten sonra yapılan karşılaştırma, şap öncesinde düzeltilmesi gereken bölgeleri gösterir ve düzeltme şap dökülmeden yapılır.',
    sources: ['TS EN 13670 (beton yapıların uygulanması)', 'ASTM E57 dosya biçimi', 'buildingSMART BCF'],
  },
  {
    slug: 'donati-detaylandirma',
    topicSlug: 'guvenlik-ve-saha',
    moduleTitle: 'Üretilebilirlik ve donatı detayı',
    title: 'Donatı detayı: kütle, tolerans, sıklaştırma ve BVBS',
    summary: 'Donatı metrajında kullanılan nominal kütlenin nasıl hesaplandığını, kütle toleransını, TBDY 2018’in sıklaştırma kurallarını ve BIM modelinden CNC üretim makinesine aktarılan BVBS (.abs) formatının yapısını anlatır.',
    rule: 'Nominal kütle (kg/m) = π × d² ÷ 4 × çelik yoğunluğu ≈ 0,006165 × d² (d mm). Hakedişte nominal kütle kullanılır; fire maliyete ayrıca eklenir. BVBS formatı: her poz @ ayraçlı bloklarla tanımlanır: @p (poz), @l (toplam kesim boyu mm), @n (adet), @d (çap mm), @g (çelik sınıfı), @e (tekil kütle kg), @G (büküm geometrisi: Gl@w@ dizisi).',
    table: {
      title: 'TBDY 2018 sıklaştırma bölgesinde etriye aralığı ve BVBS üretim kodu',
      headers: ['Eleman / Format', 'Bölge / Alan', 'Kural / Veri'],
      rows: [
        ['Kolon (yüksek süneklik)', 'Sarılma bölgesi', 'bmin/3, 150 mm ve 6φl değerlerinin en küçüğü'],
        ['Kolon (yüksek süneklik)', 'Orta bölge', 'bmin/2, 200 mm ve 8φl değerlerinin en küçüğü'],
        ['Kiriş', 'Uçlarda 2h boyunca', 'h/4, 8φl ve 150 mm değerlerinin en küçüğü'],
        ['BVBS @p / @l / @n', 'Poz / Kesim Boyu (mm) / Adet', 'Paftadaki poz numarası, kesilecek çubuk uzunluğu ve üretilecek çubuk sayısı'],
        ['BVBS @d / @g / @e', 'Çap (mm) / Çelik Sınıfı / Tekil Kütle (kg)', 'Nominal kütle kaynağı; poz toplam metrajı = @n × (@l÷1000) × kg/m'],
        ['BVBS @G (geometri)', 'Gl…@w… dizisi', 'Kanca ve gövde uzunlukları (mm) ile büküm açıları (°); CNC makineye bükme programı olarak aktarılır'],
      ],
    },
    calculation: {
      title: 'Örnek hesap: nominal kütle',
      note: 'Çap mm, kütle kg/m cinsindendir. Katsayı, çelik yoğunluğu 7,85 kg/dm³ alınarak hesaplanmıştır.',
      inputs: { D: 16, K: 0.006165 },
      results: [
        { label: 'KUTLE', formula: 'K × D × D', value: 1.578 },
      ],
    },
    takeaways: [
      'Kütle toleransı TS 708 ve EN 10080’e göre d ≤ 8 mm için ±%6, d > 8 mm için ±%4,5’tir; hakedişte nominal kütle esas alınır.',
      'Sıklaştırma bölgesindeki etriye aralığı, deprem davranışı için tasarımın en kritik detaylarındandır.',
      'BVBS (.abs) formatı BIM modelindeki @p (poz), @l (boy), @n (adet), @d (çap) ve @G (büküm geometrisi) verilerini CNC makinesine aktarır; elle veri girişi hatasını ortadan kaldırır.',
    ],
    example: 'Bir konut projesinde donatı listesi modelden çıkarılır. Metraj nominal kütleyle yapılır, fire satın alma miktarına ayrıca eklenir; sıklaştırma bölgelerindeki etriye aralıkları proje kontrolünde işaretlenir. BVBS dosyası doğrudan imalata gönderilir.',
    sources: ['TS 708', 'TS EN 10080', 'TBDY 2018, bölüm 7', 'TS 500', 'BVBS (Bundesvereinigung Bausoftware) v2.0, Donatı Veri Aktarım Formatı'],
    review: {
      reviewedOn: '2026-11-06',
      method: 'yuksek-muhendis-mimar skill ve eng_calc.py donati_agirlik ile çapraz hesap',
      sources: ['Skill referansı: metraj-olcu-esaslari.md (nominal kütle, kütle toleransı)', 'Skill referansı: tbdy2018-deprem.md (kolon ve kiriş sıklaştırma)'],
      note: 'Teknik ön değerlendirmedir; proje uygulamasında yetkili mühendis onayı gerekir.',
    },
  },
  {
    slug: 'ortak-veri-ortami-cde',
    topicSlug: 'bim-temelleri',
    moduleTitle: 'Ortak veri ortamı (CDE) ve bilgi durumları',
    title: 'Ortak veri ortamı (CDE): bilgi durumları ve uygunluk kodları',
    summary: 'ISO 19650-2 kapsamında bir bilgi konteynerinin CDE içindeki dört durumunu (WIP, Shared, Published, Archived), uygunluk kodlarını (S0–S4, A1–A4) ve revizyon izinin ihale ile hakedişte neden zorunlu olduğunu anlatır.',
    rule: 'İhale ve hakediş hesabına yalnızca Published (Yayımlanan) durumundaki bilgi konteynerleri esas alınabilir. P revizyonu (Preliminary) taşıyan hiçbir model kesin hakedişe bağlanamaz; yalnızca C revizyonuna (Contractual) geçmiş ve A1–A4 uygunluk kodu almış modeller kesin hesaba alınır.',
    table: {
      title: 'CDE durum ve uygunluk kodu tablosu (ISO 19650-2 NA)',
      headers: ['CDE Durumu', 'Uygunluk Kodu', 'Kullanım Amacı', 'Revizyon Biçimi', 'Metraj / Hakedişte Kullanım'],
      rows: [
        ['WIP (Çalışma)', 'S0', 'Disiplin içi taslak; dış paylaşıma kapalı', 'P01.01, P01.02', 'Kullanılamaz'],
        ['Shared (Paylaşılan)', 'S1', 'Disiplinlerarası koordinasyon ve çakışma kontrolü', 'P01, P02', 'Ön keşif / yaklaşık tahmin (şerhli)'],
        ['Shared (Paylaşılan)', 'S2', 'Bilgi amaçlı paylaşım', 'P01, P02', 'Kullanılamaz'],
        ['Shared (Paylaşılan)', 'S3', 'İç inceleme ve teknik ofis kontrolü', 'P02, P03', 'SmartCheck ön denetim'],
        ['Shared (Paylaşılan)', 'S4', 'İdare / işveren kabul onayına sunulan paket', 'P03, P04', 'İhale teklif hazırlığı'],
        ['Published (Yayımlanan)', 'A1–A4', 'Sözleşmeye, imalata ve hakedişe esas onaylı teslim', 'C01, C02', 'Resmî metraj ve hakedişe esas'],
        ['Archived (Arşiv)', 'Geçmiş kodlar', 'Hukuki kanıt, denetim izi ve revizyon fark analizi', 'Salt okunur (SHA-256)', 'Yalnızca revizyon fark (delta) kontrolü'],
      ],
    },
    takeaways: [
      'Bir bilgi konteyneri Published durumundan tekrar WIP’e geri çekilemez; değişiklik gerekiyorsa yeni bir P revizyonu açılır, eski C01 sürümü Archived alanda korunur.',
      'Her durum geçişinde dosyanın SHA-256 özeti, onaylayan kişinin kimliği ve zaman damgası kaydedilir; bu kayıt olmadan hangi modelin hakedişe esas alındığı kanıtlanamaz.',
      'Farklı disiplinlerin farklı CDE durumundaki modellerini karıştırmak en yaygın metraj hata kaynağıdır; sözleşmede hangi uygunluk kodunun hakedişe bağlanacağı açıkça belirtilir.',
    ],
    example: 'Teknik ofis mühendisi ihale teklifini Shared (S1) klasöründeki P02 mimari modeli üzerinden hazırlar. Pazartesi sabahı mimari ekip kaplama tiplerini güncelleyip C01 (Published (A1)) olarak yayımlar. Teklif cetvelinde kullanılan modelin CDE durumu ve SHA-256 özeti kayıtlı değilse, ihale sonrası ortaya çıkan granit kaplama farkının hangi sürümden kaynaklandığı kanıtlanamaz.',
    sources: ['BS EN ISO 19650-1:2018 Madde 12 (Ortak Veri Ortamı)', 'BS EN ISO 19650-2:2018 Madde 5.1.7', 'UK BIM Framework Guidance Part C'],
  },
  {
    slug: 'ids-ve-bsdd-otomatik-denetim',
    topicSlug: 'openbim',
    moduleTitle: 'IDS ve bSDD ile otomatik model denetimi',
    title: 'IDS 1.0 ve bSDD ile Otomatik Model Denetimi',
    summary: 'buildingSMART IDS 1.0 (Information Delivery Specification) ile IFC modellerini XML kural dosyalarına göre otomatik denetleyin; bSDD URI sistemiyle farklı yazılımlardan gelen özellik adlarını standart bir dile kavuşturun.',
    table: {
      title: 'IDS 1.0 Facet Türleri',
      headers: ['Facet Türü', 'Ne Denetler', 'Örnek Kural'],
      rows: [
        ['entity', 'Eleman sınıfı ve PredefinedType', 'IfcSlab ile PredefinedType=FLOOR'],
        ['attribute', 'IFC Attribute alanı (Name, Description...)', 'Name bos olamaz'],
        ['property', 'Pset içindeki özellik ve degeri', 'Pset_WallCommon.IsExternal=TRUE'],
        ['material', 'Material layer veya constituent adi', 'C30/37 Beton içermelidir'],
        ['classification', 'Uniclass, OmniClass veya bSDD sınıfı', 'Uniclass EF_25_10_25 Columns'],
        ['partOf', 'Ilişki hiyerarşisi (ContainedIn)', 'IfcSlab bir IfcBuildingStorey içinde olmalidir'],
      ],
    },
    takeaways: [
      'IDS kural dosyası: applicability (kapsam) ve requirements (gereksinim) ana bölümlerinden oluşur',
      'bSDD URI sistemi, farklı BIM yazılımlarından gelen özellik adlarını tek bir tanımlayıcıyla çözümler',
      '6 Facet türünün tamamı XML içinde iç içe geçebilir; birden fazla Facet AND mantığıyla çalışır',
      'IfcTester (Python) veya online buildingSMART IDS doğrulayıcısıyla IFC dosyası kural dosyasına karşı test edilir',
    ],
    example: 'Bir altyapı projesinde IDS kural dosyası şu koşulu tanımlar: IfcSlab sınıfının PredefinedType=FLOOR olan tüm elemanlarında Qto_SlabBaseQuantities özellik seti ve NetVolume değeri dolu olmalıdır. Model kontrol aracı, 847 döşemeden 23 tanesinin Qto verisini içermediğini tespit eder. Modeli düzelten ekip, 23 pozda otomatik metraj farkını kapatır.',
    sources: [
      'buildingSMART IDS 1.0 User Manual (github.com/buildingSMART/IDS)',
      'buildingSMART Data Dictionary bSDD (search.bsdd.buildingsmart.org)',
      'BS EN 17412-1:2020 (LOIN - Level of Information Need)',
      'IfcOpenShell IfcTester API (docs.ifcopenshell.org)',
    ],
  },
  {
    slug: 'ifc-4-3-altyapi-kopru-yol-metraji',
    topicSlug: '4d-5d-maliyet',
    moduleTitle: 'IFC 4.3 altyapı: köprü, yol ve demiryolu metrajı',
    title: 'IFC 4.3 Altyapı: Köprü, Yol ve Demiryolu Metrajı',
    summary: 'ISO 16739-1:2024 (IFC 4.3) standardındaki IfcBridge, IfcRoad ve IfcRailway sınıflarıyla köprü, karayolu ve demiryolu projelerinde standardize 5D metraj yapın; kazı/dolgu hacimleri için Qto_EarthworksCutBaseQuantities ve Qto_EarthworksFillBaseQuantities kullanın.',
    table: {
      title: 'IFC 4.3 Altyapı Sınıfları ve Metraj Setleri',
      headers: ['IFC 4.3 Sınıfı', 'Alt Tip (PredefinedType)', 'Temel Metraj Qto Seti', 'Kullanim'],
      rows: [
        ['IfcBridge', 'ABUTMENT, PIER, FOUNDATION, DECK, SUPERSTRUCTURE', 'Qto_BuildingElementBaseQuantities', 'Köprü ayak ve tabliye beton metrajı'],
        ['IfcRoad', 'CARRIAGEWAY, SHOULDER, MEDIAN, TRAFFICLANE', 'Qto_PavementBaseQuantities', 'Plentmiks temel ve BSK kaplama metrajı'],
        ['IfcRailway', 'TRACKSTRUCTURE, SUBSTRUCTURE, FRANCHISEZONE', 'Qto_TrackBaseQuantities', 'Ray, travers ve balast metrajı'],
        ['IfcAlignment', 'HORIZONTAL, VERTICAL, CANT', '(Referans ekseni; metraj içermez)', 'Kilometraj bazlı hakediş referansı'],
        ['IfcEarthworksCut', 'REMOVAL, DRAINAGE, TRENCH, EMBANKMENT', 'Qto_EarthworksCutBaseQuantities', 'Doğal (UndisturbedVolume) ve kabarmış (ExpandedVolume) kazı'],
        ['IfcEarthworksFill', 'SUBGRADE, STRUCTURAL, NONSTRUCTURAL', 'Qto_EarthworksFillBaseQuantities', 'Sıkıştırılmış (CompactedVolume) dolgu hacmi'],
      ],
    },
    calculation: {
      title: 'Kabarma Faktörü ve Kamyon Sefer Sayısı',
      inputs: { UDISTURBED: 1250, FK: 1.28, KAPASITE: 18 },
      results: [
        { label: 'EXPANDED', formula: 'UDISTURBED × FK', value: 1600 },
        { label: 'SEFER', formula: 'EXPANDED ÷ KAPASITE', value: 88.89 },
      ],
      note: 'UDISTURBED: dogal (dokunulmamis) kazı hacmi m³, FK: kabarma faktörü (killi zemin 1.25-1.35), KAPASITE: kamyon kasasi kapasitesi m³, SEFER: nakliye sefer sayısı (yukarı yuvarlanır).',
    },
    takeaways: [
      'IfcAlignment, bina projelerindeki "kat" kavramının altyapı karşılığıdır; tüm metraj elemanları buna bağlanır',
      'IfcReferent ile KM 12+450.00 gibi kilometraj noktaları modelde tutulur ve yeşil deftere yansıtılır',
      'Kazı hakedişinde UndisturbedVolume (dogal hacim) esas alınır; ExpandedVolume yalnızca kamyon sefer hesabı içindir',
      'IfcBridge yapılarında PIER ve ABUTMENT bazlı ayrı IfcBridgePart tanımı, kısım bazlı hakediş izlemeye olanak verir',
    ],
    example: 'Bir köprü projesinde iki orta ayak (PIER) ve iki kenar ayak (ABUTMENT) için kazı hakedişi hazırlanmaktadır. IfcEarthworksCut elemanlarından Qto_EarthworksCutBaseQuantities okumasıyla toplam UndisturbedVolume 1250 m³ elde edilir. Kabarma faktörü 1.28 uygulanınca nakliye hacmi 1600 m³ olur ve 18 m³ kapasiteli kamyon için 89 sefer gerekir.',
    sources: [
      'ISO 16739-1:2024 (IFC 4.3 - buildingsmart.org/standards)',
      'buildingSMART Qto_EarthworksCutBaseQuantities (ifc43.buildingsmart.org)',
      'buildingSMART Qto_EarthworksFillBaseQuantities (ifc43.buildingsmart.org)',
      'T.C. ÇŞİDB BIM Entegrasyonu Çalıştay Raporu (webdosya.csb.gov.tr)',
    ],
    review: { reviewedOn: '2026-11-07', method: 'yuksek-muhendis-mimar', sources: ['ISO 16739-1:2024 (IFC 4.3 - buildingsmart.org/standards)', 'T.C. ÇŞİDB BIM Entegrasyonu Çalıştay Raporu (webdosya.csb.gov.tr)'], note: 'Kabarma faktörü ve sefer sayısı hesabı buildingSMART Qto_EarthworksCutBaseQuantities ve ÇŞİDB çalıştay raporuyla çapraz teyit edilmiştir.' },
  },
  {
    slug: 'cobie-2-4-ve-7d-tesis-yonetimi',
    topicSlug: 'bim-temelleri',
    moduleTitle: 'Teslimden işletmeye: PIM, AIM ve COBie',
    title: 'COBie 2.4 ve 7D Tesis Yönetimi',
    summary: 'BS 1192-4 / ISO 19650-3 COBie 2.4 standardıyla IFC modelinden garanti, bakım ve yedek parça verilerini 18 çalışma sayfasına veya IFC Basic FM Handover MVD formatına aktarın; Pset_Warranty ve Pset_ManufacturerTypeInformation ile MEP ekipmanlarını doğru modelleyin.',
    table: {
      title: 'COBie 2.4 Sekmeleri ve IFC Karşılıkları',
      headers: ['COBie Sekmesi', 'IFC Karşılığı', 'Zorunlu Alanlar', 'Teslim Noktası'],
      rows: [
        ['Contact', 'IfcActor / IfcPersonAndOrganization', 'Email (Birincil Anahtar), Company, Phone', 'Tüm Aşamalar'],
        ['Facility', 'IfcBuilding / IfcFacility', 'Name, ProjectName, SiteName, AreaUnits', 'DD1 (Konsept)'],
        ['Floor', 'IfcBuildingStorey', 'Name, Elevation, Height, Category', 'DD1/DD2'],
        ['Space', 'IfcSpace', 'Name (Oda No), FloorName, GrossArea, NetArea', 'DD2 (Kesin Proje)'],
        ['Type', 'IfcTypeProduct', 'Pset_ManufacturerTypeInformation, Pset_Warranty, ExpectedLife', 'DD3/DD4'],
        ['Component', 'IfcElement', 'SerialNumber, InstallationDate, WarrantyStartDate, BarCode', 'DD4 (As-Built)'],
        ['Spare', 'IfcConstructionProductResource', 'TypeName, Suppliers, PartNumber', 'DD4 (Teslim Öncesi)'],
        ['Job', 'IfcTask (Bakim Görevi)', 'Duration, Frequency, TaskStartUnit', 'DD4 (Teslim Öncesi)'],
      ],
    },
    takeaways: [
      'COBie kapsamı yalnızca bakıma tabi bileşenleri içerir; IfcColumn, IfcBeam ve IfcFooting gibi kaba yapı elemanları bilerek hariç tutulur',
      'Pset_Warranty alanları: WarrantyIdentifier, WarrantyStartDate, WarrantyEndDate, IsExtendedWarranty, WarrantyPeriod, WarrantyContent, PointOfContact, Exclusions',
      'Pset_ManufacturerTypeInformation alanları: GlobalTradeItemNumber (GTIN), ArticleNumber, ModelReference, Manufacturer, ProductionYear, AssemblyPlace',
      'AIM (Asset Information Model), PIM modelinin geçici kabul sonrası COBie verileriyle birleştirilmiş işletme halidir',
    ],
    example: 'Bir ofis binasının klima santrallerine (AHU) ait veriler modellenmektedir. Her IfcUnitaryEquipment elemanının tipine Pset_ManufacturerTypeInformation (Manufacturer, ModelNumber, GTIN) ve Pset_Warranty (2 yıl parça garantisi, 1 yıl işçilik) atanır. COBie dışa aktarımında Type sekmesi otomatik dolar, bakım yönetim yazılımına (CMMS) aktarılabilir hale gelir.',
    sources: [
      'BS 1192-4:2014 / PAS 1192-4:2014 (COBie - BSI British Standards)',
      'ISO 19650-3:2020 (Information management - Operational phase)',
      'buildingSMART Pset_Warranty (ifc43.buildingsmart.org)',
      'buildingSMART Pset_ManufacturerTypeInformation (ifc43.buildingsmart.org)',
      'UK BIM Framework Guidance Part C (ukbimframework.org)',
    ],
  },
  {
    slug: 'kamu-ihale-4734-4735-ve-bim-hakedis',
    topicSlug: '4d-5d-maliyet',
    moduleTitle: '4734 / 4735 kamu ihale ve e-PYS hakediş protokolü',
    title: '4734/4735 Kamu İhale Mevzuatı ve 5D BIM Hakediş Protokolü',
    summary: '4734 sayılı Kamu İhale Kanunu ve 4735 sayılı Kamu İhale Sözleşmeleri Kanunu kapsamındaki üç sözleşme tipinde (Götürü Bedel, Birim Fiyat, Karma) 5D BIM modelinin hakediş belgelerine (Yeşil Defter, Ataşman, Pursantaj, Mukayeseli Keşif) dönüştürülmesi; RG 33331 e-PYS zorunlu takvimi.',
    table: {
      title: 'Kamu İhale Sözleşme Türleri ve 5D BIM Hakediş Rolü',
      headers: ['Sözleşme Türü', '5D BIM Rolü', 'Hakediş Ödeme Esası'],
      rows: [
        ['Anahtar Teslimi Götürü Bedel', 'Pursantaj tablosu ve Mukayeseli Keşif (iki IFC revizyonu arasındaki Qto farkı)', 'İlerleme yüzdesi (Pursantaj) × tamamlanan IfcTask oranı'],
        ['Teklif Birim Fiyat', 'GlobalId bazlı Yeşil Defter ve Ataşman üretimi', 'Net imalat miktarı × sözleşme birim fiyatı'],
        ['Karma', 'Altyapıda birim fiyat hakedişi; üstyapıda pursantaj takibi', 'Karma ödeme (Birim fiyat + Pursantaj)'],
      ],
    },
    rule: 'e-PYS Zorunlu Takvim (RG 33331, 5 Agustos 2026): 1 Eylul 2027 - kamu binalari, AVM, hastaneler, oteller ve 10.000 m² uzeri projeler; 1 Eylul 2028 - tum yeni yapi ruhsati basvurulari. Model tesliminde IfcSpace ogeleri Qto_SpaceBaseQuantities (GrossFloorArea, NetFloorArea, ClearHeight) dolu olmalidir; tasiyici elemanlar dogru sinifta modellenmelidir.',
    takeaways: [
      'Yaklaşık Maliyet cetveli IfcCostSchedule (PredefinedType=ESTIMATE), Birim Fiyat Cetveli ise IfcCostSchedule (PRICEDBILLOFQUANTITIES) olarak temsil edilir',
      'Metraj İcmali (Yeşil Defter) IfcRelAssignsToControl ilişkisiyle IfcCostItem altındaki tüm IFC elemanlarının GUID bazlı dökümüdür',
      'Ataşman, BCF Viewpoint ile 3B model üzerinde koordinatlı görünüm ve boyut doğrulamasına dönüştürülür',
      'Mukayeseli Keşif, iki IFC revizyon tarihi arasındaki GUID bazlı fark analiziyle otomatik üretilir',
    ],
    example: 'Bir kamu hastanesi inşaatında birim fiyat sözleşmesiyle çalışılmaktadır. 3. hakediş döneminde zemin kat kolonlarının IfcColumn GUID listesi, Qto_ColumnBaseQuantities netvolume ve beton sınıfıyla birlikte hakediş sistemine iletilir. Sistem, GlobalId eşleştirmesiyle Yeşil Defter ve Ataşman krokileri otomatik üretir; yapı denetçisi imzalayarak hakediş onaylanır.',
    sources: [
      '4734 sayılı Kamu İhale Kanunu (mevzuat.gov.tr)',
      '4735 sayılı Kamu İhale Sözleşmeleri Kanunu (mevzuat.gov.tr)',
      'Yapım İşleri Genel Şartnamesi (YİGŞ - ÇŞİDB)',
      'RG 33331 - 5 Agustos 2026 (Planlı Alanlar İmar Yönetmeliği e-PYS değişiklikleri)',
      'T.C. ÇŞİDB BIM Entegrasyonu Çalıştay Raporu (webdosya.csb.gov.tr)',
      'IfcOpenShell 5D Cost API (docs.ifcopenshell.org)',
    ],
    review: { reviewedOn: '2026-11-07', method: 'yuksek-muhendis-mimar', sources: ['RG 33331 - 5 Agustos 2026 (Resmî Gazete)', '4734 sayılı Kamu İhale Kanunu (mevzuat.gov.tr)'], note: 'e-PYS takvim tarihleri RG 33331 metninden alınmıştır; sözleşme türü-BIM rolü eşleştirmesi 4734/4735 kanun maddeleri ve IfcOpenShell 5D Cost API ile çapraz teyit edilmiştir.' },
  },
];

export function findAcademyGuide(topicSlug: string | undefined, guideSlug: string | undefined): AcademyGuide | undefined {
  if (!topicSlug || !guideSlug) return undefined;
  return ACADEMY_GUIDES.find(guide => guide.topicSlug === topicSlug && guide.slug === guideSlug);
}

export function guidesForModule(topicSlug: string, moduleTitle: string): AcademyGuide[] {
  return ACADEMY_GUIDES.filter(guide => guide.topicSlug === topicSlug && guide.moduleTitle === moduleTitle);
}
