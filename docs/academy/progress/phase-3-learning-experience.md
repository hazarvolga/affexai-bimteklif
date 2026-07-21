# Phase 3 — Protected Learning Experience

**Tarih:** 21 Temmuz 2026
**Durum:** Tamamlandı ve local doğrulandı
**Commit:** `feat(academy): add protected Allplan learning activity`

## Amaç

Allplan eğitimini yalnızca statik ders okuma ekranı olmaktan çıkarıp kayıtlı kullanıcı hesabına bağlı bir öğrenme deneyimine taşımak:

- çalışma süresini kullanıcı/company kapsamında saklamak,
- ders notlarını oluşturmak ve silmek,
- bookmark durumunu kalıcılaştırmak,
- etkileşimli laboratuvarları ders checkpoint’lerine bağlamak,
- ders gövdesini hâlâ yalnızca authenticated API üzerinden sunmak.

## Uygulanan kapsam

### Kalıcı veri modeli

- `allplan_lesson_activity`
  - `activeSeconds`
  - `lastViewedAt`
  - user/company/lesson unique scope
- `allplan_lesson_notes`
  - 5.000 karakter sınırı
  - kullanıcı/company/lesson izolasyonu
  - kullanıcı notu silme
- `allplan_lesson_bookmarks`
  - user/company/lesson unique scope
- `allplan_lesson_progress.checkpointCompletedAt`
  - etkileşimli laboratuvar checkpoint kaydı

Migration’lar:

- `0012_remarkable_doomsday.sql`
- `0013_absurd_reptil.sql`

### Authenticated API

- `GET /api/academy/allplan/lessons/:lessonSlug/activity`
- `POST /api/academy/allplan/lessons/:lessonSlug/notes`
- `DELETE /api/academy/allplan/lessons/:lessonSlug/notes/:noteId`
- `PUT /api/academy/allplan/lessons/:lessonSlug/bookmark`
- `PUT /api/academy/allplan/lessons/:lessonSlug/time`
- `POST /api/academy/allplan/lessons/:lessonSlug/checkpoint`

Tüm endpoint’ler authentication arkasındadır ve ders slug’ı gerçek detaylı kaynak dersine karşı doğrulanır. Sahte slug ile manuel ilerleme kaydı artık kabul edilmez.

### Native interactive labs

- `CoordinateCalculator`
- `ShortcutTrainer`
- mevcut `WallIntersectionSimulator`
- mevcut `ReinforcementEstimator`

Laboratuvar çıktıları kullanıcıya mühendislik kararı gibi sunulmaz; mevcut non-authoritative demo uyarıları korunur. Checkpoint, bu fazda öğrenme ilerlemesi içindir; sertifika güveni anlamına gelmez.

## Doğrulama kanıtı

- `npm run lint` — geçti
- `npm run build` — geçti
- `npm test` — mevcut test paketi geçti
- `npm run allplan:inventory` — `10 / 37 / 114`, detaylı `27`, review `87`, coverage `%24`
- `npm run academy:parity` — `13/13` section, `18/18` handler mapped, `PASS`
- authenticated API smoke:
  - activity `200`
  - checkpoint `200`
  - note create `201`
  - note delete `204`
  - bookmark on/off `200`
  - study time `200`
  - invalid lesson progress `400`
  - unauthenticated curriculum `401`
- production client bundle leak check — kaynak ders ifadeleri `NOT_FOUND`
- local server: `http://127.0.0.1:3000/` aktif, son production bundle ile çalışıyor.

## Brutal durum değerlendirmesi

Bu faz öğrenme operasyonunu ürünleştirdi; ancak Allplan müfredatının içerik açığı kapanmış değildir. Gerçek kaynakta 114 modülün yalnızca 27’si ayrıntılı ders gövdesine sahiptir. Bu nedenle 87 modül review/locked kalmalıdır.

Checkpoint endpoint’i bu fazda ilerleme telemetrisi olarak tasarlanmıştır. Kullanıcı endpoint’i doğrudan çağırarak bu kaydı teknik olarak taklit edebilir. Bu açık, sertifika veya ücretli eğitim doğrulaması için kabul edilemez; Phase 5’te server-side sınav, puan, deneme ve sertifika uygunluk kurallarıyla yeniden tasarlanmalıdır.

## Sonraki faz

**Phase 4 — Content production and Structural path:** önce Structural yolunun 87 eksik modül içindeki öncelikli derslerini üretim kalitesinde tamamlamak, kaynak id/parite denetimini sürdürmek ve locked durumunu yalnızca doğrulanmış derslerde kaldırmak.
