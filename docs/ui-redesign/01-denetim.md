# Faz 1: Denetim ve Mevcut Durum Analizi (UX, A11y, SEO, GEO)

**Tarih:** 11 Ekim 2026  
**Dal (Branch):** `ui/redesign-v2`  
**Yöntem:** Heuristic (Sezgisel) UX Denetimi, WCAG 2.2 AA Erişilebilirlik İncelemesi, SEO/GEO Taraması ve Performans Ölçümü.

---

## 1. Sezgisel UX Denetimi (Heuristic UX Findings)

Mevcut arayüz genel olarak işlevsel olsa da, inşaat teknik ofis kullanıcılarının iş akışlarına ve profesyonel yazılım standartlarına göre ciddi darboğazlar barındırmaktadır:

### A. Jargon Yoğunluğu ve Dil Karmaşası (Yüksek Öncelik)
- **Bulgu:** Arayüzde son kullanıcıya (inşaat mühendisi, tekniker, maliyet uzmanı) İngilizce mühendislik terimleri ve ham yazılım jargonları gösterilmektedir:
  - `evidence`, `QTO accepted`, `pending_review`, `snapshot`, `GUID`, `LOIN`, `divergence`.
- **Etki:** Kullanıcı kendini bir "inşaat teklif/metraj yazılımında" değil, "yapay zeka geliştirme laboratuvarında" hissetmektedir. Güven duygusu zedelenmektedir.
- **Düzeltme:** Kelimeler Türk inşaat sektörünün yerleşik diliyle değiştirilmelidir:
  - `QTO` $\rightarrow$ Metraj Cetveli / Miktar Özeti
  - `evidence` $\rightarrow$ Dayanak Kanıtı / Hesap Raporu
  - `pending_review` $\rightarrow$ İnceleme Bekliyor
  - `snapshot` $\rightarrow$ Onaylı Fiyat Kaydı / Rayiç Mührü.

