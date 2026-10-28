# BIMMetraj — Marka Konumlandırması, Ürün Stratejisi, Paketleme ve UI/UX Değerlendirme Raporu

**İnceleme tarihi:** 26 Ekim 2026  
**Ürün:** BIMMetraj  
**Canlı adres:** https://bimmetraj.com  
**İnceleme kapsamı:** Kamuya açık site, fiyatlandırma, kayıt, SmartCheck demosu, son kullanıcı paneli, mevcut IFC sonucu, teklif oluşturma, CRM, piyasa verisi, kullanım ve paketler, kârlılık, yardım içerikleri ve ilgili kaynak kod.  
**Çalışma biçimi:** Salt okunur inceleme. Kod, hesap ayarları, müşteri kayıtları, teklifler ve fiyat kayıtları değiştirilmedi. Yeni dosya yüklenmedi, ödeme yapılmadı, teklif kaydedilmedi, analiz yeniden çalıştırılmadı.

---

## 1. Raporun dayanağı ve değerlendirme sınırları

Bu rapor üç tür kanıtı birbirinden ayırır:

1. **Canlı gözlem:** Tarayıcıda veya Firefox üzerinden doğrudan görülen ekran, metin ve davranış.
2. **Kod bulgusu:** Kaynak kodda bulunan yapı, yönlendirme, limit veya işleyiş.
3. **Ürün önerisi:** Henüz uygulanmış veya kullanıcı araştırmasıyla doğrulanmış kabul edilmemesi gereken tasarım ve ticari öneri.

İlk incelemede canlı `/api/health` uç noktasının bildirdiği uygulama sürümü ile yerel Git HEAD, `8ab5056` olarak eşleşiyordu. Bu eşleşme, incelenen kod ile uygulama sürümü arasında bağlantı kurmaya yardımcı olur. Bütün servislerin, dosya türlerinin, hesapların ve müşteri akışlarının üretimde doğrulandığı anlamına gelmez.

Son kullanıcı incelemesi Firefox’taki `Demo` çalışma alanında ve `OWNER` rolüyle yapıldı. Hesapta 14 günlük ücretsiz deneme paketi görünüyordu.

Mevcut, tamamlanmış bir IFC dosyasının sonucu açıldı. Bu dosyada üç IFC elemanı ve iki icmal kalemi görüntülendi. Bu küçük örnek üzerinden bütün IFC modelleri, gerçek müşteri projeleri veya büyük dosya performansı hakkında genelleme yapılmadı.

CRM ekranındaki yükleme hatası bir kez yeniden denendi ve aynı hata tekrar görüldü. Hatanın sunucu, yetki, veri veya ağ kaynaklı olduğu bu incelemede belirlenmedi.

Kayıt, ödeme, dosya yükleme, fiyat kaydetme, mühendis inceleme kararı verme, teklif oluşturma ve PDF üretme gibi yazma veya kota tüketme işlemleri çalıştırılmadı. Bu nedenle rapor, uçtan uca kabul testi veya bağımsız mühendislik doğrulaması değildir.

Tarayıcı erişiminin bir bölümünde uygulama içi tarayıcı aracı kapalıydı. Son kullanıcı incelemesi, kullanıcının açıkça yetkilendirdiği Firefox masaüstü erişimi üzerinden tamamlandı.

---

## 2. Genel değerlendirme

BIMMetraj’ın güçlü bir ürün çekirdeği ve ayırt edici bir görsel kimliği bulunuyor.

Ürünün en değerli tarafı, bir metraj veya teklif kaleminin nereden geldiğini açıklayabilmesi; miktarı, kaynağı, inceleme kararını ve fiyat bilgisini ilişkilendirmeye çalışması.

Buna karşılık mevcut sunumda:

- Çok sayıda ürün alanı aynı seviyede anlatılıyor.
- Teknik terimler müşterinin elde edeceği sonucun önüne geçiyor.
- Deneme, pilot ve ücretli abonelik arasındaki sınırlar net görünmüyor.
- Aynı işe farklı isimler ve farklı ekranlar üzerinden başlanabiliyor.
- Eksik veri, uygulanmamış kontrol ve doğrulanmış sonuç bazı ekranlarda yeterince ayrılmıyor.
- Paketler özellik, kullanım amacı, teknoloji ve şirket ölçeğini karıştıran isimlerle sunuluyor.
- Uygulama içindeki bazı açıklamalar marka vaadiyle çelişiyor.

Bu nedenle öncelik, yeni modül sayısını artırmaktan önce mevcut çekirdeği anlaşılır ve tamamlanabilir bir müşteri işine dönüştürmek olmalı.

Temel ürün sorusu:

> Bir teknik ofis, elindeki IFC veya Excel metrajından başlayarak kaynağı görünen, incelemesi kayıtlı ve fiyatı açıklanabilir bir teklifi ne kadar kolay hazırlayabiliyor?

Marka, ana sayfa, paketler, ilk kullanım ve uygulama içi navigasyon bu soruya aynı cevabı vermeli.

---

## 3. Marka konumlandırması

### 3.1. Mevcut konumlandırma neden dağınık görünüyor?

Ürün farklı yüzeylerde şu tanımlarla karşılaşılıyor:

- openBIM platformu
- 5D ihale masası
- Mimari metraj ve ihale paftası
- e-PYS denetimi
- SmartCheck
- TS 500 metraj motoru
- Poz ve rayiç kataloğu
- Müteahhitlik süreç masası
- Arsa ve ön fizibilite
- Taşeron hakediş kalkanı
- AI teklif sihirbazı

Bu kavramlar tek tek anlamlı olabilir. Birlikte ve eşit ağırlıkta sunulmaları, kullanıcının ürünün temel işini kendisinin çözmesini gerektiriyor.

Kullanıcı ilk anda şu sorulara cevap bulmalı:

- Bu ürün benim için mi?
- Hangi işimi tamamlıyor?
- Hangi mevcut çalışma biçimimi kolaylaştırıyor?
- İlk sonucu görmek için ne yapmam gerekiyor?
- Sonuca hangi ölçüde güvenebilirim?

Mevcut anlatım, bu sorulardan önce ürünün teknik bileşenlerini açıklamaya çalışıyor.

### 3.2. Önerilen kategori

**İzlenebilir Metraj ve Teklif Platformu**

Bu kategori hem ürünün mevcut güçlü tarafıyla uyumlu hem de teknik ofis kullanıcısının yaptığı işe yakın.

“İzlenebilir” ifadesinin ürün içindeki somut karşılıkları:

- Kaynak dosyanın kimliği
- IFC elemanı veya Excel/CSV satırı
- Okunan miktar ve birim
- Hesap veya dönüşüm adımları
- Eksik veya çelişkili bilgi
- İnceleme kararı
- Fiyat kaynağı
- Teklif revizyonu

Bu zincir yalnız slogan olarak kullanılmamalı; demo ve gerçek çalışma ekranlarında gösterilmeli.

### 3.3. Önerilen konumlandırma cümlesi

> BIMMetraj, teknik ofislerin IFC ve Excel metrajlarını inceleyip firma fiyatlarıyla eşleştirerek kaynak bağlantılı teklifler hazırlamasına yardımcı olan bir çalışma alanıdır.

### 3.4. Önerilen ana mesaj

> Metrajdan teklife, her kalemin kaynağı görünür.

Alternatif kullanım:

> IFC ve Excel metrajınızı, incelemesi kayıtlı bir teklife dönüştürün.

“Her kalemin kaynağı görünür” ifadesi ürün kapsamı içinde kullanılmalı. Kaynağı bulunmayan veya kullanıcı tarafından manuel girilen kalemler varsa, bunların durumu ayrıca belirtilmeli.

### 3.5. Marka vaadinin sınırı

Kaynak izi şu anlamlara gelmez:

- Hesabın bağımsız mühendis tarafından onaylandığı
- Bütün IFC dosyalarının hatasız işlendiği
- Her fiyatın resmî veya güncel olduğu
- Mevzuata genel uygunluk sağlandığı
- Ruhsat veya ihale kabulünün garanti edildiği

Marka, kaynak görünürlüğü ile doğruluk ve kabul seviyesini birbirinden ayırmalı.

### 3.6. BIMMetraj, SmartCheck ve e-PYS arasındaki ilişki

Önerilen marka mimarisi:

- **BIMMetraj:** Ana ürün ve çalışma alanı.
- **SmartCheck:** Miktar, kaynak ve kontrol bulgularını inceleme işlevi.
- **e-PYS ön kontrolü:** Belirli dosya ve teslim gereksinimlerine ilişkin uzmanlık kapsamı.
- **Hesaplayıcılar:** Yardımcı araçlar.
- **Academy:** Ayrı öğrenme ve edinim bağlamı; aktif ürün durumu ayrıca doğrulanmalı.

ALLPLAN, Revit ve Archicad, desteklenen kaynak yazılım ekosistemleri olarak yer almalı. BIMMetraj’ın müşteri değeri belirli bir modelleme yazılımına bağımlı anlatılmamalı.

