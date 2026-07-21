# Phase 4A — Structural Content Audit

**Tarih:** 21 Temmuz 2026
**Durum:** Audit tamamlandı; içerik üretimi kilitli olarak devam ediyor
**Kapsam:** `allplanAkademi-main` → `p3` Allplan Structural Engineering

## Sonuç

Kaynak müfredatta Structural Engineering yolu 9 modülden oluşuyor. Bu 9 modülün hiçbirinin `src/data/lessonsContent.ts` içinde gerçek ders gövdesi yok. Bu yüzden Structural yolunun public veya authenticated ders viewer’ında açılması için yeterli içerik kanıtı bulunmuyor.

| Kurs | Kaynak modüller | Detaylı ders gövdesi | Karar |
|---|---:|---:|---|
| Structural Modeling | 3 | 0 | Locked |
| Structural Systems | 2 | 0 | Locked |
| Analysis Preparation | 2 | 0 | Locked |
| Detailing | 2 | 0 | Locked |
| **Toplam** | **9** | **0** | **Locked** |

## Kaynakta bulunan ancak ders yerine geçmeyen kanıtlar

Kaynak component’lerinde aşağıdaki parçalı varlıklar bulundu:

- Automated Reinforcement Workflows bilgi bankası yazısı
- Custom Bending Schedules bilgi bankası yazısı
- IFC4 Export for Scia Engineer bilgi bankası yazısı
- Beam design section diyagramı
- Reinforcement modeling standards sınav sorusu

Bunlar değerli referans parçalarıdır; fakat tek başına doğrulanmış Structural dersi değildir. Eksik olanlar:

- modül öğrenme hedefi ve ön koşulu,
- Allplan sürüm/arayüz bağlamı,
- tam adım adım uygulama,
- çalıştırılabilir çıktı veya ekran kanıtı,
- standart ve kaynak referansı,
- mühendislik sınırı,
- checkpoint ve değerlendirme sorusu,
- içerik sahibi ve teknik review tarihi.

## Üretim sırası

1. **Columns / Beams / Structural walls:** fiziksel modelleme ve doğru Building Structure bağlamı.
2. **Load-bearing structures / Structural grids:** taşıyıcı sistem ve referans grid ilişkisi.
3. **Structural export / FEM preparation:** analytical/physical model ayrımı ve export öncesi veri kontrolü.
4. **Structural drawings / Sections:** çıktı, kesit, pafta ve model-doküman tutarlılığı.

## Açma kriteri

Bir modül aşağıdaki kanıtların tamamı olmadan `verified` veya `available` yapılamaz:

1. Kaynak dosyaya bağlı `sourceId`.
2. Öğrenme hedefleri ve ön koşullar.
3. Allplan sürümü ve arayüz bağlamı.
4. En az üç doğrulanabilir uygulama adımı.
5. Öğrencinin üreteceği somut çıktı.
6. İlgili standart/referans ve sürüm/tarih bilgisi.
7. Teknik reviewer ve review tarihi.
8. Checkpoint + ölçülebilir değerlendirme.
9. `non-authoritative` mühendislik uyarısı.

`npm run allplan:structural-audit` bu kararı otomatik üretir. Audit `LOCKED` döndüğü sürece UI’da yeni Structural ders açılmamalıdır.

## Runtime release gate güncellemesi

22 Temmuz 2026 itibarıyla bu kural yalnız dokümantasyon/audit kararı değildir:

- `src/academy/allplan/releaseGate.ts` review sözleşmesini runtime'da doğrular.
- Structural kaynak kimlikleri `contentReviewRecords.json` içinde allowlist olarak tutulur.
- Kaynak uygulamaya ayrıntılı ders gövdesi eklense bile onaylı review record yoksa `track.ts` dersi API/UI'a açmaz.
- Review record; öğrenme hedefi, ön koşul, Allplan sürümü, interface bağlamı, en az üç adım kanıtı, somut çıktı, tarihli referans, reviewer, checkpoint, değerlendirme, mühendislik uyarısı ve SHA-256 evidence hash olmadan onaylanmaz.
- Columns başlangıç şablonu: `docs/academy/content-review/columns.review.template.json`.
- Reviewer kaydı doğrulama komutu: `npm run allplan:review-validate -- <review-record.json>`.

Yerel `4708.pdf` dosyası metadata, metin ve sayfa renderı ile incelendi. Dosya Allplan Structural kullanım kanıtı değil, 2015 tarihli bir 4708 Sayılı Yapı Denetim Kanunu kopyasıdır; Columns release evidence olarak reddedildi ve kaynak kaydına eklenmedi.

## Brutal karar

Şu an Structural yolunu “hazır eğitim” diye pazarlamak yanlış olur. Kaynakta başlık var, ancak dokuz dersin dokuzunda da içerik gövdesi eksik. Parçalı diyagram, sınav sorusu ve bilgi bankası yazıları içerik üretimine başlangıç kanıtıdır; tamamlanmış müfredat değildir.

Bir sonraki alt adım: önce **Columns** modülü için gerçek Allplan ekran/işlem kanıtı, sürüm bilgisi ve teknik reviewer sağlamak; bu kanıt gelmeden kod içine uydurma ders yazmamak.
