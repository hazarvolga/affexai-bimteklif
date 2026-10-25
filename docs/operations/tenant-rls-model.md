# CDE, hakediş, SmartCheck pilot, şirket sektör ayarı ve CRM/kota tenant RLS modeli

**Sürüm:** Rev. 58 / `BIM-CALC-2026-10-24.52`
**Kod baseline:** `0a4d76a7cbf15b1bab80ebee2e41f260662bca0a`
**Durum:** **PARTIAL — 22 tenant tablosu ile pilot audit/global katalog yüzeyleri ve ayrı control-plane kimliği yerelde kanıtlı; production cutover yok**

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

Rev. 54 şu sektör ayarı yüzeylerini korur:

- `company_industry_settings`: app tenant SELECT/INSERT/UPDATE, backup SELECT ve migrator-owner ALL olmak üzere exact beş policy. App DELETE policy yoktur; worker default-deny kalır.
- Global `industries`: app SELECT, backup SELECT ve migrator-owner ALL olmak üzere exact üç policy. App/worker katalog mutasyonu yoktur.
- `residential`, `electrical`, `mechanical` ve `renovation` `INITIAL_PLUGINS` satırları release migrationında `ON CONFLICT (id) DO NOTHING` ile yalnız eksikse eklenir; mevcut operatör satırları güncellenmez veya silinmez.


Rev. 55 ayrıca CRM/kota güven sınırını korur:

- `leads`: app tenant SELECT/INSERT; app UPDATE/DELETE ve worker erişimi yoktur.
- `companies` ve `subscriptions`: app tenant SELECT-only; worker erişimi yoktur.
- `usage_logs`: app tenant SELECT/INSERT; negatif sayaç constraint ile reddedilir; app UPDATE/DELETE ve worker erişimi yoktur.
- Global `plans`: app SELECT-only; app/worker mutasyonu yoktur.
- Backup bu beş tabloda SELECT-only, migrator-owner yalnız migration bakım yoludur. Yeni public tablo/sequence default ACL'i app/worker için kapalıdır.

`CrmLeadService`, kota rezervasyonu ile lead insertini aynı tenant transactionında çalıştırır. Şirket UUID'sinden türetilen transaction advisory lock eşzamanlı kotayı serileştirir; lead insert başarısızsa usage kaydı rollback olur. Merkezi API hata raporlama SQL metni, parametre, satır detayı ve nested cause taşımaz.

Rev. 56, meşru authority-table yazmalarını ayrı `bimmetraj_control` credential/pool'una taşır. `0019_control_plane_rls`, `companies` ve `subscriptions` üzerinde control ALL; `usage_logs` üzerinde ayrı SELECT/INSERT/DELETE policy'leri kurar. Exact ACL matrisi `plans` için control DELETE'i, `usage_logs` için control UPDATE'i ve `leads` için bütün control erişimini reddeder. Kayıt/compensation, pilot tenant, şirket ayarı, banka transferi/abonelik, admin plan ve quota release/audit yolları control pool kullanır. Bu ayrım app kimliğinin genişletilmesi anlamına gelmez.

Rev.57 final review düzeltmesi, app'in user/membership/token ve Academy authority/support tablolarındaki broad mutasyon grant'lerini exact SELECT/append-only matrise indirir; auth, davet ve Academy mutasyonlarını control pool ile hizalar. Audit DELETE reddedilir. Effective bağlantı URL query override'ları ve TLS downgrade başlangıçta kapanır; production iki URL olmadan başlamaz. App `admin_audit_logs` INSERT sahibi olduğundan audit append-only fakat credential compromise altında forge edilebilir; bağımsız authenticity kanıtı sayılmaz.

Rev.58, sonraki tenant okuma taşımaları için `withTenantDrizzleTransaction` yardımcı sözleşmesini ekler. Yardımcı, `withTenantTransaction` içindeki aynı checked-out `PoolClient` üzerinde typed Drizzle database oluşturur; GUC bağlama, restricted app-role doğrulaması, commit/rollback ve pool release tek akışta kalır. Bu yalnız altyapı hazırlığıdır; auth middleware, worker entitlement capability ve global hassas app okumalarının tamamı henüz taşınmamıştır.

