Türkiye İnşaat Sektörü B2B SaaS Ürün Stratejisi ve Teklif Yönetimi Araştırma Raporu
Yönetici Özeti ve Sektörel Bağlam
Türkiye inşaat sektörü; yüksek enflasyonist baskılar, döviz kuru dalgalanmaları, karmaşık vergi mevzuatları (tevkifat, KDV) ve derinlemesine ilişki odaklı, geleneksel bir ticari yapı içerisinde faaliyet göstermektedir. Bu rapor, Türk müteahhitlik pazarında faaliyet gösteren firmalar için geliştirilecek yapay zeka (AI) destekli bir teklif ve hakediş yönetimi SaaS (Hizmet Olarak Yazılım) ürününün stratejik temelini oluşturmaktadır. Analiz, inşaat projelerinin ihale aşamasından kesin hesap aşamasına kadar olan ticari iş akışlarını parçalara ayırmakta, mevcut sistemsel darboğazları tespit etmekte ve pazarda hızla gelir yaratacak dijital çözümlerin mimarisini tanımlamaktadır.

1. Temel Kavramların Derinlemesine Analizi
Aşağıdaki bölümde, Türk inşaat sektörünün ticari operasyonlarını oluşturan on temel kavram, SaaS ürün geliştirme perspektifiyle incelenmiştir.

1.1. Teklif Hazırlama Süreci
A. Tanım
Teklif hazırlama süreci, bir inşaat projesinin ihale dokümanlarının incelenmesi, metrajların çıkarılması, birim fiyatların toplanması, alt yüklenici fiyatlarının entegre edilmesi ve nihai kar marjının eklenerek işverene sunulacak ticari dosyanın oluşturulmasıdır. Türkiye'de bu süreç, Kamu İhale Kurumu (KİK) mevzuatına tabi kamu projelerinde katı ve standart formlara bağlıyken, özel sektörde tamamen firmaların inisiyatifinde ve esnek formatlarda yürütülür.

B. Neden Önemli?
Teklif, bir müteahhitlik firmasının hayatta kalma mekanizmasıdır. Yanlış hazırlanan bir teklif, ihalenin kaybedilmesine veya daha kötüsü, zarar edilecek bir projenin alınmasına yol açar. Türkiye gibi girdi maliyetlerinin anlık değiştiği bir ekonomide, teklif sürecindeki hız ve isabet oranı doğrudan şirketin finansal sürdürülebilirliğini belirler. Operasyonel olarak, teknik ofisin aylarını alabilen bu süreç, firmanın yeni projelere odaklanma kapasitesini kısıtlar.

C. Kimler Kullanır?
Süreç, çok paydaşlı bir yapıya sahiptir. Şirket sahibi (Patron) nihai kar marjını ve risk primini belirler. Teknik Ofis (İhale Mühendisleri) metraj ve maliyet hesaplarını yapar. Satınalma Departmanı piyasadan güncel malzeme fiyatlarını toplar. Alt yükleniciler kendi disiplinlerine ait (elektrik, mekanik vb.) teklifleri sunar.

D. Mevcut İş Akışı
Türkiye'de küçük ölçekli firmalar teklifleri kara düzen, tahmini metrekare birim maliyetleri üzerinden veya basit Excel tablolarıyla hazırlamaktadır. Orta ölçekli firmalarda makrolarla birbirine bağlanmış, devasa ve kırılgan Excel dosyaları kullanılır; iletişim tamamen WhatsApp ve e-posta üzerinden yürür. Büyük firmalar ise SAP, Oracle, MS Dynamics veya Logo Tiger gibi ERP sistemlerinin  ilgili modüllerini kullanmaya çalışsa da, kullanım zorluğu nedeniyle mühendisler genellikle veriyi Excel'e çekip orada işlemekte ve sisteme geri yüklemektedir.   

E. En Büyük Ağrı Noktaları (Pain Points)
Versiyon karmaşası sektörün en büyük sorunudur; "Teklif_Rev5_Son_Bitis.xlsx" gibi isimlendirmelerle dosyalar elden ele dolaşırken formüller bozulur. İletişim kopuklukları nedeniyle bazı iş kalemleri (pozlar) unutulur veya mükerrer hesaplanır. Karar alıcıların (patronların) şantiyede veya seyahatte olması durumunda, teklif onayları gecikir ve ihale teslim süreleri kaçırılır.

F. Dijitalleşme Fırsatı
Bulut tabanlı bir yazılım, tüm ekibin aynı veritabanı üzerinde eşzamanlı çalışmasını sağlayarak versiyon sorununu ortadan kaldırır. Yapay zeka, geçmiş teklif verilerini analiz ederek, unutulan pozları (örneğin; "Seramik kaplama pozu girilmiş ancak süpürgelik pozu unutulmuş") otomatik olarak tespit edip kullanıcıyı uyarabilir.

G. Geliştirilebilecek SaaS Özellikleri

Özellik Adı	Açıklama
Git-Tipi Versiyon Kontrolü	Her değişikliğin kim tarafından ve ne zaman yapıldığını tutan, istendiğinde eski bir versiyona tek tıkla geri dönülmesini sağlayan altyapı.
Dinamik Marj Simülatörü	Patronun, genel gider ve kar oranlarını bir kaydırıcı (slider) ile değiştirerek nihai teklif tutarını anında gördüğü yetki kısıtlamalı ekran.
Otomatik Eksiklik Tespiti	AI destekli motorun, girilen iş programı ve metraj listesini tarayarak eksik olabilecek maliyet kalemlerini (mobilizasyon, iskele vb.) listelemesi.
H. Örnek Veri Modeli

SQL
Table: Teklifler (Proposals)
- id (UUID, PK)
- proje_id (UUID, FK)
- versiyon_no (INT)
- statu (VARCHAR: Taslak, Onayda, Kazanildi, Kaybedildi)
- net_maliyet_try (DECIMAL 18,2)
- uygulanan_kar_marji_yuzde (DECIMAL 5,2)
- toplam_teklif_tutari (DECIMAL 18,2)
- gecerlilik_tarihi (TIMESTAMP)
- hazirlayan_kullanici_id (UUID)
I. Örnek Kullanıcı Senaryosu
İzmir'de orta ölçekli bir müteahhitlik firmasının ihale mühendisi, sisteme yeni bir konut projesi tanımlar. İşveren tarafından verilen PDF formatındaki boş keşif özetini sisteme yükler. Sistem 15 saniye içinde PDF'i tarayarak veritabanına yapısal bir tablo olarak aktarır. Mühendis, mekanik işleri için sistem üzerinden 3 farklı taşerona güvenli link gönderir. Taşeronlar fiyatlarını girdikçe, ana teklif ekranındaki toplam tutar saniye saniye güncellenir. Firma sahibi cep telefonundan sisteme girerek %15 kar marjı uygular ve teklifi dijital olarak onaylayıp PDF olarak işverene iletir.

1.2. Metraj (Quantity Takeoff)
A. Tanım
Metraj, projelerde kullanılacak malzemelerin ve yapılacak işlerin (kazı, beton, demir, kalıp, boya vb.) uzunluk, alan, hacim veya adet cinsinden mimari ve statik projeler üzerinden ölçülerek hesaplanmasıdır. Ön keşif için projeler üzerinden, kesin hesap (hakediş) için ise imalatlar üzerinden sahada yapılır.   

B. Neden Önemli?
Hatalı metraj, teklifin temelini çürütür. Fazla hesaplanan metraj, teklifin pahalı kalarak ihalenin kaybedilmesine; eksik hesaplanan metraj ise işin zararına yapılmasına veya hakedişlerde eksik ödeme alınmasına yol açar. Operasyonel olarak, teknik ofislerin zamanının en az %60'ı çizimler üzerinden metraj çıkarmakla geçer.   

C. Kimler Kullanır?
Teknik Ofis Mühendisi ihale aşamasında projelerden ölçü alır. Şantiye Mühendisi uygulamada gerçekleşen ölçüleri hesaplar. Taşeronlar, ana firmanın verdiği metrajları teyit etmek için kendi iç hesaplamalarını yapar.

D. Mevcut İş Akışı
Küçük firmalarda AutoCAD üzerinden manuel "Area" (Alan) ve "Distance" (Mesafe) komutlarıyla ölçüm yapılıp değerler Excel'deki "Metraj Cetveli"ne elle yazılır. Gelişmiş firmalarda BIM (Revit vb.) üzerinden otomatik listeler alınır ancak Türkiye'de hala ihalelerin çok büyük bir kısmı 2D PDF veya DWG projeler üzerinden yapılmaktadır.   

E. En Büyük Ağrı Noktaları (Pain Points)
Projelerde revizyon yapıldığında (örneğin; mimari plan değiştiğinde), Excel'deki hangi satırın çizimdeki hangi odaya ait olduğunu bulmak ve metrajı güncellemek tam bir kabustur. Çizim ile hesap tablosu arasında organik bir bağ yoktur.

F. Dijitalleşme Fırsatı
İnternet tarayıcısı üzerinden çalışan entegre bir 2D ölçüm aracı (takeoff tool) ile metraj cetvelini birbirine bağlamak. Kullanıcı PDF üzerinde bir odayı poligon ile çizdiğinde, alan ve çevre bilgisinin otomatik olarak veritabanındaki ilgili hücreye yazılması.

G. Geliştirilebilecek SaaS Özellikleri

Özellik Adı	Açıklama
Görsel Metraj Ekranı (Digital Canvas)	Tarayıcı tabanlı PDF/DWG görüntüleyici üzerinde çizim yaparak otomatik alan, hacim ve çevre hesaplama.
Revizyon Kıyaslama Aracı	Yeni proje yüklendiğinde eski proje ile üst üste çakıştırıp, mimari değişiklikleri kırmızı/yeşil renklerle vurgulayarak değişen metrajları anında gösterme.
Akıllı Formül Çubuğu	En, boy, yükseklik ve minhalar (düşülecek alanlar, örn: pencere boşluğu) için Türkiye standartlarına uygun (KİK) metraj cetveli formatı.
H. Örnek Veri Modeli

SQL
Table: Metrajlar (Takeoffs)
- id (UUID, PK)
- kesif_kalemi_id (UUID, FK)
- referans_cizim_id (UUID)
- lokasyon (VARCHAR, örn: 'A Blok Zemin Kat Mahal 101')
- boy (DECIMAL 10,2)
- en (DECIMAL 10,2)
- yukseklik (DECIMAL 10,2)
- minha_dusulecek (DECIMAL 10,2)
- net_miktar (DECIMAL 18,4)
- birim (VARCHAR, örn: 'm2', 'm3')
I. Örnek Kullanıcı Senaryosu
Kaba inşaat ihalesine giren bir firma, temel planını SaaS platformuna yükler. Mühendis, farenin imleciyle radye temelin sınırlarını tıklar. Sistem 1250 m2 alanı hesaplar. Mühendis kalınlık olarak 1.20 metre girer ve sistem otomatik olarak 1500 m3 C30 Beton miktarını "Metraj Cetveli"ne işler. İleride bir denetmen "Bu 1500 m3 nereden geldi?" diye tıkladığında, çizim üzerindeki ilgili bölge mavi renkte parlar.

1.3. Keşif Özeti (Bill of Quantities)
A. Tanım
Keşif Özeti (Bütçe veya BOQ), projenin maliyet bedelini bulmak için çıkarılan metrajların, ilgili birim fiyatlarla çarpılması sonucu elde edilen maliyet tablolarının bütünüdür. İnşaatın ana finansal haritasıdır.   

B. Neden Önemli?
İşverenle yapılan sözleşmelerin ana ekidir. Projenin satın alma planlaması, bütçe takibi ve nakit akışı tamamen bu belge üzerinden yönetilir. Hatalı bir keşif özeti, doğrudan karlılığa etki eder.

C. Kimler Kullanır?
İşveren bütçeyi onaylamak için, Teknik Ofis projeyi maliyetlendirmek için, Muhasebe birimi ise avans ve ödeme planlarını oluşturmak için kullanır.

D. Mevcut İş Akışı
KİK (Kamu İhale Kurumu) mevzuatına tabi işlerde AMP veya Oska gibi yerel, masaüstü lisanslı programlar yaygındır. Ancak özel sektörde esneklik ihtiyacından dolayı çoğunlukla devasa Excel tabloları kullanılır.   

E. En Büyük Ağrı Noktaları (Pain Points)
Bağlantılı Excel hücrelerindeki formül kırılmaları (örneğin; alt toplamların ana toplama yansımaması). İşverenlerin kendilerine has keşif formatları istemesi nedeniyle, firmanın kendi iç formatını müşteri formatına çevirirken yaşanan zaman kaybı ve kopyalama hataları.

F. Dijitalleşme Fırsatı
İlişkisel veritabanı (Relational Database) kullanarak formül hatalarını sıfıra indirmek. Etiketleme (tagging) sistemi sayesinde aynı keşif özetini tek tıkla "Taşeron Bazlı", "Mahal Bazlı" veya "CSI MasterFormat / KİK Formatlı" olarak gruplayabilmek.

G. Geliştirilebilecek SaaS Özellikleri

Özellik Adı	Açıklama
Pivot Keşif Görünümü	Verileri istenilen hiyerarşide (Bölüm -> Kat -> Taşeron -> Malzeme) saniyeler içinde gruplama.
Akıllı Müşteri Çıktısı (Export Engine)	İç maliyetleri ve gizli karları müşteri formatındaki bir Excel'e, birim fiyatlara yedirilmiş (dağıtılmış) şekilde yansıtarak dışa aktarma.
Poz Kütüphanesi Entegrasyonu	ÇŞB (Çevre ve Şehircilik Bakanlığı) pozlarının ve kurum fiyatlarının anlık ve güncel olarak çekilebildiği API entegrasyonu.
H. Örnek Veri Modeli

SQL
Table: Kesif_Ozetleri (BOQ_Items)
- id (UUID, PK)
- proje_id (UUID, FK)
- poz_no (VARCHAR, örn: '15.150.1005')
- kisa_aciklama (VARCHAR)
- miktar (DECIMAL 18,3)
- birim_fiyat_try (DECIMAL 18,2)
- toplam_tutar_try (DECIMAL 18,2)
- is_grubu_id (UUID)
I. Örnek Kullanıcı Senaryosu
Müteahhit, maliyeti 10 Milyon TL olan keşif özetine %20 kar eklemiştir. Müşteri, teklifi kendi gönderdiği özel bir Excel şablonunda istemektedir. Mühendis, SaaS üzerinden "Müşteri Şablonuna Aktar" tuşuna basar. Sistem, genel giderleri ve %20 karı her bir birim fiyatın (örneğin beton, demir, seramik) içine görünmez bir şekilde orantısal olarak yedirir ve işverenin şablonuna net rakamlar olarak yazdırıp indirir. İşveren iç maliyeti asla göremez.

1.4. Birim Fiyat (Unit Price)
A. Tanım
Bir imalatın (örneğin 1 m2 tuğla duvar yapılması) veya bir malzemenin (1 ton inşaat demiri) piyasa veya resmi kurumlarca belirlenmiş tekil değeridir. İşçilik, malzeme, makine ve genel gider bileşenlerinden oluşabilir.

