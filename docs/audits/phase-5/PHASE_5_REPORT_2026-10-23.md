# Faz 5 — Güvenli Çıktı ve İnceleme Raporu

**Tarih:** 23 Ekim 2026
**Sürüm:** Rev. 45 · `BIM-CALC-2026-10-23.39`
**Karar:** **KISMİ / FAZ KAPANMADI**

Bu rapor kod ve otomatik test kanıtını kaydeder. Bağımsız mühendis, belge/PKI uzmanı veya gerçek saha kabulü yerine geçmez. Faz 5'in T30, T31, T33 ve T34 dilimleri kod tarafında tamamlandı; T32 gerçek doğrulayıcı çalışma ortamı ve lisanslı dönüşüm sağlayıcısı bulunmadığı için NO-GO olarak açıktır.

## Görev durumu

| Görev | Durum | Kod kanıtı | Kalan kabul |
|---|---|---|---|
| T30 — CSV/XLSX güvenliği | Tamamlandı | Ortak serializer/parser formül benzeri metni nötralize eder; delimiter, quote, CR/LF, Unicode ve malformed quote senaryoları testlidir. Firma gerçek maliyet CSV'si ancak sürümlü sahiplik beyanıyla `company_actual` olur; sunucu aktör/zaman kanıtını kendisi ekler. Tedarikçi teklifi kendini yetkilendiremez. Gerçek LibreOffice CSV→XLSX açma testinde formül yürütülmedi, gerçek sayısal hücre tipi korundu. | Yeni dışa aktarım yüzeylerinin aynı ortak modülü kullanmayı sürdürdüğünün regresyon kontrolü. |
| T31 — PDF imza ön kontrolü | Kod kapsamı tamamlandı | Tüm sayfalar ile nested AcroForm/Kids ağı derinlik 32, nesne 10.000 ve sayfa 500 sınırlarıyla, döngü korumalı taranır. `absent`, `empty`, `signed`, `malformed`, `indeterminate` ayrıdır. | Ürün gerçek imza geçerliliği iddia edecekse kriptografik doğrulama, sertifika güven zinciri, iptal ve zaman damgası kontrolü ile PKI/5070 uzman kabulü gerekir. |
| T32 — Gerçek PDF/A akışı | **Kısmi / NO-GO** | veraPDF XML rapor ayrıştırma ve çalıştırıcı sözleşmesi; resmî `0=uygun`, `1=uygunsuz` çıkışları XML özetiyle çapraz doğrulanır, çelişkiler kapanır; kaynak SHA-256/lineage taşıyan ayrı `verapdf_validation` artifact'ı vardır. CLI yoksa `unavailable` ve `isCompliant=null`; asıl dosyanın üzerine yazılmaz. | Gerçek veraPDF CLI runtime kurulumu; izinli font/renk/ek/çok sayfa/imzalı dosya matrisi; lisansı doğrulanmış dönüşüm sağlayıcısı ve dönüşüm sonrası imza politikasının kabulü. |
| T33 — 3B IFC inceleme | Pilot tamamlandı | Self-hosted `web-ifc` WASM, kaynak SHA-256 kontrolü, `fileSha256:runId:#stepId` elementKey, duplicate GlobalId güvenli seçim, vurgulama/gizleme/izolasyon/reset ve dosya/bellek/üçgen/mesh sınırları. buildingSMART izinli fixture ile tarayıcı smoke testi geçti. | Büyük ve izinli gerçek vendor IFC dosyalarında ana iş parçacığı gecikmesi/RAM kabulü; gerekirse Web Worker/OffscreenCanvas. İsimli mühendis doğru eleman-seçim kabulü. |
| T34 — İcmal→kalıcı teklif | Tamamlandı | Sunucu Calm projeksiyonunu aynı kuralla yeniden kurar; kanonik satır ve doğrulanmış fiyat yetkisini kullanır. Yalnız `vatStatus=excluded` ve açık KDV oranı kabul edilir. Mevcut teklife immutable ardıl revizyon, actor+tenant idempotency, seri çapı semantik tekrar engeli ve kaynak-satır junction lineage'ı transaction içinde yazılır; ikinci kaynak aktarımında önceki aggregate kanıtı aynı seri ve tam satır kümesiyle yeniden doğrulanarak taşınır. | Pilot ofiste poz gruplaması, onay sırası ve gerçek teklif revizyonu iş pratiği kabulü. Bu dilim yeni boş teklif oluşturmaz; mevcut güncel teklif gerektirir. |

## Uygulanan sınırlar

