# BIMPlan Academy — Allplan Pro Track Yol Haritası

Durum: Faz 2 tamamlandı · public Allplan Pro Track hazır, üyelik entegrasyonu başlamadı
Kaynak: `../allplanAkademi-main`
Karar: Allplan eğitimi, BIMPlan Academy içinde uzmanlaşma hattı olarak konumlanacak.

## Stratejik karar

`allplanAkademi-main` ayrı bir ürün olarak birleştirilmeyecek. İçindeki ders verisi, simülatör mantığı ve öğrenme deneyimi BIMPlan Academy’nin ortak içerik modeline taşınacak.

Önerilen ürün adı:

> BIMPlan Academy · Allplan Pro Track

Bu hat, Allplan kullanımını BIM, openBIM, metraj, teklif ve saha doğrulamasıyla bağlar. İlk ticari amacı doğrudan eğitim aboneliği satmak değil; nitelikli trafik, güven ve TeklifPro pilot aktivasyonu üretmektir.

## Faz planı

### Faz 0 — Envanter, risk ve sınırlandırma

Amaç: Ne taşınacak, ne yeniden yazılacak, ne ertelenecek kesinleştirmek.

Kaynakta tespit edilen ana varlıklar:

- `constants.ts`: öğrenme ağacı ve Allplan uzmanlaşma yolları
- `lessonsContent.ts`: 27 ayrıntılı ders içeriği ve fallback ders üretimi
- 5 ana öğrenme alanı: Fundamentals, Architecture, Structural Engineering, BIM/OpenBIM ve üretkenlik/koordinat pratikleri
- Wall priority, reinforcement, coordinate ve shortcut laboratuvarları
- AI BIM Companion
- Knowledge Base, flashcard, FAQ ve sınav sistemi
- ilerleme, not, bookmark, çalışma süresi ve sertifika akışları
- Firebase/Firestore persistence ve admin analitiği

Kritik riskler:

- Firestore kuralları şu anda herkese açık okuma/yazma izni veriyor.
- Kimlik modeli tek kullanıcı ve hard-coded e-posta varsayımına bağlı.
- Firebase kaynak uygulaması bağımsız auth ve tenant sınırı olmadan taşınamaz.
- Ders ağacındaki toplam ders vaadi ile ayrıntılı içerik sayısı eşleşmiyor.
- AI, Firebase, sertifika ve admin kodunu doğrudan kopyalamak BIMPlan’a teknik borç taşır.
- Allplan markası, sürüm bilgisi ve içerik kullanım sınırları ayrıca doğrulanmalı.

Faz çıkış kriteri:

- Her kaynak dersin `sourceId`, track, course, module ve içerik durumu belli.
- `verified`, `draft`, `fallback`, `needs-review` ayrımı yapılmış.
- Public / protected / internal erişim kararı verilmiş.
- Güvenlik açığı üretim sistemine taşınmayacağı yazılı olarak kesinleşmiş.

### Faz 1 — Ortak içerik veri modeli ve import katmanı

Amaç: React bileşenlerini değil, kaynak içeriği BIMPlan’ın kanonik veri yapısına almak.

Önerilen model:

```text
Track
  Course
    Module
      Lesson
        LearningOutcome[]
        Step[]
        InteractiveTool?
        Checkpoint[]
        Resource[]
        StandardReference[]
```

Her ders için zorunlu metadata:

- seviye, süre ve ön koşul
- Allplan sürümü / yazılım bağlamı
- BIM ve openBIM bağlantısı
- TeklifPro veya SmartCheck bağlantısı
- kaynak, standart ve doğrulama durumu
- SEO başlık, açıklama ve canonical slug

İlk uygulama tamamlandı:

- `src/academy/allplan/types.ts` ortak veri sözleşmesini tanımlar.
- `src/academy/allplan/track.ts` kaynak öğrenme ağacını BIMPlan modeline normalize eder.
- `scripts/import-allplan-source.mjs` kaynak ders ve ağaç verisini tekrar üretilebilir şekilde içeri alır.
- `scripts/allplan-source-inventory.mjs` 114 modül / 27 ayrıntılı ders farkını ölçer.

Mevcut içerik kapsaması: 114 modülün 27’si ayrıntılı içerikle kaplı, kapsama %24. Eksik 87 modül yayınlanmayacak; `needs-review` olarak tutulacak.

Faz çıkış kriteri: kaynak dosya ile import edilen veri arasında sayısal ve içerik parity raporu. Bu kriterin veri modeli kısmı tamamlandı; public yüzeye geçmeden önce generated adapter için TypeScript/build doğrulaması kapanmalıdır.

### Faz 2 — Public Allplan Pro Track

Amaç: Allplan aramalarından BIMPlan Academy’ye nitelikli trafik çekmek.

İlk public rotalar:

- `/academy/allplan`
- `/academy/allplan/fundamentals`
- `/academy/allplan/reinforcement`
- `/academy/allplan/openbim`
- `/academy/allplan/quantity-takeoff`
- `/academy/allplan/tekifpro-workflow`

