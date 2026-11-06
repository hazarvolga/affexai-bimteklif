/**
 * Academy phase 2, package 1 (Hazar, 2026-11-06): detailed guides, each on its own page at
 * /academy/{topic}/{guide}. Rewritten from the old side-panel data (src/academy/subGuidesData.ts,
 * left untouched) under the same rules as the topics: no software brands, no unreviewed figures,
 * formulas as plain text, a BIMMetraj note only for a live or pilot capability.
 * Guides with figures (minha, carbon factors, LOA tolerances, rebar) wait for package 3.
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
];

export function findAcademyGuide(topicSlug: string | undefined, guideSlug: string | undefined): AcademyGuide | undefined {
  if (!topicSlug || !guideSlug) return undefined;
  return ACADEMY_GUIDES.find(guide => guide.topicSlug === topicSlug && guide.slug === guideSlug);
}

export function guidesForModule(topicSlug: string, moduleTitle: string): AcademyGuide[] {
  return ACADEMY_GUIDES.filter(guide => guide.topicSlug === topicSlug && guide.moduleTitle === moduleTitle);
}
