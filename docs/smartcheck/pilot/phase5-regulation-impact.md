# SmartCheck Faz 5 — Advisory Mevzuat Etki Analizi

**Durum:** Local pilot uygulaması tamamlandı; resmî kaynak lisansı, teknik reviewer ve production admission kapıları ayrı tutuluyor.

## Akış

```text
approved source_review_item (regulation_diff)
  → regulation_versions (governanceStatus=advisory)
  → deterministic quotation/item matching
  → upcoming/effective/unknown effective-date status
  → user-visible advisory impact list
```

Bir diff reviewer tarafından kabul edildiğinde her değişiklik için hash-bound `regulation_versions` kaydı ve tenant-scoped advisory alert oluşturulur. Bu işlem `rule_registry` veya `rule_versions` içinde canonical mühendislik/mevzuat kuralı üretmez.

## Etki eşlemesi

- `labor`: `costCategory=labor` veya işçilik/SGK/personel gibi açıklama sinyalleri;
- `material`: `costCategory=material` veya boru, vana, kablo, pompa gibi açıklama sinyalleri;
- `tax`, `legal`, `procurement`: teklif düzeyinde düşük güvenli, quotation-wide advisory eşleşme.

Sonuç mühendislik veya hukuk kararı değildir. Eşleşme nedeni, bulunan kalem kimlikleri, güven seviyesi ve yürürlük durumu açıkça döndürülür. Geçmiş teklif değerleri mutasyona uğramaz; kullanıcı yalnızca advisory etkiyi görür.

## API

- `GET /api/regulations/versions` — şirketin advisory sürümleri;
- `GET /api/regulations/versions/:id/affected-quotations?asOf=...` — tenant-scoped, latest quotation etkisi ve effective-date görünümü.

## Kabul kanıtı

`src/server/routes/regulation-impact.integration.test.ts` şu sınırları gerçek HTTP + PostgreSQL ile doğrular:

- labor diff yalnız labor kalemini eşleştirir;
- yürürlük tarihi gelmemiş değişiklik `upcoming` görünür;
- şirket B sürümü veya etki çıktısını göremez;
- hiçbir quotation tutarı otomatik güncellenmez.

`src/server/routes/source-intelligence.integration.test.ts` reviewer approval sonrasında advisory `regulation_versions` üretildiğini ve source review cleanup/foreign key zincirini doğrular.
