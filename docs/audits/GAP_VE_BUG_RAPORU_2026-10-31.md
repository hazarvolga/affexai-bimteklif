# GAP ve BUG Raporu — BIMMetraj / TeklifPro

**Tarih:** 31 Ekim 2026
**İncelenen sürüm:** `3a9bb7d` (Rev. 133, `BIM-CALC-2026-10-30.2`)
**Kapsam:** uygulama kodu, migration zinciri (`drizzle-release/`), `compose.coolify.yaml`, DB rol sözleşmesi, capability registry, agent-memory ve yol haritası belgeleri
**Sonuç:** 1 P0, 3 P1, 5 P2, 2 P3 BUG; 9 GAP başlığı

> Bu rapor bir ön denetimdir. Üretim veritabanına ve canlı ortama erişilmedi. P0 dahil tüm bulgular kod, migration ve konfigürasyon kanıtına dayanır. Canlıda teyit edilmesi gereken adımlar §7'de listelenmiştir.

---

## 1. Yönetici özeti

| ID | Önem | Bulgu | Etki |
|---|---|---|---|
| P0-1 | Kritik | Üretimde IFC işleme `process`/`retry` uçları, app DB rolüyle worker'a özel yetki fonksiyonunu çağırıyor ve 503 dönüyor | SmartCheck IFC hattı üretimde çalışmıyor |
| P1-1 | Yüksek | IFC entitlement abonelik durumu ve bitiş tarihini denetlemiyor | Süresi dolmuş/suspended abonelikle IFC işlenebiliyor |
| P1-2 | Yüksek | Pasif planda app "en düşük aktif plan"a düşerken worker `IFC_NOT_AVAILABLE` veriyor | Giriş noktasına göre farklı sonuç; sessiz yetki genişlemesi |
| P1-3 | Yüksek | 14 günlük deneme, takvim ayı sınırını aşınca kota iki kez veriliyor | Deneme kullanıcısı 2× teklif/IFC kotası alıyor |
| P2-1 | Orta | Plan kolonu NULL ise eski `PLAN_LIMITS` enum'ına sessiz düşüş | Katalog dışı, yanlış kota |
| P2-2 | Orta | Faturalama süreleri 30/180/365/730 gün | Takvim ayı sözleşmesiyle uyuşmazlık, artık yılda erken bitiş |
| P2-3 | Orta | Kurumsal plan "ekip yönetimi + öncelikli işleme" vaadi kodda karşılıksız | Reklam/mevzuat riski, kanıtsız farklılaştırıcı |
| P2-4 | Orta | `/api/billing/plans` eski `PLAN_LIMITS` döndürüyor, tüketicisi yok | Çelişkili API sözleşmesi |
| P2-5 | Orta | Kurumsal plan 2 eşzamanlı IFC hakkı, worker varsayılanı 1 | Satılan kapasite fiilen kullanılamıyor |
| P3-1 | Düşük | `src/worker/index.ts` kullanılmayan giriş noktası; `stripe` bağımlılığı kullanılmıyor | Bakım/dependency yüzeyi |
| P3-2 | Düşük | `toFiniteNumber(null, fallback)` fallback uygulamıyor, 0 döndürüyor | Gizli %0 KDV riski (bugün Zod ile kapalı) |

**En kritik cümle:** Üretimde SmartCheck açıksa IFC işleme başlatılamaz; kapalıysa ürünün ayrıştırıcı katmanı fiilen satılamaz. İki durumda da IFC hattı bugün operasyonel değildir.

---

## 2. Yöntem ve kanıt sınırları

**Doğrulananlar (bu oturumda):**
- `pnpm lint` (`tsc --noEmit`) temiz, çıkış kodu 0.
- Altı saf birim test dosyası: **74/74 PASS** (`worker-entitlement`, `quota-policy`, `feature-limits`, `bank-transfer`, `calculations`, `roadmap/content`).
- Kaynak kanıt zinciri: HTTP rota → servis → config → migration → rol sözleşmesi → compose.

**Doğrulanamayanlar (ortam sınırı):**
- Tam test paketi çalıştırılamadı. Yerel izole PostgreSQL 16 olmadığı için DB'ye bağımlı yaklaşık 50 test adı yalnızca altyapı nedeniyle düştü (`ECONNREFUSED ::1:5432`, `Test isolation unavailable: refusing to run against the shared database`). Bu düşüşler ürün kusuru sayılmadı.
- Üretim DB'sine, `/api/health`'e ve Coolify ortam değişkenlerine erişilmedi.
- P0 canlıda yeniden üretilmedi; kanıt statiktir ve zincir eksiksizdir.

