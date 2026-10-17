# Dış Kaynak: "Türkiye Geneli İnşaat Müteahhitleri Süreç Analizi" (17 Ekim 2026)

- **Dosya:** Hazar'ın repo köküne yerel olarak koyduğu `.docx` (repoya **eklenmedi**; yalnızca ajan hafızası için okundu).
- **Niteliği:** Dipnotlu, 170 kaynaklı bir derleme rapor (yapay zekâ destekli araştırma çıktısı gibi görünüyor). Birincil/resmî kaynak değildir; kaynakları blog ve şirket sayfalarını da içeriyor. Aşağıdaki "doğrulanan" ifadeler yalnızca **kodumuzdaki mevcut motorla tutarlı** olanlardır; resmî metinle bağımsız doğrulama yapılmadı.

## 1. Kodla tutarlı bulunanlar
| Konu | Rapor | Kodumuz |
|---|---|---|
| Yapım işi sınır değer algoritması | %40 altı ve %120 üstü teklifler ayıklanır; ortalama ve standart sapma; ±σ içindekilerin yeniden ortalaması; SD = K × Tort2 / (C × N) | `src/lib/kik-adt.ts` aynı adımlar |
| N katsayısı | Bina/mekanik/elektrik 1,00; diğer (altyapı) 1,20 | Aynı |
| SD tabanı | Yaklaşık maliyetin %40'ının altına inemez | Aynı |

## 2. Rapordan çıkan ve **uygulanan** düzeltme
- **İdare N'yi 1,00–1,20 arasında farklı belirleyebilir** (ilan/idari şartnamede yayımlanır). Motor `nCoefficientOverride`'ı **aralık denetimi olmadan** kabul ediyordu (N = 5 girilse yanlış sınır değer üretirdi). Artık 1,00–1,20 dışı değer hata verir; halka açık hesaplayıcıya "İdarenin belirlediği N" alanı eklendi (Rev. 23).
- Hesaplayıcı sayfasına yalnızca **yapım işleri** için olduğu (hizmet alımında eşikler farklı) ve idarenin açıklama isteyip istemeyeceğinin ihale dokümanına bağlı olduğu notu eklendi.

## 3. Yeni bilgi / ürün fırsatı (henüz kodlanmadı)
- **ADT savunma dosyası:** Birinci seçenekte idare açıklama ister (genellikle 3–5 iş günü); ikinci seçenekte açıklama istenmeden reddedilir. Savunma Ek-O.5 (proforma fatura, SMMM/YMM onaylı), Ek-O.6 (maliyet analizi), Ek-O.7 (işçilik çizelgesi) gibi katı biçimli formlara dayanır; rapora göre yuvarlama hatası bile savunmayı geçersiz kılabilir. Kayıtlı `ekap-tender-protocol-import` (roadmap) bu alana bağlanabilir. **Doğrulanacak:** form biçimleri resmî Kurum dokümanlarından alınmalı.
- **Rekabet haritası:** Raporda yerel ADT/fiyat farkı/hakediş yazılımları olarak **Oska** ve **AMP** anılıyor. İnşaatpanel (kentsel dönüşüm) ayrı. Bizim ayrışmamız IFC'den doğrulanabilir metraj + varsayılansız hesap.
- **Fiyat farkı bileşenleri:** Rapor ağırlıkları işçilik (a), malzeme grupları (b1–b5) ve makine/ekipman (c) olarak veriyor ve fiyat farkında yüklenici kârının ödenmediğini söylüyor. Bu, kodumuzdaki B = 0,90 ile ilişkili olabilir ama **raporda B tanımlı değil**; bu yüzden B'nin anlamı doğrulanmadı. Raporun "a = işçilik" tanımı bizim "sabit katsayı a" etiketimizle çelişebilir; arayüz etiketi **"endekse bağlı olmayan sabit terim"** olarak nötrleştirildi. **Açık:** gerçek sözleşme formülüyle uzman teyidi.
- **Kat karşılığı için formül (M-3'e eklenebilir):** Rapor, gerekli müteahhit payını *maliyet × 1,20 / satış fiyatı* olarak veriyor; tablosundaki değerler (oran 1,6→%75, 2,0→%60, 2,4→%50, 3,0→%40) bu formülle aritmetik olarak tutarlı. Önerilen uygulama: **hedef kâr/risk çarpanı kullanıcı girdisi** (raporun 1,20'si kaynaksız varsayım), satış fiyatı kullanıcı girdisi; çıktı = gerekli müteahhit payı ve vaat edilen arsa sahibi payıyla karşılaştırma. Bu, Melih Bey'in "+10 m² vaat" endişesiyle birleşir (vaat, müteahhidi hedef kârın altına düşürüyorsa uyarı; kalite hakkında hüküm verilmeden).
- **Müteahhit yetki belgesi sınıfları (A–H) ve m² kapasiteleri:** ürün için yan fırsat (örn. bir iş hangi sınıfı gerektirir kontrolü); raporun m² değerleri "cari yıl yapı yaklaşık birim maliyetine göre değişir" notuyla verilmiş, kullanılmadı.
- **Teklif departmanı, S-eğrisi, nakit akışı:** mevcut eskalasyon/T-2 harcama simülasyonuyla örtüşüyor.

## 4. Ürüne **alınmayan** (doğrulanamayan veya piyasa aktarımı) iddialar
| İddia | Neden alınmadı |
|---|---|
| Konut KDV tablosu (6306'da ≤150 m² %1, standart ≤150 m² %10, üzeri %20 kademeli) | İnşaatpanel makalesindeki ifadeyle benzer, ancak resmî metinle doğrulanmadı; KDV oranları değişti. Vergi modülü bilerek oran seçmez. |
| Emsal bedel = maliyet + VUK'a göre %5 veya %10 kâr | Doğrulanmadı. |
| Arsa sahibi payı: lüks/merkez %50–60, çevre/Anadolu %30–45 | Piyasa aktarımı; M-3'te pay % kullanıcı girdisi. |
| Kademeli devir yüzdeleri (ruhsat %10, temel üstü %20, kaba %40, iskân %100) | Sözleşme pratiği önerisi, kaynaksız. |
| Yapay zekâ maliyet tahmini %86–93 doğruluk, %5 hata | Akademik çalışmaların aktarımı; ürün böyle bir tahmin yapmıyor. |
| %2–4 / %8–12 tedarik tasarrufu | Kaynaksız genel iddia. |

## 5. Bekleyen sorularla ilişki
- Melih Bey Soru 5 (pay hangi alan üzerinden) ve Soru 10 (maliyet yüzdeleri): Rapor kaynaklı bir dağılım vermiyor; yanıt gelene kadar kullanıcı girdisi kalır.
