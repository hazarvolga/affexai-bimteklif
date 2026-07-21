# Allplan Rebaseline — Faz 1 İlerleme Raporu

Tarih: 21 Temmuz 2026  
Durum: TAMAMLANDI

## Tamamlanan işler

- Public `/academy/allplan`, `/academy/allplan/:pathSlug` ve `/academy/allplan/lesson/:lessonSlug` rotaları ders yayınlamayan erişim kapısına alındı.
- Allplan erişim kapısı `noindex,nofollow` metadata kullanıyor.
- Login ve register akışına güvenli `/app/academy/allplan` dönüşü eklendi.
- Public Academy Allplan kartı “Kayıtlı kullanıcı alanı” olarak yeniden konumlandırıldı.
- Eski public Allplan track/path/lesson sayfaları kaldırıldı.
- Protected curriculum ve lesson verisi authenticated API’ye taşındı.
- Client bundle’dan Allplan ders gövdeleri çıkarıldı.
- `/api/academy/allplan/curriculum` protected hale getirildi.
- `/api/academy/allplan/lessons/:lessonSlug` protected hale getirildi.
- Protected Allplan ekranı 10/37/114 curriculum metriklerini ve 27 ayrıntılı dersi API’den alıyor.
- 87 eksik modül protected alanda dürüstçe kilitli/eksik kapsam olarak korunuyor.

## Güvenlik doğrulaması

- Production client bundle içinde `Software overview`, `Standard hooks & bends` ve `BIM basics` ders metni bulunmadı.
- Unauthenticated `/api/academy/allplan/curriculum`: `401 Unauthorized`.
- Unauthenticated `/api/academy/allplan/lessons/software-overview`: `401 Unauthorized`.
- `/api/health`: `200`, database connected.

## Testler

- `npm run lint`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- `node scripts/allplan-source-inventory.mjs`: PASS / beklenen `REVIEW_REQUIRED` riskleri raporlandı.
- `npm run academy:parity`: PASS.

## Açık ve sonraki risk

- Login yapılmış browser ile curriculum → lesson → progress akışının gerçek kullanıcı smoke testi Faz 2’nin ilk kontrolüdür.
- Not, bookmark, çalışma süresi, sınav ve sertifika henüz uygulanmadı.
- Ödeme/entitlement henüz uygulanmadı.

## Sonraki faz

Faz 2: protected curriculum workspace’i tam kaynak ağacıyla (10 path, 37 course, 114 module) göstermek; statü, kilit, arama ve yol bazlı ilerlemeyi tamamlamak.