**Değişiklik yapılmadı:** Bu rapor kod, migration, plan, fiyat veya kural değiştirmez. Düzeltmeler ayrı görev ve onay gerektirir.

---

## 3. BUG bulguları

### P0-1 — Üretimde IFC `process` / `retry` 503 `IFC_LIMITS_UNAVAILABLE`

**Kanıt zinciri:**

1. HTTP rotası `POST /api/smartcheck/documents/:id/process` (ve `retry`) doğrudan `changeProcessingRun` çağırır — `src/server/routes/smartcheck.ts:629-638`.
2. `changeProcessingRun`, IFC için `fetchTenantIfcLimits(companyId, tx, "worker")` çağırır — `src/smartcheck/import/service.ts:112`.
3. `fetchTenantIfcLimits`, `caller === "worker" && NODE_ENV === "production"` olduğunda worker capability dalına girer — `src/smartcheck/import/config.ts:116-118`.
4. Bu dal `public.bimmetraj_worker_get_entitlement(...)` fonksiyonunu çağırır — `src/smartcheck/import/config.ts:71-74`.
5. Fonksiyon, çağıran oturum `bimmetraj_worker` değilse hata fırlatır: `IF session_user <> 'bimmetraj_worker' THEN ... ERRCODE 42501` — `drizzle-release/0020_worker_entitlement_capability.sql:7-8`.
6. Fonksiyon yalnız `bimmetraj_worker` rolüne grant edilmiştir; `bimmetraj_app` dahil diğer rollerden açıkça revoke edilmiştir — `drizzle-release/0020_worker_entitlement_capability.sql:27-29`, `scripts/database-roles/contract.ts:76`.
7. Uygulama konteyneri `bimmetraj_app` rolüyle bağlanır — `compose.coolify.yaml:91`. `NODE_ENV=production` — `compose.coolify.yaml:37`.
8. Hata `catch` bloğunda yutulup `IfcLimitsUnavailableError`'a çevrilir — `src/smartcheck/import/config.ts:75-77`; rota bunu **503** ve `IFC_LIMITS_UNAVAILABLE` olarak döner — `src/server/routes/smartcheck.ts:650-651`, `src/smartcheck/import/config.ts:38-45`.

**Etki:**
- Üretimde `SMARTCHECK_IMPORT_ENABLED=true` olan her pilot şirket için IFC işleme başlatma ve yeniden deneme **her zaman** 503 döner.
- Yükleme başarılı olur, kuyruğa iş girmez; kullanıcı "yüklendi ama işlenmiyor" durumunda kalır.
- PDF işleme farklı dalı kullandığı için çalışmaya devam eder; bu kısmi arıza tespiti zorlaştırır.
- SmartCheck kapalıysa (compose varsayılanı `false`, `compose.coolify.yaml:44`) IFC hattı tümüyle erişilemez olur. Her iki durumda da ürünün IFC ayrıştırıcı katmanı üretimde kullanılamaz.

**Neden testler yakalamıyor:**
- Entegrasyon testleri `NODE_ENV=test` ile koşar; bu durumda `fetchTenantIfcLimits` worker dalına girmez, app dalını kullanır.
- `worker-entitlement.test.ts` DB'yi mock'lar ve doğrudan `caller="worker"` çağırır; HTTP rotasının app rolüyle çağırdığını test etmez.
- `worker-entitlement.test.ts` içinde "caller=app does NOT use execute path even in production" testi vardır; yani tasarımın doğru yolu app caller'dır, ancak `service.ts:112` bunu ihlal eder.

**Düzeltme yönü (uygulanmadı):**
- HTTP yolunda `caller="app"` kullanılmalı; worker capability yalnızca gerçek worker sürecinde çağrılmalı.
- Alternatif: app rolü için ayrı, tenant-scoped bir capability fonksiyonu tanımlanmalı.
- Üretim modunda (`NODE_ENV=production`) app rolüyle çalışan bir PG16 entegrasyon testi eklenmeli; mock ile bu sınıf hata kapanmaz.

---