B. Neden Önemli?
Türkiye gibi döviz kurlarının  ve malzeme fiyatlarının (kimi dönemlerde %432'ye varan artışlar ) aşırı dalgalı olduğu bir ülkede birim fiyat, projenin kaderini belirler. Eski bir birim fiyatla ihaleye girmek iflas sebebidir.   

C. Kimler Kullanır?
Teklif Hazırlama Mühendisleri, Satınalma Uzmanları ve Maliyet Kontrol (Cost Control) departmanları.

D. Mevcut İş Akışı
Satınalmacılar tedarikçilerden WhatsApp veya e-posta yoluyla teklif alır. Bu fiyatlar teklif departmanına iletilir ve manuel olarak Excel'e işlenir. Kamu projelerinde ÇŞB'nin her yıl (artık yılda birkaç kez) yayınladığı resmi birim fiyat kitapçıkları kullanılır.

E. En Büyük Ağrı Noktaları (Pain Points)
Veri çürümesi (Data Decay). Geçen ay alınan çimento fiyatının bugün geçerli olmaması. Euro veya Dolar cinsinden alınan malzeme kote fiyatlarının , teklif verilirken TL'ye çevrilmesi ve aradan geçen zamanda kur şoklarıyla zarara dönüşmesi. Sektördeki belirsizlik nedeniyle müteahhitlerin fiyat verememesi.   

F. Dijitalleşme Fırsatı
Döviz kurlarının Merkez Bankası API'si ile anlık çekilmesi. Geçmiş satınalma verilerinden beslenen "Canlı Şirket Birim Fiyat Veritabanı" oluşturulması ve fiyat enflasyon eğrilerinin yapay zeka ile modellenebilmesi.

G. Geliştirilebilecek SaaS Özellikleri

Özellik Adı	Açıklama
Çoklu Para Birimi Motoru	Bir pozun EUR, diğerinin USD girilebilmesi; sistemin teklif tarihinde tüm tabloyu güncel kurlarla tek tıkla TL'ye veya istenen para birimine çevirmesi.
Fiyat Eskime Alarmı	Veritabanındaki bir birim fiyatın son güncellenme tarihinin üzerinden 30 gün geçmişse satırı kırmızı yakarak uyarı vermesi.
Otomatik Kurum Pozu Güncelleme	Çevre ve Şehircilik Bakanlığı fiyatları güncellendiği an sisteme yansıması.
H. Örnek Veri Modeli

SQL
Table: Birim_Fiyatlar (Unit_Prices)
- id (UUID, PK)
- malzeme_adi (VARCHAR)
- baz_fiyat (DECIMAL 18,2)
- para_birimi (VARCHAR, örn: 'TRY', 'USD', 'EUR')
- son_guncelleme_tarihi (TIMESTAMP)
- tedarikci_id (UUID)
I. Örnek Kullanıcı Senaryosu
Bir hastane projesinin havalandırma sistemleri için Almanya'dan 500.000 EUR tutarında cihaz teklifi alınmıştır. Mühendis bu değeri EUR olarak sisteme girer. İhale teslimine 1 saat kala, döviz kurunda anlık bir artış olur. Mühendis sistemdeki "Kurları Güncelle" butonuna basar. Sistem Merkez Bankası anlık kurunu çeker, EUR pozları yeni kurla çarpar, genel toplamı TL bazında anında günceller ve güncel KDV matrahını hesaplar.   

1.5. KDV (Katma Değer Vergisi)
A. Tanım
İnşaat malzemesi alımlarında ödenen ve işverenlere kesilen hakediş faturalarında tahsil edilen tüketim vergisidir. İnşaat sektöründe malzemenin türüne, konutun büyüklüğüne (örneğin 150 m2 altı/üstü kentsel dönüşüm) ve projenin niteliğine göre oranlar (%1, %10, %20) değişiklik gösterir.

B. Neden Önemli?
KDV nakit akışının en büyük tuzağıdır. Müteahhit işin başında demir ve betona %20 KDV öderken, teslim ettiği konut projesi %1 KDV'ye tabi ise devasa bir "Devreden KDV" yükü oluşur. Bu durum firmanın nakit rezervlerini kurutur.

C. Kimler Kullanır?
Muhasebe ve Finans ekipleri, Satınalma ve Nakit Akışı (Cash Flow) yöneticileri.

D. Mevcut İş Akışı
KDV yönetimi genellikle ihale mühendislerinin yetki alanının dışındadır ve Logo, Mikro, Zirve gibi muhasebe yazılımlarında takip edilir. Bu durum teknik ofis ile finans arasında bir kör nokta yaratır.

E. En Büyük Ağrı Noktaları (Pain Points)
Tekliflerin "Net" (KDV hariç) rakamlar üzerinden sunulması, patronların ve finans yöneticilerinin projenin ilk aylarında ne kadarlık bir brüt nakit çıkışına (cash out) ihtiyaç duyacaklarını öngörememelerine sebep olur.

F. Dijitalleşme Fırsatı
Keşif özeti kalemlerinin otomatik olarak doğru KDV oranlarıyla etiketlenmesi ve iş programı (Gantt Chart) ile entegre edilerek projenin zamana bağlı net ve brüt nakit akışı simülasyonunun oluşturulması.

G. Geliştirilebilecek SaaS Özellikleri

Özellik Adı	Açıklama
KDV Etiketleme Kuralları	Girilen malzeme veya poz ismine göre (örn: "Konut" vs "Ticari") yasal KDV oranının otomatik atanması.
Nakit Akışı (Cash Flow) Grafiği	İş programındaki aktivitelere göre aylar bazında KDV dahil tahmini gider ve gelir eğrilerini çizen dinamik dashboard.
H. Örnek Veri Modeli

SQL
Table: Nakit_Akisi_Projeksiyonu (Cashflow_Projections)
- id (UUID, PK)
- proje_id (UUID, FK)
- donem_ay_yil (DATE)
- planlanan_net_gider (DECIMAL 18,2)
- planlanan_kdv_cikis (DECIMAL 18,2)
- toplam_brut_finansman_ihtiyaci (DECIMAL 18,2)
I. Örnek Kullanıcı Senaryosu
İhale kazanıldıktan sonra finans müdürü SaaS sistemindeki "Nakit İhtiyacı Raporu"nu açar. Sistem, projenin ilk 3 ayında yoğun demir ve beton alımı (KDV %20) olacağını, ancak ilk hakediş ödemesinin 4. ayda geleceğini analiz eder. Finans müdürüne "3. Ayın sonunda 15 Milyon TL'lik tepe noktası brüt finansman açığı oluşacaktır" uyarısını verir, şirket kredi planlamasını buna göre yapar.

1.6. Tevkifat (Withholding Tax)
A. Tanım
İnşaat sektöründe vergi güvenliğini sağlamak için KDV'nin veya gelir vergisinin bir kısmının, faturayı kesen yerine faturayı ödeyen (işveren veya ana müteahhit) tarafından kesilerek doğrudan devlete ödenmesi işlemidir. Özellikle "Yıllara Sari İnşaat ve Onarım İşleri"nde (birden fazla takvim yılına sarkan işler) yasal kesinti oranları kritiktir.   

B. Neden Önemli?
Tevkifat oranları müteahhidin ve taşeronun eline geçecek net nakdi doğrudan etkiler. Hatalı hesaplanan bir tevkifat faturası reddedilir, ödeme haftalarca sarkar ve yasal cezai yaptırımlar doğurur. Son yasal düzenlemelerle (30 Mart 2025 tarihli, 9707 sayılı Cumhurbaşkanı Kararı) demiryolu, tramvay, metro, şehir içi raylı sistemler ve gemi inşaat/onarım işlerinde yıllara sari hakediş ödemelerindeki tevkifat oranı %5'ten %1'e düşürülmüştür. Diğer yıllara sari işlerde ise oran %5 olarak uygulanmaya devam etmektedir. Ayrıca KDV tevkifatlı fatura kesme sınırı 2025 yılı için 9.900,00 TL olarak belirlenmiştir.   

C. Kimler Kullanır?
Hakedişleri hazırlayan Teknik Ofis, fatura kesen Alt Yükleniciler (Taşeronlar) ve onaylayan Muhasebe/Finans ekipleri.

D. Mevcut İş Akışı
Taşeronlar genellikle güncel mevzuattan bihaberdir. Excel'de hazırlanan taşeron hakedişlerinin faturası kesilirken yanlış tevkifat oranı uygulanır. Ana müteahhidin muhasebe departmanı bunu fark eder, faturayı iade eder. Whatsapp üzerinden "Faturayı iptal et, %1'den yeniden kes" mesajlaşmaları ile süreç tıkanır.   

E. En Büyük Ağrı Noktaları (Pain Points)
Sık değişen mevzuatlar. Projenin türünün (metro inşaatı vs. bina inşaatı) vergi oranını değiştirmesi  ve taşeronların bu karmaşada fatura kesememesi. Manuel Excel hesaplarında virgülden sonraki yuvarlama farklılıkları yüzünden e-fatura sistemleriyle uyuşmazlık yaşanması.   

F. Dijitalleşme Fırsatı
SaaS platformunun merkezine gömülü, yasal mevzuatla senkronize çalışan bir "Vergi Uyum Motoru" (Compliance Engine). Sistem projenin özelliklerini bilerek, hakediş icmalini oluştururken doğru tevkifat oranını zorunlu kılar.

G. Geliştirilebilecek SaaS Özellikleri

Özellik Adı	Açıklama
Otomatik Tevkifat ve KDV Hesaplayıcı	
Hakediş faturası modülünde, projenin niteliği "Raylı Sistem" seçiliyse yasal %1 , diğer ise %5 kesintiyi  otomatik uygulayan algoritma.

Proforma E-Fatura Şablonu	Taşerona, ana sistem tarafından hesaplanmış ve vergi dairelerinin kabul edeceği kusursuz e-fatura taslağının otomatik oluşturularak gönderilmesi.
Fatura Sınırı Uyarısı	
İşlem tutarı 9.900 TL'ye yaklaştığında  sistemi KDV tevkifatı konusunda uyaran akıllı bildirim sistemi.

  
H. Örnek Veri Modeli

SQL
Table: Mevzuat_Tevkifat_Kurallari (Tax_Withholding_Rules)
- id (UUID, PK)
- proje_turu (VARCHAR)
- gecerlilik_tarihi_baslangic (DATE)
- tevkifat_orani (DECIMAL 5,2)
- aciklama (TEXT)
- resmi_gazete_ref (VARCHAR)
I. Örnek Kullanıcı Senaryosu
İstanbul'da bir metro şantiyesinde  çalışan kalıp taşeronu, Mayıs 2025 dönemi için 500.000 TL hakedişe hak kazanmıştır. Taşeron, sisteme girip faturayı oluşturmak istediğinde yazılım, 9707 sayılı Cumhurbaşkanı Kararı'nı referans alarak  projeyi "Raylı Ulaşım Sistemi" olarak tanır, eski %5 oranı yerine yeni %1 oranını uygular ve 9.900 TL sınırını  aştığı için ilgili KDV tevkifat kesintilerini de yaparak mükemmel bir fatura icmali verir. Muhasebeye giden belge anında onaylanır.   

1.7. Hakediş (Progress Billing)
A. Tanım
İnşaat projelerinde sözleşmeye bağlı olarak tamamlanan iş miktarlarının (fiziki ilerleme) finansal karşılığının yükleniciye ödenmesi amacıyla hazırlanan resmi rapordur. Hakediş dosyası; Ön Kapak, Dizi Pusulası, İcmal Tabloları, Yeşil Defter, Ataşmanlar, Metraj Cetvelleri, Fiyat Farkı Hesapları ve Yapılan İşler Listesinden oluşur.   

B. Neden Önemli?
Hakediş müteahhidin can damarıdır. Hakedişin gecikmesi, şantiyenin durması demektir. Ayrıca, sözleşmelerde belirtilen (örneğin 60 gün) süreler içinde ödeme yapılmaması durumunda, yükleniciye "Süre Uzatımı" verilmesi hukuki bir zorunluluktur. Eksiksiz ve hatasız hakediş hazırlamak, işveren veya Yapı Denetim kurumları tarafından  dosyanın reddedilmesini önler.   

C. Kimler Kullanır?
Şantiye Mühendisi (saha ölçümlerini ve Ataşman/Yeşil Defter kayıtlarını tutar). Teknik Ofis (fiyat farkı, ihzarat, avans kesintisi hesaplarını yapar). İşveren/Müşavir (kontrol edip onaylar).   

D. Mevcut İş Akışı
Kamu projelerinde Oska veya AMP gibi paket programlar  kullanılarak KİK normlarına uygun, standart formatlı (Ön Kapak, Arka Kapak, İcmal)  dosyalar basılı olarak hazırlanır. Özel sektör projelerinde ise işin karmaşıklığına göre devasa Excel dosyaları (örneğin; İhzaratlı -sahada olan ama montajı yapılmamış malzeme- ve avans mahsuplu şablonlar) kullanılır. Islak imza süreçleri masadan masaya fiziksel dosya taşıyarak haftalar sürer.   

E. En Büyük Ağrı Noktaları (Pain Points)
Sahada yapılan "görünmez imalatların" (örneğin toprak altında kalan kazı dolgu işleri) Ataşman defterlerine  eksik işlenmesi, sonradan kanıtlanamaması. Fiyat Farkı (Enflasyon farkı) hesaplamalarının matematiksel karmaşıklığı. Hakediş evraklarının imzaya sunulurken eksik evrak (Yeşil Defter  sayfası eksikliği gibi) yüzünden geri dönmesi.   

F. Dijitalleşme Fırsatı
Saha ile ofisi birbirine bağlayan mobil entegrasyon. Şantiye şefinin tabletten girdiği günlük ilerlemelerin ofiste otomatik olarak hakediş icmaline dönüşmesi. Gecikme sürelerini loglayarak otomatik "Süre Uzatımı Talebi" altyapısı oluşturması.   

G. Geliştirilebilecek SaaS Özellikleri

Özellik Adı	Açıklama
Dijital Yeşil Defter & Mobil Ataşman	
Sahadan fotoğraf ve GPS konumu ile ölçü girilebilen, şantiye şefinin telefonundan yönettiği mobil uygulama arayüzü.

Otomatik Fiyat Farkı Motoru	
Kamu ihaleleri için her ay açıklanan TÜİK endekslerini çekerek matematiksel formülleri insan hatası olmadan uygulayan modül.

Dijital Onay Akışı (Workflow)	
Hazırlanan hakedişin Şantiye Şefi -> Proje Müdürü -> Yapı Denetim  -> İşveren onay sırasını dijital imza ile takip eden sistem.

  
H. Örnek Veri Modeli

SQL
Table: Hakedis_Donemleri (Progress_Billings)
- id (UUID, PK)
- proje_id (UUID, FK)
- hakedis_no (INT)
- donem_tarihi (DATE)
- onceki_hakedis_kümülatif (DECIMAL 18,2)
- bu_hakedis_yapilan_is (DECIMAL 18,2)
- fiyat_farki_tutari (DECIMAL 18,2)
- avans_kesintisi (DECIMAL 18,2)
- teminat_kesintisi (DECIMAL 18,2)
- net_odenecek_tutar (DECIMAL 18,2)
I. Örnek Kullanıcı Senaryosu
Ayın 25'i geldiğinde şantiye mühendisi SaaS'ın mobil uygulamasını açar. "Zemin Kat Tuğla Duvar" imalatının %80 bittiğini işaretler ve yerinde çektiği fotoğrafı Ataşman olarak  ekler. Sistem bunu "Yeşil Defter"e yazar. Ofisteki hakediş mühendisi tek tuşla "Hakedişi Derle" dediğinde sistem; metrajı birim fiyatla çarpar, daha önce verilen %10 avansı keser , enflasyon farkını ekler ve "Yapım İşleri Hakediş Ön Kapak ve İcmal Raporu"nu  sıfır Excel hatasıyla PDF olarak idareye sunulmaya hazır hale getirir.   

1.8. Alt Yüklenici (Taşeron) Teklifleri ve Yönetimi
A. Tanım
Ana müteahhidin projedeki iş paketlerini (örneğin elektrik, mekanik, hafriyat, cephe) alt firmalara ihale etmesi sürecidir. Türk inşaat sektörü yoğunlukla taşeron sistemiyle ilerler ve projelerin başarısı direkt olarak taşeronların performansına bağlıdır. Ayrıca işlerin, taşeronlardan da alt (ikincil) taşeronlara devredilmesi sık rastlanan bir durumdur.   

B. Neden Önemli?
Taşeronlar projenin fiili üreticileridir. Zaman baskısı, iş yükü ve maliyet kontrolü nedenleriyle ana firmalar riski taşeronlara devreder. Ancak yanlış taşeron seçimi veya yanlış sözleşme, işin ortasında taşeronun kaçmasıyla sonuçlanır. Yazılı sözleşme yapılmadan ikincil taşeronlara iş verilmesi, işin fiziksel ilerlemesinde (hakediş onaylarında) büyük uyuşmazlıklara neden olur.   

C. Kimler Kullanır?
Satınalma departmanı teklif toplar, Teknik Ofis kapsamları kıyaslar, Proje Müdürü son seçimi yapar.   

D. Mevcut İş Akışı
Ana firma taşeronlara PDF formatında projeler ve Excel keşif özetleri gönderir. Taşeronlar bunları manuel doldurup, taratıp WhatsApp veya mail atar. Satınalma personeli 5 farklı taşeronun formatını tek bir "Kıyaslama (Leveling) Tablosu"nda birleştirmek için günlerini harcar.

E. En Büyük Ağrı Noktaları (Pain Points)
"Elmalarla armutların" kıyaslanması. A taşeronu iskele kurulumunu fiyata dahil ederken, B taşeronu hariç bırakmıştır ancak bunu net yazmamıştır. İkincil taşeronların evraksız çalışması nedeniyle ödeme zincirinin kopması ve sahadaki üretimin durması. "En ucuz" teklifi veren taşeronun kapasitesinin ölçülememesi.   

F. Dijitalleşme Fırsatı
Ana müteahhidin kurallarını koyduğu, taşeronların ise sadece veri girişi yapabildiği kapalı devre bir Teklif Portalı (Bidding Portal) kurmak. Makine öğrenimi ile taşeronların geçmiş proje tamamlama başarılarını ve güvenilirlik puanlarını hesaplamak.   

G. Geliştirilebilecek SaaS Özellikleri

Özellik Adı	Açıklama
Taşeron Teklif Portalı	Taşeronların şifre ile girip sadece kendi iş paketlerindeki hücrelere birim fiyat girebildiği web arayüzü.
Otomatik Teklif Kıyaslama Matrisi (Bid Leveling)	Gelen teklifleri yan yana dizen, "En Ucuz", "Ortalama" ve "Sapan Değerleri" (anomaly detection) renklerle işaretleyen analiz ekranı.
Taşeron Skor Kartı	
Sisteme kayıtlı taşeronların önceki projelerindeki gecikme süreleri, iş güvenliği kayıtları ve sözleşme uyumlarına  göre puanlandığı profil yapısı.

  
H. Örnek Veri Modeli

SQL
Table: Taseron_Teklifleri (Subcontractor_Bids)
- id (UUID, PK)
- ihale_paketi_id (UUID, FK)
- taseron_id (UUID, FK)
- teklif_tarihi (TIMESTAMP)
- toplam_tutar (DECIMAL 18,2)
- istisnalar_kapsam_disi_notlar (TEXT)
- guvenilirlik_skoru_gecmis (INT)
I. Örnek Kullanıcı Senaryosu
Satınalma yöneticisi, Alçıpan işleri için 4 firmaya sistemden davet gönderir. Taşeronlar cep telefonlarına gelen linkten SaaS'a girip pozların karşısına fiyat yazar. Bir taşeron "Nakliye hariçtir" kutucuğunu işaretler. Teklif süresi bitince, yönetici SaaS ekranını açar; sistem 4 firmayı yan yana tablo yapmıştır. Sistem uyarı verir: "Firma C en ucuz görünmektedir ancak Nakliye hariçtir, Nakliye endeksi eklendiğinde Firma A %5 daha avantajlıdır." Ayrıca Firma C'nin geçmiş projelerde ikincil taşeron kullandığı  ve sözleşmesel sorunlar yaşadığı "Skor Kartı"nda görünür. Firma A seçilir.   

1.9. Revizyon Teklifleri (Proposal Revisions)
A. Tanım
İşverenin talebi, tasarım değişiklikleri veya "Value Engineering" (Maliyet Düşürücü Mühendislik) çalışmaları sonucu, ilk hazırlanan teklif dosyasının üzerinde yapılan güncellemeler bütünüdür.

B. Neden Önemli?
Karların eridiği ve hataların en çok yapıldığı aşamadır. Müşteri %5 indirim veya lüks bir malzeme yerine muadil bir malzeme istediğinde, teklifin tamamının yeniden ve hatasız hesaplanması gerekir. Revizyonun kontrol edilememesi, firmanın kendi kar marjını müşteriye hediye etmesiyle sonuçlanır.

C. Kimler Kullanır?
İş Geliştirme/Satış Ekibi pazarlık yapar, Teknik Ofis güncellemeleri teknik olarak uygular.

D. Mevcut İş Akışı
Excel dosyasının farklı kaydedilmesi: "Rev1", "Rev2", "Rev3_Son". Hangi versiyonda neyin değiştiği manuel olarak satır satır karşılaştırılarak aranır.

E. En Büyük Ağrı Noktaları (Pain Points)
Tarihsel verinin (Immutability) kaybolması. İşveren "Versiyon 2'deki Seramik modeline geri dönelim" dediğinde, o Excel dosyasının bulunamaması veya içindeki alt tedarikçi fiyatlarının kimden alındığının unutulması.

F. Dijitalleşme Fırsatı
Yazılım mühendisliğindeki Git/GitHub benzeri dal (branch) yapısı ve versiyon kontrol sisteminin teklif yönetimine uyarlanması.

G. Geliştirilebilecek SaaS Özellikleri

Özellik Adı	Açıklama
Görsel Versiyon Kıyaslama (Diff Tool)	Revizyon 1 ile Revizyon 2'yi yan yana açıp; yeni eklenen satırları yeşil, silinenleri kırmızı, fiyatı değişenleri sarı renkte vurgulayan özellik.
Tek Tıkla Proje Klonlama	5000 kalemlik bir teklifi saniyeler içinde "Alternatif 1" olarak kopyalayıp, orijinal veriye zarar vermeden üzerinde oynama (what-if) yapma imkanı.
H. Örnek Veri Modeli

SQL
Table: Teklif_Revizyonlari (Revisions)
- id (UUID, PK)
- ana_teklif_id (UUID, FK)
- revizyon_no (INT)
- degisiklik_ozeti (TEXT)
- snapshot_veri (JSONB) -- O anki tüm tablonun dondurulmuş hali
- olusturulma_tarihi (TIMESTAMP)
I. Örnek Kullanıcı Senaryosu
İşveren toplantısında, toplam tutarın 100 Milyon TL olduğu söylenir. İşveren "Bunu 95 Milyona çekersek hemen imzalayalım" der. Şirket patronu, SaaS üzerinden teklifi "Revizyon 2" olarak klonlar. Pozların birim fiyatlarını tek tek bozmak yerine, en alt satıra eksi değerli bir "Ticari İskonto" makrosu uygular. Sistem tüm KDV ve tevkifatları yeniden hesaplar, yeni bir temiz PDF üretir. Gelecekte bir mühendis dosyayı açtığında, malzemelerin gerçek maliyetlerinin değişmediğini, sadece ticari bir indirim yapıldığını net olarak görür.

1.10. Karlılık Hesabı (Profitability Calculation)
A. Tanım
Bir inşaat projesinin toplam doğrudan maliyetlerinin (malzeme, işçilik) üzerine şantiye genel giderlerinin (vinç, elektrik, personel), şirket merkez gideri payının, finansman maliyetlerinin (gecikme faizleri, kredi yükleri) ve yasal risklerin eklenerek firmanın net kazancının algoritmik olarak belirlenmesidir.

B. Neden Önemli?
Brüt kar gösteriş, net kar ise gerçektir. Türkiye gibi makroekonomik dalgalanmaların  sert olduğu yerlerde, birim fiyatlara statik bir kar eklemek iflas getirir. 60 günlük bir hakediş ödeme gecikmesinin  yaratacağı finansman maliyeti, projedeki %10'luk karı tamamen silebilir.   

C. Kimler Kullanır?
Sadece Şirket Sahipleri (Patronlar), Yönetim Kurulu ve CFO (Finans Direktörü).

D. Mevcut İş Akışı
Mühendisler maliyetleri çıkarır. Patronlar, kimseye göstermedikleri gizli bir Excel sayfasında bu maliyetlerin üzerine bir "Katsayı" (Multiplier) çarpanı uygular. Bu karar tamamen patronun hislerine, sektörel tecrübesine ve işe olan açlığına bağlıdır.

E. En Büyük Ağrı Noktaları (Pain Points)
Bilimsel olmayan risk fiyatlaması. Patronların, malzeme fiyatlarındaki %432'lik olası artışları  veya alt yüklenicilerin batma risklerini  matematiksel olarak ölçümlemeden "göz kararı" marjlar koyması. Ayrıca, teklif hazırlayan teknik ofis personelinin şirketin gerçek kar marjını görmesi, bilgi güvenliği zafiyeti yaratır.   

F. Dijitalleşme Fırsatı
Risk analizlerinin (Monte Carlo simülasyonları gibi) teklif modülüne entegre edilmesi. Finansal mühendislik ile gecikme sürelerinin karlılığa etkisinin anlık grafiklerle patrona sunulması.

G. Geliştirilebilecek SaaS Özellikleri

Özellik Adı	Açıklama
Yönetici Kar Konsolu (Executive God-Mode)	Teknik personelin erişiminin olmadığı, şirketin merkez genel gider yüzdesi, beklenen döviz/enflasyon artışı gibi makro parametrelerin girilip net marjın hesaplandığı gizli ekran.
Senaryo ve Stres Testi (What-If Analysis)	"Eğer demir fiyatları %30 artarsa ve işveren ödemeyi 90 gün geciktirirse net karımız ne olur?" sorusunun anlık simülasyonu.
H. Örnek Veri Modeli

SQL
Table: Karlilik_Modelleri (Profitability_Models)
- id (UUID, PK)
- proje_id (UUID, FK)
- toplam_direkt_maliyet (DECIMAL 18,2)
- merkez_genel_gider_yuzdesi (DECIMAL 5,2)
- finansman_yuku_yuzdesi (DECIMAL 5,2)
- risk_katsayisi (DECIMAL 5,2)
- hedeflenen_net_kar (DECIMAL 18,2)
I. Örnek Kullanıcı Senaryosu
İhale dosyasının teslimine saatler kala firma sahibi arabasındayken SaaS uygulamasına girer. Teknik ofisin hesapladığı net maliyet 50 Milyon TL'dir. Patron, "Stres Testi" menüsünde işverenin geçmişteki gecikme alışkanlıklarını göz önünde bulundurarak "Ödemeler 60 gün gecikirse" seçeneğini işaretler. Sistem, bu gecikmenin şirkete yaratacağı finansman faiz maliyetini hesaplar ve projedeki "Gerçek Net Kar"ın %12'den %3'e düştüğünü gösterir. Patron bunu telafi etmek için kar kaydırıcısını (slider) %15'ten %20'ye çeker ve teklifi son haliyle onaylar.   

2. Türkiye Özel Bağlamı: Pazar Dinamikleri ve Kültürel Faktörler
Geliştirilecek yazılım ürününün Amerikan veya Avrupa menşeili sistemlerden (örn: Procore, PlanGrid) farklılaşıp Türkiye'de tutunabilmesi için aşağıdaki yerel dinamikleri ürün mimarisine kodlaması şarttır:

Kamu ve Özel Sektör Projesi Ayrımı: Kamu projeleri ÇŞB ve KİK regülasyonlarına (Fiyat farkı kararnameleri, standart poz formları) harfiyen uymak zorundadır. Özel sektör sözleşmeleri ise çoğunlukla değiştirilmiş FIDIC türevi kurallarla işler. Yazılım, kurulum aşamasında "Proje Türü"nü seçtirerek arayüzü KİK uyumlu katı formlara veya esnek özel sektör formlarına dönüştürebilmelidir.   

Sistematik Ödeme Gecikmeleri: Nakit akışında 60, 90 hatta 120 günlük hakediş tahsilat gecikmeleri norm kabul edilir. 60 günü aşan durumlarda müteahhidin "süre uzatımı" talep etme hakkı doğar. Yazılım sadece bir maliyet aracı değil, aynı zamanda bu gecikmeleri kayıt altına alıp yasal "Süre Uzatım Talebi" (Claim Management) dosyası oluşturan bir sistem olmalıdır.   

Döviz Kuru Volatilitesi (TRY / USD / EUR): Mekanik ekipman Euro, demir Dolar, yerel işçilik TL üzerinden fiyatlanır. Merkez Bankası API entegrasyonu olmadan geliştirilecek her maliyet tahmini aracı Türkiye pazarında ölü doğmuş demektir.   

Malzeme Fiyatı Dalgalanmaları: Son dönemlerde bazı inşaat malzemelerindeki fiyat artışı %432'leri görmüştür. Bu durum müteahhitleri teklif veremez hale getirmiş, projelerin feshedilmesine neden olmuştur. Yazılımın, güncel piyasa fiyatlarını çeken "Canlı Endeks" özelliği olmalıdır.   

İnformal İş Akışları (WhatsApp Kültürü): Şantiye ortamında kimse ofise geçip laptop açmaz. Usta ve formenler iletişimlerini WhatsApp üzerinden yürütür. Sistemin ya bir "WhatsApp Bot" entegrasyonu olmalı ya da kullanımı WhatsApp kadar basit olan bir mobil uygulama (Yeşil Defter modülü ) barındırmalıdır.   

Aile Şirketi ve "Patron" Hegemonyası: Orta ölçekli inşaat firmalarının %90'ı aile şirketidir. Bilgi akışı demokratik değildir, merkezi ve hiyerarşiktir. Yazılımda çok sıkı bir "Rol Bazlı Erişim (RBAC)" olmalıdır. Maliyetleri herkes görebilir ama "İndirimler, Karlar ve Taşeron Seçimleri" sadece Patron yetkisinde kalmalıdır.

Güvene Dayalı Satış Kültürü (Ahbap-Çavuş İlişkileri): Taşeron seçimlerinde sadece matematiksel "en ucuz" fiyat kazanmaz. "Geçen projede bizi yarı yolda bırakmadı" argümanı fiyatın önüne geçer. Bu yüzden "Taşeron Skor Kartı" modülü, Türkiye'deki bu davranışsal durumu dijitalize edecek kritik bir özelliktir.   

Rekabetçi Fiyat Kırma (Underpricing): İhaleyi alabilmek adına zararına fiyat verilmesi sektörde yaygındır. Müteahhitler karı ileride doğacak ek işlerden (Keşif Artışı) veya taşeronu ezerek çıkarmayı hedefler. Sistemin "İş Artışı / Azalışı (Mukayeseli Keşif)" tablolarını kusursuz yönetmesi gerekir.   

Bölgesel Fiyat ve Maliyet Farklılıkları: İstanbul'daki lojistik maliyetler, hafriyat döküm yeri sorunları ve işçilik yevmiyeleri ile Anadolu'daki (örn: Konya, Gaziantep) maliyetler uçurumludur. Veritabanı ulusal ortalamaları değil, coğrafi bazlı çarpanları desteklemelidir.

KDV ve Tevkifat Hassasiyeti: Vergi planlaması, müteahhidin nakit akış mühendisliğidir. Nisan 2025'te yürürlüğe giren yeni 9707 sayılı kararname ile demiryolu, metro ve gemi işlerinde hakediş tevkifatının %5'ten %1'e düşürülmesi gibi yasal değişimler , yazılımın vergi algoritmalarında sürekli güncellenmesi gereken yaşamsal dinamiklerdir. 9.900 TL'lik KDV tevkifat sınırı  gibi eşikler otomatik olarak denetlenmelidir.   

3. Yazılım Ürün Keşfi (Software Product Discovery)
Araştırılan iş akışları ve ağrı noktaları sentezlendiğinde, inşaat profesyonellerinin acil ihtiyaçları ve yazılıma ödeme yapma motivasyonları netleşmektedir.

3.1. Türk Müteahhitlerinin Karşılaştığı En Büyük 20 Ağrı Noktası
Sıra	Ağrı Noktası (Pain Point)	Sistematik Etkisi
1	Hiper-Enflasyon Etkisi	
Fiyatların günler içinde katlanması, eski fiyatlarla zarar yazılması.

2	Excel Formül Kırılmaları	Karmaşık "Keşif Özeti" makrolarının bozulmasıyla oluşan devasa matematiksel hatalar.
3	Kötü Taşeron Yönetimi	
İkincil taşeronlara evraksız iş verilmesi, kalite ve hakediş uyuşmazlıkları.

4	Revizyon Karmaşası	"Rev7_Son_V2" gibi dosya isimleri arasında kaybolan tarihsel maliyet hafızası.
5	Sahada Ataşman Kayıpları	
Görünmez imalatların (Yeşil Defter kayıtları) zamanında onaylatılamaması.

6	Fiyat Farkı Hataları	
Hakedişlerde TÜİK endekslerinin formüllere yanlış uygulanarak idareden reddedilmesi.

7	Hatalı Tevkifat Oranları	
%5 yerine %1  kesilmesi veya KDV eşiklerinin (9.900 TL ) atlanması.

8	Güvenlik Zafiyeti	İhale mühendislerinin firmanın net karlılığını ve genel gider oranlarını görebilmesi.
9	Nakit Akışı (KDV) Körlüğü	Ödenecek KDV'nin aylar öncesinden öngörülemeyip nakit darboğazına girilmesi.
10	Elmalarla Armutların Kıyası	Taşeron tekliflerinin farklı kapsamlarda gelmesi, kıyaslama matrislerinin yapılamaması.
11	Birim Fiyatların Eskimesi	Şirket kütüphanesindeki verilerin "Data Decay" yaşaması.
12	Manuel Metraj Zahmeti	
PDF projeler üzerinden alan hesaplamanın haftalar sürmesi.

13	Şantiye-Ofis Kopukluğu	Sahadaki imalatın merkez teknik ofise günlerce raporlanamaması.
14	Onay Gecikmeleri	
Hakediş dosyalarının, yetkililerin sahada olması nedeniyle masalarda beklemesi.

15	İşveren Şablonuna Uyarlama	İç maliyetlerin gizlenerek idare formatına dönüştürülmesi için harcanan manuel efor.
16	Kur Çevrim Zararları	Euro ile teklif edilen malzemenin TL'ye çevrilirken kur ivmesinin yanlış hesaplanması.
17	Unutulan Maliyetler (Scope Gap)	Çoklu disiplinlerin birleştirildiği projelerde ara imalatların teklife eklenmesinin unutulması.
18	WhatsApp Enformasyon Çöplüğü	Resmi olması gereken ölçüm, karar ve fiyatların telefonlarda kaybolması.
19	Süre Uzatımı Gerekçelendirme	
60 günlük ödeme gecikmelerinin  yasal olarak loglanamaması ve ispatlanamaması.

20	Masaüstü Yazılım Bağımlılığı	
Fiziksel USB Dongle (Anahtar) gerektiren eski yazılımların  uzaktan çalışmaya engel olması.

  
3.2. Satın Alma Sebebi Olacak En İyi 20 Özellik (Features)
Sıra	Satış Tetikleyici SaaS Özelliği	Çözdüğü Sorun
1	Bulut Tabanlı Teklif Motoru	Excel'i öldürür, %100 matematiksel doğruluk sağlar.
2	MB Anlık Döviz API Entegrasyonu	Her pozu kendi para biriminde tutar, tek tuşla güncel kura çevirir.
3	ÇŞB Güncel Poz Kütüphanesi	Resmi idare birim fiyatlarının her sabah sisteme otomatik yansıması.
4	Taşeron Bidding (Teklif) Portalı	Taşeronun fiyatı doğrudan ana sisteme girdiği web arayüzü.
5	Otomatik Teklif Kıyaslama (Leveling)	Gelen taşeron tekliflerini yan yana süzer, anormallikleri sarıya boyar.
6	Akıllı PDF Metraj Tuvali	Tarayıcıda projeyi açıp çokgen çizerek alanı doğrudan veritabanına yazdırma.
7	Patron Kar Simülatörü (God-Mode)	Kimsenin görmediği ekranda stres testleri ile net marjın belirlenmesi.
8	Mobil Yeşil Defter ve Ataşman	
Şantiye şefinin tabletten ilerleme girip fotoğraf eklemesi.

9	Tek Tuşla Hakediş Derleyici	
İcmal, kapak, metraj belgelerini  saniyeler içinde KİK formatlı PDF yapma.

10	Yasal Tevkifat ve KDV Robotu	
Raylı sistemlerde %1 , diğerlerinde %5 vergi kesintisini  otomatik uygulama.

11	Git-Tarzı Versiyon Kıyaslayıcı	Revizyon 1 ile 2 arasındaki farkları "Görsel Diff" ile renkli gösterme.
12	KDV Nakit Akış Grafiği	İlk 3 ayın KDV yükünü projenin Gantt şemasıyla birleştirip gösteren dashboard.
13	Taşeron Güvenilirlik Skor Kartı	
Firmanın eski şantiyelerindeki ikincil taşeron kullanımı  ve başarı performansı notları.

14	Müşteri (İşveren) Export Motoru	Tüm karları silip, sadece birim fiyatın içine gizleyerek mükemmel Excel çıktısı üretme.
15	Fiyat Eskime Alarmları	"Bu demir fiyatı 20 gün öncesine ait" uyarısı veren sistem.
16	TÜİK Fiyat Farkı Otomasyonu	
Kamu hakedişlerindeki karmaşık formülleri  sıfır hata ile hesaplama.

17	Hakediş Gecikme Loglayıcı	
Yasal 60 gün limitini  aşan idare ödemeleri için hukuki "Süre Uzatımı Raporu" oluşturma.

18	AI Boşluk Doldurucu (Scope Filler)	Unutulan pozları (Örn: Duvar örülmüş ama lento yok) yapay zeka ile tespit etme.
19	WhatsApp Onay Botu	Yöneticiye "Teklif 15 Milyon TL. Onaylıyor musun? (E/H)" mesajı atan entegrasyon.
20	Bölgesel Maliyet Çarpanları	"Bu proje Şırnak'ta, tüm lojistik maliyetlerine %15 ekle" fonksiyonu.
  
3.3. Mevcut Yazılımların Çözemediği Sorunlar
Sektörde kamu tarafı için geliştirilmiş yerel yazılımlar (Oska, AMP) KİK mevzuatına tam uyumludur  ancak tasarım mimarileri 90'lı yıllarda kalmıştır; USB lisans kilitleriyle donanıma bağımlıdırlar ve sahadan ofise bulut tabanlı bir işbirliği (collaboration) imkanı sunmazlar. Öte yandan devasa ERP'ler (SAP, Oracle, Dia)  finans ve İK yönetiminde harikadır ancak teklif hazırlayan bir ihale mühendisinin "Çeviklik" (Agility) ve "Hız" ihtiyacını karşılayamaz. Mühendis, ağır ve katı ERP ekranında fiyatları kıyaslamak yerine veriyi Excel'e çekip esnekliği orada aramaya devam eder. Her ikisi de, teklif sürecinin kanayan yarası olan "Taşeronlarla İletişim (Bidding)" aşamasını WhatsApp'a terk eder.   

3.4. Türkiye'deki En Büyük Pazar Boşlukları (Market Gaps)
Türkiye'de büyük bir "Kayıp Orta Sınıf" (Missing Middle) müteahhit grubu vardır. Excel'in yetersiz kaldığı, ancak SAP ERP  altyapısına milyonlarca lira ve yıllar sürecek implementasyon harcamak istemeyen 50-500 çalışana sahip orta ölçekli inşaat firmaları tamamen göz ardı edilmiştir. Modern, estetik UI/UX'e sahip, "Abonelik" (SaaS) modeliyle çalışan, sadece "Ticari Keşif ve Hakediş Döngüsüne" odaklanan %100 bulut tabanlı bir platform pazarın en büyük açığıdır.   

3.5. Rakiplerin Kullanmadığı Yapay Zeka (AI) Fırsatları
Semantik Eşleştirme (Semantic BOQ Matching): LLM (Büyük Dil Modelleri) kullanılarak, farklı müşterilerden gelen farklı isimlendirilmiş kalemleri (Örn: "C30 Hazır Beton" ile "BS30 Beton Dökümü"), firmanın ana veritabanındaki standart pozlarla otomatik eşleştirme.

Kazanma Olasılığı Simülatörü: Geçmiş ihalelerdeki rakip davranışlarını ve döviz volatilitesini  makine öğrenimi ile analiz edip "İhaleyi kazanmak için maksimum optimum kar marjı tahmini" sunma.   

NLP Destekli Saha Raporlaması: Formenlerin WhatsApp'a gönderdiği "A bloğun 3. katındaki kolonların kalıbı çakıldı" ses kaydını (voice note) NLP ile metne çevirip, hakediş modülündeki Yeşil Defter'e  metraj miktarı olarak otomatik yansıtma.   

3.6. 30 Günlük Lansman İçin MVP Önerisi
Taşeron Teklif Toplama ve Kıyaslama (Bid Normalization) Motoru.
Kapsamlı bir hakediş, tevkifat veya metraj ürünü inşa etmeye çalışarak zaman kaybetmeyin. İlk ürün (MVP), tamamen "Taşeron Tekliflerini Standartlaştırma" acısına odaklanmalıdır. Ana müteahhit Excel keşif özetini sisteme yükler (Drag-and-drop parser). Sistem, alt yükleniciler için benzersiz, şifreli web linkleri oluşturur. Alt yükleniciler bu linklere tıklayarak sadece fiyatlarını girer. Ana firma ekranında saniyeler içinde sıfır hatasız bir "Leveling (Kıyaslama) Matrisi" oluşur. Bu, Excel hamallığını anında çözen, WOW efekti yaratan ve şirketleri SaaS ile tanıştıran Truva Atı'dır.

3.7. Türkiye Pazarı İçin En İyi Fiyatlama Modeli (Pricing Model)
Modüler, TL Cinsinden, Enflasyona Endeksli Abonelik.
Dolar (USD) bazlı fiyatlandırma, orta ölçekli firmaları ürkütür ve bütçelendirilemez. TL cinsinden "Aylık/Kullanıcı" bazlı fiyatlama yapılmalı, ancak sözleşmelere 6 aylık periyotlarda resmi enflasyon oranında (TÜFE/ÜFE) otomatik güncelleme maddesi konulmalıdır. Kesinlikle alt yüklenicilerden (taşeronlardan) sisteme fiyat girmeleri için ücret alınmamalıdır; taşeron tarafı tamamen ücretsiz olmalı ki sistemin kullanım sürtünmesi (friction) sıfıra insin ve ağ (network) etkisi oluşsun.   

3.8. Hızla Girilecek En İyi Niş (Niche)
MEP (Mekanik, Elektrik, Tesisat) Taahhüt Firmaları.
Betonarme (kaba yapı) projeleri 100 kalemden oluşurken, bir MEP projesi binlerce alt kalemden (vanalar, borular, kablo tavaları, sensörler) oluşur. MEP firmaları için Excel yönetilemez bir kabustur. Malzemelerin çoğu döviz bazlıdır ve fiyat oynamaları şiddetlidir. SaaS bu karmaşayı ve döviz endekslemesini çözebilirse, MEP taahhütçüleri yazılıma anında adapte olur ve en yüksek ödeme istekliliğini (WTP) gösterir.   

4. Rakip Araştırması ve Değerlendirmesi
Türkiye pazarındaki mevcut çözümler temel olarak üç kategoriye ayrılır.

Kategori	Örnek Yazılımlar	Neyi İyi Yapıyorlar?	Neyi Kötü Yapıyorlar?	Fiyatlama ve UX Zafiyetleri
Geleneksel (Legacy) Kamu Yazılımları	Oska, AMP Yazılım	
Çevre Şehircilik (ÇŞB) ve KİK mevzuatlarına  %100 uyum. Fiyat farkı ve resmi hakediş formatlarında endüstri standardı. Kullanıcı alışkanlıklarını ellerinde tutmaları.

Bulut mimarisine geçişleri çok ağrılıdır. Özel sektörün hızına ve esnek sözleşme (FIDIC) yapılarına uygun değildirler. Taşeronlarla dijital bir işbirliği (bidding portal) platformları yoktur.

UX 20 yıl öncesinin masaüstü paradigmasındadır (Karmaşık menüler, popup pencereleri). Lisans ücretleri yüksektir ve donanım kilidine (dongle) bağımlılık uzaktan çalışmayı felç eder.
Büyük Ölçekli (Enterprise) ERP'ler	SAP, Oracle, MS Dynamics, Logo, DİA	
Muhasebeden depoya kadar uçtan uca finansal tam entegrasyon sağlarlar. İleri düzey özelleştirme yetenekleri (customization) yüksektir.

İhale teklif süreçleri (bidding) gibi saniyelerle yarışılan bir ortam için çok hantal (Zor kullanım) kalırlar. Mühendisler veri girmekten nefret eder.

Milyon liralık başlangıç maliyeti ve aylarca süren kurulum gerektirirler. Hızlı büyüyen orta segmentin (SME) erişiminin tamamen dışındadırlar.

Geleneksel "Status Quo"	Microsoft Excel	Esneklik sınırsızdır. Öğrenme eğrisi yoktur. Anında uyarlanabilir.	Versiyonlama yoktur. Güvenlik ve rol yönetimi (RBAC) sıfırdır. Formüller bozulmaya çok müsaittir. Birim fiyat kütüphanesi entegrasyonu oluşturulamaz.	Ücretsizdir (mevcut lisanslar dâhilinde), dolayısıyla finansal olarak rakiptir ancak operasyonel risk maliyeti en yüksek araçtır.
  
Gelişmiş AI Özelliklerinin Eksikliği:
Yukarıdaki hiçbir rakipte; geçmiş verileri tarayarak akıllı fiyat tahminlemesi (predictive pricing), PDF projelerden otomatik alan/metraj çıkarma veya KDV ve Tevkifat yasalarını  anlık okuyarak finansal uyarı üreten sistemler bulunmamaktadır. Veriler durağandır (statik) ve sadece kullanıcı manuel olarak tetiklediğinde güncellenir.   

5. Nihai Stratejik Karar: "Bugün Lansman Yapsaydım..."
Eğer bugün, Türkiye inşaat pazarında en hızlı geliri elde etmek (Fastest Revenue) ve sıfırdan bir ürün kurmak isteseydim:

Kesinlikle muhasebe, proje yönetimi (task management) veya büyük ERP çözümleri inşa etmeye çalışmazdım. Ürünün odak noktasını "MEP (Mekanik ve Elektrik) Firmaları için Akıllı Taşeron Teklif Kıyaslama ve Dinamik Keşif Motoru" olarak belirlerdim.

Türk inşaat sektörü, enflasyon  ve kur şoklarıyla  sarsılmaktadır. Kar marjları daralırken, Excel tablolarındaki basit bir formül hatası veya güncel olmayan bir birim fiyat, şirketin iflası anlamına gelebilir. Geliştireceğim SaaS platformu;   

Ana müteahhidin elindeki karmaşık Excel'i anında yutan,

Merkez Bankası API'si ile kurları anlık güncelleyen,

Taşeronlara WhatsApp üzerinden güvenli "Fiyat Giriş Linkleri" gönderen,

Patronlara "Eğer ödeme 60 gün gecikirse  net karım neye düşer?" analizini tek tıkla gösteren,   

İş bitiminde %1'lik yasal tevkifat  gibi en kritik fatura kesintilerini sıfır hatayla hakedişe  çeviren bir sistem olmalıdır.   

Bu dar ama derin odak (Niche Focus), "Maliyetleri kimse doğru hesaplayamıyor ve taşeron tekliflerini yan yana getirmek günlerimizi alıyor" diyen firmaların hemen kredi kartını çıkarıp sisteme abone olmasını sağlayacak cesur, pragmatik ve son derece ticari bir pazar giriş (Go-to-Market) stratejisidir.


mavvo.com.tr
Türkiye'de En Çok Kullanılan ERP Programları 2026 - Mavvo
Opens in a new window

clickup.com
2025'te İnşaat Şirketleri için En İyi 10 İnşaat ERP Yazılımı - ClickUp
Opens in a new window

yandex.com.tr
"Yapı İşletmesi Metraj ve Keşif Sistemi" makalesinin özeti — YaÖzet - Yandex
Opens in a new window

turuncuacademy.com.tr
İnşaat Projelerinde Teknik Ofis Mühendisinin Görevleri: Stratejik Bir Bakış
Opens in a new window

opwire.app
Ataşman, Metraj ve Birim Fiyat Analizi: Hakedişin Temelleri - Opwire App
Opens in a new window

insaatim.com
Hakediş Hazırlama Rehberi - İnşaatım.com
Opens in a new window

oska.com.tr
HakedişBulut Kullanım Kılavuzu - Oska Yazılım
Opens in a new window

oska.com.tr
HakedişPlus Kullanım Kılavuzu - Oska Yazılım
Opens in a new window

oska.com.tr
Kullanıcılarımızın Görüşleri - Oska Yazılım
Opens in a new window

gaziantepsabah.com
Dalgalanan döviz inşaat sektörünü dalgalandırdı - Gaziantep Sabah Gazetesi
Opens in a new window

komut.org.tr
inşaat malzemelerindeki fiyat artışı sektörü durma noktasına getirdi - KONYA MÜTEAHHİTLER BİRLİĞİ DERNEĞİ - KOMÜT
Opens in a new window

bdo.com.tr
YILLARA SARİ BAZI İNŞAAT VE ONARIM İŞLERİNDE TEVKİFAT ORANI %5'TEN %1'E DÜŞÜRÜLMÜŞTÜR
Opens in a new window

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net
Opens in a new window

vergiport.com
Yıllara Yaygın İnşaat ve Onarım İşlerine Yönelik Tevkifatın Oranı Bazı Yıllara Sâri İşler İçin ％1'e Düşürülmüştür - Vergiport
Opens in a new window

ercantetik.com
2025 Yılı Tevkifatlı Fatura Sınırı - Ercan Tetik
Opens in a new window

interax.com.tr
Hakediş Nedir? Nasıl Yapılır? - Interax
Opens in a new window

hakedis.org
Hakediş Nedir, Nasıl Düzenlenir
Opens in a new window

avys.omu.edu.tr
HAKEDİŞ VE İNŞAAT DEFTERLERİ
Opens in a new window

salimdemirel.com.tr
HAK EDİŞLERİN ZAMANINDA ÖDENMEMESİ SÜRE UZATIM NEDENİ MİDİR? - Kamu İhale Danışmanı Salim Demirel
Opens in a new window

amp.com.tr
Anahtar Teslimi Götürü Bedel Hakediş Nasıl Yapılır? (Yapım İşleri – Gerçekleşme Yüzdesi Kullanarak) - AMP Yazılım
Opens in a new window

dergipark.org.tr
Effect of Sub-Contractor Selection on Construction Project Success in Turkey* - DergiPark
Opens in a new window

sci-hub.box
Secondary subcontracting in the Turkish construction industry - Sci-Hub
Opens in a new window

etd.lib.metu.edu.tr
AN INVESTIGATION ON THE APPLICATION OF STANDARD CONTRACTS IN THE TURKISH CONSTRUCTION INDUSTRY A THESIS SUBMITTED TO THE GRADU
Opens in a new window

musavirrotasi.com
ERP Seçim Rehberi: 2025'in En İyi 10 ERP Programı | Müşavir Rotası
Opens in a new window


Araştırma Kapsamı ve Stratejik Planlama
Türk inşaat sektörünün kendine has dinamiklerine uygun, yapay zeka destekli bir teklif ve ihale yönetim platformu kurgulamak için derinlemesine bir analiz süreci başlatıyorum. Bu aşamada, sadece teorik tanımlarla yetinmeyip; metraj çıkarma, keşif özeti hazırlama ve hakediş süreçlerinin Türkiye'deki şantiyelerde ve teknik ofislerde fiilen nasıl yürütüldüğünü anlamlandırmaya odaklanıyorum. Sektördeki profesyonellerin günlük operasyonel yüklerini hafifletecek bir çözüm için gerekli veri modelini zihnimde yapılandırıyorum.
Yerel Piyasa Dinamikleri ve Kritik Odak Alanları
Türkiye pazarındaki döviz kuru oynaklığı, malzeme fiyatlarındaki ani değişimler ve KDV tevkifatı gibi finansal karmaşıklıkların yükleniciler üzerindeki etkisini sentezliyorum. Özellikle aile şirketi yapılarındaki kayıt dışı veya gayriresmi iş akışlarını, WhatsApp ve Excel üzerinden yürütülen süreçleri dijital bir ekosisteme taşımanın önündeki engelleri ve fırsatları değerlendiriyorum. Kamu ve özel sektör projeleri arasındaki işleyiş farklarını, karlılık hesaplamalarındaki hata paylarını minimize edecek bir yapı kurmayı hedefliyorum.
Analiz ve Modelleme Adımları
Bir sonraki adımda, mevcut yerel yazılım çözümlerinin eksikliklerini ve kullanıcı deneyimi açısından zayıf kaldıkları noktaları tespit etmek üzere incelemelerimi derinleştireceğim. TÜİK inşaat maliyet endekslerinin teklif revizyonlarına nasıl entegre edilebileceğini ve yapay zekanın teklif hazırlama hızını nasıl artırabileceğini planlıyorum. Bu veriler ışığında, en hızlı gelir getirecek niş alanı ve 30 günlük temel ürün stratejisini netleştirecek bilgilere ulaşmayı amaçlıyorum.

Researching websites...

bdo.com.tr
YILLARA SARİ BAZI İNŞAAT VE ONARIM İŞLERİNDE TEVKİFAT ORANI %5'TEN %1'E DÜŞÜRÜLMÜŞTÜR

vergiport.com
Yıllara Yaygın İnşaat ve Onarım İşlerine Yönelik Tevkifatın Oranı Bazı Yıllara Sâri İşler İçin ％1'e Düşürülmüştür - Vergiport

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net
Vergi Düzenlemeleri ve Finansal Parametreler
Sektördeki güncel mali yükümlülükleri incelerken, 2025 yılı itibarıyla yıllara sari inşaat işlerinde KDV tevkifat oranlarında yapılan stratejik değişiklikleri analiz ettim. Özellikle raylı sistemler ve gemi inşaatı gibi belirli alanlarda tevkifat oranının %1'e düşürülmesinin, genel inşaat işlerindeki %5'lik oranla yarattığı farkın nakit akışı yönetimindeki kritik önemini sentezliyorum. Bu tür yasal güncellemelerin teklif hazırlama yazılımında otomatik bir parametre olarak yer almasının hata payını nasıl minimize edeceğini değerlendiriyorum.
Birim Fiyat Dinamikleri ve Piyasa Çelişkileri
Türkiye'deki kamu projelerinde kullanılan resmi birim fiyatlar ile özel sektörün piyasa gerçekleri arasındaki metodolojik farkları derinlemesine inceliyorum. Malzeme fiyatlarındaki oynaklığın ve döviz kuru dalgalanmalarının, teknik ofislerin hazırladığı keşif özetlerini ne kadar kısa sürede geçersiz kıldığını tespit ettim. Bu noktada, dinamik fiyat güncellemelerinin ve endeks entegrasyonlarının revizyon süreçlerindeki tıkanıklıkları nasıl açabileceği üzerine kurgular yapıyorum.
Rekabet Analizi ve Operasyonel Dönüşüm
Pazardaki mevcut yerel yazılım çözümlerinin hantal kalan yönlerini ve özellikle kullanıcı deneyimi tarafındaki eksikliklerini belirlemek üzere odaklanıyorum. Küçük ve orta ölçekli firmaların Excel ve anlık mesajlaşma uygulamalarına sıkışmış iş akışlarını, daha sistematik bir dijital yapıya taşırken hangi direnç noktalarıyla karşılaşabileceğimizi düşünüyor; bir sonraki adımda yerel pazar liderlerinin zayıf karnını ve 30 günlük hızlı çıkış stratejimizi belirleyecek saha pratiklerini araştırmaya geçiyorum.

Researching websites...

mavvo.com.tr
Türkiye'de En Çok Kullanılan ERP Programları 2026 - Mavvo

clickup.com
2025'te İnşaat Şirketleri için En İyi 10 İnşaat ERP Yazılımı - ClickUp

musavirrotasi.com
ERP Seçim Rehberi: 2025'in En İyi 10 ERP Programı | Müşavir Rotası

vergiport.com
Yıllara Yaygın İnşaat ve Onarım İşlerine Yönelik Tevkifatın Oranı ...

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet
Geleneksel Yazılımlar ve Pazar Boşlukları
Sektörde uzun süredir kullanılan yerleşik hakediş ve maliyet yazılımlarının kullanıcı arayüzü ve deneyimi açısından yarattığı kısıtlamaları inceliyorum. Mevcut araçların modern SaaS beklentilerinin gerisinde kalan hantal yapılarını analiz ederek, teknik ofis çalışanlarının günlük operasyonlarını yavaşlatan unsurları tespit ettim. Bu hantal yapıların, yapay zeka desteğiyle daha çevik ve kullanıcı dostu bir platforma dönüştürülmesi noktasındaki stratejik fırsatları değerlendiriyorum.
Saha Gerçekleri ve Metodolojik Çelişkiler
Resmi birim fiyat kitapçıkları ile piyasadaki dinamik malzeme maliyetleri arasındaki tutarsızlığın, yüklenicilerin karlılık hesaplamalarında yarattığı riskleri sentezliyorum. Özellikle aile şirketi yapısındaki firmaların güvene dayalı ve genellikle kayıt dışı mesajlaşma kanalları üzerinden yürüttüğü satın alma süreçlerini, kurumsal bir veri disiplinine taşımanın önündeki direnç noktalarını çözümlüyorum. Bu informel akışların dijital bir hafızaya aktarılmasının, teklif revizyon süreçlerindeki hız etkisini öngörüyorum.
Teknik Ofis Otomasyonu ve Veri Entegrasyonu
Bir sonraki aşamada, şantiyelerin operasyonel merkezi olan teknik ofislerde metraj çıkarma ve keşif hazırlama süreçlerinin detaylarına odaklanacağım. Bakanlık tarafından yayınlanan güncel birim fiyat verilerinin sisteme otomatik entegrasyonu ve yapay zekanın karmaşık hakediş tablolarındaki hata payını nasıl minimize edebileceği üzerine kurgular geliştirmeyi planlıyorum. Rakip analizlerini derinleştirerek, 30 günlük hızlı çıkış stratejimiz için en kritik yazılım modüllerini ve veri modelini netleştireceğim.

Researching websites...

researchgate.net
The Problems of Project Management Companies in the Turkish Construction and the Real Estate Industries | Request PDF - ResearchGate

dergipark.org.tr
Effect of Sub-Contractor Selection on Construction Project Success in Turkey* - DergiPark

irbnet.de
Main Problems in Standard Contract Documents of Turkish Construction Industry

etd.lib.metu.edu.tr
AN INVESTIGATION ON THE APPLICATION OF STANDARD CONTRACTS IN THE TURKISH CONSTRUCTION INDUSTRY A THESIS SUBMITTED TO THE GRADU

sci-hub.box
Secondary subcontracting in the Turkish construction industry - Sci-Hub

gelecekinsaat.com
Sık Yapılan İnşaat Hataları ve Nasıl Önlenir?
Vergi Regülasyonları ve Finansal Optimizasyon
2025 yılı için güncellenen KDV tevkifat oranlarının sektör üzerindeki etkilerini analiz ediyorum; raylı sistemler gibi stratejik alanlarda oranın %1’e çekilmesinin nakit akışı planlamasında yarattığı yeni denklemi çözümlüyorum. Bu tür dinamik mevzuat değişikliklerinin teklif süreçlerine gerçek zamanlı entegrasyonunun, yükleniciler için finansal bir koruma kalkanı oluşturacağını sentezliyorum. Özellikle kamu ve özel sektör projeleri arasındaki bu vergi farklılıklarının hakediş tablolarına hatasız yansıtılması noktasındaki kritik gereksinimleri değerlendiriyorum.
Gayriresmi İş Akışları ve Kurumsal Hafıza
Saha ekiplerinin WhatsApp ve telefon görüşmeleri üzerinden yürüttüğü informel iletişim ağını, kurumsal bir veri disiplinine dönüştürmenin yollarını kurguluyorum. Teknik ofislerin hazırladığı keşif özetleri ile piyasadaki anlık malzeme fiyat dalgalanmaları arasındaki makasın, projelerin karlılığını nasıl tehdit ettiğini derinlemesine inceliyorum. Bu kontrolsüz veri akışını, yapay zeka yardımıyla anlamlı birer maliyet girdisine dönüştürerek teklif revizyonlarındaki hata payını minimize edecek bir yapı tasarlıyorum.
Teknik Ofis Otomasyonu ve Ürün Stratejisi
Bir sonraki adımda, pazar lideri yazılımların hantal kalan modüllerini alternatif yöntemlerle analiz ederek, kullanıcıyı yormayan daha çevik bir metraj ve birim fiyat yönetim sistemi kurgulayacağım. Türkiye'nin farklı bölgelerindeki şantiye alışkanlıklarını ve aile şirketlerinin dijitalleşme direncini kıracak 'en yalın' kullanıcı deneyimini modellemeye odaklanıyorum. Özellikle 30 günlük hızlı çıkış stratejimiz için en yüksek katma değeri sağlayacak temel veri modelini ve teknik ofis otomasyon modüllerini netleştirmeyi hedefliyorum.

Researching websites...

oska.com.tr
HakedişBulut Kullanım Kılavuzu - Oska Yazılım

oska.com.tr
HakedişPlus Kullanım Kılavuzu - Oska Yazılım

yandex.com.tr
"Yapı İşletmesi Metraj ve Keşif Sistemi" makalesinin özeti — YaÖzet - Yandex
Mevzuat Dinamikleri ve Hakediş Doğruluğu
İnşaat muhasebesinde kritik bir yere sahip olan hakediş süreçlerinde, 2025 yılına ait yeni vergi tevkifat oranlarının uygulama farklılıklarını analiz ediyorum. Raylı sistemler ve gemi inşaatı gibi projelerde değişen oranların, genel inşaat işlerinden nasıl ayrıştığını ve bu ayrımın yanlış yönetilmesinin nakit akışında yaratacağı tahribatı sentezliyorum. Bu karmaşık yapıyı hatasız bir otomasyona dönüştürerek, teknik ofislerin manuel hesaplama yükünü ortadan kaldıracak bir finansal katman kurguluyorum.
Resmi Birim Fiyatlar ve Piyasa Makası
Bakanlık tarafından yayınlanan resmi birim fiyat kitapçıkları ile sahadaki gerçek malzeme maliyetleri arasındaki kronik tutarsızlığı derinlemesine inceliyorum. Teknik ofislerin hazırladığı keşif özetlerinde bu makasın karlılığı nasıl erittiğini ve revizyon tekliflerinin neden bir versiyon karmaşasına dönüştüğünü çözümledim. Yerel pazardaki köklü yazılım çözümlerinin bu dinamik fiyat değişimlerine ve döviz kuru oynaklığına ayak uyduramayan hantal yapılarını, yapay zeka destekli bir veri modeliyle nasıl dönüştürebileceğimi değerlendiriyorum.
Pazar Odaklı Geliştirme ve MVP Stratejisi
Bir sonraki aşamada, teknik ofislerin operasyonel yükünü hafifletecek metraj ve birim fiyat yönetim modüllerinin detaylarına odaklanacağım. Özellikle Türkiye'deki güvene dayalı iş kültürünü ve informel iletişim kanallarını kurumsal bir hafızaya dönüştürecek en yalın kullanıcı deneyimini tasarlıyorum. 30 günlük hızlı çıkış planımız için en yüksek katma değeri sunacak olan dinamik teklif revizyonu ve karlılık analizi araçlarını netleştirmeyi hedefliyorum.

Researching websites...

opwire.app
Ataşman, Metraj ve Birim Fiyat Analizi: Hakedişin Temelleri - Opwire App

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net

vergiport.com
Yıllara Yaygın İnşaat ve Onarım İşlerine Yönelik Tevkifatın Oranı Bazı Yıllara Sâri İşler İçin ％1'e Düşürülmüştür - Vergiport
Vergi Mevzuatı ve Stratejik Finans Yönetimi
2025 yılı itibarıyla raylı sistemler ve gemi inşaatı gibi belirli teknik alanlarda tevkifat oranlarının %1'e düşürülmesinin, genel inşaat işlerindeki %5'lik oranla yarattığı finansal ayrışmayı analiz ediyorum. Bu tür mevzuat değişikliklerinin hakediş süreçlerine anlık yansıtılmamasının nakit akışında ciddi kayıplara yol açtığını saptadım. Teklif hazırlama sisteminin bu yasal parametreleri otomatik olarak hesaplamasının, teknik ofislerin manuel hata payını sıfırlayarak yükleniciye sağlayacağı rekabet avantajını sentezliyorum.
Operasyonel Tıkanıklıklar ve Veri Disiplini
Sektörde özellikle metraj ve keşif özeti hazırlarken yaşanan versiyon karmaşasının, maliyetlerin eksik hesaplanmasına ve dolayısıyla karlılığın erimesine neden olan temel faktör olduğunu tespit ettim. Küçük ve orta ölçekli firmaların informal kanallar üzerinden yürüttüğü teklif alışverişini, birim fiyat kütüphaneleriyle entegre bir dijital hafızaya dönüştürmenin yollarını kurguluyorum. Mevcut yerleşik çözümlerin hantal kaldığı dinamik fiyat güncelleme ve döviz kuru oynaklığına uyum süreçlerini, daha çevik bir veri modeliyle çözmeyi hedefliyorum.
Ürün Stratejisi ve Gelecek Adımlar
Bir sonraki aşamada, Türkiye pazarındaki teknik ofis çalışanlarının günlük iş yükünü en çok hafifletecek olan 'metraj-keşif-hakediş' döngüsünün otomasyonuna odaklanacağım. 30 günlük hızlı çıkış stratejimiz için en yüksek ticari değeri sunacak olan yapay zeka destekli teklif revizyon modülünü detaylandırıyorum. Aile şirketi yapılarındaki dijitalleşme direncini kıracak, en yalın ve kullanıcı dostu arayüz kurgularını oluşturarak pazarın en hızlı nüfuz edilebilecek niş alanını netleştirmeyi planlıyorum.

Researching websites...

turuncuacademy.com.tr
İnşaat Projelerinde Teknik Ofis Mühendisinin Görevleri: Stratejik Bir Bakış

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net

salimdemirel.com.tr
HAK EDİŞLERİN ZAMANINDA ÖDENMEMESİ SÜRE UZATIM NEDENİ MİDİR? - Kamu İhale Danışmanı Salim Demirel
Alt Yüklenici Yönetimi ve Standartlaştırma
Farklı alt yüklenicilerden gelen, genellikle standart olmayan ve karşılaştırması zor tekliflerin merkezi bir veri modeline dönüştürülmesinin, projenin toplam karlılık analizindeki kritik rolünü çözümlüyorum. Birim fiyatların sadece malzeme bazlı değil; işçilik, nakliye ve lojistik gibi gizli maliyet kalemleriyle nasıl harmanlandığını ve bu veri dağınıklığının teklif revizyonlarındaki ana hata kaynağı olduğunu saptadım. Bu süreci otomatize ederek, dağınık teklifleri tek bir 'keşif özeti' potasında eritecek bir yapı kurguluyorum.
Fiyat Farkı Hesaplamaları ve Endeks Entegrasyonu
Kamu ihalelerinde kullanılan resmi fiyat farkı formülleri ile özel sektördeki döviz bazlı maliyet artışları arasındaki yöntemsel çelişkileri gideriyorum. TÜİK inşaat maliyet endekslerinin tekliflere dinamik olarak yedirilmesinin, yüklenicileri ani kur şoklarına karşı koruyacak bir finansal koruma katmanı oluşturacağını analiz ettim. Yazılımın bu karmaşık matematiksel modelleri arka planda otomatikleştirerek, teknik ofislerin her döviz hareketinde manuel hesaplama yapma zorunluluğunu nasıl ortadan kaldırabileceğini tasarlıyorum.
Modüler Mimari ve Stratejik Yol Haritası
Bir sonraki adımda, analiz ettiğim 10 temel kavramı birbiriyle entegre çalışan bir veri tabanı modeline dökerek kullanıcı senaryolarını detaylandıracağım. Özellikle 30 günlük MVP sürecinde hangi modülün (metraj doğruluğu mu, yoksa dinamik karlılık analizi mi?) öncelikli olması gerektiğini, yerel rakiplerin zayıf kaldığı yapay zeka tabanlı hata denetimi üzerinden kurgulayarak en hızlı gelir getirecek ticari giriş noktasını netleştireceğim.

Researching websites...

ercantetik.com
2025 Yılı Tevkifatlı Fatura Sınırı - Ercan Tetik

insaatim.com
Hakediş Hazırlama Rehberi - İnşaatım.com

interax.com.tr
Hakediş Nedir? Nasıl Yapılır? - Interax

komut.org.tr
inşaat malzemelerindeki fiyat artışı sektörü durma noktasına getirdi - KONYA MÜTEAHHİTLER BİRLİĞİ DERNEĞİ - KOMÜT

gaziantepsabah.com
Dalgalanan döviz inşaat sektörünü dalgalandırdı - Gaziantep Sabah Gazetesi
Mevzuat Güncellemeleri ve Finansal Keskinlik
2025 yılı itibarıyla raylı sistemler ve gemi inşaatı gibi projelerde tevkifat oranlarının %1'e indirilmesi gibi güncel yasal değişikliklerin hakediş süreçlerine etkisini analiz ediyorum. Bu dinamik verilerin, teklif hazırlama yazılımında manuel müdahaleye gerek kalmadan otomatik olarak güncellenmesinin, firmaların nakit akışı yönetiminde nasıl bir koruma kalkanı oluşturacağını sentezliyorum. Özellikle bu tür spesifik vergi kalemlerinin yanlış hesaplanmasının projelerin toplam karlılığındaki gizli aşınmaları nasıl tetiklediğini inceliyorum.
Resmi Veriler ile Piyasa Gerçekleri Arasındaki Uyum
Kamu ihale mevzuatındaki resmi birim fiyatlar ile piyasadaki döviz bazlı malzeme maliyetleri arasındaki derin uçurumu ve bu durumun teklif revizyon süreçlerinde yarattığı karmaşayı çözümlüyorum. Geleneksel yöntemlerin yetersiz kaldığı bu noktada, anlık endeks verilerini ve kur değişimlerini sisteme entegre ederek yüklenicilerin karlılıklarını koruyacak bir veri disiplini kurguluyorum. Teknik ofislerin en büyük sancısı olan 'doğru fiyatlandırma' sorununu, statik tablolardan dinamik bir yapıya dönüştürme fırsatlarını değerlendiriyorum.
Rekabet Analizi ve Veri Modelleme Odağı
Bir sonraki aşamada, yerel pazardaki köklü oyuncuların teknolojik eksikliklerini ve kullanıcı deneyimi zayıflıklarını derinlemesine inceleyerek hangi noktada ayrışabileceğimizi belirleyeceğim. Araştırdığım 10 kritik kavramı birbiriyle konuşan bir veri modeline dökerek, 30 günlük MVP sürecinde en hızlı gelir üretecek ve kullanıcıyı doğrudan çözümle buluşturacak modül önceliklendirmesini tamamlamayı hedefliyorum. Özellikle aile şirketlerinin dijitalleşme direncini kıracak en yalın kullanıcı senaryolarını netleştireceğim.

Researching websites...

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net

vergiport.com
Yıllara Yaygın İnşaat ve Onarım İşlerine Yönelik Tevkifatın Oranı Bazı Yıllara Sâri İşler İçin ％1'e Düşürülmüştür - Vergiport
Mevzuat Hassasiyeti ve Nakit Akışı
2025 yılı Mart ayında yayımlanan 9707 sayılı Cumhurbaşkanı Kararı ile raylı sistemler ve metro inşaatlarında tevkifat oranının %1’e çekilmesi gibi çok spesifik yasal verileri analizlerime dahil ettim. Bu tür detayların sadece birer bilgi değil, hakediş modülünde tarih bazlı çalışan otomatik kurallar bütünü olarak kurgulanması gerektiğini netleştirdim. Hatalı oran kullanımının yarattığı finansal yükü ortadan kaldıracak ve nakit akışını koruyacak veri yapısını, projenin türüne göre dinamikleşecek şekilde optimize ediyorum.
Dinamik Fiyatlandırma ve Veri Mimarisi
Bakanlık birim fiyatları ile piyasa maliyetleri arasındaki kronik makasın, tekliflerin geçerlilik süresini kısıtlayan en büyük risk olduğunu değerlendiriyorum. Bu doğrultuda; malzeme, işçilik ve lojistik kalemlerini birbirinden ayıran, döviz kurlarındaki anlık değişimleri bu alt kalemlere doğrudan yansıtabilen esnek bir veri modeli kurguluyorum. Keşif özetinin artık statik bir tablo değil, piyasa endeksleriyle konuşan canlı bir maliyet simülasyonuna dönüştürülmesi gerektiği sonucuna varıyorum.
Kullanıcı Deneyimi ve Stratejik Konumlandırma
Bir sonraki aşamada, metrajdan karlılık hesabına kadar uzanan 10 temel kavramın her biri için detaylı veri tabanı alanlarını ve kullanıcı senaryolarını oluşturmaya odaklanacağım. Yerel rakiplerin zayıf kaldığı karşılaştırmalı alt yüklenici yönetimi ve yapay zeka destekli hata denetimi özelliklerini ön plana çıkararak, 30 günlük hızlı çıkış süreci için en keskin ürün kapsamını netleştirmeyi ve pazara en hızlı nüfuz edilecek niş alanı belirlemeyi planlıyorum.

Researching websites...

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net

opwire.app
Hakediş Nasıl Yapılır? İnşaat Sektöründe Hakediş Süreçleri - Opwire App

interax.com.tr
Hakediş Nedir? Nasıl Yapılır? - Interax

hakedis.org
Hakediş Nedir, Nasıl Düzenlenir

amp.com.tr
Anahtar Teslimi Götürü Bedel Hakediş Nasıl Yapılır? (Yapım İşleri – Gerçekleşme Yüzdesi Kullanarak) - AMP Yazılım

avys.omu.edu.tr
HAKEDİŞ VE İNŞAAT DEFTERLERİ
Yerel Yazılım Ekosistemi ve Rekabetçi Boşluklar
Pazarda standart haline gelmiş Oska, AMP Yazılım ve Logo gibi yerleşik oyuncuların teknik yeteneklerini ve kullanıcı arayüzü kısıtlamalarını mercek altına alıyorum. Bu hantal yapıların, modern teknik ofis ihtiyaçlarını karşılamaktaki yetersizliğini ve özellikle yapay zeka entegrasyonu konusundaki eksikliklerini analiz ederek, yeni nesil bir SaaS çözümünün hangi noktalarda kaldıraç etkisi yaratabileceğini sentezliyorum.
Informel Süreçler ve Dijital Hafıza Dönüşümü
Sektörde hakim olan WhatsApp ve telefon trafiğine dayalı informal iş akışlarını, kurumsal bir veri disiplinine dönüştürmenin yollarını düşünüyorum. Özellikle aile şirketi yapısındaki yüklenicilerin güvene dayalı çalışma kültürünü bozmadan, metraj ve keşif süreçlerini nasıl dijital bir hafızaya entegre edebileceğimi ve bu sayede teklif revizyonlarındaki kontrol kaybını nasıl engelleyeceğimi çözümlüyorum.
Veri Mimarisi ve MVP Önceliklendirmesi
Bir sonraki aşamada, teklif hazırlamadan karlılık analizine kadar uzanan on temel kavramı birbirine bağlayan ilişkisel bir veri modeli kurgulayacağım. Türkiye'deki bölgesel fiyat farklılıklarını ve döviz kuru volatilitesini de hesaba katarak, 30 günlük hızlı çıkış stratejimiz için en kritik yazılım modüllerini ve kullanıcı senaryolarını detaylandırarak ticari yol haritasını netleştirmeyi planlıyorum.
Organizasyonel Roller ve Veri Entegrasyonu
Teknik ofis, satın alma ve muhasebe departmanları arasındaki kopuk veri akışının, teklif hazırlama süresini nasıl uzattığını ve hatalı maliyet hesaplamalarına yol açtığını sentezliyorum. Şantiye mühendisinin sahadan girdiği metraj verisinin, muhasebe biriminin hakediş tablosuna otomatik ve hatasız bir şekilde akmasını sağlayacak entegre bir yapı üzerinde düşünüyorum. Alt yüklenicilerden gelen heterojen teklif formatlarını merkezi bir veri modeline dönüştürerek, karmaşık karşılaştırmalı analiz süreçlerini nasıl standartlaştırabileceğimi kurguluyorum.
Maliyet Oynaklığı ve Revizyon Stratejileri
Malzeme fiyatlarındaki dalgalanmalar nedeniyle geçerliliğini hızla yitiren tekliflerin, dinamik revizyon mekanizmalarıyla nasıl güncel tutulabileceğini analiz ediyorum. Birim fiyat kütüphanesinin piyasa endeksleri ve döviz kurlarıyla doğrudan beslenmesinin, teknik ofislerin her fiyat hareketinde manuel hesaplama yapma yükünü ortadan kaldıracak kritik bir çözüm olduğunu saptadım. Bu dinamik yapıyı, yüklenicilerin kâr marjlarını korumak adına bir finansal koruma kalkanı ve erken uyarı sistemi olarak modellemeyi hedefliyorum.
Veri Modelleme ve Ticari Odak
Bir sonraki adımda, analiz ettiğim on kritik kavramı kapsayan detaylı veri tabanı şemalarını ve uçtan uca kullanıcı senaryolarını hazırlayacağım. Mevcut yerel çözümlerin hantal kaldığı yapay zeka tabanlı hata denetimi ve otomatik hakediş oluşturma özelliklerini önceliklendirerek, 30 günlük hızlı çıkış sürecinde pazara en yüksek ticari ivmeyle girecek modül kombinasyonunu netleştirmeyi planlıyorum.
Mevzuat Güncellemeleri ve Finansal Keskinlik
2025 yılı Mart ayında yürürlüğe giren ve raylı sistemler ile gemi inşaatı gibi belirli teknik alanlarda tevkifat oranını %1'e düşüren yeni Cumhurbaşkanı Kararlarını analizlerime dahil ettim. Bu tür spesifik vergi düzenlemelerinin hakediş süreçlerine anlık olarak yansıtılmamasının, büyük ölçekli projelerin nakit akışı yönetiminde ciddi sapmalara yol açtığını saptadım. Hazırlayacağım çözümün bu yasal parametreleri otomatik bir kural seti olarak kurgulamasının, teknik ofislerin manuel hesaplama yükünü sıfırlayarak finansal bir koruma kalkanı oluşturacağını sentezliyorum.
Kamu ve Özel Sektör Metodoloji Farklılıkları
Kamu İhale Kanunu'na tabi projelerdeki katı birim fiyat disiplini ile özel sektörün döviz bazlı esnek teklif süreçleri arasındaki yapısal çelişkileri çözümlüyorum. Resmi birim fiyat kitapçıkları ile piyasadaki gerçek malzeme maliyetleri arasındaki kronik makasın, yüklenicilerin karlılık hesaplamalarını nasıl tehdit ettiğini derinlemesine inceliyorum. Bu tutarsızlığı gidermek adına, statik keşif özetlerini piyasa endeksleriyle konuşan dinamik maliyet simülasyonlarına dönüştürecek bir veri yapısı tasarlıyorum.
Teknik Ofis Otomasyonu ve Ürün Stratejisi
Bir sonraki adımda, metraj çıkarma ve alt yüklenici tekliflerinin merkezi bir veri modeline dönüştürülmesi süreçlerindeki operasyonel tıkanıklıklara odaklanacağım. Türkiye'deki aile şirketlerinin dijitalleşme direncini kıracak ve WhatsApp üzerinden yürütülen informel iletişimi kurumsal bir hafızaya aktaracak en yalın kullanıcı deneyimini modellemeye başlıyorum. 30 günlük hızlı çıkış stratejimiz için en yüksek ticari değeri sunacak olan akıllı teklif revizyon modülünü detaylandırmayı hedefliyorum.

Researching websites...

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net
Hakediş Belgeleri ve Veri Entegrasyonu
Türk şantiyelerinde hakediş süreçlerinin temelini oluşturan Yeşil Defter ve Ataşman gibi geleneksel dökümantasyon yöntemlerinin dijitalleştirilmesinin, veri doğruluğu üzerindeki kritik etkisini sentezliyorum. Bu belgelerden gelen sahadaki fiili metraj verilerinin, teklif aşamasındaki keşif özetiyle dinamik bir şekilde konuşmamasının yarattığı operasyonel körlüğü analiz ederek, kurgulayacağım sistemin bu veri kopukluğunu nasıl giderebileceğini değerlendiriyorum.
Fiyat Farkı ve Endeks Yönetimi
Kamu projelerindeki resmi fiyat farkı hesaplamaları ile piyasadaki malzeme fiyat dalgalanmaları arasındaki makası daraltacak yöntemler üzerine düşünüyorum. Yerel yazılım pazarındaki mevcut araçların döviz kuru volatilitesine ve anlık maliyet artışlarına karşı hantal kalan yapılarını, daha çevik bir endeks takip mekanizmasıyla nasıl aşabileceğimizi ve yüklenicilerin kâr marjlarını ani piyasa şoklarına karşı nasıl koruyabileceğimizi planlıyorum.
Operasyonel Senaryolar ve Yazılım Kurgusu
Bir sonraki aşamada, araştırmamdaki on temel kavramı birbirine bağlayan ilişkisel veri tabanı alanlarını ve uçtan uca kullanıcı senaryolarını detaylandırmaya odaklanacağım. 30 günlük süreçte en hızlı ticari başarıyı getirecek olan ve teknik ofislerin manuel iş yükünü en çok azaltan 'akıllı teklif hazırlama' modülünü MVP kapsamında önceliklendirerek stratejik yol haritasını tamamlamayı hedefliyorum.
Güncel Vergi Düzenlemeleri ve Nakit Akışı
2025 yılı Nisan ayı itibarıyla yürürlüğe giren ve demiryolu, metro gibi belirli inşaat projelerinde KDV tevkifat oranını %5'ten %1'e indiren 9707 sayılı Cumhurbaşkanı Kararı'nı analizlerime dahil ettim. Bu tür çok yeni ve kritik yasal değişikliklerin hakediş hesaplamalarına hatasız yansıtılmasının, özellikle büyük ölçekli altyapı projelerini yöneten yükleniciler için nakit akışında nasıl stratejik bir avantaj sağlayacağını sentezliyorum. Sistemin bu değişken oranları otomatik olarak tanıyan bir kural motoruyla çalışması gerektiğini kurguluyorum.
Geleneksel Dökümantasyonun Dijital Hafızaya Dönüşümü
Şantiyelerde metraj doğruluğunun bel kemiği olan Yeşil Defter ve Ataşman gibi geleneksel kayıt tutma yöntemlerini, teknik ofislerin operasyonel yükünü hafifletecek bir veri modeline nasıl entegre edebileceğimi düşünüyorum. Kağıt üzerindeki verinin hakediş tablolarına akarken yaşadığı kayıpları ve versiyon karmaşasını analiz ederek, bu süreçlerin dijital bir disipline kavuşturulmasının teklif revizyon hızını nasıl artıracağını ve karlılık sapmalarını nasıl önleyeceğini değerlendiriyorum.
Ürün Yol Haritası ve Rekabetçi Konumlandırma
Bir sonraki aşamada, yerel pazardaki Oska ve AMP gibi köklü rakiplerin hantal kaldığı arayüz ve kullanıcı deneyimi eksikliklerini çözümleyerek, yapay zeka destekli hata denetimi modülünün detaylarına odaklanacağım. Araştırdığım on temel kavramı birbirine bağlayan ilişkisel bir veri tabanı yapısı kurgulayıp, 30 günlük hızlı çıkış stratejimiz için en yüksek ticari katma değeri sunacak olan 'dinamik teklif ve keşif yönetimi' modülünü netleştirmeyi hedefliyorum.

Researching websites...

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net
Mevzuat Dinamikleri ve Finansal Koruma
2025 Nisan itibarıyla yürürlüğe giren ve metro inşaatı gibi stratejik alanlarda tevkifat oranlarını %5'ten %1'e indiren yeni yasal düzenlemelerin nakit akışı üzerindeki etkilerini analiz ettim. Bu tür spesifik ve güncel vergi değişimlerinin hakediş tablolarına anlık ve hatasız entegrasyonunun, büyük ölçekli yükleniciler için finansal bir koruma kalkanı işlevi göreceğini sentezliyorum. Manuel hesaplamalardan kaynaklanan cezai riskleri sıfırlayacak bir otomasyon katmanı üzerinde çalışıyorum.
Geleneksel Kayıtların Dijital Disipline Aktarımı
Saha operasyonlarının bel kemiği olan Yeşil Defter ve Ataşman gibi geleneksel kayıt yöntemlerinin, teknik ofislerde hazırlanan keşif özetleriyle olan veri kopukluğunu çözümlüyorum. Şantiyeden gelen fiili metraj verilerinin dijital bir hafızaya aktarılmamasının yarattığı versiyon karmaşasını ve hakedişlerdeki veri kayıplarını engelleyecek entegre bir yapı kurguluyorum. Bu sayede teklif revizyon hızını artırırken, operasyonel körlüğü ortadan kaldırmayı hedefliyorum.
MVP Kapsamı ve Veri Mimarisi Stratejisi
Bir sonraki adımda, incelediğim on temel kavramı birbirine bağlayan ilişkisel bir veri tabanı modeli oluşturarak 30 günlük hızlı çıkış stratejimiz için kritik modülleri netleştireceğim. Mevcut yerel çözümlerin hantal kaldığı yapay zeka destekli hata denetimi ve piyasa endeksleriyle konuşan dinamik karlılık analizi özelliklerini önceliklendiriyorum. Teknik ofis çalışanlarının üzerindeki manuel iş yükünü en çok azaltacak ve pazara en hızlı nüfuz etmemizi sağlayacak kullanıcı senaryolarını detaylandırarak ticari yol haritasını tamamlamayı planlıyorum.

Researching websites...

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net

avys.omu.edu.tr
HAKEDİŞ VE İNŞAAT DEFTERLERİ
Teknik Ofis Kılavuzları ve İş Akış Analizi
İnşaat sektöründe kullanılan teknik el kitaplarını ve uzman görüşlerini inceleyerek; metraj, keşif özeti ve birim fiyat analizi gibi süreçlerin fiili uygulama adımlarını derinleştiriyorum. Bu aşamada, sadece tanımlarla yetinmeyip, bir teknik ofis çalışanının karmaşık tablolarda karşılaştığı formül hatalarını ve versiyonlama sorunlarını dijital bir sistemde nasıl minimize edebileceğimi kurguluyorum. Teknik ofislerin hazırladığı tekliflerin şantiye gerçekleriyle uyuşmaması noktasındaki metodolojik boşlukları sentezliyorum.
Rakip Yazılımların Analizi ve Kullanıcı Sancıları
Pazar lideri olan geleneksel hakediş yazılımlarının teknik yetersizliklerini ve kullanıcı deneyimi tarafındaki darboğazları mercek altına aldım. Özellikle modern SaaS beklentilerinin uzağında kalan hantal yapılar ile veri paylaşımı konusundaki kısıtların, saha ve ofis arasındaki senkronizasyonu nasıl bozduğunu analiz ediyorum. Bu geleneksel araçların yapay zeka entegrasyonu ve dinamik fiyat güncelleme konularındaki eksikliklerini, yeni nesil bir çözüm için stratejik bir kaldıraç olarak değerlendiriyorum.
Veri Yapılandırması ve Ürün Odaklı Yol Haritası
Bir sonraki adımda, elde ettiğim bu saha pratiklerini ve rakip analizlerini birleştirerek, yazılımın omurgasını oluşturacak ilişkisel veri modelini tasarlamaya başlayacağım. Türkiye pazarında en hızlı ticari ivmeyi yakalamak adına, 30 günlük MVP sürecinde hangi modüllerin öncelikli olması gerektiğini ve yapay zekanın teklif hazırlama hızını nasıl artırabileceğini detaylandırmayı hedefliyorum. Özellikle teknik ofis çalışanlarının üzerindeki manuel veri giriş yükünü en çok azaltacak senaryolara odaklanacağım.

Researching websites...

oska.com.tr
Kullanıcılarımızın Görüşleri - Oska Yazılım
Bütünsel Süreç Analizi ve Terminoloji Uyumu
Teklif hazırlamadan karlılık hesabına kadar uzanan on kritik kavramın, Türkiye'deki şantiye ve ofis pratiklerinde nasıl bir zincirleme reaksiyon oluşturduğunu sentezliyorum. Özellikle birim fiyat analizlerinin alt yüklenici teklifleriyle harmanlanması ve bu verilerin hakediş süreçlerindeki saha kayıtlarıyla nasıl doğrulanması gerektiğini, veri kaybını önleyen dijital bir disiplin çerçevesinde kurguluyorum.
Piyasa Volatilitesi ve Kar Marjı Koruması
Döviz kurlarındaki ani değişimler ve malzeme maliyetlerindeki belirsizliklerin, teknik ofislerin hazırladığı keşif özetlerini ne kadar hızlı geçersiz kıldığını çözümlüyorum. Özellikle alt yüklenicilerden gelen dağınık teklif formatlarını standart bir veri modeline dönüştürerek, fiyat farkı hesaplamalarını ve karlılık analizlerini dinamik endekslere bağlayan bir finansal güvenlik katmanı tasarlıyorum.
Teknik Modelleme ve MVP Kapsamlandırma
Bir sonraki adımda, araştırdığım tüm süreçleri kapsayan ilişkisel veri tabanı yapılarını ve uçtan uca kullanıcı senaryolarını detaylandıracağım. Pazardaki köklü rakiplerin hantal kaldığı arayüz deneyimini modernleştirerek, 30 günlük hızlı gelir hedefimize hizmet edecek en kritik yapay zeka destekli teklif modüllerini ve veri alanlarını netleştirmeyi planlıyorum.

Researching websites...

vergiport.com
Yıllara Yaygın İnşaat ve Onarım İşlerine Yönelik Tevkifatın Oranı Bazı Yıllara Sâri İşler İçin ％1'e Düşürülmüştür - Vergiport

avys.omu.edu.tr
HAKEDİŞ VE İNŞAAT DEFTERLERİ
Güncel Mevzuat ve Stratejik Finans Yönetimi
2025 Nisan ayı itibarıyla yürürlüğe giren ve raylı sistemler ile gemi inşaatı projelerinde tevkifat oranını %5'ten %1'e indiren 9707 sayılı Cumhurbaşkanı Kararı'nın hakediş süreçleri üzerindeki etkilerini analiz ettim. Bu tür kritik yasal değişikliklerin, özellikle kamu ihalelerine giren yüklenicilerin nakit akışı yönetiminde nasıl bir kaldıraç etkisi yaratacağını ve hatalı hesaplamalardan kaynaklanan finansal riskleri nasıl minimize edeceğini sentezliyorum.
Birim Fiyat Uyumsuzlukları ve Karlılık Koruma
Resmi birim fiyat kitapçıkları ile piyasadaki döviz bazlı malzeme maliyetleri arasındaki kronik makasın, teknik ofislerin hazırladığı keşif özetlerini ne kadar hızlı geçersiz kıldığını saptadım. Bu tutarsızlığı gidermek amacıyla, statik tablolar yerine piyasa endeksleriyle ve güncel döviz kurlarıyla dinamik olarak konuşan bir maliyet simülasyonu kurguluyorum. Bu yapı, teklif revizyon süreçlerindeki versiyon karmaşasını sonlandırarak gerçek zamanlı karlılık takibi sağlayacak.
Veri Mimarisi ve Gelecek Adımlar
Bir sonraki aşamada, Yeşil Defter ve Ataşman gibi geleneksel saha kayıt yöntemlerini dijital bir disipline kavuşturacak olan ilişkisel veri tabanı modelini detaylandıracağım. Türkiye'deki aile şirketi yapılarının dijitalleşme direncini kıracak, kullanıcı dostu ve akıllı hata denetimi yapan modülleri önceliklendirerek, 30 günlük hızlı çıkış stratejimiz için en yüksek ticari değeri sunacak MVP kapsamını netleştirmeyi hedefliyorum.

Researching websites...

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net

avys.omu.edu.tr
HAKEDİŞ VE İNŞAAT DEFTERLERİ
Mevzuat Değişiklikleri ve Finansal Modelleme
Demiryolu, tramvay ve finiküler gibi spesifik ulaşım altyapısı projelerinde tevkifat oranının %1'e indirilmesini öngören güncel yasal düzenlemelerin, hakediş süreçleri üzerindeki etkilerini analiz ediyorum. Bu tür spesifik vergi kalemlerinin hatasız yönetilmesinin, yüklenici firmaların nakit akışı planlamasında nasıl bir operasyonel güvenlik duvarı oluşturacağını sentezliyorum.
Piyasa Oynaklığına Karşı Dinamik Maliyet Yönetimi
Resmi birim fiyatlar ile döviz endeksli piyasa maliyetleri arasındaki kronik tutarsızlığın, teknik ofislerin hazırladığı teklifleri ne kadar kısa sürede işlevsiz bıraktığını çözümlüyorum. Geleneksel 'Yeşil Defter' ve 'Ataşman' disiplinini, anlık endeks verileriyle konuşan dijital bir hafızaya dönüştürerek, teklif revizyon süreçlerindeki versiyon karmaşasını ortadan kaldıracak bir yapı kurguluyorum.
SaaS Dönüşümü ve Rekabet Avantajı
Yerel pazardaki yerleşik hantal yazılımların kullanıcı deneyimi ve yapay zeka entegrasyonu konusundaki eksikliklerini birer stratejik fırsat olarak değerlendiriyorum. Aile şirketlerinin dijitalleşmeye olan direncini kıracak, en yalın kullanıcı arayüzü kurgularıyla teknik ofis, satın alma ve şantiye arasındaki veri kopukluğunu gidermeyi hedefliyorum.
Gelecek Adımlar ve MVP Stratejisi
Araştırdığım on temel kavramı birbirine bağlayan kapsamlı bir ilişkisel veri tabanı modeli ve uçtan uca kullanıcı senaryoları tasarlamaya başlıyorum. 30 günlük hızlı çıkış stratejimiz için en yüksek ticari katma değeri sunacak olan akıllı teklif revizyon modülünü önceliklendirerek stratejik yol haritasını netleştireceğim.

Researching websites...

avys.omu.edu.tr
HAKEDİŞ VE İNŞAAT DEFTERLERİ
Mevzuat Takibi ve Finansal Otomasyon
2025 yılı Mart ayı sonunda yürürlüğe giren ve raylı sistem projelerinde tevkifat oranını %1’e indiren 9707 sayılı Cumhurbaşkanı Kararı'nın hakediş süreçleri üzerindeki etkilerini derinlemesine analiz ediyorum. Bu tür çok yeni ve kritik yasal parametrelerin sistem içerisinde otomatik bir kural seti olarak kurgulanmasının, teknik ofislerin manuel hesaplama yükünü sıfırlarken nakit akışını nasıl güvence altına alacağını sentezliyorum. Özellikle kamu projelerinde bu detayların hatasız yönetilmesinin, yükleniciler için finansal bir koruma kalkanı oluşturacağını değerlendiriyorum.
Rekabet Analizi ve Pazar Boşlukları
Pazardaki köklü hakediş ve maliyet yazılımlarının kullanıcı deneyimi tarafındaki hantallıklarını ve bulut tabanlı modern SaaS beklentilerinin gerisinde kalmalarını birer stratejik fırsat olarak inceliyorum. Yüksek enflasyon ve döviz kuru oynaklığı karşısında teknik ofislerin hazırladığı tekliflerin hızla geçerliliğini yitirmesi sorununu, anlık endeks entegrasyonu ve dinamik fiyat güncelleme mekanizmalarıyla nasıl çözebileceğimi planlıyorum. Mevcut araçların yapay zeka entegrasyonundaki eksikliklerini, yeni nesil bir çözüm için temel kaldıraç noktası olarak konumlandırıyorum.
Veri Modelleme ve Gelecek Projeksiyonu
Bir sonraki adımda, araştırdığım on temel kavramı birbirine bağlayan kapsamlı bir ilişkisel veri tabanı yapısı ve uçtan uca kullanıcı senaryoları tasarlamaya odaklanacağım. Özellikle yapay zeka destekli hata denetimi ve otomatik keşif özeti oluşturma modüllerini önceliklendirerek, 30 günlük hızlı çıkış stratejimiz için en yüksek ticari katma değeri sunacak MVP kapsamını ve veri mimarisini netleştirmeyi hedefliyorum.
Güncel Mevzuat ve Finansal Keskinlik
2025 yılı Mart ve Nisan aylarında yürürlüğe giren yeni Cumhurbaşkanı Kararları ile raylı sistemler ve metro inşaatı gibi alanlarda KDV tevkifat oranlarının %1'e düşürülmesinin finansal yansımalarını derinlemesine analiz ettim. Bu tür spesifik yasal parametrelerin hakediş süreçlerine anlık entegrasyonu, yükleniciler için sadece bir kolaylık değil, nakit akışını koruyan stratejik bir güvenlik kalkanıdır. Manuel hesaplamalardan kaynaklanan cezai riskleri sıfırlayacak bir otomasyon katmanı üzerinde çalışıyorum.
Saha Pratikleri ve Veri Bütünlüğü
Geleneksel metraj disiplininin temel taşları olan Yeşil Defter ve Ataşman kayıtlarının teknik ofislerdeki keşif özetleriyle olan kopukluğunu giderecek bir yapı kurguluyorum. Şantiyeden gelen fiili verilerin, birim fiyat kütüphaneleriyle konuşan dijital bir hafızaya aktarılmamasının yarattığı versiyon karmaşasını ve hakediş hatalarını, yapay zeka destekli bir otomasyon katmanıyla çözüme kavuşturmayı hedefliyorum. Resmi birim fiyatlar ile döviz endeksli piyasa maliyetleri arasındaki tutarsızlığı dinamik veri modelleriyle dengelemeyi amaçlıyorum.
Veri Mimarisi ve MVP Yol Haritası
Bir sonraki aşamada, araştırmamdaki on temel kavramı birbirine bağlayan ilişkisel bir veri tabanı modeli oluşturarak, 30 günlük hızlı çıkış stratejimiz için kritik olan 'dinamik teklif revizyonu' modülünü detaylandıracağım. Pazardaki hantal yerel rakiplerin aksine, kullanıcıyı yormayan en yalın arayüz kurgusunu ve piyasa endeksleriyle anlık güncellenen karlılık analiz araçlarını önceliklendirerek stratejik yol haritasını tamamlıyorum.
Mevzuat Dinamikleri ve Finansal Güvenlik
2025 yılının Mart ve Nisan aylarında yürürlüğe giren ve raylı sistemler gibi stratejik projelerde KDV tevkifat oranlarını %1'e indiren yeni Cumhurbaşkanı Kararlarının finansal yansımalarını derinlemesine analiz ediyorum. Bu tür güncel yasal parametrelerin hakediş süreçlerine anlık entegrasyonunun, yükleniciler için sadece bir kolaylık değil, nakit akışını koruyan kritik bir güvenlik kalkanı olduğunu sentezliyorum. Manuel hesaplamalardan kaynaklanan cezai riskleri ve finansal kayıpları sıfırlayacak bir otomasyon katmanı üzerinde yoğunlaşıyorum.
Saha Pratikleri ve Veri Senkronizasyonu
Türkiye'deki şantiye disiplininin temel taşları olan 'Yeşil Defter' ve 'Ataşman' kayıtlarının, teknik ofislerde hazırlanan keşif özetleriyle olan kronik veri kopukluğunu çözümlüyorum. Sahadan gelen fiili metraj verilerinin dijital bir hafızaya aktarılmamasının yarattığı versiyon karmaşasını ve hakediş hatalarını engelleyecek bütünleşik bir yapı kurguluyorum. Resmi birim fiyatlar ile döviz endeksli piyasa maliyetleri arasındaki tutarsızlığı, dinamik veri modelleriyle dengeleyerek operasyonel körlüğü ortadan kaldırmayı hedefliyorum.
Veri Modelleme ve Stratejik Yol Haritası
Araştırdığım on temel kavramı birbirine bağlayan kapsamlı bir ilişkisel veri tabanı modeli oluşturarak, 30 günlük hızlı çıkış stratejimiz için en kritik olan 'dinamik teklif revizyonu' ve 'akıllı karlılık analizi' modüllerini detaylandırıyorum. Pazardaki hantal yerel rakiplerin aksine, kullanıcıyı yormayan en yalın arayüz kurgusunu ve piyasa endeksleriyle anlık güncellenen veri yapılarını önceliklendirerek ticari yol haritasını tamamlamaya odaklanıyorum.
Finansal Regülasyonlar ve Operasyonel Keskinlik
2025 yılı Nisan ayı itibarıyla raylı sistemler ve metro inşaatı gibi belirli teknik alanlarda tevkifat oranlarının %1'e indirilmesi gibi çok yeni yasal düzenlemeleri analizlerime dahil ettim. Bu tür spesifik vergi parametrelerinin hakediş süreçlerine anlık ve hatasız entegrasyonunun, yükleniciler için finansal bir güvenlik kalkanı oluşturacağını sentezliyorum. Manuel hesaplamalardan kaynaklanan cezai riskleri ve nakit akışı sapmalarını sıfırlayacak bir otomasyon katmanı üzerinde çalışıyorum.
Piyasa Dinamikleri ve Metodolojik Dönüşüm
Türkiye'deki inşaat kültüründe yer alan 'metraj-keşif-hakediş' döngüsünü, resmi birim fiyat kitapçıkları ile piyasadaki döviz bazlı gerçek maliyetler arasındaki kronik makası giderecek şekilde yeniden kurguluyorum. WhatsApp ve telefon trafiğine dayalı informal iş akışlarını, kurumsal bir veri disiplinine dönüştürerek teklif revizyonlarındaki versiyon karmaşasını ve kontrol kaybını engelleyecek bir dijital hafıza yapısı tasarlıyorum.
Ürün Modelleme ve MVP Stratejisi
Bir sonraki adımda, incelediğim on temel kavramı birbirine bağlayan ilişkisel bir veri tabanı modeli oluşturarak 30 günlük hızlı çıkış stratejimiz için en kritik yazılım modüllerini detaylandıracağım. Pazardaki hantal yerel rakiplerin zayıf kaldığı yapay zeka destekli hata denetimi ve dinamik karlılık analizi özelliklerini önceliklendirerek, en hızlı gelir getirecek ticari giriş noktasını netleştirmeyi hedefliyorum.

Researching websites...

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net

vergiport.com
Yıllara Yaygın İnşaat ve Onarım İşlerine Yönelik Tevkifatın Oranı Bazı Yıllara Sâri İşler İçin ％1'e Düşürülmüştür - Vergiport

avys.omu.edu.tr
HAKEDİŞ VE İNŞAAT DEFTERLERİ
Mevzuat Güncellemeleri ve Finansal Hassasiyet
2025 Nisan ayı itibarıyla yürürlüğe giren ve demiryolu ile metro projelerinde KDV tevkifat oranını %5'ten %1'e indiren 9707 sayılı Cumhurbaşkanı Kararı'nın hakediş süreçleri üzerindeki kritik etkisini analiz ediyorum. Bu tür çok yeni ve spesifik yasal parametrelerin sistem içerisinde otomatik bir kural seti olarak kurgulanmasının, teknik ofislerin manuel hesaplama yükünü sıfırlarken nakit akışını nasıl güvence altına alacağını sentezliyorum. Özellikle büyük ölçekli altyapı projelerinde bu detayların hatasız yönetilmesinin, yükleniciler için finansal bir koruma kalkanı oluşturacağını değerlendiriyorum.
Piyasa Oynaklığı ve Revizyon Dinamikleri
Resmi birim fiyat kitapçıkları ile piyasadaki döviz bazlı gerçek maliyetler arasındaki kronik makasın, teknik ofislerin hazırladığı teklifleri ne kadar kısa sürede işlevsiz bıraktığını çözümlüyorum. Geleneksel yöntemlerin yetersiz kaldığı bu noktada, anlık endeks verilerini ve kur değişimlerini sisteme entegre ederek yüklenicilerin karlılıklarını koruyacak bir veri disiplini kurguluyorum. Teknik ofislerin en büyük sancısı olan 'doğru fiyatlandırma' sorununu, statik tablolardan dinamik ve yapay zeka destekli bir maliyet simülasyonuna dönüştürme fırsatlarını değerlendiriyorum.
Veri Mimarisi ve Stratejik Yol Haritası
Bir sonraki aşamada, araştırdığım on temel kavramı birbirine bağlayan kapsamlı bir ilişkisel veri tabanı yapısı ve uçtan uca kullanıcı senaryoları tasarlamaya odaklanacağım. Özellikle yerel rakiplerin hantal kaldığı yapay zeka destekli hata denetimi ve otomatik keşif özeti oluşturma modüllerini önceliklendirerek, 30 günlük hızlı çıkış stratejimiz için en yüksek ticari katma değeri sunacak MVP kapsamını ve veri mimarisini netleştirmeyi hedefliyorum.

Researching websites...

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net

vergiport.com
Yıllara Yaygın İnşaat ve Onarım İşlerine Yönelik Tevkifatın Oranı Bazı Yıllara Sâri İşler İçin ％1'e Düşürülmüştür - Vergiport
Mevzuat Dinamikleri ve Finansal Nakit Akışı
2025 yılı Nisan ayı itibarıyla yürürlüğe giren ve raylı sistemler, metro inşaatları gibi belirli projelerde KDV tevkifat oranını %5'ten %1'e indiren 9707 sayılı Cumhurbaşkanı Kararı'nı analizlerime dahil ettim. Bu tür çok yeni ve kritik yasal değişikliklerin hakediş süreçlerine anlık entegrasyonunun, yükleniciler için finansal bir koruma kalkanı oluşturacağını sentezliyorum. Manuel hesaplama hatalarından kaynaklanan cezai riskleri ve nakit akışı sapmalarını sıfırlayacak bir otomasyon katmanı üzerinde çalışıyorum.
Birim Fiyat Uyumsuzlukları ve Çözüm Arayışı
Kamu ihale sistemindeki resmi birim fiyatlar ile piyasadaki döviz bazlı gerçek maliyetler arasındaki kronik makasın, teknik ofislerin hazırladığı teklifleri ne kadar kısa sürede işlevsiz bıraktığını çözümlüyorum. Mevcut yerel yazılımların bu oynaklığa karşı sunduğu hantal çözümleri analiz ederek, statik tablolar yerine piyasa endeksleriyle ve anlık kur değişimleriyle konuşan dinamik bir maliyet simülasyonu kurguluyorum. Bu yapı, teklif revizyonlarındaki versiyon karmaşasını sonlandırarak gerçek zamanlı karlılık takibi sağlayacak.
Veri Mimarisi ve Gelecek Adımlar
Bir sonraki aşamada, araştırmamdaki on temel kavramı birbirine bağlayan kapsamlı bir ilişkisel veri tabanı modeli oluşturarak, 30 günlük hızlı çıkış stratejimiz için en kritik olan 'akıllı teklif hazırlama' ve 'dinamik karlılık analizi' modüllerini detaylandıracağım. Pazardaki yerleşik rakiplerin zayıf kaldığı yapay zeka destekli hata denetimi özelliklerini önceliklendirerek, teknik ofislerin operasyonel yükünü en çok azaltacak kullanıcı senaryolarını ve ticari yol haritasını netleştirmeyi hedefliyorum.

Researching websites...

avys.omu.edu.tr
HAKEDİŞ VE İNŞAAT DEFTERLERİ
İş Akış Modellenmesi ve Kavramsal Çerçeve
Türkiye inşaat sektörünün omurgasını oluşturan teklif hazırlama, metraj ve keşif özeti gibi on kritik süreci, birbiriyle etkileşimli bir veri ekosistemi içinde kurguluyorum. Teknik ofis çalışanlarının günlük operasyonlarında boğulduğu versiyon karmaşasını ve veri kayıplarını, süreçleri dijital bir disipline oturtarak nasıl minimize edebileceğimi sentezliyorum. Özellikle kamu ve özel sektör projeleri arasındaki metodolojik farkları, yazılım mimarimizin temel parametreleri olarak tanımlıyorum.
Mevzuat Uyumu ve Finansal Keskinlik
2025 yılı itibarıyla raylı sistemler gibi stratejik projelerde tevkifat oranlarının %1'e indirilmesiyle değişen finansal denklemi, hakediş süreçlerinin merkezine yerleştiriyorum. Bu tür dinamik yasal güncellemelerin manuel hesaplama yükünü ve hata riskini ortadan kaldıracak şekilde sisteme entegre edilmesinin, yüklenicilerin nakit akışı yönetiminde nasıl bir kaldıraç etkisi yaratacağını analiz ediyorum. Vergi hassasiyetini, projenin toplam karlılığını koruyan otomatik bir denetim katmanına dönüştürüyorum.
Rekabetçi Konumlandırma ve Veri Mimarisi
Bir sonraki aşamada, yerel pazardaki geleneksel çözümlerin kullanıcı deneyimi tarafındaki hantallıklarını analiz ederek, en hızlı ticari ivmeyi yakalayacak modülleri netleştireceğim. Türkiye'deki aile şirketi dinamiklerine ve WhatsApp odaklı informal iş kültürüne uyum sağlayan, yapay zeka destekli bir veri tabanı yapısı kurguluyorum. 30 günlük hızlı çıkış stratejimiz için en yüksek katma değeri sunacak teknik ofis otomasyon araçlarını ve kullanıcı senaryolarını detaylandırmayı hedefliyorum.

Researching websites...

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net

vergiport.com
Yıllara Yaygın İnşaat ve Onarım İşlerine Yönelik Tevkifatın Oranı Bazı Yıllara Sâri İşler İçin ％1'e Düşürülmüştür - Vergiport

avys.omu.edu.tr
HAKEDİŞ VE İNŞAAT DEFTERLERİ
Güncel Vergi Regülasyonları ve Nakit Akışı Yönetimi
2025 yılı Nisan ayı itibarıyla raylı sistemler, metro ve gemi inşaatı gibi stratejik projelerde KDV tevkifat oranının %5'ten %1'e indirilmesini öngören 9707 sayılı Cumhurbaşkanı Kararı'nın hakediş süreçleri üzerindeki finansal etkilerini analiz ediyorum. Bu tür dinamik mevzuat değişikliklerinin hakediş tablolarına anlık ve hatasız entegrasyonunun, büyük ölçekli yükleniciler için nasıl bir finansal güvenlik kalkanı oluşturacağını sentezliyorum. Manuel hesaplamalardan kaynaklanan cezai riskleri ve nakit akışı sapmalarını minimize edecek bir otomasyon katmanı kurguluyorum.
Piyasa Oynaklığı ve Dinamik Maliyet Modelleme
Resmi birim fiyat kitapçıkları ile piyasadaki döviz bazlı gerçek maliyetler arasındaki kronik makasın, teknik ofislerin hazırladığı teklifleri ne kadar kısa sürede işlevsiz bıraktığını çözümlüyorum. Geleneksel 'Yeşil Defter' ve 'Ataşman' disiplinini, anlık endeks verileriyle ve kur değişimleriyle konuşan dijital bir hafızaya dönüştürerek teklif revizyonlarındaki versiyon karmaşasını ortadan kaldıracak bir yapı tasarlıyorum. WhatsApp ve telefon trafiğine dayalı informal iş akışlarını, kâr marjlarını koruyan kurumsal bir veri disiplinine aktarmanın yollarını geliştiriyorum.
Veri Mimarisi ve MVP Stratejik Yol Haritası
Bir sonraki aşamada, incelediğim on temel kavramı birbirine bağlayan kapsamlı bir ilişkisel veri tabanı modeli oluşturarak 30 günlük hızlı çıkış stratejimiz için en kritik yazılım modüllerini detaylandıracağım. Pazardaki yerleşik rakiplerin hantal kaldığı kullanıcı deneyimi ve yapay zeka destekli hata denetimi özelliklerini önceliklendirerek, teknik ofislerin operasyonel yükünü en çok azaltacak kullanıcı senaryolarını ve ticari giriş noktasını netleştirmeyi hedefliyorum.

Researching websites...

verginet.net
Yıllara Sari İnşaat ve Onarım İşlerinde Tevkifat Oranı - Verginet.net
Mevzuat Güncellemeleri ve Sektörel Yansımalar
2025 yılı Nisan ayı itibarıyla yürürlüğe giren kritik vergi düzenlemelerini analizlerime dahil ettim. Özellikle raylı sistemler, metro ve gemi inşaatı gibi projelerde tevkifat oranının %5'ten %1'e indirilmesini öngören 9707 sayılı Cumhurbaşkanı Kararı'nın, yüklenicilerin nakit akışı yönetiminde yaratacağı stratejik değişimi sentezliyorum. Bu tür spesifik yasal güncellemelerin, hakediş süreçlerine anlık ve hatasız bir şekilde yansıtılmasının manuel hesaplama risklerini sıfırlayarak nasıl bir finansal koruma kalkanı oluşturacağını değerlendiriyorum.
Fiyat Tutarsızlıkları ve Operasyonel Boşluklar
Bakanlık tarafından yayınlanan resmi birim fiyatlar ile sahadaki döviz bazlı gerçek maliyetler arasındaki kronik makasın, teknik ofislerin hazırladığı keşif özetlerini ne kadar kısa sürede geçersiz kıldığını tespit ediyorum. WhatsApp üzerinden yürütülen informel iletişim ağı ile kurumsal hakediş disiplini arasındaki veri kopukluğunu çözümlüyorum. Yüksek enflasyon ve döviz kuru oynaklığı karşısında statik Excel tablolarının yetersiz kaldığı noktaları belirleyerek, bu süreci dinamik bir maliyet simülasyonuna dönüştürmenin yollarını kurguluyorum.
Stratejik Yol Haritası ve Ürün Mimarisi
Bir sonraki aşamada, belirlediğim on temel kavramı birbirine bağlayan ilişkisel bir veri tabanı yapısı kurmaya ve uçtan uca kullanıcı senaryolarını detaylandırmaya odaklanacağım. Yerel pazardaki hantal rakiplerin zayıf kaldığı yapay zeka destekli hata denetimi ve anlık piyasa endeksi entegrasyonu sunan bir MVP kurgusu hazırlıyorum. Özellikle 30 günlük hızlı çıkış stratejimiz için en yüksek ticari katma değeri sağlayacak olan akıllı teklif revizyon modülünü ve aile şirketlerinin dijitalleşme direncini kıracak en yalın kullanıcı deneyimini netleştireceğim.
Mevzuat Dinamikleri ve Finansal Koruma
2025 yılı Nisan ayı itibarıyla demiryolu ve metro gibi stratejik inşaat projelerinde KDV tevkifat oranlarını %5'ten %1'e indiren güncel yasal düzenlemelerin, yüklenicilerin nakit akışı planlamasındaki kritik rolünü analiz ediyorum. Bu tür dinamik mevzuat değişikliklerinin hakediş süreçlerine anlık ve hatasız entegrasyonunun, firmaları manuel hesaplama hatalarından kaynaklanan cezai risklerden koruyacak stratejik bir katman olduğunu sentezliyorum. Sistemin bu değişken oranları otomatik tanıyan bir yapıya sahip olmasının finansal güvenlik açısından önemini değerlendiriyorum.
Birim Fiyat Uyumsuzlukları ve Veri Disiplini
Resmi fiyat kitapçıkları ile piyasadaki döviz bazlı gerçek maliyetler arasındaki kronik makasın, teknik ofislerin hazırladığı teklifleri ne kadar kısa sürede işlevsiz bıraktığını çözümlüyorum. Geleneksel yöntemlerin yetersiz kaldığı bu noktada, anlık endeks verilerini ve kur değişimlerini sisteme entegre ederek yüklenicilerin kâr marjlarını koruyacak dinamik bir maliyet simülasyonu kurguluyorum. WhatsApp ve telefon trafiğine dayalı informal iş akışlarını, teklif revizyon süreçlerinde kontrol kaybını önleyecek dijital bir hafızaya dönüştürmenin yollarını geliştiriyorum.
MVP Stratejisi ve Veri Mimarisi
Bir sonraki aşamada, incelediğim on temel kavramı birbirine bağlayan kapsamlı bir ilişkisel veri tabanı modeli oluşturarak 30 günlük hızlı çıkış stratejimiz için en kritik yazılım modüllerini detaylandıracağım. Pazardaki hantal yerel rakiplerin zayıf kaldığı yapay zeka destekli hata denetimi ve otomatik keşif özeti oluşturma özelliklerini önceliklendirerek, teknik ofis çalışanlarının operasyonel yükünü en çok azaltacak kullanıcı senaryolarını ve ticari giriş noktasını netleştirmeyi hedefliyorum.

Researching websites...

oska.com.tr
Kullanıcılarımızın Görüşleri - Oska Yazılım
Mevzuat Parametreleri ve Finansal Otomasyon
2025 Nisan güncellemeleriyle raylı sistemlerdeki tevkifat oranının %1'e indirilmesinin, hakediş tablolarında yaratacağı matematiksel değişimi projenin finansal sağlığı açısından kritik bir değişken olarak tanımladım. Bu yasal parametrelerin yazılım tarafından otomatik olarak güncellenmesinin, yüklenici firmaların teknik ofis yükünü azaltırken vergi uyumluluğunu nasıl garanti altına alacağını sentezliyorum.
Dinamik Maliyet Modelleme ve Kar Marjı Güvencesi
Bakanlık birim fiyatları ile piyasadaki döviz odaklı gerçek maliyetler arasındaki kronik tutarsızlığı, anlık endeks verileriyle konuşan bir veri mimarisiyle çözümlüyorum. Özellikle teknik ofislerin revizyon süreçlerinde yaşadığı versiyon karmaşasını sonlandıracak, şantiye verilerini hakediş disipliniyle birleştiren entegre bir veri modeli kurguluyorum.
Stratejik Ürün Konumlandırma ve Final Raporlama
Araştırma sürecini tamamlarken, 30 günlük MVP planımız için en hızlı gelir getirecek modülleri ve veri tabanı yapısını netleştiriyorum. Yerel rakiplerin hantal arayüzlerini ve yapay zeka eksikliklerini birer fırsata dönüştürerek, Türk inşaat sektörünün aile şirketi yapısına ve informel iş akışlarına en uygun ticari yol haritasını hazırlıyorum.





TÜRKİYE İNŞAAT SEKTÖRÜ SAAS ÜRÜN KEŞİF VE STRATEJİ RAPORU

Hedef: Yapı Müteahhitleri ve Alt Yükleniciler için Yapay Zeka Destekli Teklif ve Sözleşme Yönetimi SaaS Ürünü

BÖLÜM 1: TEMEL KAVRAMLARIN DERİNLEMESİNE ANALİZİ

1. Teklif Hazırlama Süreci (Proposal Preparation)

A. Tanım: Müşteriden (İşveren/Ana Yüklenici) gelen projenin incelenip, maliyetlerin çıkarılarak kar marjı ile birlikte resmi/gayriresmi bir sunuma dönüştürülmesi.
B. Neden Önemli: Şirketin can damarıdır. Hızlı verilmezse iş kaçar, yanlış verilirse şirket batar.
C. Kim Kullanır: Teknik Ofis (hazırlar), Satınalma (fiyat toplar), Patron/Yönetim Kurulu (onaylar), Satış (sunar).
D. Mevcut İş Akışı: - Küçük: Göz kararı veya basit bir Excel. WhatsApp'tan PDF atılır.

Orta: İç içe geçmiş, formülleri bozulmuş devasa Excel dosyaları (örn: Teklif_v7_Son_PatronOnayli.xlsx).

Büyük: Kısmen ERP (SAP/Logo) ama teklif aşaması esnek olmadığı için yine Excel'de yapılır, ERP'ye sonradan girilir.
E. En Büyük Acı Noktaları: Versiyon karmaşası ("Hangi fiyat en sondu?"), unutulan pozlar, formül hatalarından kaynaklı milyon liralık zararlar, patron onayını beklerken geçen süre.
F. Dijitalleşme Fırsatı: "Tek tıkla" standart, kurumsal PDF teklif oluşturma. Geçmiş fiyat veri tabanından otomatik fiyat çekme.
G. SaaS Özellikleri: Sürükle-bırak şablonlar, mobil onay mekanizması, versiyon geçmişi logları.
H. Veri Modeli: ProposalID, ClientID, Version, TotalAmount, Status (Taslak, Onayda, Revize, Kazanıldı, Kaybedildi), MarginPercentage.
I. Kullanıcı Senaryosu: Teknik ofis mühendisi teklifi hazırlar -> "Patron Onayına Gönder" butonuna basar -> Patron cep telefonuna gelen bildirimle marjı %15'ten %18'e çeker ve "Onayla" der -> Müşteriye şık bir PDF otomatik e-postalanır.

2. Metraj (Quantity Takeoff)

A. Tanım: Projede kullanılacak her bir malzemenin (beton, demir, kablo, boya) miktarının çizimlerden veya sahadan hesaplanması.
B. Neden Önemli: Maliyetin x çarpanıdır. Metraj eksikse doğrudan zarar edilir; fazla yazılırsa teklif yüksek kalır, iş kaçar.
C. Kim Kullanır: Metraj Mühendisi, Şantiye Şefi, Alt Yüklenici.
D. Mevcut İş Akışı: Çıktı alınmış AutoCAD projeleri üzerinde fosforlu kalemle çizerek (küçükler) veya AutoCAD/Planswift üzerinden ölçerek Excel'e manuel aktarma.
E. En Büyük Acı Noktaları: Çok ciddi zaman kaybı. Proje revizyonu geldiğinde tüm metrajın baştan yapılması çilesi.
F. Dijitalleşme Fırsatı: PDF veya CAD dosyalarından yapay zeka ile otomatik metraj çıkarma veya metraj satırlarını 3D modelle eşleştirme.
G. SaaS Özellikleri: Yapay zeka tabanlı 2D PDF okuyucu (Duvarları otomatik algılama), Excel entegrasyonu, revizyon karşılaştırma (eski/yeni proje farkı).
H. Veri Modeli: TakeoffID, ProjectID, ItemCode, Quantity, Unit (m2, m3, kg), SourceFile.
I. Kullanıcı Senaryosu: Kullanıcı mimari PDF'i sisteme yükler -> Sistem odaları tarar -> Alanları ve çevreleri hesaplayıp tablo halinde sunar -> Kullanıcı sadece manuel kontrolleri yapar.

3. Keşif Özeti (Bill of Quantities - BoQ)

A. Tanım: Tüm metrajların, poz numaralarının ve (varsa) birim fiyatların alt alta dizildiği maliyet tablosu. Devlet ihalelerinde standart, özel sektörde değişkendir.
B. Neden Önemli: Müşteri ile sözleşmenin ana ekidir. Anlaşmazlıklarda mahkemede bu belgeye bakılır.
C. Kim Kullanır: İşveren, Müşavir, Teknik Ofis, Şantiye Mühendisi.
D. Mevcut İş Akışı: Çevre ve Şehircilik Bakanlığı pozları veya özel pozlar Excel'de listelenir.
E. En Büyük Acı Noktaları: Format uyumsuzlukları. Müşteri kendi Excel formatını yollar, taşeron kendi formatında cevap verir. Satırları eşleştirmek işkencedir.
F. Dijitalleşme Fırsatı: Yüklenen herhangi bir Excel keşfini (sütunları yapay zeka ile anlayarak) standart sisteme aktarma.
G. SaaS Özellikleri: Akıllı Excel Import, "Poz Eşleştirme" asistanı, kâr marjı simülatörü.
H. Veri Modeli: BoqID, ProjectID, LineItemID, Description, Quantity, UnitPrice, TotalPrice.
I. Kullanıcı Senaryosu: Ana firma karmaşık bir Excel BoQ gönderir. Sistem bunu alır, "Miktar", "Açıklama" sütunlarını otomatik tanır, şirketin kendi formatına çevirir.

4. Birim Fiyat (Unit Price)

A. Tanım: 1 m3 betonun, 1 ton demirin veya 1 adam-saat işçiliğin fiyatı. Malzeme + İşçilik + Makine olarak kırılımlanır.
B. Neden Önemli: Türkiye'de enflasyon ve döviz nedeniyle birim fiyatlar günlük/saatlik değişir. Karlılığın kalbidir.
C. Kim Kullanır: Satınalma, Teknik Ofis, Mali İşler.
D. Mevcut İş Akışı: WhatsApp üzerinden tedarikçiye sorulur ("Ahmet abi demirin tonu ne oldu bugün?"). Son alınan fiyata tahmini enflasyon/döviz riski eklenir.
E. En Büyük Acı Noktaları: Fiyatların hızla eskimesi. 3 ay önceki teklifteki fiyatla işe başlandığında zarar edilmesi.
F. Dijitalleşme Fırsatı: Canlı malzeme fiyat endeksleri entegrasyonu, önceki satın almalardan otomatik fiyat önerme.
G. SaaS Özellikleri: Şirket içi canlı fiyat kütüphanesi, malzeme bazında döviz/TRY çevirici, "Son Güncellenme Tarihi" uyarıları.
H. Veri Modeli: PriceID, MaterialCode, Currency, Value, LastUpdatedDate, SupplierID.
I. Kullanıcı Senaryosu: Sisteme "1 m2 Alçıpan Asma Tavan" eklenir. Sistem uyarır: "İçindeki alçı fiyatı en son 4 ay önce güncellenmiş, güncel enflasyona göre riskli!"

5. KDV (VAT)

A. Tanım: Katma Değer Vergisi. İnşaatta malzemeye, işin türüne (konut, ticari) ve alanına (150m2 altı/üstü) göre %1, %10 veya %20 olabilir.
B. Neden Önemli: Yanlış KDV hesabı teklifin yekününü bozar ve devlete karşı mali risk oluşturur. Nakit akışını direkt etkiler.
C. Kim Kullanır: Muhasebe, Finans, Teknik Ofis.
D. Mevcut İş Akışı: Excel'in en altına "KDV (%20)" satırı eklenir. Bazen KDV dahil, bazen hariç konuşulur. Karmaşa çıkar.
E. En Büyük Acı Noktaları: Taşeron "Abi ben KDV dahil anladım" der. KDV iadelerinin takibi.
F. Dijitalleşme Fırsatı: Tekliflerde KDV hariç/dahil görünümünü tek tıkla değiştirme, poz bazlı KDV oranı belirleme.
G. SaaS Özellikleri: Esnek vergi modülü, yasal mevzuat uyarıları.
H. Veri Modeli: TaxRate, TaxAmount, IsVatIncluded.
I. Kullanıcı Senaryosu: Müşteri KDV dahil fiyat görmek ister, satış personeli uygulamadan "KDV Dahil Göster" toggle'ına basarak anında yeni PDF üretir.

6. Tevkifat (Withholding Tax)

A. Tanım: KDV'nin bir kısmının (inşaat işlerinde genellikle 4/10'u) işveren tarafından kesilip devlete doğrudan ödenmesi uygulaması.
B. Neden Önemli: Sadece Türkiye'ye özgü çok kritik bir detaydır. Müteahhidin eline geçen nakit parayı (tahsilatı) ciddi oranda düşürür.
C. Kim Kullanır: Muhasebe, Finans.
D. Mevcut İş Akışı: Excel'de manuel tevkifat formülleri yazılır. Çok sık hata yapılır.
E. En Büyük Acı Noktaları: Nakit akışı planlamasında tevkifat kesintisinin unutulması sonucu "maaşları ödeyememe" krizi.
F. Dijitalleşme Fırsatı: Fatura / Hakediş modülünde otomatik tevkifat hesaplama ve net tahsilat projeksiyonu.
G. SaaS Özellikleri: Fatura simülatörü (Brüt tutar -> KDV -> Tevkifat -> Ele Geçecek Net Tutar gösterimi).
H. Veri Modeli: WithholdingRate, WithholdingAmount, NetReceivable.
I. Kullanıcı Senaryosu: Teklif kazanılıp faturaya dönüşeceğinde, sistem "Bu yapım işi, 4/10 tevkifat uygulanacak, kasanıza girecek net nakit 1.080.000 TL" bilgisini verir.

