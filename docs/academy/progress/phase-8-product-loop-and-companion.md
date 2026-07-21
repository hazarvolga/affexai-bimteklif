# Phase 8 — Product Loop and Grounded Companion

**Tarih:** 22 Temmuz 2026
**Durum:** Tamamlandı ve doğrulandı

## Kapatılan ürün açıkları

- Gerçek teklif SmartCheck bulguları artık yalnız uyarı sayısı göstermiyor; bulgu türüne göre canonical protected Allplan dersine yönlendiriyor.
- Academy ders bağlantısı teklif kimliğini güvenli `returnTo` parametresiyle taşır ve kullanıcıyı ders sonrası gerçek teklifine geri götürür.
- Geri dönüş hedefi yalnız `/app/quotes/:uuid` biçiminde kabul edilir; external, protocol-relative ve ilişkisiz internal hedefler reddedilir.
- Protected Academy çalışma alanına kaynaklı Companion eklendi.
- Companion yalnız 27 doğrulanmış dersin başlık, özet, uygulama adımı ve mühendislik notlarında extractive retrieval yapar.
- Her cevap canonical ders, bölüm ve excerpt citation taşır; yeterli eşleşme yoksa kaynak dışı cevap üretmez.
- Companion mevcut auth ve Academy entitlement sınırının arkasındadır.
- Kullanıcı başına saatlik 30 sorgu limiti PostgreSQL advisory transaction lock ile uygulanır.
- Her başarılı sorgu `ACADEMY_COMPANION_QUERY` olarak usage log'a yazılır; model çağrısı, token kullanımı ve ek maliyet sıfırdır.

## Targeted doğrulama

- Companion grounding, refusal ve stop-word testleri geçti.
- SmartCheck audit guidance mapping testleri geçti.
- Güvenli teklif geri dönüş rotası ve open redirect reddi testleri geçti.
- Targeted paket: 17/17 başarılı.
- TypeScript typecheck başarılı.

## Final doğrulama

- Full test suite: 234/234 başarılı.
- Production build: frontend ve server bundle başarılı.
- Graphify: 632 node, 720 edge ve 129 community ile güncellendi.
- Production browser QA:
  - Companion `IFC property mapping` sorusuna yalnız kaynaklı excerpt döndürdü.
  - Citation canonical `bim-basics-openbim` protected dersini açtı.
  - Geçerli teklif dönüşü `Teklife dön` bağlantısını oluşturdu.
  - External dönüş hedefi reddedildi ve Academy fallback bağlantısı korundu.
- DB kanıtı: sorgu `ACADEMY_COMPANION_QUERY | count=1 | tokens=0 | cost=0` olarak `teklifpro_local` usage log'a yazıldı.
