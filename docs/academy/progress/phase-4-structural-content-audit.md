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

### Columns kaynak hazırlığı

Resmî ALLPLAN 2026-1 yardım sayfalarıyla Columns draft review record hazırlandı. Kaynak paketi Structural Framing Column komut yolunu, palette/geometry/height/anchor ayarlarını, representation ve attributes sekmelerini, calculation mode etkisini, plane-model ilişkisini ve `IfcColumn` eşlemesini kapsar.

- Kaynak paketi: `docs/academy/content-review/evidence/columns-allplan-2026-source-pack.md`
- Draft record: `contentReviewRecords.json > p3-c1-m1`
- Kaynak paketi SHA-256: `5120e39edc052df70fdabfd8b5a18d177e319361a0d23ef29bc70b41a90b76e7`
- Güncel validator sonucu: `LOCKED`
- Kalan kesin gereksinimler:
  - Allplan 2026 workstation'dan üç yerel adım ekran görüntüsü,
  - teknik reviewer adı/rolü/tarihi,
  - reviewer kararı `approved`.

External URL, workstation ekran kanıtı olarak kabul edilmez. CLI ve audit, referenced evidence dosyasının gerçekten repo içinde bulunmasını ve source-pack hash'inin içerikle eşleşmesini ayrıca doğrular.

### Beams kaynak hazırlığı

Resmî ALLPLAN 2026-1 yardım sayfalarıyla Beams draft review record hazırlandı. Kaynak paketi Structural Framing Beam komut yolunu, yatay/eğimli construction method farkını, başlangıç/bitiş anchor noktalarını, yükseklik davranışını, geometry editing sınırlarını ve `IfcBeam` eşlemesini kapsar.

- Kaynak paketi: `docs/academy/content-review/evidence/beams-allplan-2026-source-pack.md`
- Draft record: `contentReviewRecords.json > p3-c1-m2`
- Kaynak paketi SHA-256: `1984fc963fc8e20689f3f83497e6de9ba317d3aee1efb23ee507a27bd7185f19`
- Güncel validator sonucu: `LOCKED`
- Kalan kesin gereksinimler:
  - ALLPLAN 2026 workstation'dan üç yerel adım ekran görüntüsü,
  - teknik reviewer adı/rolü/tarihi,
  - reviewer kararı `approved`,
  - review kaydıyla eşleşen ayrıntılı ders gövdesi.

Beams kaydı eksik kanıtla açılmaz; validator ve Structural audit üç screenshot ile reviewer eksikliğini ayrı nedenlerle raporlar.

### Structural walls kaynak hazırlığı

Resmî ALLPLAN 2026 yardım sayfalarıyla Structural walls draft review record hazırlandı. Kaynak paketi katman bazlı duvar geometrisini, plane-based yükseklik/offset ilişkisini, Building Structure koordinasyonunu ve `IfcWallStandardCase` / `IfcWall` ayrımını kapsar. Model geometrisi ile taşıma kapasitesi onayı özellikle ayrılmıştır.

- Kaynak paketi: `docs/academy/content-review/evidence/structural-walls-allplan-2026-source-pack.md`
- Draft record: `contentReviewRecords.json > p3-c1-m3`
- Kaynak paketi SHA-256: `febaa57f0255eaddfe08779c12da233edc43b5ae4f16ad7e4ab314bfdf2bccdc`
- Güncel validator sonucu: `LOCKED`
- Kalan kesin gereksinimler:
  - ALLPLAN 2026 workstation'dan üç yerel adım ekran görüntüsü,
  - teknik reviewer adı/rolü/tarihi ve `approved` kararı,
  - review kaydıyla eşleşen ayrıntılı ders gövdesi.

### Load-bearing structures kaynak hazırlığı

Resmî ALLPLAN 2026 yardım kaynaklarıyla Building Structure hiyerarşisi, drawing-file/plane ataması ve scoped report doğrulamasını kapsayan draft record hazırlandı. Ders sınırı model organizasyonu ve girilmiş miktarların raporlanmasıdır; yük, yük yolu, dayanım, stabilite veya yönetmelik uygunluğu iddiası içermez.