7. Hakediş (Progress Billing)

A. Tanım: Yapılan işin sahadaki ilerlemesine göre (aylık vb.) hesaplanıp işverenden parasının istenmesi.
B. Neden Önemli: Nakit girişinin tek kaynağıdır. Gecikmesi iflas sebebidir.
C. Kim Kullanır: Şantiye Şefi (ataşman hazırlar), Teknik Ofis, Müşavir (onaylar).
D. Mevcut İş Akışı: "Yeşil Defter" mantığıyla Excel'de kümülatif hesaplamalar yapılır. (Önceki ay yapılan, bu ay yapılan, toplam yapılan).
E. En Büyük Acı Noktaları: Excel'de kümülatif hesap formüllerinin kayması. Müşavirden revizyon yediğinde baştan hesaplama işkencesi. İhzarati (sahaya gelmiş ama montajlanmamış malzeme) hesabı.
F. Dijitalleşme Fırsatı: Sözleşmedeki keşif üzerinden yüzdesel (%20 tamamlandı) ilerleme girilerek otomatik hakediş raporu/faturası üretme.
G. SaaS Özellikleri: Kümülatif hakediş hesaplayıcı, yeşil defter görünümü, mobil şantiye onay fotoğrafları ekleme.
H. Veri Modeli: BillingID, ContractID, Period, PreviousAmount, CurrentAmount, TotalAmount, Retainage (Teminat Kesintisi).
I. Kullanıcı Senaryosu: Şantiye şefi mobilden "Boya işinin %50'si bitti" girer, merkez ofisteki sistem anında 2 Nolu Hakediş taslağını oluşturur.

