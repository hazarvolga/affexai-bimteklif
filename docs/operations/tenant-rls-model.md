# CDE, hakediş ve SmartCheck pilot kanıtı tenant RLS modeli

**Sürüm:** Rev. 53 / `BIM-CALC-2026-10-24.47`
**Kod baseline:** `5e1113524b3a3f4c253bae61066e0779c5391b1f`
**Durum:** **PARTIAL — CDE, hakediş ve SmartCheck pilot kanıtı dilimleri; production cutover yok**

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

Rev. 53 ayrıca şu iki SmartCheck pilot tablosunu korur:

- `smartcheck_pilot_cases`: app tenant ALL, backup SELECT ve migrator-owner ALL olmak üzere exact üç policy.
- `smartcheck_pilot_measurements`: app tenant SELECT ve INSERT ayrı olmak üzere backup SELECT ve migrator-owner ALL ile asimetrik exact dört policy. App için UPDATE/DELETE policy yoktur; tablo ayrıca trigger ile append-only'dir.

`smartcheck_audit_logs` da FORCE RLS kullanır. Altı-policy matrisi non-pilot app/worker davranışını korurken pilot audit okumalarını tenant'a bağlar; app/worker pilot audit satırı yazamaz veya değiştiremez. Pilot admission, measurement ve review audit satırları case/measurement triggerları tarafından aynı DB transactionında üretilir ve append-only trigger ile korunur.

### CDE ve hakediş tablolarının ortak policy matrisi

Bu tablo yalnız CDE ve hakediş bounded context'leri için geçerlidir. SmartCheck pilot vaka/ölçüm ve audit yüzeyi, yukarıda açıklanan ayrı 3/4/6 policy matrislerini kullanır.

| Bağlantı | Policy | Sonuç |
|---|---|---|
| `bimmetraj_app` | `company_id = current_setting('bimmetraj.company_id', true)::uuid` | Aktif tenant için SELECT/INSERT/UPDATE/DELETE |
| `bimmetraj_worker` | Yok | Default-deny |
| `bimmetraj_backup` | Exact current role | SELECT-only |
| `bimmetraj_migrator` → `SET LOCAL ROLE bimmetraj_owner` | Exact session/current role birleşimi | Migration bakımı |
| Başka rol veya context yok | Yok | Default-deny |

Policy'lerin `TO public` hedefi rol yaratma sırasına bağımlılığı kaldırır; policy içindeki exact `current_user`/`session_user` koşulları erişimi sınırlar. Tablo ACL'leri ayrıca T40 rol sözleşmesiyle yönetilir.

## Runtime transaction sözleşmesi

Her CDE servis çağrısı, `ProgressPaymentService` veritabanı giriş noktası ve DB kullanan `PilotEvidenceService` işlemi:

1. UUID biçimindeki `companyId` ve `userId` değerlerini pool checkout öncesi doğrular.
2. Tek bir `PoolClient` ile transaction açar.
3. `session_user` ve `current_user` değerlerinin exact `bimmetraj_app` olduğunu; rolün LOGIN/NOINHERIT/NOSUPERUSER/NOBYPASSRLS/NOCREATEROLE/NOCREATEDB/NOREPLICATION taşıdığını ve hiçbir membership edge'i olmadığını doğrular.
4. `set_config(..., true)` ile iki GUC'yi transaction-local bağlar.
5. Bounded context işini aynı client üzerinde yürütür; başarıda commit, hatada rollback yapar.
6. Rollback başarısızsa bağlantıyı hata ile release ederek pool'dan attırır.

Uygulama katmanındaki `company_id` filtreleri ve proje üyeliği/RBAC kontrolleri korunur. RLS bunlara ikinci bir veritabanı savunması ekler. Rev. 52, `ProgressPaymentService` içindeki bütün DB girişlerini ortak tenant transaction yardımcısından geçirir. Rev. 53, pilot route'larındaki DB sorgularını `PilotEvidenceService` altında aynı tenant transactionına taşır; doğrudan pool yolu bırakmaz.