- Kaynak paketi: `docs/academy/content-review/evidence/load-bearing-structures-allplan-2026-source-pack.md`
- Draft record: `contentReviewRecords.json > p3-c2-m1`
- Kaynak paketi SHA-256: `e6ef4e2b8c8444ca053380951deb9b3f8af92dc0304681418d9521ffe7345e94`
- Güncel validator sonucu: `LOCKED`
- Kalan kesin gereksinimler: üç workstation screenshot, teknik reviewer onayı ve review ile eşleşen ayrıntılı ders gövdesi.

### Structural grids kaynak hazırlığı

Resmî ALLPLAN 2026 Axis Grid kaynaklarıyla x/y/z spacing, rotation, label/numbering, grid name, handle-based modification ve `IfcGrid` doğrulamasını kapsayan draft record hazırlandı. Grid nesnesinin geçerli olması ile taşıyıcı eleman yerleşiminin mühendislik onayı birbirinden ayrılmıştır.

- Kaynak paketi: `docs/academy/content-review/evidence/structural-grids-allplan-2026-source-pack.md`
- Draft record: `contentReviewRecords.json > p3-c2-m2`
- Kaynak paketi SHA-256: `6fd684758bac4bd88779a30ef8d8670f161eafe24edf3c2a0011880a358643a6`
- Güncel validator sonucu: `LOCKED`
- Kalan kesin gereksinimler: üç workstation screenshot, teknik reviewer onayı ve review ile eşleşen ayrıntılı ders gövdesi.

### Structural export kaynak hazırlığı

Resmî ALLPLAN 2026 IFC kaynaklarıyla schema/MVD, drawing-file ve element scope, unit/scale/offset, CFG attribute mapping ve bağımsız validation adımlarını kapsayan draft record hazırlandı. IFC dosyasının yazılması tek başına geçerli export kanıtı sayılmaz.

- Kaynak paketi: `docs/academy/content-review/evidence/structural-export-allplan-2026-source-pack.md`
- Draft record: `contentReviewRecords.json > p3-c3-m1`
- Kaynak paketi SHA-256: `fb4d62da78d5298d23aa8fa64219be04efe4632cf6247a8e83f62d5d5d174e16`
- Güncel validator sonucu: `LOCKED`
- Kalan kesin gereksinimler: üç workstation screenshot, üretilen IFC için bağımsız validation kanıtı, teknik reviewer onayı ve ayrıntılı ders gövdesi.

### FEM preparation kaynak hazırlığı

Resmî ALLPLAN AutoConverter kaynaklarıyla physical-to-analytical dönüşüm, element role/exclusion, system line, eccentricity, master plane, profile/material mapping ve target-tool diagnostics adımlarını kapsayan draft record hazırlandı. Model conversion hiçbir şekilde tamamlanmış FEM hesabı sayılmaz.

- Kaynak paketi: `docs/academy/content-review/evidence/fem-preparation-allplan-2026-source-pack.md`
- Draft record: `contentReviewRecords.json > p3-c3-m2`
- Kaynak paketi SHA-256: `57e85395c2e7e352e9b33467de2174c5e202a5fe3bbb1dcdf6b8d15bed4ee5dd`
- Güncel validator sonucu: `LOCKED`
- Kalan kesin gereksinimler: üç gerçek AutoConverter/analysis-tool screenshot, structural reviewer onayı ve ayrıntılı ders gövdesi.

## Brutal karar

Şu an Structural yolunu “hazır eğitim” diye pazarlamak yanlış olur. Kaynakta başlık var, ancak dokuz dersin dokuzunda da içerik gövdesi eksik. Parçalı diyagram, sınav sorusu ve bilgi bankası yazıları içerik üretimine başlangıç kanıtıdır; tamamlanmış müfredat değildir.

Bir sonraki alt adım: önce **Columns** modülü için gerçek Allplan ekran/işlem kanıtı, sürüm bilgisi ve teknik reviewer sağlamak; bu kanıt gelmeden kod içine uydurma ders yazmamak.
