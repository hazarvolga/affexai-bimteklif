# Faz 7 / T41 — Hakediş tenant RLS ikinci dilim kanıtı

**Tarih:** 24 Ekim 2026
**Kod baseline:** `cd4b640d77cf3662b7f2f0270c1460f56fd0f56e`
**Yol haritası:** Rev. 52
**Hesaplama kaydı:** `BIM-CALC-2026-10-24.46`
**Karar:** **PARTIAL — hakediş bounded context yerel kod/PG16 kanıtı hazır; production cutover ve genel T41 kapanışı yok**

## Kapsam

Rev. 52, T41'in ikinci bounded-context dilimidir. `0015_progress_payment_tenant_rls` migrationı aşağıdaki on tabloya `ENABLE ROW LEVEL SECURITY` ve `FORCE ROW LEVEL SECURITY` uygular:

1. `construction_contracts`
2. `construction_contract_items`
3. `progress_payment_periods`
4. `progress_payment_lines`
5. `progress_measurements`
6. `progress_measurement_review_events`
7. `progress_payment_adjustments`
8. `progress_payment_events`
9. `contract_variations`
10. `final_accounts`

Her tabloda policy sınırı aynıdır:

| Bağlantı kimliği | Yetki |
|---|---|
| `bimmetraj_app` | Yalnız transaction-local `bimmetraj.company_id` ile eşleşen tenant satırlarında SELECT/INSERT/UPDATE/DELETE |
| `bimmetraj_worker` | Policy yok; default-deny |
| `bimmetraj_backup` | SELECT-only |
| `bimmetraj_migrator` → `SET LOCAL ROLE bimmetraj_owner` | Migration/bakım yolu |
| Başka rol veya tenant context yok | Default-deny |

`ProgressPaymentService` içindeki bütün veritabanı giriş noktaları tek checked-out bağlantıda transaction açar, exact restricted app oturumunu doğrular, `companyId` değerini transaction-local context olarak bağlar ve bütün sorguları aynı bağlantıda tamamlar. Böylece uygulama filtresine ek olarak veritabanı düzeyinde tenant savunması bulunur.

## Fail-closed release ve inspector sınırı

- `drizzle-release/manifest.json` ve stage signatures migration `0015_progress_payment_tenant_rls` kaydını taşır.
- `database-roles:inspect` migration tag'i uygulandığında on tablonun tamamını, owner/RLS/FORCE durumunu ve exact üç-policy matrisini karşılaştırır.
- Hakediş tablolarından biri mevcutken `0015` tag'i eksikse veya `0015` uygulanmış kabul edilirken tek bir tablo/policy eksikse inspector ve provisioner reddeder. Tag ve tabloların birlikte bulunmadığı pre-schema bootstrap durumu geçerlidir.
- Release data transition kontrolü RLS/FORCE ve policy driftini migration postcondition olarak doğrular.
- Worker için açık policy üretilmez; erişim default-deny kalır.

## Doğrulama özeti

| Kontrol | Sonuç |
|---|---:|
| Focused TypeScript sözleşme/servis/migration testleri | 19/19 PASS |
| Hakediş tenant RLS, izole PostgreSQL 16 | 1/1 PASS |
| CDE tenant RLS regresyonu, izole PostgreSQL 16 | 7/7 PASS |
| Veritabanı rol/provision regresyonu, izole PostgreSQL 16 | 1/1 PASS |
| Root TypeScript compile | PASS |
| Release TypeScript compile | PASS |
| Release migration diff-check | PASS |
| Kod incelemesi | GO |
| Güvenlik incelemesi | GO |

## Değişmeyen mühendislik hesabı

Bu dilim hakediş formüllerini, sabit noktalı tutar hesabını, dönemsel/kümülatif sonuçları veya sözleşme tavanı mantığını değiştirmez. Değişiklik, mevcut sonuçların tenant sınırını ve veritabanı erişim yolunu güçlendirir. `PROGRESS_PAYMENTS_ENABLED` sunucu bayrağı varsayılan olarak kapalı kalır.

## Açık kapılar

- T41 genel olarak kapanmadı; CDE ve hakediş dışındaki tenant tabloları aynı RLS sözleşmesine henüz alınmadı.
- Production credential cutover, deploy, canary, restore/parity ve rollback yapılmadı.
- İzinli resmî Yeşil Defter/ataşman dosyalarıyla bağımsız teknik ofis kabulü yapılmadı.
- Lisanslı OSKA/AMP native import kabulü ve bağımsız adlı uzman imzası yoktur.
- Bu kayıt production/live, L3, resmî uyumluluk veya bağımsız uzman kabulü iddiası değildir.

Public `LandingPage.tsx`, `LegislationView.tsx` ve `BimGlossary.tsx` değiştirilmedi; Rev. 52 kullanıcıya açık bir yetenek, mevzuat kapsamı veya hesap sonucu eklemez.