8. Alt Yüklenici Teklifleri (Subcontractor Bids)

A. Tanım: Elektrik, mekanik, cephe gibi işlerin "Taşeronlara" ihale edilmesi için onlardan fiyat toplanması.
B. Neden Önemli: Ana müteahhit maliyetinin %70-80'i taşeronlara gider. Doğru kıyaslama hayati önem taşır.
C. Kim Kullanır: Satınalma, Teknik Ofis.
D. Mevcut İş Akışı: Taşeronlara boş BoQ yollanır. Kimisi Excel'i bozar yollar, kimisi KDV dahil yazar, kimisi PDF atar. Ana firma bunları tek bir Excel'de (Mukayese Cetveli) birleştirmeye çalışır.
E. En Büyük Acı Noktaları: "Elmalarla armutları kıyaslamak." Birinin fiyatına vinç dahil, diğerine hariçtir. Veri girişi ameleliği.
F. Dijitalleşme Fırsatı: Taşeronların tekliflerini doğrudan sisteme girebileceği "Tedarikçi Portalı" oluşturmak.
G. SaaS Özellikleri: Akıllı Mukayese Tablosu, Taşeron Puanlama Sistemi, Davet Gönderme Modülü.
H. Veri Modeli: SubContractorID, BidID, PackageID, ProposedPrice, Inclusions/Exclusions.
I. Kullanıcı Senaryosu: Ana firma link gönderir. 3 taşeron linke tıklayıp kendi fiyatlarını girer. Ana firma ekranında yan yana, en ucuzu yeşil yanacak şekilde karşılaştırma tablosu otomatik oluşur.

