# RG 33331 yönetmelikleri ve EKLER.pdf tam analizi (31 Ekim 2026)

Kaynak klasör: `örnek-exceller/e-pys Yönetmelik 2026-10-12/` (`#1.pdf`, `#2.pdf`, `EKLER.pdf`).
`#1` ve `#2` Bakanlığın son metni olarak esas alındı.

## 1. Okuma kapsamı ve yöntemi

| Belge | Sayfa | Nasıl okundu |
|---|---|---|
| `#1.pdf` Dijital Hazırlama Yönetmeliği | 4 | Metin katmanından tamamı |
| `#2.pdf` Elektronik Teslim (e-PYS) Yönetmeliği | 3 | Metin katmanından tamamı |
| `EKLER.pdf` | 241 | Taranmış. Tamamı OCR ile metne çevrildi (241/241 sayfa) |

EKLER içinde görüntüden ayrıca okunan sayfalar: 1-10, 11 (üst ve alt bölüm), 12-19, 79, 107, 231, 240.

Sınırlar:

- Diğer sayfalar OCR metninden okundu, görüntüden tek tek okunmadı.
- EK-6'nın s.61-220 bölümünde aynen tekrar eden açıklama cümleleri okuma kopyasından ayıklandı. Karşılaştırma ham OCR üzerinde yapıldı.
- OCR hata yapabiliyor: `DJGT` kodunu `DIGT` okudu. Kod listeleri bu yüzden görüntüden yazıldı.

### Tablo envanteri

183 tablo ve şeklin tamamı bulundu, eksik yok.

| Ek | Sayfa | Tablo ve şekil |
|---|---|---|
| EK-1 Proje kodu | 1 | 1.1 |
| EK-2 Dosya isimlendirme | 2-13 | 2.1-2.14 |
| EK-3 Mahal isimlendirme | 14-19 | 3.1-3.2 (152 mahal) |
| EK-4 CAD çizim | 20-28 | 4.1-4.7, Şekil 4.1-4.7 |
| EK-5 IFC sınıfları, varlık adı | 29-34 | 5.1 (69), 5.2 (67), 5.3 |
| EK-6 Öznitelik ve özellik | 35-220 | 6.1-6.68 zorunlu, 6.69-6.135 isteğe bağlı |
| EK-7 Proje sınıfları | 221-236 | 7.1-7.9 zorunlu, 7.10-7.12 isteğe bağlı |
| EK-8 Gelişim seviyesi | 237 | LOD 300 metni, tablo yok |
| EK-9 Kalite kontrol | 238-241 | 9.1 (21 madde), 9.2 (16 madde) |

## 2. Repo kural verisiyle karşılaştırma

Kaynak: `workers/ifc/vendor/ifc_ruhsat/ekler/`.

### Hatalı

**Tablo 2.3-2.11 alt disiplin ve öge** (resmî 127 benzersiz kod, repoda 102)

- Repoda eksik: `ADPL AKSS BLKA BSHT BZKT CEPH CKMS DOGR DOSB DOSM IKS ISLH KAPI KMPL KOLN KORD KZK LJNT PENC PIST PKBL PLGN PZKT TAVN TMST XXXX YAGT ZTE`
- Repoda fazla: `GIYT`, `GNEL`, `GENL`. `GENL` yalnız EK-4 m.4.13.1'de CAD katmanı için geçer, Tablo 2.3-2.11'de yoktur.
- Liste disipline göre ayrılmamış. `KPKN` iç mimariye ait olduğu halde her disiplinde geçerli sayılıyor.

**Tablo 2.12 dosya türü**

- Eksik: `SM`
- Fazla: `CP CK CG CD`

**Tablo 2.13 dosya tipi**

- Eksik: `MIR DIC ISC IHR YAP XXX`
- Fazla: `APL BIM CEC DIP ELP EMS KIH KLP MDL MKP MMP STP ZTE`

**Tablo 3.2 mahal** (resmî 152)