### P1-1 — IFC entitlement abonelik durumunu ve bitiş tarihini denetlemiyor

**Kanıt:**
- Tarayıcı ön analizi doğru davranır: `consumeBrowserIfcAnalysis` içinde `quotationAllowance` çağrılır ve aktif/bitmemiş abonelik zorunludur — `src/services/billing/quota.ts:121-127`.
- Sunucu IFC yolu ise yalnız plan kimliği ve `plans.is_active` bakar; `subscriptions.status` ve `current_period_end` denetlenmez — `src/smartcheck/import/config.ts:155-160`.
- Worker entitlement fonksiyonu `subscription_status` ve `current_period_end` döndürür — `drizzle-release/0020_worker_entitlement_capability.sql:2-4`, ancak TypeScript tarafı bu iki alanı hiç okumaz — `src/smartcheck/import/config.ts:62-68`, `79-80`.
- Worker tüketimi yalnız `company_exists` denetler — `src/services/billing/quota.ts:67-72`, `109-118`.
- Kota politikası ise abonelik durumunu ve tarih aralığını zorunlu kılar — `src/services/billing/quota-policy.ts:27-36`.

**Etki:**
- Süresi dolmuş deneme, `suspended`/`overdue` abonelik veya dönem sonu geçmiş hesap, sunucu IFC işlemini başlatabilir (P0 düzeltildikten sonra) ve worker tamamlanınca kota tüketir.
- Aynı hesap tarayıcı ön analizinde 403 alırken sunucu işleminde kabul edilir; kullanıcıya çelişkili davranış.
- Ticari entitlement bypass'ı; iptal/askıya alma iş akışı fiilen uygulanmaz.

**Düzeltme yönü:**
- App ve worker için tek bir entitlement politikası: `status === 'active'` ve `current_period_start <= now < current_period_end`.
- İhlalde 403 `SUBSCRIPTION_INACTIVE` / `PLAN_UNAVAILABLE`; 503 değil.
- Worker capability fonksiyonunun döndürdüğü alanlar kullanılmalı veya fonksiyon yalnız gerekli kolonları döndürmeli.

---

### P1-2 — Pasif planda app ile worker farklı davranıyor

**Kanıt:**
- App dalı: `if (subRow?.planId && subRow.planIsActive)` sağlanmazsa "en düşük fiyatlı aktif plan"a düşer — `src/smartcheck/import/config.ts:155-195`.
- Kodun kendi yorumu bu düşüşün yalnız "plan_id boş olan firma" için olduğunu söyler — `src/smartcheck/import/config.ts:161-162`. Oysa koşul, `planId` dolu ama planı pasif olan firmayı da bu dala sokar.
- Worker dalı aynı durumda `plan_is_active=false` görüp `IFC_NOT_AVAILABLE` fırlatır — `src/smartcheck/import/config.ts:79-80`.

**Etki:**
- Pasif plana sahip firma app yolunda deneme planı limitleriyle IFC yükleyebilir; worker yolu reddeder.
- P0 düzeltildikten sonra bu fark, "yükleme kabul edildi, işlem reddedildi" şeklinde kullanıcıya yansır.
- Yetki daraltması (planın kapatılması) app tarafında etkisiz kalır.

**Düzeltme yönü:**
- `planId` doluysa ve plan pasifse fail-closed: `IFC_NOT_AVAILABLE`.
- "En düşük aktif plan" düşüşü yalnız `planId == null` için uygulanmalı; yorum ile kod eşitlenmeli.

---

### P1-3 — Deneme kotası takvim ayı sınırında iki kez veriliyor

**Kanıt:**
- Kota dönemi takvim ayıdır: `now.toISOString().slice(0, 7)` — `src/services/billing/quota-policy.ts:18`, `src/services/billing/quota.ts:86`.
- Deneme süresi 14 gündür — `src/server/routes/auth.ts:146-152`.
- Deneme planı 3 teklif / 1 IFC kotası taşır — `src/services/billing/plan-catalog.ts:24`.

**Etki:**
- Ayın 20'sinde başlayan deneme, ay sonuna kadar 3 teklif; yeni ayda tekrar 3 teklif alır. Toplam 6 teklif, 2 IFC.
- Ücretli planlarla aynı takvim-ayı mantığı kullanıldığı için deneme, ücretli kullanıcıdan daha avantajlı hale gelir.
- Gelir kaybı ve pilot ölçümlerinde çarpık kota verisi.

