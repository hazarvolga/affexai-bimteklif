# Allplan Rebaseline — Faz 0 İlerleme Raporu

Tarih: 21 Temmuz 2026  
Durum: TAMAMLANDI  
Commit: Bu rapor Faz 0 dokümantasyon commit’i ile birlikte kaydedilecek.

## Tamamlanan işler

- Kaynak `allplanAkademi-main` yeniden envanterlendi.
- 10 path, 37 course, 114 module, 27 ayrıntılı ders ve %24 coverage doğrulandı.
- 4 interaktif araç, 24 source component ve kaynak persistence riskleri kaydedildi.
- Public/protected/internal erişim kararı netleştirildi.
- Üyelikli curriculum, native lab, içerik üretim, sertifika ve entitlement fazları tanımlandı.
- Public yapının ürün kararıyla çeliştiği kayıt altına alındı.

## Kritik bulgu

`/academy/allplan/structural` uyarısı kaynakta Structural Engineering altında ayrıntılı lesson body bulunmamasından kaynaklanıyor. Bu yol public olmamalı; içerik tamamlanana kadar protected curriculum içinde `İçerik hazırlanıyor` olarak tutulmalı.

## Değişiklik sınırı

Bu fazda çalışma kodu değiştirilmedi. Yalnızca ürün kararı, GAP analizi, faz planı ve çıkış kriterleri dokümante edildi.

## Doğrulama

- `node scripts/allplan-source-inventory.mjs`: PASS, `REVIEW_REQUIRED` riskleri beklenen ve belgelenmiş.
- Kaynak Firebase/auth riskleri doğrudan taşınmayacak.
- Faz 1 başlangıç koşulu: public Allplan ders rotalarını kapatmak.

## Sonraki adım

Faz 1: public Allplan lesson/path erişimini kaldırmak, login kapısı ve protected curriculum girişini kurmak.