- PDF içinde `/Sig` veya yapısal `signed` bulgusu güvenli elektronik imza geçerliliği sayılmaz.
- XMP `pdfaid` kimliği PDF/A uygunluğu sayılmaz. Harici validator çalışmadıysa PASS üretilmez.
- Lisanslı dönüşüm sağlayıcısı seçilmediği için PDF/A dönüşümü kapalıdır.
- 3B görüntüleyici inceleme aracıdır; render geometrisi metraj veya fiyat kaynağı değildir.
- Calm aktarımı istemcinin gönderdiği miktar ve fiyatı otorite kabul etmez; sunucu kanıt ve fiyat yetkisini yeniden çözer.
- Otomatik test ve kod incelemesi bağımsız mühendis veya mevzuat uygunluk onayı değildir.

## Doğrulama özeti

- İzole PostgreSQL ile tam TypeScript paketi: **1.273 geçti, 0 hata, 6 koşullu skip**. Skip'lerden biri bu ortamda gerçek veraPDF CLI bulunmamasıdır.
- Faz 5 odaklı son bağımsız inceleme: **CRITICAL 0 / HIGH 0 / MEDIUM 0 — GO**.
- PDF preflight Python testleri: **12/12 geçti**.
- T30 gerçek LibreOffice açma testi: formül enjeksiyonu çalışmadı; `-5` sayısal hücre olarak kaldı.
- T33 izinli buildingSMART IFC fixture tarayıcı smoke testi: WebGL canvas açıldı ve kaynak dosya işlendi.
- T34 servis/route, ardışık iki farklı kaynak belgesinin aynı teklif serisine aktarımı, KDV semantiği, PostgreSQL entegrasyon, fiyat yetkisi, artifact ve release migration doğrulamaları geçti; migration yaşam döngüsünde yalnız ortamda `pg_dump` aracı bulunmamasına bağlı açık skip vardır.
- Production build ve üretim bağımlılığı güvenlik taraması geçti; büyük lazy IFC viewer chunk'ı geniş saha öncesi Web Worker/OffscreenCanvas performans kabulini gerekli kılar.
- TypeScript `tsc --noEmit` ve `git diff --check` geçti.
- Yol haritası içerik testi: **4/4 geçti** (`pnpm exec tsx --test src/pages/admin/roadmap/content.test.ts`).

## Bağımsız uzmana kalan asgari çalışma

1. **PDF/A ve belge güveni:** Gerçek veraPDF runtime'ını sabitleyip izinli font/renk/ek/çok sayfa/imzalı PDF setini çalıştırmak; dönüşüm ürünü ve lisansını yazılı olarak kabul etmek; dönüşüm sonrası imza kaybı/yeniden imza politikasını onaylamak.
2. **E-imza/PKI:** Ürün “geçerli imza” diyecekse güven zinciri, iptal, zaman damgası ve 5070 kapsamını nitelikli e-imza uzmanıyla kabul etmek.
3. **IFC saha pilotu:** İzinli ALLPLAN/Revit/Archicad/Tekla gerçek proje setinde doğru satır–nesne eşleşmesi, duplicate GlobalId, koordinat ve büyük model performansını ölçüp isimli STR/ARC/MEP mühendis kabulünü vermek.
4. **Teklif iş pratiği:** Gerçek tenant teklifinde ardıl revizyon, poz gruplaması, fiyat yetkisi ve onay hiyerarşisini maliyet/teknik ofis uzmanıyla kabul etmek.

Bu dört başlık tamamlanmadan Faz 5 “kapalı”, PDF/A dönüşümü “hazır”, e-imza “geçerli” veya 3B inceleme “üretim ölçeğinde kabul edilmiş” olarak sunulamaz.

## Resmî/üretici teknik kaynakları

- veraPDF CLI validation: <https://docs.verapdf.org/cli/validation/>
- veraPDF CLI configuration: <https://docs.verapdf.org/cli/config/>
- veraPDF proje ve lisans bilgisi: <https://verapdf.org/home/>
- Ghostscript lisans SSS: <https://ghostscript.com/faq/>
- web-ifc dokümantasyonu: <https://thatopen.github.io/engine_web-ifc/docs/>
- Three.js kaynak serbest bırakma rehberi: <https://threejs.org/manual/pages/how-to-dispose-of-objects.html>

## Başlıca kod ve kanıt yüzeyleri

- `src/lib/tabular-data.ts`
- `workers/ifc/pdf_preflight.py`
- `src/smartcheck/pdf/verapdf-report.ts`
- `src/smartcheck/pdf/verapdf-runner.ts`
- `src/ifc/viewer/`
- `src/components/smartcheck/viewer/`
- `src/services/quotations/calm-transfer.ts`
- `src/server/routes/smartcheck.ts`
- `drizzle-release/0011_quotation_transfer_ledger.sql`
