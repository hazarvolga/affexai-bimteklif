/**
 * BIM ve mevzuat sözlüğünün sunucu tarafı özeti: `/bim-sozlugu` ön-render (`#prerender`) gövdesi ve DefinedTermSet JSON-LD
 * aynı listeden üretilir, böylece yapısal veri ile okunabilir metin ayrışmaz.
 */
export interface PublicGlossaryTerm {
  name: string;
  description: string;
}

export const PUBLIC_GLOSSARY_TERMS: readonly PublicGlossaryTerm[] = [
  {
    name: 'EIR (Bilgi Gereksinimleri — Exchange Information Requirements)',
    description:
      'İdarenin veya işverenin ihale/sözleşme aşamasında müteahhitten talep ettiği BIM model standartlarını, teslim formatlarını (IFC 4.3, COBie) ve veri derinliğini tanımlayan teknik şartnamedir (TS EN ISO 19650-2).',
  },
  {
    name: 'BEP (BIM Uygulama Planı — BIM Execution Plan)',
    description:
      'Yüklenici teknik ofisinin işveren EIR şartnamesine cevaben hazırladığı; modelleme yazılımlarını, koordinat sistemini, çakışma testi periyotlarını ve disiplin sorumluluklarını belirleyen uygulama planıdır.',
  },
  {
    name: 'CDE (Ortak Veri Ortamı — Common Data Environment)',
    description:
      'TS EN ISO 19650 standardına göre tüm proje paydaşlarının model, pafta ve metraj revizyonlarını WIP (Çalışılıyor), SHARED (Paylaşıldı), PUBLISHED (Yayınlandı) ve ARCHIVED (Arşiv) durum geçişleriyle yönettiği tekil doğruluk kaynağıdır.',
  },
  {
    name: 'IFC ve IFC 4.3 (Industry Foundation Classes — ISO 16739-1:2024)',
    description:
      'buildingSMART tarafından geliştirilen, farklı BIM yazılımları (Revit, Allplan, Archicad, Tekla) arasında geometri, malzeme ve metraj (QTO) verilerinin kayıpsız aktarılmasını sağlayan açık veri standardıdır. IFC 4.3 özellikle üstyapı ve altyapı projelerinde güncel açık BIM şemasıdır.',
  },
  {
    name: 'QTO (Quantity Take-Off — Otomatik Metraj Çıkarımı)',
    description:
      'IFC modelindeki yapı elemanlarının (IfcWall, IfcSlab, IfcColumn, IfcBeam, IfcCovering) hacim (NetVolume), alan (NetArea) ve uzunluk özelliklerinin Qto_*BaseQuantities ve 3B geometriden otomatik okunarak metraj cetveline dönüştürülmesidir.',
  },
  {
    name: 'LOD ve LOIN (Level of Development / Level of Information Need — EN 17412-1)',
    description:
      'Bir BIM elemanının geometrik detay (LOD 100–500) ve alfa-sayısal bilgi gereksinimi (LOIN) seviyesidir. Hakediş ve yaklaşık maliyet için en az LOD 300–350 ve LOIN aşama doğrulaması gerekir.',
  },
  {
    name: 'COBie (Construction Operations Building Information Exchange)',
    description:
      'Yapım aşamasında toplanan ekipman, mahal (IfcSpace), garanti ve bakım verilerinin tesis yönetimine (FM) devredilmesini sağlayan standart veri yapısıdır.',
  },
  {
    name: 'ÇŞB Pozu (Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Birim Fiyatları)',
    description:
      'Kamu ve özel sektör inşaat ihalelerinde imalat kalemlerini tanımlayan standart poz numaraları (örn. 15.150.1005 C25/30 beton, 15.180.1003 nervürlü çelik), ölçü kuralları ve resmî birim fiyat tarifleridir.',
  },
  {
    name: 'Minha (Boşluk ve Kesişim Düşümü)',
    description:
      'Duvar, sıva, boya ve kaplama metrajlarında kapı/pencere boşluklarının ve yapısal kesişimlerin brüt alandan düşülmesi işlemidir. ÇŞB 2026 analizlerinin ölçü maddeleri (sıva ve boyada tüm boşluklar düşülür; küçük boşluk sınırı duvarda 0,10 m², alçı levhada 0,50 m², asma tavanda 0,25 m²), DIN 18350 VOB/C (2,50 m² eşiği) veya özel şartname kurallarına göre uygulanır.',
  },
  {
    name: 'TS 500 (Betonarme Yapıların Tasarım ve Yapım Kuralları)',
    description:
      'Betonarme elemanların minimum paspayı (örtü betonu), malzeme dayanımı ve kiriş–döşeme–kolon birleşim bölgelerinde mükerrer beton hacminin düşülmesi esaslarını belirleyen Türk Standardıdır.',
  },
  {
    name: 'RG 33331 e-PYS ve EK-9 Kontrol Formu',
    description:
      '5 Ağustos 2026 tarihli Resmî Gazete (Sayı: 33331) ile yayımlanan Elektronik Proje Yönetim Sistemi kapsamında yapı ruhsatı eki BIM (IFC) modellerinin ve PDF/A paftalarının sağlaması gereken EK-1..EK-7 ve EK-9 (Tablo 9.1 Mimari 21 satır, Tablo 9.2 Diğer Disiplinler 16 satır) teknik doğrulama kriterleridir.',
  },
  {
    name: '4734 KİK m.38 ve Tebliğ m.45.1.1 Aşırı Düşük Teklif Sınır Değeri',
    description:
      'Kamu yapım ihalelerinde yaklaşık maliyet (YM) ve geçerli tekliflerden Tort1, standart sapma (σ), Tort2, C, K ve N katsayılarıyla sınır değer (SD) hesaplanması ve toplam teklifin %80\'ini oluşturan açıklama istenecek sıralı iş kalemlerinin belirlenmesi sürecidir.',
  },
  {
    name: '5D BIM (Maliyet Boyutu)',
    description:
      '3B geometri (1D–3D) ve inşaat programına (4D) ek olarak maliyet bilgisini model elemanlarına bağlayan BIM olgunluk boyutudur. Her IfcElement\'e poz numarası, birim fiyat ve metraj atanır; böylece model değiştiğinde teklif/yaklaşık maliyet otomatik güncellenir. BIMMetraj bu ilişkilendirmeyi IFC QTO ve ÇŞB poz sözlüğü aracılığıyla kurar.',
  },
  {
    name: '4D BIM (Zaman / İnşaat Programı Boyutu)',
    description:
      '3B modeldeki imalat sıralamasının Gantt veya CPM programına bağlanmasıyla oluşturulan simülasyon boyutudur. IfcTask ve IfcRelSequence ilişkileriyle hangi elemanın ne zaman inşa edileceği görselleştirilir; Synchro, Navisworks TimeLiner ve Trimble Connect bu entegrasyonu destekler.',
  },
  {
    name: 'openBIM',
    description:
      'buildingSMART International tarafından savunulan; projenin yaşam döngüsü boyunca yazılımdan bağımsız, açık standartlar (IFC, BCF, bSDD) üzerinden veri alışverişini öngören tasarım ve yapım yaklaşımıdır. Allplan, Revit, ArchiCAD ve Tekla gibi BIM araçlarından IFC formatında ihraç edilen modeller openBIM iş akışının temelidir.',
  },
  {
    name: 'BIM Olgunluk Seviyeleri (BIM Level 0–3)',
    description:
      '2011 tarihli İngiltere BIM olgunluk modelinde tanımlanan ve dünyada yaygınlaşan sınıflandırmadır: Level 0 (2B CAD, kâğıt teslim), Level 1 (3B CAD + standart kütüphane), Level 2 (federe modeller, CDE ile disiplinler arası koordinasyon, IFC teslimi), Level 3 / iBIM (tam entegrasyon, ISO 19650 uyumu). Türkiye kamu ihaleleri BIM Level 2 tabanını hedefler.',
  },
  {
    name: 'ISO 19650 (TS EN ISO 19650)',
    description:
      'Yapı varlıklarına ilişkin bilgi yönetiminin uluslararası standardıdır. Bölüm 1 kavramları, Bölüm 2 teslimat sürecini (EIR → BEP → CDE → teslim), Bölüm 3 varlık yönetimini kapsar. Türkiye\'de TS EN ISO 19650-2 ve EN 17412-1 (LOIN) birlikte uygulanmakta; e-PYS pilot kapsamında BIM teslimat gereksinimleri bu standardı referans almaktadır.',
  },
  {
    name: 'Hakediş (İş İlerleme Ödemesi)',
    description:
      'Yüklenicinin belirli dönemlerde tamamladığı imalat miktarlarını 4735 sayılı Kamu İhale Sözleşmeleri Kanunu\'na göre idareye beyan ettiği ve onay sonrasında ödeme hakkı doğuran belgedir. BIM tabanlı hakediş süreçlerinde IFC modeli üzerindeki tamamlanma yüzdeleri gerçek metrajla karşılaştırılarak hakediş cetveli oluşturulur.',
  },
  {
    name: 'Yaklaşık Maliyet (YM)',
    description:
      '4734 sayılı Kanun kapsamında ihale öncesinde idarenin hazırladığı ve gizli tutulan maliyet tahminidir. Rayiç birim fiyatlar (ÇŞB, TSE, piyasa) ve metraj cetveli kullanılarak hesaplanır; sınır değer ve aşırı düşük teklif analizlerinin temel parametresidir. BIMMetraj\'ın 5D modülü YM taslağını IFC QTO\'dan otomatik üretir.',
  },
];