**Düzeltme yönü (ürün kararı gerekir):**
- Deneme kotası abonelik dönemine (14 günlük tek pencere) bağlanmalı veya deneme yalnız bir takvim ayında kota almalı.
- Davranış değişikliği `roadmap-content.ts` ve `calculation-review.ts` revizyon kaydı ile birlikte yapılmalı (AGENTS.md kuralı).

---

### P2-1 — Plan kolonu NULL olduğunda sessizce eski `PLAN_LIMITS` enum'ına düşülüyor

**Kanıt:**
- `featureMonthlyLimit`: `configured ?? PLAN_LIMITS[subscription.plan]?.[feature]` — `src/services/billing/feature-limits.ts:45-46`.
- Katalog geri doldurması yalnız `monthlyAiLimit` NULL ise çalışır; diğer limit kolonları NULL olsa bile güncellenmez — `src/services/billing/plan-catalog.ts:47`.
- Eski enum değerleri: starter 20 AI / 20 PDF / 20 teklif; pro 500/999999/5000 — `src/services/billing/limits.ts`.

**Etki:**
- AI limiti admin tarafından set edilmiş ama PDF limiti NULL kalan bir planda PDF kotası katalog değeri (ör. 150) yerine eski `starter` değeri (20) uygulanır.
- Katalog yorumundaki "NULL = henüz yapılandırılmadı" niyetiyle çelişir; kota sessizce daralır veya genişler.

**Düzeltme yönü:**
- Geri doldurma her limit alanı için bağımsız yapılmalı veya NULL durumda fail-closed davranılmalı; legacy fallback kaldırılmalı.

---

### P2-2 — Faturalama süreleri takvim ayı yerine sabit gün

**Kanıt:**
- 1/6/12/24 ay için `durationDays` = 30/180/365/730 — `src/services/billing/billing-periods.ts:20,29,38,47`.
- Dönem sonu bu gün sayısıyla hesaplanır — `src/services/billing/bank-transfer.ts` (`durationDays * 24 * 60 * 60 * 1000`).

**Etki:**
- 12 aylık plan artık yılda 1 gün, 24 aylık plan 1–2 gün erken biter; 6 aylık plan 180 gün olduğu için başlangıca göre 2–3 gün kayar.
- Sözleşme/PDF'te "12 Ay" yazarken sistem 365 gün uygular; hukuki ve muhasebe tutarsızlığı.
- Aylık plan 30 gün olduğu için her ay 0–1 gün kayar.

**Düzeltme yönü:**
- `addMonths` benzeri takvim aritmetiği; seçilen döngü (`months`) saklanmalı, türetilmiş gün sayısı kullanılmamalı.

---

### P2-3 — Kurumsal planın "ekip yönetimi" ve "öncelikli işleme" vaadi karşılıksız

**Kanıt:**
- Kurumsal plan açıklaması: "Ekip yönetimi, yüksek kapasite ve öncelikli işleme için." — `src/services/billing/plan-catalog.ts:28`; bu açıklama public fiyat sayfasında render edilir — `src/features/public-pricing/PublicPricingSection.tsx:98`.
- Koltuk limiti yok: `POST /api/invitations` plan kontrolü yapmaz — `src/server/routes/company.ts:286-293`; kodda `maxUsers`/`seatLimit` yok (önceki paket analizinde de doğrulanmış: `docs/BIMMETRAJ-PAKET-ANALIZI.md:92,98-101`).
- Öncelikli kuyruk yok; ifc-worker eşzamanlılığı varsayılan 1 — `compose.coolify.yaml:155`.

**Etki:**
- Ücretli farklılaştırıcı teslim edilmiyor; tüketici/reklam mevzuatı ve PRODUCT.md "kanıt önce" ilkesiyle çelişir.
- Kurumsal plan satın alan müşteri, vaat edilen ekip ve hız avantajını alamaz.

**Düzeltme yönü:**
- Koltuk limiti + öncelik kuyruğu uygulanmalı veya public açıklama düzeltilmeli. Public iddia değişikliği Hazar'ın açık onayını gerektirir.

---

### P2-4 — `/api/billing/plans` eski ve çelişkili limit seti döndürüyor

