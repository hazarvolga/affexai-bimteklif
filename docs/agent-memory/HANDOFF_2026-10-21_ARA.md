# Handoff: Çalışmaya Ara & Kapsamlı Denetim Kaydı (2026-10-21)

- **Tarih / Saat:** 21 Ekim 2026 (`2026-10-21T21:38+03:00`)
- **Mevcut Kod Sürümü:** `Rev. 39` (`BIM-CALC-2026-10-19.33`, `BIM-CAP-2026-10-17.11`, branch `docs/rev39-handoff` @ `fd32f8b`)
- **Tam Denetim & Rakip Analiz Raporu:** `docs/audits/GENEL_DURUM_GAP_BUG_SEO_GEO_RAKIP_RAPORU_2026-10-21.md`
- **Sonraki Ajan Başlangıç Görev Metni:** `docs/agent-memory/NEXT_AGENT_PROMPT_2026-10-21.md`

---

## 1. Bu Oturumda Ne Yapıldı? (Salt-Okunur Tam Denetim)

Kullanıcı talebiyle **uygulama kodunda (`src/`, `workers/`) ve paylaşımlı veritabanlarında hiçbir değişiklik yapılmadan** projenin uçtan uca mevcut durumu analiz edildi, 8 hesaplama/kural motoru resmî mevzuat ve internet araştırması ile doğrulandı, GAP / BUG / SEO / GEO bulguları ve Türkiye/Global rakip karşılaştırması çıkarılarak kayıt altına alındı:

1. **Otomatik Test Doğrulaması:**
   - `./node_modules/.bin/tsc --noEmit`: **`0` hata**
   - `workers/ifc/.venv/bin/python -m pytest workers/ifc -q`: **`60/60` geçti** (`5.95s`)
   - `./node_modules/.bin/tsx --test` (27 test paketi): **`245/245` geçti**
2. **Hesaplama Motorlarının Doğrulaması:**
   - **4734 KİK m.38 & Tebliğ m.45.1.1 (`src/lib/kik-adt.ts`):** Resmî Tebliğ 45.2 sayısal örneği (`YM = 100.000 TL`, `N = 1,20`, 12 teklif $\rightarrow SD = 52.281,00\text{ TL}$) ile **$0,00\text{ TL}$ farkla** doğrulandı.
   - **4735 Fiyat Farkı (`src/lib/price-escalation.ts`):** $F = A_n \times 0,90 \times (P_n - 1)$, $\sum w_i = 1,00$ ve 21 TÜİK alt endeksi doğrulandı (Cezalı çalışma m.6 endeks karşılaştırması ve avans mahsubu `GAP-04` olarak kaydedildi).
   - **Kat Karşılığı & 6306 KDV (`src/lib/kat-karsiligi.ts`):** 7346 sayılı CK dilimli KDV ($150\text{ m}^2$ altı `%1`/`%10`, aşan kısım `%20`) ve VUK m.267 maliyet bedeli emsal artışı (`+%5` toptan / `+%10` perakende) doğrulandı.
   - **YAMBİS Yetki Belgesi (`src/lib/yambis-classification.ts`):** RG 31301 konsolide 14 grup (`A..H`), 2026 Yapı Sınır Bedeli (`1.238.250.000 TL`) ve mali/teknik yeterlik oranları doğrulandı.
   - **Pre-BIM İmar Fizibilite (`src/lib/pre-bim-feasibility.ts`):** Planlı Alanlar İmar Yönetmeliği m.5/8 & m.22 `%30` emsal harici tavanı ve 27 kalemlik `VILLA_MARKET_COST_BENCHMARK_2026` doğrulandı.
   - **SmartCheck Minha, TS 500, 3×3 ve RG 33331 e-PYS:** `CSB_2026` ($0,50\text{ m}^2$), `DIN_18350` ($2,50\text{ m}^2$), $\le \%3$ QTO sapması, TS 500 paspayı ve EK-9 Tablo 9.1/9.2 kuralları doğrulandı.

---

## 2. Ara Sonrası İlk Ele Alınacak Kritikler (`Rev. 40` Adayları)

Ayrıntıları `docs/audits/GENEL_DURUM_GAP_BUG_SEO_GEO_RAKIP_RAPORU_2026-10-21.md` içinde yer alan öncelikli maddeler:

1. **`BUG-01` (Yüksek — `src/ifc/structural-material.ts:21-58`):** `"Gazbeton"` ve `"Gaz beton"` kelimeleri `"beton"` alt-dizgisi içerdiği için `CONCRETE_PATTERN` ile eşleşmekte ve kâgir duvar (`15.225.1004`) yerine C30/37 Betonarme (`15.150.1006`) olarak sınıflandırılmaktadır.
2. **`BUG-02` (Orta-Yüksek — `src/ifc/calm-icmal.ts:512-556` & `src/smartcheck/sample-projects.ts:1098-1146`):** `st-statik-tablo-9-2` örnek projesinde taşıyıcı perde duvar satırında `materialLayers` bulunmadığından ve açıklamada `"beton"` geçmediğinden eleman `unplaced` olarak icmal dışına düşmekte; koruma betonu satırında ise `coveringPredefinedType` eksikliği nedeniyle jenerik fiyat (`450 TL/m²`) kullanılmaktadır.
3. **`BUG-03` (Orta — `src/ifc/structural-material.ts:23-42, 61-65`):** Dayanım sınıfı belirtilmemiş betonlar (`concreteClass === null`) ve `"Grobeton"` / `"C 25/30"` ifadeleri uyarı (`CONCRETE_CLASS_DIFFERS`) üretmeden C30/37 Betonarme olarak fiyatlandırılmaktadır.
4. **`BUG-04` (Orta — `src/ifc/parser/legacy-parser.ts:108-215`):** Tarayıcı önizleme ayrıştırıcısı `IfcCovering` ve `materialLayers` üretmediği için sunucu worker'ı ile uyumsuzdur; ayrıca yerel `fix/ifc-browser-quota-alert` (`b9153eb`) dalı birleştirilmeyi beklemektedir.
5. **`SEO-01` & `SEO-02` (`index.html:63, 66, 90`):** Statik JSON-LD içindeki *"CDE durum geçiş doğrulaması"* ve *"18.848 satır katalog"* ifadeleri `src/capabilities/registry.ts` gerçeklik kapısı ile hizalanmalıdır.
6. **`GAP-08` (Canlı Ortam Deploy):** Coolify üzerinde `https://bimmetraj.com` halen `Rev. 35` (`9c59971`) seviyesindedir; `Rev. 36–39` (+ yapılacak `Rev. 40`) deploy edilmelidir.
