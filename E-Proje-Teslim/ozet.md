# Dijital Proje ve e-PYS Yönetmelikleri — Özet (Nihai Metin)

**Kaynak:** 5 Ağustos 2026 tarihli ve **33331** sayılı Resmî Gazete
**Güncelleme:** 8 Ekim 2026. Bu sürüm, taslak metne dayanan önceki özetin yerini alır.
**Klasör düzeni:**

| Klasör | İçerik | Durum |
|---|---|---|
| `nihai-RG-2026-08-05/` | İki yönetmeliğin RG metni (`.htm`), Dijital Hazırlama Yönetmeliği ekleri (`…-EKLER.pdf`, 241 sayfa), eklerin OCR metni (`EKLER-OCR-metin.txt`) | **Bağlayıcı** |
| `taslak-2026-oncesi/` | Görüşe açılan taslak metinler ve taslak ekler | Tarihsel, **kullanmayın** |
| `ucuncu-taraf/` | Allplan 2026 IDS / e-PYS kılavuzu | Satıcı dokümanı, resmî değil. Taslağa dayanır ve nihai metinle çelişen bilgiler içerir. |

> [!WARNING]
> RG'deki ekler taranmış görüntü olarak yayımlanmıştır. `EKLER-OCR-metin.txt` makine ile okunmuştur, bu yüzden tablo hücrelerinde OCR hatası olabilir. Kod veya kural yazarken asıl referans `Dijital-Hazirlama-Yonetmeligi-EKLER.pdf`'tir. Bu özetteki ek atıfları OCR metninden alındı, kritik olanlar PDF'te gözle teyit edilmelidir.

---

## 1. İki yönetmelik

| | Dijital Olarak Hazırlanması Hakkında Yönetmelik | Elektronik Ortamda Teslimi ve Yönetilmesi Hakkında Yönetmelik |
|---|---|---|
| Ne düzenler? | Projelerin **nasıl hazırlanacağı**: formatlar, isimlendirme, IFC sınıfları, özellikler, LOD, kalite formu | Projelerin **e-PYS üzerinden nasıl teslim, inceleme, onay ve saklama** süreçlerinden geçeceği |
| Yürürlük | **1 Eylül 2027** (Md.16) | **1 Eylül 2028** (Md.8) |
| Kapsam | Uygulama imar planı bulunan alanlarda **yeni yapılacak binalar** (Md.1/2) | Aynı kapsam |
| Kapsam dışı | Bodrum hariç en çok 2 katlı ve toplam inşaat alanı ≤ 200 m² müstakil yapılar; entegre tesis niteliğinde olmayan tarım/hayvancılık yapıları; 3194 s. Kanun Md. 4, 26, 27 | Aynı |
| Ekler | EK-1 … EK-9 (RG `20260805-2-1.pdf`) | Yok |

---

## 2. Kademeli geçiş takvimi (Dijital Hazırlama Yönetmeliği, Geçici Md.1)

Yönetmelik 1 Eylül 2027'de yürürlüğe girer, ancak hükümler bina büyüklüğüne ve belediye nüfusuna göre **ertelenmiştir**.

**2B çizim ve dokümanların PDF/A olarak teslimi** (Md.4/2–3):

| Kimler için | Ne zaman |
|---|---|
| Nüfusu 2.000.000'u geçen illerin, nüfusu 600.000'den fazla belediyelerinde, toplam inşaat alanı **> 5.000 m²** binalar | 1 Eylül 2027 |
| Diğer tüm binalar | **1 Mart 2029** |

**BIM modelinin IFC olarak teslimi** (Md.4/5):

| Kimler için | Ne zaman |
|---|---|
| İl nüfusu > 2.000.000, belediye nüfusu > 600.000, inşaat alanı > 10.000 m² | **1 Eylül 2029** |
| İl nüfusu > 2.000.000, belediye nüfusu > 400.000, inşaat alanı > 10.000 m² | 1 Eylül 2030 |
| İl nüfusu > 1.000.000, belediye nüfusu > 300.000, inşaat alanı > 10.000 m² | 1 Eylül 2031 |
| Diğer tüm binalar | 1 Eylül 2032 |

**Diğer kurallar:**

- **Konut ve ticaret+konut dışındaki binalar** (Geçici Md.1/2): yönetmelik bu binalara **1 Eylül 2033**'e kadar uygulanmaz.
- **Mevcut başvurular** (Geçici Md.2): uygulama tarihinden önce ruhsat başvurusu yapılmış yapılara ve ihale kararı alınmış kamu yapım işlerine yeni hükümler uygulanmaz.

