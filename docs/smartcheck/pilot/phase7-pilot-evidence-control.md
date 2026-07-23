# SmartCheck Faz 7 — Pilot Evidence Control

**Durum:** Local pilot ölçüm katmanı tamamlandı; gerçek müşteri dosyası, teknik reviewer ve production S3 admission kanıtları bekleniyor.

## Amaç

Gerçek pilot dosyalarını yalnızca “yüklenmiş” olarak değil, izin, retention, parse sonucu, reviewer kararı, aktarım ve provenance metrikleriyle ölçülebilir case olarak kaydetmek.

Academy kullanıcı edinimi ve ders ilerlemesi bu case’lerden ayrı kalır. Pilot kanıtı, teklif/maliyet karar katmanının operasyonel ölçümüdür; ders içeriği canonical fiyat veya mühendislik kuralı üretmez.

## Veri modeli

- `smartcheck_pilot_cases`: şirket, doküman, pilot kimliği, müşteri/proje referansı, izin referansı, izin/retention tarihleri, reviewer kararı ve workflow durumu;
- `smartcheck_pilot_measurements`: processing run’a bağlı append-only ölçüm snapshot’ı;
- müşteri adı yerine kontrollü referans saklanır, ham izin dokümanı veya secret DB’ye yazılmaz.

## Ölçülen KPI’lar

- `parseRate`: normalize edilebilir satır / toplam satır;
- `manualReentryFreeRate`: parse edilen satırdan manuel düzeltme gerektirmeyen bölüm;
- `provenanceCoverage`: aktarılan satırlardan document/run/row/cell kaynağı eksiksiz olan bölüm;
- bulgu, onaylı, aktarılan satır sayıları;
- processing ve kullanıcı workflow süreleri.

Yüzdeler dosya bazında ortalanmaz; `/api/smartcheck/pilot-metrics` toplam satır üzerinden ağırlıklı olarak hesaplar. Böylece küçük dosya büyük dosyayı yanlış biçimde domine etmez.

## API

- `POST /api/smartcheck/pilot-cases` — tamamlanmış ve checksum’ı doğrulanmış dokümanı izin/retention kanıtıyla case’e alır;
- `GET /api/smartcheck/pilot-cases` ve `GET /api/smartcheck/pilot-cases/:id` — tenant-scoped case ve ölçüm geçmişi;
- `POST /api/smartcheck/pilot-cases/:id/measure` — idempotent ölçüm snapshot’ı;
- `PATCH /api/smartcheck/pilot-cases/:id/review` — reviewer kararı ve gerekçe;
- `GET /api/smartcheck/pilot-metrics` — beş dosya, parse, yeniden giriş ve provenance kapıları.

Tüm endpoint’lerde membership, rol, rate-limit, feature flag ve audit log vardır. KPI paneli S3 encryption, lisans veya reviewer yetkinliğini otomatik “geçti” saymaz; bunlar dış admission manifesti olarak kalır.

## Kabul kanıtı

`src/server/routes/pilot-evidence.integration.test.ts` gerçek HTTP + PostgreSQL ile:

- case oluşturma ve duplicate engelini;
- şirket B’nin case/metric görememesini;
- parse, finding, approved row ve süre hesaplarını;
- aynı measurement key’in idempotent kalmasını;
- measurement olmadan reviewer kararının engellenmesini;
- reviewer kararının audit ve status’a yansımasını

doğrular. `/app/pilot-evidence` ekranı KPI kapılarını ve hassas müşteri verisi yerine kontrollü referansları gösterir.

## Sonraki kapı

Beş izinli MEP dosyasının her biri case olarak açılmalı; her dosyada gerçek checksum, izin/retention referansı, teknik reviewer ve upload → parse → review → transfer ölçümü bulunmalı. `parseRate` ve `manualReentryFreeRate` `%90` altındaysa IFC/PDF computer vision veya NestJS/Next.js route cutover başlatılmamalıdır.
