# Allplan Rebaseline — Faz 2 İlerleme Raporu

Tarih: 21 Temmuz 2026  
Durum: TAMAMLANDI

## Tamamlanan işler

- Protected Allplan ana ekranı artık ders kartı listesiyle sınırlı değil.
- Kaynak curriculum ağacı authenticated API’den yükleniyor.
- 10 gerçek öğrenme yolu, 37 kurs ve 114 modül korunarak gösteriliyor.
- 27 ayrıntılı ders `OPEN` statüsünde açılıyor.
- 87 modül `LOCKED / İçerik hazırlanıyor` statüsünde tutuluyor.
- Path → course → module hiyerarşisi açılır kapanır ağaç olarak eklendi.
- Müfredat araması eklendi.
- “Yalnızca açık dersler” filtresi eklendi.
- Tamamlanan dersler curriculum ağacında `DONE` olarak işaretleniyor.
- Kaynak inventory script’indeki path sayım hatası düzeltildi: interface satırı artık gerçek path olarak sayılmıyor.

## Doğrulanmış gerçek sayılar

| Veri | Sonuç |
|---|---:|
| Öğrenme yolu | 10 |
| Kurs | 37 |
| Modül | 114 |
| Ayrıntılı ders | 27 |
| İnceleme bekleyen modül | 87 |
| Kapsama | %24 |

## Authenticated smoke

- Login: `200`.
- Curriculum API: `200`.
- API response: 10 path, 37 course, 114 module, 27 detailed, 87 review.
- Unauthenticated API koruması Faz 1’de `401` olarak doğrulandı.

## Testler

- `npm run lint`: PASS.
- `npm run build`: PASS.
- `node scripts/allplan-source-inventory.mjs`: beklenen `REVIEW_REQUIRED`, gerçek sayılar doğrulandı.
- `npm run academy:parity`: PASS.
- `git diff --check`: PASS.

## Açık riskler

- Ders notları, bookmark, çalışma süresi ve checkpoint sistemi henüz yok.
- Kaynakta bulunan 87 modül için içerik üretim süreci henüz yok.
- Sınav ve server-side sertifika henüz yok.
- Ücretli erişim/entitlement henüz yok.

## Sonraki faz

Faz 3: ders deneyimini ilerleme, not, bookmark, çalışma süresi ve native laboratuvar checkpoint’leriyle tamamlamak.