`0022_tenant_business_rls`, worker ve control erişimi olmayan şu 14 tenant iş tablosunu CDE matrisiyle (app tenant ALL, backup SELECT, migrator-owner ALL; worker/control default-deny) korur: `usage_alerts`, `deals`, `activities`, `supplier_quote_submissions`, `supplier_quote_entries`, `rule_candidates`, `rule_registry`, `rule_versions`, `review_sessions`, `review_findings`, `competency_signals`, `competency_signal_evidence`, `assistance_resources`, `rule_assistance_resources`. CRM deal/aktivite, usage alert ve tedarikçi teklif route'ları bu tablolara yalnız `withAppTenant` / `withAppTenantTransaction` ile erişir.

`0023_quotation_core_rls` (S1 — Teklif çekirdeği), aynı CDE matrisiyle şu 6 teklif çekirdeği tablosunu FORCE RLS altına alır: `clients`, `quotations`, `quotation_items`, `quotation_item_evidence`, `quotation_transfer_ledgers` ve `quotation_transfer_source_rows`. Müşteri, teklif, revizyon, Calm transfer, kârlılık, risk kalibrasyonu, mevzuat etki analizi, fiyat anlık görüntüsü kilitleme ve PDF üretimi akışları `withAppTenant` / `withAppTenantTransaction` ile çalışır.

`0024_pricing_regulations_rls` (S2 — Fiyat, kaynak zekâsı ve mevzuat), aynı CDE matrisiyle şu 8 fiyat/kaynak/mevzuat tablosunu FORCE RLS altına alır: `price_sources`, `price_snapshots`, `source_intelligence_adapters`, `source_ingestion_runs`, `source_ingestion_artifacts`, `source_review_items`, `regulation_versions` ve `regulation_alerts`. Fiyat kaynakları, anlık görüntüler, katalog içe aktarma, kaynak zekâsı adaptör/ingest/review akışları, mevzuat sürümleri/uyarıları ve fiyat belleği okumaları `withAppTenant` / `withAppTenantTransaction` ile çalışır. Böylece `company_id` taşıyan 72 tablonun 50'si FORCE RLS altındadır; kalan 22 tablo ve S3–S5 dilim planı `docs/audits/phase-7/PHASE_7_T41_REMAINING_TABLES_2026-10-25.md` içindedir.

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

Uygulama katmanındaki `company_id` filtreleri ve proje üyeliği/RBAC kontrolleri korunur. RLS bunlara ikinci bir veritabanı savunması ekler. Rev. 52, `ProgressPaymentService` içindeki bütün DB girişlerini ortak tenant transaction yardımcısından geçirir. Rev. 53, pilot route'larındaki DB sorgularını `PilotEvidenceService` altında aynı tenant transactionına taşır. Rev. 54, sektör ayarı GET/POST DB yollarını `CompanyIndustrySettingsService` üzerinden tek tenant transactionına alır; exact input şekli, `industryId` patterni ve boolean tipi route sınırında doğrulanır. UI persistence hatasını başarı gibi göstermez.

Pilot ölçüm kabulü vaka satırını kilitler. Normalleştirilmiş istek SHA-256 `requestHash` ile bağlanır ve her vaka için `caseRevision` monotonik artar. Aynı `measurementKey` yalnız mevcut ölçümün `measurementId` + `requestHash` audit kanıtı eşleşirse stabil replay olur; farklı hash conflict, hash/audit kanıtı olmayan legacy kayıt ise unverified olarak reddedilir. Review latest doğrulanmış ölçümü ister, ölçümü yapan kişiyle reviewer'ın farklı olmasını ve reviewer'ın işlem anında aynı şirkette owner/admin/manager üyeliğini korumasını doğrular. Vaka güncellemeleri izinli alan/geçiş matrisiyle sınırlandırılır.

`retention_until` kanıtın en erken korunması gereken zamanı kaydeder. Otomatik silme, purge job, imha onayı veya legal-hold yönetimi sağlamaz; bunlar ayrı operasyonel tasarım ve bağımsız hukuk/veri saklama incelemesi gerektirir.

