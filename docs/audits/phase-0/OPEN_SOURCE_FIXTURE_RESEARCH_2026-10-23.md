# Açık lisanslı teknik fixture araştırması

**Tarih:** 23 Ekim 2026
**Amaç:** Bağımsız uzman ve vendor kabulünün yerine geçmeden, uzmanların
inceleyeceği teknik vaka setini genişletmek ve mevcut motor davranışını
tekrarlanabilir biçimde kaydetmek.

## Kaynak ve lisans sonucu

buildingSMART International'ın `Certification-datasets` deposu eğitim,
uygulama ve sertifikasyon amaçlı örnekleri barındırır. Depo düzeyinde
`CC-BY-4.0` lisansı vardır. IFC2X3, IFC4 ADD2 TC1 ve IFC4X3 ADD2 için üç dosya
pinned commit ve SHA-256 ile kayda alınmıştır.

veraPDF corpus, PDF/A testlerini atomik ve kendi kendini açıklayan PASS/FAIL
vakaları olarak sunar ve `CC-BY-4.0` lisansı kullanır. PDF/A-2b `6-3-3-t01`
PASS/FAIL çifti pinned commit ve SHA-256 ile kayda alınmıştır.

Tam kaynak yolu, lisans, attribution, yerel hash ve makine çıktısı bağlantısı
`open-source-fixture-register.json` içindedir.

## Makine gözlemleri

| Fixture | Mevcut motor gözlemi | Karar |
|---|---|---|
| buildingSMART IFC2X3 architecture | Parse başarılı; 7 ölçülen eleman, 5 kapsam dışı proxy, 7 orta seviye bulgu | Şema regresyonu için yararlı; bağımsız QTO beklenen sonucu değildir |
| buildingSMART IFC4 wall/opening/window | Parse başarılı; açıklık algılandı; duvar hacmi `1,500,000,000 m³`, kalıp alanı `10,000,000 m²` raporlandı | Birim ölçekleme için yüksek öncelikli hata sinyali; doğru miktar diye kullanılamaz |
| buildingSMART IFC4X3 structural | Parse başarılı; 10 ölçülen eleman; kat ilişkisi ve proxy uyarıları | IFC4.3 regresyonu için yararlı; statik uygunluk veya donatı doğrulaması değildir |
| veraPDF PDF/A-2b PASS | Yalnız PDF/A kimlik beyanı okundu; tam doğrulama manuel bırakıldı | Tam PDF/A uygunluğu kanıtlanmadı |
| veraPDF PDF/A-2b FAIL | PASS dosyasıyla aynı PDF/A ön kontrol sınıfı üretildi | PASS/FAIL ayrımı yapılamıyor; gerçek validator entegrasyonu gerekli |

Komutlar:

```text
workers/ifc/.venv/bin/python -I workers/ifc/ifc_extract.py --input <fixture.ifc> --output <result.json> --file-name <name>
workers/ifc/.venv/bin/python -I workers/ifc/pdf_preflight.py --input <fixture.pdf> --output <result.json> --file-name <name>
```

Makine çıktıları `docs/audits/phase-0/generated/open-source/` altında tutulur.
Bunlar bağımsız insanın hazırladığı beklenen sonuç değildir.

## Kesin kapsam sınırı

Bu set aşağıdaki iddiaları kapatmaz:

- ALLPLAN, Revit, Archicad veya Tekla sürümüne özgü IFC ihracat uyumluluğu,
- mühendislik metrajının, poz eşlemesinin veya hesabın doğruluğu,
- MEP kapsamı,
- PDF/A dönüşümü veya kriptografik elektronik imza geçerliliği,
- TS 500, TS 708 veya ISO 19650 normatif uygunluğu,
- müşteri/saha kabulü ya da L3/L4 seviyesi.

Bu sınırlar validator ile de korunur; açık fixture'lar vendor ve müşteri
kapılarını düşürmez.