- Eksik: `ACM AMD ANT ARS ASH ASK ASN ATO`
- Fazla: `BNY MTF SÇO YTK`. Resmî kodlar `BAN MUT SCO YTO` repoda zaten var.

**Şablon kontrolleri**

- `isim.py` `DOSYA_ADI` alt disiplini 4 karakter ister; resmî Zemin kodları `IKS KZK ZTE` 3 karakterdir.
- `mahal.py` ve `epys.ts` mahal numarasında `K\d{2}` ister. EK-2 m.2.9.2 asma kat gibi katlar için alfanümerik `KXX` kodunu kabul eder.
- `isim.py` kat alanında tabloda olmayan `000` değerini kabul eder. Kesit ve görünüş için m.2.9.3'ün serbest `XXX` konum kodunu ise kabul etmez.
- `isim.py` `IfcBuildingStorey` ve `IfcSite` sınıflarını varlık adı kontrolünün dışında tutar. Tablo 6.8 ve 6.55 bunlar için "EK-5'e göre" der.

**Tablo 7.8**

- Repoda `ContextType` zorunlu görünüyor, tabloda yok. Sayfa da yanlış: repoda 230, belgede 231.

**Tablo 9.2 madde 9**

- Resmî: "Mahal (ifcSpace) ve Mekansal Zon (ifcSpatialZone) alanları emsal hesap tablolarıyla uyumlu mu?"
- Repo: "Modelde Proje, Saha, Bina ve en az bir Bina Katı ... bulunuyor mu?" Bu metin Tablo 9.1 madde 11'e aittir.

**Sonuç:** Resmî kodla doğru adlandırılmış dosya uyarı alabilir, resmî olmayan kod geçebilir.

### Örtüşen

- **Tablo 2.2:** 12 disiplin kodu aynı.
- **Tablo 5.1 ve 5.2:** 136 sınıfta OCR ile kod farkı bulunmadı. `IfcPump` ve `IfcMobileTelecommunicationsAppliance` satırları OCR kusuru nedeniyle otomatik eşleşmedi. Bu iki satır görüntüden ayrıca doğrulanmadı.
- **Tablo 6.1-6.68:** 319 kayıt iki yönde karşılaştırıldı, gerçek eksik bulunmadı.
  - 6.40 ve 6.66 için çıkan işaretler görüntüden bakılınca OCR kusuru çıktı.
  - 6.37'deki `Tag` bilinçli dışarıda: IFC şemasında `IfcGroup` için yok.
- **Tablo 7.1-7.9:** `ContextType` dışında fark bulunmadı.
- **Tablo 9.1:** 21 maddede otomatik metin karşılaştırması fark vermedi.

### Kodlanmamış

- **Tablo 6.69-6.135, 7.10-7.12:** isteğe bağlı, ilgili idare isterse uygulanır.
- **EK-4 CAD katman kuralları:** IFC dışında.

## 3. Yönetmelik metninden ürün için çıkan kurallar

### Takvim (`#1` m.16, geçici m.1; `#2` m.8)

| Tarih | Hüküm |
|---|---|
| 1 Eylül 2027 | Dijital Hazırlama Yönetmeliği yürürlüğe girer |
| 1 Mart 2029'a kadar | PDF/A hükümleri (m.4/2-3), 2 milyonu aşan illerin 600 binden fazla nüfuslu belediyelerindeki 5.000 m² üstü binalar dışında uygulanmaz |
| 1 Eylül 2028 | e-PYS Yönetmeliği yürürlüğe girer |
| 1 Eylül 2029 / 2030 / 2031 | IFC (m.4/5), 10.000 m² üstü binalarda şu illerin belediyelerinde başlar: 2 milyon+ il ve 600 bin+ belediye / 2 milyon+ il ve 400 bin+ belediye / 1 milyon+ il ve 300 bin+ belediye |
| 1 Eylül 2032 | Bu gruplara girmeyen binalarda IFC başlar |
| 1 Eylül 2033'e kadar | Yönetmelik, konut ve ticaret+konut dışındaki binalara uygulanmaz |

