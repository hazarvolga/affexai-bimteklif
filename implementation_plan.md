# BIMPlan Academy 36+ Detaylı Alt Rehber & İnteraktif Mühendislik Sayfaları Uygulama Planı

Bu plan, BIMPlan Academy bünyesindeki 6 ana ders modülünde (`iso-19650`, `4d-5d`, `sustainability-6d`, `scan-to-bim`, `security-field`, `bim-core`) yer alan tüm yüzeysel liste maddelerini tıklanabilir hale getirerek, zengin formüller, tablolar, şemalar ve uygulama rehberleri içeren interaktif **Detaylı Alt Sayfa / Drawer / Modal Sistemine** dönüştürür.

---

## 🏛️ 1. Modüller ve Detay Rehber Veri Yapısı Design (`src/academy/subGuidesData.ts`)

Her modül alt maddesi için aşağıdaki zengin mühendislik yapısını içeren bir `SubGuide` veri modeli oluşturulacaktır:

```typescript
export interface SubGuide {
  id: string;
  moduleSlug: string; // e.g. 'iso-19650'
  subTopicKey: string; // e.g. 'eir-template'
  title: string;
  badge: string;
  summary: string;
  formulaOrRule?: string; // LaTeX / Math formula or rule specification
  standards: string[];
  tables?: { headers: string[]; rows: string[][] }[];
  keyTakeaways: string[];
  practicalCaseStudy: string;
  teklifProIntegrationNote: string;
}
```

### 📋 6 Ana Modül İçin Hazırlanacak 24+ Zengin Alt Rehber İçerik Listesi

#### 1️⃣ MODÜL: `/academy/iso-19650` (ISO 19650 & Bilgi Yönetimi)
1. **OIR, PIR, AIR, EIR Şablonları & 8 Adımlı Bilgi Teslim Süreci:**
   - *Formül / Şema:* $\text{OIR} \rightarrow \text{PIR} \rightarrow \text{AIR} \rightarrow \text{EIR} \rightarrow \text{BEP} \rightarrow \text{TIDP/MIDP} \rightarrow \text{PIM} \rightarrow \text{AIM}$
   - *Tablo:* OIR/PIR/AIR/EIR Sorumlusu, İçeriği ve ISO 19650-2 Adımı Kıyaslaması.
2. **PIM'den AIM'e Geçiş, openBIM IFC 4.0 & COBie 2.4 Tablo Matrisi:**
   - *Formül / Şema:* $\text{IFC Class} (\text{IfcAsset}, \text{IfcSpace}) \rightarrow \text{COBie Component/Type/Space Sheet}$
   - *Tablo:* COBie 2.4 Sheet Yapısı, Zorunlu IFC Özellik Setleri (Pset_ManufacturerTypeInformation).
3. **ISO 19650-5 RBAC Yetki Matrisi & CDE Bilgi Güvenliği:**
   - *Tablo:* WIP, Shared, Published, Archived durumları için Mimar, Statikçi, MEP ve İşveren Okuma/Yazma/Onay (R/W/A) Matrisi.
4. **EN 17412-1 LOIN (LOG vs LOI Bilgi İhtiyacı Seviyesi):**
   - *Formül / Şema:* $\text{LOIN} = \text{LOG (Geometri)} + \text{LOI (Alfanümerik Veri)} + \text{DOC (Dokümanlar)}$
   - *Tablo:* LOG 100–500 ve LOI 100–500 Karşılaştırma Matrisi ve Brutal Truth Model Kasma Analizi.

#### 2️⃣ MODÜL: `/academy/4d-5d` (TeklifPro 4D / 5D Maliyet Mühendisliği)
1. **GUID & Primavera P6 / MS Project Entegrasyonu ile 4D Lojistik:**
   - *Formül / Şema:* $\text{Model Object (IfcBeam GUID)} \leftrightarrow \text{Primavera P6 Activity ID}$
   - *Tablo:* 4D Şantiye Fazlama, Kule Vinç Çakışma ve İskele Kurulum Lojistik Matrisi.
