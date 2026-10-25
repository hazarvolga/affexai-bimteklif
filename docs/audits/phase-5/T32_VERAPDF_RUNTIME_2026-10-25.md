# T32 — Gerçek veraPDF çalışma ortamı ve fixture matrisi

**Tarih:** 25 Ekim 2026
**Baz commit:** `0399ac7` (main)
**Karar:** **Kod kapsamı tamamlandı / T32 hâlâ KISMİ.** Gerçek doğrulayıcı worker imajında çalışır ve rapor artifact'ı saklanır. İzinli gerçek müşteri/vendor dosya matrisi ve PDF/A **dönüşüm** kararı açıktır (bkz. §6).

Bu rapor kod ve otomatik test kanıtıdır; belge/arşiv uzmanı, PKI uzmanı veya canlı kabul yerine geçmez. Ürün metni PDF/A **dönüşümü** iddia etmez; sistem yalnız **doğrular**.

## 1. Çalışma ortamı (pin)

| Alan | Değer |
|---|---|
| Doğrulayıcı | veraPDF greenfield CLI **1.30.3** (yayın: 7 Ekim 2026) |
| Kaynak | `https://software.verapdf.org/releases/1.30/verapdf-greenfield-1.30.3-installer.zip` (resmî veraPDF indirme sunucusu; yanında `.asc` imzası yayımlanır) |
| SHA-256 | `b512bf24945503a33fc10738ecffc1f2dccaaf8593a448e94ee9ac86a9559a59` — Dockerfile `ADD --checksum` ile zorunlu; farklı bayt build'i kırar |
| Kurulum | IzPack otomatik kurulum, yalnız CLI paketi (`deploy/verapdf/auto-install.xml`; GUI, doküman, örnek plugin yok) → `/opt/verapdf` |
| Java | Debian bookworm `openjdk-17-jre-headless` 17.0.21+9-1~deb12u1 |
| İmaj | `ifc-worker` target'ı (`ifc-runtime` stage). PDF işleri `process_smartcheck_ifc_document` kuyruğunda bu servise gider; `worker` imajına Java eklenmedi. |
| Yapılandırma | İmajda `VERAPDF_CLI_PATH=/opt/verapdf/verapdf`; build sırasında `verapdf --version` çalışır ve `config/*.xml` üretilir, böylece read-only rootfs'te yazma gerekmez. |
| İmaj etkisi | ≈185 MB JRE + 18 MB veraPDF |
| Sertleştirme | `--network none --read-only --cap-drop ALL --no-new-privileges`, uid 1000, `--memory 2048m --cpus 1.5 --pids-limit 128` (compose `ifc-worker` limitleri) altında matris 13 sn'de geçti |

### Lisans (resmî kaynaktan doğrulandı, 25 Ekim 2026)

- verapdf.org ana sayfası: veraPDF, GPLv3 veya sonrası (GPLv3+) ile Mozilla Public License v2 veya sonrası (MPLv2+) altında **çift lisanslıdır**.
- `veraPDF/veraPDF-apps` README "Licensing" bölümü: `LICENSE.GPL` (GPLv3+) ve `LICENSE.MPL` (MPLv2+).
- CLI'nin kendi `--version` çıktısı: GNU GPL v3 ve Mozilla Public License v2 or later altında yayımlanmıştır.
- Kullanım biçimi: değiştirilmemiş ikili, ayrı süreç olarak `spawn(shell:false)` ile çağrılır; kaynak koda bağlanmaz. Alıcı lisansı seçebildiği için MPL-2.0 esas alınır; imaj üçüncü tarafa dağıtılırsa veraPDF kaynak bağlantısı `THIRD_PARTY_NOTICES.md` içinde verilmiştir. Java runtime GPL-2.0 + Classpath Exception'dır.
- veraPDF'in `fixer` (metadata düzeltme) özelliği **kullanılmaz**; runner argüman listesi sabittir (`--format xml --flavour <p> --loglevel 0 --maxfailuresdisplayed 100 <dosya>`) ve `--fixmetadata` içermez.

## 2. Saklanan rapor artifact'ları

`buildPdfProcessingArtifacts` (`src/smartcheck/import/pdf-artifacts.ts`) her PDF işlemi için, aynı `companyId/documentId/runId/leaseToken/` öneki altında, asıl dosyanın yanında şu artifact'ları üretir:

