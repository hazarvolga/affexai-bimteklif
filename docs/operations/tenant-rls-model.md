# CDE tenant RLS modeli

**Sürüm:** Rev. 48 / `BIM-CALC-2026-10-24.42`
**Kod baseline:** `58cf3205fa6a4c7d2244dd27bb9bd83fe895aef0`
**Durum:** **PARTIAL — yalnız ilk CDE dilimi; production cutover yok**

## Korunan tablolar

`cde_projects`, `cde_project_members`, `cde_containers`, `cde_revisions` ve `cde_transition_events` `ENABLE ROW LEVEL SECURITY` ile birlikte `FORCE ROW LEVEL SECURITY` kullanır.

| Bağlantı | Policy | Sonuç |
|---|---|---|
| `bimmetraj_app` | `company_id = current_setting('bimmetraj.company_id', true)::uuid` | Aktif tenant için SELECT/INSERT/UPDATE/DELETE |
| `bimmetraj_worker` | Yok | Default-deny |
| `bimmetraj_backup` | Exact current role | SELECT-only |
| `bimmetraj_migrator` → `SET ROLE bimmetraj_owner` | Exact session/current role birleşimi | Migration bakımı |
| Başka rol veya context yok | Yok | Default-deny |

Policy'lerin `TO public` hedefi rol yaratma sırasına bağımlılığı kaldırır; policy içindeki exact `current_user`/`session_user` koşulları erişimi sınırlar. Tablo ACL'leri ayrıca T40 rol sözleşmesiyle yönetilir.

## Runtime transaction sözleşmesi

Her CDE servis çağrısı:

1. UUID biçimindeki `companyId` ve `userId` değerlerini pool checkout öncesi doğrular.
2. Tek bir `PoolClient` ile transaction açar.
3. `session_user` ve `current_user` değerlerinin exact `bimmetraj_app` olduğunu; rolün LOGIN/NOINHERIT/NOSUPERUSER/NOBYPASSRLS/NOCREATEROLE/NOCREATEDB/NOREPLICATION taşıdığını ve hiçbir membership edge'i olmadığını doğrular.
4. `set_config(..., true)` ile iki GUC'yi transaction-local bağlar.
5. CDE işini aynı client üzerinde yürütür; başarıda commit, hatada rollback yapar.
6. Rollback başarısızsa bağlantıyı hata ile release ederek pool'dan attırır.

Uygulama katmanındaki `company_id` filtreleri ve proje üyeliği/RBAC kontrolleri korunur. RLS bunlara ikinci bir veritabanı savunması ekler.

## Operasyonel kapı

`database-roles:inspect`, release ledger'ında `0013_cde_tenant_rls` görüldüğünde şunları exact karşılaştırır:

- Beş tablonun tamamı ve owner=`bimmetraj_owner`.
- `ENABLE` ve `FORCE` RLS.
- Her tabloda yalnız app tenant, backup read ve owner migration policy'leri.
- Policy komutu, PUBLIC OID hedefi, permissive modu, `USING` ve `WITH CHECK` ifadeleri.

Her production migration/cutover öncesinde hem release migration doğrulaması hem rol inspector'ı geçmelidir. Bu model compose secret rotasyonu veya deployment yetkisi vermez.

## Güven sınırı

Custom tenant GUC, uygulamanın yanlış/eksik tenant filtresine ve pool reuse sızıntısına karşı koruma sağlar. App credential ele geçirilip keyfi SQL çalıştırılırsa saldırgan custom GUC değerini değiştirebilir. Bu nedenle SQL injection önleme, input validation, app credential koruması, T40 runtime cutover ve production monitoring zorunlu kalır.
