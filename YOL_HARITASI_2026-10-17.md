# BIMMetraj Geliştirme Yol Haritası — Vaat ↔ Kod Hizalaması ve Production-Ready

17 Ekim 2026 · `main` @ `116c7de` · Canlı: `f7aa3d5`

Bu belge bir plandır; kodda değişiklik yapılmamıştır. Hedef iki şey: (1) vitrinde söylediğimiz her şeyin kodda **doğrulanmış** karşılığı olsun, (2) BIMMetraj en kısa sürede güvenle satılabilir (production-ready) olsun. İş, birbirini beklemeyen paralel akışlara bölündü.

---

## 0. Özet

1. Diğer ajan vaatleri silmek yerine motorları yazmayı seçmiş. Doğru bir yön, ama **üç motordan ikisi vaadi gerçekte karşılamıyor**:
   - **KİK aşırı düşük teklif motoru yönetmelikten farklı hesaplıyor.** Ekranda da rakip teklifler ve yaklaşık maliyet **uydurularak** gösteriliyor.
   - **ISO 19650 kontrolünde CDE durumu, uygunluk ve revizyon kodu sabit yazılmış.** Kat bilgisi eksikse "Zemin Kat" varsayılıyor; bu da bilgi tamlığı skorunu şişiriyor.
   - **4,00 m² minha profili kaynaksız.** Vitrindeki sayıyı doğru göstermek için kural üretilmiş.
2. Bu 6 commit push edilmiş ama **deploy edilmemiş**; canlıda hâlâ `f7aa3d5` var. KİK ve ISO 19650 düzeltilmeden deploy edilmemeli.
3. Bir test kırık: `production-frontend.test.ts` hâlâ `/quotes/123` için 200 bekliyor, yeni 404 kuralı 404 dönüyor. CI (`pnpm verify`) kırmızı olacak.
4. Fiyat ve poz tarafında **birbirine bağlı olmayan üç fiyat sistemi** var. Gömülü ÇŞB kataloğu resmî listelerin yalnız **%2–12'sini** içeriyor. Geçerlilik tarihleri de büyük olasılıkla yanlış.
5. Önerilen çözüm:
   - **Yetenek Kaydı + Kanıt Kapısı:** Bir iddia ancak resmî örnekle doğrulanmış (seviye L3) bir motora bağlıysa "canlı" yazılabilir.
   - **Fiyat Kitabı mimarisi:** Fiyatlar kurum + dönem bazında sürümlenen, değiştirilemeyen kitaplarda tutulur.
   - **6 paralel akış ve 4 faz.**

---

## 1. Diğer ajanın işinin doğrulaması

| Commit | İddia | Doğrulama | Sonuç |
| --- | --- | --- | --- |
| `589ea6e` | SEC-2: 50 MB ayrıştırıcı yetkinin arkasına; impersonation fail-closed; SEC-8/9 başlıkları | `pricing-file-import.ts`: `authenticate → checkSuperAdmin → requireVerifiedEmail → express.json(50mb)` | ✅ Doğru |
| `eb33bc0` | Fontlar self-host, Geist ve Google Fonts kaldırıldı | `@fontsource` paketleri; `main.tsx` Google enjeksiyonu silindi | ✅ Doğru (canlıda değil) |
| `ecfec50` | Grafik paketi ayrıldı, fixture taşındı, 404, yinelenen rota | Ana paket 462 → 355 kB (gzip 139 → 113 kB); `calibrated-2026-45-fixture.ts` ayrı dosya; bilinmeyen yol 404 | ✅ Doğru, ama 1 test kırık (bkz. K-4) |
| `c78683e` | ISO 19650 + LOIN motoru, KİK m.38 motoru, 4 m² minha, BUG-1, JSON-LD | Ayrıntı aşağıda | ❌ **Kısmen hatalı, deploy edilmemeli** |
| `142aa71`, `116c7de` | Ajan hafızası / handoff | — | ✅ |

**Testler (yerel):** 812 test, 753 geçti. 46 test izole veritabanı olmadığı için bilerek reddedildi; 1 test gerçekten kırık (K-4). `tsc` 0 hata, Python 53/53, `vite build` başarılı.

### Kritik bulgular

