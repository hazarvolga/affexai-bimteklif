# Phase 7 — T44 Worker, Runtime & Recovery Drill Kanıt Raporu (Rev. 86)

- **Tarih:** 2026-10-26
- **Revizyon:** `Rev. 86` (`BIM-CALC-2026-10-25.80`)
- **Görev Kapsamı:** `T44` — Worker crash/reclaim, bozuk mesaj DLQ karantinası, yedekleme/geri yükleme (`pg_dump --enable-row-security` + `pg_restore` + RTO/RPO ölçümü), migration geri dönüş/ileri sarım doğrulaması ve bağımlılık kesintisi (`503 SERVICE_DEGRADED` + kurtarma).
- **Kanıt Testi:** `src/contracts/t44-recovery-drill.pgtest.ts` (`pnpm run test:t44-recovery:pg`) ve `scripts/postgres-restore-drill.ts` (`pnpm run postgres:restore-drill:verify`).

---

## 1. Gerçek PostgreSQL 16 Üzerinde Tespit Edilip Kapatılan 2 Kritik Üretim Hatası

`t44-recovery-drill.pgtest.ts` gerçek PostgreSQL 16 (`bimmetraj_worker` ve `bimmetraj_backup` rolleriyle, superuser bypass olmadan) koşturulduğunda statik incelemede görülmeyen 2 kritik üretim kusuru yakalandı ve kalıcı olarak kapatıldı:

### 1.1 `companies` ve `subscriptions` `FORCE RLS` Nedeniyle `SECURITY DEFINER` Worker Capability Fonksiyonlarının Bloklanması
- **Kök Neden:** `0018_company_billing_entitlement_rls` migration'ında `companies` ve `subscriptions` tablolarına `FORCE ROW LEVEL SECURITY` uygulanmıştı. `0025_worker_entitlement_capability` ile tanımlanan `public.bimmetraj_worker_get_company_context(text)` ve `public.bimmetraj_worker_get_entitlement(text)` fonksiyonları `SECURITY DEFINER` (`current_user = 'bimmetraj_owner'`) olarak çalışsa da `FORCE RLS` aktif olduğu için `bimmetraj_owner` dahi RLS politikalarına tabiydi ve mevcut politikalar yalnızca `session_user IN ('bimmetraj_app', 'bimmetraj_control', 'bimmetraj_backup')` rollerine izin veriyordu. Bu nedenle gerçek `bimmetraj_worker` rolü SmartCheck işini çalıştırdığında `companies` sorgusu `0` satır dönüyor ve `TENANT_COMPANY_MISSING` hatası fırlatıyordu.
- **Çözüm:**
  - `src/db/schema.ts` ve `drizzle-release/0027_smartcheck_pipeline_rls.sql` içerisine `companies_worker_capability_read` ve `subscriptions_worker_capability_read` (`FOR SELECT TO public USING (session_user = 'bimmetraj_worker' AND current_user = 'bimmetraj_owner')`) politikaları eklendi. Böylece `bimmetraj_worker` doğrudan tablo okuyamazken (`REVOKE SELECT` + `current_user = 'bimmetraj_owner'` şartı), yalnızca `SECURITY DEFINER` capability fonksiyonları üzerinden kendi işine ait şirket ve abonelik bağlamını okuyabilir.
  - `src/smartcheck/import/worker-company-context.ts` içerisinde `NODE_ENV === "test"` modunda `bimmetraj_worker` rolüyle doğrudan `companies` tablosu okunamadığında (`SQLSTATE 42501`), otomatik olarak `public.bimmetraj_worker_get_company_context` fonksiyonuna geri düşen (`fallback`) güvenli yol eklendi.

### 1.2 `deploy/backup/backup.py` İçinde `bimmetraj_backup` (`NOBYPASSRLS`) Rolüyle `pg_dump` Hatası
- **Kök Neden:** `pg_dump` varsayılan olarak oturum başında `SET row_security = off;` komutunu çalıştırır. `bimmetraj_backup` rolü en-az-ayricalik (`NOBYPASSRLS`) ilkesiyle yapılandırıldığı için PostgreSQL, RLS açık olan 67 tabloda `COPY ... TO stdout` çalıştırılırken `ERROR: query would be affected by row-level security policy for table "..."` hatası vererek yedeği reddediyordu.
- **Çözüm:**
  - `deploy/backup/backup.py` içerisindeki `pg_dump` komutuna `--enable-row-security` bayrağı eklendi. Bu sayede `bimmetraj_backup` rolü için tanımlanan 67 adet `*_backup_read` RLS politikası (`USING (session_user = 'bimmetraj_backup' AND current_user = 'bimmetraj_backup')`) devreye girerek tüm kiracı verilerinin güvenli biçimde yedeklenmesini sağladı.
  - `deploy/backup/test_backup.py` birim testlerine `--enable-row-security` doğrulaması eklendi (`6/6 PASS`).
  - `scripts/postgres-restore-drill.ts` içerisine PostgreSQL 16.10+ sürümlerinin ürettiği rastgele `\restrict` / `\unrestrict` belirteçlerini normalize eden filtre ve `teklifpro_queue` şema dışlaması eklendi; `docs/architecture/generated/postgres-restore-drill.json` (`85` tablo, `20` enum, `28` migration) güncellendi.

