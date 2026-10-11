# Faz 2: Tasarım Tezi ve Görsel Yön Belgesi

**Tarih:** 11 Ekim 2026  
**Dal (Branch):** `ui/redesign-v2`  
**Durum:** Tasarım Tezi Tamamlandı — **KAPI: İnsan Onayı Bekleniyor**

---

## 1. Üç Farklı Görsel Yön Analizi

"Yapay zeka SaaS klişelerinden" (mor-mavi gradyanlar, parlayan küreler, card-in-card enflasyonu, anlamsız hero alanları) kaçınmak ve Türk inşaat sektörünün gerçek dinamiklerine oturmak için 3 özgün görsel yön tasarlanmıştır:

---

### Yön 1: "Teknik Pafta & Metraj Cetveli" (The Engineering Blueprint & Ledger) — [SEÇİLEN YÖN]
- **Tez Cümlesi:** *"Her teklif ve metraj çalışması, inşaat sahasındaki onaylı statik pafta disipliniyle ele alınır; ekranlar teknik başlık bloğu (title block), revizyon damgası ve hassas ölçü çizgileriyle kurumsal güven verir."*
- **Renk ve Karakter:**
  - Kabuk: Koyu grafit (`oklch(0.18 0.012 255)`) ve teknik ofis nötrleri.
  - Çalışma Alanı: Yüksek kontrastlı, göz yormayan derin yüzeyler (`oklch(0.22 0.015 255)`).
  - Vurgu & Eylem: Şantiye turuncusu (`oklch(0.68 0.19 45)`) yalnızca birincil eylemlerde ve kritik uyarılarda.
  - Çizgiler: 1px hassas saç çizgisi (hairline dividers `border-zinc-800`).
- **İmza Öğeleri:**
  1. **Teknik Başlık Bloğu (Pafta Anteti / Title Block):** Sayfa tepelerinde kart yerine; Proje Adı, Revizyon No (Rev 02), Hazırlayan, Kontrol Eden, İhale Tarihi ve Durum Damgasını tek satırda toplayan mimari antet.
  2. **Metraj Cetveli (Ana Nesne):** Ekranın merkezinde Excel akıcılığında çalışan, yapışkan başlık ve yapışkan toplam çubuğuna sahip, tabular rakamlı veri ızgarası.
  3. **Revizyon Bulutu & Tarama (Hatch Pattern):** SmartCheck kalite uyarılarında yalnızca kırmızı renk yerine mimari projelerdeki revizyon bulutu (revision cloud) çerçevesi ve teknik tarama deseni.
  4. **Resmi Onay Mührü:** Kesinleşmiş tekliflerde ve aktarılmış metrajlarda mühendislik onay damgası rozeti.
- **Risk ve Çözümü:** Fazla bürokratik hissedilme riski; modern ve temiz Geist tipografisi, ferah hücre dolguları (padding) ve yumuşak geçişlerle dengelenmiştir.

---

### Yön 2: "Şantiye & Saha Mühendisliği Konsolu" (Field Engineering Console)
- **Tez Cümlesi:** *"Zorlu şantiye koşullarında, tablet üzerinde veya parlak ışıkta bile hatasız çalışan, dokunmatik öncelikli ve yüksek kontrastlı mühendislik terminali."*
- **Karakter:** Güçlü endüstriyel sarı/turuncu uyarılar, kömür siyahı zemin, iri dokunma alanları (≥ 48px), büyük durum etiketleri.
- **İmza Öğeleri:** Güvenlik yeleği sarısı aksanlar, hızlı şantiye notu çekmecesi, barkod/poz odaklı arama.
- **Neden Reddedildi:** Masaüstünde 8 saat teklif hazırlayan ve yüzlerce poz inceleyen teknik ofis maliyet uzmanı için fazla kaba ve düşük bilgi yoğunlukludur.

---

### Yön 3: "Finansal Hakediş & İhale Masası" (Financial Procurement & Bid Desk)
- **Tez Cümlesi:** *"İnşaat müteahhidinin kâr marjını, risk sapmalarını ve ihale birim fiyatlarını bir yatırım bankası terminali hassasiyetiyle yönettiği analitik çalışma masası."*
- **Karakter:** Ultra yoğun finansal veri tabloları, marj değişim sparkline'ları, koyu lacivert tonları.
- **İmza Öğeleri:** Dinamik marj koruma çubuğu, gerçek zamanlı sapma göstergesi.
- **Neden Reddedildi:** 5D BIM modelinden ve şantiye metrajından koparak sıradan bir ERP/muhasebe yazılımı hissiyatına kayma riski yüksektir.

