# Handoff: T41 8B Worker Entitlement + T44 Kurtarma Tatbikatı Tamamlandı

**Tarih:** 30 Ekim 2026  
**Production commit:** `3a9bb7d` (Rev. 133, BIM-CALC-2026-10-30.2)  
**Önceki handoff:** `HANDOFF_2026-10-27_CRM_VE_KULLANICI_AKISI.md`

> **Düzeltme (31 Ekim 2026, Rev. 134):** Aşağıdaki `service.ts:112` yolu hatalıydı: bu kod app rolüyle çalışır ve fonksiyonu çağıramaz. Canlıda IFC işleme 503 ile durdu; çağrı kaldırıldı. Fonksiyonun çalışan kodda çağıranı yok.

---

## T41 8B: Worker Entitlement Capability Function (Canlı)

### Ne yapıldı

`bimmetraj_worker` rolü artık `subscriptions` ve `plans` tablolarını doğrudan okuyamıyor.
Bunun yerine `bimmetraj_worker_get_entitlement(p_company_id uuid)` SECURITY DEFINER
capability function kullanıyor; bu fonksiyon `session_user = 'bimmetraj_worker'` kısıtını
kendi içinde doğrular.

### Fonksiyon imzası

```sql
bimmetraj_worker_get_entitlement(p_company_id uuid)
RETURNS TABLE (
  company_exists        boolean,
  subscription_status   text,
  current_period_end    timestamptz,
  plan_id               uuid,
  plan_is_active        boolean,
  monthly_ifc_limit     integer,
  ifc_max_file_mb       integer,
  ifc_max_concurrent    integer
)
SECURITY DEFINER
```

### Uygulama detayları

- **`src/smartcheck/import/config.ts`**: `fetchTenantIfcLimits(companyId, tx, caller)`
  — `caller === "worker" && NODE_ENV === "production"` koşulunda
  `fetchWorkerEntitlement()` çağrısını yapar (Drizzle `db.execute(sql\`SELECT * FROM public.bimmetraj_worker_get_entitlement(${companyId}::uuid)\`)`).
- **`src/smartcheck/import/service.ts:112`**: `fetchTenantIfcLimits(companyId, tx, "worker")`
- **`src/smartcheck/import/worker-entitlement.test.ts`**: 6 unit test (mock DB),
  fail-closed davranış: `company_exists=false → IfcNotAvailableError`,
  `plan_is_active=false → IfcNotAvailableError`, DB hatası → `IfcLimitsUnavailableError`.

### ACL durumu (db-provision contract)

`scripts/database-roles/contract.ts` içinde `bimmetraj_worker: Object.freeze([])` tanımlı:
- `subscriptions` tablosu: 0 privilege
- `plans` tablosu: 0 privilege

Bu contract her Coolify deploy'unda `db-provision` container tarafından uygulanır.

---

## T44: Kurtarma Tatbikatı (Docker PG16, 30 Ekim 2026)

### Test sonuçları

```
src/contracts/t44-recovery-drill.pgtest.ts — 1/1 PASS
executionMode:       docker
dumpDurationMs:      130
restoreDurationMs:   522
archiveBytes:        665252
catalogSignature:    e5e4d3d1c4740a4713893c42a909c696208f64c8335f360707e79753f7525735
migrationsVerified:  38
```

### Test komutları (tekrar çalıştırmak için)

```bash
# Docker PG16 başlat
docker run --name t44-pg16-test \
  -e POSTGRES_PASSWORD=t44drillpass \
  -p 15432:5432 -d postgres:16-alpine

# Tatbikat
NODE_ENV=test CI_DISPOSABLE_DATABASE=true \
DATABASE_ROLE_TEST_URL="postgresql://postgres:t44drillpass@localhost:15432/postgres" \
./node_modules/.bin/tsx --test src/contracts/t44-recovery-drill.pgtest.ts

# Temizlik
docker rm -f t44-pg16-test
```

### Doğrulanmış senaryolar

1. Worker crash + lease reclaim
2. Bozuk mesaj → DLQ karantinası
3. `bimmetraj_backup` rolüyle `pg_dump --enable-row-security` + `pg_restore` (RPO=0)
4. Bozuk migration atomik rollback + katalog imzası doğrulaması
5. `/api/health/ready` `503 SERVICE_DEGRADED → 200 OK` kurtarma

---

## Bir Sonraki Adımlar (Hazar için)

### Acil

1. **Production smoke**: `scripts/role-model-smoke.ts` production DB'ye karşı çalıştır.
   `/api/health` → `revision: 3a9bb7d` onayı al.
2. **Gerçek IFC testi**: Super Admin panelinden bir kullanıcıya UZMAN rolü ata,
   gerçek IFC dosyası yükle, worker kota mantığının doğru çalıştığını doğrula.

### Ortam

- App UUID: `ibjv2zbpecdcbd71lxo1vqd7`, SSH alias: `affexai-prod`
- Coolify deploy: manuel — "Deploy" butonuna bas, `/api/health` revision'ı kontrol et.
- Production DB'ye doğrudan bağlanma; sadece `scripts/role-model-smoke.ts` ve uygulama API'si üzerinden test et.

### Teknik borç / açık kalan

- T45 real large client file (izinli dosya gerekiyor)
- T50–T52 uzman/müşteri/canlı kabul (external)
- T55 hukuki inceleme (external)