9. Revizyon Teklifleri (Revision Bids)

A. Tanım: Müşteri bütçeyi yüksek bulduğunda veya projenin kapsamı değiştiğinde (örneğin "Seramik yerine mermer yapalım") verilen yeni teklif.
B. Neden Önemli: Müşteriyi ikna etme sürecidir. Kârdan taviz vermeden fiyat indirmek ince işçilik ister.
C. Kim Kullanır: Satış, Patron, Teknik Ofis.
D. Mevcut İş Akışı: Orijinal dosya Farkli Kaydet yapılır. Eskisinde neyin değiştiği unutulur.
E. En Büyük Acı Noktaları: "Biz ilk teklifte o kalemi ne kadara vermiştik?" sorusu. Fiyatı indirirken gizli maliyetlerin unutulup zarar edilmesi.
F. Dijitalleşme Fırsatı: Otomatik "Versiyon Karşılaştırma" (Diff) görünümü.
G. SaaS Özellikleri: Teklif Klonlama, Revizyon Geçmişi Ağacı, Değişen Kalemlerin Kırmızı/Yeşil Renklenmesi.
H. Veri Modeli: ProposalID, ParentProposalID, VersionNumber, ChangeLog.
I. Kullanıcı Senaryosu: Müşteri %10 indirim ister. Sistem V1'i V2 olarak klonlar. Kullanıcı "Sadece vitrifiye markasını değiştir ve genel gider marjını %2 düşür" der, sistem yeni fiyatı 5 saniyede verir.

