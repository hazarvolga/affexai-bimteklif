# Faz 8 — Production Storage Admission

## Durum

Kod ve izole local storage smoke hazırdır. Gerçek production S3-compatible bucket, retention/lifecycle ve backup/restore kanıtı henüz sağlanmadığı için production admission açık değildir.

## Çalışma sözleşmesi

- Development ortamında `LocalStorageAdapter` yalnızca izole local volume kullanır.
- Production ve `SMARTCHECK_IMPORT_ENABLED=true` iken `S3StorageAdapter` zorunludur; local fallback yoktur.
- `pnpm smartcheck:storage-smoke` geçici bir `smartcheck-smoke/<uuid>.txt` nesnesini `put → get → checksum → delete → get-failure` sırasıyla doğrular.
- Smoke çıktısı secret veya dosya içeriği yazmaz; hata durumunda process non-zero ile durur.
- `/api/health` içindeki `readiness.smartcheckStorageConfigured` yalnız konfigürasyon preflight sonucudur; gerçek object smoke, retention veya backup başarısı iddia etmez.

## Production preflight

SmartCheck production storage açılmadan önce şu koşullar sağlanmalıdır:

- `SMARTCHECK_PRODUCTION_COMPANIES` allowlist'i mevcut ve gözden geçirilmiş olmalı.
- `SMARTCHECK_S3_BUCKET` ve `SMARTCHECK_S3_REGION` tanımlı olmalı.
- Özel endpoint kullanılıyorsa HTTPS olmalı.
- Access key ve secret birlikte verilmeli veya sağlayıcının güvenli workload identity/IAM rolü kullanılmalı.
- `SMARTCHECK_S3_FORCE_PATH_STYLE` yalnızca `true`/`false` olmalı.
- Bucket policy tenant prefix izolasyonu, server-side encryption ve least privilege sağlamalı.

Eksik veya geçersiz preflight ile komutun beklenen sonucu `SMARTCHECK STORAGE SMOKE: BLOCKED` ve non-zero exit'tir. Sahte credential ile başarılı smoke kabul edilmez.

## Admission kanıt paketi

Gerçek pilot öncesi, repo dışında güvenli bir operasyon alanında aşağıdakiler saklanmalıdır:

1. Bucket/prefix policy ve encryption ayarı.
2. Retention/lifecycle kuralı ve silme sorumlusu.
3. Backup/restore sahibi, son drill tarihi ve restore sonucu.
4. UTC timestamp içeren gerçek `pnpm smartcheck:storage-smoke` çıktısı.
5. Beş müşteri izinli dosyanın checksum ve object key kayıtları; ham dosyalar repoya alınmaz.

Bu kanıtlar tamamlanmadan scheduler, gerçek müşteri yüklemesi veya otomatik fiyat/mevzuat güncellemesi açılmamalıdır.

## Local doğrulama

`src/smartcheck/import/storage-smoke.test.ts` local adapter için round-trip, SHA-256, cleanup ve traversal-safe prefix davranışını doğrular. Production S3 başarısı, gerçek provider credentials olmadan local test ile yerine konulamaz.