---

## 2. "Logo Kapatma Testi" (The Logo-Cover Test)

> **Kural:** Ekrandan logoyu ve marka adını silin. Eğer arayüz rastgele bir SaaS (Linear, Supabase, Vercel kopyası) gibi görünüyorsa tasarım başarısızdır.

**TeklifPro Yeni Arayüzünün Logo Olmadan da Kendini Tanıtma Kanıtı:**
1. Ekranın tepesinde yer alan **Teknik Pafta Anteti (Title Block)**: Proje kodu, revizyon indeksi, ÇŞB poz standardı ve kontrol mühendisi kutucukları.
2. Tablodaki **Hakediş & Metraj Cetveli Sütunları**: Poz No, İmalat Kalemi, Mahalli / Kat, Miktar, Birim, Rayiç Analizi, Birim Fiyat, Tutar (₺).
3. Sayıların tamamında **Tabular Rakamlar (`tabular-nums`)** ve sağa yaslı hiyerarşi.
4. SmartCheck panelindeki **Mimari Revizyon Bulutu** ve **TS 708 / TBDY 2018 norm referansları**.

---

## 3. Tek Cümlelik Tasarım Kararları Gerekçeleri

- **Pafta Anteti Kararı:** *"Bu, teknik yöneticinin teklifin kime ait olduğunu, son revizyon numarasını ve onay durumunu tek bir bakışta görmesini sağlayarak yanlış revizyonun ihaleye gönderilmesini engeller."*
- **Tabular Rakamlar Kararı:** *"Bu, hesap uzmanının alt alta gelen milyonluk tutarları basamak kayması yaşamadan göz ucuyla toplamasını ve basamak hatalarını saniyesinde yakalamasını sağlar."*
- **Kart Enflasyonunun Kaldırılması:** *"Bu, kullanıcının asıl işi olan metraj kalemlerini görmek için sürekli dikey kaydırma yapma zorunluluğunu ortadan kaldırarak ekranda aynı anda 3 kat daha fazla kalem görmesini sağlar."*
- **Revizyon Bulutu & Kanıt Paneli:** *"Bu, SmartCheck bulgusunun arkasındaki resmi hesap kuralını şeffafça göstererek mühendisin yapay zekaya körü körüne güvenmek yerine kanıtı onaylayarak ilerlemesini sağlar."*

---

## 4. OKLCH Renk Token Mimarisi

Renkler, algısal olarak tekdüze ve ekranlar arası tutarlı **OKLCH** renk uzayında kurgulanmıştır:

```css
:root {
  /* Nötr Yüzeyler (Teknik Grafit) */
  --surface-canvas: oklch(0.16 0.012 255);    /* En arka plan (Koyu Grafit) */
  --surface-panel:  oklch(0.20 0.014 255);    /* Çalışma paneli */
  --surface-raised: oklch(0.24 0.016 255);    /* Seçili satır / Vurgulu alan */
  --surface-border: oklch(0.30 0.018 255);    /* 1px Saç çizgisi (Hairline) */
  --surface-border-subtle: oklch(0.24 0.012 255);

  /* Yüksek Kontrastlı Metinler (WCAG 2.2 AA Uyumlu) */
  --text-primary:   oklch(0.98 0.005 255);    /* Asıl metin & tutarlar (Kontrast 14:1) */
  --text-secondary: oklch(0.78 0.015 255);    /* Etiketler ve ikincil bilgi (Kontrast 6.5:1) */
  --text-muted:     oklch(0.65 0.018 255);    /* Yardımcı açıklamalar (Kontrast 4.8:1 - Asgariyi geçer) */

  /* Şantiye Turuncusu (Yalnızca Eylem ve Onay Vurgusu) */
  --accent-primary: oklch(0.68 0.195 45);     /* Birincil Buton, Aktif Rota */
  --accent-hover:   oklch(0.72 0.205 45);
  --accent-subtle:  oklch(0.25 0.060 45);     /* Vurgulu arka plan dolgusu */

  /* Semantik Durumlar (HER ZAMAN İkon + Metinle Desteklenir) */
  --status-success: oklch(0.72 0.17 145);     /* Onaylandı / Doğrulandı (Yeşil) */
  --status-warning: oklch(0.78 0.16 85);      /* İnceleme Gerekli / Tolerans Sınırı (Sarı-Kehribar) */
  --status-danger:  oklch(0.65 0.22 25);      /* Hata / Uyumsuzluk / Negatif Marj (Kırmızı) */
  --status-info:    oklch(0.70 0.14 230);     /* Resmi Mevzuat / Bilgi Notu (Mavi) */
}
```