### 3.7. İlk müşteri odağı

Öncelikli müşteri hipotezi:

> Düzenli metraj ve teklif hazırlayan, Excel kullanan, fiyatları farklı kaynaklardan toplayan ve birden fazla kişinin kontrolüne ihtiyaç duyan teknik ofis ekipleri.

| Segment | Ana problem | Öncelik |
|---|---|---|
| Müteahhit teknik ofisi | Metraj, fiyat ve teklif arasındaki tekrar iş ve kontrol yükü | Birinci |
| Metraj/maliyet danışmanlığı | Müşteriye açıklanabilir ve revizyonu izlenebilir çıktı sunmak | Birinci |
| Uzman taşeron | Kendi imalat kalemlerini düzenli fiyatlandırmak | İkinci |
| BIM koordinasyon ekibi | Model bulgularını miktar ve maliyet sürecine bağlamak | İkinci |
| Ruhsat/denetim ekibi | Teslim öncesi belirli kontrol görevlerini tamamlamak | Ayrı senaryo |

Bu sıralama kanıtlanmış pazar talebi değildir. Görüşme, gerçek proje kullanımı ve ücretli pilotlarla sınanmalıdır.

### 3.8. Rekabete ilişkin konumlandırma

CostX, Solibri ve Kreo gibi ürünlerin resmî sunumları incelendiğinde metraj, model kontrolü, fiyatlandırma, raporlama veya revizyon takibinin pazarda farklı biçimlerde zaten bulunduğu görülüyor.

Bu nedenle “metraj + kontrol + fiyat” birleşimini tek başına benzersizlik iddiası olarak kullanmak doğru olmaz.

BIMMetraj için araştırılabilecek farklılaşma alanı:

> Türkiye’deki teknik ofislerin kaynak, inceleme, firma fiyatı ve teklif işlerini anlaşılır bir çalışma akışında birleştirmek.

Bu, henüz kanıtlanmış rekabet üstünlüğü değildir.

Resmî referanslar:

- https://www.rib-software.com/en/rib-costx
- https://www.solibri.com/solutions/webchecker
- https://www.kreo.net/pricing

---

## 4. Ürün olgunluğu ve ticari sunum arasındaki ilişki

### 4.1. Aynı sayfada farklı ürün aşamaları anlatılıyor

Canlı ana sayfada birlikte görülen ifadeler:

- “Geliştirme aşamasındadır.”
- Aktif mühendislik geliştirme ve saha doğrulaması.
- Kapalı mühendislik doğrulaması için ön kayıt.
- “14 gün ücretsiz başlayın.”
- Bir yıllık ve iki yıllık peşin abonelik.

Bu seçeneklerin birlikte bulunması tek başına yanlış değildir. Ancak kapsam farkları açıklanmadığında kullanıcı şu ayrımı yapamıyor:

- Bugün hangi bölümü kullanabilirim?
- Hangi bölüm için davet beklemeliyim?
- Pilot kapsamı nedir?
- Ücret ödediğimde hangi hizmet etkinleşir?
- Kullanım sırasında ne kadar destek alırım?

### 4.2. Yetenek kaydının gösterdiği durum

İncelenen capability registry içinde:

- 15 kayıt `pilot/L2`
- 4 kayıt `roadmap/L1`
- 0 kayıt `live/L3`

bulunuyordu.

Buradaki `live/L3`, internet sitesinin açık olmasıyla aynı şey değildir. Projenin kendi doğrulama ve uzman kabul seviyesini ifade eder.

Bu durum ürünün değersiz veya kullanılamaz olduğunu göstermez. Satış vaadinin kontrollü kapsamla ve doğru beklentiyle kurulması gerektiğini gösterir.

### 4.3. Önerilen giriş yolları

| Giriş | Kullanıcının beklediği sonuç |
|---|---|
| Örnek projeyi incele | Hesap açmadan ürünün mantığını görmek |
| Sınırlı denemeyi başlat | Açıklanmış kapsamda kendi başına denemek |
| Projem için pilot görüşmesi | Gerçek dosyasının uygunluğunu ve destek kapsamını değerlendirmek |

Ana sayfada bunlardan biri birincil olmalı.

Mevcut uzman kabul durumuna göre örnek demo ve kontrollü pilotun daha güçlü öne çıkarılması önerilir.

### 4.4. Pilot önerisi

İlk müşteriler için sınanabilecek pilot çerçevesi:

- 30 günlük süre
- Bir geçmiş gerçek proje
- Bir metrajdan teklife çalışma akışı
- En fazla üç kullanıcı başlangıç hipotezi
- Başlangıç toplantısı
- İki çalışma oturumu
- Sonuç değerlendirmesi
- Yazılı dosya, kullanım ve veri koşulları
- Açık ücret ve destek kapsamı
- Otomatik yenileme olmaması
- Pilot sonrasında ayrı abonelik kararı

Bunlar mevcut ticari koşullar değil, öneridir.

Ücretsiz keşif ve örnek demo ile gerçek müşteri dosyasını içeren destekli çalışma birbirinden ayrılmalıdır.

---

## 5. Kamuya açık ana sayfa değerlendirmesi

### 5.1. Başlık güçlü fakat fazla kesin

Mevcut başlık:

> İhale Masasında Hata Payı Bırakmayın.

Dikkat çekici ve sektörel olarak anlaşılır. Ancak hatayı ortadan kaldırma beklentisi oluşturabilir.

Aynı sayfada bağımsız uzman onayının bulunmadığı ve bazı işlevlerin pilot olduğu açıklanıyor. Başlıkla bu açıklamalar arasında algısal gerilim var.

Önerilen başlık:

> Metrajdan teklife, her kalemin kaynağı görünür.

Önerilen açıklama:

> IFC ve Excel metrajınızı inceleyin, firma fiyatlarınızla eşleştirin ve inceleme kararları kayıtlı bir teklif hazırlayın.

Önerilen eylemler:

- Örnek projeyi incele
- Projem için pilot görüşmesi

### 5.2. İlk ekranda teknik yoğunluk fazla

İlk ekranda veya hemen devamında görülen kavramlar:

- IFC
- PDF/A
- ÇŞB
- TS 500
- RG 33331
- EK-9
- QTO
- `CSB_2026_V1`
- Minha
- 5D

Hedef kullanıcı teknik bir kişi olsa bile, ürünün değerini anlamadan bu kadar kavramı birlikte çözmek zorunda bırakılmamalı.

İlk ekranın işi, bütün teknik kapsamı anlatmak değil, doğru kullanıcıya doğru sonucu göstermektir.

### 5.3. Teknik dil kullanıcı diline çevrilmeli

| Teknik ifade | Önerilen kullanıcı dili |
|---|---|
| Tenant kapsamındaki fiyat snapshot’ı | Firmanıza ait, tarihi ve kaynağı kayıtlı fiyat |
| SHA-256 kaynak izi | Kullanılan dosyanın kimliği korunur |
| Kalıcı ardıl revizyon | Önceki teklif korunarak yeni sürüm oluşturulur |
| Reviewer kaydı gerekir | Yetkili kişinin incelemesi gerekir |
| Immutable teklif | Sonradan değiştirilemeyen kayıtlı teklif sürümü |
| Calm aktarımı | İncelenen icmal kalemlerini teklife aktar |
| `not_evaluated` | Değerlendirilmedi |
| `supplier_quote` | Tedarikçi teklifi |
| `company_actual` | Firma gerçekleşen maliyeti |

Teknik terimler detay panelinde veya uzman görünümünde korunabilir.

### 5.4. En güçlü satın alma gerekçesi geç gösteriliyor

Kaynak ve inceleme izi, ana sayfada fiyatlandırmadan sonra yer alıyor.

Oysa satın alma gerekçesinin fiyatın önünde olması gerekir.

Önerilen sıra:

1. Kim için ve hangi sonuç?
2. Gerçek arayüzde tek kalemin yolculuğu.
3. Kaynak, inceleme ve fiyat ilişkisi.
4. Desteklenen dosya kapsamı.
5. Mevcut sınırlar.
6. Ölçülmüş pilot sonuçları.
7. Paket veya pilot teklifi.
8. SSS ve sonraki adım.

### 5.5. Sentetik demo etiketlemesi olumlu

Ana sayfadaki örnek cetvelin sentetik ürün demosu olduğu ve uzman onayı anlamına gelmediği açıkça belirtiliyor.

Bu ayrım korunmalı.

Ancak sentetik örnek, müşteri başarısı veya gerçek proje kanıtı gibi kullanılmamalı.

### 5.6. Resmîlik çağrıştıran ifadeler gözden geçirilmeli

Görülen ifadeler arasında:

- Resmî denetim izi
- Resmî ihale masası
- Resmî icmal paftası

bulunuyor.

Bu rapor bunların hukuki ihlal olduğunu ileri sürmez. Sorun, kullanıcıda resmî otorite veya kabul izlenimi yaratabilmeleridir.