2. **Kazanılmış Değer Yönetimi (EVM):**
   - *Formüller:*
     - $\text{Cost Variance (CV)} = \text{EV} - \text{AC}$
     - $\text{Schedule Variance (SV)} = \text{EV} - \text{PV}$
     - $\text{CPI} = \frac{\text{EV}}{\text{AC}} \quad (\text{CPI} < 1 \Rightarrow \text{Bütçe Aşımı})$
     - $\text{SPI} = \frac{\text{EV}}{\text{PV}} \quad (\text{SPI} < 1 \Rightarrow \text{Gecikme})$
   - *Tablo:* EVM Performans Endeksleri ve Şantiye Müdahale Senaryoları.
3. **Götürü Bedel vs Teklif Birim Fiyat Risk Motoru:**
   - *Formül:* $\text{Teklif Bedeli} = \text{Net Maliyet} \times (1 + \text{Volatilite \%}) + \text{Risk Primi (LOD/Clash/Karbon)}$
   - *Tablo:* Müteahhit Risk Matrisi, Belirsizlik Katsayıları.
4. **Minha Kuralları Kıyaslaması (Türkiye ÇŞB vs Almanya DIN 18350):**
   - *Formül:*
     - Türkiye ÇŞB: $\text{Net Metraj} = \text{Brüt Hacim} - \sum \text{Tüm Boşluklar}$
     - Almanya DIN 18350: $\text{Net Metraj} = \text{Brüt Hacim} - \sum (\text{Boşluk} > 2.50\text{ m}^2)$
   - *Tablo:* ÇŞB ve DIN 18350 Kesit Kıyaslaması ve İhale Kârlılık Etkisi.

#### 3️⃣ MODÜL: `/academy/sustainability-6d` (6D Sürdürülebilirlik & Karbon)
1. **ISO 52000-1: BEM & EPW İklim Verisi Simülasyonu:**
   - *Formül:* $Q_{\text{ısıtma}} = U \cdot A \cdot (T_{\text{iç}} - T_{\text{dış}}) \cdot \Delta t$
   - *Tablo:* Yapı Kabuğu U-Değerleri ($W/m^2K$) ve EPW İklim Verisi Parametreleri.
2. **Yaşam Döngüsü Analizi (LCA Beşikten Mezara - ISO 14040/14044):**
   - *Tablo:* A1-A3 (Üretim), A4-A5 (İnşaat), B1-B7 (Kullanım), C1-C4 (Yıkım), D (Geri Dönüşüm) Aşama Matrisi.
3. **Karbon Analizi: Gömülü Karbon vs Operasyonel Karbon (PAS 2080):**
   - *Formül:* $\text{Toplam GWP} = \sum (M_i \cdot \text{EF}_i) + \sum (E_{\text{yıllık}} \cdot \text{EF}_{\text{şebeke}} \cdot L)$
   - *Tablo:* Malzeme Bazlı Gömülü Karbon Katsayıları ($kg CO_2eq / kg$).
4. **Yeşil Bina Sertifikasyonları (LEED v4.1, BREEAM, EDGE):**
   - *Tablo:* LEED Kredi Başlıkları ve IFC Modelinden Otomatik Aktarılan Özellikler.

#### 4️⃣ MODÜL: `/academy/scan-to-bim` (AI, Scan-to-BIM & Dijital İkiz)
1. **LOA Tolerans Standartları (USIBD LOA 10/30/50):**
   - *Tablo:* LOA 10 ($\pm 50\text{ mm}$), LOA 30 ($\pm 15\text{ mm}$), LOA 50 ($\pm 1\text{ mm}$) Tolerans & Kullanım Senaryoları.
2. **Nokta Bulutu - BIM Model Kıyaslaması & Deformasyon Heatmap:**
   - *Formül:* $d_p = |(\vec{P} - \vec{Q}) \cdot \hat{n}|$ (Nokta-Yüzey Mesafesi Deformasyonu)
   - *Tablo:* Deformasyon Tolerans Matrisi (Yeşil: Uyumlu, Sarı: İncele, Kırmızı: İhlal).
3. **NSGA-II Üretken Tasarım Optimizasyonu:**
   - *Formül:* $\min f_1(x) = \text{Maliyet}, \quad \min f_2(x) = -\text{Gün Işığı Oranı}$
   - *Tablo:* Pareto Optimal Çözümler Kümesi.
4. **İnsan Onayı & Kanıt Kaydı (Audit Trail):**
   - *Tablo:* AI Önerileri Onay Hiyerarşisi ve Dijital İmza Kaydı.