---

## 5. Tipografi ve Türkçe Mikro-Metin Rehberi

### A. Tipografi Kuralları
- **Yazı Tipi:** `Geist Sans` (Gövde, menü, başlıklar) + `Geist Mono` (Poz no, tutarlar, metraj miktarları, tarihler).
- **Rakam Davranışı:** Sayısal ve finansal tüm alanlarda `tabular-nums` zorunludur.
- **Türkçe Karakter Testi:** `ĞÜŞİÖÇ ğüşıöç İstanbul ISPARTA ı i I İ ₺ 1.234.567,89`.
- **Yasak:** `text-[9px]`, `text-[10px]`, `font-black` ve gövdede `uppercase` kullanımı yasaklanmıştır. Asgari gövde boyutu `13px`, okunabilir hiyerarşi `text-xs (12px)`, `text-sm (14px)`, `text-base (16px)`, `text-lg (18px)`.

### B. Mikro-Metin (Türkçe İnşaat Dili) Sözlüğü
| Eski / Yasak Terim | Yeni Standart Terim | Kullanım Alanı |
|---|---|---|
| Evidence | **Dayanak Kanıtı** | SmartCheck kural doğrulama kartları |
| QTO | **Metraj Cetveli** | Miktar tablosu ve özetler |
| Snapshot | **Rayiç Kaydı / Mühür** | Fiyat kaynakları ve dondurulmuş pozlar |
| Pending Review | **İnceleme Bekliyor** | Durum rozetleri |
| Verified | **Doğrulandı** | Onaylanmış metraj ve kalemler |
| Add Item | **+ Poz Ekle** | Teklif kalem tablosu |
| Total Cost | **Kaba Yapı / İmalat Maliyeti** | Karlılık özeti |
| Margin Guard | **Marj Koruma Sınırı** | Teklif kar marjı denetleyicisi |

---

## 6. Bileşen Standartları (DESIGN.md ile Uyumlu)

1. **Kartlar:** Yalnızca bağımsız bir karar veya kanıt belgesi için kullanılır. Kart köşeleri `rounded-lg` (8–10px) ile sınırlandırılır. Kart içinde kart açılmaz.
2. **Tablolar:** Satırlar arası hairline ayırıcılar (`border-b border-surface-border`), fareyle üzerine gelindiğinde hafif aydınlanma (`hover:bg-surface-raised`), klavye ile odaklanılan hücrede net turuncu halka (`ring-1 ring-accent-primary`).
3. **Butonlar:** Eylemi olmayan veya sahte buton kesinlikle yer alamaz. Henüz aktif olmayan özellikler açıkça `"Yakında"` rozetiyle belirtilir.
4. **Boş ve Hata Durumları:** Ekranda veri yoksa boş kutu değil; mimari teknik çizim illüstrasyonu ve net yönlendirme mesajı: *"Henüz teklif kalemi eklenmedi. Yukarıdaki [+ Poz Ekle] butonuna basarak veya bir IFC dosyası yükleyerek başlayın."*

---

## 7. ONAY KAPISI (Gate 2 Checkpoint)

> [!IMPORTANT]
> **ÇALIŞMA KURALI (Faz 2 Sonu):**  
> Bu aşamada tasarım tezi, 3 yön incelemesi, seçilen "Teknik Pafta & Metraj Cetveli" yönü, OKLCH renk token sistemi ve Türkçe mühendislik dili belirlenmiştir.  
> **Uygulama kodlarına (Faz 3 ve Faz 4) geçmeden önce kullanıcının onayı beklenmektedir.**