Önerilen alternatifler:

- Teklifin kaynak ve inceleme kaydı
- Teknik ofis ihale çalışma alanı
- Kaynak bağlantılı metraj icmali
- İncelemeye hazır icmal

---

## 6. Görsel kimlik ve UI değerlendirmesi

### 6.1. Korunması gereken özellikler

- Mimari pafta yaklaşımı.
- Krem zemin ve koyu mürekkep ilişkisi.
- Kiremit/turuncu vurgu rengi.
- İnce çizgiler ve teknik cetvel hissi.
- Marka başlıklarında serif kullanımı.
- Sayısal veriler için düzenli tablo yaklaşımı.
- Açık ve koyu tema bütünlüğü.
- Sektöre özgü, hatırlanabilir karakter.

Bu kimlik büyük ölçüde korunabilir.

### 6.2. Pafta estetiği ile çalışma verimliliği dengelenmeli

Pazarlama sayfasındaki atmosfer, günlük kullanılan yoğun veri ekranlarına aynı ölçüde taşındığında okuma ve işlem yükü artabiliyor.

Çalışma ekranlarında öncelik:

- Seçili satır
- Eksik bilgi
- İnceleme durumu
- Kaynak
- Miktar
- Fiyat
- Sonraki adım

olmalı.

### 6.3. Küçük yazı yoğunluğu

Kodda ve canlı görünümde 10–11 px teknik etiketlerin, uppercase ve monospace kullanımının yaygın olduğu görüldü.

Teknik etiketler için bu dil uygun olabilir. Uzun açıklama, uyarı ve form yardımlarında okuma yükünü artırıyor.

Öneri:

- Gövde açıklamalarını normal sans yazıyla sunmak.
- Ana içerikte daha rahat okunan boyutlar kullanmak.
- Monospace’i kod, birim, kaynak kimliği ve sayısal hizalama gibi alanlarda sınırlamak.
- Büyük harfi kısa etiketlerle sınırlamak.

### 6.4. Çok sayıda çerçeve ve rozet

Kart, alt kart, uyarı kutusu, rozet ve teknik şeritler aynı ekran içinde sık kullanılıyor.

Bu, bütün bilgilerin benzer derecede önemli görünmesine neden oluyor.

Öneri:

- Ana sonucu en güçlü katmana almak.
- Eylem gerektiren uyarıyı ayrı göstermek.
- Teknik açıklamaları açılır detaylara taşımak.
- Her kutuyu eşit yoğunlukta çerçevelememek.

### 6.5. Eylem rengi ile durum rengi ayrımı

Marka turuncusu hem ana eylemlerde hem birçok teknik durum ve uyarıda kullanılıyor.

Kullanıcı bir rengin “devam et”, “dikkat et” veya “seçili” anlamlarından hangisini taşıdığını kolay ayırt edemeyebilir.

Renk yanında:

- Açık durum metni
- İkon
- Gerekçe
- Sonraki adım

bulunmalı.

### 6.6. Büyük dekoratif çizim ile ürün kanıtı

Ana sayfadaki izometrik çizim görsel kimliğe katkı sağlıyor.

Fakat ürünün asıl farkını sınırlı anlatıyor. Bir miktarın kaynak satırından teklif kalemine bağlandığı gerçek arayüz gösterimiyle desteklenmeli.

### 6.7. Mobil üst çubuk taşması

390 piksel görünümde üst menünün sağ kenarı yaklaşık 402 piksele ulaştı.

Aynı satırda:

- Logo
- Tema düğmesi
- Giriş
- Ücretsiz başla
- Menü

bulunuyor.

Öneri: mobil üst çubukta logo, tek ana eylem ve menü bırakmak.

Tablo içindeki kontrollü yatay kaydırma ile bütün sayfanın taşması ayrı sorunlardır.

### 6.8. Klavye erişimi

Kod incelemesinde “Şifrenizi mi unuttunuz?” bağlantısının `tabIndex={-1}` taşıdığı görüldü.

Bu bağlantı normal Tab sırasının dışında kalıyor.

Tam erişilebilirlik sertifikasyonu veya WCAG uygunluk değerlendirmesi yapılmadı. Bu bulgu belirli bir klavye erişim sorunudur.

---

## 7. Mevcut paketlerin ayrıntılı değerlendirmesi

### 7.1. İnceleme anındaki fiyat ve limitler

| Paket | Aylık taban fiyat | Teklif/ay | IFC/ay | Maksimum IFC | Teklif PDF üretimi/ay |
|---|---:|---:|---:|---:|---:|
| 14 günlük deneme | 0 TL | 3 | 1 | 25 MB | 3 |
| e-PYS & BIM Standart Denetçi | 1.250 TL | 5 | 5 | 35 MB | 8 |
| Teklif & Şantiye | 2.950 TL | 25 | 5 | 40 MB | 15 |
| 5D BIM & SmartCheck | 5.450 TL | 75 | 15 | 60 MB | 35 |
| Kurumsal Taahhüt & e-PYS | 8.900 TL | 200 | 35 | 85 MB | 75 |

Fiyatlar kayıt ekranında KDV hariç olarak sunuluyor.

Ödeme dönemleri:

- Aylık
- 6 aylık, %10 indirim
- 1 yıllık, %20 indirim
- 2 yıllık, %30 indirim

Varsayılan görünüm yıllık.

Yıllık görünümde aylık eşdeğer fiyatlar sırasıyla:

- Denetçi: 1.000 TL
- Teklif & Şantiye: 2.360 TL
- 5D BIM & SmartCheck: 4.360 TL
- Kurumsal: 7.120 TL

### 7.2. İsimlendirme eksenleri karışıyor

- Deneme: süre
- Denetçi: meslek/görev
- Şantiye: kullanım ortamı
- 5D: teknoloji
- SmartCheck: modül
- Kurumsal: şirket ölçeği
- e-PYS: mevzuat/teslim bağlamı

Bu yapı kullanıcıya tek bir yükseltme yolu göstermiyor.

### 7.3. Kart sırası karşılaştırmayı zorlaştırıyor

Canlı sıralamada:

1. Deneme
2. Kurumsal
3. Denetçi
4. Teklif & Şantiye
5. 5D BIM & SmartCheck

görülüyor.

Bu sıra fiyat veya olgunluk açısından doğal ilerleme oluşturmuyor.

### 7.4. Beş kart ve dört ödeme dönemi fazla karar üretiyor

Kullanıcı ürünün kendisine uygunluğunu anlamadan uzun süre, indirim, kapasite ve modül karşılaştırmasına giriyor.

İlk aşamada aylık ve yıllık seçenekler yeterli olabilir. İki yıllık taahhüt, güçlü kullanım ve güven kanıtı oluştuktan sonra değerlendirilmelidir.

### 7.5. Kartlar değer yerine altyapı kapasitesini öne çıkarıyor

Vitrinde görünen temel farklar:

- Teklif sayısı
- IFC sayısı
- Dosya boyutu
- Eşzamanlı kuyruk

Bunlar gerekli sınırlar olabilir, ancak müşteri önce tamamlayacağı işi anlamak ister.

Açıklanması gerekenler:

- Kullanıcı sayısı
- İnceleme ve onay rolleri
- Firma fiyat kataloğu
- Revizyon davranışı
- Paylaşım
- Çıktı türleri
- Destek
- Kurulum
- Kapsam dışında kalan işler

Yalnız gerçekten desteklenen özellikler yazılmalıdır.

### 7.6. PDF üretim sınırı önemli bir sürpriz riski

Teklif & Şantiye planında 25 teklif hakkına karşılık 15 başarılı teklif PDF üretim işlemi sınırı bulunuyor.

Kod, benzersiz teklif sayısını değil PDF üretim işlemlerini sayıyor. Aynı teklif için başarılı yeniden PDF üretimi de sayaç tüketebilir.

Bu davranış kullanıcıya açıklanmalı veya normal revizyon işini cezalandırmayacak biçimde yeniden tasarlanmalı.

### 7.7. PDF üretimi ve PDF/A ön kontrolü ayrı sayaçlar

Aynı `monthlyPdfLimit` ayarı iki farklı alanda kullanılıyor:

1. Teklif PDF üretimi
2. Yüklenen PDF/A dosyasının ön kontrolü

Sayaçlar ayrı.

Dolayısıyla “15 PDF ortak kota” ifadesi doğru değildir.

Doğru ifade:

> Teklif PDF üretimi ve PDF/A ön kontrolü için ayrı ayrı aynı sayısal sınır kullanılıyor.

Bu ayrım hem fiyat kartında hem kullanım ekranında anlaşılır olmalı.

### 7.8. Diğer limitler vitrinde görünmüyor

Kodda AI, CRM, mevzuat, kârlılık, depolama ve belge sınırları da mevcut.

Kritik limitlerin satın alma öncesinde erişilebilir bir karşılaştırma tablosunda bulunması gerekir.

### 7.9. “En çok tercih edilen” iddiası