Her sayfa şu akışı izlemeli:

```text
Problem → teknik içerik → küçük native demo → kanıt / sınır → pilot CTA
```

İlk sürümde tüm LMS açılmayacak. Public alan, eğitimin satış sayfası değil; güven üreten açık bilgi katmanı olacak.

Uygulama tamamlandı:

- `/academy/allplan` Allplan Pro Track hub sayfası
- `/academy/allplan/:pathSlug` doğrulanmış öğrenme yolu sayfaları
- `/academy/allplan/lesson/:lessonSlug` ayrıntılı public ders sayfaları
- `/academy` haritasına Allplan Pro Track bağlantısı
- public title, description ve canonical metadata

Eksik 87 modül public ders kartı olarak gösterilmiyor.

Faz çıkış kriteri: mobil uyum, SEO metadata, gerçek çalışan demo, ölçümlenebilir CTA ve boş/fallback içerik kalmaması. Public yüzeydeki doğrulanmış dersler için karşılandı; interaktif laboratuvarlar üyelik/uygulama fazına bırakıldı.

### Faz 3 — Üyelikli öğrenme alanı

Amaç: ders ilerlemesi, notlar, bookmark, süre, quiz ve sertifikayı BIMPlan kimlik sistemiyle bağlamak.

Firebase’in tek kullanıcı mantığı taşınmayacak. İlerleme verisi kullanıcı, workspace ve ders kimliğiyle ayrıştırılacak.

Faz çıkış kriteri: iki farklı test kullanıcısının verileri birbirine karışmadan kayıt, geri yükleme ve çıkış yapabilmesi.

### Faz 4 — Native Allplan laboratuvarları ve AI bilgi katmanı

Öncelik sırası:

1. Wall Priority / Join Simulator
2. Reinforcement Calculator
3. Coordinate Calculator
4. Shortcut Trainer
5. IFC property mapping
6. Reinforcement schedule / quantity takeoff

AI Companion ancak kaynak erişimi, kullanıcı sınırı, maliyet limiti, cevap kaynakları ve loglama tanımlandıktan sonra açılacak.

Faz çıkış kriteri: AI cevabı kaynak ders ve bölüm gösterecek; simülatör sonucu mühendislik onayı yerine geçmeyecek.

### Faz 5 — TeklifPro ve SmartCheck bağlantısı

Amaç: eğitimi doğrudan BIMPlan ürün değerine bağlamak.

Örnek bağlantılar:

- Allplan donatı → TS 708 / metraj doğrulaması
- IFC export → veri eksikliği ve property kontrolü
- LOD/LOI → teklif belirsizliği primi
- clash sonucu → rework riski
- model elemanı → TeklifPro teklif kalemi
- ders bitişi → gerçek pilot senaryosu

Faz çıkış kriteri: kullanıcı eğitimde öğrendiği bir akışı TeklifPro veya SmartCheck’te gerçek bir çıktıya dönüştürebilmeli.

## İlk MVP sınırı

İlk uygulama paketi yalnızca şu dört hattı kapsamalı:

1. Allplan Fundamentals
2. Reinforcement ve metraj
3. OpenBIM / IFC
4. TeklifPro workflow

AI Companion, admin paneli, sertifika görsel üretimi ve tüm 120+ derslik iddia Faz 1 MVP’sine alınmayacak.

## Tasarım yönü

Public yüzey için teknik premium çizgi:

- OLED koyu zemin ve kontrollü turuncu/yeşil sinyaller
- editorial split hero: solda problem ve vaat, sağda canlı teknik laboratuvar
- düz üçlü kart grid’i yerine asimetrik içerik modülleri
- simülatörler dekor değil, kanıt olarak öne çıkacak
- her ana panelde iç içe kabuk / double-bezel hiyerarşisi
- hareketler yalnızca transform ve opacity ile yapılacak
- public navigasyon ile öğrenme workspace’i görsel olarak ayrılacak

## Başarı metrikleri

- Allplan public sayfalarından pilot başvurusu dönüşüm oranı
- ücretsiz laboratuvar başlatma oranı
- ders başlangıcından ikinci derse geçiş oranı
- Allplan içeriğinden TeklifPro akışına geçiş oranı
- simülatör tamamlanma oranı
- ders başına kaynaklı AI soru oranı
- doğrulanmış içerik / fallback içerik oranı

## Sert durma kuralları

- Güvenli auth olmadan üyelikli ilerleme açılmayacak.
- Kaynak parity raporu olmadan geniş ders ağacı yayınlanmayacak.
- Kaynaksız AI cevapları public edilmeyecek.
- Allplan eğitimi TeklifPro’dan bağımsız bir ürün gibi pazarlanmayacak.
- Kullanıcı gerçek bir iş çıktısı üretemiyorsa eğitim modülü “tamamlandı” sayılmayacak.
