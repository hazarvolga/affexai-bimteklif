# SmartCheck Faz 3 — Fiyat kanıtı ve snapshot kilidi

**Durum:** Yerel pilot akışı tamamlandı; production piyasa adaptörü değildir.

Faz 3, bir teklif kaleminin satış fiyatını “güncel bir sayı” olarak değil, kaynağı hash’lenmiş ve geçerlilik penceresi bilinen immutable bir snapshot olarak saklar. Bu katman canlı tedarikçi crawler’ı veya mevzuat motoru çalıştırmaz; kontrollü adaptörler gelene kadar `advisory`/reviewer kararını zorunlu kılar.

## Uygulanan çekirdek

- `price_sources`: kaynak tipi, otorite, URL, doküman kimliği/hash’i ve lisans durumu.
- `price_snapshots`: pozisyon, birim, miktar, para birimi, KDV/navlun durumu, geçerlilik, kaynak sürümü, güven ve reviewer kararı.
- `quotation_item_evidence`: teklif kalemine bağlanan fiyat/miktar kanıt zinciri; eski kanıtlar `superseded` olarak kalır.
- `quotations.pricing_snapshot_lock_*`: teklifin fiyat kanıtı kilit hash’i ve `unlocked|locked|stale` durumu.
- `quotation_items.price_snapshot_*`: kalem seviyesinde snapshot referansı ve kilit zamanı.
- SmartCheck çalışma alanında reviewer, eşleşen advisory/approved snapshot’ı aktarım öncesi kaleme seçebilir; seçim yapılmazsa kalem aktarılır ancak fiyat kilidi eksik kanıt olarak görünür.

## HTTP sözleşmesi

| Akış | Endpoint | Kural |
|---|---|---|
| Kaynak oluştur | `POST /api/pricing/sources` | Kaynak hash’i veya payload hash’i zorunlu |
| Snapshot oluştur | `POST /api/pricing/sources/:sourceId/snapshots` | Hash kaynakla eşleşmeli; idempotent anahtar kullanılır |
| Listele | `GET /api/pricing/snapshots` | Tenant scope ve stale işareti |
| Reviewer kararı | `PATCH /api/pricing/snapshots/:snapshotId/review` | `advisory/approved/rejected` |
| Teklif kanıtı | `GET /api/quotations/:id/pricing-snapshot` | Eksik/eski kanıt uyarısı |
| Fiyatı kilitle | `POST /api/quotations/:id/pricing-snapshot/lock` | Her kalemde snapshot; stale ise açık `allowStale` kararı |

Tüm endpoint’ler authentication, doğrulanmış e-posta, tenant scope, rol, rate-limit ve audit log ile korunur. Snapshot veya teklif başka tenant’tan okunamaz; composite foreign key’ler veritabanında da sınırı tekrarlar.

## Kabul kanıtı

`src/server/routes/pricing.integration.test.ts` gerçek Express + PostgreSQL akışında şunları doğrular:

1. Kaynak ve snapshot oluşturma;
2. stale işareti ve teklif kanıt paneli;
3. Tenant B’nin kaynak/snapshot/teklif erişim sınırı;
4. teklif fiyat kanıtı kilidi ve deterministik hash;
5. `quotation_item_evidence` kalıcı kaydı.

Bu fazın çıkışı “piyasa fiyatı doğrudur” iddiası değildir. Gerçek YFK/TÜİK/GİB/resmî kaynak adaptörleri, lisans incelemesi ve teknik reviewer onayı Faz 4–5 kapılarıdır.