Bu rozeti destekleyen satış verisi doğrulanmadı.

Veri yoksa:

> Teknik ofis ekipleri için önerilen

ifadesi daha doğru olur.

### 7.10. KDV ve peşin tutar açıklaması

Aylık fiyat, aylık eşdeğer, peşin toplam ve KDV ilişkisi bütün yüzeylerde aynı açıklıkta sunulmalı.

Örneğin:

> Aylık eşdeğer: X TL + KDV. Yıllık peşin toplam: Y TL + KDV.

### 7.11. Paket verisi yüklenemediğinde eski açıklama riski

Kod incelemesinde kayıt ekranının public plan API’si yüklenemezse sabit plan açıklamalarına dönebildiği görüldü.

Bu açıklamaların bir kısmı güncel katalogdan farklı veya daha iddialı.

Bu sürekli görülen canlı bir hata olarak doğrulanmadı; başarısız API durumuna ilişkin kod riskidir.

Öneri: fiyat veya özellik verisi yüklenemediğinde açık hata ve yeniden deneme göstermek; eski ticari vaadi sessizce sunmamak.

---

## 8. Önerilen paket mimarisi

### 8.1. Üç ana kademe

| Paket | Kullanıcı | Temel sonuç |
|---|---|---|
| Teklif | Küçük teknik ofis ve uzman taşeron | Excel veya manuel kalemlerden düzenli teklif hazırlamak |
| Teknik Ofis | Düzenli IFC/Excel işi yapan ekip | Kaynak, miktar incelemesi, fiyat ve teklif sürecini birlikte yönetmek |
| Kurumsal | Çok ekipli ve yüksek hacimli kullanım | Tanımlı kapasite, erişim sorumlulukları ve destekle ortak çalışma |

Bu tablo uygulanmış özellik taahhüdü değildir.

### 8.2. Deneme bir edinim yolu olmalı

Deneme, ana paket merdiveninin bir ürünü gibi sunulmak yerine:

- Hangi işi deneyebilirsiniz?
- Ne kadar süre?
- Hangi dosya sınırı?
- Ne kadar destek?
- Süre sonunda ne olur?

sorularına cevap vermeli.

### 8.3. e-PYS ayrı uzmanlık kapsamı olabilir

Ruhsat ve teslim ön kontrolü müşterisinin işi, sürekli teklif hazırlayan teknik ofisin işinden farklı olabilir.

Talep doğrulanırsa e-PYS:

- Uzmanlık eklentisi
- Belirli proje paketi
- Ayrı kontrollü pilot

olarak değerlendirilebilir.

### 8.4. Fiyat kararından önce ölçülmesi gerekenler

- Gerçek dosyanın işleme maliyeti
- Destek için harcanan süre
- İnceleme ve kurulum ihtiyacı
- Kullanıcının tamamladığı teklif sayısı
- İkinci projede tekrar kullanım
- Ödeme isteği
- Paket yükseltme nedeni

Mevcut fiyatların pahalı veya ucuz olduğuna dair yeterli kanıt bulunmuyor.

Önce fiyatı düşürmek yerine satın alma gerekçesi ve kapsam sadeleştirilmeli.

---

## 9. Kayıt ve ödeme deneyimi

### 9.1. Ücretsiz başlama niyeti yeniden paket seçimine dönüşüyor

“14 gün ücretsiz başlayın” düğmesinden gelen kullanıcı kayıt ekranında beş paket ve dört ödeme dönemiyle tekrar karşılaşıyor.

Masaüstünde paket seçimi geniş yer kaplıyor. Dar ekran akışında paket listesi hesap formundan önce geliyor.

Önerilen akış:

> Denemeyi seç → kısa hesap formu → örnek proje veya dosya türü → ilk anlamlı sonuç.

Plan değiştirme ikincil bir bağlantı olabilir.

### 9.2. Ücretli aktivasyon beklentisi

Kodda ücretli plan etkinleşmesi havale/EFT ve ödeme onayına bağlı.

Bu erken B2B satış için uygun olabilir. Ancak “Paketi Seç & Başla” ifadesi anında etkinleşme beklentisi yaratabilir.

Ödeme adımları ve tahmini onay süresi satın alma öncesinde açıklanmalıdır.

### 9.3. Müşteriye dönük dil

“Superadmin”, “tenant”, “snapshot” gibi uygulama içi terimler müşteri akışında kullanılmamalı.

Örneğin:

> Ödemeniz onaylandıktan sonra paketiniz etkinleşir.

### 9.4. Güven unsurları

Açık olması gerekenler:

- Deneme süresi sonunda ne olur?
- Otomatik tahsilat var mı?
- Veriler erişilebilir kalır mı?
- Çıktılar indirilebilir mi?
- Kota ne zaman yenilenir?
- Başarısız işlem kotadan düşer mi?
- Destek nasıl alınır?

Bu raporda bunların bütün ticari ve teknik davranışları doğrulanmadı.

---

## 10. Kamuya açık SmartCheck demosu

### 10.1. Güçlü taraf

Demo aynı yerde şunları gösteriyor:

- Bulgu
- Mevcut değer
- Beklenen değer
- Kaynak
- Kural türü
- Düzeltme önerisi

Bu, kaynak ve inceleme fikrini anlatmak için iyi bir temel.

### 10.2. Başlangıç yanlış aşamadan yapılıyor

İlk belirgin eylem:

> Yeniden Kontrolü Tetikleyin.

Kullanıcı neyi kontrol ettiğini ve ilk kontrolün ne olduğunu anlamadan yeniden kontrol aşamasına geliyor.

Önerilen sıra:

1. Örneğin problemi anlatılsın.
2. Kaynak satırı gösterilsin.
3. Kullanıcı bulguyu incelesin.
4. Önerilen düzeltmeyi değerlendirsin.
5. Sonuç ve teklif üzerindeki etkisi gösterilsin.

### 10.3. Demo ile gerçek kullanım ayrımı

“Doğrulanmamış Demo” gibi durum etiketleri olumlu.

Ancak demo sonunda kullanıcının gerçek iş akışına nasıl geçeceği daha açık olmalı.

### 10.4. Birim değişikliği örneği

m² → m³ örneği yalnız birim etiketini değiştirerek miktar sorununu çözmek gibi algılanmamalı.

Hangi miktarın, kaynağın veya eşleştirmenin düzeltildiği açıklanmalı.

### 10.5. Dil tutarlılığı

Türkçe arayüzde `ERROR`, `CRITICAL`, `WARNING` ve İngilizce modül adları görülüyor.

Öneri:

- Hata
- Kritik
- Uyarı
- Teknik ayrıntılar

Teknik kodlar ayrıca gösterilebilir.

### 10.6. Geri dönüş yolu

Kamuya açık demo içindeki “SmartCheck Genel Bakış” bağlantısı uygulama içi `/app/smartcheck` yoluna yöneliyor.

Oturum açmamış kullanıcı için bu, beklenmedik giriş ihtiyacına dönüşebilir.

Kamuya açık demo, ana sayfaya veya açıklanmış bir kayıt adımına dönüş yolu sunmalı.

---

## 11. Son kullanıcı ana paneli

### 11.1. Panel, günlük iş ekranından çok ürün tanıtımı gibi davranıyor

Başlık:

> İhale & Metraj Masası

Açıklama:

> Aktif teklifleriniz, metraj hacminiz ve finansal özetiniz.

Fakat incelenen hesapta ana içerik:

- Arsa ve ön fizibilite
- IFC metraj
- Taşeron hakediş

olmak üzere üç kapsamlı tanıtım kartından oluşuyor.

İlk kullanımda açıklama verilmesi olumlu. Ancak günlük çalışma panelinde öncelik kullanıcının mevcut işine devam etmek olmalı.

### 11.2. Tekrarlanan eylemler

Aynı panelde:

- Üst çubukta Yeni Teklif Hazırla
- Sayfa başlığında Manuel Teklif
- Yönlendirme kutusunda Manuel Teklif
- Sayfa başlığında SmartCheck & IFC Yükle
- Yönlendirme kutusunda SmartCheck Dosya Yükle
- IFC kartında 3D IFC Dosyası Yükle

bulunuyor.

Aynı hedefe giden tekrarlar karar kolaylığı sağlamıyor; seçenek sayısı algısını artırıyor.

### 11.3. Hızlı tur dört yerde görünüyor

- Sol alt menü
- Üst çubuk
- Sayfa başlığı
- Sağ alt sabit düğme

Yardımın bulunabilirliği iyi, fakat bu kadar tekrar gereksiz.

Öneri:

- Tek kalıcı yardım noktası
- İlk kullanımda kısa görev rehberi
- Kullanıcının ihtiyacına göre bağlamsal açıklama

### 11.4. Üç yaşam evresi yerine eldeki kaynağı sormak

Mevcut soru:

> Hangi aşamada işlem yapmak istiyorsunuz?

Önerilen soru:

> Nereden başlayacaksınız?

Seçenekler:

