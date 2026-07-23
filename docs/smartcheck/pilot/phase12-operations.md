# Faz 12 — Worker ve pilot operasyon hardening

**Durum:** Teknik local/HTTP kanıtı hazır; production S3, restore ve gerçek pilot kanıtı dış girdidir.

## Amaç

Bir worker process’i kesilirse `queued` veya `running` processing run’ı sessizce beklemesin. Sistem otomatik ve riskli bir veri mutasyonu yapmak yerine stale durumunu görünür kılar; yetkili operatör önce kurtarma, sonra açık retry kararı verir.

## Stale sözleşmesi

- Varsayılan heartbeat eşiği `15` dakikadır.
- `SMARTCHECK_PROCESSING_STALE_MINUTES` yalnız `5–240` aralığında kabul edilir; hatalı değer varsayılan 15’e düşer.
- Yalnız `queued` ve `running` run’lar stale olabilir; `succeeded`/`failed` run’lar stale sayılmaz.
- Queue endpoint’i her run için `isStale` alanı döndürür.
- GET/queue hiçbir status mutasyonu yapmaz.

## Operator akışı

```text
GET /api/smartcheck/queue
  → isStale=true
  → POST /api/smartcheck/documents/:id/recover-stale
  → run=failed, errorCode=WORKER_STALE, document=failed
  → POST /api/smartcheck/documents/:id/retry
  → yeni idempotency key + Graphile job
  → worker parse/normalize/validate
```

`recover-stale` yalnız aynı tenant’ın son stale run’ı için ve owner/admin/manager + verified email ile çalışır. Tenant B aynı document/run üzerinde `404` görür. Kurtarma ve retry audit log’a yazılır.

## Kanıt ve izleme

- `isStale` queue görünürlüğü;
- `WORKER_STALE` error code;
- `processing_stale_recovered` ve `processing_retried` audit olayları;
- failed run error code/message;
- Graphile Worker process health ve database connectivity;
- retry sonrası yeni run idempotency key’i.

Production dashboard en az şu sinyalleri izlemelidir: stale run sayısı, failed run sayısı, retry oranı, ortalama processing süresi, son worker heartbeat ve tenant başına hata dağılımı.

## Rollback / stop

Stale kurtarma beklenmedik şekilde artarsa SmartCheck feature flag kapatılır ve worker durdurulur; mevcut quotation, revision, authentication ve PDF akışı çalışmaya devam eder. `recover-stale` otomatik scheduler’a bağlanmaz; ilk pilot dalgasında operatör kararı zorunludur.