10. Karlılık Hesabı (Profitability Calculation)

A. Tanım: Direk maliyetlerin üzerine Genel Giderler (şantiye elektriği, maaşlar), Beklenmedik Giderler (Risk) ve Şirket Kârının eklenmesi.
B. Neden Önemli: Şirketin var olma sebebidir. Patronun tek baktığı yerdir.
C. Kim Kullanır: Patron, Yönetim Kurulu.
D. Mevcut İş Akışı: Excel'in en altındaki gizli bir hücrede yapılır. Kimse görmesin diye parola konur.
E. En Büyük Acı Noktaları: Yanlış genel gider yüzdesi. Şantiye süresi uzayınca (örneğin 6 aydan 9 aya) artan genel giderlerin (mühendis maaşları vb.) kârı eritmesi.
F. Dijitalleşme Fırsatı: Dinamik marj analizi. Süre uzarsa ne kadar kâr erir simülasyonu.
G. SaaS Özellikleri: Gizli Kâr Marjı Slider'ı (Sadece yetkili görür), Senaryo Analizi (Kötü/Normal/İyi Senaryo).
H. Veri Modeli: DirectCost, OverheadMargin, RiskMargin, ProfitMargin, SalesPrice.
I. Kullanıcı Senaryosu: Patron mobil uygulamayı açar. Toplam maliyeti görür. Ekranda bir "Slider" vardır. Kâr marjını parmağıyla %15'ten %20'ye kaydırır, müşteriye gidecek nihai rakam anında güncellenir. Onaylar.

