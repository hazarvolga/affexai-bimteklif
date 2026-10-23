# Faz 7 / T41 — CDE tenant RLS kanıt raporu

**Tarih:** 24 Ekim 2026
**Kod baseline:** `58cf3205fa6a4c7d2244dd27bb9bd83fe895aef0`
**Hesaplama kaydı:** `BIM-CALC-2026-10-24.42` / `Rev. 48`
**Karar:** **PARTIAL — beş CDE tablosu kod ve disposable PostgreSQL 16 düzeyinde korunuyor; genel tenant/production kapanışı yok**

## Kapanan dilim

- `cde_projects`, `cde_project_members`, `cde_containers`, `cde_revisions` ve `cde_transition_events` için `ENABLE` + `FORCE ROW LEVEL SECURITY`.
- App policy: exact `session_user=current_user=bimmetraj_app` runtime kapısı ve transaction-local `bimmetraj.company_id` eşleşmesi.
- Backup policy: salt okunur görünürlük. Worker: policy olmadığı için varsayılan red.
- Migration policy: yalnız `session_user=bimmetraj_migrator` ve `current_user=bimmetraj_owner` birleşimi.
- CdeService'in bütün okuma/yazma girişleri aynı checked-out bağlantıda `BEGIN → rol doğrulama + tenant GUC → iş → COMMIT/ROLLBACK` akışına alındı.
- Rol inspector'ı, release ledger'ında `0013_cde_tenant_rls` varsa tam beş tabloyu, FORCE durumunu ve exact policy rol/komut/ifadelerini denetler.
- Migration gerçek release runner, catalog pin ve ledger yolundan uygulanır. GitHub Actions gerçek PostgreSQL 16 sözleşme testini zorunlu çalıştırır.

## PostgreSQL 16 kanıtı

- Context yokken beş CDE tablosu default-deny.
- Filtre yazılmayan SQL yalnız aktif tenantı görür; cross-tenant `INSERT` `WITH CHECK` ile reddedilir.
- `createProject → assignMember → createContainer → createOrReuseRevision → transition → history` yaşam döngüsü restricted app rolüyle geçer; proje RBAC korunur.
- Max=1 pool reuse sonrasında commit ve rollback bağlam sızıntısı yoktur; iki tenantın eşzamanlı 25 tur sorgusu çapraz satır görmez.
- Superuser, owner, migrator ve superuser `SET ROLE bimmetraj_app` bağlantıları iş callback'i başlamadan reddedilir.
- Worker yazamaz/göremez; backup okuyabilir fakat yazamaz; migrator-owner yolu FORCE RLS altında explicit policy ile çalışır.
- FORCE kapatma ve beş CDE tablosunun tamamını düşürme driftleri operational inspector tarafından reddedilir.
- Full CDE HTTP/RBAC testi ayrıca 1/1 geçmiştir; RLS kanıtı dedicated restricted-role PG16 testindedir.

## Doğrulama

| Kontrol | Sonuç |
|---|---:|
| PostgreSQL 16 CDE RLS contract | 7/7 PASS |
| CDE HTTP/RBAC integration | 1/1 PASS |
| Tenant helper + release artifact + role contract | 21/21 PASS |
| Release migration lifecycle | 14 PASS / 0 FAIL / 1 SKIP (`pg_dump`/`pg_restore` binary yok) |
| TypeScript | PASS |
| `git diff --check` | PASS |
| Code review | GO — açık CRITICAL/HIGH/MEDIUM yok |
| Security review | GO — açık CRITICAL/HIGH/MEDIUM yok |
| TDD/CI review | GO — açık CRITICAL/HIGH/MEDIUM yok |

## Açık sınırlar

- T41 yalnız beş CDE tablosunu kapsar; doğrudan `company_id` taşıyan diğer iş tabloları henüz RLS kapsamına alınmadı.
- Custom GUC, uygulama filtresi unutulması ve pool reuse hatasına karşı ikinci savunmadır. Ele geçirilmiş app credential ile keyfi SQL çalıştırılmasına karşı tenant kimlik doğrulaması sayılmaz; uygulama/input güvenliği ve credential koruması ayrı kapıdır.
- T40 compose/runtime credential cutover tamamlanmadı. Production hâlâ kanıtlanmış app/worker/migrator/backup ayrımında değildir.
- Production deploy, canary, rollback, restore parity ve canlı tenant izolasyon smoku yapılmadı.
- Public iş akışı veya hesap formülü değişmedi; `LandingPage.tsx`, `LegislationView.tsx` ve `BimGlossary.tsx` için içerik değişikliği gerekmedi.

Bu rapor bağımsız mühendis, BIM koordinatörü veya güvenlik denetçisi imzası değildir; production izolasyonu ya da Faz 7 kapanışı olarak kullanılamaz.