| artifactType | Dosya | İçerik |
|---|---|---|
| `pdf_preflight` | `pdf-preflight.json` | Yapısal ön kontrol (XMP beyanı, pafta, `/Sig`) |
| `verapdf_validation` | `verapdf-validation.json` | Normalize sonuç + `lineage` + `rawReport` {dosya adı, SHA-256, boyut} bağlantısı |
| `verapdf_report_xml` | `verapdf-report.xml` | veraPDF'in kendi ham XML raporu (kural, clause, bağlam). Yalnız doğrulayıcı gerçekten çalıştıysa |

Değişmezler:

- Asıl dosya her harici araçtan önce ve sonra SHA-256 ile doğrulanır; değişirse iş `PDF_SOURCE_CHANGED`/`VERAPDF_SOURCE_CHANGED` ile düşer. Asıl dosyanın üzerine hiçbir şey yazılmaz.
- `completed` sonucu ham rapor olmadan, `unavailable` sonucu ham raporla kabul edilmez (`VERAPDF_RAW_REPORT_MISMATCH`).
- Doğrulayıcı yoksa sonuç `unavailable` / `isCompliant=null` kalır; PASS üretilmez.
- `conversion.status` her zaman `disabled_requires_licensed_provider`, `outputCreated=false`.

## 3. Fixture matrisi (PDF/A-2b)