**Kanıt:** `app.get("/api/billing/plans", (_req, res) => res.json(PLAN_LIMITS))` — `src/server/routes/billing.ts:67-69`. Kimlik doğrulaması yok; kaynak `src/services/billing/limits.ts` legacy enum'ı. Repo içinde bu uç noktayı tüketen istemci bulunmadı.

**Etki:** DB plan kataloğu ile çelişen ikinci bir "plan limitleri" sözleşmesi; entegrasyon veya eski istemci bu uca bağlanırsa yanlış kota gösterir.

**Düzeltme yönü:** Tüketici yokluğu doğrulanarak kaldırılmalı veya `/api/public/plans`'a yönlendirilmeli.

---

### P2-5 — Kurumsal planın 2 eşzamanlı IFC hakkı, worker eşzamanlılığı 1 ile sınırlı

**Kanıt:**
- Plan: `ifcMaxConcurrent: 2` — `src/services/billing/plan-catalog.ts:28`.
- ifc-worker: `SMARTCHECK_IFC_WORKER_CONCURRENCY: ${...:-1}` — `compose.coolify.yaml:155`.
- Kuyruk kabulü plandaki 2'yi kabul eder — `src/smartcheck/import/service.ts:121-125`.

**Etki:** İki IFC aynı anda kabul edilir ama tek worker sırayla işler; müşteri "kapasite" yerine bekleme görür. Kaynak artırılmadıkça plan vaadi karşılanmaz.

**Düzeltme yönü:** Kaynak bütçesine göre env değeri 2+ yapılmalı veya plan değeri 1'e çekilmeli; kapasite ölçümü T45/T52 kapsamında kanıtlanmalı.

---

### P3-1 — Kullanılmayan worker giriş noktası ve `stripe` bağımlılığı

**Kanıt:**
- `src/worker/index.ts` graphile-worker başlatır; ancak gerçek worker girişi `src/smartcheck/import/worker.ts` → `dist/worker.mjs` — `Dockerfile:12,45-46`.
- `package.json`/`compose.coolify.yaml` içinde `src/worker/index.ts` referansı yok.
- `stripe` bağımlılığı `package.json:96`'da tanımlı; `src/` içinde import edilmiyor (ödeme akışı banka havalesi).

**Etki:** Yanlış dosyayı düzenleme riski, gereksiz dependency yüzeyi ve güvenlik taraması gürültüsü.

**Düzeltme yönü:** Dış import olmadığı doğrulanarak silinmeli; `stripe` kaldırılmalı (kart ödemesi planı yoksa).

---

### P3-2 — `toFiniteNumber(null, fallback)` fallback uygulamıyor

**Kanıt:** `Number(null)` ve `Number("")` 0 döndürür; `Number.isFinite(0)` doğrudur — `src/lib/calculations.ts:48-50`. Bu nedenle `toFiniteNumber(item.vatPercent, 20)` null/boş string için 20 değil 0 verir — `src/lib/calculations.ts:103`.

**Bugünkü erişilebilirlik:** Teklif API'si Zod ile `vatPercent` için `null` kabul etmez (`z.number() | z.string()`), varsayılan 20'dir — `src/services/quotations/input.ts:30-43`. DB kolonu `NOT NULL DEFAULT 20` — `src/db/schema.ts:927`. Dolayısıyla bugün kullanıcıya açık bir yol yok; ancak Zod dışı yeni bir çağrı yolu sessiz %0 KDV üretir.

**Düzeltme yönü:** `null`/`undefined`/`""` değerleri `Number()` öncesinde "eksik" sayılmalı; fallback yalnız gerçekten eksik girdide uygulanmalı.

---

## 4. GAP bulguları (yetenek / kanıt / iddia boşlukları)

