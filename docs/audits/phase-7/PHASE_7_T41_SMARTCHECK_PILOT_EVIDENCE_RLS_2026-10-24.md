# Faz 7 / T41 SmartCheck Pilot Kanıt Zinciri Tenant RLS — Rev. 53

**Tarih:** 24 Ekim 2026
**Sürüm:** `BIM-CALC-2026-10-24.47`
**Kod baseline:** `5e1113524b3a3f4c253bae61066e0779c5391b1f`
**Durum:** **PARTIAL — yerel kod ve izole PostgreSQL 16 kanıtı; production/deploy ve bağımsız uzman kabulü yok**

## Kapsam

Bu üçüncü T41 dilimi SmartCheck pilot vaka, ölçüm ve audit kanıt zincirini tenant sınırı ve DB provenance ile korur. Pilot metrik formülü, eşikleri ve hesap sonuçları değişmemiştir. Public sayfalar değiştirilmemiştir.

| Nesne | FORCE RLS / policy sözleşmesi | Değişmezlik ve provenance |
|---|---|---|
| `smartcheck_pilot_cases` | Exact üç policy: app tenant ALL, backup SELECT, migrator-owner ALL; worker default-deny | İzinli alan ve durum geçişleri mutation guard ile sınırlı; admission/review audit'i DB triggerı ile aynı transactionda üretilir |
| `smartcheck_pilot_measurements` | Asimetrik exact dört policy: app tenant SELECT, app tenant INSERT, backup SELECT, migrator-owner ALL; worker default-deny | UPDATE/DELETE append-only trigger ile owner yolu dahil reddedilir; insert guard tenant/vaka/hash/revizyon bağını doğrular; ölçüm audit'i DB triggerı ile aynı transactionda üretilir |
| `smartcheck_audit_logs` | Pilot kapsamlı exact altı-policy FORCE RLS matrisi; non-pilot app/worker davranışı korunur, pilot app read tenant-scoped | Pilot satırları app/worker tarafından doğrudan yazılamaz veya değiştirilemez; trigger yalnız izinli admission/measurement/review kanıt biçimini kabul eder |

## Runtime sözleşmesi

- DB kullanan pilot endpointleri `PilotEvidenceService` üzerinden tek checked-out bağlantıda transaction-local company/user context ile çalışır.
- Ölçüm başlamadan vaka satırı kilitlenir. Normalleştirilmiş ölçüm isteği SHA-256 `requestHash` alır; hash immutable, vaka içindeki `caseRevision` monotoniktir.
- Aynı `measurementKey` replay'i yalnız mevcut ölçümün `measurementId` ve `requestHash` değerleri DB audit kanıtıyla eşleşirse stabil sonuç döndürür. Farklı hash idempotency conflict; hash/audit kanıtı eksik legacy kayıt unverified olarak fail-closed reddedilir.
- Yeni ölçüm insert'i ve ona ait `pilot_case_measured` audit satırı aynı DB transactionında atomiktir. Uygulama doğrudan pilot audit insert'i yapmaz.
- Review latest doğrulanmış ölçümü kullanır. Reviewer, ölçümü yapan kullanıcıdan farklı olmalı ve karar anında aynı şirkette canlı `owner`, `admin` veya `manager` üyeliğine sahip olmalıdır. Guarded case mutation yalnız ilk terminal reviewer kararına izin verir; review audit'i aynı transactionda DB tarafından üretilir.

## Inspector ve release kapısı

Migration `0016_smartcheck_pilot_evidence_tenant_rls` release manifest, journal, snapshot ve stage signature kayıtlarına bağlanmıştır. Migration postcondition ve `database-roles:inspect` şunları fail-closed doğrular:

- İki pilot tablosunun varlığı, owner'ı, FORCE RLS durumu ve exact 3/4 policy matrisi.
- `smartcheck_audit_logs` FORCE RLS ve exact altı-policy scoped matrisi.
- Append-only, insert-validation, case-mutation ve DB audit triggerlarının exact tablo/fonksiyon/olay bağlantısı.
- İlgili fonksiyonların owner, security invoker/definer, sabit `search_path`, PUBLIC execute reddi ve kaynak gövdesi provenance'ı.
- Korunan tablolardan biri mevcutken eksik `0016` ledger tag'i; tag uygulanmışken eksik tablo, policy, trigger veya function drift'i.

Tag ve kapsam tablolarının birlikte bulunmadığı pre-schema bootstrap geçerli başlangıç durumudur. Bu istisna kısmi kurulum veya uygulanmış-tag drift'ini geçerli saymaz.

## Doğrulama kaydı

- Pilot route/service integration testleri: tenant transaction, stable replay, conflicting hash, legacy rejection, terminal vaka, live membership ve maker-checker davranışları geçti.
- Release artifact/data-transition ve database-role contract testleri geçti.
- Parola doğrulamalı izole PostgreSQL 16 sözleşmesi: A/B tenant ayrımı, context yokluğu, app/worker/backup/migrator-owner sınırları, append-only ölçüm/audit, guarded case mutation, replay provenance, pool GUC temizliği ve inspector drift senaryoları geçti.
- CDE, hakediş ve canonical rol PostgreSQL regresyonları ile root/release TypeScript kontrolleri geçti.
- Bağımsız code review ve security review sonucu **GO**.

Bu doğrulamalar local/CI hazırlığını gösterir. Production migration, credential cutover, canary, restore/parity, rollback veya deploy kanıtı değildir.

## Açık sınırlar

- T41 ve Faz 7 **PARTIAL** kalır; diğer tenant tabloları aynı RLS sözleşmesine henüz alınmamıştır.
- `retention_until` kanıtın asgari korunma zamanıdır. Otomatik purge, imha onayı veya legal-hold workflow'u yoktur.
- İzinli gerçek IFC/PDF/vendor dosyalarıyla pilot kabulü ve ad-soyad/unvan/sicil/tarih içeren bağımsız uzman imzası yoktur.
- Bu kayıt L3/L4, mevzuata tam uygunluk, production readiness veya canlı tenant izolasyonu iddiası değildir.

## Değişen ana dosyalar

- `drizzle-release/0016_smartcheck_pilot_evidence_tenant_rls.sql`
- `src/services/pilot-evidence/service.ts`
- `src/server/routes/pilot-evidence.ts`
- `src/db/schema.ts`
- `scripts/database-roles/contract.ts`
- `scripts/database-roles/inspect.ts`
- `scripts/release-migrations/data-transitions.ts`
- `scripts/release-migrations/stage-signatures.ts`
- `src/contracts/smartcheck-pilot-tenant-rls.pgtest.ts`
- `src/server/routes/pilot-evidence.integration.test.ts`
