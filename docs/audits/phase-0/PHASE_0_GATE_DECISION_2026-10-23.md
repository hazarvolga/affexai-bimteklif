# Faz 0 kapı ayrımı kararı

**Tarih:** 23 Ekim 2026
**Karar:** Faz 0 geliştirme kapısı ile Faz 9 bağımsız kabul/yayın kapısı ayrıldı.
**Dağıtım:** Yasak; Faz 0–11 tamamlanmadan production deploy yapılmaz.

## Gerekçe

İlk yol haritasında T04; kanıt envanteri ve kabul sözleşmesiyle birlikte gerçek
vendor/müşteri dosyalarını, bağımsız beklenen sonuçları ve isimli uzmanları da
Faz 1 önkoşulu yapıyordu. Aynı dış kanıtlar T50–T51'de L3/L4 yayın kabulü
olarak tekrar zorunluydu. Bu, ürün hataları düzeltilmeden önce nihai uzman ve
müşteri kabulü istemek anlamına geliyor ve Faz 1–8 geliştirmesini kilitliyordu.

Kapsam küçültülmedi. Kapılar şu şekilde ayrıldı:

1. **Faz 0 geliştirme kapısı:** 31 bulgu, 19 capability, kaynak matrisi,
   fixture/vendor edinim protokolü, disiplin/senaryo matrisi, uzman dosyası,
   trust-store ve makine validatorü eksiksiz olmalıdır.
2. **Faz 9 yayın kapısı:** izinli gerçek ALLPLAN/Revit/Archicad/Tekla ve imzalı
   PDF dosyaları, bağımsız beklenen sonuçlar, isimli uzmanlar, kaynak/lisans
   erişimi, L3/L4 ve müşteri kabulü gerçekten tamamlanmalıdır.

`developmentGateReady=true`, yalnız geliştirme sırasının açıldığını gösterir.
`externalAcceptanceReady=false` ve `closureEligible=false` kaldığı sürece
uzman/vendor/müşteri kabulü, normatif uygunluk veya yayın hazırlığı iddia
edilemez. 49 semantik blocker Faz 9/T50–T51 ve Faz 11/T56 için korunur.

## T04 kapanış yorumu

T04'ün Faz 0 kapsamındaki “seç ve eşleştir” kısmı; gerçek kabul sonucu üretmek
yerine aşağıdaki somut edinim ve inceleme sözleşmesiyle tamamlandı:

- açık lisanslı buildingSMART/veraPDF teknik fixture'ları ve hashli makine
  gözlemleri,
- vendor bazlı resmî kaynak, lisans ve edinim kararı,
- her motor için normal/sınır/eksik-hatalı senaryo kayıtları ve blocker'lar,
- STR/ARC/MEP/COST/vergi/ihale uzman kapsamları ve imza şeması,
- pinned issuer/reviewer trust-store protokolü,
- müşteri izni, PII, kaynak, çıktı ve imza kanıtlarını doğrulayan validator.

Gerçek dosya, bağımsız sonuç ve atama eksikleri kapanmış sayılmadı; T50–T51'e
taşınarak açık tutuldu. Bu karar üretim deploy izni değildir.