| ID | Önem | Bulgu | Kanıt | Gereken |
| --- | --- | --- | --- | --- |
| **K-1** | **P0** | KİK sınır değer formülü yönetmelikten farklı | [kik-adt.ts](src/lib/kik-adt.ts): (a) yalnız `teklif ≤ YM` alınıyor; mevzuatta YM'nin **%40'ı ile %120'si** arasındaki teklifler alınır. (b) Altyapı için `N = 0,80`; mevzuatta diğer yapım işleri için **1,20**. (c) `SD = R × YM`, `R = C × N`; bu, N = 1'de SD'yi düzeltilmiş ortalamaya (Tort2) eşitler. Mevzuattaki yapı K katsayısı ve `Tort2 / (C × N)` üzerinden ilerler | Formül, Kamu İhale Genel Tebliği m.45 ve Yapım İşleri İhaleleri Uygulama Yönetmeliği'nin **güncel resmî metninden** yeniden kurulmalı. Doğrulama: `yuksek-muhendis-mimar` + KİK'in yayımladığı örnek hesap ile birebir golden test |
| **K-1b** | **P0** | KİK ekranı veri uyduruyor | [CalmIfcWorkspace.tsx:108-118](src/components/smartcheck/CalmIfcWorkspace.tsx:108): `YM = doğrudan maliyet × 1,25`, rakip teklifler `YM × 0,84 / 0,88 / 0,92` | Kullanıcıya gerçekmiş gibi bir sınır değer gösteriliyor. YM ve geçerli teklifler **kullanıcı girişi** (veya EKAP ihale sonucu) olmalı; veri yoksa hesap gösterilmemeli |
| **K-2** | **P0** | ISO 19650 kontrolü sabit girdiyle çalışıyor | [ifc-rule-run.ts](src/smartcheck/rules/ifc-rule-run.ts): `cdeState: "SHARED"`, `suitabilityCode: "S3"`, `revisionCode: "P01.01"` sabit; `storey ?? "Zemin Kat"`, `guid ?? "row-N"` | CDE, uygunluk ve revizyon kontrolleri her dosyada aynı sonucu verir. Kat ve GUID varsayımları tamlık skorunu şişirir. Bu değerler doküman meta verisinden gelmeli; yoksa "değerlendirilmedi" denmeli |
| **K-3** | P1 | 4,00 m² minha profili kaynaksız | `minha.ts`: `CSB_FORMWORK_4M2` "Özel Şartname / Dış Cephe İskele & Kalıp" | Somut şartname maddesi ve tarih yoksa profil kaldırılmalı veya "kullanıcı tanımlı eşik" yapılmalı. Vitrinden 4,00 m² çıkarılmalı |
| **K-4** | P1 | CI kırık | `production-frontend.test.ts:44` `/quotes/123` için 200 bekliyor; uygulamada böyle bir genel rota yok, 404 doğru davranış | Test beklentisi güncellenmeli |
| **K-5** | P1 | Vitrin bu hatalı motorları "canlı" diye anlatıyor | `llms.txt` "N=0,80 Altyapı" diyor; JSON-LD FAQ ve Landing ISO 19650 "denetimi" diyor | Deploy edilmeden düzeltilmeli; aksi hâlde yanlış mevzuat bilgisi AI motorlarına yayılır |

**Ders:** "Vaadi koda dökmek" ile "vaadi doğrulamak" aynı şey değil. Bir motor yazmak L1'dir; vitrinde "canlı" demek için resmî örnekle doğrulama (L3) gerekir. Aşağıdaki Yetenek Kaydı bu boşluğu kalıcı olarak kapatmak için.

---

## 2. Vaat ↔ kod hizalama matrisi

**Seviyeler:**

| Seviye | Anlamı |
| --- | --- |
| L0 | Yalnız metin |
| L1 | Motor var, birim testli |
| L2 | Gerçek kullanıcı verisiyle akışa bağlı |
| L3 | Resmî kaynak / örnekle doğrulanmış, uzman onaylı |
| L4 | Pilot müşteride kanıtlanmış |

Vitrinde **"canlı" yalnız L3+**, "pilot" L2, "yol haritası" L0–L1.