BÖLÜM 2: TÜRKİYE'YE ÖZGÜ KRİTİK SEKTÖR GERÇEKLERİ

Kamu vs Özel Sektör Uçurumu: Kamu işleri Çevre ve Şehircilik (veya Karayolları/DSİ) pozlarına, analizlerine ve katı bir formata (KİK formatı) dayanır. Özel sektör ise tamamen serbest piyasadır, "Götürü Bedel" (Lump Sum) çok yaygındır. SaaS ürünü ilk etapta esnek olan Özel Sektör müteahhitlerine odaklanmalıdır.

Ortak Ödeme Gecikmeleri: Türkiye'de 30-60-90-120 günlük vadeli çeklerle iş yapılır. Nakit akışı her şeydir. Bir teklif verilirken "Ödeme nasıl olacak?" maliyetten daha önemlidir. Peşin ödeme alan müteahhit %20 indirim yapabilir.

Kur Oynaklığı (TRY/USD/EUR): Çelik ve mekanik ürünler döviz, beton ve işçilik TRY bazlıdır. Tekliflerin geçerlilik süresi bazen "1 hafta" hatta "Aynı gün mesai bitimine kadar"dır.

Malzeme Fiyat Dalgalanmaları: Yüksek enflasyon ortamında sabit fiyatlı (Götürü Bedel) iş almak intihardır. Bu yüzden sözleşmelere "Fiyat Farkı Kararnamesi" veya spesifik TEFE/TÜFE formülleri eklenir.

