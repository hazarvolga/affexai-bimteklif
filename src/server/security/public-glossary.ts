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
  {
    name: 'IDS (Bilgi Teslim Şartnamesi — Information Delivery Specification)',
    description:
      'buildingSMART tarafından geliştirilen, bir IFC modelinde hangi elemanların hangi özellik seti (Pset), miktar (Qto), sınıflandırma ve malzemeye sahip olması gerektiğini XML formatında tanımlayan ve otomatik denetleyen standarttır. İdare veya işverenin EIR ve LOIN gereksinimlerini insan gözüyle değil, yazılım aracılığıyla saniyeler içinde doğrulamasını sağlar.',
  },
  {
    name: 'bSDD (buildingSMART Veri Sözlüğü — buildingSMART Data Dictionary)',
    description:
      'Yapı elemanları, malzeme özellikleri, sınıflandırma sistemleri ve miktar tanımları için uluslararası benzersiz URI kimlikleri sunan çevrimiçi semantik sözlük servisidir. Farklı dillerde ve yazılımlarda üretilen modellerin aynı kavramı (örn. yangın dayanımı veya C30/37 beton) aynı kodla ifade etmesini sağlar.',
  },
  {
    name: 'Qto BaseQuantities (IFC Temel Metraj Miktar Setleri)',
    description:
      'IFC şemasında yapı elemanlarının yazılım bağımsız standart ölçülerini (NetVolume, GrossSideArea, NetArea, Weight vb.) taşıyan resmi özellik kümesidir. Örnekler: Qto_WallBaseQuantities (IfcWall), Qto_SlabBaseQuantities (IfcSlab), Qto_ReinforcingElementBaseQuantities (IfcReinforcingBar). 5D BIM metraj hesabında geometrik yorum farklarını ortadan kaldırarak kanıtlanabilir miktar okumasının temelini oluşturur.',
  },
  {
    name: 'LOIN (Bilgi İhtiyacı Seviyesi — Level of Information Need, EN 17412-1)',
    description:
      'EN 17412-1 ve ISO 19650 kapsamında, tek bir LOD numarası yerine her teslim aşaması ve kullanım amacı için Geometrik Ayrıntı (LOG), Alfanümerik Bilgi (LOI) ve Dokümantasyon (DOC) gereksinimlerini ayrı ayrı tanımlayan çerçevedir. Modelin gereksiz geometriyle ağırlaşmasını önler ve ihale ile ruhsat için tam gereken veriyi zorunlu kılar.',
  },
  {
    name: 'LOA (Scan-to-BIM Doğruluk Seviyesi — Level of Accuracy, USIBD)',
    description:
      'USIBD tarafından tanımlanan, lazer tarama (nokta bulutu) verisinin ölçüm doğruluğu ile bu veriden üretilen BIM modelinin temsil doğruluğunu standart sapma bantlarıyla (LOA 10–LOA 50) sınıflandıran standarttır. Rölöve ve güçlendirme projelerinde nokta bulutu ile model arasındaki kabul edilebilir sapma sınırını sözleşmeye bağlar.',
  },
  {
    name: 'BCF (BIM İşbirliği ve Sorun Takip Formatı — BIM Collaboration Format)',
    description:
      '3B modeli tekrar göndermeden, model üzerindeki çakışma veya revizyon notlarını eleman kimliği (GlobalId), kamera bakış açısı ve ekran görüntüsüyle yazılımlar arasında aktaran buildingSMART açık standardıdır. Disiplinlerarası çakışma ve e-PYS ön kontrol bulgularının sorumlu müellife kanıt iziyle atanmasını sağlar.',
  },
  {
    name: 'TIDP ve MIDP (Görev ve Ana Bilgi Teslim Planları)',
    description:
      'ISO 19650-2 kapsamında her disiplinin kendi üreteceği bilgi konteynerlerini listelediği görev bazlı plan (TIDP) ile tüm disiplinlerin teslimatlarının birleştirildiği ana takvim ve sorumluluk tablosudur (MIDP). Projede hangi modelin kim tarafından, hangi tarihte ve hangi LOIN seviyesinde teslim edileceğini takip eder.',
  },
  {
    name: 'AIR (Varlık Bilgi Gereksinimleri — Asset Information Requirements)',
    description:
      'ISO 19650-3 kapsamında binanın işletme, bakım ve tesis yönetimi aşamasında ihtiyaç duyulan teknik, ticari ve yönetsel verileri tanımlayan şartnamedir. İnşaat sonunda teslim edilen PIM modelinin işletme modeli olan AIM ve COBie verisine eksiksiz dönüşmesini sağlar.',
  },
  {
    name: 'EPD (Çevresel Ürün Beyanı — Environmental Product Declaration, ISO 14025 / EN 15804)',
    description:
      'Bir yapı malzemesinin yaşam döngüsü boyunca birim başına küresel ısınma potansiyeli ve çevresel etkilerini bağımsız doğrulamayla belgeleyen resmi sertifikadır. 6D BIM sürdürülebilirlik ve gömülü karbon hesaplarında gerçek üretici verisi olarak kullanılır.',
  },
  {
    name: 'EN 15978 (Bina Yaşam Döngüsü Değerlendirme Standardı, A1–D Modülleri)',
    description:
      'Binaların çevresel etkilerini Ürün (A1–A3), İnşaat Süreci (A4–A5), Kullanım (B1–B7), Ömür Sonu (C1–C4) ve Sistem Sınırı Ötesi Geri Kazanım (D) aşamalarına ayırarak hesaplayan Avrupa standardıdır. Gömülü karbon ile işletme karbonunun birbirine karıştırılmadan standart sınırlarla raporlanmasını sağlar.',
  },
  {
    name: 'EVM (Kazanılmış Değer Yönetimi — Earned Value Management)',
    description:
      'Planlanan Değer (PV), Kazanılmış Değer (EV) ve Gerçekleşen Maliyet (AC) verilerini karşılaştırarak projenin Maliyet Performans İndeksini (CPI) ve Süre Performans İndeksini (SPI) ölçen yönetim yöntemidir. 4D/5D BIM modelindeki saha ilerlemesini bütçe sapması ve iş programı gecikmesiyle tek formülde birleştirir.',
  },
  {
    name: 'Yeşil Defter ve Ataşman (Hakediş Metraj İcmali ve Saha Ölçü Belgesi)',
    description:
      'Yapım işlerinde sahada gerçekleştirilen imalatların proje veya yerinde ölçümlerine dayalı kroki ve hesap tutanakları (Ataşman) ile bu miktarların poz bazında hakedişe aktarıldığı kümülatif icmal defteridir (Yeşil Defter). BIM modelinden alınan metrajın resmi kamu ve özel sektör hakediş ödemesine dönüşmesindeki yasal köprüdür.',
  },
  {
    name: '4735 Fiyat Farkı (Pn Katsayısı Eskalasyon Hesabı)',
    description:
      '4735 sayılı Kamu İhale Sözleşmeleri Kanunu kapsamında sözleşme süresince işçilik, malzeme, akaryakıt ve makine amortismanı endekslerindeki değişimi ağırlık katsayılarıyla hesaplayarak hakedişe F = A × B × (Pn − 1) formülüyle yansıtan yasal mekanizmadır. Uzun süreli inşaat projelerinde enflasyon ve maliyet artışlarının nakit akışına etkisini öngörmeyi sağlar.',
  },
  {
    name: 'YAMBİS (Yapı Müteahhitliği Bilişim Sistemi — Yetki Belgesi Grupları A–H)',
    description:
      'ÇŞİDB tarafından yapı müteahhitlerinin ekonomik ve mali yeterlik ile mesleki ve teknik deneyim kriterlerine göre A\'dan H\'ye kadar gruplandırıldığı resmi kayıt sistemidir. Müteahhidin üstlenebileceği maksimum yapı inşaat alanı ve yaklaşık maliyet sınırını belirler.',
  },
];