## Operasyonel kapı

`database-roles:inspect`, release ledger'ında `0013_cde_tenant_rls`, `0015_progress_payment_tenant_rls`, `0016_smartcheck_pilot_evidence_tenant_rls`, `0017_company_industry_settings_tenant_rls`, `0018_crm_leads_tenant_rls`, `0019_control_plane_rls`, `0022_tenant_business_rls`, `0023_quotation_core_rls` ve `0024_pricing_regulations_rls` tag'lerini gördüğünde ilgili bounded context için şunları exact karşılaştırır:

- İlgili migrationın kapsadığı bütün tablolar ve owner=`bimmetraj_owner`.
- `ENABLE` ve `FORCE` RLS.
- CDE ve hakediş tablolarında yalnız app tenant, backup read ve owner migration policy'leri.
- SmartCheck pilot vaka/ölçüm tablolarında exact 3/4 matrisi; `smartcheck_audit_logs` üzerinde non-pilot app/worker davranışını koruyan ve pilot audit mutasyonunu reddeden exact altı-policy matrisi.
- `company_industry_settings` üzerinde exact beş-policy app S/I/U, backup SELECT ve migrator-owner matrisi; `industries` üzerinde exact üç-policy app/backup SELECT ve migrator-owner matrisi.
- Policy komutu, PUBLIC OID hedefi, permissive modu, `USING` ve `WITH CHECK` ifadeleri.
- Control rolünün authority/support table exact ACL allowlist'i ile `companies`, `subscriptions` ve `usage_logs` control policy matrisi; `leads`, queue ve allowlist dışı erişimin yokluğu.

Korunan tablolardan biri mevcutken ilgili ledger tag'i eksikse veya tag uygulanmış kabul edilirken tek bir tablo/policy bile eksikse inspector/provisioner fail-closed kapanır; pre-schema bootstrap sırasında tag ve tabloların birlikte bulunmaması geçerli başlangıç durumudur. Release manifest/stage imzaları ilgili artifact'ları sabitler ve migration postcondition'ları kurulumu doğrular. Rev.56 focused testleri, izole PostgreSQL 16 rol/CDE/hakediş/SmartCheck/sektör/CRM regresyonları, TypeScript ve build kontrolleri geçmiştir. Tam `pnpm test`, güvenli test `DATABASE_URL` bulunmadığı için DB integration testlerinde tamamlanmamıştır; fresh final code/security reviewer ajanları hesap kullanım limitine takılmıştır. Bu belge production onayı vermez.

Her production migration/cutover öncesinde hem release migration doğrulaması hem rol inspector'ı geçmelidir. Bu model compose secret rotasyonu veya deployment yetkisi vermez. Production cutover, canary, restore/parity, rollback ve deploy gerçekleştirilmemiştir.

## Güven sınırı

Custom tenant GUC, uygulamanın yanlış/eksik tenant filtresine ve pool reuse sızıntısına karşı koruma sağlar. App credential ele geçirilip keyfi SQL çalıştırılırsa saldırgan custom GUC değerini değiştirebilir. Bu nedenle SQL injection önleme, input validation, app credential koruması, T40 runtime cutover ve production monitoring zorunlu kalır.

T41 genel durumu **PARTIAL** kalır: yazma/control-plane ayrımı yerelde tamamlanmıştır; ancak tenant context kurulmadan yapılan kalan app okumaları Rev.55 ACL/RLS altında fail edebilir ve worker'ın plan/abonelik entitlement okuması için dar, salt-okunur bir sınır henüz yoktur. Diğer tenant tabloları da aynı RLS sözleşmesine alınmamıştır. `PROGRESS_PAYMENTS_ENABLED` varsayılan olarak kapalıdır. Rev.56 hesap yöntemlerini, formülleri veya sonuçları değiştirmez; production secret cutover/deploy/canary/restore/rollback, canlı negatif tenant kanıtı ve izinli gerçek dosyalarla bağımsız uzman kabulü ayrıca gereklidir. Public pazarlama sayfaları değişmemiştir.