- Excel/CSV metrajım var
- IFC modelim var
- Kalemleri kendim gireceğim
- Örnek projeyi inceleyeceğim

Bu seçim doğrudan ilgili akışı açmalı.

### 11.5. Eksik günlük çalışma öğeleri

Önerilen panelde:

- Son çalışılan dosyalar
- İnceleme bekleyen kalemler
- Fiyatı eksik kalemler
- Son teklifler
- Başarısız işlemler
- Deneme bitişi ve kalan kullanım

gibi kullanıcıya ait durumlar öne çıkmalı.

Bunlar mevcut bütün hesaplarda yok iddiası değildir; incelenen başlangıç ekranı için öneridir.

### 11.6. Sabit durum şeritleri

“İhale masası aktif” ve “Kanıtlı Metraj & Fiyat Kataloğu” gibi şeritler kullanıcıya durum hissi veriyor.

Ancak bu hesapta fiyat kaydı yokken “kanıtlı fiyat kataloğu” ifadesi veri hazırmış gibi algılanabilir.

Durum şeridi gerçek çalışma alanını yansıtmalı:

> Firma fiyat kataloğu henüz eklenmedi.

### 11.7. Deneme durumu yeterince eyleme dönük değil

Sol altta 14 günlük deneme etiketi bulunuyor fakat dar alanda kesilebiliyor.

Önerilen bilgi:

- Deneme bitiş tarihi veya kalan gün
- Kalan analiz hakkı
- Paket ayrıntılarına bağlantı

Bu bilgiler yükseltme baskısından önce kullanıcının planlamasına hizmet etmeli.

---

## 12. Yeni teklif ekranı

### 12.1. Excel bağlantısı doğru başlangıç durumunu açmıyor

Paneldeki “Excel / Cetvelden Teklif Al” bağlantısı genel yeni teklif ekranına gidiyor.

Bu ekranın üstünde AI sihirbazı var. Excel aktarımı daha aşağıda bulunuyor.

Öneri: kaynak seçimine göre ekranın ilgili bölümü seçili açılsın.

### 12.2. AI fiyat mesajı ürünün kaynak politikasından ayrışıyor

Canlı metin:

> Birim fiyatlar piyasa verilerine göre AI asistanı tarafından hesaplanır.

Aynı ekranda ve yardım içeriklerinde:

- Kaynakların incelenmesi
- Geçerlilik kontrolü
- Manuel teyit
- Fiyatın tahmin edilmemesi

vurgulanıyor.

Bu mesajlar aynı fiyat davranışını açık biçimde anlatmıyor.

Bu incelemede AI çıktısı üretilmedi. Dolayısıyla AI’ın gerçekten hangi fiyatları verdiği hakkında sonuç çıkarılmıyor.

Önerilen mesaj:

> AI, iş kalemi ve açıklama taslağı hazırlamanıza yardımcı olur. Miktar ve fiyatlar kaynaklarıyla birlikte ayrıca incelenmelidir.

### 12.3. İç sistem değerleri kullanıcıya görünüyor

Canlı alanlarda:

- `residential`
- `none`
- `standard`

gibi değerler görülüyor.

Önerilen karşılıklar:

- Konut
- Seçilmedi / Ek bilgi teslimi yok
- Standart tedarik

Teknik değerler sistemde korunabilir, kullanıcı etiketleri yerelleştirilmeli.

### 12.4. İlk teklif için fazla gelişmiş alan var

İlk ekranda:

- Bilgi teslimi
- Teslim maliyeti
- Tedarik profili
- Karbon risk primi
- Süre
- Aylık volatilite

bulunuyor.

Öneri:

Temel görünüm:
- Müşteri
- Proje adı
- Para birimi
- Kalemler
- Miktar
- Satış fiyatı
- Maliyet
- Vergi
- Toplam

Gelişmiş görünüm:
- Risk senaryoları
- Bilgi teslimi
- Karbon varsayımı
- Eskalasyon
- Diğer şirket katsayıları

### 12.5. Tablo genişliği ve okunabilirlik

İş kalemi tablosunda çok sayıda sütun var. Sağdaki genel bilgiler paneli de tablo alanını daraltıyor.

Öneri:

- Temel sütunlarla başlamak
- Diğer alanları satır detayına almak
- Tabloya odaklanma görünümü sunmak
- Sayısal hücreleri rahat düzenlenebilir boyutta göstermek
- Kaynak ve durum bilgisini kalemle ilişkilendirmek

### 12.6. Onaylı rayiç bulunmadığında sonraki adım yok

“Onaylı Rayiçleri Gör (0 Kalem)” gösteriliyor.

Kullanıcı için gerekli sonraki adım:

> Henüz firma fiyat kaydı yok. Fiyat listenizi ekleyin veya ilgili kişiden katalog hazırlamasını isteyin.

Kaynak yönetimine doğrudan bağlantı verilmesi önerilir.

### 12.7. Profesyonel ipucunun bağlamı

AI’a %5–8 pazarlık payı ekletme önerisi görülüyor.

Bu öneri kullanıcının maliyet yapısı, marjı ve ticari politikası bilinmeden evrensel tavsiye gibi algılanabilir.

Daha uygun yaklaşım:

> İndirim ve pazarlık payını kendi maliyet ve marj hedefinize göre belirleyin.

---

## 13. SmartCheck yükleme ve sonuç ekranı

### 13.1. Dosya seçimi ve örnekler olumlu

- IFC, Excel/CSV ve PDF seçimi açık.
- Revit ön kontrol rehberi bulunuyor.
- Örnek paftaların kotadan düşmediği belirtiliyor.
- Son işlenen dosyalar listeleniyor.
- Başarılı dosyada “İcmali Aç” var.
- Hatalı dosyada “Yeniden Dene” var.

Bunlar korunmalı.

### 13.2. “Resmî İcmal Paftası” ifadesi fazla güçlü

Yükleme başlığı:

> Proje Dosyanızı Yükleyin ve Resmi İcmal Paftası Üretin.

Ürünün pilot ve inceleme gerektiren yapısıyla birlikte düşünüldüğünde:

> Kaynak bağlantılı metraj icmali oluşturun.

daha uygun olur.

### 13.3. Arsa fizibilitesi aynı ekrana fazla yük bindiriyor

Dosya yükleme ekranının altında ayrıntılı arsa, TAKS–KAKS ve daire paylaşımı formu bulunuyor.

Bu form mevcut IFC sonucu açıldığında da aşağıda durmaya devam ediyor.

Sonuç:

- Birden fazla iş aynı sayfada yarışıyor.
- Ekran çok uzuyor.
- Kullanıcı hangi formun mevcut dosyayla ilişkili olduğunu anlamakta zorlanabiliyor.

Öneri: arsa fizibilitesini ayrı araç veya ayrı sekme olarak sunmak.

### 13.4. Kullanıcı başlamadan hata mesajı görülüyor

Boş arsa formunda:

- Arsa alanı pozitif olmalı.
- TAKS belirli aralıkta olmalı.
- KAKS pozitif olmalı.
- Geçersiz parseller toplamlara dahil edilmedi.

mesajları görünüyor.

Kullanıcı formu kullanmaya başlamamışken hata üretmek, gereksiz başarısızlık hissi oluşturur.

Öneri: başlangıçta açıklayıcı boş durum; alanla etkileşim veya hesaplama denemesinden sonra doğrulama mesajı.

### 13.5. Sonucun en güçlü bölümü: “Bu sayı nasıl oluştu?”

Mevcut IFC sonucunda seçili kalem için:

- Bir eleman bulunduğu
- Bir katta olduğu
- Miktarın IFC özelliğinden okunduğu
- Kaynak QTO alanı
- Net miktar

adım adım gösteriliyor.

Bu özellik ürünün marka vaadinin somut karşılığıdır.

Ana sayfa ve demo sunumunda daha görünür kullanılmalı.

### 13.6. Üst başarı ifadesi ile alt açıklama çelişiyor

Üst başlık:

> Katmanlar ve minha doğrulandı.

Aynı sonuçta:

> Modelde çoklu katman bilgisi yok.

Seçili kalemin detayında:

> Bu kayıtta kapı/pencere listesi yok ... Eşik bu nedenle uygulanamadı.

görülüyor.

Bu, mutlaka hesap hatası anlamına gelmez. Fakat sonuç etiketleri eldeki kanıttan daha kapsamlı bir başarı izlenimi veriyor.

Öneri: her kontrolün durumunu ayrı üretmek:

- Katman bilgisi: bulunamadı
- Miktar kaynağı: IFC NetArea
- Minha değerlendirmesi: uygulanamadı / veri eksik
- İnceleme: bekliyor

### 13.7. “Boşluk yok” ile “boşluk bilgisi yok” ayrılmalı

Bir açıklamada “Bu kalemde düşülecek boşluk yok” denirken başka açıklamada kapı/pencere listesinin bulunmadığı belirtiliyor.

Bu iki durum aynı değildir:

1. Veriler incelendi, düşülecek boşluk yok.
2. Boşluk bilgisi bulunamadı, kontrol yapılamadı.

İkinci durumda “yok” yerine “belirlenemedi” veya “değerlendirilemedi” denmeli.

### 13.8. Yüzde 100 eşleşme, yüzde 100 doğrulama gibi algılanmamalı

Kapsama kartında üç elemanın üçünün ölçüldüğü ve poza eşleşme oranının %100 olduğu görülüyor.

Bu faydalı bir kapsam göstergesidir. Fakat:

- Fiyatın bulunduğu
- Minha kontrolünün tamamlandığı
- Uzman onayı verildiği
- Teklifin hazır olduğu

anlamına gelmez.

Aynı dosyada maliyet sekmesinde 0/2 kanıtlı fiyat bulunuyor.

Öneri: miktar kapsamı, poz eşleşmesi, fiyat kapsamı ve inceleme durumunu ayrı göstermek.

### 13.9. Sonuç olmayan daire bilgisi

“0 daire” ve “— m²” gösteriliyor.

Bu durum gerçekten sıfır daire ile dosyadan daire bilgisi çıkarılamaması arasında ayrım yapmalı.

Öneri:

> Bu dosyada daire/mahal cetveli oluşturmak için yeterli bilgi bulunamadı.

Yalnız gerçekten sıfır olduğu biliniyorsa sıfır gösterilmeli.

---

## 14. Maliyet ve teklife aktarım

### 14.1. Fiyatı bulunmayan kalemler sıfır gösteriliyor

İki kalem için fiyat kanıtı yok. Buna rağmen:

- Kalem tutarı 0 TL
- Grup toplamı 0 TL
- Genel toplam 0 TL
- Daire başı 0 TL

görünüyor.

“Bilinmiyor” ile “sıfır” farklıdır.

Öneri:

- Birim fiyat: “Eksik”
- Tutar: “Hesaplanmadı”
- Genel toplam: “2 kalem fiyat bekliyor”
- Fiyatlandırılmış kapsam: “0/2 kalem”

Kısmi toplam gösterilecekse açıkça “yalnız fiyatlandırılmış kalemlerin toplamı” denmeli.

### 14.2. Düzenlenebilirlik mesajı tutarsız

Ekranda:

> Birim fiyat kutuları düzenlenebilir.

yazıyor.

Alan yardımında ise:

> Birim fiyat yalnız onaylı fiyat snapshot kaydından gelir. Manuel fiyatı kaynak kataloğu iş akışında kaydedin.

deniyor.

Alanları değiştirerek test yapılmadı. Ancak açıklamalar kendi içinde tutarsız.

Öneri:

- Doğrudan düzenleme mümkünse kaynağı ve onay sonucunu anlat.
- Doğrudan düzenleme mümkün değilse “Fiyat kaynağını seç” veya “Kataloğa fiyat ekle” eylemi göster.

### 14.3. Yeni teklif çağrısı mevcut teklif zorunluluğuna dönüşüyor

Başlangıç eylemi:

> Fiyatlandır & Teklif Oluştur.

Maliyet sekmesinde ise:

> Aktarım için önce mevcut bir teklif oluşturulmalıdır.

açıklaması var.

Kullanıcı dosyasından ilk teklifini oluşturmak isterken başka bir ekranda önceden teklif açmak zorunda kalıyor.

Öneri:

- Yeni teklif oluştur
- Mevcut teklife yeni revizyon ekle

seçeneklerini açıkça ayırmak.

Kaynak ve revizyon güvenliği korunarak, yeni teklif gereken durumda bağlamı kaybetmeyen yönlendirme yapılmalı.

### 14.4. Sistem terminolojisi son kullanıcıya taşmış

Görülen ifadeler:

- Tenant
- Snapshot
- Calm
- Ardıl revizyon
- Canonical/kanonik geçmiş
- Hash kanıtları
- `source/rule/result/code`

Bu bilgiler uzman ayrıntılarında faydalı olabilir. Ana görev metni bunları anlamayı gerektirmemeli.

### 14.5. Teklif ekranında çok fazla ikincil araç

Aynı maliyet alanında:

- KİK sınır değer
- Pareto
- CDE
- LOIN
- Revizyon kodu
- Teslim aşaması
- TÜİK endeksi
- Fiyat farkı

bulunuyor.

Öneri: ilk teklif oluşturma görevini tamamlatmak; ilgili araçları proje türüne veya kullanıcı seçimine göre açmak.

---

## 15. Aynı işe giden farklı yollar

### 15.1. IFC için birden fazla başlangıç var

- SmartCheck & IFC Yükle
- 3D IFC Dosyası Yükle
- Hızlı IFC Ayrıştırıcı
- Yeni teklif ekranındaki 5D IFC Metraj Yükle
- Teklifler listesindeki 3D IFC ile Teklif Hazırla

Bu yolların amacı kullanıcıya açık biçimde ayrılmıyor.

### 15.2. Teklifler listesindeki bağlantı ayrı ön incelemeye gidiyor

“3D IFC ile Teklif Hazırla” bağlantısı `/app/dosyadan-teklif-demo` ekranına gidiyor.

Ekran:

- 25 MB’a kadar ön inceleme
- Büyük dosyalar için SmartCheck
- Miktarların teknik onay beklemesi
- Örnek fiyatların doğrulama beklemesi

açıklamalarını gösteriyor.

Dosya yüklenmediği için devamındaki davranış doğrulanmadı.

Öneri:

- Tek bir ana dosyadan teklif girişi.
- Hızlı ön inceleme gerekiyorsa açık isimlendirme.
- Demo fiyatları ile gerçek firma fiyatları arasındaki farkın belirgin olması.
- Kullanıcının farklı işlem motorlarını seçmek zorunda kalmaması.

### 15.3. Navigasyon görev adlarıyla sadeleşmeli

Önerilen üst seviye yapı:

- Genel Bakış
- Projeler / Dosyalar
- Metraj ve Kontroller
- Teklifler
- Firma Fiyatları
- Müşteriler
- Raporlar
- Araçlar
- Ayarlar

Bu öneri bütün sayfaların hemen yeniden yapılması anlamına gelmez. Önce kavramlar ve hedef yollar tutarlı hale getirilmeli.

---

## 16. CRM

### 16.1. Canlı yükleme hatası

Müşteriler ekranında:

> CRM verileri yüklenemedi.

mesajı görüldü.

“Tekrar dene” bir kez kullanıldı ve hata tekrarlandı.

Bu, boş müşteri listesi olarak değerlendirilmemeli. Gerçek bir yükleme başarısızlığı gözlendi.

Kök neden bu incelemede belirlenmedi.

### 16.2. Hata durumunun iyileştirilmesi

Önerilen hata durumu:

- Hangi verinin yüklenemediği
- Kullanıcının kayıtlarının silinmediğinin ancak doğrulanabiliyorsa açıklanması
- Yeniden deneme
- Destek veya hata referansı
- İlgili diğer işlere dönüş

Yeni fırsat düğmesi hata ekranında görünmeye devam ediyor. Bu düğmenin güvenli ve anlamlı davranışı ayrıca test edilmeli; bu incelemede tıklanmadı.

### 16.3. Menü adı ile sayfa odağı farklı

Menü:

> Müşteriler (CRM)

Sayfa:

> Müşteriler & Fırsatlar

İlk sekmeler:

- Fırsatlar
- Lead havuzu

Teklif hazırlayan kullanıcı “müşteri eklemek” isterken satış fırsatı yönetimiyle karşılaşabilir.

Öneri: müşteri kaydı ve satış fırsatı yönetimini kavramsal olarak ayırmak.

---

## 17. Piyasa verisi ve firma fiyat hafızası

### 17.1. Kaynak koşullarının görünür olması güçlü

Ekran:

- Tedarikçi
- Bölge
- Teslim koşulu
- Geçerlilik tarihi
- Kaynak dosya
- İnsan incelemesi

bilgilerini ilişkilendiriyor.

Bu, ürünün kaynak esaslı fiyat yaklaşımını destekliyor.

### 17.2. Teknik dil yoğun

Görülen ifadeler:

- Kaynak hash’i
- Reviewer
- `supplier_quote`
- `company_actual`
- Snapshot
- Outlier
- Baseline count

Önerilen kullanıcı dili:

- Kaynak dosya
- İnceleyen kişi
- Tedarikçi fiyatı
- Firma gerçekleşen maliyeti
- Kayıtlı fiyat sürümü
- Olağandışı fiyat
- Karşılaştırılan kayıt sayısı

### 17.3. Boş durum ilk görevi anlatmalı

“Henüz tedarikçi teklifi yok” mesajı var.

Daha yararlı boş durum:

> İlk firma fiyat listenizi ekleyin. İncelenen fiyatlar, metraj kalemlerinizi fiyatlandırırken kullanılacak.

Ardından:

1. Örnek şablonu indir.
2. Fiyat dosyasını seç.
3. Alanları eşleştir.
4. Geçerlilik ve birimleri incele.
5. Kataloğa kaydet.

