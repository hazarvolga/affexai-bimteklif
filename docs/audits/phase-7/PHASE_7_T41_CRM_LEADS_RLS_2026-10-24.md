# Faz 7 / T41 — CRM Lead ve Kota Güven Sınırı Beşinci Dilim

**Tarih:** 24 Ekim 2026
**Revizyon:** Rev. 55 / `BIM-CALC-2026-10-24.49`
**Kod baseline:** `82207c293f7ff527b3962e8f3e8ceabf58b9fe80`
**Karar:** **PARTIAL / PRODUCTION NO-GO**

## Uygulanan sınır

Migration `0018_crm_leads_tenant_rls`, `leads`, `companies`, `subscriptions` ve `usage_logs` tablolarında `ENABLE + FORCE RLS` uygular. `plans` global katalogdur ve app için yalnız SELECT açıktır. Exact ACL matrisi app'e tenant companies/subscriptions okuması, tenant leads/usage_logs okuma-ekleme yetkisi verir; worker kritik beş tabloda default-deny, backup SELECT-only ve migrator-owner yalnız bakım yoludur. App/worker için yeni public tablo ve sequence default grant'leri kaldırılmıştır.

`CrmLeadService.list/create` tek `withTenantTransaction` kullanır. Create akışında CRM kota rezervasyonu ile lead insert aynı transactiondadır. Company UUID tabanlı transaction advisory lock eşzamanlı kota yarışını serileştirir; başarısız insert usage kaydını rollback eder. Input strict ve bounded, status/companyId istemciden alınmaz, DTO `companyId` döndürmez. Merkezi hata handler'ı PostgreSQL detail/where/query/parameters/nested cause alanlarını log/Sentry sınırına taşımaz.

## Kanıt

- CRM PostgreSQL 16 adversarial kontratı: 1/1 PASS.
- Company-industry, SmartCheck pilot, hakediş ve CDE RLS regresyonları: 10/10 PASS.
- Role provisioning PostgreSQL 16: 1/1 PASS.
- Focused route, artifact, role, quota ve telemetry testleri: 40/40 PASS.
- Root ve release TypeScript kontrolleri ile `git diff --check`: PASS.
- `0018` release SQL/snapshot/manifest/journal ve bağımsız logical catalog hash'i pinlidir.

## Açık production kapısı

Kayıt, şirket ayarı, pilot provisioning, banka transferi/abonelik ve admin plan değişiklikleri halen ortak app pool üzerinden authority tablolarına yazmaktadır. Rev. 55 exact ACL bu geniş yazmayı bilinçli olarak kapatır. Bu yollar ayrı credential kullanan control-plane rolü/pool'una veya aynı güven sınırını sağlayan dar kontrol fonksiyonlarına taşınmadan production role cutover yapılırsa meşru işlemler durur. Bu nedenle deploy, canary ve canlı izolasyon iddiası **NO-GO**'dur.

T41 ve Faz 7 PARTIAL kalır. Hesap formülleri/sonuçları ve public pazarlama sayfaları değişmemiştir; bu kayıt bağımsız uzman kabulü değildir.