Pilot ölçüm kabulü vaka satırını kilitler. Normalleştirilmiş istek SHA-256 `requestHash` ile bağlanır ve her vaka için `caseRevision` monotonik artar. Aynı `measurementKey` yalnız mevcut ölçümün `measurementId` + `requestHash` audit kanıtı eşleşirse stabil replay olur; farklı hash conflict, hash/audit kanıtı olmayan legacy kayıt ise unverified olarak reddedilir. Review latest doğrulanmış ölçümü ister, ölçümü yapan kişiyle reviewer'ın farklı olmasını ve reviewer'ın işlem anında aynı şirkette owner/admin/manager üyeliğini korumasını doğrular. Vaka güncellemeleri izinli alan/geçiş matrisiyle sınırlandırılır.

`retention_until` kanıtın en erken korunması gereken zamanı kaydeder. Otomatik silme, purge job, imha onayı veya legal-hold yönetimi sağlamaz; bunlar ayrı operasyonel tasarım ve bağımsız hukuk/veri saklama incelemesi gerektirir.

## Operasyonel kapı

`database-roles:inspect`, release ledger'ında `0013_cde_tenant_rls`, `0015_progress_payment_tenant_rls` ve `0016_smartcheck_pilot_evidence_tenant_rls` tag'lerini gördüğünde ilgili bounded context için şunları exact karşılaştırır:

- İlgili migrationın kapsadığı bütün tablolar ve owner=`bimmetraj_owner`.
- `ENABLE` ve `FORCE` RLS.
- CDE ve hakediş tablolarında yalnız app tenant, backup read ve owner migration policy'leri.
- SmartCheck pilot vaka/ölçüm tablolarında exact 3/4 matrisi; `smartcheck_audit_logs` üzerinde non-pilot app/worker davranışını koruyan ve pilot audit mutasyonunu reddeden exact altı-policy matrisi.
- Policy komutu, PUBLIC OID hedefi, permissive modu, `USING` ve `WITH CHECK` ifadeleri.

Korunan tablolardan biri mevcutken ilgili ledger tag'i eksikse veya tag uygulanmış kabul edilirken tek bir tablo/policy bile eksikse inspector/provisioner fail-closed kapanır; pre-schema bootstrap sırasında tag ve tabloların birlikte bulunmaması geçerli başlangıç durumudur. Rev. 53 inspector'ı `0016` için pilot vaka/ölçüm exact 3/4 policy matrisini, audit tablosundaki exact altı-policy FORCE RLS matrisini ve trigger/function owner, security mode, sabit search_path, PUBLIC execute reddi ile kaynak gövdesi provenance'ını karşılaştırır. Release manifest/stage imzaları `0016` artifact'ını sabitler ve migration postcondition'ı bu kurulumu doğrular. Focused integration/contract testleri, izole PostgreSQL 16 sözleşme/regresyon testleri ve root/release TypeScript kontrolleri geçmiştir; code/security review GO vermiştir.

Her production migration/cutover öncesinde hem release migration doğrulaması hem rol inspector'ı geçmelidir. Bu model compose secret rotasyonu veya deployment yetkisi vermez. Production cutover, canary, restore/parity, rollback ve deploy gerçekleştirilmemiştir.

## Güven sınırı

Custom tenant GUC, uygulamanın yanlış/eksik tenant filtresine ve pool reuse sızıntısına karşı koruma sağlar. App credential ele geçirilip keyfi SQL çalıştırılırsa saldırgan custom GUC değerini değiştirebilir. Bu nedenle SQL injection önleme, input validation, app credential koruması, T40 runtime cutover ve production monitoring zorunlu kalır.

T41 genel durumu **PARTIAL** kalır: bu belge yalnız CDE, hakediş ve SmartCheck pilot kanıtı dilimlerini kapsar; diğer tenant tabloları henüz aynı RLS sözleşmesine alınmamıştır. `PROGRESS_PAYMENTS_ENABLED` varsayılan olarak kapalıdır. Rev. 53 pilot metrik formüllerini veya hesap sonuçlarını değiştirmez; production cutover/deploy/canary/restore/rollback ve izinli gerçek dosyalarla bağımsız uzman kabulü ayrıca gereklidir. Public sayfalar değişmemiştir.