Bu akışın bütün adımları mevcut veya test edilmiş kabul edilmemelidir; önerilen deneyimdir.

### 17.4. Fiyatı eksik icmalden buraya köprü kurulmalı

Maliyet ekranında fiyat bulunamadığında yalnız uyarı göstermek yeterli değil.

Doğrudan:

- Firma fiyatı ekle
- Mevcut fiyatı eşleştir
- İnceleme iste

gibi uygulanabilir seçenekler sunulmalı.

---

## 18. Uygulama içi kullanım ve paket ekranı

### 18.1. Kullanım kartları mevcut

Deneme hesabında AI, PDF, teklif, CRM, mevzuat, kârlılık ve IFC için ayrı kullanım kartları görüldü.

Limitlerin uygulama içinde görünmesi olumlu.

### 18.2. “Tahmini işlem maliyeti” müşteri açısından belirsiz

Kartlarda USD cinsinden tahmini işlem maliyeti ve bunun fatura veya tahsilat olmadığı açıklaması bulunuyor.

Müşteri şu soruyu sorabilir:

> Abonelik ücretine ek bir kullanım bedeli mi ödeyeceğim?

Bu bilgi müşterinin vereceği karara hizmet etmiyorsa yönetim ekranına taşınmalı.

Son kullanıcıya öncelikle:

- Dahil kullanım
- Kullanılan miktar
- Kalan hak
- Yenilenme tarihi
- Aşım davranışı

gösterilmeli.

### 18.3. PDF/PDF-A birleşik etiket

Kullanım ekranında “PDF / PDF-A Çıktısı” başlığı görülüyor.

Kod incelemesinde teklif PDF üretimi ile PDF/A ön kontrolünün ayrı sayaçlar olduğu anlaşılmıştı.

Bu nedenle ekran etiketleri gerçek ölçülen işlemi açıkça belirtmeli.

### 18.4. Mevcut IFC dosyası ile sayaç ilişkisi

Hesapta tamamlanmış bir IFC kaydı görülmesine rağmen kullanım ekranında IFC 0/1 gösteriliyordu.

Bu tek başına sayaç hatası kanıtı değildir. Dosyanın örnek kayıt olması, farklı dönem veya başka sayaç davranışı gibi açıklamalar olabilir.

Öneri: hangi işlemlerin kotadan düştüğünü ve örneklerin hariç olup olmadığını açıkça anlatmak; sayaç tutarlılığını ayrı test etmek.

### 18.5. Ödeme yöntemi uygulama içinde daha açık

Havale/EFT kullanıldığı ve kartla ödemenin henüz yayında olmadığı açıkça yazıyor.

Bu açıklık kamuya açık paket ve kayıt akışında da korunmalı.

Banka veya alıcı bilgilerinin doğruluğu bu incelemede değerlendirilmedi; rapora hassas ödeme ayrıntıları alınmadı.

---

## 19. Kârlılık ve yardım ekranları

### 19.1. Kârlılık boş durumu olumlu

Ekranda:

> Henüz kârlılık verisi yok.

ve:

> Bir teklif kazanıldı veya kaybedildi olarak işaretlendiğinde burada görünecek.

açıklaması var.

Tekliflere dönüş eylemi de sunuluyor.

Bu, boş durumun ne zaman dolacağını açıklayan iyi bir örnek.

### 19.2. Kârlılık adı ile hacim özeti ayrımı

Açıklamada kazanılan/kaybedilen teklif hacim özetinden söz ediliyor; marjın maliyet verisi tam olan teklif detayında gösterildiği belirtiliyor.

Bu ayrım doğru yönde. Kullanıcı “kârlılık analizi” açtığında gerçek maliyet ve marj bekleyeceğinden, raporun hangi bölümünün satış hacmi, hangisinin kâr olduğunu netleştirmek gerekir.

### 19.3. “Nasıl Çalışır?” sayfasının güçlü tarafı

- Formül ve kaynak açıklamaları
- Şirket politikası ile normatif dayanak ayrımı
- Ön hesap ve resmî uygunluk ayrımı
- Geri bildirim kanalı
- Modül bazlı açıklamalar

bulunuyor.

Bu içerik güven ve uzman değerlendirmesi için değerli.

### 19.4. Başlangıç rehberi ile yöntem belgesi ayrılmalı

Mevcut sayfa teknik yöntem belgesine yakın.

Yeni kullanıcı ise:

> İlk dosyamı nasıl yüklerim ve ilk teklifimi nasıl oluştururum?

sorusunun cevabını arıyor.

Öneri:

- İlk teklifinizi hazırlayın: kısa görev rehberi.
- Hesaplama yöntemleri: ayrıntılı teknik kaynak.
- Sık karşılaşılan sorunlar: işlemi sürdürmeye yönelik yardım.

### 19.5. Sayfa başlığı güncellenmiyor

Firefox’ta giriş sonrası farklı uygulama sayfalarında bir süre “Giriş Yap” başlığının kaldığı görüldü. Tam sayfa yüklemesinden sonra genel marka başlığına döndü.

Sayfa başlığı mevcut görevi yansıtmalı:

- Genel Bakış — BIMMetraj
- Yeni Teklif — BIMMetraj
- SmartCheck — BIMMetraj

Bu, çok sekmeli çalışma ve erişilebilirlik açısından önemlidir.

### 19.6. İçeriğe geç bağlantısında rota kalıntısı

Erişilebilirlik ağacında, sayfa değiştikten sonra “İçeriğe geç” bağlantısının önceki rota yolunu koruduğu görüldü.

Bağlantıya tıklanarak davranış testi yapılmadı.

Bu nedenle doğrulanmış gezinme hatası değil, kontrol edilmesi gereken bir bağlantı hedefi bulgusudur.

---

## 20. Önerilen ana ürün deneyimi

### 20.1. Tek ortak akış

Kaynak seçimi
    ↓
Dosya ve miktar incelemesi
    ↓
Eksik veya çelişkili kalemlerin değerlendirilmesi
    ↓
Firma fiyatlarıyla eşleştirme
    ↓
Teklif oluşturma veya mevcut teklife revizyon
    ↓
Önizleme ve çıktı

### 20.2. Durum modeli

Aşağıdaki durumlar ayrı gösterilmeli:

- Kaynak okundu
- Miktar bulundu
- Kontrol uygulanamadı
- İnceleme bekliyor
- Kapsam dışında
- Fiyat eksik
- Fiyat eşleşti
- Teklife aktarılabilir

“Analiz tamamlandı” bütün bu durumların tamamlandığı anlamına gelmemeli.

### 20.3. Sonuç ekranının önerilen özeti

Örnek bir sunum:

> Dosya okundu.  
> 3 elemandan 2 icmal kalemi oluşturuldu.  
> 2 kalem fiyat bekliyor.  
> Minha kontrolü için boşluk bilgisi bulunamadı.  
> Sonraki adım: fiyatları eşleştirin ve kontrol kapsamını inceleyin.

Bu örnek mevcut dosyanın görülen durumlarını anlaşılır bir sıraya koyar; mühendislik kabulü iddiası içermez.

### 20.4. Yeni kullanıcı ve deneyimli kullanıcı ayrımı

Yeni kullanıcı:

- Örnek proje
- Kısa rehber
- Dosya seçimi
- Temel alanlar
- Açıklamalı durumlar

Deneyimli kullanıcı:

- Son dosyaya devam
- İnceleme kuyruğu
- Hızlı filtreler
- Kalem tablosu
- Kısayollar
- Ayrıntılı kanıt görünümü

Aynı uzun tanıtım ekranı her ziyarette ana deneyim olmamalı.

### 20.5. Mobil kullanım hedefi

Telefonda masaüstündeki bütün tablo düzenleme işini tekrar etmek zorunlu değil.

Öncelikli mobil görevler:

- İşlem durumunu görmek
- Hata nedenini okumak
- İnceleme bekleyen kalemi görmek
- Yetkiliyse karar vermek
- Teklif önizlemesini açmak
- Ekipten gelen güncellemeyi takip etmek

Geniş tablo ve karmaşık düzenleme masaüstünde optimize edilebilir.

---

## 21. Ürün ve satış sunumu biçimi

### 21.1. Ana sayfa hikâyesi

1. Teknik ofisin sorunu.
2. BIMMetraj’ın tamamladığı iş.
3. Gerçek arayüzde bir kalemin yolculuğu.
4. Kaynak, inceleme ve fiyat ilişkisi.
5. Desteklenen dosyalar.
6. Kapsam ve doğrulama durumu.
7. Ölçülmüş pilot sonucu.
8. Ticari seçenek.
9. Başlangıç adımı.

### 21.2. Yedi slaytlık müşteri sunumu

