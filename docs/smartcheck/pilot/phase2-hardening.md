# SmartCheck Faz 2 — Pilot Hardening

**Durum:** Local implementation complete · 23 Temmuz 2026

## Amaç

İlk gerçek MEP dosyası işlenmeden önce kullanıcıya kaynağın şeklini gösterip eşlemeyi onaylatmak, normalize edilmiş satırın kaynak iziyle birlikte incelenmesini sağlamak ve başarısız worker run’larını tenant sınırları içinde tekrar kuyruğa alabilmek.

## Uygulanan kontroller

- CSV/XLSX kaynak preview: sheet adı, satır/kolon sayısı, ilk 21 satır, önerilen kolon eşleme ve formül hücreleri.
- MEP profilleri: Türkçe standart, miktar/fiyat varyantı ve kamu analiz şablonu.
- `raw → normalized` provenance paneli: hücre aralığı, değerler, eşleme güveni, formül, bulgu kural sürümü ve reviewer kararı.
- Tenant-scoped operator queue: son 25 processing run, progress, error code ve retry.
- `fetchWithAuth` binary upload düzeltmesi: açık CSV/XLSX MIME header’ı JSON varsayılanıyla ezilmiyor.

## Kanıt

```text
pnpm lint                         ✅
pnpm smartcheck:fixtures          ✅ 3/3
pnpm smartcheck:http-integration  ✅ 1/1
pnpm test                         ✅ 273/273
pnpm build                        ✅ Vite + esbuild
```

Browser smoke: `output/playwright/smartcheck-phase2-queue.png` (local-only).

## Sınır

Bu faz gerçek fiyat kaynağı, mevzuat adaptörü, production S3 veya müşteri dosyası eklemez. Fiyat snapshot ve resmî kaynak watcher’ı Faz 3–5 kapsamındadır.