| Vaat | Bugün | Hedef | Açık | Akış |
| --- | --- | --- | --- | --- |
| IFC 2x3/4/4.3 metraj (QTO) | L2 | L4 | Pilot kanıtı | B |
| Çok katmanlı `IfcCovering` ayrıştırma, süpürgelik mtül, daire cetveli | L2 | L3 | Bağımsız bir modelle elle sayım karşılaştırması | B |
| Donatı / kalıp | L1 (tahmin) | L3 | TS 708 / TS 500 motoru; şimdilik "tahmini" etiketi doğru | B |
| SmartCheck 3x3 (şirket politikası) | L2 | L3 | Kural sürümü ve kaynağı rapor çıktısında görünsün | B |
| Minha ÇŞB 0,50 / DIN 2,50 m² | L2 | L3 | Resmî tarif maddesiyle golden test | B |
| Minha 4,00 m² | L0 (kaynaksız) | — | K-3 | B |
| ISO 19650 adlandırma | L2 | L3 | RG 33331 EK-2 ile birleşik tek ayrıştırıcı | B |
| ISO 19650 CDE / uygunluk / revizyon | **L0 (sabit)** | L2 → L3 | Doküman durum makinesi (Faz 2) | B |
| LOIN tamlığı | L1 (şişik) | L3 | Varsayılanlar kaldırılsın | B |
| KİK sınır değer | **L1 (hatalı)** | L3 | K-1 / K-1b | B |
| KİK %80 sıralı iş kalemleri | L1 | L3 | Birim fiyat / götürü bedel ayrımı; resmî örnekle test | B |
| RG 33331 e-PYS EK-9 ön kontrol | L2 | L3 | EK-6 / EK-3 satır satır doğrulama; Bakanlık görüşü | B |
| PDF/A **ön kontrol** (beyan okuma) | L2 | L3 | veraPDF ile gerçek doğrulama | B |
| PDF/A **üretimi** | L0 | L3 | Ghostscript PDF/A-2b + veraPDF | B |
| ÇŞB 2026 poz / rayiç kataloğu | L1 (%2–12 kapsam) | L3 | §4 Fiyat Kitabı | C |
| Firma fiyat hafızası, eskalasyon, kârlılık | L2 | L3 | Eskalasyon formülü uzman onayı | C |
| AI destekli işlemler | L0 (anahtar yok) | L2 | Sağlayıcı + eval seti + maliyet tavanı | D |
| Kartla ödeme | L0 | L3 | Sağlayıcı kararı | D |

---

## 3. Kalıcı mekanizma: Yetenek Kaydı ve Kanıt Kapısı

**Yetenek Kaydı** (`src/capabilities/registry.ts`, tek kaynak) — her satırda:
- `id`, vitrin metni (kısa ve uzun),
- `level` (L0–L4), `status` (`live` / `pilot` / `roadmap`),
- `evidence`: modül yolu, golden test dosyası, resmî kaynak (kurum, belge, madde, yayın tarihi, SHA-256),
- `reviewer`: uzman adı, disiplin, onay tarihi,
- `planIds`: hangi paketlerde var.

**Bu kayıttan otomatik üretilenler:** Landing özellik kartları, `llms.txt`, JSON-LD `featureList`/FAQ, `/admin/roadmap` durum tablosu, paket karşılaştırma tablosu.

**CI kapısı (yeni test):**
- `status = live` olan her satırın `level ≥ L3` olması, golden testinin var ve geçiyor olması, `reviewer.approvedAt` dolu olması.
- `src/` içinde `llms.txt`, `index.html` ve Landing dışında elle yazılmış özellik iddiası olmaması (basit metin taraması).
- Hesap motorlarında "sabit girdi" yasağı: kural motoruna giden CDE/standart/YM gibi alanlar literal olamaz (lint kuralı veya test).

**Uzman onay kapısı:** Hesap modülüne (`src/lib/*calc*`, `src/smartcheck/rules/*`, `kik-*`, `minha*`, `financial-*`) dokunan PR'lar `CODEOWNERS` ile insan mühendis onayı ister. `CLAUDE.md` gereği `yuksek-muhendis-mimar` doğrulaması PR açıklamasına eklenir.

---

## 4. Fiyat ve poz kaynakları (`/admin/pricing-sources`) — ayrı tasarım

### 4.1 Mevcut durum

