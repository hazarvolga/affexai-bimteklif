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
  {
    name: 'IDS (Bilgi Teslimat Spesifikasyonu — Information Delivery Specification)',
    description:
      'buildingSMART tarafından geliştirilen, IFC modellerindeki sınıflandırma, özellik (Pset) ve metraj (Qto) gereksinimlerini XML formatında tanımlayan ve otomatik denetleyen standart. Model kabul ve e-PYS ön kontrol süreçlerinde insan hatasını sıfırlar.',
  },
  {
    name: 'LOIN (Bilgi İhtiyaç Seviyesi — Level of Information Need / EN 17412-1)',
    description:
      'ISO 19650-1 ve BS EN 17412-1 kapsamında belirsiz LOD puanları yerine Geometrik Detay, Alfanümerik Bilgi ve Dokümantasyon ihtiyacını aşama bazında tanımlayan çerçeve. BEP ve EIR sözleşmelerinde metraj için hangi özelliklerin zorunlu olduğunu belirler.',
  },
  {
    name: 'bSDD (buildingSMART Veri Sözlüğü — buildingSMART Data Dictionary)',
    description:
      'Yapı elemanları, malzemeler, özellikler ve sınıflandırma sistemleri için benzersiz URI tanımlayıcıları sunan uluslararası anlamsal sözlük servisi. Farklı BIM yazılımlarından gelen özellik adlarının pozlarla hatasız eşleşmesini sağlar.',
  },
  {
    name: 'BCF (BIM İşbirliği Formatı — BIM Collaboration Format)',
    description:
      'Devasa IFC dosyasını tekrar göndermeden yalnızca sorunlu elemanın GUID\'sini, kamera açısını, kesit düzlemini ve revizyon notunu aktaran açık XML/API standardı. Tasarım ve metraj denetiminde eksik veya çakışan elemanların ilgili disipline bildirilmesini sağlar.',
  },
  {
    name: 'MVD (Model Görünüm Tanımı — Model View Definition)',
    description:
      'Belirli bir iş akışı için IFC şemasının hangi alt kümesinin dışa aktarılacağını belirleyen filtre standardı. IFC4 Reference View, Design Transfer View ve Basic FM Handover (COBie) ayrımlarını yönetir.',
  },
  {
    name: 'Qto BaseQuantities (IFC Temel Metraj Setleri — Quantity Take-Off Base Quantities)',
    description:
      'buildingSMART IFC4 ve IFC4.3 şemasında her yapı elemanı için standartlaştırılmış net/brüt hacim, alan, uzunluk ve ağırlık özellik setleri (örn. Qto_WallBaseQuantities). Yazılımdan bağımsız 5D keşif ve metraj çıkarımının birincil veri kaynağıdır.',
  },
  {
    name: 'IfcCostSchedule (IFC Maliyet Cetveli — IFC Cost Schedule Entity)',
    description:
      'IFC şeması içinde yaklaşık maliyet (ESTIMATE), bütçe (BUDGET) veya fiyatlandırılmış birim fiyat cetvelini (PRICEDBILLOFQUANTITIES) barındıran üst veri sınıfı. 5D BIM maliyet verisinin harici Excel yerine doğrudan IFC modeli içinde taşınmasını sağlar.',
  },
  {
    name: 'IfcCostItem (IFC Poz Kalemi — IFC Cost Item Entity)',
    description:
      'Bir keşif cetveli içindeki tekil imalat pozunu, birim fiyatını ve ilişkili yapı elemanlarını tutan IFC sınıfı. Poz numarası ile 3B model elemanlarının GUID bazında birbirine bağlanmasını sağlar.',
  },
  {
    name: 'IfcWorkSchedule (IFC 4D İş Programı — IFC Work Schedule Entity)',
    description:
      'Projenin baz (BASELINE), planlanan (PLANNED) veya gerçekleşen (ACTUAL) iş programını ve görev hiyerarşisini (IfcTask) IFC modeli içinde tutan sınıf. 4D inşaat simülasyonu ve nakit akışı S-eğrisi analizinin temelini oluşturur.',
  },
  {
    name: 'e-PYS (Elektronik Proje Yönetim Sistemi)',
    description:
      'ÇŞİDB tarafından yürütülen, 5 Ağustos 2026 tarihli 33331 sayılı Resmî Gazete düzenlemeleriyle BIM tabanlı sayısal yapı modellerinin ruhsat ve denetim kontrolünü yapan ulusal sistem. 1 Eylül 2027 ve 1 Eylül 2028 fazlarıyla yapı ruhsatı süreçlerinde IFC model doğrulamasını zorunlu kılar.',
  },
  {
    name: 'BVBS (Donatı CNC Üretim Standardı — Bundesvereinigung Bausoftware)',
    description:
      'Betonarme donatı çubuklarının çap, boy, adet, büküm açısı ve mandrel çapı bilgilerini ASCII metin satırları halinde otomatik demir kesme/bükme makinelerine aktaran standart. 5D donatı metrajının doğrudan fabrikada sıfır fireyle üretime dönüşmesini sağlar.',
  },
  {
    name: 'LOA (Modelleme Doğruluk Seviyesi — Level of Accuracy, USIBD)',
    description:
      'USIBD tarafından tanımlanan, lazer tarama doğruluğu ile oluşturulan BIM modelinin geometrik sapma toleransını LOA 10 ile LOA 50 arasında derecelendiren standart. Röleve, güçlendirme ve saha hakedişlerinde kabul edilebilir milimetrik sapma sınırını belirler.',
  },
  {
    name: 'GWP / A1-A3 (Gömülü Karbon — Global Warming Potential, Cradle-to-Gate)',
    description:
      'EN 15978 ve EN 15804+A2 standartlarına göre yapı malzemelerinin hammadde çıkarımı (A1), nakliyesi (A2) ve fabrika üretimi (A3) aşamalarında atmosfere saldığı kgCO2e cinsinden sera gazı etkisi. 5D BIM metraj miktarlarının EPD katsayılarıyla çarpılarak 6D karbon ayak izi hesaplamasında kullanılır.',
  },
  {
    name: 'EPD (Çevresel Ürün Beyanı — Environmental Product Declaration, ISO 14025)',
    description:
      'ISO 14025 ve EN 15804+A2 standartlarına göre üçüncü tarafça doğrulanmış, bir yapı malzemesinin birim miktarı başına düşen çevresel etkilerini belgeleyen resmi rapor. 6D LCA hesaplayıcısında kullanılan malzeme karbon katsayılarının resmi veri kaynağıdır.',
  },
  {
    name: 'NRM2 (RICS Yapı İşleri Ölçüm Kuralları — New Rules of Measurement Part 2)',
    description:
      'Royal Institution of Chartered Surveyors (RICS) tarafından yayımlanan, uluslararası inşaat ihalelerinde birim fiyat cetveli ve metraj/minha kurallarını belirleyen standart. Uluslararası projelerde ÇŞİDB ve VOB/DIN 18299 kurallarıyla karşılaştırmalı metraj yapılmasını sağlar.',
  },
  {
    name: 'VOB/C — DIN 18299 (Alman İhale ve Metraj Kuralları)',
    description:
      'Almanya ve Avrupa projelerinde beton (DIN 18331), kalıp, duvar (DIN 18330) ve sıva (DIN 18350) işlerinin ölçü ve boşluk düşümü sınırlarını belirleyen teknik şartname serisi. Allplan ve benzeri yazılımların yerleşik metraj kurallarının anlaşılmasını ve ÇŞİDB pozlarına uyarlanmasını sağlar.',
  },
  {
    name: 'COBie 2.4 (Tesis Yönetimi Bilgi Değişimi — Construction Operations Building Information Exchange)',
    description:
      'BS 1192-4 ve ISO 19650-3 kapsamında yapının işletme, bakım, garanti, yedek parça ve mahâl verilerini 18 çalışma sayfası veya IFC Basic FM Handover MVD ile teslim etme standardı. İnşaat bitiminde As-Built BIM modelinden CAFM/CMMS tesis yönetim yazılımlarına doğrudan veri aktarılmasını sağlar.',
  },
  {
    name: 'IfcBridge (IFC 4.3 Köprü Tesis Sınıfı)',
    description:
      'ISO 16739-1:2024 (IFC 4.3) standardında köprü ve viyadük yapılarını kenar ayak (ABUTMENT), orta ayak (PIER), temel (FOUNDATION) ve tabliye (DECK) alt bölümleriyle temsil eden sınıf. Köprü ve sanat yapılarında ayak ve açıklık bazlı 5D hakediş metrajının çıkarılmasını sağlar.',
  },
  {
    name: 'IfcRoad (IFC 4.3 Karayolu Tesis Sınıfı)',
    description:
      'IFC 4.3 şemasında karayolu, otoyol ve kavşak yapılarını taşıt yolu (CARRIAGEWAY), banket (SHOULDER), refüj (MEDIAN) ve üstyapı kaplama katmanlarıyla modelleyen tesis sınıfı. Karayolu projelerinde kilometraj bazlı plentmiks temel ve kazı/dolgu metrajını sağlar.',
  },
  {
    name: 'IfcRailway (IFC 4.3 Demiryolu Tesis Sınıfı)',
    description:
      'IFC 4.3 şemasında metro, tramvay ve ana hat demiryolu projelerini hat üstyapısı (ray, travers, balast) ve hat altyapısı olarak temsil eden sınıf. Raylı sistem ihalelerinde hat kilometrajı bazlı 5D keşif ve 4D ilerleme takibini sağlar.',
  },
  {
    name: 'IfcAlignment (IFC 4.3 Güzergâh Ekseni — Linear Alignment Entity)',
    description:
      'Yol, köprü, tünel ve demiryolu gibi çizgisel altyapı projelerinde yatay aliynmanı (IfcAlignmentHorizontal), boykesiti (IfcAlignmentVertical) ve demiryolu deverini (IfcAlignmentCant) tanımlayan referans ekseni. Altyapıda "Kat (IfcBuildingStorey)" kavramının karşılığıdır; tüm metraj elemanlarını kilometraja bağlar.',
  },
  {
    name: 'IfcReferent (IFC 4.3 Kilometraj Referans Noktası — Linear Referencing Entity)',
    description:
      'Bir IfcAlignment güzergâhı üzerindeki kilometraj noktalarını ve zincirleme kırıklıklarını tutan konumlandırma sınıfı. Altyapı yeşil defterlerinde her imalatın hangi KM aralığında yapıldığını otomatik olarak raporlar.',
  },
  {
    name: 'IfcEarthworksCut (IFC 4.3 Kazı Hacim Elemanı)',
    description:
      'Temel, hendek, tünel veya yol yarma kazılarını temsil eden ve Qto_EarthworksCutBaseQuantities üzerinden hem doğal (UndisturbedVolume) hem kabarmış (ExpandedVolume) hacmi veren IFC 4.3 sınıfı. Hakedişe esas doğal kazı hacmi ile nakliyeye esas kabarmış hacmin ayrı ayrı hesaplanmasını sağlar.',
  },
  {
    name: 'IfcEarthworksFill (IFC 4.3 Dolgu Hacim Elemanı)',
    description:
      'Yol dolgusu, temel arka dolgusu ve saha tesviye dolgularını temsil eden ve Qto_EarthworksFillBaseQuantities üzerinden sıkıştırılmış (CompactedVolume) ve gevşek (LooseVolume) hacmi veren IFC 4.3 sınıfı. Proje enkesit dolgusu ödemesi ile ariyet ocağı malzeme ihtiyacını netleştirir.',
  },
  {
    name: 'AIM (Varlık Bilgi Modeli — Asset Information Model, ISO 19650-3)',
    description:
      'Yapının inşaat aşamasındaki Proje Bilgi Modelinin (PIM), geçici kabul sonrası As-Built veriler ve COBie bakım tablolarıyla birleştirilerek işletme dönemine devredilen hali. İşverenin tesis yönetimi (FM) ve yaşam döngüsü bütçesini yönettiği nihai dijital ikizdir.',
  },
  {
    name: 'PIR ve AIR (Proje ve Varlık Bilgi Gereksinimleri — Project & Asset Information Requirements)',
    description:
      'ISO 19650 kapsamında işverenin proje süresince karar noktalarında (PIR) ve işletme/bakım aşamasında (AIR) ihtiyaç duyduğu bilgi ve metraj kriterleri bütünü. EIR ve IDS denetim kurallarının hangi amaçla oluşturulduğunu tanımlar.',
  },
  {
    name: 'Pset_Warranty (IFC Garanti Özellik Seti)',
    description:
      'Ekipman ve yapı bileşenlerinin parça/işçilik garanti süresini, başlangıç/bitiş tarihini ve garanti veren firma iletişim bilgilerini tutan standart buildingSMART özellik seti. COBie Type ve Component sekmelerinin otomatik doldurulmasını sağlar.',
  },
  {
    name: 'Pset_ManufacturerTypeInformation (IFC Üretici ve Model Özellik Seti)',
    description:
      'Yapı bileşeninin üretici adını (Manufacturer), model numarasını (ModelNumber), GTIN barkodunu ve üretim yılını standartlaştıran IFC özellik seti. Marka/model bazlı piyasa fiyat araştırması ve COBie teslimatı için zorunludur.',
  },
  {
    name: 'Yeşil Defter (Hakediş Metraj İcmal Defteri)',
    description:
      '4734/4735 sayılı kanunlara tabi yapım işlerinde her hakediş döneminde yapılan imalatların poz bazında kümülatif miktarlarını ve önceki hakedişten farkını gösteren resmi belge. TeklifPro 5D BIM motorunda IfcCostItem ve GlobalId eşleştirmesiyle modelden tek tıkla üretilir.',
  },
  {
    name: 'Ataşman (İmalat Ölçü Krokisi — As-Built Measurement Sketch)',
    description:
      'Özellikle kapanacak imalatların yerinde ölçülen boyutlarını, kotlarını ve hesap şeklini gösteren, yüklenici ve yapı denetimce imzalanan teknik belge. BIM modelindeki 3B kesit görünümleri ve BCF kamera açılarıyla dijitalleşir.',
  },
  {
    name: 'Pursantaj Tablosu (Yüzde Dağılım Cetveli — Work Item Percentage Weight Schedule)',
    description:
      'Anahtar teslimi götürü bedel sözleşmelerde her bir imalat kaleminin toplam bina maliyeti içindeki yüzdesel ağırlığını gösteren resmi ödeme cetveli. 5D BIM yaklaşık maliyet hesabından türetilir ve aylık hakediş ödemelerinin temelini oluşturur.',
  },
  {
    name: 'Mukayeseli Keşif (İş Artışı/Eksilişi Cetveli — Comparative Bill of Quantities)',
    description:
      'Proje revizyonları sonucunda ilk sözleşme keşfi ile revize uygulama projesi arasındaki poz bazlı miktar ve tutar farklarını ortaya koyan cetvel. İki IFC model revizyonunun GlobalId bazlı otomatik karşılaştırılmasıyla saniyeler içinde hesaplanır.',
  },
  {
    name: 'IfcOpenShell (Açık Kaynak IFC Motoru)',
    description:
      'Python ve C++ tabanlı, IFC 2x3, IFC 4 ve IFC 4.3 dosyalarını okuyan, değiştiren ve 4D/5D/IDS API\'lerini barındıran endüstri standardı açık kaynak kütüphane. Otomatik metraj çıkarımı, maliyet ataması ve IDS doğrulamasının çekirdek motorudur.',
  },
  {
    name: 'PAS 1192 / BS 1192 (İngiliz BIM Seviye 2 Standart Serisi)',
    description:
      'ISO 19650 serisinin temelini oluşturan; tasarım/yapım (PAS 1192-2), işletme (PAS 1192-3), COBie (BS 1192-4), güvenlik (PAS 1192-5) ve İSG (PAS 1192-6) süreçlerini tanımlayan standart ailesi. CDE klasör yapısı (WIP/Shared/Published), uygunluk kodları (S0-S4) ve COBie teslimat kurallarının referansıdır.',
  },
  {
    name: 'LCC (Yaşam Döngüsü Maliyet Analizi — Life Cycle Costing, ISO 15686-5)',
    description:
      'ISO 15686-5 standardına göre bir yapının yalnızca ilk yatırım maliyetini (CAPEX) değil; 50-60 yıllık işletme, enerji, bakım, onarım ve yıkım maliyetlerini (OPEX) bugünkü değere indirgeyerek hesaplayan yöntem. 5D ilk yatırım maliyeti ile 6D enerji/karbon ve 7D bakım verilerini tek bir finansal karar modelinde birleştirir.',
  },
];
