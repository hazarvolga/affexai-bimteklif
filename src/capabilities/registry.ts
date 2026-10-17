/**
 * BIMMetraj — Yetenek Kaydı ve Kanıt Kapısı (Capability Registry & Evidence Gate)
 *
 * Tek Kaynak (Single Source of Truth):
 * Vitrinde ("canlı", "pilot", "yol haritası"), `llms.txt` içinde ve yönetim
 * panelinde beyan edilen tüm mühendislik ve platform yetenekleri bu kayıttan
 * beslenir.
 *
 * Doğrulama Seviyeleri (YOL_HARITASI_2026-10-17.md §2–§3):
 * - L0: Yalnız metin / tasarım aşaması
 * - L1: Kural/hesap motoru mevcut ve birim testli
 * - L2: Gerçek kullanıcı verisiyle uygulama akışına bağlı
 * - L3: Resmî mevzuat kaynağı ve altın örnekle (golden test) doğrulanmış, uzman onaylı
 * - L4: Canlı pilot müşteride saha kabulüyle kanıtlanmış
 *
 * Kanıt Kapısı Kuralı:
 * - `status: "live"` olan her yetenek en az `L3` seviyesinde olmalı, disk üzerinde
 *   gerçek `modulePath` ve `goldenTestPath` dosyalarına sahip olmalı ve gerçek bir
 *   kişinin adı, unvanı, oda/sicil numarası (`registrationNo`) ve onay tarihiyle
 *   imzalanmış olmalıdır. Kurgusal kurul / ajan adı onay sayılmaz.
 * - 2026-10-17 denetimi (DENETIM_RAPORU_2026-10-17.md, P0-2): gerçek imza bulunmadığı için
 *   tüm yetenekler `pilot / L2` seviyesine indirildi. Gerçek imza alındığında ilgili kayıt
 *   yeniden `live / L3` yapılır.
 */

export type CapabilityLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
export type CapabilityStatus = 'live' | 'pilot' | 'roadmap';
export type ReviewerDiscipline = 'ARC' | 'STR' | 'MEP' | 'COST' | 'QA' | 'SEC';

export interface CapabilityOfficialSource {
  institution: string;
  documentTitle: string;
  articleOrTable: string;
  publicationDate: string;
  sha256?: string;
}

export interface CapabilityEvidence {
  modulePath: string;
  goldenTestPath: string;
  officialSource: CapabilityOfficialSource;
}

export interface CapabilityReviewerSignOff {
  /** Gerçek kişinin adı soyadı. Kurul/ajan/rol adı kabul edilmez. */
  name: string;
  title: string;
  /** Meslek odası / sicil numarası (ör. İMO, TMMOB, SMMM). Zorunlu. */
  registrationNo: string;
  discipline: ReviewerDiscipline;
  approvedAt: string;
}

export interface CapabilityRecord {
  id: string;
  title: string;
  shortClaim: string;
  longDescription: string;
  level: CapabilityLevel;
  status: CapabilityStatus;
  stream: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  evidence: CapabilityEvidence;
  reviewer?: CapabilityReviewerSignOff;
  planIds: string[];
}

export const CAPABILITY_REGISTRY_VERSION = 'BIM-CAP-2026-10-17.10';

