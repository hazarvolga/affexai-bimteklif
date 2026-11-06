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
      title: 'IFC mekânsal yapısı',
      headers: ['Seviye', 'IFC sınıfı', 'Bağlayan ilişki'],
      rows: [
        ['Proje', 'IfcProject', 'IfcRelAggregates'],
        ['Arsa', 'IfcSite', 'IfcRelAggregates'],
        ['Bina', 'IfcBuilding', 'IfcRelAggregates'],
        ['Kat', 'IfcBuildingStorey', 'IfcRelContainedInSpatialStructure'],
        ['Eleman ve malzeme', 'IfcColumn, IfcBeam, IfcSlab', 'IfcRelAssociatesMaterial'],
      ],
    },
    takeaways: [
      'Bir elemanın hangi katta olduğu bir özellik değil, IfcRelContainedInSpatialStructure ilişkisidir.',
      'İlişkiler eksikse kat bazında metraj ve sorgu güvenilir olmaz.',
      'Sınıflandırma ve özellik adları için ortak sözlükler (bSDD) kullanılır.',
    ],
    example: 'Bir karma projede kolonların kat ilişkisi doğru kurulduğu için betonarme metrajı kat kat ayrıştırılabilir. İlişkisi eksik kolonlar ise hiçbir kata düşmez ve listede ayrıca görünür.',
    sources: ['IFC4 mekânsal yapı', 'buildingSMART Data Dictionary (bSDD)', 'ISO 12006-2'],
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
      title: 'EN 15978 yaşam döngüsü modülleri',
      headers: ['Aşama', 'Modüller', 'Kapsam', 'Veri kaynağı'],
      rows: [
        ['Ürün', 'A1–A3', 'Ham madde, nakliye ve fabrika üretimi', 'Üretici çevresel ürün beyanı (EPD)'],
        ['İnşaat', 'A4–A5', 'Şantiyeye taşıma ve montaj', 'Şantiye lojistik verisi'],
        ['Kullanım', 'B1–B7', 'Kullanım, bakım, onarım, yenileme, işletme enerjisi ve suyu', 'İşletme projeksiyonu'],
        ['Ömür sonu', 'C1–C4', 'Yıkım, söküm, atık taşıma ve bertaraf', 'Atık yönetim planı'],
        ['Sistem sınırı dışı', 'D', 'Yeniden kullanım, geri dönüşüm ve enerji kazanımı', 'Ayrı beyan'],
      ],
    },
    takeaways: [
      'Miktarlar modelden, etki katsayıları EPD’lerden gelir; ikisinin kaynağı ayrı ayrı belgelenir.',
      'EPD’si olmayan ürünler için genel veri tabanı değerleri kullanılır ve bu durum raporda belirtilir.',
      'Sökülebilir tasarım, modül D’deki kazancı artırır.',
    ],
    example: 'Bir ofis binasında iki taşıyıcı sistem seçeneği karşılaştırılır. Her seçenek için model miktarları aynı EPD veri setiyle çarpılır; karşılaştırma aynı sistem sınırında yapıldığı için sonuç anlamlıdır.',
    sources: ['EN 15978', 'ISO 14040 / 14044', 'EN 15804 (EPD kuralları)'],
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
    title: 'e-Ruhsat ve imar kural denetimi',
    summary: 'IFC modelinin imar kurallarına göre otomatik ön kontrolden nasıl geçirildiğini ve bu kontrolün sınırlarını anlatır.',
    rule: 'TAKS = taban alanı ÷ parsel alanı. KAKS (emsal) = emsale dahil kat alanları toplamı ÷ parsel alanı. Hangi alanların emsale dahil olduğu yönetmelikte tanımlıdır.',
    table: {
      title: 'Kural, modeldeki karşılığı ve onay',
      headers: ['Kural', 'Modelde kontrol edilen', 'Son karar'],
      rows: [
        ['TAKS', 'Bina oturum alanı ve parsel sınırı', 'Yetkili mimar'],
        ['KAKS (emsal)', 'Emsale dahil kat alanları', 'Yetkili mimar'],
        ['Çekme mesafeleri', 'Bina dış yüzü ile parsel sınırı arası', 'Yetkili mimar'],
        ['Yangın kaçış yolu', 'Mahalden çıkışa olan yol ve kapılar', 'Mimar ve yangın danışmanı'],
      ],
    },
    takeaways: [
      'Kural denetimi için model parsel koordinatlarına doğru oturtulmalıdır.',
      'Otomatik kontrol zaman kazandırır; ruhsatta yetkili mimarın onayı esastır.',
      'Plan notları ve yerel imar kararları genel yönetmeliğin önüne geçebilir.',
    ],
    example: 'Bir konut projesinde ön çekme mesafesindeki ihlal, otomatik kontrolde ruhsat başvurusundan önce görülür ve proje başvuru yapılmadan düzeltilir.',
    sources: ['Planlı Alanlar İmar Yönetmeliği', 'Binaların Yangından Korunması Hakkında Yönetmelik', 'RG 33331 e-PYS'],
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
      title: 'EN 17412-1 bilgi başlıkları',
      headers: ['Bilgi türü', 'Tanımlanan özellikler', 'Örnek soru'],
      rows: [
        ['Geometrik bilgi', 'Ayrıntı, boyutluluk, konum, görünüm, parametrik davranış', 'Kolon gerçek kesitiyle mi, sembolik mi modellenecek?'],
        ['Alfanümerik bilgi', 'Tanımlama ve bilgi içeriği', 'Hangi özellikler zorunlu: malzeme, poz numarası, yangın dayanımı?'],
        ['Belgeler', 'Teslim edilecek belge türleri', 'Teknik föy, test raporu veya garanti belgesi istenecek mi?'],
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
    summary: 'IFC elemanlarının benzersiz kimliğiyle iş programındaki görevlerin nasıl eşleştirildiğini ve 4D simülasyonun neleri göstermesi gerektiğini anlatır.',
    rule: 'IFC elemanının GlobalId değeri (22 karakterlik benzersiz kimlik) ↔ iş programındaki görev kodu. Eşleşme ad üzerinden değil kimlik üzerinden yapılır.',
    table: {
      title: 'Örnek eşleşme',
      headers: ['İş kırılım kodu', 'Görev', 'Eşleşen elemanlar'],
      rows: [
        ['01', 'Kazı ve hafriyat', 'Arsa ve kazı elemanları'],
        ['02', 'Temel betonarmesi', 'Temel döşemeleri'],
        ['03', 'Bodrum kolon ve perdeleri', 'Bodrum kattaki kolon ve perde duvarlar'],
        ['04', 'Kaba inşaat kapanışı', 'Tüm taşıyıcı elemanlar'],
      ],
    },
    takeaways: [
      'Eşleşme için elemanlarda iş kırılım kodunu taşıyan bir özellik bulunur; elle eşleştirme hataya açıktır.',
      'Model güncellendiğinde kimliği korunan elemanlar eşleşmesini kaybetmez.',
      '4D simülasyon kule vinç, iskele ve geçici yapıları da kapsamalıdır.',
    ],
    example: 'Bir köprü inşaatında ayakların beton dökümleri iş programıyla eşleştirilir. Simülasyon, bir ayağın dökümünün vinç başka bir işte meşgulken planlandığını gösterir ve program şantiye başlamadan düzeltilir.',
    sources: ['IFC4 (IfcGloballyUniqueId)', 'ISO 19650-2', 'Kazanılmış değer ve iş programı entegrasyonu'],
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
    summary: 'Farklı yazılımlarla çalışan ekiplerin IFC ile model, BCF ile sorun bilgisini nasıl paylaştığını anlatır.',
    rule: 'BCF kaydı = ilgili elemanların kimliği + kamera görünümü + açıklama + sorumlu + durum. Modelin kendisi kayıtla birlikte gönderilmez.',
    table: {
      title: 'Bir BCF kaydının yaşam döngüsü',
      headers: ['Adım', 'Durum', 'Sorumlu', 'Ne olur'],
      rows: [
        ['Tespit', 'Açık', 'Koordinatör', 'Sorun modelde işaretlenir ve kayıt oluşturulur'],
        ['Atama', 'Atandı', 'İlgili disiplin', 'Kayıt kendi yazılımında aynı görünümle açılır'],
        ['Düzeltme', 'Çözüldü', 'İlgili disiplin', 'Model düzeltilir ve kayıt güncellenir'],
        ['Kontrol', 'Kapandı', 'Koordinatör', 'Düzeltme kontrol edilir ve kayıt kapatılır'],
      ],
    },
    takeaways: [
      'IFC modelin ortak dilidir; BCF ise model üzerindeki konuşmanın ortak dilidir.',
      'Kayıt, sorunu gördüğü kamera açısıyla taşıdığı için alıcı doğrudan doğru yere gider.',
      'Durum adları projede ortak tanımlanır ve BEP’e yazılır.',
    ],
    example: 'Mimari, statik ve mekanik ekipler farklı yazılımlarla çalışır. Koordinatör birleşik IFC modelinde bulduğu sorunları BCF kaydıyla dağıtır; her ekip kaydı kendi yazılımında açar, düzeltir ve durumunu günceller.',
    sources: ['ISO 16739-1 (IFC)', 'buildingSMART BCF'],
  },
  // Package 3 (Rev. 165): figures reviewed with the yuksek-muhendis-mimar skill on 2026-11-06.
  {
    slug: 'minha-kurallari',
    topicSlug: '4d-5d-maliyet',
    moduleTitle: 'Metraj kuralları ve boşluk düşümü',
    title: 'Boşluk düşümü (minha): ÇŞB 2026 ve DIN 18350',
    summary: 'Aynı duvardan farklı ölçü kurallarıyla neden farklı miktar çıktığını, ÇŞB 2026 analizlerinin ölçü maddeleri ve DIN 18350 üzerinden bir örnekle anlatır.',
    rule: 'ÇŞB 2026: sıva, boya ve kaplamada boşluk boyutuna bakılmaksızın düşülür, boşluk yanları (iç dişler) eklenir. DIN 18350: tekil alanı 2,5 m²’ye kadar olan boşluklar düşülmez, yanları da eklenmez.',
    table: {
      title: 'İş türüne göre düşülen en küçük boşluk',
      headers: ['İş türü', 'ÇŞB 2026 analizi', 'Poz', 'DIN 18350 (sıva)'],
      rows: [
        ['Sıva, boya, kaplama', 'Tüm boşluklar düşülür, yanlar eklenir', '15.275, 15.280, 15.285, 15.540', '2,5 m²’ye kadar düşülmez, yanlar eklenmez'],
        ['Duvar', '0,10 m² ve üstü düşülür', '15.220–15.240', 'Kapsam dışı'],
        ['Alçı levha', '0,50 m² ve üstü düşülür', '15.530', 'Kapsam dışı'],
        ['Asma tavan', '0,25 m² ve üstü düşülür', '15.535', 'Kapsam dışı'],
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
      'Hangi ölçü kuralının uygulandığı teklifte ve hakedişte açıkça yazılır.',
      '"Küçük boşluklar düşülmez" kuralı ÇŞB’nin sıva ve boya analizlerinde yoktur; piyasadaki yaygın bir yanlıştır.',
      'Örnekte tekil pencere alanı 2,24 m² olduğundan DIN 18350’ye göre düşülmez; iki kural arasında yaklaşık 2,2 m² fark çıkar.',
    ],
    example: 'Yurt dışındaki bir işte taşeron, alışkanlıkla ÇŞB mantığıyla ölçüm yapar ve küçük pencereleri metrajdan düşer. Sözleşme DIN 18350’ye bağlı olduğu için bu pencereler aslında ölçüye dahildir; fark hakedişte ortaya çıkar.',
    sources: ['ÇŞB 2026 İnşaat Birim Fiyat Analizleri, ölçü maddeleri', 'VOB/C DIN 18350 (sıva ve alçı işleri)'],
    review: {
      reviewedOn: '2026-11-06',
      method: 'yuksek-muhendis-mimar skill ve eng_calc.py siva_boya_alani ile çapraz hesap',
      sources: ['src/smartcheck/rules/minha.ts (Rev. 150, ÇŞB 2026 analiz ölçü maddeleri)', 'Skill referansı: metraj-olcu-esaslari.md §4'],
      note: 'ÇŞB eşikleri 2026 analizlerinin ölçü maddelerinden alınmıştır; 15.275 ve 15.380 için uzman görüşü sürmektedir.',
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
    takeaways: [
      'Gömülü karbon bina tamamlandığında kesinleşir; azaltma fırsatı tasarım ve tedarik aşamasındadır.',
      'Katsayının kaynağı ve tarihi her kalem için kayda alınır.',
      'Farklı seçenekler aynı veri seti ve aynı sistem sınırıyla karşılaştırılır.',
    ],
    example: 'Bir köprü projesinde iki beton karışımı karşılaştırılır. Tedarikçilerin ürüne özel EPD’leri kullanılır; hesap, model miktarlarıyla her iki karışım için ayrı yapılır ve karar gerekçesiyle kayda alınır.',
    sources: ['EN 15978', 'EN 15804', 'ISO 16745-1', 'PAS 2080'],
  },
  {
    slug: 'loa-seviyeleri',
    topicSlug: 'scan-to-bim',
    moduleTitle: 'Doğruluk seviyeleri (LOA)',
    title: 'Doğruluk seviyeleri (LOA)',
    summary: 'USIBD’nin LOA seviyelerinin hangi doğruluk aralıklarını tanımladığını ve projede seviyenin nasıl seçildiğini anlatır.',
    rule: 'Her LOA seviyesi bir doğruluk aralığıdır ve yüzde doksan beş güven düzeyinde sağlanır. Ölçüm (tarama) ve modelleme için seviye ayrı ayrı belirtilebilir.',
    table: {
      title: 'LOA seviyeleri',
      headers: ['Seviye', 'Doğruluk aralığı', 'Tipik kullanım'],
      rows: [
        ['LOA10', 'Kullanıcı tanımlı, 50 mm’den kaba', 'Kavramsal kütle ve erken karar'],
        ['LOA20', '50 mm ile 15 mm arası', 'Genel geometri ve kaba kontroller'],
        ['LOA30', '15 mm ile 5 mm arası', 'Mimari ve tesisat koordinasyonu'],
        ['LOA40', '5 mm ile 1 mm arası', 'Prefabrik birleşimler ve hassas kontroller'],
        ['LOA50', '1 mm ile 0 arası', 'Restorasyon ve hassas rölöve'],
      ],
    },
    takeaways: [
      'Seviye, modelin hangi kararı destekleyeceğine göre seçilir; daha yüksek seviye daha pahalıdır.',
      'Sözleşmede seviye, güven düzeyi ve teslim edilecek doğruluk raporu yazılır.',
      'Seviye aynı proje içinde eleman türüne göre farklı olabilir.',
    ],
    example: 'Tarihi bir hamamın restorasyonunda kubbe ve kemerler için en yüksek seviye istenir; avlu ve yardımcı mekânlar için daha düşük bir seviye yeterli görülür. Bu ayrım tarama süresini ve maliyeti düşürür.',
    sources: ['USIBD Level of Accuracy (LOA) Specification'],
    review: {
      reviewedOn: '2026-11-06',
      method: 'yuksek-muhendis-mimar skill; aralıklar iki bağımsız ikincil kaynakla karşılaştırıldı',
      sources: ['USIBD LOA Specification (aralıklar ve yüzde doksan beş güven düzeyi)', 'Techture LOA bilgi notu', 'NavVis: industry standards are only one piece of the puzzle'],
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
    title: 'Donatı detayı: kütle, tolerans ve sıklaştırma',
    summary: 'Donatı metrajında kullanılan nominal kütlenin nasıl hesaplandığını, kütle toleransını ve TBDY 2018’in sıklaştırma kurallarını anlatır.',
    rule: 'Nominal kütle (kg/m) = π × d² ÷ 4 × çelik yoğunluğu ≈ 0,006165 × d² (d mm). Hakedişte nominal kütle kullanılır; fire maliyete ayrıca eklenir.',
    table: {
      title: 'TBDY 2018 sıklaştırma bölgesinde etriye aralığı',
      headers: ['Eleman', 'Bölge', 'Etriye aralığı en fazla'],
      rows: [
        ['Kolon (yüksek süneklik)', 'Sarılma bölgesi', 'bmin/3, 150 mm ve 6φl değerlerinin en küçüğü'],
        ['Kolon (yüksek süneklik)', 'Orta bölge', 'bmin/2, 200 mm ve 8φl değerlerinin en küçüğü'],
        ['Kiriş', 'Uçlarda 2h boyunca', 'h/4, 8φl ve 150 mm değerlerinin en küçüğü'],
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
      'Bükme ve kesim bilgisi standart bir veri biçimiyle (BVBS) üretim makinesine aktarılabilir.',
    ],
    example: 'Bir konut projesinde donatı listesi modelden çıkarılır. Metraj nominal kütleyle yapılır, fire satın alma miktarına ayrıca eklenir; sıklaştırma bölgelerindeki etriye aralıkları proje kontrolünde ayrıca işaretlenir.',
    sources: ['TS 708', 'TS EN 10080', 'TBDY 2018, bölüm 7', 'TS 500'],
    review: {
      reviewedOn: '2026-11-06',
      method: 'yuksek-muhendis-mimar skill ve eng_calc.py donati_agirlik ile çapraz hesap',
      sources: ['Skill referansı: metraj-olcu-esaslari.md (nominal kütle, kütle toleransı)', 'Skill referansı: tbdy2018-deprem.md (kolon ve kiriş sıklaştırma)'],
      note: 'Teknik ön değerlendirmedir; proje uygulamasında yetkili mühendis onayı gerekir.',
    },
  },
];

export function findAcademyGuide(topicSlug: string | undefined, guideSlug: string | undefined): AcademyGuide | undefined {
  if (!topicSlug || !guideSlug) return undefined;
  return ACADEMY_GUIDES.find(guide => guide.topicSlug === topicSlug && guide.slug === guideSlug);
}

export function guidesForModule(topicSlug: string, moduleTitle: string): AcademyGuide[] {
  return ACADEMY_GUIDES.filter(guide => guide.topicSlug === topicSlug && guide.moduleTitle === moduleTitle);
}
