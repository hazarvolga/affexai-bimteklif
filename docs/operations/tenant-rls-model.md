# CDE ve hakediş tenant RLS modeli

**Sürüm:** Rev. 52 / `BIM-CALC-2026-10-24.46`
**Kod baseline:** `cd4b640d77cf3662b7f2f0270c1460f56fd0f56e`
**Durum:** **PARTIAL — CDE ve hakediş bounded context dilimleri; production cutover yok**

## Korunan tablolar

`cde_projects`, `cde_project_members`, `cde_containers`, `cde_revisions` ve `cde_transition_events` ile aşağıdaki on hakediş tablosu `ENABLE ROW LEVEL SECURITY` ve `FORCE ROW LEVEL SECURITY` kullanır:

- `construction_contracts`
- `construction_contract_items`
- `progress_payment_periods`
- `progress_payment_lines`
- `progress_measurements`
- `progress_measurement_review_events`
- `progress_payment_adjustments`
- `progress_payment_events`
- `contract_variations`
- `final_accounts`

| Bağlantı | Policy | Sonuç |
|---|---|---|
| `bimmetraj_app` | `company_id = current_setting('bimmetraj.company_id', true)::uuid` | Aktif tenant için SELECT/INSERT/UPDATE/DELETE |
| `bimmetraj_worker` | Yok | Default-deny |
| `bimmetraj_backup` | Exact current role | SELECT-only |
| `bimmetraj_migrator` → `SET LOCAL ROLE bimmetraj_owner` | Exact session/current role birleşimi | Migration bakımı |
| Başka rol veya context yok | Yok | Default-deny |

Policy'lerin `TO public` hedefi rol yaratma sırasına bağımlılığı kaldırır; policy içindeki exact `current_user`/`session_user` koşulları erişimi sınırlar. Tablo ACL'leri ayrıca T40 rol sözleşmesiyle yönetilir.

## Runtime transaction sözleşmesi

Her CDE servis çağrısı ve `ProgressPaymentService` veritabanı giriş noktası:

1. UUID biçimindeki `companyId` ve `userId` değerlerini pool checkout öncesi doğrular.
2. Tek bir `PoolClient` ile transaction açar.
3. `session_user` ve `current_user` değerlerinin exact `bimmetraj_app` olduğunu; rolün LOGIN/NOINHERIT/NOSUPERUSER/NOBYPASSRLS/NOCREATEROLE/NOCREATEDB/NOREPLICATION taşıdığını ve hiçbir membership edge'i olmadığını doğrular.
4. `set_config(..., true)` ile iki GUC'yi transaction-local bağlar.
5. Bounded context işini aynı client üzerinde yürütür; başarıda commit, hatada rollback yapar.
6. Rollback başarısızsa bağlantıyı hata ile release ederek pool'dan attırır.

Uygulama katmanındaki `company_id` filtreleri ve proje üyeliği/RBAC kontrolleri korunur. RLS bunlara ikinci bir veritabanı savunması ekler. Rev. 52, `ProgressPaymentService` içindeki bütün DB girişlerini ortak tenant transaction yardımcısından geçirir; pool'dan ayrı bağlantı alan veya tenant context dışında sorgu çalıştıran alternatif bir servis yolu bırakmaz.

## Operasyonel kapı

`database-roles:inspect`, release ledger'ında `0013_cde_tenant_rls` ve `0015_progress_payment_tenant_rls` tag'lerini gördüğünde ilgili bounded context için şunları exact karşılaştırır:

- İlgili migrationın kapsadığı bütün tablolar ve owner=`bimmetraj_owner`.
- `ENABLE` ve `FORCE` RLS.
- Her tabloda yalnız app tenant, backup read ve owner migration policy'leri.
- Policy komutu, PUBLIC OID hedefi, permissive modu, `USING` ve `WITH CHECK` ifadeleri.

Hakediş tablolarından biri mevcutken `0015` ledger tag'i eksikse veya tag uygulanmış kabul edilirken tek bir tablo/policy bile eksikse inspector/provisioner fail-closed kapanır; pre-schema bootstrap sırasında tag ve tabloların birlikte bulunmaması geçerli başlangıç durumudur. Release manifest/stage imzaları `0015` artifact'ını sabitler ve migration postcondition'ı kurulan RLS/policy durumunu doğrular. Rev. 52 kanıtı focused 19/19, hakediş PostgreSQL 1/1, CDE PostgreSQL 7/7, rol PostgreSQL 1/1 ve root/release TypeScript derlemelerinin geçmesini içerir; code/security review GO vermiştir.

Her production migration/cutover öncesinde hem release migration doğrulaması hem rol inspector'ı geçmelidir. Bu model compose secret rotasyonu veya deployment yetkisi vermez. Production cutover, canary, restore/parity, rollback ve deploy gerçekleştirilmemiştir.

## Güven sınırı

Custom tenant GUC, uygulamanın yanlış/eksik tenant filtresine ve pool reuse sızıntısına karşı koruma sağlar. App credential ele geçirilip keyfi SQL çalıştırılırsa saldırgan custom GUC değerini değiştirebilir. Bu nedenle SQL injection önleme, input validation, app credential koruması, T40 runtime cutover ve production monitoring zorunlu kalır.

T41 genel durumu **PARTIAL** kalır: bu belge yalnız CDE ve hakediş bounded context tablolarını kapsar; diğer tenant tabloları henüz aynı RLS sözleşmesine alınmamıştır. `PROGRESS_PAYMENTS_ENABLED` varsayılan olarak kapalıdır. Rev. 52 hesap formüllerini veya sonuçlarını değiştirmez; izinli resmî Yeşil Defter/ataşman dosyalarıyla bağımsız uzman kabulü ayrıca gereklidir.