### B. Tipografi ve Okunabilirlik Katili Öğeler (Yüksek Öncelik)
- **Bulgu:** [`Shell.tsx`](file:///Users/hazarvolgaekiz/dev/products/bimplanacademy/TeklifPro-repo/src/components/layout/Shell.tsx#L31-L45) ve panellerde yoğun şekilde `text-[9px]`, `text-[10px]`, `font-black`, `uppercase` ve `tracking-[0.2em]` kullanılmıştır.
- **Etki:** 10px büyük harf metinler özellikle 14" laptop ve tablet ekranlarında okunamaz hale gelmekte, göz yormaktadır.
- **Düzeltme:** Asgari gövde metin boyutu 13px/14px olmalı; `font-black` yerine `font-semibold` veya `font-medium` kullanılmalı, büyük harf (uppercase) yalnızca kısa rozet etiketleriyle sınırlandırılmalıdır.

### C. Kart Enflasyonu ve "Card-in-Card" Anti-Pattern (Orta Öncelik)
- **Bulgu:** Dashboard ve teklif düzenleme sayfalarında her bilgi parçası ayrı bir `Card` içerisine konulmuş; bazı yerlerde kartın içine başka kartlar yerleştirilmiştir.
- **Etki:** Ekran dikeyde gereksiz yere uzamakta, kullanıcı asıl görmesi gereken metraj tablosunu görebilmek için sürekli kaydırma (scroll) yapmak zorunda kalmaktadır.
- **Düzeltme:** Kart yerine **teknik pafta başlığı (title block)**, ince ayırıcı çizgiler (hairline dividers) ve kompakt veri ızgaraları kullanılmalıdır.

### D. Metraj Cetvelinde Excel / Spreadsheet Hissi Eksikliği (Yüksek Öncelik)
- **Bulgu:** [`CreateQuote.tsx`](file:///Users/hazarvolgaekiz/dev/products/bimplanacademy/TeklifPro-repo/src/pages/CreateQuote.tsx) kalem tablosu modern bir veri tablosu görünümünde olsa da, klavye ok tuşlarıyla gezinme, hızlı Enter ile satır tamamlama ve yapışkan (sticky) toplam çubuğu yeterince güçlü değildir.
- **Düzeltme:** Kalem düzenleyici bir hakediş/metraj cetveli hissi vermeli; klavye dostu (Tab/Enter/Esc), sayısal değerlerde tabular rakamlar (`font-variant-numeric: tabular-nums`) kullanılmalıdır.

---

## 2. Erişilebilirlik (A11y / WCAG 2.2 AA) Denetimi

| Kriter | Mevcut Durum | Risk & Bulgu | Çözüm |
|---|:---:|---|---|
| **Renk Kontrastı (Metin)** | 🔴 Başarısız | Koyu tema üzerinde kullanılan `text-zinc-500` (#71717A) ve `text-zinc-600` metinler 4.5:1 kontrast oranını karşılamamakta (~2.8:1). | İkincil metinler en az `text-zinc-400` (#A1A1AA) veya OKLCH eşdeğeri ile 4.5:1'e çıkarılacak. |
| **Dokunma Hedefleri (Mobile Touch)** | 🟡 Sınırda | Mobilde bazı ikon butonları ve etiket hapları 32px veya 36px yüksekliğinde. | Bütün interaktif dokunma hedefleri asgari 44x44px (`min-h-[44px] min-w-[44px]`) olacak. |
| **Görünür Odak (Focus Visible)** | 🟡 Kısmi | Varsayılan Tailwind fokus halkası bazı kartlarda arka planla çakışarak kayboluyor. | Net 2px kontrastlı turuncu/beyaz çift halka (`ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-950`). |
| **İkon-Yalnız Butonlar** | 🔴 Başarısız | Tablolardaki silme, kopyalama ve indirme butonlarının bir kısmında `aria-label` tanımlı değil. | Tüm ikon butonlarına zorunlu `aria-label="Kalemi sil"` gibi Türkçe açıklamalar eklenecek. |
| **Yalnızca Renkle Bilgi Verme** | 🟢 Geçti | Durum göstergelerinde renk yanında rozet metni ve ikon kullanılmaktadır. | Korunacak. |

---

## 3. SEO ve GEO (Generative Engine Optimization) Tabanı

### A. SEO Mevcut Durumu (Herkese Açık Sayfalar)
- **Mimari:** Uygulama saf bir Vite İstemci Taraflı SPA'dır (`Single Page Application`).
- **Arama Motoru Açığı:** Arama motoru botu veya cURL ile `https://bimmetraj.com` çağrıldığında sunucudan yalnızca boş bir `<div id="root"></div>` ve script etiketi dönmektedir.
- **Eksikler:**
  - `<head>` içinde dinamik rota bazlı `<title>` ve `<meta name="description">` bulunmamaktadır (tüm sayfalarda aynı varsayılan başlık görünür).
  - `sitemap.xml` ve `robots.txt` kök dizinde mevcut değildir.
  - Açık sayfalarda Canonical URL ve Open Graph (OG) meta etiketleri eksiktir.

### B. GEO (Üretken Yapay Zeka Alıntılanabilirliği) Durumu
- **Eksikler:**
  - Sayfada `JSON-LD` (Schema.org `SoftwareApplication`, `Organization`, `FAQPage`) işaretlemesi yoktur. Perplexity, ChatGPT veya Claude web aramasında projeyi bir inşaat teklif yazılımı olarak yapısal olarak tanımlayamaz.
  - Sıkça Sorulan Sorular (SSS) bölümü yapılandırılmış veri içermemektedir.

---

## 4. Performans ve Paket Boyutu Analizi

`pnpm run build` çıktısından elde edilen somut varlık boyutları:

- **CSS Paketi:** `index-BR7utF1H.css` $\rightarrow$ **211 KB** (Gzip: 30.1 KB) — Tailwind v4 ile derlenmiş.
- **En Büyük JS Parçaları:**
  1. `charts-DWr5wRBu.js`: **449 KB** (Grafik kütüphaneleri - Recharts).
  2. `index-vdQv2HuX.js`: **422 KB** (Ana uygulama çekirdeği).
  3. `CompleteAcademyContent-*.js`: **276 KB** (Akademi içeriği - lazy yüklü).
  4. `react-3We76-Da.js`: **128 KB** (React 19 çekirdeği).
- **Fontlar:** Geist font ailesi `dist/assets/*.woff2` (16 KB - 29 KB) olarak yerel sunulmaktadır (`latin-ext` alt kümesi dahil).

---

## 5. Önceliklendirilmiş Sorun ve Eylem Listesi

1. **P0 (Kritik):** Koyu tema kontrast açığı (`text-zinc-500` $\rightarrow$ okunabilir kontrast).
2. **P0 (Kritik):** İkon butonlarına eksiksiz `aria-label` eklenmesi.
3. **P1 (Yüksek):** Tiny text (`9px`/`10px`) ve aşırı `font-black uppercase` kullanımının temizlenmesi.
4. **P1 (Yüksek):** Açık rotalar için `index.html` ve rota bazlı `<title>`, `meta description`, `canonical` ve `JSON-LD` enjeksiyonu.
5. **P2 (Orta):** Kart-içinde-kart yapılarının teknik pafta başlığı ve ızgara yerleşimine dönüştürülmesi.
6. **P2 (Orta):** Kalem tablosunda tabular rakamlar (`tabular-nums`) ve Excel benzeri klavye gezinim akışı.