> [!IMPORTANT]
> Hiçbir bina için IFC teslimi **1 Eylül 2029'dan önce** zorunlu değildir. "Ekim 2026'dan itibaren zorunlu" bilgisi taslağa aittir ve geçersizdir.

---

## 3. Dijital Hazırlama Yönetmeliği: madde özeti

| Madde | Hüküm |
|---|---|
| Md.4/2 | 2B proje çizimleri **PDF/A** formatında teslim edilir. Taslaktaki DXF zorunluluğu **kaldırıldı**. |
| Md.4/3 | Çizim ve model dışındaki dokümanlar PDF/A formatında olur. |
| Md.4/4 | 3B modeller **TS EN ISO 19650-1** ve **TS EN ISO 19650-2**'ye göre BIM tabanlı oluşturulur. |
| Md.4/5 | BIM modeli **TS EN ISO 16739-1 (IFC)** formatında teslim edilir. Ekler IFC **4.3** esas alınarak hazırlanmıştır. |
| Md.6 | EK-1'e göre proje kodu oluşturulur, EK-2'ye göre dosya isimlendirilir. |
| Md.7 | CAD çizimleri EK-4 (katman, sembol, ölçü, yazı, çizgi tipi) esaslarına uyar. Mahal numaralandırması EK-3'e göre yapılır. |
| Md.8 | Paftalar A4 ve katlarıdır (TS EN ISO 216). Her çizim veya doküman ayrı dosyadır. |
| Md.9 | Her disiplin ayrı IFC modeli teslim eder. **CAD çizimleri BIM modelinden üretilir** ve PDF/A nüshası modelle **uyumlu olmak zorundadır**. |
| Md.11 | Varlık adı üç alandan oluşur: Disiplin, Kategori, Açıklama. Alanlar orta tire `-` ile ayrılır. |
| Md.12 | IFC sınıfları EK-5'e, zorunlu öznitelik ve özellikler EK-6'ya göredir. |
| Md.13 | Proje bilgileri EK-7'ye göredir. |
| Md.14 | Gelişim seviyesi EK-8'e göredir. |
| Md.15 | EK-9 model kalite kontrol formu doldurulur. |

---

## 4. Ekler: nihai metindeki kritik kurallar

### EK-1 Proje Kodu

- **Proje kodu 6 haneli bir sayıdır:** 2 haneli yıl + 4 haneli yıllık sıra numarası (ör. `260001`). Kodu **ilgili idare** üretir. Müellif, Tablo 1.1'deki bilgilerle (yıl, il, ilçe, mahalle, ada, parsel, durum) başvurur. Bu bilgiler kodun içine yazılmaz, **meta-veri** olarak saklanır.
- Dijital sistem ve güvenli e-imza ile teslimde kodu **sistem üretir**.
- *Taslaktaki `YIL_IL_ILCE_MAHALLE_ADA_PARSEL_DURUM` biçimi ve "Y0/P0" durum kodları nihai metinde yoktur.*

### EK-2 Dosya İsimlendirme

Alanlar **alt tire `_`** ile ayrılır. Sıra Tablo 2.1'dedir:

| Alan | Uzunluk | Değerler / örnek |
|---|---|---|
| Proje Kodu | 6 | EK-1'e göre |
| Bina Kodu | 2 | Tek bina ise `00` |
| Disiplin | 2 | MM Mimari · IM İç Mimari · ST Statik · EE Elektrik · MK Mekanik · HR Harita · AL Altyapı · PY Peyzaj · … |
| Öge / Alt Disiplin | 4 | Tablo 2.3–2.11. Listede olmayan öge için `DIGR` |
| Dosya Türü | 2 | PL Plan · KS Kesit · GR Görünüş · DT Detay · SM Şema · MD Model · FR Form · LS Liste · DK Doküman · RP Rapor · HS Hesap · GN Genel |
| Dosya Tipi | 3 | ör. MMC Mimari Çizim, MAP Mimari Açıklama Raporu, YKG Yangın Kaçış ve Güvenlik Planı |
| Kat / Konum | 3 | B01, B02 … · K00 Zemin · K01 … · NNN Kattan bağımsız |
| Sıra No | 2 | `01`'den başlar |
| Revizyon No | 3 | Revizyon yoksa `000`, idare revizyon isterse `001`… |

