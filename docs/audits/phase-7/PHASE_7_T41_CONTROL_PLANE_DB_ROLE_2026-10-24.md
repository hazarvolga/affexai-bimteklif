# Faz 7 / T41 — control-plane DB rolü ve mutation ayrımı kanıtı

**Tarih:** 24 Ekim 2026

**Yol haritası:** Rev. 57

**Hesap kaydı:** `BIM-CALC-2026-10-24.51`

**Kod baseline:** `a55841e56c0829f61802bc0db63e7baa1d317370`

**Karar:** **PARTIAL / production NO-GO**

## Sonuç

Rev.55 ile daraltılan `bimmetraj_app` ACL'sinin artık gerçekleştiremediği meşru kayıt, şirket, ödeme/abonelik, admin plan ve kota telafi mutasyonları `1dcc0bc` ile ayrı `bimmetraj_control` kimliğine taşındı. Rev.56 final code/security review bulguları `a55841e` ile kapatıldı: app/control/worker authority ve support tablo ACL'leri exact matrise indirildi; auth, davet ve Academy mutasyonları control pool ile hizalandı; effective URL override, TLS downgrade, audit DELETE ve eksik production preflight reddedildi.

Bu yerel dilim control-plane yazma ayrımını ve incelemede bulunan P1 açıklarını kapatır; tenant bağlamsız app okumalarını, worker entitlement okuma sınırını veya production cutover'ı kapatmaz.

Hesap yöntemleri, mühendislik formülleri ve kullanıcıya gösterilen sonuçlar değişmedi. Bu kayıt bağımsız uzman onayı, canlı kanıt, L3/L4 kabulü veya deploy izni değildir.

## Rol ve secret sınırı

- `bimmetraj_control`: `LOGIN`, `NOINHERIT`, `NOBYPASSRLS`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`.
- `CONTROL_DATABASE_URL` yalnız app hizmetine verilir. Worker, IFC worker, migrate, backup ve PostgreSQL hizmetleri bu değişkeni almaz.
- URL doğrulaması exact `bimmetraj_control` kullanıcı adını ve `DATABASE_URL` ile aynı host/port/database hedefini zorunlu kılar. Yalnız `sslmode`, `application_name` ve `connect_timeout` kabul edilir; rol veya `search_path` gibi davranış override'ları reddedilir.
- Control rolü owner/migrator rolüne geçemez, queue şemasını veya `leads` tablosunu kullanamaz. Broad sequence ve pre-schema all-table grant'i yoktur.

Test ortamındaki otomatik izole schema fallback'i yalnız `NODE_ENV=test` ve `teklifpro_test_...` biçimli `search_path` ile devreye girebilir; production davranışı değildir.

## Exact yetki matrisi

| Tablo/yüzey | `bimmetraj_control` |
|---|---|
| `companies`, `subscriptions` | SELECT, INSERT, UPDATE, DELETE |
| `plans` | SELECT, INSERT, UPDATE; DELETE yok |
| `usage_logs` | SELECT, INSERT, DELETE; UPDATE yok |
| `leads` | Yetki yok |
| Kayıt/ödeme destek tabloları | Yalnız `scripts/database-roles/contract.ts` içindeki exact allowlist |
| `teklifpro_queue` ve allowlist dışı public tablolar | Yetki yok |

`0019_control_plane_rls`, `companies` ve `subscriptions` için control ALL; `usage_logs` için ayrı SELECT, INSERT ve DELETE policy'leri kurar. App doğrudan user, membership veya auth-token mutasyonu yapamaz; audit tablolarında app/control DELETE kapalıdır. Inspector relation ACL, policy komutu, `USING`/`WITH CHECK`, role identity ve allowlist dışı grant driftini fail-closed reddeder.

## Taşınan mutation yolları

- kayıt ve kayıt compensation işlemleri;
- SmartCheck pilot tenant oluşturma/dönüştürme ve compensation;
- şirket profil/risk/sektör ayarı mutasyonları;
- banka transferi gönderme/inceleme ve abonelik/şirket güncellemesi;
- admin plan, abonelik, şirket değişiklikleri ve plan katalog senkronizasyonu;
- feature quota release ve detached usage audit;
- auth token, davet ve Academy control mutasyonları.

Bu yollar `src/db/control-plane.ts` üzerinden lazy control pool kullanır. Test izolasyon temizliği control pool'u da kapatır.

Kayıt sonrası e-posta teslimi başarısız olduğunda append-only ödeme audit'ine bağlı hesap silinmez. Hesap korunur ve istemciye `emailVerificationDeliveryPending` durumu döner; yeniden gönderim yolu kullanılabilir.

## Doğrulama

| Kanıt | Sonuç |
|---|---|
| Rev.57 focused production/config/control/invitation testleri | 22/22 PASS |
| Önceki auth/Academy focused seti | 26/26 PASS |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm run build` | PASS |
| `git diff --check` | PASS |
| Disposable PostgreSQL 16 database-role provisioning | 1/1 PASS |
| Disposable PostgreSQL 16 CDE RLS | 7/7 PASS |
| Disposable PostgreSQL 16 progress-payment RLS | 1/1 PASS |
| Disposable PostgreSQL 16 SmartCheck pilot RLS | 1/1 PASS |
| Disposable PostgreSQL 16 company-industry RLS | 1/1 PASS |
| Disposable PostgreSQL 16 CRM/control contract | 1/1 PASS |

Tam `pnpm test` denemesi DB-backed integration testlerinin güvenli, izole `DATABASE_URL` olmadan çalışmayı reddetmesi nedeniyle tamamlanmadı. Bu nedenle repo-wide test geçişi iddia edilmez. Yeni compose credential'ının görünür kıldığı iki sözleşme testi düzeltildi ve focused sette geçti.

Son code reviewer ve security reviewer `a55841e` baseline'ını yeniden inceledi; ikisi de **LOCAL GO**, P0/P1 yok sonucunu verdi. İki P2 sınır açık kaldı:

- ücretli plan kaydı + e-posta teslim hatası + resend akışı için route/DB integration testi;
- audit satırlarının app INSERT yetkisi nedeniyle app credential compromise altında forge edilebilir olması. Append-only kayıt, kriptografik authenticity veya bağımsız uygunluk kanıtı değildir.

## Açık kapılar ve güvenli devam sırası

1. Tenant context kurulmadan yapılan app okumalarını aynı checked-out bağlantı ve transaction-local tenant context sınırına taşı.
2. Worker'a authority tablolarında geniş SELECT vermeden, plan/abonelik entitlement okuması için dar ve doğrulanabilir bir okuma sınırı kur.
3. Kalan tenant tablolarını envanterle, FORCE RLS/ACL kapsamına al ve A/B negatif testleri ekle.
4. Güvenli izole DB ile tam test hattını ve ücretli kayıt teslim-hatası/resend integration senaryosunu çalıştır.
5. Audit authenticity ihtiyacı varsa app dışı imzalama/append sınırını ayrı tehdit modeliyle tasarla.
6. Production secret cutover, migration, canary, restore/parity ve rollback planını somut release SHA ile ayrıca onaya sun.

Bu adımlar tamamlanmadan T41 veya Faz 7 kapanmış, production-ready ya da deploy edilebilir sayılamaz.
