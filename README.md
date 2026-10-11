# BIMMetraj

<div align="center">

**BIM Tabanlı Metraj, Keşif ve İhale Masası**  
*Mühendislik disipliniyle geliştirilmiş metraj cetveli, ÇŞB poz entegrasyonu, IFC kural denetimi ve ihale yönetim platformu.*

[![Canlı Ortam](https://img.shields.io/badge/Canl%C4%B1-bimmetraj.com-blue?style=flat-square&logo=cloudflare)](https://bimmetraj.com/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38b2ac?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle%20ORM-336791?style=flat-square&logo=postgresql)](https://orm.drizzle.team/)
[![Node.js](https://img.shields.io/badge/Node.js-24%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Lisans](https://img.shields.io/badge/Lisans-Tescilli%20%2F%20Proprietary-red?style=flat-square)](#)

</div>

---

## 🏗️ Proje Hakkında

**BIMMetraj** (eski adıyla *TeklifPro / BIMPlan Academy*), Türk inşaat sektöründeki teknik ofis mühendisleri, metraj uzmanları ve teklif hazırlayıcılar için özel olarak geliştirilmiş kurumsal bir **metraj, keşif, maliyet analizi ve ihale yönetim masasıdır**.

Geleneksel, hataya açık elektronik tablolara ve soyut genel SaaS çözümlerine alternatif olarak; **teknik pafta ve metraj cetveli** mantığını modern web teknolojileriyle birleştirir. Tüm parasal ve metraj değerleri sabit genişlikli (`tabular-nums`) mühendislik formatında işlenir, Çevre ve Şehircilik Bakanlığı (ÇŞB) poz standartlarıyla entegre çalışır ve IFC modellerinden otomatik metraj çıkarımı sağlar.

### 🎯 Temel İlkeler

- **Kanıt Önce, Söylem Sonra:** Her metraj ve maliyet kalemi şeffaf hesaplama adımlarıyla doğrulanır.
- **İnsan Onaylı Denetim:** Yapay zekâ veya algoritmalar mühendis yerine kesin hüküm vermez; kural ihlallerini bulgu ve kanıt olarak sunar, son onay yetkili teknik uzmana aittir.
- **Teknik Pafta Disiplini:** Arayüz gereksiz süs ve parıltılardan arındırılmış, teknik şartnamelere ve şantiye gerçeklerine uygun koyu grafit pafta (`hairline grid`, antet blokları) kimliğinde tasarlanmıştır.

---

## ⚡ Temel Modüller

### 1. Metraj Cetveli & İhale Yönetimi
- **Hızlı Kalem Girişi:** Poz no, imalat tanımı, miktar, birim (m³, m², ton, vb.), birim fiyat ve kâr marjı hesapları.
- **Marj Koruma & Maliyet Analizi:** Malzeme, işçilik ve nakliye bileşenleri üzerinden net maliyet ve kârlılık takibi.
- **Vektörel PDF Pafta Üretimi:** Müşteri ve ihale formatına uygun, antetli ve resmi teklif çıktısı (Headless Chromium motoru ile piksel kusursuzluğu).

### 2. BIM / IFC Metraj Çıkarımı (QTO)
- **IFC 2x3 & IFC4 Desteği:** 3D bina bilgi modellerinden mimari ve statik elemanların (kolon, kiriş, döşeme, duvar) otomatik taranması.
- **Hacim, Alan ve Uzunluk Ayrıştırma:** Net beton hacimleri, kalıp yüzey alanları ve donatı tonajlarının çıkarılması.
- **ÇŞB Poz Eşleştirme:** Ayrıştırılan metraj verilerinin kamu pozları ve özel analizlerle doğrudan ilişkilendirilmesi.

### 3. SmartCheck Kural & Kalite Denetim Motoru
- **Tolerans & Çakışma Kontrolü:** Metraj ve pafta arasındaki sapmaları yakalayan kural seti (Örn: %3 hacim toleransı, paspayı kontrolü).
- **Mevzuat & Standart Doğrulama:** e-PYS Ek-6 ve Eurocode / TBDY teknik yönergeleriyle uyumluluk taraması.
- **Revizyon Bulutu Bulguları:** Her tespit; önem derecesi, kanıt verisi, kaynak standart ve önerilen düzeltme adımıyla birlikte sunulur.

### 4. BIMPlan Academy
- **Teknik Bilgi & Pratik Rehberler:** Metraj, keşif, hakediş ve BIM süreçleri için hazırlanmış mikro-öğrenme modülleri.
- **Standartlar ve Sözlük:** ISO 19650, e-PYS ve ulusal şartnamelere dair teknik referans kütüphanesi.

### 5. Kurumsal Altyapı & Güvenlik
- **Çok Kiracılık (Multi-Tenancy):** Firma bazında tam veri izolasyonu ve şirket içi rol/yetki dağılımı.
- **Güvenli Oturum:** JWT tabanlı kimlik doğrulama, bcrypt şifreleme ve güvenli oturum yönetimi.
- **Audit Logging:** Teklif revizyonları, metraj güncellemeleri ve kullanıcı hareketlerinin geriye dönük izlenebilirliği.

---

## 🛠️ Teknoloji Mimarisi

```mermaid
graph TD
    Client["Kullanıcı Arayüzü (Vite + React 19 + Tailwind v4)"]
    API["Uygulama Sunucusu (Express + Node.js 24)"]
    DB[("PostgreSQL (Drizzle ORM)")]
    Worker["Arka Plan İşçisi (Graphile Worker)"]
    PDF["PDF Render Motoru (Puppeteer / Chromium)"]
    Storage["Nesne Depolama (S3 Uyumlu MinIO / S3)"]

    Client -->|REST API & JSON| API
    API -->|Sorgu & İlişkisel Veri| DB
    API -->|Asenkron Kuyruk| Worker
    Worker -->|Metraj & Ayrıştırma| DB
    API -->|Vektörel Çıktı| PDF
    Worker -->|Model & Dosya Arşivi| Storage
```

| Katman | Teknoloji | Açıklama |
| :--- | :--- | :--- |
| **Ön Yüz (Frontend)** | React 19, Vite, TypeScript | Modern, reaktif ve hızlı tek sayfa uygulama (SPA) mimarisi. |
| **Stil & Tasarım** | Tailwind CSS v4, shadcn/ui | OKLCH renk uzayı, hairline pafta ızgaraları ve Geist Mono tipografisi. |
| **Arka Yüz (Backend)** | Express, TypeScript, ESBuild | Düşük gecikmeli RESTful servisler, çok kiracılı güvenlik katmanı. |
| **Veritabanı** | PostgreSQL, Drizzle ORM | Tip güvenli şema tanımları, ilişkisel veri modeli ve performanslı sorgular. |
| **İşçi & Kuyruk** | Graphile Worker | Ağır IFC ayrıştırma ve Excel içe/dışa aktarım işleri için asenkron kuyruk. |
| **PDF Motoru** | Puppeteer (Headless Chromium) | Mühendislik standartlarında yüksek çözünürlüklü vektörel teklif paftaları. |
| **Dağıtım (DevOps)** | Docker, Coolify, Cloudflare | Otomatik CI/CD, ters vekil (reverse proxy) ve CDN katmanı. |

---

## 🚀 Kurulum & Yerel Geliştirme

### Gereksinimler

- **Node.js:** `v24.18.0` veya üzeri (Önerilen: v24.x LTS)
- **Paket Yöneticisi:** `pnpm` (v10 veya v11)
- **Veritabanı:** `PostgreSQL` (15+)

### 1. Depoyu Klonlayın

```bash
git clone https://github.com/hazarvolga/affexai-bimteklif.git
cd affexai-bimteklif
```

### 2. Bağımlılıkları Yükleyin

```bash
pnpm install
```

### 3. Çevre Değişkenlerini Yapılandırın

`.env.example` dosyasını referans alarak kök dizinde `.env` dosyası oluşturun:

```bash
cp .env.example .env
```

Gerekli minimum parametreler:
```env
DATABASE_URL="postgresql://kullanici:sifre@localhost:5432/teklifpro_local"
JWT_SECRET="guclu-ve-rastgele-bir-secret-anahtar"
PUBLIC_APP_URL="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key"
```

### 4. Geliştirme Sunucusunu Başlatın

Uygulama sunucusunu ve Vite derleyicisini tek komutla başlatın:

```bash
pnpm dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışacaktır.

---

## 🧪 Test & Kalite Kontrolleri

Proje sıkı kalite ve tip kontrolleriyle güvence altına alınmıştır:

```bash
# Tip kontrolü (TypeScript strict)
pnpm lint

# Birim ve entegrasyon testleri (790+ test)
pnpm test

# Üretim derlemesi (Vite SPA + Server bundle)
pnpm run build

# Tam doğrulama döngüsü
pnpm run verify
```

---

## 🌐 Canlı Ortam & Dağıtım

Proje **Coolify** üzerinde barındırılmakta olup **Cloudflare** arkasında güvenli bir şekilde sunulmaktadır:

- **Canlı Web Adresi:** [https://bimmetraj.com](https://bimmetraj.com)
- **Yönetim Konsolu:** Coolify VPS Altyapısı
- **Docker İmajı:** Çok aşamalı (multi-stage) optimize Node.js çalışma ortamı.

---

## 👥 Ekip & İletişim

**BIMMetraj**, **BIMPlan Academy** ve **AffexAI** iş birliğiyle geliştirilmektedir.

- **Ürün:** BIMMetraj (BIM Tabanlı Metraj ve İhale Masası)
- **Depo:** [github.com/hazarvolga/affexai-bimteklif](https://github.com/hazarvolga/affexai-bimteklif)
- **Web:** [bimmetraj.com](https://bimmetraj.com)

---

<div align="center">
  <sub>© 2026 BIMMetraj & BIMPlan Academy. Tüm hakları saklıdır.</sub>
</div>
