# Dış Kaynak İncelemesi: İnşaatpanel (17 Ekim 2026)

- **Kaynaklar:**
  - https://insaatpanel.com/blog/insaat-teklifi-hazirlama-rehberi (yayın 4 Mayıs 2026, "İnşaatpanel Editör Ekibi")
  - https://insaatpanel.com/kat-karsiligi-hesaplayici
- **Niteliği:** Pazarlama ve firma eşleştirme (lead üretme) amaçlı bir blog/hesaplayıcı sitesi. Makale kendisi "yasal veya mali tavsiye yerine geçmez" diyor. **Birincil/resmî kaynak değildir**; bu yüzden hiçbir rakam ürüne kaynak olarak alınmadı.

## Ürüne yararlı bulunan fikirler (henüz kodlanmadı)

1. **Teklif iskeleti (7 parça):** kapak (firma, ada/parsel, **teklif no + revizyon + tarih**), iş kapsamı (**dahil/hariç** ayrı ayrı), şartname (standart/marka/ölçü-adet), maliyet, ödeme planı, süre, kabul-onay. Teklif ekranı için "eksik bölüm" kontrol listesi olabilir; teklif numarası/revizyon takibi bizde var mı kontrol edilmeli.
2. **Kat karşılığında "eski daire → yeni alan" hesabı:** hesaplayıcı malik başına eski 1 daire karşılığı yeni binada kazanılan alanı veriyor. M-3'te yok; kentsel dönüşüm senaryosu için eklenebilir.
3. **Geçerlilik süresi ve revizyon izi** teklifte açıkça yazılmalı (uyuşmazlıkta hangi sürümün esas olduğu).

## Bizim farkımız

- Rakip hesaplayıcı kaba tahmin: girdisi yeni bina kapalı alanı, ortalama daire m² ve müteahhit pay %. **Arsa/TAKS/KAKS/çoklu parsel, net/brüt ve "vaat paylaşım kapasitesini aşıyor mu" denetimi yok.** M-3 bu denetimi yapıyor.
- Rakip, kat malikini firmayla eşleştiren bir lead platformu; biz metraj/denetim aracıyız. Hedef kitle sorusu (Melih Bey Soru 16) için pozisyonlama farkı.

## Dikkat: makalede doğrulanamayan veya tutarsız iddialar (ürüne ALINMADI)