Dijital sistem üzerinden teslimde dosya adı bilgileri sistemde toplanır.

### EK-3 Mahal Numarası

`Kat_BölümFonksiyon_SıraNo`. Kat 3 karakter (EK-2 Tablo 2.14), bölüm 3 karakter, sıra 3 haneli. Sıra her kat ve bölüm birleşimi için `001`'den başlar ve saat yönünde artar. Mahal isim kısaltmaları Tablo 3.2'dedir.

### EK-5 IFC Sınıfları ve Varlık İsimlendirme

- Tablo 5.1 zorunlu sınıfları, Tablo 5.2 isteğe bağlı sınıfları listeler. Liste IFC 4.3 esaslıdır.
- Varlık adı: `Disiplin-KategoriKodu-Açıklama`
  - Ana alanlar orta tire `-` ile, açıklama içindeki alt bilgiler alt tire `_` ile ayrılır. Açıklamada `-` kullanılmaz.
  - Kategori kodu 3 harftir, ör. `KRS` Kiriş, `DSM` Döşeme, `MHL` Mahal.
  - Örnek: `ST-KRS-C30_30x60`

### EK-6 Öznitelik ve Özellik Tanımları (Tablo 6.1–6.135)

- **6.1.2:** Alt sınıfı bulunan bir üst sınıf kullanılmaz.
- **6.1.3:** `IfcProxy` ve `IfcBuildingElementProxy` **kullanılamaz**.
- **6.2:** Uniclass 2015 kodları bilgi amaçlıdır.
- **Türkiye'ye özgü özellik setleri.** Nihai metinde adları **değişti**. Taslaktaki adı `Tr_Pset_CSB` idi.

| Özellik seti | Özellik | Tür | Nerede |
|---|---|---|---|
| `TREpys_PozOzellikSeti` | `CSBPozNo` | Metin | Çok sayıda zorunlu sınıfta. ÇŞB İnşaat ve Tesisat Birim Fiyat poz no. |
| `TREpys_ParselOzellikSeti` | `TAKS`, `KAKS`, `CekmeOn`, `CekmeYan`, `CekmeArka` | Sayı | **IfcSite** (Tablo 6.55) |
| `TREpys_EmsalOzellikSeti` | `EmsalDurumu` | Metin: `DAHIL` / `HARIC` / `DIGER` | Mekânsal zon |

> Nihai metinde özellik adları **ASCII** yazılmıştır (`CekmeOn`, `CekmeYan`, `CekmeArka`). Taslaktaki adlar Türkçe karakterliydi (`ÇekmeÖn` vb.).

### EK-7 Proje Bilgileri

IfcProject ve ilişkili sınıfların (Tablo 7.1–7.12) zorunlu öznitelikleri. IFC 4.3 esaslıdır.

### EK-8 Gelişim Seviyesi

Ruhsat eki projelerde varlıklar **"Detaylı Modelleme" = LOD 300** seviyesinde modellenir. Alfanümerik bilgiler EK-6 ve EK-7'ye göredir. *Taslaktaki LOD100–400 aşama tablosu nihai metinde yoktur.*

### EK-9 Model Kalite Kontrol Formu

Mimari form (Tablo 9.1) 21 kontrol içerir, diğer disiplinler için Tablo 9.2 vardır. Kontroller:

| Grup | Kontroller |
|---|---|
| Genel | Dosya boyutu · proje bilgileri · koordinat sistemi · gelişim seviyesi |
| İsimlendirme | Proje ve dosya · mahal no ve ismi · varlık |
| IFC | Zorunlu sınıflar ve özellikleri · Proje/Saha/Bina/en az bir Kat hiyerarşisi · doğru sınıf ataması · IFC versiyonu ve uzantısı · ön tanımlı tip · özelliklerin doğru Pset altında olması |
| Mimari | IfcSpace varlığı · mahallerin örtüşmemesi · mahallerin kapalı olması ve üst sınırları |
| Model | Doğru kat/kot · yinelenen varlıkların kaldırılması · emsal tablosu ile IfcSpace/IfcSpatialZone uyumu |
| Teslim | **PDF paftaların BIM modelinden üretilmiş olması** |

---

## 5. Elektronik Teslim Yönetmeliği: madde özeti

