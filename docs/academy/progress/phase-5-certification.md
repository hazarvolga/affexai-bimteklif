# Phase 5 — Server-side Assessment and Certificate

**Tarih:** 21 Temmuz 2026
**Durum:** Kod ve local API doğrulaması tamamlandı; commit izni beklenmeden çalışma ağacında bırakıldı

## Uygulanan kapsam

- Sınav denemeleri kullanıcı/company/program sürümü kapsamında kalıcılaştırıldı.
- Geçme barajı sunucu tarafında `%80`, tekrar limiti 24 saatte 3 deneme olarak tanımlandı.
- Soru anahtarı authenticated istemci yanıtından çıkarıldı; yalnız soru ve seçenekler gönderiliyor.
- Sınava giriş için 27 doğrulanmış dersin ve interactive tool içeren 19 ders checkpoint'inin tamamlanması gerekiyor.
- Başarılı sınavdan sonra sertifika server-side üretiliyor.
- Sertifika; numara, program sürümü, kullanıcı ve şirket snapshot'ı ile saklanıyor.
- Aynı kullanıcı/company/program sürümü için yalnız bir sertifika üretilebiliyor.
- Public doğrulama endpoint'i yalnız credential metadata döndürüyor.
- Owner/admin sertifika iptali ve issued/revoked audit kaydı eklendi.
- Protected Academy ekranına uygunluk, sınav ve sertifika durumu eklendi.

## Veri modeli

- `allplan_exam_attempts`
- `allplan_certificates`
- `allplan_certificate_audit_logs`
- Migration: `0014_damp_dagger.sql`

## Targeted doğrulama

- Certification unit testleri: 3/3 PASS.
- Academy route runtime import: PASS.
- Academy page targeted esbuild bundle: PASS.
- Migration yalnız `localhost:5432/teklifpro_local` DB'sine uygulandı: PASS.
- Unauthenticated certification endpoint: `401`.
- Geçersiz public certificate verify isteği: `400`.
- Authenticated certification state: `200`; 5 soru, answer key leak yok.
- Eligibility tamamlanmadan attempt: `409`.

## Güven sınırı

Bu sertifika BIMPlan Academy program tamamlama kaydıdır; Allplan üreticisi veya bir mühendislik otoritesi tarafından verilmiş resmi mesleki yetki değildir. Native lab checkpoint'leri öğrenme telemetrisidir ve gerçek proje/standart onayının yerine geçmez.

## Sonraki faz

Phase 6: Academy product/edition ve enrollment/entitlement modeli; ücretsiz pilot, davetli cohort ve ücretli erişim ayrımını ödeme sağlayıcısından bağımsız kurmak.