| Katman | Tablolar / dosyalar | Ne yapıyor | Sorun |
| --- | --- | --- | --- |
| A. Platform kataloğu | `pricing_data_sources`, `price_feed_staging`; `PricingSources.tsx` (1.842 satır); `csb-pdf-parser.ts`; lisanslı CSV; tarayıcı (`priceCrawlerService`, gece 03:00) | Süper admin kaynak tanımlar, PDF/CSV/HTML'den fiyat çeker, onaylar | Fiyatlar **dönem (fiyat kitabı)** olarak değil tek tek satır olarak duruyor; staging = canlı karışık |
| B. Tenant fiyatları | `price_sources`, `price_snapshots`; teklif fiyat kilidi (`/api/quotations/:id/pricing-snapshot/lock`) | Firma kendi resmî referans, tedarikçi, gerçekleşen, endeks, elle fiyatlarını tutar; teklif kilitlenir | İyi tasarlanmış (kaynak türü, KDV/nakliye durumu, güven, onay, hash). A ile bağlantısı yok |
| C. Resmî kaynak alımı (Faz 4) | `source_intelligence_adapters`, `source_ingestion_runs/artifacts`, `source_review_items` | Resmî kaynak adaptörleri + inceleme kuyruğu | A ile işlev çakışması |
| D. Piyasa zekâsı | `market-intelligence` | Tedarikçi teklifleri, aykırı değer, onaylı | Ayrı ekran |

**Gömülü ÇŞB kataloğu** (`src/server/crawler/data/csb-2026-official-catalogs.json`):

| Liste | PDF'te bulunan | Kodda | Kapsam |
| --- | --- | --- | --- |
| 2026 Mart İnşaat Birim Fiyat | 1.861 | 220 | %12 |
| 2026 Mart İnşaat Rayiç | 5.360 | 150 | %3 |
| 2026 Mart Mekanik Birim Fiyat | 5.679 | 140 | %2 |
| 2026 Mart Elektrik Birim Fiyat | 5.910 | 140 | %2 |
| Yapı Yaklaşık Birim Maliyetleri 2026 | 18 | 18 | %100 |

**Diğer sorunlar:**
- **Geçerlilik tarihi:** "Mart ayı güncel" listelerin geçerliliği `2026-03-01 → 2026-12-31` girilmiş. Aylık güncellenen bir liste Aralık'a kadar geçerli sayılırsa teklif eski fiyatla çıkar. Yayın kuralı ÇŞB duyurusundan teyit edilmeli.
- **CSV sınırı:** 500 satır / 500 KB; tek bir ÇŞB listesi bunun 4–12 katı.
- **Poz ana verisi yok:** Poz tanımı (tarif, birim, analiz), fiyattan ayrı bir varlık değil; kurum (ÇŞB, KGM, DSİ, İller Bankası…) ve dönem birinci sınıf alan değil.
- **Analiz / rayiç ilişkisi yok:** Firma kendi rayiçleriyle birim fiyat türetemiyor.
- **Lisans:** 13 Ekim raporu, ÇŞB YFK verisinin ticari kullanımı için yazılı izin gerektiğini not etmişti; durumu belirsiz.
- **Kapsam ölçümü yok:** Tekliflerde kullanılan pozların yüzde kaçının geçerli bir resmî fiyatı var, görünmüyor.

### 4.2 Hedef mimari: Fiyat Kitabı (Price Book)

```
Kurum (ÇŞB, KGM, DSİ, İLBANK, ...)
 └─ Fiyat Kitabı  [kurum + tür + dönem + yayın no]  — değiştirilemez, sürümlü, SHA-256
      ├─ Poz satırları   (poz no, tanım, birim, fiyat, tarif ref., analiz ref.)
      ├─ Rayiç satırları (malzeme / işçilik / makine)
      └─ Analizler       (poz = Σ rayiç × miktar + kâr/genel gider oranı)
Endeks Serileri (TÜİK ÜFE, İnşaat Maliyet Endeksi, eşleştirme tabloları)
Tenant katmanı (mevcut B):
 ├─ Tedarikçi teklifleri, gerçekleşen maliyetler, elle fiyatlar
 ├─ Firma rayiç seti → firma birim fiyatı (analizden yeniden hesap)
 └─ Fiyat Çözümleme Politikası → teklif satırı (kaynak etiketiyle) → teklif kilidi
```

**Fiyat çözümleme politikası** (tenant ayarlanabilir; her teklif satırında kaynak rozeti):
1. Firma gerçekleşen maliyeti (≤ 6 ay)
2. Onaylı tedarikçi teklifi (geçerlilik içinde)
3. Firma rayiçleriyle yeniden hesaplanmış analiz
4. Geçerli resmî fiyat kitabı (dönem içinde)
5. Resmî fiyat × endeks güncellemesi (dönem dışıysa, açık etiketle)
6. Fiyat yok → satır `needs_price`; **asla sessiz varsayılan yok**

