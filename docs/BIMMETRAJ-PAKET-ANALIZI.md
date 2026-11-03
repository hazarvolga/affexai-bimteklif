# BIMMetraj Ürün & Paket Planlaması Analizi (Salt Okunur)

**Analiz tarihi:** 2026-10-28
**Çalışma biçimi:** Salt okunur. Kod, doküman ve konfigürasyonda değişiklik yapılmadı; üretim veritabanına yalnızca `BEGIN READ ONLY` altında `SELECT` çalıştırıldı. Tek yazma işlemi bu rapor dosyasıdır.
**Kod tabanı:** `main` @ `4047098` (canlı ile aynı revizyon, `/api/health` ile doğrulandı). İstenen `feat/smartcheck-evaluation-baseline` dalı da okundu, yalnızca `PROJECT_STATUS.md` ve `PRODUCT.md` için (aşağıda §10).
**Gizlilik:** Hiçbir secret/.env değeri rapora alınmadı. IBAN'lar yalnızca ön ek ve geçerlilik sonucu olarak anıldı.

> **Okuma notu.** `MARKA.md` aynı konuda daha önce yapılmış bir UI/UX ve paketleme incelemesidir. Bu rapor onu tekrar etmez; `MARKA.md` bulgularını kodla/canlı veriyle **doğrular** ve onda bulunmayan birim ekonomisi, iskonto-enflasyon, rakip ve canlı veri tutarsızlığı bulgularını ekler. Doğrulanan `MARKA.md` maddeleri "(MARKA §x)" ile işaretlidir.

---

## 1. Yönetici özeti

1. **Paketleme omurgası beklenenden sağlam.** Teklif, IFC, PDF, AI, CRM, mevzuat ve kâr analizi kotaları gerçekten sunucuda zorlanıyor (`usageTracker`, `quota.ts`, `feature-quota.ts`, `upload-quota.ts`). Bu "sadece sayfada yazıyor" riski **yok**. Eksik olan: **kullanıcı (koltuk) sınırı kodda hiç yok.**
2. **🔴 KRİTİK RİSK 1 — Fiyat yüzeyleri birbiriyle çelişiyor.** Üretimde 5 planın **tamamı `is_published = false`** (`/api/public/plans` → `[]`); tarayıcıda "Yayınlanmış paket yakında burada görünecek" görünüyor. Ama `/pricing` ön-render metni, `<meta description>`, `/llms.txt` içindeki paket satırları **hâlâ 1.250 / 2.950 / 5.450 / 8.900 TL** yayınlıyor. Planları bilinçli kapalı tutmanız (geliştirme aşaması) doğru; ama aynı karar diğer yüzeylere yansımamış.
3. **🔴 KRİTİK RİSK 2 — Canlıda herkese açık banka hesapları geçersiz görünüyor.** `/api/public/bank-accounts` kodda sabit duran `DEFAULT_BANK_ACCOUNTS` değerlerini döndürüyor ve ikisi de **IBAN mod-97 sağlama toplamından geçmiyor**. Bir müşteri bu IBAN'a havale göndermeye çalışırsa ödeme reddedilir/yanlış yere gider; itibar ve hukuki risk.
4. **🔴 KRİTİK RİSK 3 — Fiyat hiçbir gerçek müşteri kanıtıyla kalibre değil.** Üretimde 3 şirket var, üçü de "Kurumsal Taahhüt & e-PYS" planında (iç/test hesabı olduğu düşünülüyor; **DOĞRULANAMADI**). Yetenek kaydında 0 yetenek L3, 17 pilot (L2), 2 yol haritası (L1). `PRODUCT.md` "pilot ekonomisi doğrulanana kadar public fiyat yok" diyor; kodda fiyatlar yazılı ve (bir yüzeyde) yayında.
5. **Uzun taahhüt iskontosu enflasyonda büyüyor.** Nominal %30'luk 24 aylık iskonto, TÜFE %29,73 ile liste fiyatın aylık arttığı varsayımında **efektif ≈ %46** iskontoya dönüşür (§5). Peşin tahsilat nakit akışına yardım eder ama fiyat kilidi, sunum maliyeti TL'de artarken geliri sabitler.
6. **Paket merdiveni tek eksene oturmuyor.** `e-PYS & BIM Standart Denetçi` (1.250 TL) ile `Teklif & Şantiye` (2.950 TL) aynı aylık IFC hakkını (5) veriyor; ikisi arasındaki tek fark teklif/PDF/AI/CRM hacmi. Adlar farklı eksenleri karıştırıyor (görev / ortam / teknoloji / modül / ölçek). (MARKA §7.2)
7. **Değişken maliyet ihmal edilebilir; marjı destek emeği belirliyor.** Kota %100 doluyken bile AI + depolama değişken maliyeti paket başına ≈ 2–100 TL/ay. Gerçek maliyet: destek/onboarding/ödeme onayı. 1.250 TL'lik pakette ayda 2 saat destek bile marjı eksiye çeker (§5).
8. **Rakip karşısında fiyat düşük ama kıyas "elma-armut".** Doğrulanmış çıpalar: AMP Kurumsal Hakediş yıllık kiralama 98.750 TL + KDV, Kreo Pro 2.100 $/yıl (≈104.500 TL). BIMMetraj 5D planı yıllık %20 iskontoyla ≈52.300 TL. Ama rakipler farklı iş yapıyor (hakediş/QTO); doğrudan karşılaştırma pazarlama iddiası olarak kullanılmamalı.
9. **Kullanım koşulları sözleşme olarak yetersiz.** `/terms` ön-kontrol niteliğini ve kotaları söylüyor; **iade/iptal, fiyat değişikliği, veri çıkarımı/saklama süresi, SLA, destek kapsamı ve satıcı unvanı** yok.
10. **Doğruluk kaynağı dağınık.** `PRODUCT.md`/`PROJECT_STATUS.md` "BIMPlan Academy / TeklifPro / SmartCheck / Academy" diyor; canlı site "BIMMetraj", banka hesap sahibi "BIMPlan Teknoloji ve Mühendislik Yazılımları". `PROJECT_STATUS.md` `main`'de **yok**, yalnızca baseline dalında var (2026-07-19 tarihli).

