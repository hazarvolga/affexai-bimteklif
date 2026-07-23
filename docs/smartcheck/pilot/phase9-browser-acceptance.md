# Faz 9 — Browser Acceptance ve Kullanıcı Akışı Kanıtı

## Kapsam

Bu faz sentetik pilot fixture ile gerçek tarayıcıda şu kullanıcı yolunu doğrular:

```text
giriş → SmartCheck → dosya seçimi → upload/complete → kaynak önizleme
→ MEP eşleme → worker parse/normalize/validate → insan review
→ onaylı satırları taslak teklife aktar → teklif detayı → V2 revizyon → PDF
```

Academy yalnızca ayrı bir yönlendirme/enablement katmanıdır; SmartCheck miktar veya fiyat kararının canonical kaynağı değildir.

## 23 Temmuz 2026 local kanıtı

- Fixture: `fixtures/smartcheck/pilot-v1/mep-02-electrical.csv`
- Ortam: local Vite + Express + PostgreSQL + Graphile Worker
- Storage: local adapter; production S3 kanıtı değildir
- Sonuç: kaynak önizleme 4 veri satırı, 6 kolon; parse/normalize/validate `succeeded`; 4 satır insan onayı; teklif aktarımı `4 onaylı satır`; V2 revision oluşturuldu; `PDF Dosyası → Modern İnşaat` aksiyonu blob PDF sekmesi açtı.
- Browser screenshot: `output/playwright/smartcheck-phase9-browser-review.png`
- Quote/PDF ekranı: `output/playwright/smartcheck-phase9-quote-pdf.png`
- Console sonucu: SmartCheck upload/processing smoke'unda 0 error / 0 warning; quote/PDF ekranında 0 error ve Dashboard Recharts kaynaklı iki non-blocking sizing warning.

## Production güvenlik sınırları

- Sentetik browser kanıtı gerçek müşteri dosyası, reviewer yetkinlik kaydı veya S3 admission yerine geçmez.
- Gerçek provider credentials olmadan PDF/S3 smoke production başarı sayılmaz.
- Transfer yalnızca `approved` veya gerekçeli `accepted_exception` satırlarda yapılır; aynı source row idempotency anahtarıyla ikinci kez eklenmez.
- Status polling ayrı okuma rate-limit bütçesi kullanır ve eşzamanlı istek çakışmasını engeller. Upload/review/transfer mutation bütçesiyle karışmaz.

## Tekrarlanabilir komut sırası

```bash
source .env.local
pnpm dev                       # PORT=3013 ile uygulama
pnpm smartcheck:worker         # ayrı terminalde Graphile Worker
pnpm lint
```

Sonra Playwright CLI ile `/login` üzerinden local seed kullanıcıyla oturum açılır ve yukarıdaki akış snapshot/screenshot ile kaydedilir. Gerçek müşteri dosyası kullanılırsa müşteri izni, checksum, retention ve teknik reviewer metadata'sı repo dışında güvenli pilot manifestine yazılmalıdır.