### 4.3 Alım (ingestion) hattı

1. **Lisans kaydı:** Her kaynak için izin belgesi, kapsam (iç kullanım / tenant'lara dağıtım), bitiş tarihi. İzin yoksa kaynak yalnız **BYOL** modunda açılır: tenant kendi dosyasını yükler, platform yalnız ayrıştırır, veri o tenant'ta kalır.
2. **Belge yükleme:** PDF/XLSX → R2; SHA-256; yayın tarihi ve dönem meta verisi.
3. **Kurum + format bazlı ayrıştırıcı adaptörü:** Mevcut `csb-pdf-parser` genişletilir; satır sınırı kalkar, iş kuyruğunda (Graphile) çalışır.
4. **Otomatik doğrulama:**
   - Ayrıştırılan satır sayısı = PDF'teki sayım (±0),
   - Poz no biçimi ve benzersizlik,
   - Birim sözlüğü,
   - Önceki döneme göre fiyat sıçraması > eşik ise işaret,
   - Analizden yeniden hesaplanan fiyat ile yayımlanan fiyat farkı.
5. **İstisna bazlı insan onayı:** Yalnız işaretli satırlar incelenir, kalanı toplu onaylanır. Her yayında rastgele 30 satır elle örneklenir ve sonuç kaydedilir.
6. **Yayın:** Fiyat kitabı `published` olur, değiştirilemez. Hata çıkarsa yeni sürüm yayımlanır, eskisi `superseded` olur. Kilitli teklifler eski sürüme bağlı kalır.
7. **Tazelik izleme:** Beklenen yayın tarihi geçtiyse yönetici uyarısı; tenant'ta "fiyat kitabı güncel değil" bandı.

### 4.4 `/admin/pricing-sources` ekranının yeniden kurgusu

1.842 satırlık tek sayfa altı sekmeye bölünür:

| Sekme | İçerik |
| --- | --- |
| Kurumlar & Lisanslar | İzin belgesi, kapsam, bitiş tarihi uyarısı |
| Fiyat Kitapları | Kurum × dönem matrisi; durum (taslak / doğrulanıyor / yayında / eskidi) |
| İçe Aktarma | Sürükle-bırak, adaptör seçimi, ilerleme |
| Doğrulama & Onay | İstisna listesi, toplu onay, örnekleme kaydı |
| Kapsam Raporu | Kitap başına satır kapsamı; tekliflerde kullanılan pozların fiyat kapsamı; tazelik |
| Endeksler | TÜİK serileri, eşleştirme tabloları |

### 4.5 Veri modeli birleştirme

- **A** → "Fiyat Kitabı" katmanına dönüşür: `price_books`, `price_book_items`, `price_book_rayic`, `price_book_analyses` tabloları eklenir; `price_feed_staging` yalnız hazırlık alanı olur.
- **C** (source intelligence), A'nın alım hattına adaptör olarak katılır; ayrı inceleme kuyruğu kaldırılır.
- **B** aynen kalır; `official_reference` türü artık fiyat kitabı satırına referans verir (kopya değil).
- **D**, B'deki `supplier_quote` kaynağını besler.
- Göç: önce okuma tarafı (çözümleme politikası) yeni modele geçer, sonra yazma; eski tablolar bir sürüm boyunca salt-okunur kalır.

### 4.6 Kabul kriterleri

- ÇŞB 2026 İnşaat, Mekanik ve Elektrik birim fiyat listelerinde satır kapsamı **%100**, birim uyuşmazlığı **0**, 30 satırlık el örneklemesinde hata **0**.
- Geçerlilik tarihleri ÇŞB yayın kuralıyla belgelenmiş.
- Her teklif satırında fiyat kaynağı rozeti; kilitli teklif yeni kitap yayımlansa da değişmiyor; "yeni fiyatla yeniden hesapla" fark raporu veriyor.
- Lisans kaydı olmayan kaynak tenant'lara dağıtılamıyor (test).

---

## 5. Paralel akışlar

| Akış | Sahip alan (dosya sahipliği) | Amaç |
| --- | --- | --- |
| **A. Güvenilirlik & Release** | `.github/`, `compose.coolify.yaml`, `src/server/app.ts`, `src/server/middleware/`, testler | CI hep yeşil, kesintisiz deploy, E2E smoke, DB rolü, güvenli oturum |
| **B. Mühendislik motorları & Vaat hizası** | `src/lib/kik-*`, `src/smartcheck/rules/`, `src/ifc/`, `workers/ifc/`, `src/capabilities/` | K-1…K-3, Yetenek Kaydı, L3 doğrulamaları |
| **C. Fiyat & Poz** | `src/server/crawler/`, `src/server/routes/pricing*`, `src/services/pricing/`, `src/pages/admin/PricingSources*`, ilgili şema | §4 |
| **D. Ticari** | `src/services/billing/`, `Billing.tsx`, hukuk metinleri | Tahsilat, pilot kanıtı, sözleşmeler |
| **E. Görünürlük (SEO/GEO)** | `index.html`, `web-hardening.ts` (llms/sitemap), prerender | Yetenek Kaydı'ndan üretilen içerik, prerender, `og:image` |
| **F. UI/UX** | `src/index.css`, `DESIGN.md`, sayfa bileşenleri (B/C'nin dosyaları hariç) | Token göçü, tipografi tabanı |

**Çakışma kuralları:**
- Her akış kendi worktree'sinde çalışır ve PR ile birleşir.
- `src/db/schema.ts` ve migration'lar tek sırayla ilerler: C önce, diğerleri rebase eder.
- `LandingPage.tsx` yalnız E'ye aittir; F oraya ancak E'den sonra dokunur.
- `roadmap-content.ts` ve `calculation-*.ts` (AGENTS.md zorunluluğu) her PR'da güncellenir. Çakışmayı azaltmak için her akış yalnız kendi revizyon satırını ekler.

---

## 6. Fazlar

### Faz 0 — Kanamayı durdur (0–3 gün)

| # | İş | Akış | Kabul |
| --- | --- | --- | --- |
| 0.1 | `c78683e`'yi deploy etme; K-1b sahte girdiyi kaldır, KİK sekmesini "yakında" yap veya kullanıcı girişine çevir | B | Ekranda uydurma sayı yok |
| 0.2 | K-2: ISO 19650 sabit girdileri kaldır; değer yoksa "değerlendirilmedi" | B | Testte sabit literal yok |
| 0.3 | K-3: 4,00 m² profilini kaldır veya kaynakla | B | — |
| 0.4 | K-4: kırık test | A | `pnpm verify` yeşil |
| 0.5 | Vitrin (llms, JSON-LD, Landing): KİK, ISO 19650 CDE ve PDF/A üretimi → "yol haritası"; N=0,80 bilgisini sil | E | Desteksiz iddia 0 |
| 0.6 | Fiyat kitabı geçerlilik tarihlerini düzelt (Mart listesi ≠ Aralık'a kadar) | C | ÇŞB yayın kuralıyla belgeli |
| 0.7 | Düzeltilmiş paketi deploy et; deploy sonrası smoke | A | `/api/health` revizyonu = HEAD |

### Faz 1 — Production-ready çekirdek (1–2 hafta)

| # | İş | Akış |
| --- | --- | --- |
| 1.1 | Kesintisiz deploy (Coolify rolling + healthcheck) ve Cloudflare özel 5xx sayfası | A |
| 1.2 | Playwright smoke: kayıt → teklif → PDF; IFC yükle → icmal; admin giriş | A |
| 1.3 | Runtime DB rolü (DML) ayrımı | A |
| 1.4 | Oturumu `HttpOnly` çereze taşı + CSRF | A |
| 1.5 | Yetenek Kaydı v1 + CI kapısı; vitrin metinleri kayıttan üretilsin | B + E |
| 1.6 | KİK motorunu resmî metinden yeniden kur; KİK örnek hesaplarıyla golden test; uzman onayı | B |
| 1.7 | Fiyat Kitabı şeması + ÇŞB 2026 İnşaat BF tam alım (%100) + kapsam raporu | C |
| 1.8 | Lisans kararı (ÇŞB yazılı izin veya BYOL) | D (karar: Hazar) |
| 1.9 | Tahsilat sağlayıcı kararı ve sandbox | D |
| 1.10 | Genel rotalar için prerender, `og:image`, Organization varlık sinyalleri | E |

**Production-ready tanımı (Faz 1 sonunda hepsi ✓):**
- CI yeşil, E2E smoke yeşil.
- Deploy kesintisiz; geri alma prosedürü denenmiş.
- Vitrinde L3 altı "canlı" iddia yok.
- Satılan her paket özelliği L2+.
- Tahsilat (en az biri) uçtan uca çalışıyor; hukuk metinleri onaylı.
- Yedek + restore tatbikatı ≤ 30 gün önce.
- Sentry alarmı çalışıyor.
- DB rol ayrımı yapılmış; token'lar çerezde.

### Faz 2 — Vaatleri L3'e çıkar (3–6 hafta)

| # | İş | Akış |
| --- | --- | --- |
| 2.1 | ISO 19650 doküman durum makinesi: CDE (WIP/Shared/Published/Archived), uygunluk ve revizyon kodları doküman meta verisinde, geçiş kaydı; EK-2 ile tek adlandırma ayrıştırıcısı | B |
| 2.2 | LOIN: teslim aşamasına göre gereksinim şablonu (EIR'den) ve gerçek tamlık ölçümü | B |
| 2.3 | PDF/A-2b üretimi (Ghostscript) + veraPDF doğrulaması işçi konteynerinde | B |
| 2.4 | Mekanik / Elektrik BF ve Rayiç fiyat kitapları; analiz → firma birim fiyatı | C |
| 2.5 | TÜİK endeks serileri; eskalasyon ve fiyat farkı hesabının endekse bağlanması (uzman onayı) | C |
| 2.6 | `/admin/pricing-sources` 6 sekmeli yeniden kurgu | C + F |
| 2.7 | Tasarım token göçü: en çok ihlal içeren 10 sayfa; tipografi ≥ 11 px | F |
| 2.8 | İlk ücretli pilot: ölçülmüş metrikler (ilk teklif süresi, düzeltilen hata sayısı) → Yetenek Kaydı L4 | D |

### Faz 3 — Genişleme (6–12 hafta)

- Diğer kurum fiyat kitapları: KGM, DSİ, İller Bankası.
- KİK açıklama dosyası üretimi (analiz + rayiç belgeleriyle).
- Donatı ve kalıp motoru (TS 708 / TS 500) → L3.
- EK-6 / EK-3 tam satır doğrulaması; Bakanlık görüşüne göre kural güncellemesi.
- AI sağlayıcı + eval seti; mevzuat taraması.
- Akademi'nin yeniden açılması (tasarım göçü ve `dangerouslySetInnerHTML` temizliğinden sonra).

---

## 7. Sizden karar gereken konular

| Konu | Seçenekler | Önerim |
| --- | --- | --- |
| ÇŞB fiyat verisi lisansı | Yazılı izin al / BYOL / ikisi | İkisi: BYOL hemen, izin süreci paralel |
| KİK girdileri | Kullanıcı girer / EKAP sonucundan içe aktarım | Önce kullanıcı girişi; EKAP Faz 3 |
| ISO 19650 dili | "Uyumlu" / "destekler" | "Destekler"; "uyumlu" yalnız bağımsız değerlendirmeyle |
| 4,00 m² minha | Kaynak bul / kaldır / kullanıcı tanımlı eşik | Kullanıcı tanımlı eşik + kaynaklı hazır profiller |
| Tahsilat | iyzico / PayTR / Stripe TR | Türkiye kartları ve taksit için yerel sağlayıcı |
| Vitrindeki "yol haritası" özellikleri | Göster / gizle | Göster, tarihli "Yol haritasında" rozetiyle |

---

## Kaynaklar

- Sınır değer adımları (%40–%120 bandı, Tort1/Tort2, C) ve N katsayıları (Üstyapı 1,00 / diğer 1,20): [hakedis.org — Sınır değer hesaplama](https://www.hakedis.org/ihale-araclari/sinir-deger-hesaplama), [hakedis.org — Aşırı düşük teklif açıklama dosyaları](https://www.hakedis.org/asiri-dusuk-teklif-aciklama-dosyalarinin-hazirlanmasi), [Yapım İşleri İhaleleri Uygulama Yönetmeliği (30.11.2021)](https://www.alomaliye.com/2021/11/30/yapim-isleri-ihaleleri-uygulama-yonetmeligi-30-11-2021/), [Resmî Gazete 30 Aralık 2010 (Tebliğ metni)](https://www.turmob.org.tr/arsiv/mbs/resmigazete/27801-27801_6m%C4%B1ukerrer-13.doc)
- K katsayısı formülü bu taramada doğrulanamadı; K-1 düzeltmesi **KİK'in güncel resmî metniyle** yapılmalı.