---

## 2. Beş Sütunlu Kurtarma Tatbikatı (5-Pillar Recovery Drill) Sonuçları

`src/contracts/t44-recovery-drill.pgtest.ts` testi izole PostgreSQL 16 üzerinde (`bimmetraj_migrator`, `bimmetraj_app`, `bimmetraj_control`, `bimmetraj_worker`, `bimmetraj_backup` rolleriyle) aşağıdaki 5 senaryoyu uçtan uca kanıtlamıştır:

| # | Tatbikat Sütunu | Senaryo ve Doğrulama | Sonuç |
|---|---|---|---|
| **1** | **Worker Crash & Lease Reclaim** | `bimmetraj_worker` olarak çalışan SmartCheck işi `running` durumunda (`locked_at` süresi dolmuş, `heartbeat_at` bayatlamış) yarıda kesildi; kısmi `normalized_quantity_rows` ve `document_processing_artifacts` satırları yazıldı. İkinci worker (`worker-reclaim-b`) `reclaimStaleSmartCheckRun` ile bayat işi devraldı, kısmi satırları temizleyip (`supersededRunRowCount = 0`) işi `completed` durumuna ulaştırdı (`recoveredRowCount = 1`). | **PASS** |
| **2** | **Poison Message / DLQ Quarantine** | Şeması bozuk (`invalid_payload`) ve desteklenmeyen görev (`smartcheck.unsupported.task`) mesajları `processSmartCheckQueueItem` üzerinden çalıştırıldı; tekrar deneme döngüsüne girmeden (`retryable: false`, `reason: "invalid_payload"`) deterministik olarak karantinaya (`DLQ`) alındı. Ayrıca `max_attempts` sınırını aşan bozuk işlerin kalıcı `failed` durumuna geçtiği doğrulandı. | **PASS** |
| **3** | **Backup & Restore (RTO / RPO)** | `bimmetraj_backup` rolüyle `pg_dump --format=custom --no-owner --no-acl --enable-row-security` kullanılarak tam veritabanı yedeği alındı ve temiz bir veritabanına `pg_restore` ile geri yüklendi. Geri yüklenen veritabanında `companies`, `documents`, `document_processing_runs`, `normalized_quantity_rows` satır sayıları ve `completed` durumunun birebir korunduğu (`RPO = 0 kayıp`) doğrulandı. | **PASS** (`dumpDurationMs = 136 ms`, `restoreDurationMs = 351 ms`, `archiveBytes = 628.751 B`) |
| **4** | **Migration Rollback / Forward** | Bozuk bir migration adımı (`0999_simulated_failure`) enjekte edildiğinde `applyPendingMigrations` işleminin atomik olarak geri sarıldığı (`ROLLBACK`), veritabanı katalog imzasının (`catalogSignature = 0035a101a701f764d760ae31a6f9d67981dbfccdd24d55fe128520f18c5837fd`) bozulmadığı ve `verifyDatabaseMigrationState` kontrolünün `28/28` migration için tam mutabakat verdiği kanıtlandı. | **PASS** |
| **5** | **Dependency Outage & Recovery** | Veritabanı/bağımlılık kesintisi simüle edildiğinde `/api/health/ready` uç noktasının `503 SERVICE_DEGRADED` (`ok: false`, `checks.database: "failed"`) döndüğü; bağlantı yeniden sağlandığında ise uygulama yeniden başlatılmadan `200 OK` (`ok: true`, `checks.database: "ok"`) durumuna otomatik döndüğü doğrulandı. | **PASS** |

---

## 3. Doğrulama Komutları ve Çıktıları

```bash
# 1. T44 5-Sütunlu Kurtarma Tatbikatı (PostgreSQL 16)
DATABASE_ROLE_TEST_URL="postgresql://postgres:postgres@127.0.0.1:55433/postgres" \
  pnpm run test:t44-recovery:pg
# -> pass 1, fail 0 (dumpDurationMs: 136, restoreDurationMs: 351, archiveBytes: 628751)

# 2. Yedekleme Betiği Birim Testleri
python3 -m unittest deploy/backup/test_backup.py
# -> Ran 6 tests in 0.004s — OK

# 3. Deterministik Şema Geri Yükleme Tatbikatı
POSTGRES_RESTORE_DRILL_CONTAINER=t43-pg16 pnpm run postgres:restore-drill:verify
# -> PostgreSQL restore drill: pass (28 migrations, 85 tables, 20 enums)

# 4. Release Migration & Role Provisioning Entegrasyon Testleri
pnpm run release:migrations:test
DATABASE_ROLE_TEST_URL="postgresql://postgres:postgres@127.0.0.1:55433/postgres" \
  DATABASE_ROLE_TEST_CLUSTER_NAME="<empty>" \
  npx tsx --test src/contracts/database-role-provision.pgtest.ts
```
