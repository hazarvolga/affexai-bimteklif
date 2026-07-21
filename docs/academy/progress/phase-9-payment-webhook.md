# Phase 9 — Verified Purchase Enrollment Webhook

**Tarih:** 22 Temmuz 2026
**Durum:** Tamamlandı ve doğrulandı

## Amaç

Ödeme sağlayıcısını Academy domain modeline doğrudan bağlamadan önce, Stripe/n8n veya başka bir ödeme adaptörünün doğrulanmış satın alma ve iade olaylarını güvenle iletebileceği provider-neutral sınırı kurmak.

## Güvenlik ve veri sözleşmesi

- Endpoint: `POST /api/academy/allplan/webhooks/payment`
- Zorunlu secret: `ACADEMY_PAYMENT_WEBHOOK_SECRET`
- İmza header'ı: `x-academy-signature: t=<unix>,v1=<sha256>`
- İmzalanan veri: `<unix>.<raw-request-body>`
- Algoritma: HMAC-SHA256
- Replay penceresi: en fazla 5 dakika
- Body limiti: 1 MB
- Event türleri:
  - `academy.purchase.completed`
  - `academy.purchase.refunded`
- Zorunlu tenant üyeliği: `companyId + userId`
- Provider ve event kimliği birlikte idempotency anahtarıdır.
- Provider + payment reference + event type semantik idempotency anahtarıdır; farklı event ID aynı ödeme işlemini ikinci kez uygulayamaz.
- Refund ancak aynı provider, payment reference, company ve user için daha önce işlenmiş bir `academy.purchase.completed` olayı varsa kabul edilir.
- Transaction advisory lock aynı event'in yarış koşulunda iki kez işlenmesini engeller.

## Kalıcı kayıt

- Yeni `academy_payment_events` tablosu provider event'i, tenant, kullanıcı, enrollment, ödeme referansı ve payload SHA-256 hash'ini saklar.
- Satın alma aktif `source=purchase` enrollment oluşturur veya mevcut enrollment'ı güvenli biçimde paid erişime dönüştürür.
- İade yalnız `source=purchase` enrollment üzerinde çalışır ve statüyü `refunded` yapar.
- Enrollment audit log otomatik `granted`, `extended`, `reactivated` veya `refunded` kaydı üretir.
- `source=purchase` entitlement UI/API tarafında `accessMode=paid` olarak gösterilir; content edition sürümü değişmez.

## Targeted ve canlı doğrulama

- HMAC, timestamp ve payload contract testleri: 2/2 başarılı.
- TypeScript typecheck başarılı.
- Migration `0020_lush_shiver_man.sql` yalnız `localhost:5432/teklifpro_local` üzerinde uygulandı.
- Migration `0021_steep_masque.sql` semantik payment-reference idempotency constraint'ini aynı izole DB üzerinde uyguladı.
- Canlı API smoke:
  - yanlış secret: `401`
  - purchase completed: `201`
  - aynı event tekrar: `200`, `duplicate=true`
  - refund: `200`, status `refunded`
- DB kanıtı: `purchase | refunded | 2 event | granted,refunded`.
- Semantik idempotency smoke:
  - purchase olmadan refund: `409 PAYMENT_REFERENCE_NOT_FOUND`
  - aynı payment reference ile farklı purchase event ID: `200 duplicate=true`
  - aynı payment reference ile farklı refund event ID: `200 duplicate=true`
  - DB sonucu yine yalnız `2 event | granted,refunded`.
- Smoke için oluşturulan geçici company, user, membership, enrollment, audit ve payment event kayıtları doğrulama sonrasında transaction ile silindi.
- Full test suite: 236/236 başarılı.
- Final TypeScript typecheck başarılı.
- Production frontend/server build başarılı.
- Graphify: 636 node, 722 edge ve 131 community ile güncellendi.

## Sağlayıcı bağlantı sınırı

Bu faz gerçek ödeme sağlayıcısında ürün/fiyat/checkout oluşturmaz. Stripe veya n8n adaptörü yalnız ödeme gerçekten başarılı olduktan sonra bu imzalı olayı üretmelidir. Secret ve provider yapılandırması environment bazında ayrılmalıdır.