| Madde | Hüküm |
|---|---|
| Md.4 | Tüm ruhsat proje işlemleri e-PYS üzerinden yapılır. Yüklenen dosyalar Dijital Hazırlama Yönetmeliği'ne uygun olmak zorundadır. Bina türü, alan ve tarih kriterlerini Bakanlık belirler. İdare sayısal veriyi üçüncü kişilere devredemez, müellif izni olmadan çoğaltamaz veya değiştiremez. |
| Md.5 | Dosyaları müellif yükler ve doğruluklarından sorumludur. İdare ve yapı denetim kuruluşu e-PYS üzerinden inceler. Eksiklikler gerekçeli bildirilir. Kayıtlar aksi ispat edilinceye kadar geçerlidir. |
| Md.6 | e-imza yoksa PDF/A veya IFC teslimine ek olarak basılı teslim gerekir. e-imza varsa dijital teslim yeterlidir. Taranmış PDF kullanılamaz. |
| Md.7 | Hazırlayan ve inceleyenler için e-PYS kaydı zorunludur. Bildirimler beyan edilen e-posta veya telefona yapılabilir. Bu işlemler için e-PYS dışında elektronik ortam kullanılamaz. |

---

## 6. Taslak → nihai metin farkları

| Konu | Taslak | Nihai |
|---|---|---|
| Yürürlük | 01.10.2026 / 01.10.2027 | **01.09.2027 / 01.09.2028** + 2029–2033 kademeli geçiş |
| 2B format | DXF + PDF | **PDF/A** |
| CAD–BIM ilişkisi | "BIM'den üretilebilir" | BIM'den **üretilir**, PDF/A ile **uyumlu olmak zorunda** |
| Kapsam istisnası | — | ≤ 2 kat ve ≤ 200 m² müstakil, tarım/hayvancılık |
| Proje kodu | `YIL_IL_ILCE_MAHALLE_ADA_PARSEL_DURUM` | **6 haneli kod** (yıl + sıra no), bilgiler meta-veri |
| Dosya adı ayırıcısı | `-` | **`_`** + Revizyon No alanı |
| Türkiye Pset'i | `Tr_Pset_CSB` (`PozNo`, `TAKS`, `KAKS`, `ÇekmeÖn`…) | **`TREpys_PozOzellikSeti.CSBPozNo`**, **`TREpys_ParselOzellikSeti`** (IfcSite), **`TREpys_EmsalOzellikSeti`** |
| Proxy yasağı | yalnızca `IfcProxy` | `IfcProxy` **ve** `IfcBuildingElementProxy` |
| LOD | Aşamaya göre LOD100–400 | Ruhsat için **LOD 300** |
| EK-6 kapsamı | Tablo 6.1–6.67 | Tablo 6.1–**6.135** |

---

## 7. TeklifPro ve BIMPlan Academy için anlamı

1. **Zaman:** IFC zorunluluğu en erken Eylül 2029'da başlıyor. 2B PDF/A ise büyük metropollerde 5.000 m² üstü binalar için Eylül 2027'de başlıyor. Ürün mesajı "aciliyet" değil **"hazırlık"** olmalı.
2. **Kod etkisi:** `src/ifc/parser/tr-pset-csb-extractor.ts` taslak adları okuyor (`Tr_Pset_CSB`, `PozNo`). Bunun yerine nihai adlar okunmalı: `TREpys_PozOzellikSeti.CSBPozNo`, `TREpys_ParselOzellikSeti` (IfcSite, `CekmeArka` dahil), `TREpys_EmsalOzellikSeti.EmsalDurumu`. Geriye uyumluluk için taslak adlar "eski ad" uyarısıyla kabul edilebilir.
3. **Ürün fırsatı:** EK-9'daki 21 kontrolün çoğu IFC'den otomatik denetlenebilir. Örnekler: Proje/Saha/Bina/Kat hiyerarşisi, proxy yasağı, zorunlu özellikler, IFC versiyonu, yinelenen varlıklar, isimlendirme kalıpları, IfcSpace varlığı. Bu bir **"e-PYS ön-kontrol"** özelliğine dönüşebilir. Ayrıca `CSBPozNo`, metrajdan teklife geçişte poz eşleştirmesini doğrudan besler.
4. **Academy:** "Dijital Ruhsat 2027–2033" modülü eklenebilir: kapsam/tarih hesaplayıcı, EK-1/2/3/5 isimlendirme alıştırmaları, `TREpys_*` Pset'leri, EK-9 kontrol listesi.