Manifest: `fixtures/phase-5/pdfa-matrix/manifest.json` (beklenenler çalıştırmadan önce kaydedildi, her dosyanın SHA-256'sı pinli).
Üretici: `scripts/fixtures/pdfa-matrix/generate.sh` (pinli `python:3.11-slim` digest, pikepdf 10.17.0 MPL-2.0, pyHanko 0.37.0 MIT, ağ kapalı). Türevler veraPDF corpus `6-3-3-t01` (CC-BY-4.0) çiftinden üretilir; imza anahtarı tek kullanımlık, diske yazılmayan self-signed test anahtarıdır.
Ham sonuç: [`t32-verapdf-matrix/matrix-results.json`](t32-verapdf-matrix/matrix-results.json).

| Vaka | Amaç | Yapısal XMP beyanı | veraPDF | Başarısız kurallar (ISO 19005-2) | İmza değeri | Sonuç |
|---|---|---|---|---|---|---|
| `valid-pdfa2b` | Upstream PASS | 2B | **uygun** | — | 0 | ✅ |
| `plain` | Sıradan PDF | yok | uygunsuz | 6.2.11.4.1-1 (font gömülü değil), 6.2.4.3-4 (OutputIntent'siz DeviceRGB), 6.6.2.1-1 (XMP yok) | 0 | ✅ |
| `xmp-label-only` | Yalnız XMP'de PDF/A-2b etiketi | **2B** | **uygunsuz** | 6.2.11.4.1-1, 6.2.4.3-4 | 0 | ✅ etiket PASS'e dönüşmedi |
| `multipage-pdfa2b` | 3 uygun sayfa | 2B | uygun | — | 0 | ✅ |
| `multipage-last-page-invalid` | Yalnız 3. sayfa bozuk | 2B | uygunsuz | 6.3.3-1 (bağlam `pages[2]`) | 0 | ✅ tüm sayfalar taranıyor |
| `missing-font` | Gömülmemiş Type1 font | 2B | uygunsuz | 6.2.11.4.1-1 (yalnız bu) | 0 | ✅ |
| `signed-pdfa2b` | Artımlı PAdES imzası | 2B | uygun | — | 1 | ✅ |

**7/7 vaka beklenenle birebir eşleşti.** Karşılaştırma doğrulayıcı sürümünü (1.30.3), uygunluk kararını, sıralı başarısız kural kümesini, yapısal beyanı, imza değeri sayısını, ham raporun saklandığını ve kaynak dosyanın değişmediğini birlikte kontrol eder (`compareWithExpectation`).

Notlar:

- İmzalı dosyanın PDF/A-uygun olması **imzanın geçerli veya güvenilir olduğu anlamına gelmez**; kriptografik/güven zinciri/iptal/zaman damgası doğrulaması T31 kapsamında hâlâ `not_checked`'tir. Dönüşüm yapılırsa imza bozulur ve yeniden imza akışı gerekir (§6).
- Renk/ICC ve gömülü ek (EmbeddedFiles) vakaları bu matriste yalnız dolaylı (6.2.4.3) temsil edilir; izinli gerçek dosyalarla genişletilmelidir.

## 4. Çalıştırma

```bash
docker build --target ifc-worker --tag teklifpro-ifc-worker:ci .
docker run --rm --network none --read-only --memory 2048m --cpus 1.5 --pids-limit 128 \
  --tmpfs /tmp:size=536870912,mode=1777 --tmpfs /home/node/.cache:uid=1000,gid=1000 \
  --cap-drop ALL --security-opt no-new-privileges:true \
  -v "$PWD/fixtures:/fixtures:ro" --entrypoint node teklifpro-ifc-worker:ci dist/pdfa-matrix.mjs /fixtures
```

CI (`.github/workflows/verify.yml`) aynı komutu `T32 veraPDF fixture matrix` adımıyla çalıştırır; herhangi bir uyumsuzluk çıkış kodu 1 verir. Canlı imajda `docker exec <ifc-worker> /opt/verapdf/verapdf --version` sürümü doğrular.

## 5. Kapanmayan kapılar

1. İzinli gerçek müşteri/vendor PDF matrisi (Allplan/AutoCAD/Revit çıktıları, CMYK/ICC, ekli dosya, çok sayfalı pafta seti, nitelikli e-imzalı dosya). Dosya kullanım izni gerekir.
2. PDF/A dönüşüm sağlayıcısı kararı (§6). Karar verilene kadar dönüşüm kapalıdır.
3. Canlı `ifc-worker` imajında sürüm/smoke kanıtı (Coolify manuel deploy sonrası).
4. Belge/arşiv uzmanının sonuç yorumunu kabulü.

## 6. Açık karar — PDF/A dönüşümü (Hazar)

Kod bu PR'da dönüşüm **eklemez**. Seçenekler:

| Seçenek | Lisans | Maliyet | Artı | Risk |
|---|---|---|---|---|
| **A. Dönüşüm yok** — yalnız doğrula; uygunsuz dosyada veraPDF kural listesiyle kullanıcıdan CAD/Allplan'dan PDF/A-2b dışa aktarması istenir | — | Sıfır lisans; küçük UX işi | Hukuki/lisans riski yok; imzalar korunur; kaynak dosya otoritedir | Kullanıcı tarafında ek adım |
| **B. Ghostscript (AGPL-3.0)** ayrı süreç olarak | AGPL-3.0 veya Artifex ticari lisansı | AGPL: lisans ücreti yok, ancak hukuk değerlendirmesi ve kaynak sunma yükümlülükleri; ticari lisans: Artifex'ten teklif usulü (fiyat yayımlanmıyor) | Olgun, yaygın | AGPL'nin SaaS'ta yorumu; Ghostscript PDF/A çıktısı veraPDF'ten her zaman geçmez; renk/şeffaflık/imza kaybı |
| **C. OCRmyPDF (MPL-2.0)** | MPL-2.0, fakat PDF/A için içeride Ghostscript kullanır | B ile aynı | Daha yüksek seviye arayüz | B'nin lisans sorunu aynen devam eder |
| **D. Ticari SDK/sunucu** (ör. callas pdfToolbox, PDF Tools 3-Heights, Apryse) | Ticari | Satıcı teklifi; yıllık sunucu/CPU lisansı. Fiyatlar yayımlanmıyor; satın alma ayrı onay | En yüksek dönüşüm başarısı, destek | Maliyet, vendor bağımlılığı, dosyaların üçüncü taraf bulut servisine gitmemesi şartı |
| **E. LibreOffice (MPL-2.0)** | MPL-2.0 | Sıfır | Ofis belgesi → PDF/A için iyi | PDF→PDF/A dönüşümü yapmaz; bu ihtiyaca uymaz |

Her seçenekte ortak kurallar: dönüşen dosya ayrı artifact olur, asıl dosya korunur; dönüşüm çıktısı yeniden veraPDF'ten geçmeden PASS sayılmaz; imzalı kaynak dönüştürülürse imza geçersiz kabul edilir ve yeniden imza akışına yönlendirilir.

**Öneri:** Lansmanda **A**. Kullanım verisi dönüşüm talebini gösterirse B (hukuk onaylı) ile D (teklif) karşılaştırılır.
