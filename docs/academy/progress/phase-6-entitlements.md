# Phase 6 — Academy Product and Entitlements

**Tarih:** 21 Temmuz 2026
**Durum:** Kod ve local API doğrulaması tamamlandı; ödeme sağlayıcısı bilinçli olarak bağlanmadı

## Uygulanan kapsam

- Academy ürünü, edition ve enrollment erişimi ayrı veri modellerine taşındı.
- `allplan-pro / 2026.1` ücretsiz pilot edition oluşturuldu.
- Mevcut membership kayıtları migration sırasında aktif pilot enrollment ile geri dolduruldu; mevcut kullanıcı erişimi kırılmadı.
- Allplan curriculum, lesson, activity, progress, exam ve certificate yönetim API'leri aktif entitlement olmadan `403` döndürür.
- Entitlement bulunmayan kullanıcı boş curriculum yerine açık bir eğitim erişimi ekranı görür.
- Erişim; aktif ürün, aktif edition, enrollment statüsü, başlangıç ve bitiş zamanı üzerinden sunucu tarafında kontrol edilir.
- Enrollment kaynağı `pilot`, `invite`, `purchase` veya `admin`; statüsü `active`, `expired`, `refunded` veya `revoked` olabilir.
- Protected Academy ekranı BIMPlan SaaS hesabı ile Allplan eğitim edition erişiminin ayrı olduğunu gösterir.
- Stripe veya başka ödeme sağlayıcısı eklenmedi; `purchase` enrollment ileride webhook tarafından üretilebilir.

## Veri modeli

- `academy_products`
- `academy_editions`
- `academy_enrollments`
- Migration: `0015_lame_songbird.sql`

## Targeted doğrulama

- Entitlement validity unit testi: PASS.
- Certification + entitlement targeted suite: 4/4 PASS.
- Migration yalnız `localhost:5432/teklifpro_local` DB'sine uygulandı: PASS.
- Auth'suz entitlement isteği: `401`.
- Pilot enrollment ile entitlement: `200`, `free_pilot / 2026.1`.
- Entitlement sonrası curriculum: `200`, 10 path.
- Entitlement sonrası certification state: `200`, 5 soru.

## Politika sınırı

İade veya erişim bitişi yeni ders erişimini kapatabilir. Daha önce verilmiş sertifikanın geçerliliği ayrı revoke/expire politikasıyla yönetilir; enrollment iptali sertifikayı sessizce silmez.

## Sonraki adım

Sekiz adımlı görevin kod fazları tamamlandıktan sonra final doğrulamalar tek sefer ve sırayla çalıştırılmalıdır.