---

## 2. Yetenek gerçeklik envanteri

Kaynak: [`src/capabilities/registry.ts`](../../src/capabilities/registry.ts) (19 kayıt: 17 `pilot/L2`, 2 `roadmap/L1`, 0 `live/L3`), canlı ana sayfa metni, `llms.txt`, `calculation-review.ts` kanıt/test eşlemeleri.

| # | Yetenek (registry id) | Sitede iddia | Kodda gerçek durum | Test/fixture kanıtı (dosya adı) | Olgunluk |
|---|---|---|---|---|---|
| 1 | IFC QTO + çok katmanlı IfcCovering + daire cetveli (`ifc-qto-multi-layer-icmal`) | Pilot (L2; uzman onayı yok) | Var (sunucu worker + tarayıcı) | `workers/ifc/test_ifc_extract.py`, `src/ifc/calm-icmal.test.ts`, `src/ifc/server-path.e2e.test.ts` | Pilot |
| 2 | RG 33331 e-PYS ön kontrol (`epys-rg33331-preflight`) | Pilot | Var | `workers/ifc/test_epys_preflight.py`, `src/smartcheck/rules/epys.test.ts` | Pilot |
| 3 | PDF/A, ISO 216, /Sig ön kontrol (`pdfa-iso216-esig-preflight`) | Pilot | Var; "otomatik PDF/A-2b dönüştürme" **yok** (satır 16) | `workers/ifc/test_pdf_preflight.py`, veraPDF fixture matrisi | Pilot |
| 4 | SmartCheck 3×3 politikası | Pilot | Var | `src/smartcheck/rules/three-by-three.test.ts` | Pilot |
| 5 | Minha / kiriş-döşeme kesişimi | Pilot | Var | `src/smartcheck/rules/minha.test.ts` | Pilot |
| 6 | KİK m.38 ADT + %80 Pareto | Pilot | Var (kullanıcı girdili katsayı) | `src/lib/kik-adt.test.ts` (+golden) | Pilot |
| 7 | ISO 19650 adlandırma / LOIN | Pilot | Var | `src/smartcheck/rules/iso19650.test.ts` | Pilot |
| 8 | ÇŞB 2026 katalog (18.848 satır) | Pilot | Var; **ticari kullanım yetki belgesi yok** (`calculation-review.ts` `fiyat-eslestirme.pending`) | `catalog-audit.test.ts` | Pilot |
| 9 | 4735 fiyat farkı + TÜİK 21 alt endeks | Pilot | Var | `price-escalation.test.ts` | Pilot |
| 10 | CDE durum makinesi | Pilot | Var | `cde.integration.test.ts` | Pilot |
| 11 | Çok kullanıcılı CDE onay kapıları | Pilot | Var; **koltuk limiti yok** | `cde-workflow-model.test.ts` | Pilot |
| 12 | Taşeron hakediş kalkanı | Pilot | Var (sentetik kapsam) | `apartment-subcontractor-shield.test.ts` | Pilot |
| 13 | IFC kaynak yazılım uyarısı | Pilot | Var | `authoring-software-diagnostics.test.ts` | Pilot |
| 14 | Ön teklif / kat karşılığı fizibilite | Pilot | Var | `pre-bim-feasibility.test.ts` | Pilot |
| 15 | Ücretsiz hesaplayıcılar (4 adet) | Pilot | Var; **iki hesaplayıcı iki kayıtta tekrar listeleniyor** (#15, #18, #19) | `calculators-forms.test.ts` | Pilot |
| 16 | Ghostscript/veraPDF sunucu dönüştürme | Yol haritasında (L1) | **Yok** | — | Roadmap |
| 17 | EKAP tutanağı içe aktarma | Yol haritasında (L1) | **Yok** | — | Roadmap |
| 18 | Kat karşılığı & KDV hesaplayıcısı | Pilot | Var | `kat-karsiligi.test.ts` | Pilot |
| 19 | YAMBİS müteahhitlik grubu | Pilot | Var | `yambis-classification.test.ts` | Pilot |

**Bulgu → Kanıt → Neden önemli → Aksiyon → Efor**

- **Bulgu:** Ana sayfada 19 satırlık yetenek listesi var; 3 satır (#15, #18, #19) aynı hesaplayıcıları farklı başlıklarla tekrar sayıyor, gerçek ayrı yetenek ≈ 17.
  **Kanıt:** canlı `/` metni ve `registry.ts` id'leri (`free-public-calculators` + iki tekil hesaplayıcı).
  **Neden önemli:** Yetenek sayısını şişirir; "kanıt önce" ilkesiyle (`PRODUCT.md` Design Principles #1) çelişir.
  **Aksiyon:** Tekrarları gruplandır; ana sayfada ≤6 başlık, geri kalanı "Yetenek kaydı" sayfasına.
  **Efor:** S
- **Bulgu:** Hiçbir yetenek L3 değil; tüm paketler "Pilot" altyapı üzerinde satılıyor.
  **Kanıt:** `registry.ts` (0 × L3); canlı ana sayfa "(L2; bağımsız uzman onayı yok)".
  **Neden önemli:** Ücretli paket sözleşmesinde "pilot" ile "garanti" ayrımı yoksa uyuşmazlık riski (§7 R5).
  **Aksiyon:** Ücretli sözleşmeye "pilot/erken erişim" statüsü ve hizmet kapsamı maddesi ekle.
  **Efor:** S

---

## 3. Paket–özellik–limit matrisi: "sitede yazan" vs "kodda uygulanan"

Kod kaynağı: [`plan-catalog.ts`](../../src/services/billing/plan-catalog.ts) (`bimmetraj-2026-10-15-v6`). Canlı kaynak: `/api/public/plans` (**şu an boş**), `/pricing` ön-render, `llms.txt`, [`PublicPricingSection.tsx`](../../src/features/public-pricing/PublicPricingSection.tsx).

| Plan | Fiyat (TL/ay + KDV) | Teklif/ay | IFC/ay | Maks. dosya | Eşz. | PDF/ay¹ | AI/ay | CRM/ay | Mevzuat/ay | Kâr/ay | Depolama | Belge | Kullanıcı |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 14 gün deneme | 0 | 3 | 1 | 25 MB | 1 | 3 | 5 | 15 | 5 | 5 | 0,25 GB | 25 | **tanımsız** |
| e-PYS & BIM Standart Denetçi | 1.250 | 5 | 5 | 35 MB | 1 | 8 | 10 | 25 | 15 | 5 | 1 GB | 150 | **tanımsız** |
| Teklif & Şantiye | 2.950 | 25 | 5 | 40 MB | 1 | 15 | 25 | 150 | 30 | 25 | 2 GB | 300 | **tanımsız** |
| 5D BIM & SmartCheck | 5.450 | 75 | 15 | 60 MB | 1 | 35 | 60 | 500 | 100 | 75 | 5 GB | 750 | **tanımsız** |
| Kurumsal Taahhüt & e-PYS | 8.900 | 200 | 35 | 85 MB | 2 | 75 | 150 | 1.500 | 250 | 200 | 15 GB | 2.000 | **tanımsız** |

¹ Aynı `monthlyPdfLimit` sayısı hem teklif PDF çıktısı (`quotations.ts:195` → `PDF_GENERATED`) hem PDF/A ön kontrolü (`smartcheck/import/service.ts:153`) için, **ayrı sayaçlarla** kullanılıyor. (MARKA §7.7 ile uyumlu.)

**Sitede (public kart + llms.txt) hangileri görünüyor?** Kartta yalnızca: teklif, IFC adedi, maks. dosya MB, eşzamanlı kuyruk (`PublicPricingSection.tsx` `features[]`). `llms.txt` ek olarak PDF'i **"PDF ön kontrol"** diye etiketliyor (`web-hardening.ts:174`). AI, CRM, mevzuat, kâr analizi, depolama, belge sayısı ve kullanıcı sayısı **hiçbir yüzeyde** gösterilmiyor.

**Teknik olarak uygulanıyor mu?**

| Limit | Uygulanıyor mu | Kanıt |
|---|---|---|
| Teklif/ay | ✅ Evet (takvim ayı, abonelik dönemi aktif olmalı) | `usage.ts:30`, `quota.ts`, `quota-policy.ts` |
| IFC/ay, maks. MB, eşzamanlı | ✅ Evet (env üst sınırıyla `Math.min`) | `smartcheck/import/config.ts`, `processor.ts:391` |
| PDF, AI, CRM, mevzuat, kâr | ✅ Evet (rezervasyon/serbest bırakma) | `usage.ts`, `feature-limits.ts`, `routes/*.ts` |
| Depolama, belge sayısı | ✅ Evet | `smartcheck/import/upload-quota.ts` |
| **Kullanıcı sayısı** | ❌ **Yok** | `src/` içinde `maxUsers/seatLimit/maxMembers` araması boş; `POST /api/invitations` sınırsız |
| "Öncelikli işleme" (Kurumsal açıklaması) | ❌ **Bulunamadı** | `plan-catalog.ts` Kurumsal `marketingDescription`; `smartcheck/import/*.ts` içinde öncelik kuyruğu araması boş |
| "Ekip yönetimi" (Kurumsal açıklaması) | ⚠️ Her planda var | Davetiye akışı plandan bağımsız |

**Bulgular**

- **Bulgu:** Kurumsal planın "öncelikli işleme" ve "ekip yönetimi" vaadi, kodda planı ayıran bir mekanizmaya dayanmıyor.
  **Kanıt:** `plan-catalog.ts` `marketingDescription: 'Ekip yönetimi, yüksek kapasite ve öncelikli işleme için.'`; davet akışı (`routes/company.ts:286`) plan kontrolü yapmıyor; `docker-compose` `SMARTCHECK_IFC_WORKER_CONCURRENCY` varsayılanı 1.
  **Neden önemli:** Satılan fark gerçek farktan geniş; "yalnızca gerçekten desteklenen özellikler yazılmalı" (MARKA §7.5).
  **Aksiyon:** Ya koltuk limiti + öncelik kuyruğu uygula ya da açıklamadan çıkar.
  **Efor:** M (limit) / S (metin)
- **Bulgu:** Kurumsal planın "2 eşzamanlı" hakkı, ortam üst sınırıyla kısılabilir; canlıdaki env değeri doğrulanamadı.
  **Kanıt:** `config.ts` `effectiveConcurrent = Math.min(planMaxConcurrent ?? envMaxConcurrent, envMaxConcurrent)`; `compose.coolify.yaml:153` varsayılan `1`.
  **Neden önemli:** Vitrin 2 diyor, ortam 1 olabilir.
  **Aksiyon:** Canlı env'i kontrol et; plan değeri ile env tavanını tutarlı yap.
  **Efor:** S
- **Bulgu:** Teklif kotası **takvim ayına** bağlı; 14 günlük deneme iki takvim ayına denk gelirse kotalar iki kez tanımlı olur.
  **Kanıt:** `quota-policy.ts` `const period = now.toISOString().slice(0,7)` ve yorum "Calendar quota, not subscription anniversary billing".
  **Neden önemli:** Deneme "3 teklif" diye satılıyor; ayın 25'inde başlayan kullanıcı pratikte 6 teklif yapabilir (kod okumasından çıkarım; gerçek davranış test edilmedi).
  **Aksiyon:** Deneme için abonelik penceresine bağlı toplam kota tanımla.
  **Efor:** S–M
- **Bulgu:** Ödeme dönemi gün sayıları ay sayısıyla eşleşmiyor: 6 ay = 180 gün (183 değil).
  **Kanıt:** `billing-periods.ts` `durationDays: 180/365/730`.
  **Neden önemli:** Müşteri 6 ay öder, 180 gün alır; küçük ama tartışma çıkarır.
  **Aksiyon:** Dönem sonunu takvim ayı ekleyerek hesapla.
  **Efor:** S
- **Bulgu:** Başarısız IFC işlemin kotadan düşüp düşmediği doğrulanamadı.
  **Kanıt:** `processor.ts:391` `consumeIfcUsage` çağrısı var; çağrı noktasının başarı sonrası mı olduğu bu analizde izlenmedi. (MARKA §9.4 de aynı belirsizliği not ediyor.)
  **Neden önemli:** "Başarısız işlem kotadan düşer mi?" ilk destek sorusudur.
  **Aksiyon:** Test ile doğrula ve sayfada açıkça yaz.
  **Efor:** S

---

## 4. Paket mimarisi değerlendirmesi ve alternatif modeller

### 4.1 Mevcut yapı

- 1 deneme + 4 ücretli kademe; 4 ödeme dönemi (1/6/12/24 ay, %0/%10/%20/%30).
- Adlandırma ekseni karışık (MARKA §7.2): süre / meslek / ortam / teknoloji+modül / şirket ölçeği.
- Yükseltme gerekçesi yalnızca **hacim** (teklif, IFC, PDF…). Modül kilidi (örn. SmartCheck, e-PYS) planlar arasında kodla ayrılmıyor: kayıt sırasında her şirket `isSmartcheckEnabled: true` alıyor (`routes/auth.ts`).
- Çakışma: Denetçi (1.250) ve Teklif & Şantiye (2.950) aynı IFC hakkında; farkı sadece teklif/yardımcı kota. Kullanıcı hangisini neden seçeceğini ürün içinden çıkaramaz.
- Kart sırası: üretimde `display_order` kataloğun önerdiğiyle farklı (Kurumsal=20, Denetçi=30, T&Ş=40, 5D=50). Canlıdaki sıra doğal fiyat sırası değil (MARKA §7.3 ile uyumlu).

### 4.2 Alternatif model A — **Hibrit: koltuk + hacim (önerilen)**

Hedef alıcı: sahip/teknik müdür/metraj sorumlusu. Kademeler iş sonucu adlarıyla: **Teklif / Teknik Ofis / Kurumsal** (MARKA §8.1 ile uyumlu).

| Kademe | Dahil kullanıcı | Hacim çerçevesi | Yükseltme tetikleyicisi |
|---|---|---|---|
| Teklif | 1–2 | Teklif + Excel; IFC deneme düzeyi | "Daha fazla teklif / ikinci kişi" |
| Teknik Ofis | 3–5 | IFC + SmartCheck + kaynak izi | "Model inceleme ve onay akışı" |
| Kurumsal | 10+ | Yüksek hacim, rol/onay, destek anlaşması | "Çok ekip, öncelik, sözleşme" |

- **Artılar:** Rakiplerin kullanıcı başına modeliyle (AMP, Kreo, Bluebeam) aynı dilde; geliri ekip büyümesine bağlar; koltuk limiti ürüne eklenince "Ekip yönetimi" vaadi gerçek olur.
- **Eksiler:** Koltuk limiti için kod geliştirme gerekir; küçük ofiste "1 kişi = tam fiyat" sürtünmesi.

### 4.3 Alternatif model B — **Kullanım/kredi bazlı**

Taban platform ücreti + "analiz kredisi" (1 IFC işleme = N kredi, 1 PDF/A = M kredi, teklif ücretsiz).

- **Artılar:** Sunum maliyetiyle birebir; "başarısız işlem kotadan düşmez" mesajı kolay; PDF üretim/PDF/A kafa karışıklığı biter.
- **Eksiler:** Fatura öngörülebilirliği zayıf (B2B teknik ofis aylık sabit bütçeyi sever); mevcut kota mimarisinde kredi tablosu yok (M–L efor); Havale/EFT onayı ile kredi yeniden yükleme operasyonu ağır.

### 4.4 Alternatif model C — **Modül bazlı**

Çekirdek (Teklif+Excel+katalog) + eklentiler (SmartCheck/IFC, e-PYS ön kontrol, Hakediş).

- **Artılar:** e-PYS farklı alıcıya hitap edebilir (ruhsat/teslim ofisi ≠ sürekli teklif hazırlayan ofis; MARKA §8.3); olgunluğu düşük modül ayrı pilot olarak satılır.
- **Eksiler:** Karar sayısı artar; modül kilitleri `isSmartcheckEnabled` benzeri bayraklara taşınmalı; ana sayfa "dört ürün bitmiş" izlenimini (`PRODUCT.md` anti-reference) güçlendirebilir.

### 4.5 Öneri

**Şu an için A'nın sadeleştirilmiş hali + ücretli pilot (sabit bedelli 30 gün).** Public fiyat, pilot ekonomisi (§8.4 MARKA) ölçülene kadar yayınlanmasın. Bu zaten sizin mevcut kararınızla (planlar kapalı) uyumlu; eksik olan diğer yüzeylerin hizalanması (§7 R1).

---

## 5. Birim ekonomisi

### 5.1 Varsayımlar (hepsi açıkça tahmindir; ölçülmüş değildir)

| Kalem | Değer | Kaynak / durum |
|---|---|---|
| USD/TRY | 49,79 (TCMB gösterge satış, 27.10.2026) | İkincil kaynak (arama özeti: canligaste.com); **birincil TCMB sayfası doğrulanmadı** |
| EUR/TRY | 55,52 | Aynı |
| TÜFE (yıllık) | %29,73 (Eylül 2026) | İkincil kaynak (bloomberght.com via arama); TÜİK bülteni doğrulanmadı |
| Gemini 2.5 Flash | 0,30 $/1M giriş, 2,50 $/1M çıkış | `geminiProvider.ts` varsayılan model `gemini-2.5-flash`, `maxOutputTokens: 4096`; fiyat ikincil kaynak (aipricing.guru/costgoat via arama), Google sayfası doğrulanmadı |
| AI çağrı maliyeti | düşük 0,003 / orta 0,007 / yüksek 0,012 $ | **Varsayım** (2–5k giriş + 1–4k çıkış token) |
| Cloudflare R2 | 0,015 $/GB-ay, çıkış ücretsiz | İkincil kaynak (cloudflare.com via arama) |
| Barındırma | tek VPS; `compose.coolify.yaml` toplam limit ≈ 5,5 GB RAM / 5 CPU | Kod; **gerçek VPS planı ve fiyatı doğrulanamadı** (`docs/deploy/container-app-worker.md` "örn. Contabo" diyor) |
| Sabit altyapı (VPS+yedek+alan adı+SMTP) | düşük €15 / orta €40 / yüksek €120 aylık | **Varsayım** |
| Destek+onboarding+ödeme onayı | 0,5 / 2 / 5 saat/müşteri-ay, 750 TL/saat yüklenmiş | **Varsayım** (ölçüm yok) |
| Ödeme komisyonu | 0 (yalnız Havale/EFT) | Kod (`bank-transfer.ts`); kart akışı yok |
| KDV | Fiyatlar +KDV; gelir tablosu KDV hariç | Canlı kart "(+KDV)" |

### 5.2 Değişken maliyet (kota %100 kullanım = stres durumu, TL/ay)

| Plan | AI düşük / orta / yüksek | R2 depolama (tam dolu) | Toplam değişken (orta) | Liste fiyata oranı |
|---|---:|---:|---:|---:|
| Denetçi | 1 / 3 / 6 | 0,7 | ≈ 4 | %0,3 |
| Teklif & Şantiye | 4 / 9 / 15 | 1,5 | ≈ 11 | %0,4 |
| 5D BIM & SmartCheck | 9 / 21 / 36 | 3,7 | ≈ 25 | %0,5 |
| Kurumsal | 22 / 52 / 90 | 11,2 | ≈ 63 | %0,7 |

IFC işlem CPU'su ayrıca sabit VPS'e dağılıyor; tek işçi/eşzamanlılık 1 olduğu için sınır **maliyet değil kapasite/kuyruk süresi**. Kanıt (kısmi): `docs/audits/phase-7/PHASE_7_T45_PERFORMANCE_BUDGET_2026-10-26.md` 100 MB sentetik IFC için Node ayrıştırıcıda ≈3,6 sn ölçmüş; **gerçek Python `ifc-worker` süresi doğrulanamadı**. 85 MB'lık Kurumsal sınırı, worker `mem_limit: 2048m` ile aynı bütçe belgesinde zarf sınırına yakın görünüyor.

### 5.3 Destek sonrası katkı marjı (12 aylık ödeme, %20 iskonto, KDV hariç)

| Plan | Net aylık gelir | 0,5 sa destek | 2 sa destek | 5 sa destek |
|---|---:|---:|---:|---:|
| Denetçi | 1.000 | ≈ 621 (%62) | **≈ −504 (−%50)** | **≈ −2.754** |
| Teklif & Şantiye | 2.360 | ≈ 1.975 (%84) | ≈ 850 (%36) | **≈ −1.400** |
| 5D BIM & SmartCheck | 4.360 | ≈ 3.960 (%91) | ≈ 2.835 (%65) | ≈ 585 (%13) |
| Kurumsal | 7.120 | ≈ 6.682 (%94) | ≈ 5.557 (%78) | ≈ 3.307 (%46) |

**Yorum:** Değişken maliyet marjı belirlemiyor; **destek yükü** belirliyor. En ucuz iki plan "ayda 2 saat destek" varsayımında sağlıklı değil. Bu, "önce fiyatı düşürmek yerine kapsamı sadeleştirmek" (MARKA §8.4) sonucunu destekler.

### 5.4 Başabaş (orta senaryo, sabit €40/ay ≈ 2.220 TL)

| Plan | Başabaş müşteri sayısı (yalnız bu plandan, 2 sa destek, %20 iskonto) |
|---|---|
| Denetçi | **negatif katkı → başabaş yok** |
| Teklif & Şantiye | ≈ 2,6 |
| 5D BIM & SmartCheck | ≈ 0,8 |
| Kurumsal | ≈ 0,4 |

Sabit altyapı küçük; asıl soru müşteri sayısı değil, **müşteri başı destek süresi**.

### 5.5 İskonto yapısı: nominal vs enflasyon düzeltmeli

Liste fiyat TÜFE ile (aylık bileşik, %29,73 yıllık) arttığında, peşin ödeyenin sabit fiyatı gelecekteki liste fiyatına göre efektif iskonto kazandırır:

| Dönem | Nominal iskonto | Efektif iskonto (enflasyonla) |
|---|---:|---:|
| 6 ay | %10 | ≈ %14,8 |
| 12 ay | %20 | ≈ %29,2 |
| 24 ay | %30 | **≈ %46,1** |

**Bulgu:** 24 aylık sabit fiyat, enflasyon ortamında ağır bir fiyat opsiyonu veriyor.
**Kanıt:** `billing-periods.ts` (`discountPercent` 10/20/30; fiyat güncelleme maddesi yok); `/terms` fiyat değişikliği maddesi içermiyor; hesap yukarıda.
**Neden önemli:** Sunum maliyetleri (maaş, destek, VPS EUR bazlı) TL'de artarken 24 ay sabit gelir marjı eritir.
**Aksiyon:** (1) 24 ayı kaldır veya "yıllık güncelleme endeksi" (TÜFE veya sabit % tavan) ekle; (2) iskontoyu 6/12 ayda %10/%15'e çek; (3) USD/EUR bazlı maliyetler için kur klozu.
**Efor:** S (karar) + M (kod).

### 5.6 Fiyat güncelleme mekanizması önerisi

- Liste fiyatı yılda iki kez (Ocak/Temmuz) TÜFE + kur sepeti ile gözden geçir; sözleşmede "uzun dönem fiyat yenilemesi" maddesi.
- Mevcut aboneye yenilemede 60 gün önceden e-posta bildirimi.
- Plan kataloğu zaten sürümlü (`PLAN_CATALOG_VERSION`); fiyat değişimi için yeni sürüm + `planCatalogChanges` kontrolü (çatışmada hata veriyor, iyi).

---

## 6. Rakip / pazar karşılaştırması (kaynaklı, erişim: 2026-10-28)

### 6.1 Bu analizde doğrudan doğrulanan fiyatlar

| Ürün | Fiyat | Model | Kaynak (erişim 2026-10-28) |
|---|---|---|---|
| AMP Kurumsal Hakediş ve Yaklaşık Maliyet | 145.750 TL (daimi) / 98.750 TL (kiralama) + KDV | 1 kullanıcı | https://www.amp.com.tr/fiyat-listesi — sayfa metninde rakamlar görüldü; sütun başlıkları ("Satın Al/Kiralama") otomatik çıkarımla eşlendi |
| AMP Kurumsal Yaklaşık Maliyet | 123.000 / 79.750 TL + KDV | 1 kullanıcı | aynı sayfa |
| AMP Kurumsal Bulut (5 GB) | 116.750 TL + KDV | yıllık | aynı sayfa |
| BirimFiyat.net üyelik paketleri | 12.900 – 34.400 TL + KDV / yıl (çok yıllı %10 avantaj) | web/mobil poz kütüphanesi | https://www.birimfiyat.net/uyelik-paketleri — paket adı–fiyat eşlemesi **doğrulanamadı** |
| Kreo | Essential 100 $, Pro 175 $, Business 250 $ / kullanıcı / ay (yıllık faturalı); Pro = 2.100 $/yıl ≈ 104.500 TL; 7 gün deneme | kullanıcı başı | https://www.kreo.net/pricing |
| Serbest "Excel + danışman" | **DOĞRULANAMADI** (alt araştırma kaynak URL vermedi) | — | — |

### 6.2 İkincil/doğrulanmamış (alt araştırma çıktısı; **kendim doğrulamadım**, kullanmadan önce kontrol edin)

| Ürün | Bildirilen fiyat | Not |
|---|---|---|
| OSKA HakedişPlus | 121.980 TL kira / 169.980 TL daimi + KDV | `oska.com.tr/urunler/hakedisplus` URL'i **404** döndü; rakamlar kanıtsız |
| Bluebeam Revu | 260–590 $/yıl | Doğrulanmadı |
| Autodesk Forma Takeoff | 1.290 $/yıl | Doğrulanmadı |
| Solibri | 99 € – 2.772 €/yıl | Doğrulanmadı |
| BIMcollab Zoom | 60 €/ay | Doğrulanmadı |
| PlanSwift, Togal.AI, ACCA PriMus, Trimble Connect | çeşitli | Doğrulanmadı; Kreo için alt araştırmanın "Lite 35 $ / Plus 70 $" değerleri güncel sayfayla **çelişiyor** (güncel: 100/175/250 $). Bu, tablonun tamamına güvenmemek için bir uyarıdır. |
| CostX, dRofus, Kesinfiyat, AkaBuild, Allplan TR | fiyat yayımlanmıyor | Alt araştırmanın beyanı |

### 6.3 BIMMetraj'ın göreli konumu (yalnız doğrulanan çıpalarla)

| Karşılaştırma | BIMMetraj | Çıpa | Not |
|---|---|---|---|
| 5D BIM & SmartCheck, yıllık | ≈ 65.400 TL liste / ≈ 52.320 TL (%20) | AMP Kurumsal HYM kiralama 98.750 TL; Kreo Pro ≈104.500 TL | ≈ %47–%50 düşük, ama farklı iş kapsamı |
| Teklif & Şantiye, yıllık | ≈ 35.400 / 28.320 TL | BirimFiyat.net 12.900–34.400 TL (yalnız poz kütüphanesi) | Aynı bantta; BIMMetraj teklif aracı da veriyor |
| Denetçi, yıllık | ≈ 15.000 / 12.000 TL | Alt araştırma KOBİ SaaS çıpası (Paraşüt/Logo ≈ 460–1.450 TL/ay) — **doğrulanmadı** | Düşük fiyat, "ucuz" algısı ve destek riski |

**Bulgu:** Fiyat bandı yerel masaüstü hakediş yazılımlarına göre düşük, yabancı QTO araçlarına göre çok düşük; ama ürün pilot seviyede ve uzman onaylı değil.
**Kanıt:** §6.1 tablo, `registry.ts` 0 × L3.
**Neden önemli:** Düşük fiyat + doğrulanmamış kabuller = "ucuz ama güvenilmez" algısı; yüksek fiyat + pilot = satış sürtünmesi.
**Aksiyon:** İlk 5–10 müşteriyle **ücretli pilot** (sabit bedel, 30 gün, tek proje) yap; fiyatı bu veriden kalibre et. Rakip kıyasını pazarlama iddiası olarak kullanma (`PRODUCT.md` anti-reference: "Türkiye'nin ilki" vb.).
**Efor:** M

---

## 7. Risk kaydı

| ID | Risk | Etki | Olasılık | Öneri |
|---|---|---|---|---|
| R1 | **Fiyat yüzeyleri tutarsız:** planlar kapalı ama `/pricing` ön-render, meta, `llms.txt` fiyat yayınlıyor; meta "5 kademeli", gövde "4 kademeli" diyor | Yüksek (itibar, `PRODUCT.md` ilkesi) | Gerçekleşti | Ön-render ve `llms.txt`'yi `is_published` verisine bağla; yayın kapalıyken "Pilot başvurusu" göster |
| R2 | **Geçersiz IBAN'lar canlıda** (kod varsayılanı, mod-97 başarısız) | Çok yüksek (ödeme/güven) | Gerçekleşti | Varsayılan hesapları koddan kaldır; boşsa uç noktayı boş döndür; finansla gerçek IBAN doğrula |
| R3 | Pilot kanıtı olmadan fiyat/kapasite taahhüdü | Yüksek | Yüksek | Ücretli pilot; fiyat yayını pilot sonrası |
| R4 | 24 ay %30 iskonto enflasyonda efektif ≈ %46 | Yüksek (marj) | Yüksek | 24 ayı kaldır / endeks klozu |
| R5 | Pilot yetenekle ücretli paket: sözleşmesel beklenti uyuşmazlığı | Yüksek | Orta | Terms'e "pilot/erken erişim" ve sorumluluk sınırı ekle (hukuk görüşüyle) |
| R6 | Kullanım koşullarında iade/iptal, fiyat değişimi, veri çıkarımı, SLA, satıcı unvanı/adres/MERSİS yok (sayfa kaynağında arama sonucu boş) | Orta–Yüksek | Yüksek | Sözleşme paketi hazırla; KVKK veri sorumlusu bilgisini tamamla |
| R7 | Koltuk limiti yok; "Kurumsal ekip yönetimi" farkı gerçek değil | Orta | Orta | Koltuk limiti veya vaadi kaldır |
| R8 | Tek VPS, tek işçi: eşzamanlılık 1; 85 MB sınırı bellek zarfına yakın | Orta | Orta | Kapasite testi (gerçek worker süresi), kuyruk süresi göstergesi |
| R9 | Eski `/api/billing/plans` "sınırsız" (999999) tablosunu herkese açık veriyor | Düşük–Orta | Gerçekleşti | Kaldır/410 (kullanıcı onayı alındı: bilgi olarak) |
| R10 | `PDF_GENERATED` aynı teklif için tekrar üretimde sayaç tüketebilir; "15 PDF ortak" yanlış anlaşılır | Orta (sürpriz) | Orta | Benzersiz teklif/sürüm başına say veya sayfada açıkla |
| R11 | Manuel Havale/EFT onayı: ödeme sonrası aktivasyon gecikmesi, deneme→ücretli geçişte kopuş | Orta | Yüksek | Onay SLA'sı yayınla; geçişte kota köprüsü |
| R12 | Marka/kapsam kayması (TeklifPro/BIMPlan Academy ↔ BIMMetraj) | Orta | Gerçekleşti | Tek güncel doğruluk kaynağı (§8) |
| R13 | e-Fatura/e-Arşiv entegrasyonu kodda bulunamadı (arama bazlı) | Orta (operasyon) | Orta | Muhasebe sürecini tanımla; entegrasyon kararı |
| R14 | AI anahtarının canlıda tanımlı olup olmadığı belirsiz; "AI ile teklif" kotası satılıyorsa görünürlük şart | Düşük–Orta | Bilinmiyor | Canlıda yapılandırma durumunu doğrula (**DOĞRULANAMADI**) |

---

## 8. Öncelikli aksiyon planı

### 0–2 hafta (tutarlılık ve güven)

1. **IBAN düzeltmesi** (R2). Bulgu → kanıt (§1, mod-97) → ödeme güveni → varsayılanları kaldır, finans doğrulaması → **S**.
2. **Fiyat yüzeylerini hizala** (R1): `/pricing` ön-render, `<meta>`, `llms.txt` `is_published` ile tutarlı; "5/4 kademeli" çelişkisini gider → **S–M**.
3. **`/api/billing/plans` kapat** (R9) → **S**.
4. **Terms taslağı**: pilot/erken erişim, iade/iptal, fiyat değişimi, veri çıkarımı/saklama, destek kapsamı, satıcı unvanı → **S–M** (hukuk onayı ile).
5. **Canlı doğrulamalar**: AI anahtarı durumu, `SMARTCHECK_IFC_*` env tavanları, gerçek IFC işlem süresi → **S**.

### 1–2 ay (kanıt üret)

6. **Ücretli pilot paketi** (30 gün, tek proje, ≤3 kullanıcı, sabit bedel, otomatik yenileme yok). Ölçülecekler: ilk teklife kadar süre, tamamlanan teklif sayısı, destek saati, ikinci proje kullanımı, ödeme isteği (MARKA §8.4) → **M**.
7. **Koltuk limiti** + Kurumsal vaadini gerçeğe bağla (veya vaadi kaldır) → **M**.
8. **PDF sayaç netliği** ve kullanım ekranında ayrı gösterim (R10) → **S–M**.
9. **24 ay iskontosunu** yeniden tasarla veya endeks klozu ekle (R4) → **S** karar + **M** kod.
10. **Deneme kotasını** abonelik penceresine bağla; dönem gün sayılarını ay bazlı yap → **S–M**.

### 3–6 ay (ölçekle)

11. Pilot verisiyle **A modeli** (Teklif/Teknik Ofis/Kurumsal) kalibrasyonu; Denetçi planını kaldırma/e-PYS eklentisine dönüştürme kararı → **M**.
12. **Fiyat güncelleme politikası** (6 aylık gözden geçirme, 60 gün bildirim) → **S**.
13. **Kart/online tahsilat** kararı (iyzico/PayTR; komisyon marjı) ve e-Fatura entegrasyonu → **L**.
14. **Bağımsız uzman doğrulaması** (L2 → L3) ve pilot müşteri referansı sonrasında public fiyat yayını → **L**.
15. **Tek doğruluk kaynağı:** `PRODUCT.md`, `PROJECT_STATUS.md`, `DESIGN.md` BIMMetraj adıyla güncel; `main`'e taşı; TeklifPro/BIMPlan Academy yapısının hangisinin tarihçe olduğunu yaz → **S**.

---

## 9. Karar bekleyen sorular (sizin cevaplamanız gereken)

1. Plan yayını kapalıyken `/pricing` ön-render ve `llms.txt` ne göstersin? (Fiyat yok + "Pilot başvurusu" mı, yoksa fiyatlar bilinçli yayında mı?)
2. `/api/public/bank-accounts` için **gerçek** hesaplar nerede tutuluyor (admin paneli/ayar/env)? Canlıda gösterilen IBAN'lar test değerleri mi?
3. Hukuki satıcı unvanı, vergi dairesi/no, MERSİS ve adres hangisi ("BIMPlan Teknoloji ve Mühendislik Yazılımları" mı)? Marka "BIMMetraj" ile ilişkisi nasıl yazılacak?
4. Üretimdeki 3 şirket gerçek müşteri mi, iç/test mi? Ücretli müşteri var mı?
5. İlk ücretli pilotun kapsamı ve bedeli ne olsun (süre, kullanıcı, dosya, destek)?
6. 24 aylık %30 iskonto devam etsin mi? Devam edecekse fiyat endeks klozu istiyor musunuz?
7. Koltuk limiti eklenecek mi? Eklenecekse hangi kademede kaç kullanıcı?
8. e-PYS ürünü ana pakete mi bağlı kalacak, yoksa ayrı uzmanlık eklentisi/pilot olarak mı satılacak?
9. Gerçek VPS planı/maliyeti ve yıllık altyapı bütçesi nedir (birim ekonomisinde sabit gider)?
10. Destek yükü için hedef: müşteri başına aylık kaç saat destek verilebilir (marj hesabının en hassas girdisi)?

---

## 10. Ek: incelenen dosya ve URL listesi

**Repo dosyaları (`main` @ `4047098`):** `PRODUCT.md`, `DESIGN.md`, `MARKA.md`, `AGENTS.md`, `CLAUDE.md`, `CODEX.md` (varlığı doğrulandı), `src/services/billing/{plan-catalog,billing-periods,limits,feature-limits,feature-quota,quota,quota-policy,trial-plan,bank-transfer,usage-audit}.ts`, `src/server/routes/{billing,auth,quotations,company,ai,crm,profit,regulations}.ts`, `src/server/middleware/usage.ts`, `src/server/security/web-hardening.ts`, `src/features/public-pricing/PublicPricingSection.tsx`, `src/pages/{Register,LegalPage}.tsx`, `src/smartcheck/import/{config,service,processor,upload-quota}.ts`, `src/capabilities/registry.ts`, `src/services/ai/providers/geminiProvider.ts`, `compose.coolify.yaml`, `.env.example` (yalnız anahtar adları), `docs/agent-memory/{PILOT_PLAN,PROJECT_BRIEF,WORKING_STATE}.md`, `docs/audits/phase-7/PHASE_7_T45_PERFORMANCE_BUDGET_2026-10-26.md`, `docs/deploy/container-app-worker.md`.
**Baseline dalı (`origin/feat/smartcheck-evaluation-baseline`):** `PROJECT_STATUS.md` (2026-07-19), `PRODUCT.md`; `IFC_GAP_RAPORU.md`, `implementation_plan.md`, `summary.md`, `sondurum-eklenenler.md` dosyalarının **varlığı** doğrulandı, **içerikleri bu analizde okunmadı**.
**Dizin/şema:** `src/db/schema.ts` (plan sütunları), `drizzle/` ve `drizzle-release/` (şema doğrudan okunmadı; plan alanları `schema.ts` üzerinden doğrulandı), `workers/ifc` (yalnız test dosyası adları), `server.ts`/`vercel.json` (okunmadı).
**Canlı URL'ler:** `https://bimmetraj.com/`, `/pricing`, `/features`, `/pilot`, `/terms`, `/privacy`, `/hesaplayicilar` (HTTP 200; **ön-render metni** okundu, tarayıcıyla gezilmedi), `/llms.txt`, `/api/public/plans`, `/api/public/bank-accounts`, `/api/billing/plans`, `/api/health`.
**Üretim DB (salt okunur):** `plans` (ad, fiyat, `is_active`, `is_published`, `is_trial`, `display_order`, limitler), `admin_audit_logs` (eylem adı/zaman), `subscriptions`/`companies` (sayı ve plan dağılımı).
**Dış kaynaklar (erişim 2026-10-28):** https://www.amp.com.tr/fiyat-listesi · https://www.birimfiyat.net/uyelik-paketleri · https://www.kreo.net/pricing · Gemini 2.5 Flash fiyatı (arama özeti: aipricing.guru, costgoat.com) · Cloudflare R2 fiyatı (arama özeti: cloudflare.com) · TÜFE %29,73 (arama özeti: bloomberght.com, trthaber.com) · TCMB kurları 27.10.2026 (arama özeti: canligaste.com) · Contabo fiyat özeti (arama; **gerçek plan doğrulanamadı**). Alt araştırma ham dosyası: `brain/.../scratch/competitors.md` (§6.2'deki gibi kısmen güvenilmez).

---

## Doğrulanamayanlar

- Üretimdeki 3 şirketin gerçek/iç hesap olduğu.
- `/api/public/bank-accounts` değerlerinin kaynağı (DB `*bank*` tablosu bulunamadı; kod varsayılanıyla birebir eşleşti) ve admin ayarında farklı değer tutulup tutulmadığı.
- Planların `is_published=false` yapılmasının tam nedeni (`admin_audit_logs`'ta 27.10.2026 07:19–07:20 UTC'de 5 `plan.updated` kaydı var; ayrıntı alanı okunmadı).
- Canlıda AI sağlayıcı anahtarının tanımlı olup olmadığı; hangi modelin kullanıldığı.
- Gerçek Python `ifc-worker` işlem süresi, 85 MB'lık dosyada bellek davranışı, canlı `SMARTCHECK_IFC_*` env tavanları.
- Başarısız IFC/PDF işlemin kotadan düşüp düşmediği.
- Kurumsal planda "öncelikli işleme"nin varlığı (arama bazlı: bulunamadı; tüm kod okunmadı).
- e-Fatura/e-Arşiv entegrasyonunun varlığı (arama bazlı).
- `/terms` içeriğinin tamamı; satıcı unvanı/MERSİS/iade maddesi sayfa kaynağında aramayla bulunamadı, görsel doğrulama yapılmadı.
- Tarayıcıdaki gerçek `/pricing` görünümü (ön-render metni ve API yanıtı doğrulandı; tarayıcı çalıştırılmadı).
- OSKA, Bluebeam, Autodesk, Solibri, BIMcollab, PlanSwift, Togal, ACCA, Trimble fiyatları; serbest metraj ve TMMOB tarife oranları; Kesinfiyat/AkaBuild/Allplan "teklif usulü" beyanları.
- TÜFE ve TCMB kurlarının birincil kaynak (TÜİK/TCMB) doğrulaması.
- Gerçek VPS planı ve fiyatı (Contabo özeti genel).
- `IFC_GAP_RAPORU.md`, `summary.md`, `sondurum-eklenenler.md`, `implementation_plan.md` içerikleri.
- Marka/ticari unvanın hukuki durumu (tescil, mevzuat uygunluğu): hukuk görüşü gerekir.
