# SmartCheck Faz 4 — Kontrollü Resmî Kaynak İstihbaratı

**Durum:** Local pilot kapsamı tamamlandı; canlı kaynak erişimi ve lisans admission kapısı açık.

## Kapsam

Faz 4, YFK, TÜİK, GİB ve Resmî Gazete için tenant-scoped bir adaptör kayıt ve ingest sınırı ekler. Sistem doğrudan keyfi bir URL taramaz. Güvenilir bir adapter runner, yalnız allowlist içindeki HTTPS hosttan aldığı payload'ı `/api/source-intelligence/official-adapters/:adapterId/ingest` endpoint'ine gönderir.

Her ingest için şu zincir korunur:

1. Ham payload ve SHA-256 hash'i;
2. bounded parser/normalizer çıktısı;
3. önceki normalize çıktısına karşı deterministic diff;
4. advisory fiyat snapshot'ı veya mevzuat diff reviewer item'ı;
5. insan kararı ve audit log.

Aynı adaptör, doküman kimliği ve hash tekrar gönderildiğinde `runKey` idempotency ile yeni fiyat veya review item üretmez. Kaynak hash'i değişmeden eski snapshot değiştirilemez. Fiyat snapshot'ı `approved` olmadan kanonik fiyat olarak kullanılamaz; mevzuat ingest'i otomatik `rule_registry` kaydı üretmez.

## Yeni yüzeyler

- `source_intelligence_adapters`: yetkili kaynak, host, cadence, jurisdiction ve son sağlık durumu;
- `source_ingestion_runs`: fetching → parsed/diffed → awaiting_review → approved/rejected/unchanged/failed yaşam döngüsü;
- `source_ingestion_artifacts`: raw, normalized, diff ve error arşivi;
- `source_review_items`: fiyat veya mevzuat değişikliğinin reviewer kararı;
- `/app/regulations`: canlı olmayan statik “LIVE” iddiaları yerine kaynak hash'i, son başarı ve reviewer kuyruğu.
- Legacy mevzuat alert akışı da `companyId` ile tenant-scoped hale getirildi; şirket A'nın advisory kaydı şirket B'ye dönmez.

## Bilinçli sınırlar

- YFK/TÜİK/GİB/Resmî Gazete için gerçek crawler, credential veya lisans bu fazda eklenmedi.
- Kanun metni veya Google/DOCX içeriği canonical kural olarak içeri alınmaz.
- Endeks, piyasa fiyatı olarak etiketlenmez; kaynak türü ve snapshot provenance korunur.
- Adapter runner S3'e doğrudan yazmaz; mevcut local pilotta artifact payload'ı DB JSON olarak tutulur. Production admission için S3-compatible storage, retention ve erişim politikası ayrıca doğrulanmalıdır.

## Kabul kanıtı

`src/server/routes/source-intelligence.integration.test.ts` şu akışı gerçek HTTP + PostgreSQL ile doğrular:

- şirket A adaptör oluşturur ve YFK payload'ı ingest eder;
- raw/normalized/diff ve advisory snapshot/reviewer item oluşur;
- aynı payload idempotent döner;
- şirket B adapter ve review queue erişemez;
- snapshot reviewer onayıyla approved olur;
- Resmî Gazete diff'i reviewer onayı alır fakat canonical rule üretmez;
- health endpoint'i son durumu `healthy` gösterir.

Bu test sentetik payload kullanır; gerçek müşteri izni, teknik reviewer kaydı, kaynak kullanım lisansı ve production S3 credentials yerine geçmez.
