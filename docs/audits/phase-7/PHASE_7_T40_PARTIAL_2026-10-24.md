# Faz 7 / T40 — PostgreSQL görev ayrımı kanıt raporu

**Tarih:** 24 Ekim 2026
**Kod baseline:** `eeeaf75f27cd0b65c3f7f44ed6e3668386cceb53`
**Hesaplama kaydı:** `BIM-CALC-2026-10-24.41` / `Rev. 47`
**Karar:** **PARTIAL — kod/tooling ve disposable PostgreSQL 16 kanıtı hazır; compose/runtime/production cutover yok**

## Kapanan kod kapsamı

- Canonical `owner`, `migrator`, `app`, `worker`, `backup` rol sözleşmesi ve güvenli CLI.
- Exact database/schema/object/default/column/function ACL, role attribute, membership ve cross-database/shared dependency inspector'ı.
- Queue private tabloları için exact RLS/policy matrisi; `FORCE RLS` ve migrations RLS drift reddi.
- SECURITY DEFINER SmartCheck wrapper'ları; task, key, payload, attempts, priority ve `NULL` sınırları.
- Graphile Worker 0.16.0 exact migration `1..18`, SHA-256 vendor function ve fiziksel/yapısal şema manifesti.
- Transaction içi postcondition, rollback ve fail-fast advisory lock.
- Runtime queue auto-migration kaldırıldı; revision 18 yoksa uygulama fail-closed.

## Adversarial PostgreSQL 16 kanıtı

Gerçek disposable PG16 testinde aşağıdaki drift/saldırı yolları reddedildi:

- Yanlış DB/system fingerprint, eşzamanlı provision lock, transaction postcondition sabotajı.
- Beklenmeyen role membership, outsider/PUBLIC ACL, column/default ACL, grant option ve cross-database/shared dependency.
- Eksik veya fazla function EXECUTE, PUBLIC üzerinden dolaylı yetki, WITH GRANT OPTION.
- Wrapper, `add_job` ve nested `remove_job` body tamper.
- RLS disable/FORCE, migrations RLS/policy drift.
- Beklenmeyen trigger, ileri migration, `1..18` ledger substitution ve `UNLOGGED` durability drift.
- `NULL` identifier/payload/job key/attempts/priority, bozuk key, aralık dışı değer ve büyük payload; reddedilen isteklerde queue satır sayısı değişmedi.
- App doğrudan vendor/private queue erişimi ve DDL; backup yazma/DDL; migrator implicit owner yetkisi.
- Restricted app enqueue/remove → restricted worker `runOnce` uçtan uca akışı.

## Doğrulama özeti

| Kontrol | Sonuç |
|---|---:|
| TypeScript `tsc --noEmit` | PASS |
| Contract + queue readiness | 9/9 PASS |
| Disposable PostgreSQL 16 adversarial suite | 1/1 PASS |
| `git diff --check` | PASS |
| Kod inceleme | GO; açık CRITICAL/HIGH/MEDIUM yok |
| Güvenlik inceleme | GO; açık CRITICAL/HIGH/MEDIUM yok |
| TDD inceleme | GO; açık CRITICAL/HIGH/MEDIUM yok |

Repo genel `pnpm test` bu dilimden önce çalıştırıldığında local `127.0.0.1:5432` / `DATABASE_URL` izolasyon ortamı bulunmadığı için DB entegrasyon testleri fail-closed `Test isolation unavailable` verdi. Bu sonuç T40 için full-suite PASS olarak sunulmaz; T40'ın kendi disposable PG16 kanıtı ayrıdır.

## Açık işler

| İş | Durum / kapanış kanıtı |
|---|---|
| T40 runtime cutover | **Açık.** Compose servislerine ayrı credential, secret rotation, canary, rollback ve production deploy kanıtı gerekir. |
| T41 tenant/RLS | **Açık.** İş verisi tenant izolasyonu ve deny-by-default RLS matrisi ayrıca tamamlanmalı. |
| T42 transaction sınırları | **Açık.** Ödeme/abonelik/queue eşzamanlılık ve idempotency yarışları ayrıca kapatılmalı. |
| T43 coverage gate | **Açık.** Repo genel, isolated DB destekli coverage politikası ve CI kanıtı gerekir. |
| T44 backup/restore | **Açık.** Object ownership/ACL/RLS dahil gerçek restore parity ve forward recovery tatbikatı gerekir. |
| T45 performans | **Açık.** Temsilî üretim hacminde DB/queue yük testi ve eşiklerin kaydı gerekir. |

Bu kanıt production'a deploy, canlı credential ayrımı, başarılı rollback veya bağımsız güvenlik denetimi anlamına gelmez. Doğru statü T40 ve Faz 7 için **PARTIAL**'dır.
