# Resmî Veri Araştırması — KİK, 4735, Müteahhit Sınıflandırma, KDV ve Ön-render

17 Ekim 2026 · Amaç: `DENETIM_RAPORU_2026-10-17.md`'de "resmî kaynakla doğrulama bekliyor" diye işaretlenen üç işin verisini birincil kaynaktan bulmak ve koda uygulamak. Her bulgunun **güven düzeyi** ve **doğrulama yöntemi** aşağıda belirtilmiştir. İkincil kaynak ile birincil kaynak birbirinden ayrılmıştır.

Güven düzeyleri: **Yüksek** = resmî metin okundu ve/veya resmî sayısal örnekle birebir doğrulandı. **Orta** = birden çok bağımsız ikincil kaynak tutarlı, resmî metin doğrudan okunamadı. **Düşük** = tek kaynak veya çelişki var.

---

## 1. KİK sınır değer (4734 m.38, Kamu İhale Genel Tebliği m.45.1.1) — Güven: **Yüksek**

**Kaynak:** Tebliğ m.45.1.1 / 45.1.1.1 / 45.1.1.4 ve **m.45.2 sayısal örneği** ([herpoz — Tebliğ m.45](https://herpoz.com/mevzuat/kamu-ihale-genel-tebligi/madde-45), değişiklik metni [Resmî Gazete 29.12.2010, 6. Mükerrer](https://www.resmigazete.gov.tr/eskiler/2010/12/20101229M6-13.htm) ve [Word eki](https://www.resmigazete.gov.tr/eskiler/2010/12/20101229M6-13-1.doc)).

| Konu | Resmî hüküm |
| --- | --- |
| Geçerli bant | YM'nin %40'ından küçük ve %120'sinden büyük teklifler hesaba alınmaz |
| Tort1, σ | Geçerli tekliflerin aritmetik ortalaması; **örneklem** standart sapması σ = √(Σ(Tn − Tort1)² / (n − 1)) |
| Tort2 | Tort1 − σ ≤ Ti ≤ Tort1 + σ aralığındaki tekliflerin ortalaması; tek geçerli teklifte Tort2 = o teklif |
| C | Tort2 / YM |
| K | C < 0,60 → K = C · 0,60 ≤ C ≤ 1,00 → K = (3,2C − C² − 0,6) / (C + 1) · C > 1,00 → K = (C² − 0,8C + 1,4) / (C + 1) |
| SD | SD = K × Tort2 / (C × N) |
| N | Üstyapı (bina), mekanik/sıhhi tesisat, elektrik, elektronik/iletişim: **1,00**; diğer yapım işleri: **1,20**; idare 1,00–1,20 arasında farklı değer belirleyebilir ([hakedis.org](https://www.hakedis.org/ihale-araclari/sinir-deger-hesaplama), [KGM iç genelgesi örneği](https://www.lexpera.com.tr/mevzuat/genelgeler/karayollari-genel-mudurlugu-nun-2015-e-12-sayili-ic-genelge-2015-12)) |
| Taban (m.45.1.1.4) | %40–%120 aralığında geçerli teklif yoksa SD = YM × %40; hesaplanan SD, YM'nin %40'ından küçükse SD = YM × %40 |
| **Yuvarlama** | **Tort1, σ ve Tort2: 2 ondalık. C ve K: 3 ondalık.** |

**Resmî örnek (Tebliğ 45.2):** YM = 100.000 TL, N = 1,20, 17 tekliften 12'si geçerli. 1 ve 12 numaralı teklifler banttan dışarıda. Tort1 = **66.270,00**; σ = **20.317,05**; aralık 45.952,95–86.587,05; Tort2 = **63.237,50** (8 teklif); C = **0,632**; K = **0,627**; SD = **52.281,00 TL**.

**Doğrulama:** Örneğin 12 teklifini elle hesapladım (toplam 662.700 / 10 = 66.270,00 ✓; sekiz teklifin toplamı 505.900 / 8 = 63.237,50 ✓; K(0,632) = 0,6268 → 0,627 ✓; 0,627 × 63.237,50 / (0,632 × 1,20) = 52.281,00 ✓) ve motorun çıktısıyla karşılaştırdım.

**Önceki hata:** Motor, K'yı ve C'yi yuvarlamıyordu (önceki ajan Faz 1.6'da "tam kuruş hassasiyeti" için yuvarlamayı kaldırmıştı). Resmî örnekle karşılaştırınca fark görünüyor: yuvarlamasız motor örnekte 52.260,35 TL, resmî sonuç **52.281,00 TL**. Motor Tebliğ'in adım sırasına göre düzeltildi; golden testlerin birincisi artık resmî örnektir (`src/lib/kik-adt.golden.test.ts`). Eski golden testlerin beklenen değerleri yeni yuvarlama kuralıyla yeniden hesaplandı.

**Açık nokta:** Bu bulgu bağımsız bir ihale uzmanı tarafından onaylanmadı (L3 kapısı). Ayrıca K, yuvarlanmış C'den mi yoksa yuvarlanmamış C'den mi hesaplanır — resmî örnekte iki yol da 0,627 verir; ikisinin ayrıştığı bir resmî örnek bulunamadı. Motor, adım adım yuvarlama okumasını (yuvarlanmış C) kullanır.

---

## 2. 4735 sayılı Kanun fiyat farkı — Güven: **Orta–Yüksek** (formül ve B yüksek; sayısal resmî örnek yok)

**Kaynak:** [Yapım İşlerinde Uygulanacak Fiyat Farkına İlişkin Esaslar (2013/5217) — kikkararlari](https://www.kikkararlari.com/mevzuat/yapim-islerinde-uygulanacak-fiyat-farkina-iliskin-esaslar.html), [hakedis.org](https://www.hakedis.org/yapim-isleri-ihalelerinde-fiyat-farki/), değişiklik: [Karar 2025/10132 (30.7.2025)](https://www.alomaliye.com/2025/07/30/kamu-ihale-kanununa-gore-ihale-edilen-hizmet-alimlarinda-mal-alimlarinda-yapim-islerinde-uygulanacak-fiyat-farklari-karar-sayisi-10132/).

| Konu | Hüküm |
| --- | --- |
| Formül | **F = An × B × (Pn − 1)** (Esaslar m.5(1)) |
| B | **0,90** sabit katsayısı (m.5(2)(c)) |
| An | Birim fiyatlı işte uygulama ayında gerçekleşen iş ve ihzarat miktarlarının sözleşme birim fiyatlarıyla çarpımı; anahtar teslim götürü bedelde ilerleme yüzdesi × sözleşme bedeli (m.5(2)(b)) |
| Pn | a (işçilik), b1–b6 (metalik olmayan mineraller, demir-çelik, akaryakıt, diğer yakıtlar, ağaç-mantar, diğer malzemeler), c (makine-ekipman) ağırlıkları ile temel/güncel endekslerden oluşur |
| Ağırlıklar | **Toplamı 1,00**; ihale dokümanında gösterilir; sözleşme süresince değiştirilemez (m.5(3), m.5(6)). Evrensel bir "a" değeri yoktur |
| Endeks ayı | Temel endeks ihale ayı; güncel endeks uygulama ayı (m.4(1)(ı), (ç)). Uygulama ayı endeksi belli değilse önceki ay kullanılır, sonra düzeltilir (m.6(2)) |
| Yuvarlama | **Metinde yuvarlama kuralı yok** |
| Değişiklikler | 24.2.2022 (2022/5202; 26.3.2022'den itibaren); 30.7.2025 (2025/10132; **1.9.2025**'ten itibaren: yurt içi ÜFE CPA 2008 tablosu, aynı ayda birden çok hakediş, yeni birim fiyat, cezalı çalışma ve revize iş programı hükümleri) |

**Koda etkisi:** Motordaki `F = An × B × (Pn − 1)` ve "B kullanıcı girdisi, ağırlık toplamı 1,00" tasarımı resmî metinle uyumlu; B için ayrıca 0,90 doğrulandı. **Eksik:** resmî bir sayısal örnek bulunamadı (Esaslar örnek içermiyor). Bu yüzden 4735 golden testleri hâlâ formülden türetilmiştir; bir ihale uzmanının onayladığı gerçek bir hakediş hesabıyla karşılaştırma gerekir. İkincil kaynaklarda geçen "artırımlı B (1,00 / 1,15)" değerleri tek kaynak olduğu için doğrulanmadı ve koda alınmadı.

---

## 3. Yapı Müteahhitlerinin Sınıflandırılması Yönetmeliği — Güven: **Yüksek**

**Kaynak (birincil):** Güncel konsolide metin, [mevzuat.gov.tr No 31301](https://www.mevzuat.gov.tr/File/GeneratePdf?mevzuatNo=31301&mevzuatTur=KurumVeKurulusYonetmeligi&mevzuatTertip=5) (RG 2.3.2019/30702; değişiklikler 21.9.2019, 3.10.2020, 5.8.2021, 14.11.2023, 26.12.2024, 16.9.2025, 2026). PDF diske indirilip `pypdf` ile yerelde okundu (10 sayfa). ÇŞB'nin kendi sitesinin sertifikası araçtan doğrulanamadığı için o adresler kullanılmadı. Değişikliklerin haberleri: [27.1.2026](https://www.alomaliye.com/2026/01/27/yapi-muteahhitligi-sisteminde-is-deneyimi-ve-yetki-belgesi-iptallerinde-degisiklik/), [14.5.2026](https://www.alomaliye.com/2026/05/14/yapi-muteahhitlerinin-kayit-ve-siniflandirma-esaslarinda-sure-uzatimi/), [16.9.2025](https://www.alomaliye.com/2025/09/16/yapi-muteahhitlerinin-siniflandirilmasi-ve-kayitlarinin-tutulmasi/amp/).

**Önceki modelin yanlışı:** Eski motor grup sınırlarını sabit TL ve **m²** olarak (B 65.000 m², H 2.101 m² vb.) ve 10 grup olarak tanımlıyordu. Yönetmelik ise grupları **yapı sınır bedelinin katları** olarak tanımlar, 14 grup vardır (B1, C1, D1, F1, G1 dahil) ve m² sınırı yoktur.

**Yapı sınır bedeli (m.4(1)(k)):** Bakanlıkça her yıl yayımlanan III. ve IV. sınıf yapı gruplarının yaklaşık birim maliyetlerinin ortalamasının **45.000 katı**. 2026 değeri, repodaki resmî 2026 Yapı Yaklaşık Birim Maliyetleri kataloğundan (III-A/B/C: 19.800 / 21.050 / 23.400; IV-A/B/C: 26.450 / 33.900 / 40.500 TL/m²) hesaplanır: ortalama 27.516,67 TL/m² × 45.000 = **1.238.250.000 TL**. Bağımsız üçüncü taraf kaynaklar da aynı rakamı veriyor ([kentseldonusumhub](https://www.kentseldonusumhub.com/blog/muteahhitlik-belgesi-tablosu-2026-sinif-metrekare), [muteahhitlikyetkibelgesi](https://www.muteahhitlikyetkibelgesi.com/yapi-siniflarina-gore-belge-grubu-sinirlari-2026/)).

**2026 grup tablosu** (motordan üretildi; iş deneyim tutarı eşiği **"geçen"** = kesinlikle büyük):

| Grup | İş deneyimi (yapı sınır bedeli katı) | Asgari iş deneyim tutarı (TL) | Azami iş tutarı (TL) | Usta | Teknik |
| --- | --- | ---: | ---: | ---: | ---: |
| A | > 2 | 2.476.500.000 | Sınırsız | 50 | 8 |
| B | > 7/5 | 1.733.550.000 | 1.733.550.000 | 24 | 6 |
| B1 | > 6/5 | 1.485.900.000 | 1.485.900.000 | 18 | 4 |
| C | > 1 | 1.238.250.000 | 1.238.250.000 | 12 | 3 |
| C1 | > 5/6 | 1.031.875.000 | 1.031.875.000 | 10 | 3 |
| D | > 2/3 | 825.500.000 | 825.500.000 | 9 | 2 |
| D1 | > 1/2 | 619.125.000 | 619.125.000 | 8 | 2 |
| E | > 1/3 | 412.750.000 | 474.662.500 | 6 | 2 |
| E1 | > 1/5 | 247.650.000 | 330.200.000 | 5 | 2 |
| F | > 1/10 | 123.825.000 | 247.650.000 | 3 | 1 |
| F1 | > 17/200 | 105.251.250 | 184.189.687,5 | 3 | 1 |
| G | > 7/100 | 86.677.500 | 130.016.250 | 1 | 1 |
| G1 | > 1/20 | 61.912.500 | 92.868.750 | 1 | 1 |
| H | aranmaz | — | 44.223.214,29 | — | — |

Azami iş tutarı çarpanları (m.14(3)): B–D1 → asgari tutar; E → 1,15; E1 → 4/3; F → 2; F1 → 1,75; G ve G1 → 1,5; H → G1 asgari tutarının 5/7'si; A → sınırsız.

**Mali ve diğer koşullar:**
- **Bilanço (m.12(2)), bir önceki yıla ait:** cari oran ≥ **0,75**; öz kaynak oranı ≥ **0,15**; kısa vadeli banka borçları / öz kaynak **< 0,75**. (Önceki motordaki üç eşik doğruydu.) Yeterlik kriterini sağlayamayanlar son üç yılın parasal ortalamasını sunabilir.
- **Banka referans beyanı (m.12(3)):** kullanılmamış kredi veya kısıtsız mevduat, grubun asgari iş deneyim tutarının ≥ **%5**'i.
- **Ciro (m.12(4)):** E ve E1 için asgari iş deneyim tutarının ≥ **%10**'u; daha üst gruplar için ≥ **%15**'i; daha alt gruplarda aranmaz.
- **G ve G1 (m.11(2)):** ekonomik ve mali yeterlikten **yalnız banka referans beyanı** istenir (bilanço oranları ve ciro aranmaz).
- **H (m.11(3)):** ekonomik, mali, mesleki ve teknik yeterlik belgesi istenmez.

**Kapsam dışı (motorun notlarında belirtilir):** iş deneyiminin 13. madde esaslarıyla belirlenmesi ve güncelleme katsayıları, üç yıllık bilanço ortalaması, ortak girişim ve kat karşılığı hesapları, yaptırımlar.

**Önceki "yaptırım" metni:** "Ruhsata aykırılıkta 5 yıl iptal" gibi cümleler eski motorda madde numarası olmadan yazılmıştı; bu cümleler yeni motora alınmadı (doğrulanmadı).

---

## 4. Konut KDV oranları ve kat karşılığı — Güven: **Orta**

**Konut oranları için kaynaklar:** [7346 sayılı CK (RG 7.7.2023) özeti — alomaliye](https://www.alomaliye.com/2023/07/10/konut-teslimlerinde-kdv-orani/amp/), [Net Haberler, 4.6.2026](https://www.nethaberler.com/haber-konut-teslimlerinde-kdv-oranlari-2026-guncel-113725.html), [İSFA YMM bülteni 2026/05](https://www.isfaymm.com/mali-bulten/kentsel-donusum-kdv-orani-2026). GİB'in resmî tablosuna ([ivdb.gib.gov.tr](https://ivdb.gib.gov.tr/sites/all/olusturulanDosyalar/konut_isyeri_kdv_orani.pdf)) erişilemedi (HTTP 503); **Genel Uygulama Tebliği metniyle karşılaştırma yapılmadı**.

Üç kaynağın ortak bulgusu (1/4/2022 ve sonrasında yapı ruhsatı alan konutlar):

| Rejim | Net alan ≤ 150 m² | 150 m² üzeri |
| --- | --- | --- |
| Genel | %10 | **Kısım bazında:** ilk 150 m² %10, fazlası %20 |
| 6306 kapsamı (riskli alan, rezerv yapı alanı, riskli yapı dönüşümü) | %1 | ilk 150 m² %1, fazlası %20 |

Matrah, net alana oranla kısımlara bölünür (ör. 160 m²'de 150/160 ve 10/160). İşyeri teslimleri %1 uygulamasından yararlanmaz. Genel oranlar 10.7.2023'te %18 → %20 ve %8 → %10 oldu.

**Eski motorun hatası:** KDV, 150 m² üzeri konutun **tamamına** tek oranla (%20) ve tüm proje hasılatına uygulanıyordu; oysa oran kısım bazındadır. Düzeltildi: `konutKdv()` ilk 150 m² ve fazlasını ayrı vergilendirir (`src/lib/kat-karsiligi.ts`).

**Kat karşılığı özelliği — birincil kaynak (güven: Yüksek):** KDV Genel Uygulama Tebliği **I/B-8 "Arsa Karşılığı İnşaat İşleri"**, [Resmî Gazete 5.6.2018 (18 Seri No'lu değişiklik)](https://www.resmigazete.gov.tr/eskiler/2018/06/20180605-15.htm). Kullanıcının sağladığı `gib-detay-1.pdf` yalnızca bu tebliğin içindekiler sayfalarıdır (I/B-8 ve II/B-12 başlıklarını gösterir; gövde metni yoktur); gövde metni Resmî Gazete'den okundu.
- Arsa (kat) karşılığı inşaat trampa niteliğindedir (7104 sayılı Kanun, RG 6.4.2018/30383; KDVK m.27(6)).
- **Müteahhidin arsa sahibine bıraktığı konut/işyeri teslimi**, VUK m.267/2'deki **ikinci sıra maliyet bedeli** esasına göre belirlenen tutar üzerinden vergilendirilir. Maliyet bedeli biliniyorsa **toptan satışlarda %5, perakendede %10** eklenerek emsal bedel bulunur. Genel idare ve genel giderlerden konuta düşen pay maliyete dahildir; **arsa sahibinde kalan birimlerin maliyetinde arsa payı dikkate alınmaz**. Piyasa satış fiyatı matrah değildir.
- **Arsa sahibinin arsa payı teslimi:** arsa iktisadi işletmeye dahilse veya arsa alım satımı mutat ve sürekli faaliyetse KDV'ye tabidir (matrah: alınan birimlerin maliyet esaslı tutarı; genel oran); arızi faaliyette vergi uygulanmaz.
- **Resmî sayısal örnekler** testlerde aynen kullanılır: maliyet 800.000 / 300.000 → toptan 840.000 / 315.000, perakende 880.000 / 330.000; arsa payı matrahı 1.155.000 (2018'in %18 oranıyla KDV 207.900). Örneklerin oranları 2018'e aittir; bugünkü genel oran %20'dir.
- Önceki taslağımda "emsal bedel = VUK m.267 maliyet bedeli" demiştim; doğrusu maliyet bedeli **artı %5/%10**'dur. Düzeltildi (`emsalBedel()`).

**Düzeltilen diğer hatalar:** brüt çarpanı ×1,30, kâr çarpanı ×1,20 ve ortalama konut 100 m² gizli varsayılanları kaldırıldı (hepsi girdi); "müteahhit kâr marjı" artık formül gereği hep %20 çıkan bir sonuç olarak sunulmuyor; payın %100'ü aşması durumunda açık uyarı veriliyor; %10/%20/%40/%30 tapu devri "Yargıtay standardı" olmaktan çıkarılıp **örnek sözleşme şablonu** (içtihat değildir) yapıldı ve toplamı %100 doğrulanan, kullanıcı tanımlı aşamalarla çalışıyor.

**Açık:** GİB Genel Uygulama Tebliği ve emsal bedel uygulaması için mali müşavir onayı; 1/4/2022 öncesi ruhsat rejimleri bilinçli olarak desteklenmiyor.

---

## 5. Ön-render ve yapay zekâ tarayıcıları — Güven: **Orta**

- React Router 7'de statik ön-render, **framework modu** Vite eklentisinin (`prerender` seçeneği) özelliğidir; proje **kütüphane modunda** (`BrowserRouter`) olduğu için doğrudan kullanılamaz ([React Router — Rendering Strategies](https://reactrouter.com/dev/guides/start/rendering)). Kütüphane modunda ön-render için resmî olmayan yöntemler (StaticRouter ile `renderToString` veya tarayıcıyla anlık görüntü) gerekir; `vite-react-ssg` ve Puppeteer yöntemlerinin React 19 uyumu **doğrulanamadı**.
- GPTBot, ClaudeBot ve PerplexityBot'un çoğunlukla JavaScript çalıştırmadığı ikincil kaynaklarda tutarlı biçimde belirtiliyor; ClaudeBot için tek bir karşı iddia var ve birincil belgeyle desteklenmiyor ([dev.to](https://dev.to/jangwook_kim_e31e7291ad98/ai-crawlers-dont-run-your-javascript-1jc7), [texta.ai](https://texta.ai/blog/javascript-rendering-ai-crawling), [prerender.io](https://prerender.io/blog/how-to-optimize-your-website-for-ai-crawlers/)). Tutarlı öneri: kritik içeriği ilk HTML yanıtında vermek.

**Uygulanan (Puppeteer'sız, build'e dokunmayan "ön-render-lite"):** Sunucu, her genel rotada `<title>`, açıklama ve canonical'a ek olarak gövdeye gerçek metin içeren bir `<noscript>` bloğu yazar (`src/server/security/route-meta.ts`): hesaplayıcı sayfalarında resmî formül adımları ve resmî örnek, ana sayfada yetenek durumu listesi, tüm sayfalarda gezinti bağlantıları. Kayıttan beslenen `llms-full.txt` ve `og-image.png` de ayrıca sunulur.

**Yapılmayan:** Sayfanın görsel gövdesinin tam ön-render'ı. Önerilen yol: kapsam dışı bırakılacak (statik) sayfalar için Puppeteer anlık görüntüsünü ayrı bir Docker aşamasında üretmek (Chromium yalnız çalışma imajında kurulu; build aşamasında yok) ve sunucuda `route-meta` ile birleştirmek. Landing sayfasındaki paket kartları API'den geldiği için anlık görüntü bu verinin çekilmesini bekleyecek şekilde tasarlanmalıdır.

---

## 6. Bu araştırmanın doğrulamadıkları

1. GİB'in güncel konsolide KDV Genel Uygulama Tebliği'nin **konut oranları** bölümü (kullanıcının sağladığı `gib-detay-1.pdf` yalnızca içindekiler; GİB oran tablosu 503). Arsa karşılığı bölümü (I/B-8) ise Resmî Gazete 5.6.2018'den birincil olarak okundu; sonraki değişikliklerle karşılaştırılmadı.
2. ÇŞB kendi sitesindeki PDF'ler (sertifika doğrulanamadı; aynı metin mevzuat.gov.tr'den alındı).
3. 4735 için resmî sayısal örnek (Esaslar örnek içermiyor).
4. K'nın yuvarlanmış mı yuvarlanmamış C'den mi hesaplanacağını ayıran bir resmî örnek.
5. "Artırımlı B (1,00 / 1,15)" geçici madde değerleri (tek kaynakta).
6. Hiçbir sonuç bağımsız mühendis, ihale uzmanı veya mali müşavir tarafından onaylanmadı; kayıtta hiçbir yetenek L3 değildir.
