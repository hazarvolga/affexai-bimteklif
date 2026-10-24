# Faz 7 / T41 Şirket Sektör Ayarı Tenant RLS — Rev. 54

**Tarih:** 24 Ekim 2026
**Sürüm:** `BIM-CALC-2026-10-24.48`
**Kod baseline:** `63c5c6080b37fc135288335c9a76ffaba5625926`
**Durum:** **PARTIAL — yerel kod ve izole PostgreSQL 16 kanıtı; production/deploy ve bağımsız uzman kabulü yok**

## Kapsam

Bu dördüncü T41 dilimi şirketin sektör ayarını tenant sınırında, global sektör kataloğunu ise salt-okunur runtime rol sınırında korur. Hesap yöntemleri, formüller ve hesap sonuçları değişmemiştir. Public pazarlama sayfaları değiştirilmemiştir.

| Nesne | FORCE RLS / policy sözleşmesi | Mutasyon sınırı |
|---|---|---|
| `company_industry_settings` | Exact beş policy: app tenant SELECT, INSERT ve UPDATE; backup SELECT; migrator-owner ALL | App DELETE policy yoktur; worker ve bağlamsız erişim default-deny |
| `industries` | Exact üç policy: app SELECT, backup SELECT, migrator-owner ALL | App/worker katalog mutasyonu yoktur |

## Deterministik katalog bootstrapı

Migration `0017_company_industry_settings_tenant_rls` dört canonical `INITIAL_PLUGINS` satırını ekler:

- `residential`
- `electrical`
- `mechanical`
- `renovation`

Insert, `ON CONFLICT (id) DO NOTHING` kullanır. Eksik canonical satırlar deterministik olarak tamamlanır; aynı kimliğe sahip mevcut operatör satırları güncellenmez, silinmez veya varsayılan içerikle ezilmez.

## Runtime ve kullanıcı arayüzü sözleşmesi

- `GET/POST /api/company/industry-settings` DB işleri `CompanyIndustrySettingsService` üzerinden tek checked-out bağlantı ve transaction-local tenant context ile çalışır.
- Liste ve upsert sorgularındaki açık `company_id` koşulları defense-in-depth olarak korunur.
- POST gövdesi exact alan kümesi, `industryId` string/pattern/uzunluğu ve `isEnabled` boolean tipiyle doğrulanır. Bilinmeyen veya kapalı sektör kimliği fail-closed reddedilir.
- UI, kalıcılık yanıtı başarısızsa success toast göstermez ve kullanıcıya sunucu hata mesajını gösterir.

## Inspector ve release kapısı

Migration `0017_company_industry_settings_tenant_rls` release manifest, journal, snapshot ve stage signature kayıtlarına bağlıdır. Migration postcondition ve `database-roles:inspect` şunları fail-closed doğrular:

- İki tablonun eksiksiz varlığı, `ENABLE/FORCE RLS` durumu ve exact 5/3 policy matrisi.
- Policy adı, komutu, PUBLIC hedefi, permissive modu, `USING` ve `WITH CHECK` ifadeleri.
- Korunan tablolardan biri mevcutken `0017` ledger tag'inin eksikliği.
- Tag uygulanmışken eksik tablo veya policy drift'i.

Tag ve iki kapsam tablosunun birlikte bulunmadığı pre-schema bootstrap geçerli başlangıç durumudur. Bu istisna kısmi kurulum veya uygulanmış-tag drift'ini geçerli saymaz.

## Doğrulama kaydı

- Route/service testleri tek tenant transactionı, strict input, bilinmeyen sektör ve hata yanıtlarını doğruladı.
- UI client testi başarısız persistence yanıtının açık hata olarak kaldığını doğruladı.
- Release artifact/data-transition ve database-role contract testleri geçti.
- Parola doğrulamalı izole PostgreSQL 16 sözleşmesi tenant A/B ayrımı, context yokluğu, app S/I/U ve no-DELETE, worker default-deny, backup SELECT-only, migrator-owner bakım yolu, pool GUC temizliği, deterministik katalog/bootstrap koruması ve inspector drift senaryolarını doğruladı.
- CDE, hakediş, SmartCheck pilot ve canonical rol PostgreSQL regresyonları ile root/release TypeScript kontrolleri geçti.
- Bağımsız code review ve security review sonucu **GO**.

Bu doğrulamalar local/CI hazırlığını gösterir. Production migration, credential cutover, canary, restore/parity, rollback veya deploy kanıtı değildir.

## Açık sınırlar

- T41 ve Faz 7 **PARTIAL** kalır. Korunan toplam 18 tenant tablosu ile pilot audit/global katalog yüzeyleri dışındaki tenant tabloları aynı RLS sözleşmesine henüz alınmamıştır.
- Global katalog bootstrapı vendor doğrulaması, fiyat kaynağı veya mevzuat onayı değildir.
- İzinli gerçek IFC/PDF/vendor dosyalarıyla kabul ve ad-soyad/unvan/sicil/tarih içeren bağımsız uzman imzası yoktur.
- Bu kayıt L3/L4, mevzuata tam uygunluk, production readiness veya canlı tenant izolasyonu iddiası değildir.

## Değişen ana dosyalar

- `drizzle-release/0017_company_industry_settings_tenant_rls.sql`
- `src/services/company-industry-settings/service.ts`
- `src/server/routes/company.ts`
- `src/pages/settings-industry-client.ts`
- `src/pages/Settings.tsx`
- `src/db/schema.ts`
- `scripts/database-roles/contract.ts`
- `scripts/database-roles/inspect.ts`
- `scripts/release-migrations/data-transitions.ts`
- `scripts/release-migrations/stage-signatures.ts`
- `src/contracts/company-industry-tenant-rls.pgtest.ts`
- `src/server/routes/company.industry-settings.test.ts`
- `src/pages/settings-industry-client.test.ts`