| İddia | Neden alınmadı |
|---|---|
| KDV: ≤150 m² net konutta 6306'da %1, normalde %10; >150 m² %20 | Doğrulanmadı; KDV oranları mevzuatta değişti. Ürünün vergi modülü bilerek oran seçmez, kullanıcı girer. |
| Genel gider %5, kâr %20 | Yazarın örnek sayıları, kaynaksız. Makale kendisi birim fiyatı bilerek sabit yazmıyor. |
| Ödeme dilimleri: %10–20 ön, %30 kaba, %30 ince, %10–15 mekanik, %10 iskan | Kaynaksız öneri; toplamı %90–105 arasında değişiyor, tutarsız. |
| Gecikme cezası aylık binde 1–2; %1 üstü Yargıtay'ca "fahiş" | Hukuki iddia, kaynak/karar numarası yok. |
| Kat karşılığında müteahhit payı sahada "%40–55" | Hesaplayıcı sayfası "resmî oran yok, sahada konuşulur" diyor; piyasa söylentisi. Varsayılan olarak kullanılmadı (M-3'te pay % kullanıcı girdisi). |
| "Yarısı Bizden 3 taksit", "noterde yapılması gerekir" | Doğrulanmadı. |

## Bekleyen soruyla ilişki

- Melih Bey Soru 5 (pay hangi alan üzerinden) ve Soru 16 (hedef kitle) için bu site referans olabilir; ancak sahadaki gerçek pratiği Melih Bey'in cevabı belirler.

---

## Ek: Şirket / ürün incelemesi (insaatpanel.com ana sayfa, /firmalar, /hakkimizda)

**Ne yapıyor:** Kentsel dönüşümde uzmanlaşmış iki taraflı platform.
1. **Müteahhit SaaS'ı:** 4 adımlı teklif sihirbazı (proje → şartname → fiyatlandırma → PDF/sunum), AI destekli şartname/sözleşme/risk analizi, "Yarısı Bizden" ve İADŞP destek hesaplayıcıları, müşteri sunum linki, revizyon numaralama. Tekliften "2–3 saat → 20 dakika" iddiası.
2. **Kat maliki tarafı (lead havuzu):** 170+ rehber, 12 hesaplayıcı, 81 il sayfası ile SEO trafiği çeker; kat maliklerinin "firma arıyorum" başvurularını telefonla teyit edip bölgedeki kayıtlı müteahhitlere yönlendirir. Müteahhit kaydı ücretsiz; gelir modeli sayfalarda net değil (abonelik hedefi var).

**Aşama (kendi beyanı):** Pilot lansman; hedef 3 ayda 30+ aktif abonelik. 5 pilot kullanıcı, 12 müteahhitle görüşme. Teknoloji: Next.js 15, React 19, PostgreSQL/Prisma, Claude API. Bu rakamlar şirketin kendi beyanıdır, doğrulanamaz.

**Bizimle örtüşen:** müteahhit teklif hazırlama, kat karşılığı pay hesabı, ödeme planı.
**Görünen sayfalarda olmayan (bizde var):** IFC/BIM metraj, e-PYS ön kontrolü, 3×3 kural motoru, ÇŞB poz kataloğu, taşeron hakediş kalkanı, minha. (Tüm siteyi taramadım; yalnız üç sayfa ve iki makale/hesaplayıcı incelendi, fiyat sayfasına bakılmadı.)

**Çıkarımlar**
- **Müşteri ağrısı doğrulaması:** Kurucunun hikâyesi (5 müteahhitten gelen teklifler pay %, m² hesabı, marka ve sözleşme açısından tutarsız) Melih Bey'in "+10 m² vaat" ve "20 firma karşılaştırması" tespitiyle aynı. Yani **birden fazla teklifi ortak bir zemine oturtup karşılaştırma** ihtiyacı iki bağımsız yerden geliyor. Bizde bunun karşılığı yok; M-3'ün vaat denetimi doğal bir başlangıç.
- **Fark yaratan alan:** Onlar teklif belgesi ve lead üretiminde güçlü; **ölçüm doğruluğu ve denetim** (IFC'den metraj, hakediş tavanı, vaat-kapasite) yönünde yoklar. Aynı alanda yarışmak yerine "teklifin içindeki rakamlar doğru mu" tarafını sahiplenmek mantıklı.
- **Köprü fırsatı:** M-3 ön teklif fizibilitesi → mevcut teklif modülümüz (CreateQuote) akışı. Ön teklif sonucundan teklif üretmek, onların "teklif sihirbazı" değerine bizim doğrulanmış sayılarımızla karşılık verir.
- **Kentsel dönüşüm segmenti** (6306, Yarısı Bizden, İADŞP, kira yardımı, hisse devri) bizde yok. Ayrı bir mevzuat yükü getirir; Melih Bey Soru 16 (hedef kitle) cevabı gelmeden bu segmente girmek için acele edilmemeli.
- **İçerik/SEO modeli** (rehber + hesaplayıcı → lead) kopyalanabilir bir dağıtım yöntemi; ancak içerik kalitesi ve doğrulanabilir kaynak gerektirir (aşağıdaki uyarıya bakın).

**Dikkat çeken tutarsızlık:** /hakkimizda sayfasında "Sunucularımız Türkiye'de (Hetzner Dedicated). Verileriniz yurt dışına çıkmaz" yazıyor, aynı sayfanın altında "Hetzner Dedicated (Almanya değil — Almanya menşeli ama dünyaya hizmet veriyor)" deniyor. İki ifade çelişiyor ve veri yerleşimi iddiası net değil. Bu bir ders: **kendi vitrin iddialarımızı (KVKK, veri yerleşimi, "uyumlu") yalnızca kanıtlayabildiğimiz kadar yazmalıyız.**