Uygulamadaki `LegislationView` tarihleri bu takvimle uyumlu. İki eksik veya fazla ifade var:

- Geçici m.1(1)(b) son cümlesi uygulamada yok: IFC başlayınca bu bende tabi yapılar için m.4/2-3 uygulanmaz.
- Uygulama e-PYS'ye yüklemeyi e-imzaya bağlı gibi anlatıyor. `#2` m.5/4 ve m.6: e-imza kullanılmazsa basılı teslim de yapılır.

### Ürünü sınırlayan hükümler

- **`#1` m.9/1:** CAD dosyaları BIM modelinden üretilir, model ile PDF/A uyumlu olmak zorundadır. EK-9 Tablo 9.1 m.21 ve Tablo 9.2 m.16 bunu kontrol eder.
- **`#2` m.5/2:** Bilgilerin doğruluğundan kaydı yapan müellif sorumludur.
- **`#2` m.4/5:** İdare projeyi müellifin izni olmadan değiştiremez.
- **`#2` m.6/4:** Kâğıda basılıp taranmış PDF kullanılamaz.
- **`#2` m.7/7:** Bu kapsamdaki işlemlerde e-PYS dışında elektronik ortam kullanılamaz. Ürün teslim yerine geçtiğini iddia etmemeli.
- **`#2` m.5/6:** Kılavuzlar Bakanlık sitesinde yayımlanacak. 31 Ekim 2026 aramasında bulunamadı.

### İsimlendirme otomasyonu

| Alan | Kural | Karar |
|---|---|---|
| Proje kodu | EK-1: idare veya dijital sistem üretir, yıl (2) + sıra (4) | Üretilmez, girilir |
| Dosya adı | EK-2 m.2.1: dijital sisteme yüklenmeyen dosyada adı müellif verir | Küçük üretici |
| Varlık adı | EK-5: `Disiplin-Kategori-Açıklama`, açıklamada `_` | Kategori sınıftan kesin gelir |
| Mahal numarası | EK-3: `Kat_Bölüm_Sıra`, bölümü müellif seçer, sıra saat yönünde | Kısmen, onaylı |
| Mahal ismi | Tablo 3.2, yeni kod tanımlanabilir | Öneri + onay |
| Malzeme | `Malzeme İsmi_Dayanım` (`Beton_C25`) | Dayanım tahmin edilmez |
| `TREpys_*` (TAKS, KAKS, çekme, EmsalDurumu) | EK-6 m.6.5: kullanıcı oluşturur | Yalnız kullanıcı girer |
| `IfcBuildingElementProxy` | EK-6 m.6.1.3: yasak | Sınıf önerilir, sessizce değiştirilmez |
| `CSBPozNo` | Yalnız isteğe bağlı tablolarda | Ruhsat için zorunlu sayılmaz |

Belgedeki çelişkiler (Bakanlığa sorulmalı):

- `#1` m.11/2 açıklama ayırıcısı için orta tire, EK-5 m.5.5.3 alt tire der. Ayrıca m.5.5.3 açıklamada orta tireyi yasaklar.
- EK-2 m.2.5 dört karakter der, Tablo 2.11 üç karakterli kod verir.
- EK-2 m.2.5 alfabetik der, Tablo 2.1 ise bu alanların veri türünü birlikte gösterir.

Düzenlenmiş IFC için ne yasak ne izin içeren bir hüküm bulunmadı.

## 4. Sıradaki doğru iş

1. Yapıldı (Rev. 139): kural verisi ve şablonlar düzeltildi, resmî listeler testle sabitlendi. Düz `BDR_BDR_011` adlı örnek model nedeniyle mahal adında iki biçim de kabul edilir.
2. Kalan sayfaları (özellikle EK-5 ve EK-6 zorunlu tablolar) görüntüden doğrula.
3. Ancak bundan sonra öneri ve onay ekranını planla.