#### 5️⃣ MODÜL: `/academy/security-field` (Sözleşme, Saha & Güvenlik)
1. **ISO 19650-5 CDE İzin Matrisi:**
   - *Tablo:* Disiplin Bazlı CDE Rol Erişim Yetkileri.
2. **e-Ruhsat, ARC & GeoBIM İmar Kural Denetimi:**
   - *Formüller:* $\text{TAKS} = \frac{\text{Taban Alanı}}{\text{Parsel Alanı}}, \quad \text{KAKS (Emsal)} = \frac{\text{Toplam İnşaat Alanı}}{\text{Parsel Alanı}}$
   - *Tablo:* Otomatik İmar ve Yangın Koridoru Mesafe Kontrolleri.
3. **VDC & Clash Matrisi (Hard, Soft & 4D Clash):**
   - *Tablo:* Hard Clash, Soft Clash ve 4D Lojistik Çakışma Raporlama (BCF).
4. **Donatı LOD 400, BVBS Kodları & 12m Çelik Boy Fire Analizi:**
   - *Formül:* $\text{Fire \%} = \frac{12.00\text{m} - \sum L_{\text{parça}}}{12.00\text{m}} \times 100$
   - *Tablo:* BVBS Kesim Şekil Kodları ve Donatı Optimasyon Rehberi.

#### 6️⃣ MODÜL: `/academy/bim-core` (BIM Core Akademik Müfredat)
1. **BIM501: AEC Ontolojisi & Varlık Yönetimi:**
   - *Tablo:* DIKW AEC Varlık Şeması.
2. **BIM502: LOIN Detaylandırma Rehberi:**
   - *Tablo:* LOG ve LOI Seviyelerine Göre İhale ve Şantiye Veri Matrisi.
3. **BIM503: openBIM, IFC 4.0 Schema & BCF Issue Akışı:**
   - *Tablo:* IFC Sınıf Hiyerarşisi ve BCF Raporlama Şeması.
4. **BIM504: BEP, TIDP, MIDP ve RACI Matrisi:**
   - *Tablo:* BEP Şablon Maddeleri ve RACI Görev Dağılım Matrisi.

---

## 🛠️ 2. Arayüz ve UI Bileşeni Tasarımı

1. **`PublicAcademyDetail.tsx` Tıklanabilir Liste Maddeleri (Interactive List Items):**
   - Her modül alt başlığının sağında *"Detaylı Rehberi Aç / İncele"* ikonu ve butonu yer alacak.
   - Liste maddesine tıklandığında ekranın sağından açılan zengin bir **Drawer / Modal Panel** (`SubGuideDrawer.tsx`) gösterilecek.
2. **`SubGuideDrawer.tsx` Ayrıntı Paneli Bileşeni:**
   - Modül başlığı, rozeti, ISO standart kodları.
   - LaTeX Math Formül Kutusu (KaTeX/MathJax stili temiz visual box).
   - Zengin Karşılaştırma ve Parametre Tabloları.
   - Pratik Saha Örneği ve **TeklifPro Entegrasyonu** yönlendirme aksiyonu ("TeklifPro'da Test Et").
3. **Doğrudan URL Rotası Desteği:**
   - URL `query` parametresi: `/academy/:slug?guide=:subTopicKey` (Örn: `/academy/iso-19650?guide=eir-template`, `/academy/4d-5d?guide=evm-calculator`, `/academy/security-field?guide=bvbs-codes`).

---

## 🔍 3. Uygulama ve Doğrulama Adımları

1. **`src/academy/subGuidesData.ts` Oluşturulması:** 24+ detaylı rehber nesnesi.
2. **`src/components/academy/SubGuideDrawer.tsx` Oluşturulması:** Sağdan kayan zengin mühendislik detay çekmecesi.
3. **`src/pages/PublicAcademyDetail.tsx` Güncellenmesi:** Tıklanabilir madde eventleri ve URL senkronizasyonu.
4. **Statik Tip Kontrolü ve Derleme Testi:** `export PATH=$PATH:...; pnpm run lint` & `pnpm run build` ile 0 hata doğrulaması.
5. **Graphify Güncellemesi:** `graphify update .` ile AST bilgi grafiğini yenileme.