export const CAPABILITY_REGISTRY: readonly CapabilityRecord[] = [
  {
    id: 'ifc-qto-multi-layer-icmal',
    title: 'IFC 2x3 / IFC4 / IFC4.3 Fiziksel Metraj (QTO), Çok Katmanlı IfcCovering & 16 Daire Cetveli',
    shortClaim:
      'IFC2x3, IFC4 ve IFC4.3 modellerinden çok katmanlı IfcCovering taşeron ayrıştırması, mtül süpürgelik ve IfcZone/IfcSpace bağımsız bölüm cetveli üretimi.',
    longDescription:
      'ALLPLAN 2026.1, Revit, ArchiCAD ve Tekla IFC modellerinde IfcComplexProperty (Object Layer Attributes #1..#4) katmanlarını özyinelemeli olarak açar; şap, parke, seramik, XPS, fayans, kaba sıva, alçı ve boya kalemlerini taşeron bazında ayrıştırır; SKIRTINGBOARD süpürgelikleri mtül birimine çevirir ve IfcZone/IfcSpace üzerinden daire net/brüt m² cetveli oluşturur.',
    level: 'L2',
    status: 'pilot',
    stream: 'B',
    evidence: {
      modulePath: 'src/ifc/calm-icmal.ts',
      goldenTestPath: 'src/ifc/calm-icmal.test.ts',
      officialSource: {
        institution: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı & buildingSMART',
        documentTitle: 'RG 33331 Dijital Proje Yönetmeliği EK-3 / EK-6 & ISO 16739-1 (IFC4)',
        articleOrTable: 'Madde 11–14, EK-3 Tablo 3.2, EK-6 Tablo 6.3–6.60',
        publicationDate: '2026-08-05',
        sha256: '7dc88971a9b3556d3ff10f1244f22d8d7d574c04a2e67c9d2b24e5b27cf0ecb3',
      },
    },
    planIds: ['trial', 'epys_auditor', 'quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'epys-rg33331-preflight',
    title: 'RG 33331 (05.08.2026) e-PYS EK-2 / EK-3 / EK-6 / EK-7 / EK-9 Ön Kontrolü',
    shortClaim:
      '05.08.2026 tarihli ve 33331 sayılı Resmî Gazete Yönetmeliği EK-2 dosya adlandırması, EK-6 TREpys_* özellik setleri ve EK-9 Tablo 9.1 (21 satır MM) / Tablo 9.2 (16 satır ST/MK/EL) ön kontrolü.',
    longDescription:
      'Bakanlıktan gelen son resmi PDF eklerine (#1.pdf, #2.pdf, EKLER.pdf) göre 9 parçalı EK-2 dosya adını, EK-3 mahal kodlarını, EK-6 TREpys_* özellik setlerini (Parsel, Emsal DAHIL/HARIC/DIGER, Malzeme İsmi_Dayanım), EK-7 koordinat/IfcAnnotation kurallarını ve EK-9 Tablo 9.1 / Tablo 9.2 kontrol formlarını denetler.',
    level: 'L2',
    status: 'pilot',
    stream: 'B',
    evidence: {
      modulePath: 'src/smartcheck/rules/epys.ts',
      goldenTestPath: 'src/smartcheck/rules/epys.test.ts',
      officialSource: {
        institution: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı',
        documentTitle: 'Projelerin Dijital Olarak Hazırlanması Hakkında Yönetmelik (#1.pdf, #2.pdf, EKLER.pdf)',
        articleOrTable: 'Madde 5–15, EK-1, EK-2, EK-3, EK-6, EK-7, EK-8, EK-9 (Tablo 9.1 & 9.2)',
        publicationDate: '2026-08-05',
        sha256: '7dc88971a9b3556d3ff10f1244f22d8d7d574c04a2e67c9d2b24e5b27cf0ecb3',
      },
    },
    planIds: ['trial', 'epys_auditor', 'quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'pdfa-iso216-esig-preflight',
    title: 'RG 33331 m.8 & m.6 PDF/A, ISO 216 Pafta Boyutu ve /Sig Elektronik İmza Ön Kontrolü',
    shortClaim:
      'PDF paftalarda PDF/A XMP beyanı, ISO 216 A4 ve katları pafta ebadı, tek pafta kuralı ve gömülü /Sig elektronik imza ön kontrolü.',
    longDescription:
      'Bakanlık Yönetmeliği #1.pdf m.8(1)-(2) ve #2.pdf m.6(1)-(2) uyarınca yüklenen PDF paftalarda PDF/A-1..4 XMP üstveri beyanını, ISO 216 A4 katları boyut kuralını, tek çizim paftası düzenini ve AcroForm /Sig elektronik imza sözlüğünü denetler.',
    level: 'L2',
    status: 'pilot',
    stream: 'B',
    evidence: {
      modulePath: 'src/smartcheck/import/pdf-preflight-runner.ts',
      goldenTestPath: 'src/smartcheck/import/pdf-preflight-runner.test.ts',
      officialSource: {
        institution: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı',
        documentTitle: 'Projelerin Dijital Olarak Hazırlanması Hakkında Yönetmelik (#1.pdf & #2.pdf)',
        articleOrTable: '#1.pdf Madde 8(1)-(2) & #2.pdf Madde 6(1)-(2)',
        publicationDate: '2026-08-05',
      },
    },
    planIds: ['trial', 'epys_auditor', 'quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'smartcheck-3x3-policy',
    title: 'SmartCheck 3×3 Şirket Politikası (Metraj ≤ %3, TS 500 / EC2 Paspayı mm, STR Taşıyıcı)',
    shortClaim:
      'Metraj sapması ≤ %3, TS 500 / Eurocode 2 minimum paspayı (mm) ve taşıyıcı elemanların STR disiplininde bulunması denetimi.',
    longDescription:
      'Şirket içi 3×3 mühendislik politikası (smartcheck-3x3-2026-10-v2) kapsamında miktar sapmasını (%3), betonarme paspayını (varsayılan TS 500; yalnızca EUROCODE_2 seçildiğinde EC2 XC3 35 mm) ve LoadBearing=true elemanların STR disiplininde yer almasını denetler.',
    level: 'L2',
    status: 'pilot',
    stream: 'B',
    evidence: {
      modulePath: 'src/smartcheck/rules/ifc-rule-run.ts',
      goldenTestPath: 'src/smartcheck/rules/ifc-rule-run.test.ts',
      officialSource: {
        institution: 'TSE & CEN',
        documentTitle: 'TS 500 Betonarme Yapıların Tasarım ve Yapım Kuralları & EN 1992-1-1 (Eurocode 2)',
        articleOrTable: 'TS 500 Çizelge 9.3 / EN 1992-1-1 Tablo 4.4N',
        publicationDate: '2000-02-01',
      },
    },
    planIds: ['trial', 'epys_auditor', 'quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'minha-opening-intersection-engine',
    title: 'Sözleşmesel Boşluk Minha (ÇŞB 0,50 m² / DIN 18350 2,50 m² / Özel Şartname) & Kiriş-Döşeme Kesişim Motoru',
    shortClaim:
      'ÇŞB Genel Teknik Şartnamesi (0,50 m²), DIN 18350 VOB/C (2,50 m²) ve kullanıcı tanımlı özel şartname eşiğine göre kapı/pencere minha, lento/denizlik dönüşü ve betonarme düğüm noktası tekilleştirme hesabı.',
    longDescription:
      'Duvar ve sıva/boya imalatlarında boşluk alanlarını seçilen şartname profiline göre düşer, denizlik/lento/mermer yan yüzey dönüşlerini ekler ve kolon-kiriş-döşeme birleşim bölgelerinde mükerrer beton hacmini TS 500 hiyerarşisiyle düşer.',
    level: 'L2',
    status: 'pilot',
    stream: 'B',
    evidence: {
      modulePath: 'src/smartcheck/rules/minha.ts',
      goldenTestPath: 'src/smartcheck/rules/minha.test.ts',
      officialSource: {
        institution: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı YFK & DIN',
        documentTitle: 'ÇŞB Yapım İşleri Genel Teknik Şartnamesi & DIN 18350 (VOB/C)',
        articleOrTable: 'Kagir/Sıva Ölçü Kuralları (0,50 m²) & DIN 18350 Bölüm 5 (2,50 m²)',
        publicationDate: '2026-01-01',
      },
    },
    planIds: ['trial', 'quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'kik-m38-teblig-m45-adt-engine',
    title: '4734 KİK m.38 & Kamu İhale Genel Tebliği m.45.1 Aşırı Düşük Teklif (ADT) Sınır Değer ve %80 Pareto Motoru',
    shortClaim:
      'Kamu İhale Genel Tebliği m.45.1.1 / m.45.1.1.1 / m.45.1.1.4 resmi K katsayısı, N=1,00 (Üstyapı) / N=1,20 (Diğer Yapım/Altyapı) sınır değer (SD) hesabı ve m.45.1.2 %80 Pareto açıklama kalemi ayrıştırması.',
    longDescription:
      'İdare yaklaşık maliyetinin (YM) %40 ile %120 aralığındaki geçerli teklifleri filtreler, Tort1, örneklem standart sapması (σ), Tort2, C = Tort2 / YM ve parçalı K katsayısı üzerinden resmi Sınır Değeri (SD = max(0,40×YM, (K×Tort2)/(C×N))) hesaplar; ayrıca iş kalemlerini tutar büyüklüğüne göre sıralayarak %80 Pareto dilimindeki açıklama istenilecek pozları belirler.',
    level: 'L2',
    status: 'pilot',
    stream: 'B',
    evidence: {
      modulePath: 'src/lib/kik-adt.ts',
      goldenTestPath: 'src/lib/kik-adt.golden.test.ts',
      officialSource: {
        institution: 'Kamu İhale Kurumu (KİK)',
        documentTitle: '4734 Sayılı Kamu İhale Kanunu m.38 & Kamu İhale Genel Tebliği',
        articleOrTable: 'Madde 45.1.1, 45.1.1.1, 45.1.1.4 ve 45.1.2',
        publicationDate: '2021-11-30',
      },
    },
    planIds: ['quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'iso19650-naming-ek2-loin',
    title: 'TS EN ISO 19650-1/2 & RG 33331 EK-2 Birleşik Dosya Adlandırma ve EN 17412-1 LOIN Desteği',
    shortClaim:
      '7 parçalı ISO 19650-2 ve 9 parçalı RG 33331 EK-2 (EKLER.pdf) dosya adlandırma kurallarını, EN 17412-1 LOIN geometrik/alfanümerik tamlık skorunu ve EIR teslim aşaması (CONCEPT/DEFINITIVE/IMPLEMENTATION/AS_BUILT) denetimini destekler.',
    longDescription:
      'Yüklenen IFC modellerinin dosya adını hem uluslararası ISO 19650-2 şemasına hem de Bakanlık EKLER.pdf EK-2 sözlüğüne göre doğrular; elemanların gerçek geometri, malzeme, kat, poz ve IFC GUID tamlığını (LOIN) sahte varsayılan olmadan ölçer; EIR teslim aşamasına göre (LOD 200/300/350/400) bilgi gereksinimlerini destekler.',
    level: 'L2',
    status: 'pilot',
    stream: 'B',
    evidence: {
      modulePath: 'src/smartcheck/rules/iso19650.ts',
      goldenTestPath: 'src/smartcheck/rules/iso19650.test.ts',
      officialSource: {
        institution: 'TSE / ISO & T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı',
        documentTitle: 'TS EN ISO 19650-1/2, BS EN 17412-1 (LOIN) & RG 33331 EK-2 (EKLER.pdf)',
        articleOrTable: 'ISO 19650-2 Madde 5.1–5.7, EN 17412-1 Madde 6 & RG 33331 EK-2 Tablo 2.1–2.14',
        publicationDate: '2026-08-05',
      },
    },
    planIds: ['trial', 'epys_auditor', 'quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'csb-2026-official-catalogs-full',
    title: 'ÇŞB 2026 Resmi Birim Fiyat, Rayiç, Yapı Yaklaşık Maliyet & TÜİK Endeks Kitapları (6 Kitap · 18.848 Satır Tam Kapsam)',
    shortClaim:
      'SHA-256 mühürlü 6 resmi 2026 ÇŞB PDF kitabındaki 18.848 poz ve rayiç satırının tamamı (İnşaat BF 1.861, İnşaat Rayiç 5.360, Mekanik BF 5.678, Elektrik BF 5.910, Yapı Yaklaşık Maliyet 18, TÜİK Endeks 21) ve dönem doğrulamalı kapsam raporu.',
    longDescription:
      'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Yüksek Fen Kurulu 2026 Mart İnşaat/Mekanik/Elektrik Birim Fiyat ve Rayiç listeleri (`2026-03-01..2026-03-31`) ile 2026 Yapı Yaklaşık Birim Maliyetleri Tebliği (`2026-01-01..2026-12-31`) içindeki toplam 18.848 pozun tamamını SHA-256 belge özeti ve kapsam raporu ile sunar.',
    level: 'L2',
    status: 'pilot',
    stream: 'C',
    evidence: {
      modulePath: 'src/server/crawler/csb-pdf-parser.ts',
      goldenTestPath: 'src/server/crawler/csb-pdf-parser.test.ts',
      officialSource: {
        institution: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı Yüksek Fen Kurulu',
        documentTitle: '2026 Mart Ayı Güncel İnşaat / Mekanik / Elektrik Birim Fiyat & Rayiç Listeleri ve 2026 Yapı Yaklaşık Maliyet Tebliği',
        articleOrTable: '15.xxx, 10.xxx, 25.xxx, 35.xxx Poz/Rayiç Tabloları ve I-A..V-E Yapı Sınıfları (18.848 Satır)',
        publicationDate: '2026-03-03',
        sha256: 'dcf153503f5b487dcaa741228666f6b83a6ed04a28249cbe43f010e41bffe69c',
      },
    },
    planIds: ['quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'tuik-21-subindex-price-escalation-4735',
    title: '4735 Sayılı Kanun Fiyat Farkı (F = A_n × B × (P_n − 1)) & ÇŞB 2026 – TÜİK 21 Alt Endeks Güncelleme Motoru',
    shortClaim:
      '4735 Sayılı Kamu İhale Sözleşmeleri Kanunu Fiyat Farkı Esasları (B=0,90, P_n ağırlıklı endeks) ve 21 resmi ÇŞB-TÜİK alt endeksiyle dönem dışı birim fiyat eskalasyonu (TUIK_INDEXED_ESTIMATE).',
    longDescription:
      'ÇŞB Yüksek Fen Kurulu 2026 Ocak Rayiç – TÜİK Endeks Eşleştirme Tablosundaki 21 alt endeksi (TÜFE Genel İşçilik + 20 Yİ-ÜFE sektörel alt endeksi) kullanarak hem 4735 sayılı Kanun kapsamındaki hakediş fiyat farkını (F = A_n × B × (P_n − 1)) kuruş hassasiyetiyle hesaplar hem de geçerlilik dönemi dolmuş aylık birim fiyatları açık "TÜİK Endeksiyle Güncellenmiş Tahmini Birim Fiyat" etiketiyle hedef aya taşır.',
    level: 'L2',
    status: 'pilot',
    stream: 'C',
    evidence: {
      modulePath: 'src/lib/price-escalation.ts',
      goldenTestPath: 'src/lib/price-escalation.test.ts',
      officialSource: {
        institution: 'Cumhurbaşkanlığı & T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı YFK / TÜİK',
        documentTitle: '4735 Sayılı Kanun Yapım İşleri Fiyat Farkı Esasları & ÇŞB 2026 Ocak Rayiç–TÜİK Endeks Eşleştirme Tablosu',
        articleOrTable: 'Madde 5–6 (F = A_n × B × (P_n − 1)) & 21 TÜFE/Yİ-ÜFE Alt Endeks Eşleştirme Tablosu',
        publicationDate: '2026-01-01',
        sha256: '3519e5a631d6043b72e7637e1521456f1da00e7a794f39655cc5c628ae76d93e',
      },
    },
    planIds: ['quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'iso19650-cde-workflow-state-machine',
    title: 'TS EN ISO 19650-2 §5.6–5.7 CDE Durum Geçiş Doğrulayıcısı ve EIR/LOIN Teslim Kapısı Desteği',
    shortClaim:
      'WIP (S0) → SHARED (S1..S7) → PUBLISHED (A1..A7) → ARCHIVED (B) durum geçiş kurallarını ve Pxx.xx / Cxx revizyon kapısını destekler; sahte varsayılan olmadan denetim izi tutar.',
    longDescription:
      'TS EN ISO 19650-2 §5.6–5.7 uyarınca doğrudan WIP → PUBLISHED atlamasını engeller, her durumun izin verilen uygunluk kodu (S0, S1..S7, A1..A7, B) ve revizyon şeması (Pxx.xx vs Cxx) ile eşleşmesini doğrular ve onaylı durum geçişlerini zaman damgalı olarak kaydeder.',
    level: 'L2',
    status: 'pilot',
    stream: 'B',
    evidence: {
      modulePath: 'src/smartcheck/rules/iso19650.ts',
      goldenTestPath: 'src/smartcheck/rules/iso19650.test.ts',
      officialSource: {
        institution: 'TSE / ISO',
        documentTitle: 'TS EN ISO 19650-1 & TS EN ISO 19650-2',
        articleOrTable: 'ISO 19650-1 Madde 12 & ISO 19650-2 Madde 5.6–5.7 (Ortak Veri Ortamı — CDE İş Akışı)',
        publicationDate: '2018-12-01',
      },
    },
    planIds: ['bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'multi-user-cde-approval-workflow',
    title: 'Çok Kullanıcılı CDE Rol Bazlı Onay Kapıları ve Kurumsal Revizyon Onay Akışı (Pilot · L2)',
    shortClaim:
      'Proje müellifi, disiplin sorumlusu (STR/ARC/MEP) ve işveren temsilcisi arasında çok kullanıcılı CDE durum geçiş onay kapılarını destekler.',
    longDescription:
      'Canlı CDE durum geçiş doğrulayıcısına (validateCdeStateTransition) ek olarak, çok kullanıcılı kurumsal çalışma alanlarında SHARED ve PUBLISHED geçişlerinin disiplin yetkili mühendis onayına bağlanması.',
    level: 'L2',
    status: 'pilot',
    stream: 'B',
    evidence: {
      modulePath: 'src/smartcheck/rules/iso19650.ts',
      goldenTestPath: 'src/smartcheck/rules/iso19650.test.ts',
      officialSource: {
        institution: 'TSE / ISO',
        documentTitle: 'TS EN ISO 19650-2',
        articleOrTable: 'Madde 5.6.2 & 5.7.2 (Paylaşım ve Yayımlama Onay Kapıları)',
        publicationDate: '2018-12-01',
      },
    },
    planIds: ['bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'apartment-subcontractor-hakedis-shield',
    title: 'Daire Bazlı Taşeron Hakediş Kalkanı — Şap / Zemin Kaplaması Tavanı, Harç Hacmi ve Beyan Kontrolü (Pilot · L2)',
    shortClaim:
      'IFC mahal cetvelinden daire başına şap ve zemin kaplaması hakediş tavanı üretir; kullanıcı girdili kalınlık, fire ve dozajla harç hacmi/çimento hesaplar ve taşeron beyanını tavanla karşılaştırır.',
    longDescription:
      'Sıvacı, şapçı ve kaplamacı taşeronların hakedişte metrajı şişirmesine karşı müteahhidi korumak için bağımsız bölüm bazında net alan tavanı sunar. Kalınlık, fire, çimento dozajı, tolerans ve taşeron beyanı kullanıcı girdisidir; duvar sıvası alanı IFC mahal cetvelinde bulunmadığı için yalnızca kullanıcı girdisiyle hesaplanır. Bağımsız uzman kabulü alınana kadar pilot olarak işaretlidir.',
    level: 'L2',
    status: 'pilot',
    stream: 'C',
    evidence: {
      modulePath: 'src/ifc/apartment-subcontractor-shield.ts',
      goldenTestPath: 'src/ifc/apartment-subcontractor-shield.test.ts',
      officialSource: {
        institution: 'Uzman mühendis saha geri bildirimi (Melih Dinekli) & IFC IfcSpace/IfcZone',
        documentTitle: 'Saha Geri Bildirimi 17 Ekim 2026 & ISO 16739-1 (IFC4) mahal net alanları',
        articleOrTable: 'docs/audits/MELIH_DINEKLI_SAHA_GERIBILDIRIMI_2026-10-17.md Tespit 6',
        publicationDate: '2026-10-17',
      },
    },
    planIds: ['quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'ifc-authoring-software-advisory',
    title: 'IFC Kaynak Yazılım Tespiti ve Metraj Güvenilirliği Uyarısı — Allplan / Revit / Archicad (Pilot · L2)',
    shortClaim:
      'IFC başlığından kaynak yazılımı tespit eder ve yazılıma göre model kontrolü uyarısı gösterir; uyarılar uzman saha gözlemidir, doğruluk garantisi veya sabit sapma yüzdesi içermez.',
    longDescription:
      'FILE_NAME ve IFCAPPLICATION kaydından Allplan, Revit, Archicad ve Tekla tespit edilir. Revit kaynaklı dosyalarda kaba yapı birleşimi, kalıp görünür yüzeyi ve ince yapı katman daralması için model kontrolü önerilir. Tek odalık katman daralması aritmetiği kullanıcının kendi ölçüsüyle hesaplanır. Bağımsız uzman kabulü alınana kadar pilot olarak işaretlidir.',
    level: 'L2',
    status: 'pilot',
    stream: 'C',
    evidence: {
      modulePath: 'src/ifc/authoring-software-diagnostics.ts',
      goldenTestPath: 'src/ifc/authoring-software-diagnostics.test.ts',
      officialSource: {
        institution: 'Uzman mühendis saha geri bildirimi (Melih Dinekli) & ISO 10303-21',
        documentTitle: 'Saha Geri Bildirimi 17 Ekim 2026 & STEP HEADER FILE_NAME',
        articleOrTable: 'docs/audits/MELIH_DINEKLI_SAHA_GERIBILDIRIMI_2026-10-17.md Tespit 1–3',
        publicationDate: '2026-10-17',
      },
    },
    planIds: ['quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'pre-bim-feasibility-kat-karsiligi',
    title: 'IFC Öncesi Ön Teklif / Kat Karşılığı Fizibilite — Arsa, TAKS–KAKS, Çoklu Parsel ve Daire Paylaşımı (Pilot · L2)',
    shortClaim:
      'Kullanıcının girdiği arsa, TAKS ve KAKS değerlerinden çoklu parsel alanlarını, arsa sahibi/müteahhit paylaşımını ve daire başı brüt/net alanı hesaplar; vaat edilen alanın paylaşım kapasitesini aşıp aşmadığını aritmetik olarak denetler.',
    longDescription:
      'Projesi veya IFC dosyası olmayan ön teklif aşamasında çalışır. Tüm sayısal girdiler kullanıcıdan gelir; varsayılan, piyasa ortalaması veya tipik maliyet dağılımı kullanılmaz. TAKS/KAKS değerleri imar durumu belgesinden alınmalıdır. Excel (.xlsx) ve CSV içe aktarım, CSV dışa aktarım ve CreateQuote teklif taslağına doğrudan aktarım (pre-bim-quote-draft) desteklenir. Bağımsız uzman kabulü alınana kadar pilot olarak işaretlidir.',
    level: 'L2',
    status: 'pilot',
    stream: 'C',
    evidence: {
      modulePath: 'src/lib/pre-bim-feasibility.ts',
      goldenTestPath: 'src/lib/pre-bim-feasibility.test.ts',
      officialSource: {
        institution: 'Uzman mühendis saha geri bildirimi (Melih Dinekli) & imar durumu belgesi (kullanıcı girdisi)',
        documentTitle: 'Saha Geri Bildirimi 17 Ekim 2026 — ön teklif / kat karşılığı akışı',
        articleOrTable: 'docs/audits/MELIH_DINEKLI_SAHA_GERIBILDIRIMI_2026-10-17.md Tespit 4–5',
        publicationDate: '2026-10-17',
      },
    },
    planIds: ['quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'free-public-calculators',
    title: 'Ücretsiz Halka Açık Hesaplayıcılar — Aşırı Düşük Teklif Sınır Değeri ve 4735 Fiyat Farkı (Pilot · L2)',
    shortClaim:
      'Giriş gerektirmeyen iki ön hesaplayıcı: KİK m.38 / Tebliğ m.45.1.1 sınır değer ve 4735 fiyat farkı. Tüm katsayılar ve endeksler kullanıcı girdisidir; bağımsız doğrulanmamıştır.',
    longDescription:
      'Mevcut KİK ve 4735 motorlarını (src/lib/kik-adt.ts, src/lib/price-escalation.ts) herkese açık sayfalara bağlar. Hesap tarayıcıda yapılır, hiçbir değer varsayılmaz (B katsayısı ve sabit katsayı dahil), endeks verisi çekilmez. Sayfalarda "bağımsız mühendis/mali müşavir doğrulaması yoktur" uyarısı bulunur. Gerçek bir bağımsız doğrulama alınana kadar pilot olarak işaretlidir.',
    level: 'L2',
    status: 'pilot',
    stream: 'C',
    evidence: {
      modulePath: 'src/lib/calculators/kik-form.ts',
      goldenTestPath: 'src/lib/calculators/calculators-forms.test.ts',
      officialSource: {
        institution: 'Kamu İhale Kurumu / 4734 ve 4735 sayılı Kanunlar',
        documentTitle: 'Kamu İhale Genel Tebliği m.45.1 ve Yapım İşlerinde Uygulanacak Fiyat Farkına İlişkin Esaslar',
        articleOrTable: '4734 m.38, Tebliğ 45.1.1–45.1.2; 4735 m.8',
        publicationDate: '2026-10-17',
      },
    },
    planIds: ['quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'ghostscript-verapdf-server-conversion',
    title: 'Sunucu Tarafı Otomatik PDF/A-2b Dönüştürme (Ghostscript) ve veraPDF Sertifikasyonu (Yol Haritasında · 2026 Q4)',
    shortClaim:
      'Standart PDF paftaların sunucu tarafında otomatik PDF/A-2b formatına dönüştürülmesi ve veraPDF ile tam ISO 19005-2 doğrulaması (Yol Haritasında · 2026 Q4).',
    longDescription:
      'Mevcut XMP PDF/A beyan, ISO 216 boyut ve /Sig e-imza ön kontrolüne ek olarak, PDF/A olmayan paftaların işçi konteynerinde Ghostscript ile PDF/A-2b formatına dönüştürülmesi.',
    level: 'L1',
    status: 'roadmap',
    stream: 'B',
    evidence: {
      modulePath: 'workers/ifc/pdf_preflight.py',
      goldenTestPath: 'src/smartcheck/import/pdf-preflight-runner.test.ts',
      officialSource: {
        institution: 'ISO & T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı',
        documentTitle: 'ISO 19005-2 (PDF/A-2) & RG 33331 Yönetmelik Madde 8',
        articleOrTable: 'Madde 8(1)',
        publicationDate: '2026-08-05',
      },
    },
    planIds: ['enterprise_epys'],
  },
  {
    id: 'ekap-tender-protocol-import',
    title: 'EKAP İhale Açılış Tutanağı Otomatik İçe Aktarımı ve ADT Açıklama Dosyası Üretimi (Yol Haritasında · 2026 Q4)',
    shortClaim:
      'EKAP XML/PDF ihale açılış tutanağından Yaklaşık Maliyet (YM) ve tekliflerin otomatik okunması ve KİK m.45.1.13 analiz formatında aşırı düşük teklif savunma paketi üretimi (Yol Haritasında · 2026 Q4).',
    longDescription:
      'Mevcut kullanıcı girdili 4734 KİK m.38 & Genel Tebliğ m.45.1.1 Sınır Değer (SD) ve %80 Pareto motoruna ek olarak, Faz 3 (2026 Q4) kapsamında EKAP tutanaklarının doğrudan içe aktarılması.',
    level: 'L1',
    status: 'roadmap',
    stream: 'B',
    evidence: {
      modulePath: 'src/lib/kik-adt.ts',
      goldenTestPath: 'src/lib/kik-adt.golden.test.ts',
      officialSource: {
        institution: 'Kamu İhale Kurumu (KİK)',
        documentTitle: 'Kamu İhale Genel Tebliği & EKAP Elektronik İhale Uygulama Yönetmeliği',
        articleOrTable: 'Madde 45.1.1–45.1.13',
        publicationDate: '2021-11-30',
      },
    },
    planIds: ['bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'kat-karsiligi-ve-kentsel-donusum-calculator',
    title: 'Kat Karşılığı ve Kentsel Dönüşüm Paylaşım / KDV Hesaplayıcısı (Yol Haritasında)',
    shortClaim:
      'Arsa sahibi ve müteahhit paylaşımı ile 6306 kapsamındaki KDV etkisinin kullanıcı girdili hesaplanması (Yol Haritasında; kaynak ve uzman doğrulaması bekliyor).',
    longDescription:
      'Motor (src/lib/kat-karsiligi.ts) mevcuttur ancak halka açık değildir: varsayılan çarpanlar kullanıcı girdisine çevrilmeli, KDV 150 m²’ye kadar olan kısım / aşan kısım olarak parçalı hesaplanmalı ve tapu devri aşamaları sözleşme önerisi olarak etiketlenmelidir. Uzman ve GİB oran tablosu doğrulaması alınmadan yayımlanmaz.',
    level: 'L1',
    status: 'roadmap',
    stream: 'C',
    evidence: {
      modulePath: 'src/lib/kat-karsiligi.ts',
      goldenTestPath: 'src/lib/kat-karsiligi.test.ts',
      officialSource: {
        institution: 'Gelir İdaresi Başkanlığı / 3065 sayılı KDV Kanunu / 6306 sayılı Kanun',
        documentTitle: 'Konut teslimlerinde KDV oranları ve 6306 kapsamındaki teslimler',
        articleOrTable: 'Doğrulanacak: GİB güncel KDV oran tablosu',
        publicationDate: '2026-10-17',
      },
    },
    planIds: ['quote_site', 'bim_5d_smartcheck', 'enterprise_epys'],
  },
  {
    id: 'yambis-muteahhitlik-grubu-calculator',
    title: 'Müteahhitlik Yetki Belgesi Grubu Danışmanı (Yol Haritasında)',
    shortClaim:
      'Mali rasyoların ve iş deneyiminin yönetmelik tablolarıyla karşılaştırılarak yetki belgesi grubu ön değerlendirmesi (Yol Haritasında; yönetmelik tabloları doğrulanıyor).',
    longDescription:
      'Motor (src/lib/yambis-classification.ts) mevcuttur ancak halka açık değildir: grup sınırları ve eşikler Yapı Müteahhitlerinin Sınıflandırılması Yönetmeliği’nin güncel konsolide metnindeki TL tutarları ve ek tablolarla birebir eşleştirilmeden yayımlanmaz.',
    level: 'L1',
    status: 'roadmap',
    stream: 'C',
    evidence: {
      modulePath: 'src/lib/yambis-classification.ts',
      goldenTestPath: 'src/lib/yambis-classification.test.ts',
      officialSource: {
        institution: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı',
        documentTitle: 'Yapı Müteahhitlerinin Sınıflandırılması ve Kayıtlarının Tutulması Hakkında Yönetmelik (konsolide, Mayıs 2026)',
        articleOrTable: 'Doğrulanacak: m.8, m.9, m.20 ve ek tablolar',
        publicationDate: '2026-05-22',
      },
    },
    planIds: ['bim_5d_smartcheck', 'enterprise_epys'],
  },
] as const;

export function getLiveCapabilities(): CapabilityRecord[] {
  return CAPABILITY_REGISTRY.filter((cap) => cap.status === 'live');
}

export function getPilotCapabilities(): CapabilityRecord[] {
  return CAPABILITY_REGISTRY.filter((cap) => cap.status === 'pilot');
}

export function getRoadmapCapabilities(): CapabilityRecord[] {
  return CAPABILITY_REGISTRY.filter((cap) => cap.status === 'roadmap');
}