Gayriresmi İş Akışları (WhatsApp Kültürü): Türkiye'de milyarlık ihaleler öncesi taşeron fiyatları WhatsApp'tan "Sesli Mesaj" veya yamuk çekilmiş bir fiş fotoğrafı ile gelir. Arayüzünüz WhatsApp kadar basit ve "Kusurlu veriyi" kabul edebilir (AI destekli) olmalıdır.

Patron / Aile Şirketleri: Firmaların %80'i aile şirketidir. "Kurumsallaşma" lafta kalır. Son sözü, Excel'e bakmadan, sezgileriyle patron söyler. Onay mekanizmaları "Patron cebinden tek tıkla" çalışmalıdır.

Güvene Dayalı Satış: İşler şık PDF'lerle değil, "Çay içerken / Yemekte" bağlanır. Yazılımın amacı bu yemeğe giderken patronun cebine doğru veriyi koymak olmalıdır.

Öldürücü Fiyat Rekabeti ("Zararına İş Alma"): Çarkı döndürmek için (eski şantiyenin borcunu yeni şantiyenin avansıyla kapatma) maliyetine iş alınır. Rakiplerin ne kadar fiyat kırdığı kestirilemez.

Bölgesel Farklar: İstanbul'da kurumsal kalite, lojistik maliyet ve hız önemlidir. Anadolu'da ise ilişkiler ve ucuza mal etme öne çıkar.

KDV ve Fatura Hassasiyeti: Naylon fatura korkusu, tevkifat yükü ve vergi planlaması. Çoğu taşeron KDV hariç fiyat konuşur.

BÖLÜM 3: YAZILIM ÜRÜNÜ KEŞİF (DISCOVERY)

Türk Müteahhitlerin Karşılaştığı En Büyük 20 Acı Noktası

Fiyatların enflasyon yüzünden teklif süresinde eskimesi.

Eski Excel dosyalarının bozulan formülleri yüzünden yaşanan gizli zararlar.

Taşeronlardan gelen alakasız formattaki teklifleri tek tabloya dizme ameleliği.

Müşteri projeyi revize ettiğinde metrajı/fiyatı baştan yapmanın günlerce sürmesi.

"Son versiyon teklif hangisiydi?" karmaşası.

Hakediş hesaplarında geçmiş ayların kümelenmesinin yanlış yapılması.

İhzarati (sahadaki malzeme) ile montajı yapılanın ayırt edilememesi.

Patron onayına sunmak için mecburen teknik ofiste akşam mesaiye kalınması.

Şantiyede ekstra yapılan işlerin (puantaj) unutulup faturaya/hakedişe yansıtılamaması.

Kur farkı hesaplamalarının kompleksliği (Malzeme USD, işçilik TRY).

Satınalma ekibi ile teknik ofis arasındaki iletişim kopukluğu.

Şık ve kurumsal teklif PDF'i hazırlamanın Word/Excel'de saatler alması.

Kar marjını yanlış yere ekleyip (brüt/net kar karmaşası) fiyatın patlaması.

Projedeki gizli/detay malzemelerin (örnek: sarf malzemesi) unutulup cepten yenmesi.

Geçmişte yapılan benzer projelerin maliyet verilerine (know-how) ulaşılamaması.

"WhatsApp'tan gelen fiyatın" kimden, ne zaman geldiğinin kaybolması.

Tevkifat oranlarının kafa karıştırması ve nakit akışını bozması.

İşveren sözleşmelerindeki cezai şartların takipsizliği.

Bulut altyapısı olmaması (Bilgisayar çökünce/çalınınca tüm şirketin hafızasının gitmesi).

Farklı KDV oranlarına sahip iş kalemlerinin tek faturada birleştirilmesi zorluğu.

Para Ödeyecekleri İlk 20 Özellik

Tek Tıkla Kurumsal PDF Teklif Üretici.

Excel'den Akıllı (Kopyala-Yapıştır ile bile çalışan) Keşif/BoQ Import.

Taşeron Karşılaştırma Ekranı (Mukayese Cetveli).

Mobil Cihazdan "Kâr Marjı Ayarlama ve Patron Onayı" ekranı.

Versiyon Kontrolü (Teklif V1, V2, V3 farklılıkları).

Otomatik Kümülatif Hakediş (Yeşil Defter) Oluşturucu.

Maliyet Kütüphanesi (Geçmiş fiyatları arama motoru gibi bulma).

Yapay Zeka ile PDF projeden metraj / oda hesabı çıkarma.

USD/EUR kalemlerin günlük TCMB kuru ile canlı TRY karşılığını görme.

Alt yüklenicilere WhatsApp üzerinden şifresiz fiyat girme linki gönderme.

WhatsApp ses kayıtlarını metne/fiyat satırına çeviren AI bot entegrasyonu.

Maliyet/Kâr Senaryo Analiz Aracı (Süre %20 uzarsa, kur %10 artarsa ne olur?).

Basit Tevkifat ve Nakit Akışı Simülatörü.

Proje Bazlı Kar/Zarar (P&L) Dashboard'u.

Birim fiyatların geçerlilik süresi (son güncelleme tarihi) uyarısı.

Standart Poz Formatları (Kullanıcı dilerse ÇŞB pozlarına erişim).

Müşteri teklifi e-postada açtığında/okuduğunda bildirim alma (Track).

Ek İşler (Claim/Variation) Yönetim Modülü.

Gelişmiş Yetkilendirme (Satınalma maliyeti görsün, taşeron görmesin, satıcı sadece satışı görsün).

Muhasebe (Logo, Mikro, Paraşüt) Entegrasyonu.

Mevcut Yazılımların Çözemediği Sorunlar (Market Gaps)

ERP'ler (Logo, SAP vb.): Teklif aşaması için çok hantal, çok katı. Teklif süreci "kirli ve esnek" bir süreçtir, ERP'ler ise temiz ve kesin veri ister. Kimse teklif denemelerini ERP'de yapmaz.

Keşif/Metraj Yazılımları (Oska, AMP vb.): Tamamen kamu ihalelerine ve resmi formata odaklıdır. Eski arayüzlüdür. Özel sektörün hızlı, gayriresmi ve dinamik yapısına, mobil onaya uygun değildirler.

Genel SaaS Çözümleri (Procore, vb.): Çok pahalı (Dolar bazlı), Türkiye regülasyonlarına (Tevkifat, resmi hakediş) uzak ve KOBİ'ler için fazla karmaşık. Kurulumu aylar sürer.

Excel: Formüller bozulur, mobilde açılamaz/düzenlenemez, veri güvenliği sıfırdır, ortak çalışma (collaboration) çöker.

Yapay Zeka (AI) Fırsatları

AI Fiyat Analisti: Ana firma yüklediği keşif özetindeki açıklamayı anlar (örn: "ECA Seria Lavabo Bataryası") ve piyasadaki (veya şirketin geçmiş veri tabanındaki) en yakın eşleşmeyi bulup otomatik fiyat önerir.

AI Taşeron Fişi Okuyucu: Taşeron WhatsApp'tan el yazısı veya bozuk bir format fotoğrafı atar. AI bunu anlar, OCR ile okur ve yapılandırılmış JSON'a (Keşif satırlarına) dönüştürüp ana sisteme sokar.

AI Risk Uyarısı: Şartname dokümanı yüklenir, AI analiz eder: "Dikkat: Madde 4.2'de gecikme cezası günlük binde 5 belirlenmiş, sektör ortalamasının çok üstünde riskli."

30 Günlük MVP Önerisi

Ürün Adı Konsepti: TeklifX veya HızlıKeşif
MVP Kapsamı: Sadece özel sektör çalışan "Alt Yüklenici ve Orta Ölçekli Taahhüt Firmaları" için Mobil Uyumlu Akıllı Teklif Hazırlama ve PDF Üretme Aracı.

Kullanıcı kalem kalem maliyetleri girer (Malzeme, İşçilik).

Genel Gider ve Kâr marjını girer.

Sistem muazzam şıklıkta, antetli bir teklif PDF'i üretir.

Teklif Müşteriye WhatsApp/Mail atılır. (Müşteri açtığında "Okundu" bildirimi gelir).

Versiyon takibi yapılır. (Kabul/Red/Revizyon statüsü).

Fiyatlama Modeli (Türk Pazarı İçin)

Asla kullanıcı başı (Per Seat) yüksek dolar rakamları uygulamayın (Türk firmaları tek şifreyi 10 kişi kullanır).

Paketler (TRY Bazlı Yıllık Taahhüt):

Starter: Ayda 1.500 TL (Sadece Teklif ve PDF, sınırlı teklif sayısı).

Pro: Ayda 4.500 TL (Sınırsız teklif, Taşeron modülü, Hakediş modülü).

Enterprise: Ayda 15.000+ TL (Özel formlar, ERP entegrasyonu, limitsiz onay akışı).

İlk Girilecek En Hızlı Niş

"İç Mimari / Dekorasyon (Fit-Out) ve Mekanik/Elektrik (MEP) Taşeronları".
Neden? Ana müteahhitler yazılım kararlarında hantaldır. Ama bir "Elektrik Taşeronu" haftada 20 farklı projeye teklif yetiştirmek zorundadır. Acıları çok yüksektir, satış döngüsü kısadır (Patron anında kredi kartıyla alır).

BÖLÜM 4: RAKİP ANALİZİ

Rakip Tipi

Temsilciler

Neyi İyi Yapıyorlar

Neyi Kötü Yapıyorlar / Zayıflıkları

Excel & WhatsApp

Microsoft

Esneklik sınırsız. Herkes biliyor. Anında çözüm.

Hata riski %100. Veri uçucu. Mobil desteği/görselliği sıfır. Revizyon takibi yok.

Yerel Keşif Yazılımı

Oska, AMP

Kamu pozlarını eksiksiz içerir. Devlet ihalesinde şarttır.

Eski moda UX/UI (90'lar tasarımı). Sadece masaüstü (On-prem). Özel sektöre katı kalır.

Özel İnşaat ERP'leri

Logo, Netsis, Evreka

Muhasebe, fatura, ambar takibinde kusursuz.

"Teklif verme" süreçleri eziyettir. Mühendisler kullanmayı sevmez. Kurulumu aylar sürer.

Global SaaS'lar

Procore, PlanSwift

Devasa ekosistem, mükemmel UI/UX, entegrasyon.

Çok pahalı. Türk regülasyonu (Tevkifat, Yeşil defter hakedişi) desteklemiyor.

Bulut Ön-Muhasebe

Paraşüt, KolayBi

Fatura kesme, KOBİ banka entegrasyonu, arayüz.

"Proje bazlı maliyet", "Birim Fiyat Analizi", "Metraj" kavramları yok. Sadece fatura.

BÖLÜM 5: SONUÇ VE AKSİYON PLANI

Soru: "Bugün lansman yapsam, Türkiye'de en hızlı geliri elde etmek için tam olarak hangi ürünü yapmalıyım?"

Cevap: "İç Mimarlar, Elektrik ve Mekanik Taşeronları için WhatsApp Uyumlu 'Tekliften Hakedişe' Hızlı Sözleşme Asistanı."

Büyük müteahhitleri, dev baraj ihalelerini, kompleks BIM/3D entegrasyonlarını tamamen unutun. Buralarda karar alma süreci ayları bulur.

Sizin hedef kitleniz: İstanbul, Ankara, İzmir, Bursa, Gaziantep'teki, 10-50 çalışanı olan, ofisleri plazalarda ama patronu sürekli şantiyede olan Alt Yüklenici KOBİ'ler.

Hemen Kodlamanız Gereken 3 Temel Ekran:

Hızlı Teklif Hazırlayıcı (Excel Import'lu): Şirket müşteriden gelen boş Excel listesini sürükleyip bırakacak. Sistem "Bu kalemleri daha önce şu fiyata almıştınız" diyerek listeyi dolduracak. Altına Kâr oranını seçecek ve MÜKEMMEL tasarımlı bir PDF linki (WhatsApp uyumlu) üretecek.

Mobil Patron Onay Ekranı: Patron yolda arabasındayken, teklifi mobilden görecek. "Maliyet bu, verilecek fiyat bu. Marj %18" diyecek. Slider ile marjı değiştirip onaylayacak.

Tek Tıkla Taşeron Hakedişi: İşi aldıklarında, aylık olarak cep telefonundan % ilerleme girilerek "Bu ay şu kadarlık iş bitti" faturası (Tevkifat hesaplanmış şekilde) oluşacak.

Bu kitle parayı hıza ve imajlarına (kurumsal görünmeye) öder. Rakipleri Excel'de saçma sapan formatlarla fiyat atarken, sizin sisteminizden giden kusursuz, cepten onaylanmış PDF teklif ve anlık hakediş takibi onlara iş kazandıracaktır.

Türkiye pazarı için Aylık 2.500 TL (Yıllık peşin tahsilat) modeliyle bu ürünü piyasaya sürün, Facebook/Instagram Lead Ads (Hedef kitle: Şirket sahibi, İnşaat mühendisi, Mimar) üzerinden inanılmaz bir talep toplayacaksınız.