| ID | GAP | Kanıt | Etki | Kapatma ölçütü |
|---|---|---|---|---|
| GAP-1 | Canlı (`live/L3`) yetenek yok | Registry: 19 kayıt; 17 `pilot/L2`, 2 `roadmap/L1`, 0 `live/L3` — `src/capabilities/registry.ts:67` | Tüm public iddialar pilot seviyesinde kalmalı; "canlı/doğrulanmış" denemez | İsimli, sicilli uzman imzası + altın test + resmî kaynak; kayıt `live/L3`'e ancak o zaman çıkar |
| GAP-2 | Koltuk (kullanıcı) limiti yok | Davet rotasında plan kontrolü yok — `src/server/routes/company.ts:286-293`; kodda seat alanı yok | Ekip planı farklılaştırıcısı gerçek değil; kurumsal müşteri sınırsız kullanıcı açar | Plan başına `maxUsers` ve davet anında zorunlu kontrol |
| GAP-3 | Öncelikli işleme yok | `plan-catalog.ts:28` vaadi; kuyrukta öncelik parametresi yok; worker eşzamanlılığı 1 — `compose.coolify.yaml:155` | Kurumsal plan hız vaadi karşılanmıyor | Ayrı öncelikli kuyruk veya ağırlıklı işleme + ölçüm |
| GAP-4 | Kart/Stripe ödemesi yok | Ödeme akışı yalnız banka havalesi; `stripe` import edilmiyor — `package.json:96` | Self-servis satın alma yok; pilot dışı ölçekleme sınırlı | Stripe/iyzico canlı entegrasyon + webhook + mutabakat |
| GAP-5 | SmartCheck üretim açılışı ve dış kabul kapıları açık | Compose varsayılanı `SMARTCHECK_IMPORT_ENABLED=false` — `compose.coolify.yaml:44`; T50–T52 dış girdi bekliyor — `GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md:84-86` | Ürünün ana farklılaştırıcısı canlıda kanıtlanmadı | İzinli gerçek dosyalar, uzman kabulü, canlı pilot KPI |
| GAP-6 | Resmî ÇŞB/YFK fiyatlarının ticari kullanım izni yok | Önceki kaynak araştırması ve paket analizi; onaylı resmî fiyat satırı yok | "Resmî fiyat" iddiası kurulamaz; teklif fiyatları demo/kaynak izli olmalı | YFK yazılı izni + SHA-256 mühürlü kaynak + onay durumu |
| GAP-7 | AI anahtarları, DKIM, Sentry DSN ve dış güvenlik incelemesi canlıda teyitsiz | `compose.coolify.yaml` opsiyonel env'ler; handoff'ta açık maddeler — `HANDOFF_2026-10-30_T41_8B_TAMAMLANDI.md` | AI fallback, e-posta teslim edilebilirliği ve olay müdahalesi kanıtsız | Canlı env doğrulaması, DKIM/SPF/DMARC testi, Sentry olay testi, bağımsız güvenlik incelemesi |
| GAP-8 | T45 gerçek büyük müşteri dosyası; T55 hukuk/reklam incelemesi | Yol haritası Faz 7/9 — `GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md:44,49` | Performans ve iddia uygunluğu saha verisiyle kanıtsız | İzinli dosya + ölçüm; hukuk/reklam onayı |
| GAP-9 | Fiyat ekonomisi ve kalibrasyon dayanağı yok | Katalog fiyatları 1.250–8.900 TL; maliyet/support/CPU modeli yok — `docs/BIMMETRAJ-PAKET-ANALIZI.md` | Public fiyat sayfası var ama pilot ekonomisi doğrulanmadan yayınlanmış durumda; PRODUCT.md ile gerilim | Pilot maliyet/support ölçümü + fiyat kararı |

> Not: Academy (`ACADEMY_ENABLED=false`, `src/config/features.ts:6`) ve ilerleme ödemeleri (`PROGRESS_PAYMENTS_ENABLED` varsayılan kapalı) bilinçli olarak kapalıdır; bunlar GAP değil, kapsam kararıdır.

---

## 5. İddia–gerçeklik dengesi (doğrulanan olumlu maddeler)

Rapor yalnızca eksikleri değil, doğru çalışan kritik alanları da kaydeder:

| Alan | Durum | Kanıt |
|---|---|---|
| Para yuvarlaması | Düzeltilmiş: satır bazında yarım-yukarı, toplam kuruştan | `src/lib/calculations.ts` (`roundMoney`, `calculateQuotationTotals`) |
| 3×3 kural paketi | Sunucu IFC run'ına bağlı | `src/smartcheck/rules/ifc-rule-run.ts` (`evaluateIfcRulePacks`) |
| Demo girişi | Yalnız `import.meta.env.DEV` | `src/hooks/useAuth.tsx:74-98` |
| Admin koruması | Super-admin kapısı router düzeyinde | `src/server/routes/admin.ts:100` |
| IBAN doğrulama | ISO 13616 mod-97 + aktif hesap filtresi | `src/services/billing/bank-transfer.ts` |
| Public planlar | DB'deki yayınlanmış planlardan | `src/services/billing/public-plans.ts`, `src/server/routes/billing.ts` |
| Başarısız IFC run'ı kota tüketmiyor | Yalnız başarılı tamamlanmada tüketim | `src/smartcheck/import/processor.ts:383-404` |
| Tenant izolasyonu / RLS | 72/72 `company_id` tablosu, FORCE RLS + Exact-ACL | `GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md:42` |
| Kurtarma tatbikatı | Docker PG16, RPO 0, 38 migration | `HANDOFF_2026-10-30_T41_8B_TAMAMLANDI.md` |

