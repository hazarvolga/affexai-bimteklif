# BIMMetraj (TeklifPro) — Tasarım Sistemi (Design System)

Bu belge, **BIMMetraj (`TeklifPro`)** platformunun tek merkezli tasarım anayasasıdır (`Single Source of Truth`). Tüm genel vitrin sayfaları, müşteri çalışma alanı (`/app/*`), metraj icmal paftaları (`/app/smartcheck`) ve yönetim paneli (`/admin/*`) bu şemadaki anlamsal (semantic) tokenları kullanır.

## 1. Estetik Yön ve Arketip

> **"Bir Mimarlık Ofisinin Açık Proje Paftası (Architectural Drawing Sheet & Engineering Schedule)"**

Klasik SaaS panellerinin yuvarlatılmış balon kutuları, gölgeleri, gradyanları ve çok renkli trafik ışığı rozetleri yerine; mimar ve mühendislerin alışkın olduğu **antetli proje paftası**, **1px teknik cetvel çizgileri (hairline rules)**, **editöryal serif başlıklar** ve **tabular monospace metraj cetvelleri** kullanılır.

---

## 2. Renk Token Şeması (Açık Pafta & Gece Paftası Modları)

Hiçbir bileşen içinde sabit `#hex`, `bg-zinc-950`, `bg-blue-600` veya `from-indigo-500` kullanılmaz. Tüm yüzeyler [src/index.css](file:///Users/hazarvolgaekiz/dev/products/bimplanacademy/TeklifPro-repo/src/index.css) içindeki aşağıdaki 8 temel token üzerinden yönetilir:

| Anlamsal Token | Tailwind Karşılığı | Açık Mod (`light` — Sıcak Pafta) | Koyu Mod (`dark` — Koyu Antrasit Pafta) | Mimari Rolü |
| :--- | :--- | :--- | :--- | :--- |
| `--paper` | `bg-background` / `bg-paper` | `#f3f1e9` | `#141517` | Ana pafta kâğıdı / koyu antrasit zemin |
| `--surface` | `bg-card` / `bg-surface` | `#eae8df` | `#1c1e21` | İkincil yüzey, tablo başlığı ve yan panel |
| `--ink` | `text-foreground` / `text-ink` | `#242d29` | `#eceae4` | Ana metin ve teknik rapido mürekkebi |
| `--muted` | `text-muted-foreground` | `#62665e` | `#9ca0a6` | İkincil açıklama / kurşun kalem notu |
| `--rule` | `border-border` / `border-rule` | `#c9cbc1` | `#2e3237` | `1px` pafta cetvel ve katlama çizgisi |
| `--accent` | `bg-primary` / `text-primary` | `#a13c1b` | `#e07a52` | Teknik kiremit / sülüğen vurgu (odak & CTA) |
| `--accent-wash` | `bg-primary/10` | `#a13c1b14` | `#e07a521a` | Seçili tablo satırı ve aktif sekme yıkaması |
| `--inverse` | `text-primary-foreground` | `#eeeee5` | `#141517` | Kontrast yüzey üzerindeki metin |

---

## 3. Tipografik Üçlü

1. **Editöryal Başlık (`--font-display` — `Instrument Serif`):**
   - `h1` ve `h2` ana başlıklarında kullanılır (`font-weight: 400`, `letter-spacing: -0.03em`, `line-height: 1.06`).
   - Başlık içindeki `<em>` etiketleri italik olmaz; doğrudan `--accent` (teknik kiremit) rengini alır.
2. **Gövde ve Arayüz (`--font-sans` — `Manrope`):**
   - Paragraflar, butonlar, form etiketleri ve açıklamalar için kullanılır (`15px/1.75`).
3. **Teknik Antet ve Metraj Sayıları (`--font-mono` — `IBM Plex Mono`):**
   - Bölüm indeksleri (`01 /`, `02 /`), pafta antet şeritleri (`PROJE METRAJ PAFTASI · IFC4`), poz numaraları (`15.180.1003`) ve tüm metraj/fiyat sütunlarında (`font-variant-numeric: tabular-nums`) kullanılır.

---

## 4. Yapısal Pafta Kuralları

- **Sıfır Köşe Yuvarlatma (`--radius: 0rem`):** Kartlar, butonlar, tablolar ve input alanları keskin pafta köşelerine sahiptir.
- **Gölge Yok (`box-shadow: none`):** Derinlik hissi gölgeyle değil, `1px solid var(--rule)` çizgileri ve `--paper` / `--surface` ton farkıyla verilir.
- **Seçili Satır Vurgusu (`tr[data-highlight]`):** Metraj ve icmal tablolarında aktif/seçili satır sol kenarında `inset 3px 0 var(--accent)` çizgisi ve `--accent-wash` arka planı ile vurgulanır.
- **Pafta Kros İşaretleri (`+`) ve Antet Şeridi:** Teknik çizim ve hesap kanıtı panellerinin köşelerinde `+` kros (registration) işaretleri ve altında `IBM Plex Mono` antet bilgisi yer alır.
