# SmartCheck Faz 6 — İnsan Onaylı Piyasa Verisi Beta

**Durum:** Local pilot beta tamamlandı; otomatik piyasa crawler'ı, ticari veri lisansı ve production S3 admission kapısı açık.

## Amaç

Tedarikçi tekliflerini kaynağı, koşulları ve reviewer kararıyla fiyat hafızasına almak; yeni bir birim fiyatı geçmiş onaylı örneklerle karşılaştırmak ve olağandışı değeri görünür kılmak. Bu faz gerçek piyasa fiyatını kendi başına icat etmez veya teklif kalemini sessizce değiştirmez.

## Akış

```text
XLSX/CSV source upload
  → source hash + supplier metadata
  → supplier quote rows
  → comparable approved snapshots
  → normal / insufficient_data / outlier signal
  → human approve/reject
  → immutable approved price snapshot
```

`sourceDocumentHash` ve kaynak kimliği her submission'da tutulur. Satırların `sourceCellRange`, poz kodu, açıklama, birim, miktar, fiyat, bölge ve geçerlilik tarihi korunur. Aynı submission ve `sourceRowKey` tekrar gönderildiğinde unique key ile idempotent davranılır.

## Outlier sınırı

- Karşılaştırma önce poz kodu + birim, sonra normalize açıklama + birim üzerinden yapılır.
- Bölge iki tarafta da varsa karşılaştırmaya katılır.
- Üçten az karşılaştırılabilir örnekte sonuç `insufficient_data` olur; otomatik onay yoktur.
- Üç veya daha fazla örnekte median/MAD tabanlı robust skor kullanılır. Skor `3.5` üzerindeyse ve fark en az `%20` ise satır `outlier` işaretlenir.
- Outlier yalnızca reviewer'ın açık kararıyla approved olabilir.

Bu sinyaller karar desteğidir; bölgesel ticari koşul, kapsam farkı veya teklif geçerlilik şartlarını teknik reviewer değerlendirmeden kanonik fiyat sayılmaz.

## API yüzeyi

- `GET/POST /api/market-intelligence/supplier-quotes` — submission kuyruğu ve metadata;
- `GET /api/market-intelligence/supplier-quotes/:id` — satır, baseline ve bulgular;
- `POST /api/market-intelligence/supplier-quotes/:id/entries` — normalize edilmiş satırların idempotent eklenmesi;
- `POST /api/market-intelligence/supplier-quotes/:id/import-smartcheck-rows` — onaylı SmartCheck satırlarını aynı provenance ile aktarma;
- `PATCH /api/market-intelligence/supplier-quote-entries/:id/review` — approve/reject ve reviewer audit'i;
- `GET /api/market-intelligence/price-memory` — yalnız tenant'ın approved snapshot özetleri ve örnekleri.

Tüm yüzeyler membership, rol, rate-limit, audit ve `companyId` izolasyonu uygular. Approved satır immutable `price_snapshots` kaydına bağlanır; geçmiş tekliflerin fiyatı geriye dönük mutasyona uğramaz.

## UI ve bilinçli sınırlar

`/app/market-intelligence` ekranı mevcut SmartCheck güvenli upload yaşam döngüsünü kullanır; dosya hash'i ve tedarikçi metadata'sı kaydedilir. Onaylı SmartCheck satırları aynı document/run/cell provenance ile reviewer kuyruğuna aktarılabilir. Parser sonucu olmayan kontrollü senaryolar için manuel satır girişi yalnız beta fallback’i olarak tutulur.

Ekrandaki “firma fiyat hafızası” yalnız onaylı `supplier_quote` ve `company_actual` snapshot'larını gösterir. Gerçek tedarikçi fiyatı, crawler, API credential veya mevzuat güncellemesi bu fazda yoktur. Lisans, veri kullanım hakkı, S3 retention/backup ve en az üç firma/20 snapshot pilotu tamamlanmadan scheduler veya otomatik canonical fiyat açılmaz.

## Kabul kanıtı

`src/server/routes/market-intelligence.integration.test.ts` gerçek HTTP + izole PostgreSQL akışında:

- tedarikçi submission ve kaynak hash'i oluşturmayı;
- dört onaylı baseline karşısında beşinci outlier'ı işaretlemeyi;
- şirket B'nin submission, satır ve hafızayı görememesini;
- reviewer'ın outlier'ı açıkça onaylamasını;
- approved satırın immutable price snapshot'a bağlanmasını

doğrular. `src/server/market-intelligence/price-memory.test.ts` median, yetersiz baseline ve robust outlier davranışını deterministik olarak sınar. Browser kanıtı `output/playwright/smartcheck-phase6-market-intelligence.png` altında tutulur.