---

## 6. Canlı doğrulama kontrol listesi (Hazar)

Bu adımlar tamamlanmadan P0'ın üretimdeki durumu "kesin" sayılmamalıdır; ancak kod kanıtı güçlüdür.

1. `/api/health` → `200`, `revision` build damgası `3a9bb7d` (Coolify deployment geçmişiyle çapraz kontrol).
2. `/api/public/plans` → yayınlanmış plan sayısı ve fiyatlar; katalog v6 ile eşleşme.
3. `/api/public/bank-accounts` → yalnız geçerli TR IBAN'lar, boş veya hatalı kayıt yok.
4. App konteynerinde `SMARTCHECK_IMPORT_ENABLED` ve `SMARTCHECK_PILOT_COMPANY_IDS` gerçek değerleri; S3 değişkenleri.
5. `scripts/role-model-smoke.ts` → production rollerinde geçiş.
6. **Gerçek IFC `process` testi (UZMAN rolü):** Bu adım P0-1'i doğrudan test eder. Beklenen hatalı sonuç: `503 IFC_LIMITS_UNAVAILABLE`. Düzeltme sonrası beklenen: `202` ve kuyrukta run.
7. Admin worker heartbeat özeti → ifc-worker canlı ve lease alıyor mu.
8. Deneme kotası ay sınırı testi (staging): 14 günlük deneme ay sonunu geçtiğinde ikinci kota verilmemeli.

**Güvenlik notu:** Tüm DB testleri yalnız atılabilir/izole PG16 üzerinde çalıştırılmalı; paylaşılan veritabanına yönlendirilmemelidir (AGENTS.md).

---

## 7. Önerilen düzeltme sırası

1. **P0-1:** HTTP yolunda app caller'a dön; üretim modunda app rolüyle PG16 entegrasyon testi ekle; canlı IFC smoke ile doğrula.
2. **P1-1:** App ve worker için tek entitlement politikası (status + period).
3. **P1-2:** Pasif planda fail-closed; fallback yalnız `planId == null`.
4. **P1-3:** Deneme kotası kararı (ürün onayı) + roadmap/calculation-review kaydı.
5. **P2-1:** Limit alanlarını bağımsız geri doldur; legacy fallback'i kaldır.
6. **P2-2:** Takvim ayı aritmetiğine geç.
7. **P2-3 / GAP-2 / GAP-3:** Koltuk ve öncelik ya uygulanmalı ya public iddiadan çıkarılmalı (Hazar onayı).
8. **P2-4 / P3-1 / P3-2:** Ölü uç, kullanılmayan dependency ve derinlik savunması temizliği.

---

## 8. Kanıt sınırları ve dürüstlük notu

- Bu rapor **kod ve konfigürasyon** kanıtına dayanır; üretim ortamında yeniden üretim yapılmadı.
- Tam test paketi izole PostgreSQL 16 olmadığı için çalıştırılamadı; DB'ye bağlı testlerin düşüşü ürün kusuru olarak sayılmadı.
- P0'ın canlı etkisi, SmartCheck'in üretimde açık olup olmamasına bağlıdır; her iki durum da kabul edilemez (kapalıysa yetenek yok, açıksa IFC hattı kırık).
- Bu belge hiçbir mühendislik/maliyet sayısını değiştirmez; 3×3 politikası ve mühendislik kuralları etkilenmemiştir.

**Sonuç:** Teklif çekirdeği ve tenant güvenliği olgun; kritik risk, SmartCheck IFC hattının üretimde çalışmaması ve entitlement'ın abonelik yaşam döngüsünü denetlememesidir. İlk düzeltme P0-1 olmalıdır.
