# Faz 7 / T42 — SmartCheck worker claim ve lease kanıt raporu

**Tarih:** 24 Ekim 2026

**Kod baseline:** `c185518834d5c82c468907ad00e3571c5f73587a`

**Hesaplama kaydı:** `BIM-CALC-2026-10-24.44` / `Rev. 50`

**Karar:** **PARTIAL — worker sahipliği ve canonical publish izole PostgreSQL 16 düzeyinde sertleştirildi; T42 ve production kapanışı yok**

## Kapanan dilim

- `queued → running` geçişi atomik claim'dir. Graphile stable job id owner kimliği, her teslimata özgü UUID ise lease tokenıdır.
- Farklı job aynı run'ı teslim ederse yalnız ilk claim kazanır. Aynı job redelivery yeni lease tokenıyla eski teslimatı çitler.
- Claim zaman damgası `startedAt` ve `updatedAt` alanlarını yeniler; eski queued kayıt sırf oluşturulma tarihi yüzünden stale sayılmaz. Periyodik heartbeat ayrı açık iştir.
- CSV normalized rows, artifact, run ve document; IFC normalized rows, artifact, run, quota ve document; PDF artifact listesi, run ve document aynı owner doğrulamalı transaction sınırında yayımlanır.
- Her canonical yazma `status = running` ve güncel lease tokenını ister. Recovery tokenı temizlediğinde eski worker DB çıktısı yayımlayamaz.
- Object-storage anahtarları lease tokenını içerir. Eski worker'ın upload ettiği nesne yeni sahibin nesnesini ezemez; DB yalnız kazanan tokenın anahtarını ve checksumını referanslar.
- Onaylı release CLI akışı `0014` öncesinde operator recovery/drain ile aktif run'ları sıfırlar. Migration içindeki CTE, CLI dışı/direct apply durumunda kalmış `running` run ve tenant eşleşmeli documentı atomik biçimde `failed / WORKER_LEASE_MIGRATION` durumuna alan ek savunmadır; explicit retry gerekir.
- Release `apply`, exact `RELEASE_WORKERS_DRAINED=true`, sıfır `public.document_processing_runs.status = running` ve sıfır Graphile `locked_at` olmadan migration başlatmaz. Workerlar uygulama ve worker aynı SHA ile açılana kadar durur.
- Public status/process/retry/recover cevapları internal `workerJobId` ve `workerLeaseToken` alanlarını dışarı vermez.

## Doğrulama

| Kontrol | Sonuç |
|---|---:|
| SmartCheck concurrency PostgreSQL 16 | 1/1 PASS |
| Claim, farklı delivery ve duplicate end-to-end alt senaryoları | PASS |
| Recovery öncesi/sonrası stale-owner write rejection | PASS |
| Gerçek overlap sonrası blob checksum = DB checksum | PASS |
| Release lifecycle + artifact + worker-drain gate | 24 PASS / 1 SKIP |
| TypeScript | PASS |
| `git diff --check` | PASS |
| Bağımsız code review | GO — CRITICAL/HIGH/MEDIUM yok |
| Bağımsız security review | GO — CRITICAL/HIGH/MEDIUM yok |
| Bağımsız TDD review | GO — dilim kapsamında bloklayıcı açık yok |

Tek skip, yerel makinede release doğrulamasının istediği eş sürüm PostgreSQL 16 `pg_dump` / `pg_restore` ikilisinin bulunmamasıdır. Release lifecycle, manifest/hash ve drain kontrolleri çalışmıştır.

Repo geneli önceki tek-thread koşuda 1.311 testten 1.300'ü geçti. Beş mevcut SmartCheck worker/queue fixture testi disposable worker şemasında `migrations` tablolarını hazırlamadığı için kırmızıdır. Bu altyapı fixture açığı, yeni concurrency testini etkilemez; yine de repo geneli CI yeşil sayılmaz ve deploy kapısı açılmaz.

## Açık sınırlar

- Academy purchase/refund webhook entitlement yaşam döngüsü hâlâ ayrı T42 dilimidir.
- Uzun süren gerçek IFC/PDF işleri için periyodik heartbeat/lease-expiry politikası ve dış object-store orphan garbage collection operasyonel olarak tanımlanmalıdır.
- Migration ve worker drain akışı disposable PostgreSQL'de kanıtlandı; production credential cutover, canary, rollback ve aynı-SHA rollout yapılmadı.
- İzinli gerçek vendor IFC/PDF dosya matrisi ve bağımsız yetkili mühendis kabulü tamamlanmadı.
- Banka API'si/mutabakatı ve gerçek dekont doğrulaması manuel ödeme diliminin açık sınırıdır.

Bu rapor bağımsız mühendis, mali müşavir, banka, ödeme kuruluşu veya production kabulü değildir. `LandingPage.tsx`, `LegislationView.tsx` ve `BimGlossary.tsx` değiştirilmedi; bu dilim kullanıcıya vaat edilen yeteneği veya mevzuat/hesap yöntemini değiştirmeyen iç güvenilirlik sertleştirmesidir.
