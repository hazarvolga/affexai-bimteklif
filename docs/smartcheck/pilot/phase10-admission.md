# Faz 10 — Gerçek pilot admission runbook

**Durum:** Teknik admission validator’ı hazır; gerçek müşteri/S3 kanıtı bekleniyor.

**Amaç:** Sentetik fixture’ı production kanıtı gibi göstermeden, ilk beş izinli MEP dosyasını ölçülebilir ve geri alınabilir biçimde kabul etmek.

## Admission sözleşmesi

`PILOT GATE: ADMISSION EVIDENCE COMPLETE` yalnız aşağıdaki kanıtların tamamı aynı güvenli manifestte doğrulandığında alınabilir:

- beş benzersiz müşteri/proje dosyası ve gerçek SHA-256 checksum;
- yazılı izin referansı, izin tarihi ve retention bitiş tarihi;
- en az bir MEP teknik reviewer’ı: membership UUID, ad, rol, yetkinlik referansı, scope, atanma tarihi, `approved` kararı, karar referansı ve karar tarihi;
- S3-compatible bucket/region/prefix;
- server-side encryption, least privilege ve retention/lifecycle doğrulaması;
- gerçek object `put → get → checksum → delete → get-failure` smoke çıktısı;
- pilot şirket allowlist’i ve feature flag kaydı.

Ham müşteri dosyası, izin belgesi, access key, secret key veya token repoya alınmaz. Manifest ve smoke çıktısı repo dışında erişimi sınırlı operasyon alanında tutulur.

## Uygulama sırası

### 1. İzole operasyon alanı oluştur

```bash
mkdir -p /secure/teklifpro/pilots/mep-YYYY-MM
cp docs/smartcheck/pilot/pilot-admission.example.json \
  /secure/teklifpro/pilots/mep-YYYY-MM/pilot-admission.json
```

Gerçek dosyalar yalnızca bu alanın izinli alt klasöründe tutulur. Repo, `output/`, local storage ve browser screenshot klasörleri müşteri dosyası için kabul alanı değildir.

### 2. Dosya kanıtını üret

Her dosya için müşteri izni, proje referansı, retention tarihi ve checksum manifestteki `files[]` kaydına yazılır:

```bash
shasum -a 256 /secure/teklifpro/pilots/mep-YYYY-MM/files/MEP-01.xlsx
```

`permissionGrantedAt` gelecekte olamaz; `retentionUntil` izin tarihinden önce veya admission tarihinden eski olamaz. Beş dosyanın `fileId` ve checksum değerleri birbirinden farklı olmalıdır.

### 3. S3 smoke çalıştır

Secret değerleri shell history’ye yazılmadan Coolify secret/env store üzerinden enjekte edilir:

```bash
SMARTCHECK_S3_BUCKET=... \
SMARTCHECK_S3_REGION=... \
SMARTCHECK_S3_ENDPOINT=https://... \
SMARTCHECK_S3_ACCESS_KEY_ID=... \
SMARTCHECK_S3_SECRET_ACCESS_KEY=... \
SMARTCHECK_S3_SMOKE_PREFIX=smartcheck-smoke/mep-YYYY-MM/ \
pnpm smartcheck:storage-smoke | tee /secure/teklifpro/pilots/mep-YYYY-MM/storage-smoke.json
```

Çıktı `status: passed` olmalı; bucket policy, encryption, lifecycle ve backup/restore drill kanıtları ayrıca referanslanmalıdır. Local storage smoke production S3 kanıtı değildir.

### 4. Manifest preflight çalıştır

Tekrarlanabilir tarih ile JSON çıktı alınır:

```bash
pnpm smartcheck:pilot-check -- \
  --json \
  --as-of=YYYY-MM-DD \
  /secure/teklifpro/pilots/mep-YYYY-MM/pilot-admission.json \
  > /secure/teklifpro/pilots/mep-YYYY-MM/admission-result.json
```

Başarı çıktısı:

```json
{
  "status": "passed",
  "asOf": "YYYY-MM-DD"
}
```

`blocked`, `invalid_manifest` veya non-zero exit üretirse upload/worker/pilot allowlist açılmaz. Validator’ın beklenen şekilde blokladığı placeholder örneği `pilot-admission.example.json`’dır.

### 5. İlk dosyayı kontrollü çalıştır

1. `SMARTCHECK_IMPORT_ENABLED=true` ve yalnız pilot `companyId` allowlist’te açılır.
2. Browser’da upload/complete, kaynak preview, mapping, processing ve review kanıtı alınır.
3. Her satırda source cell, processing run, rule version ve reviewer kararı kontrol edilir.
4. Yalnız `approved` veya gerekçeli `accepted_exception` satırlar taslak teklife aktarılır.
5. Pilot case ölçümü alınır; reviewer sonucu ve süreler manifest dışı pilot evidence kaydına işlenir.

Pilot case API’si aynı admission sınırlarını tekrar kontrol eder: gelecekteki izin, geçmiş retention, sıfır beklenen satır ve tamamlanmamış kaynak doküman `400/409` ile reddedilir. Manifesti atlayarak HTTP üzerinden admission açmak bu nedenle mümkün değildir.

## Go / no-go

| Kontrol | Go koşulu | No-go davranışı |
|---|---|---|
| Dosya izni | 5/5 yazılı izin + checksum | Dosya alınmaz |
| Reviewer | `approved` karar + scope + referans | Rule/exception promotion durur |
| Storage | Gerçek S3 smoke + encryption/retention/restore kanıtı | Feature flag kapalı kalır |
| Tenant | Pilot şirket allowlist’i ve negatif test | Upload 404/401 ile reddedilir |
| Parse | Beş dosyada ≥%90 manuel yeniden girişsiz parse | IFC/PDF/otomasyon kapsamı açılmaz |
| Provenance | Aktarılan kalemlerde %100 kaynak izi | Transfer reject edilir |

## Rollback

Admission sonrası sorun çıkarsa:

1. `SMARTCHECK_IMPORT_ENABLED=false` yap;
2. worker’ı durdur;
3. mevcut quotation/revision/PDF akışını açık bırak;
4. S3 objelerini retention politikasını ihlal etmeden karantinaya al;
5. audit ve incident kaydını koru;
6. düzeltme ve yeni reviewer kararı olmadan yeniden açma.

Bu fazın sonunda alınacak karar “production pilot go” veya `insufficient_evidence` olmalıdır; sentetik fixture başarıları gerçek müşteri başarısı yerine yazılamaz.