| Slayt | İçerik |
|---|---|
| 1 | Metraj, fiyat ve teklif arasında kopan bilgi |
| 2 | BIMMetraj’ın tamamladığı tek müşteri işi |
| 3 | Bir kalemin kaynaktan teklife yolculuğu |
| 4 | Sistemin ve kullanıcının sorumlulukları |
| 5 | Desteklenen kapsam ve doğrulama durumu |
| 6 | Pilot kapsamı, çıktı ve ölçüm |
| 7 | Ticari teklif ve sonraki adım |

Teknik standartlar, güvenlik, hesap yöntemleri ve ayrıntılı özellik listesi eklerde bulunmalı.

### 21.3. Demo sunumunun odağı

Demo:

- Çok sayıda menüyü gezmek
- Bütün modülleri göstermek
- Teknik terimleri sıralamak

üzerine kurulmamalı.

Tek bir iş tamamlamalı:

> Bu kalemin miktarını kaynağından bulduk, eksik bilgisini gördük, fiyatını eşleştirdik ve inceleme kaydıyla teklife taşıdık.

---

## 22. Önceliklendirilmiş çalışma planı

### P0 — Güven ve ana görev

1. CRM yükleme hatasının kök nedenini incelemek.
2. “Minha doğrulandı” ile “uygulanamadı” çelişkisini gidermek.
3. “Boşluk yok” ile “boşluk bilgisi yok” durumlarını ayırmak.
4. Fiyatı eksik kalemleri sıfır maliyet gibi göstermemek.
5. AI fiyat mesajını gerçek kaynak politikasıyla uyumlu hale getirmek.
6. Yeni teklif oluşturma ile mevcut teklife revizyon eklemeyi ayırmak.
7. Resmîlik çağrıştıran ifadeleri kapsamla uyumlu hale getirmek.
8. PDF kotasını ve yeniden üretim davranışını açıklamak.

### P1 — İlk kullanım ve görev akışı

1. Excel bağlantısını doğrudan Excel aktarımına yönlendirmek.
2. IFC başlangıç yollarını tek ana akış etrafında birleştirmek.
3. Ana panelde tekrar eden eylemleri azaltmak.
4. Hızlı turu tek yardım noktasına toplamak.
5. Gelişmiş teklif ayarlarını ikincil görünüme taşımak.
6. Arsa fizibilitesini dosya inceleme ekranından ayırmak.
7. Firma fiyatı eksikken doğrudan çözüm yolu sunmak.
8. Kullanıcıya görünen teknik enum ve terimleri çevirmek.
9. Sayfa başlıkları ve erişilebilir gezinmeyi düzeltmek.
10. Mobil üst çubuk taşmasını gidermek.

### P2 — Paket ve ticari doğrulama

1. Üç paket mimarisini müşteri görüşmeleriyle sınamak.
2. Deneme, pilot ve abonelik kapsamını kesinleştirmek.
3. Kullanıcı, çıktı ve kapasite sınırlarını açıklamak.
4. Destek maliyetini ölçmek.
5. Gerçek müşteri projeleriyle tekrar kullanım görmek.
6. Ölçülmüş başarı örneklerini ana sayfaya taşımak.
7. Uzman kabulü tamamlanan modüllerin durumunu ayrı güncellemek.

### P3 — Kontrollü genişleme

- Hakediş
- Gelişmiş e-PYS
- CDE
- Gelişmiş ihale araçları
- Entegrasyonlar
- Eğitim ekosistemi

Bu alanlar, çekirdek müşteriden tekrar eden ve ücretlendirilebilir talep geldikçe genişletilmeli.

---

## 23. Ölçüm ve doğrulama planı

### 23.1. Ürün anlayışı

Hedef kullanıcıya kısa süre gösterildikten sonra sorulmalı:

- Ürün ne yapıyor?
- Kim için?
- İlk olarak nereye tıklarsınız?
- Sonuca hangi açıdan güvenebilirsiniz?
- Hangi konuda insan incelemesi gerekir?

### 23.2. İlk değer

Ölçülecek süreler:

- Kayıttan örnek projeye
- Dosyadan ilk kullanılabilir icmale
- İcmalden fiyatlandırılmış kaleme
- İlk teklif önizlemesine

### 23.3. Kontrol kalitesi

- Kaynağı açıklanabilen kalemler
- Eksik fiyatlı kalemler
- İnceleme bekleyen kalemler
- Elle düzeltilen satırlar
- Kapsam dışında kalan elemanlar
- Kullanıcının yanlış yorumladığı durum etiketleri

### 23.4. İşletim

- Dosya başına işleme maliyeti
- Başarısız işlem oranı
- Yeniden deneme ihtiyacı
- Destek süresi
- Kurulum süresi
- Büyük dosya davranışı

### 23.5. Ticari sonuç

- Pilot sonrası tekrar kullanım
- İkinci gerçek proje
- Aboneliğe geçiş
- Paket yükseltme nedeni
- İptal veya kullanmama nedeni
- Destek dahil gerçek hizmet maliyeti

Zaman tasarrufu veya hata azalması yüzdesi, aynı işin önceki yöntemiyle karşılaştırılmadan pazarlama iddiası olarak kullanılmamalı.

---

## 24. Kaynaklar ve izlenebilirlik

### 24.1. Canlı incelenen yüzeyler

- https://bimmetraj.com/
- https://bimmetraj.com/#pricing
- https://bimmetraj.com/register
- https://bimmetraj.com/smartcheck
- https://bimmetraj.com/app
- https://bimmetraj.com/app/quotes
- https://bimmetraj.com/app/quotes/new
- https://bimmetraj.com/app/smartcheck
- https://bimmetraj.com/app/dosyadan-teklif-demo
- https://bimmetraj.com/app/crm
- https://bimmetraj.com/app/market-intelligence
- https://bimmetraj.com/app/billing
- https://bimmetraj.com/app/profitability
- https://bimmetraj.com/app/nasil-calisir
- https://bimmetraj.com/api/public/plans
- https://bimmetraj.com/api/health

### 24.2. Başlıca kod kaynakları

Repo kökü:
`/Users/hazarvolgaekiz/dev/products/bimplanacademy/TeklifPro-repo`

- `src/pages/LandingPage.tsx`
- `src/features/public-pricing/PublicPricingSection.tsx`
- `src/services/billing/plan-catalog.ts`
- `src/services/billing/feature-limits.ts`
- `src/services/billing/feature-quota.ts`
- `src/server/routes/billing.ts`
- `src/server/routes/quotations.ts`
- `src/server/middleware/usage.ts`
- `src/smartcheck/import/service.ts`
- `src/pages/Register.tsx`
- `src/pages/Login.tsx`
- `src/pages/CreateQuote.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/SmartCheckDemo.tsx`
- `src/components/dashboard/ContractorWorkflowHub.tsx`
- `src/components/smartcheck/SmartCheckImportWorkspace.tsx`
- `src/components/smartcheck/CalculationTraceSection.tsx`
- `src/components/layout/Shell.tsx`
- `src/components/tour/user-tour-steps.ts`
- `src/constants/navigation.tsx`
- `src/ifc/smartcheck-evidence.ts`
- `src/ifc/pricing/poz-resolver.ts`
- `src/capabilities/registry.ts`
- `src/config/features.ts`
- `src/index.css`

### 24.3. Proje belgeleri

- `docs/agent-memory/README.md`
- `docs/agent-memory/PROJECT_BRIEF.md`
- `docs/agent-memory/WORKING_STATE.md`
- `docs/agent-memory/ARCHITECTURE_DECISIONS.md`
- `docs/agent-memory/AGENT_PROTOCOL.md`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/wiki/index.md`
- `docs/audits/phase-11/PHASE_11_T56_FINAL_EVIDENCE_MATRIX_2026-10-26.md`

Proje belgelerindeki geçmiş test ve dağıtım kayıtları bu incelemede yeniden çalıştırılmadı. Belgedeki tamamlanma veya bekleme ifadeleri, tek başına güncel canlı kabul kanıtı olarak kullanılmadı.

---

## 25. Kurucu düzeyinde önerilen karar

BIMMetraj’ın pafta kimliği korunmalı. Ürünün temel vaadi kaynak, inceleme, fiyat ve teklif ilişkisi etrafında netleştirilmeli.

İlk ticari odak:

> Teknik ofisin bir IFC veya Excel metrajını, eksiklerini görerek ve fiyat kaynaklarını inceleyerek teklife dönüştürmesi.

Ürünün mevcut teknik derinliği bu odağı destekleyebilecek bir temel oluşturuyor.

Öncelikli yatırım alanları:

- Sonuç durumlarının doğru ve anlaşılır sunulması
- İlk işin tamamlanması
- Fiyat eksikliği ve hata durumunda uygulanabilir yönlendirme
- Tek ve tutarlı dosyadan teklif akışı
- Paket kapsamının şeffaflığı
- Gerçek dosya, uzman incelemesi ve müşteri tekrar kullanımı

Daha fazla modül eklemeden önce bu akışın küçük bir müşteri grubunda tekrarlanabilir biçimde değer üretmesi, marka vaadini ve sürdürülebilir paket fiyatlarını daha sağlam bir zemine oturtacaktır.