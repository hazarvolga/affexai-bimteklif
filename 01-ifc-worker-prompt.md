# PROMPT 1: SmartCheck IFC işlemeyi Python + IfcOpenShell'e taşı

Bu prompt `hazarvolga/affexai-bimteklif` reposunun mevcut koduna göre yazıldı. Sıfırdan mimari kurma; mevcut yapıyı koru, sadece IFC işleme kısmını değiştir. Köşeli parantezli yerleri doldur veya boş bırakıp ajanın sana sormasını sağla.

---

```
# GÖREV
SmartCheck IFC işleme hattını, ana Express sürecinden ve mevcut regex tabanlı TypeScript
ayrıştırıcıdan çıkarıp ayrı bir Python + IfcOpenShell işleyicisine taşı. Amaç:
(1) büyük IFC dosyaları API'yi ve diğer firmaları etkilemesin,
(2) IFC gerçekten STEP/IFC olarak ayrıştırılsın (IFC_GAP_RAPORU.md GAP-IFC-01 ve GAP-IFC-02'yi kapatır),
(3) mevcut kanıt (evidence) sözleşmesi, review akışı ve tenant izolasyonu BOZULMASIN.

# 0. ÖNCE OKU (ZORUNLU, kod yazmadan önce)
Repo kuralları: AGENTS.md ve CLAUDE.md. Okuma sırası:
docs/agent-memory/README.md → PROJECT_BRIEF.md → WORKING_STATE.md →
ARCHITECTURE_DECISIONS.md → AGENT_PROTOCOL.md. Sonra IFC_GAP_RAPORU.md
(özellikle GAP-IFC-01/02, Bölüm 4 "Quantity kaynak önceliği", Bölüm 6 "Doğruluk kabul kapıları").
Sert kurallar:
- Yerel PostgreSQL'de SADECE bu görev için adı verilen TeklifPro veritabanını kullan, başka servis/DB'ye dokunma.
- vercel.json SPA rewrite'larını bozma.
- Kod değişikliğinden sonra `graphify update .` çalıştır (AGENTS.md).
- Mevcut testler (pnpm test) geçmeye devam etmeli.

# MEVCUT DURUM (repodan doğrulanmış gerçekler; yanlış buluyorsan bana söyle)
Yığın: Vite + React 19, Express 4, Drizzle ORM (src/db/schema.ts), PostgreSQL.
Kuyruk: graphile-worker 0.16.0 (PostgreSQL tabanlı). Redis/BullMQ YOK ve EKLENMEYECEK.
Depolama: src/smartcheck/import/storage.ts (LocalStorageAdapter dev, S3StorageAdapter production, presigned PUT var).

IFC akışı bugün:
1. src/server/routes/smartcheck.ts: upload kaydı → içerik yükleme (PUT /documents/:id/content veya presigned) → tamamlama → `quickAddJob(..., "process_smartcheck_document", ...)` (iki yerde: ilk işleme ve retry).
2. src/smartcheck/import/worker.ts: tek task listesi, concurrency 2, XLSX/CSV ile aynı süreçte.
3. src/smartcheck/import/processor.ts: `storage.get()` TÜM dosyayı Buffer olarak belleğe alıyor →
   processIfcSmartCheckDocument → src/ifc/smartcheck-processing.ts:
   `content.toString("utf8")` → parseIfcText (src/ifc/parser/legacy-parser.ts + qto/quantity/spatial/tr-pset-csb extractor'ları, satır bazlı regex) →
   buildIfcSmartCheckEvidenceArtifact (src/ifc/smartcheck-evidence.ts) → `ifc-evidence.json` artifact + normalizedQuantityRows → awaiting_review.
4. src/smartcheck/import/file-security.ts `detectAndValidateFile(buffer, ...)` Buffer ile çalışıyor; IFC için 100 MB sabit sınır (config.ts SMARTCHECK_MAX_IFC_FILE_BYTES).
5. Run durum makinesi, stale recovery (WORKER_STALE, run-health.ts), retry, audit (smartcheckAuditLogs) zaten var.

Sorunlar: tüm dosya + tüm metin bellekte; regex ayrıştırma (çok satırlı entity, escape, ilişki grafiği çözülmüyor);
IFC ve XLSX/CSV aynı worker'da; limit sabit.

# HEDEF MİMARİ

## A. KORUNACAKLAR (dokunma)
graphile-worker kuyruğu; documents / documentProcessingRuns / documentProcessingArtifacts / normalizedQuantityRows;
run durum makinesi, stale recovery, retry; tenant izolasyonu (companyId her sorguda); insan review akışı;
kanıt sözleşmesi (IfcSmartCheckEvidenceArtifact, src/contracts şemaları); evidence admission/politika kodu (src/ifc/evidence-policy.ts).
Kanıt/admission mantığı TypeScript'te TEK yerde kalsın; Python'a taşınmasın.

## B. YENİ İŞ AYRIMI
- Yeni task: `process_smartcheck_ifc_document`. IFC işleri bu task'a, XLSX/CSV işleri mevcut `process_smartcheck_document` task'ına gitsin.
- `quickAddJob` çağrıları (ilk işleme + retry) tek bir yardımcıya taşınsın: `enqueueSmartCheckProcessing(kind, payload)`.
- Yeni worker giriş dosyası (örn. src/smartcheck/import/ifc-worker.ts): sadece IFC task'ını dinler, concurrency ortam değişkeniyle (varsayılan 1).
  Mevcut worker.ts IFC task'ını artık dinlemesin (ama geçiş döneminde eski kuyruktaki işler için uyumluluk notu düş).
- Package.json'a `smartcheck:ifc-worker` script'i ekle.

## C. PYTHON İŞLEYİCİ
- Klasör: workers/ifc/ (Python 3.11+, ifcopenshell, pinli sürüm, requirements.txt, pytest).
- CLI: `python -m ifc_extract --input <yol> --output <json yolu> --file-name <ad>`.
  Girdi dosya yoludur (Buffer/stdin DEĞİL). Çıktı: ParsedIfcElement[] + IfcParseSummary biçimi
  (src/ifc/types.ts; legacy parseIfcText'in döndürdüğü şekil) ile BİREBİR uyumlu JSON.
  Node tarafı bu JSON'u zod ile doğrulayıp mevcut buildIfcSmartCheckEvidenceArtifact'a verir; yani aşağı akış değişmez.
- Quantity kaynak önceliği IFC_GAP_RAPORU.md Bölüm 4'e göre:
  1) standart QTO (IfcElementQuantity / IfcQuantity*), 2) onaylı exporter property'si (örn. AllplanAttributes/Hacim; mapping sürümlü),
  3) geometri hesabı (BU GÖREVDE YOK, sonraya bırak), 4) insan düzeltmesi (zaten review akışında), 5) tahmin (YASAK; kaynak yoksa quantity boş kalsın, uydurma/STEP ID'den türetme olmasın).
  Birden fazla kaynak varsa fark çıktıda görünsün, sessizce biri seçilmesin.
- Mevcut extractor'ların (qto, quantity, spatial, tr-pset-csb) davranışını IfcOpenShell karşılıklarıyla yeniden yaz:
  IfcRelDefinesByProperties (pset/qto), IfcRelContainedInSpatialStructure (kat), TR Pset/ÇŞB alanları, poz no.
  Escape'li metinler ve çok satırlı entity'ler IfcOpenShell tarafından doğru çözülmeli.
- Bellek: model bir kez açılsın, sadece gereken tipler (IfcBeam, IfcColumn, IfcSlab, IfcWall, IfcWallStandardCase, IfcReinforcingBar vb.; legacy regex'teki liste) sorgulansın, gereksiz kopya olmasın.
- Hata kodları (stderr + çıkış kodu): IFC_PARSE_FAILED, IFC_SCHEMA_UNSUPPORTED, IFC_EMPTY_MODEL. Başarılı çıktı yazılmadan çıkış kodu 0 olmasın.

## D. NODE ORKESTRASYONU (ifc task'ı)
1. Dosyayı depodan geçici diske AKIŞLA indir (StorageAdapter'a `downloadToFile(storageKey, targetPath)` ekle; Local ve S3 adapter için; S3'te Body stream + pipeline). Tüm dosyayı Buffer'a alma. SHA-256'yı akışla hesapla ve documents kaydındaki checksum ile karşılaştır.
2. Python'u `child_process.spawn` ile çalıştır: zaman aşımı (SMARTCHECK_IFC_TIMEOUT_SEC, varsayılan 600), stdout/stderr için sınırlı tampon, zaman aşımında süreç ağacını öldür.
3. Çıkış kodlarını run errorCode'larına eşle: IFC_PARSE_FAILED, IFC_TIMEOUT, IFC_OOM (137/SIGKILL), IFC_WORKER_CRASH. Mevcut updateRun / failed akışını kullan.
4. Çıktı JSON'unu zod ile doğrula, mevcut artifact ve normalizedQuantityRows yazımını aynen kullan (processIfcSmartCheckDocument'ın DB kısmı değişmesin).
5. Geçici dosyaları hata olsa bile `finally` içinde sil.
6. `parserVersion`: "ifcopenshell-<sürüm>-evidence-v1". Eski artifact'ler "legacy-ifc-evidence-v1" olarak kalır.

## E. YÜKLEME / DOĞRULAMA TARAFI
- `PUT /documents/:id/content` (express.raw) sadece local/dev yolu; production presigned PUT kalsın. Tamamlama adımının dosyayı nasıl okuduğunu incele:
  IFC için tüm dosyayı Buffer'a almadan doğrula (ilk 8 KB örnek + boyut + akışlı sha256). XLSX/CSV davranışı değişmesin.
- Maks. IFC boyutu şimdilik 100 MB sabit kalsın ama `getTenantIfcLimits(companyId)` yardımcısı üzerinden okunsun
  (şimdilik ortam değişkeni varsayılanlarını döner; plan bazlı değerleri başka bir görev dolduracak).
  Aynı yardımcı: maxFileBytes, maxConcurrent (tenant başına eşzamanlı IFC işi), monthlyLimit (şimdilik null = sınırsız).
  Tenant başına eşzamanlı sınırı enqueue anında kontrol et; aşılırsa net Türkçe hata.

## F. FEATURE FLAG VE GEÇİŞ
- `SMARTCHECK_IFC_ENGINE=legacy | ifcopenshell | shadow` (varsayılan: legacy).
  shadow: ikisini de çalıştır, legacy sonucu kullan, karşılaştırma raporunu (eleman sayısı, tip bazında quantity farkı) artifact/log olarak sakla.
  ifcopenshell: yeni motor sonucu kullanır. Legacy kodu silme; parite onaylanana kadar kalsın.
- Mevcut allowlist (SMARTCHECK_IMPORT_ENABLED, SMARTCHECK_PILOT_COMPANY_IDS) davranışı aynen korunsun.

## G. DEPLOYMENT
- Dockerfile.ifc-worker: Node + Python + ifcopenshell, pinli sürümler. docker-compose örneğine `ifc-worker` servisi: mem_limit, cpus, restart policy, ortam değişkenleri, depolama/DB erişimi.
- Mevcut pilot deploy notları Coolify/VPS'e göre; Vercel uzun ömürlü worker çalıştıramaz, bu yüzden worker Vercel'e konmayacak. README/docs'a kısa "nasıl çalıştırılır / nasıl ölçeklenir" notu.
- .env.example'a yeni değişkenleri ekle (SMARTCHECK_IFC_ENGINE, SMARTCHECK_IFC_TIMEOUT_SEC, SMARTCHECK_IFC_WORKER_CONCURRENCY, tenant varsayılan limitleri, PYTHON_BIN).

# KAPSAM DIŞI (yapma)
İstemci tarafı WASM; geometri tabanlı hacim hesabı; kural motoru değişikliği; yeni UI (sadece hata mesajı metinleri);
Redis/BullMQ; Next.js'e geçiş; Prisma'ya geçiş; süper admin paneli (ayrı görev).

# TEST VE DOĞRULAMA
- Altın fixture'lar: fixtures/smartcheck, ifc-document-sample, src/ifc/fixtures, src/smartcheck/import/fixtures.
- Parite scripti: aynı dosyada legacy ile IfcOpenShell çıktısını eleman tipi / kat / quantity bazında karşılaştır, farkları TABLO olarak raporla (sessizce birini seçme).
  IFC_GAP_RAPORU.md Bölüm 6 doğruluk kabul kapıları geçmeden varsayılanı `ifcopenshell` yapma; bunu bana bırak.
- Python: pytest (küçük, orta fixture; bozuk dosya; boş model; escape'li metin; çok satırlı entity).
- Node: tsx --test, Python çalıştırıcı mock'lanarak: zaman aşımı, OOM çıkış kodu, geçersiz JSON, geçici dosya temizliği,
  iki tenant ile izolasyon, retry ve WORKER_STALE kurtarmanın hâlâ çalıştığı, enqueue yardımcısının doğru task'ı seçtiği.
- `pnpm test` ve `pnpm lint` (tsc --noEmit) yeşil olmalı. Büyük dosya (≥100 MB sentetik) ile bellek ölçümü: API sürecinin RSS'i artmıyor, ifc-worker sınır içinde.

# ÇALIŞMA ŞEKLİ
1. Önce incele ve bana kısa plan ver: dokunacağın dosyalar, varsayımların, açık sorular. Onayımı bekle.
2. Sırayla ilerle, her adım sonunda dur ve özet ver:
   (a) enqueue yardımcısı + yeni task ayrımı + yeni worker girişi
   (b) StorageAdapter.downloadToFile + akışlı checksum + doğrulama refaktörü
   (c) Python işleyici (workers/ifc) + pytest
   (d) Node orkestrasyonu (spawn, zaman aşımı, hata kodları, temizlik)
   (e) feature flag + shadow karşılaştırma + parite scripti
   (f) tenant limit yardımcısı
   (g) Docker/compose/.env.example/docs
3. Emin olmadığın noktada varsayım yapma, bana sor.
4. Commit atma, push etme; değişiklikleri çalışma ağacında bırak.

# SON KONTROL
- IFC dosyası hiçbir noktada Buffer olarak Express sürecinin veya Node worker'ın belleğine tamamen alınıyor mu? Alınıyorsa düzelt.
- Kanıt sözleşmesi ve review akışı değişmedi mi? Eski artifact'ler hâlâ okunuyor mu?
- Python çökmesi/OOM yalnızca o run'ı failed yapıyor mu, ana API etkileniyor mu?
- Tenant izolasyonu (storage key, DB sorguları, job payload) korunuyor mu?
- Varsayılan motor hâlâ `legacy` mi?
```
