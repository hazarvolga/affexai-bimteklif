# TeklifPro — Claude Tam Proje Analizi

Tarih: 2026-05-15  
Analist: Claude Sonnet 4.6  
Kaynak: TeklifPro-repo + .proje_/ klasörü

---

## 1. Proje Kimliği

**TeklifPro**, Türkiye'deki müteahhitlik, taşeron ve inşaat firmalarına yönelik AI destekli teklif yönetimi ve kârlılık platformudur. Hedef: Excel + Word + WhatsApp tabanlı teklif süreçlerinin yerini alan, karar veren bir SaaS sistemi.

**Mevcut faz:** Alpha → Erken Pilot  
**Aktif süreç:** Pilot smoke test aşaması (`scripts/pilot-smoke.ts`)

---

## 2. Orijinal Vizyon (.proje_ Belgeleri)

### 2.1 Ürün Konumu

> "Rakipler teklif programı satar. Sen karar veren teklif sistemi satarsın."

### 2.2 Dört Çekirdek Modül (concept.md)

| Modül | Tanım |
|-------|-------|
| A — Akıllı Teklif | AI üretimi, revizyon zinciri, PDF çıktı |
| B — Mevzuat Zekâ | Resmî Gazete, GİB, SGK, KİK, TCMB takibi |
| C — Kârlılık Motoru | Maliyet, marj, risk puanı, uyarılar |
| D — Ticari CRM | Pipeline, analitik, satışçı performansı |

### 2.3 Hedef Kullanıcı

- Birincil: 20–200 çalışanlı özel sektör müteahhidi
- İkincil: Taşeron, tadilat, elektrik/mekanik taahhüt firmaları

### 2.4 Fiyatlandırma

| Plan | Fiyat | Kapsam |
|------|-------|--------|
| Starter | ₺1.990/ay | 1 kullanıcı, 20 teklif |
| Pro | ₺4.990/ay | 5 kullanıcı, AI + PDF + CRM |
| Elite | ₺9.990/ay | Sınırsız kullanıcı + mevzuat + risk |
| Enterprise | Özel | — |

### 2.5 Multi-Niche Mimarisi (multi_nis.MD)

```
Core Engine (değişmez)
    ↓
Industry Plugin Layer (sektöre göre swap)
    ├── /residential
    ├── /electrical
    ├── /mechanical
    └── ...future
    ↓
Intelligence Layer (AI routing, mevzuat, margin)
```

`IndustryPlugin` interface tanımı:

```typescript
interface IndustryPlugin {
  id: string;
  name: string;
  defaultCurrency: "TRY" | "USD" | "EUR";
  taxRules: {
    vatRate: number;
    withholdingEnabled: boolean;
  };
  quotationModel: {
    defaultLineItems: string[];
    calculationType: "labor_heavy" | "material_heavy" | "balanced";
  };
  aiProfile: {
    systemPrompt: string;
    extractionRules: string;
  };
  pdfTemplate: {
    templateId: string;
  };
}
```

---

## 3. Stratejik Kararlar (summary.md)

Stratejik pivot kayıtlıdır:

> Mevcut Vite + Express + Drizzle + PostgreSQL repo **pilot geliştirme zemini** olarak seçildi. Next.js + Prisma + Auth.js geçişi pilot ürün gerçek kullanıcı seviyesine geldikten sonra parity/cutover planı ile yeniden değerlendirilecek.

---

## 4. Mevcut Teknik Stack

| Katman | Teknoloji | Sürüm |
|--------|-----------|-------|
| Frontend | React | 19.0.1 |
| Routing | React Router | v7 |
| Build | Vite | 6.2.3 |
| Styling | Tailwind CSS | 4.1.14 |
| UI | shadcn/ui | — |
| Charts | Recharts | 3.8.1 |
| Backend | Express | 4.21.2 |
| Dil | TypeScript | 5.8.2 |
| DB | PostgreSQL | — |
| ORM | Drizzle ORM | 0.45.2 |
| AI (primary) | Gemini | @google/genai 1.29.0 |
| AI (fallback) | OpenAI | — |
| PDF | Puppeteer | 24.43.1 |
| Auth | JWT + bcryptjs | — |
| Infra | Coolify + Docker | — |

### Hedef Stack (master_promt.md → post-pilot)

| Alan | Hedef |
|------|-------|
| Framework | Next.js App Router |
| ORM | Prisma |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Deploy | Vercel + Supabase |

---

## 5. Mimari

**Hybrid Monolith** — tek repo, tek deploy:

```
server.ts                     → entrypoint
├── src/server/app.ts         → Express app assembly
├── src/server/middleware/
│   ├── auth.ts               → JWT, tenant izolasyonu, RBAC
│   └── usage.ts              → Kullanım kota kontrolü
└── src/server/routes/        → 9 route modülü
    ├── auth.ts
    ├── quotations.ts
    ├── clients.ts
    ├── company.ts
    ├── crm.ts
    ├── profit.ts
    ├── ai.ts
    ├── billing.ts
    └── regulations.ts
```

**Build akışı:**
- `dev`: tsx server.ts + Vite HMR (port 3011)
- `build`: Vite → /dist + esbuild → dist/server.cjs
- `start`: node dist/server.cjs (production)

---

## 6. Veritabanı Şeması (17 Tablo)

### Çekirdek Tablolar

| Tablo | Rol |
|-------|-----|
| `users` | Auth + profil |
| `companies` | Tenant root, çok-kiracılı yapı |
| `memberships` | User-company bağı, RBAC |
| `clients` | CRM kişi/firma kayıtları |
| `quotations` | Ana iş belgesi, revizyon zinciri |
| `quotationItems` | Teklif satır kalemleri |
| `quotationFinancials` | Kâr/marj/risk hesapları |
| `costComponents` | Maliyet detay dağılımı |
| `deals` | CRM pipeline fırsatları |
| `activities` | CRM audit trail |
| `industries` | Sektör profil kaydı |
| `companyIndustrySettings` | Şirkete özel sektör konfigürasyonu |
| `subscriptions` | Billing plan takibi |
| `usageLogs` | Feature kullanım ölçümü |
| `usageAlerts` | Kota/maliyet bildirimleri |
| `invitations` | Takım davet sistemi |
| `leads` | Legacy lead kaydı |

### Enums

```
currency:          TRY | USD | EUR
quoteStatus:       draft | sent | negotiation | won | lost | archived
pipelineStage:     lead | contacted | quotation_sent | negotiation | won | lost
userRole:          owner | admin | manager | viewer
subscriptionPlan:  starter | pro | elite | enterprise
subscriptionStatus: active | past_due | canceled
activityType:      call | email | meeting | quotation_update | stage_change | note
```

### Önemli İlişkiler

- `quotations.parentId` → revizyon zinciri (parentId + revisionVersion + isLatest)
- `memberships` → user ↔ company çok-çok ilişki, role ile
- `quotationFinancials` → quotation başına 1:1
- `companyIndustrySettings` → company + industry composite PK

---

## 7. Servis Katmanı

```
src/services/
├── auth/
│   ├── authService.ts        → kayıt, login, JWT
│   └── emailService.ts       → doğrulama e-postası
├── ai/
│   ├── aiService.ts          → orchestration
│   └── providers/
│       ├── openaiProvider.ts
│       ├── geminiProvider.ts
│       └── providerRouter.ts → primary/fallback routing
├── pdf/
│   ├── pdfService.ts         → Puppeteer PDF üretimi
│   └── quoteTemplate.html
├── crm/
│   └── crmService.ts
├── financials/
│   └── profitService.ts
└── regulations/
    └── regulatoryService.ts
```

---

## 8. Frontend Sayfa Listesi (17 Sayfa)

| Sayfa | Dosya | Satır |
|-------|-------|-------|
| Dashboard | Dashboard.tsx | — |
| Teklif Oluştur | CreateQuote.tsx | 549 |
| Teklif Detay | QuoteDetail.tsx | 566 |
| Teklifler Listesi | Quotes.tsx | — |
| Müşteriler | Clients.tsx | 360 |
| CRM | CRM.tsx | 264 |
| Fırsat Detayı | DealDetail.tsx | — |
| Kârlılık | Profitability.tsx | — |
| Faturalama | Billing.tsx | — |
| Mevzuat | Regulations.tsx | 282 |
| Ayarlar | Settings.tsx | 414 |
| AI Asistan | AIAssistant.tsx | — |
| Giriş | Login.tsx | — |
| Kayıt | Register.tsx | — |
| E-posta Doğrulama | VerifyEmail.tsx | — |
| Davet Kabul | AcceptInvite.tsx | — |
| Landing Page | LandingPage.tsx | — |

---

## 9. Güvenlik & Yetki Mimarisi

### Multi-Tenancy
- Tüm sorgulara `companyId` filtresi uygulanıyor
- Client'tan gelen değerlere güvenilmiyor
- Tenant bağlamı JWT'den alınıyor

### RBAC (4 rol)
| Rol | Yetki |
|-----|-------|
| owner | Tam erişim |
| admin | Tam erişim |
| manager | Veri mutasyonu |
| viewer | Sadece okuma (mutation'lar server'da engellendi) |

### Tamamlanan Güvenlik Sertleştirmeleri
- Viewer mutasyonları server middleware'de bloke edildi (`52882be`)
- Auth'suz AI legacy endpointleri kapatıldı
- PDF servisi companyId ile filtreleniyor
- Quote toplamları server-side hesaplanıyor, client toplamları yoksayılıyor (`bd07ec0`)

---

## 10. Tamamlanan Commitler

| Commit | Açıklama |
|--------|----------|
| `52882be` | docs: establish pilot roadmap and agent memory |
| `26e9432` | refactor: split server bootstrap and core routes |
| `15df789` | feat: harden auth tenant and usage guards |
| `bd07ec0` | feat: enforce server side quote calculations |
| `882e3be` | feat: add multi ai provider routing |
| `edfc9b2` | docs: add pilot deploy security observability readiness |
| `446a331` | refactor: extract remaining domain routes |

---

## 11. Mevcut Durum & Aktif Görev

### Son Yakalanan Bug
Quote creation `500` hatası verdi.  
Kök neden: `industryId=residential` gönderiliyor ama DB'de `industries` tablosunda `residential` kaydı yok → FK constraint hatası.  
Fix: `quotations.ts`'de industryId DB'de yoksa `null` bırakılıyor.

### Aktif Faz: Pilot Smoke Script
```bash
BASE_URL=http://localhost:3011 npm run smoke:pilot
```

Smoke script hedefleri:
1. `/api/health` kontrolü
2. Auth'suz endpoint'lerin `401` dönmesi
3. Admin login
4. Test client oluşturma
5. Test quote oluşturma
6. Quote detail okuma
7. Server-side toplam doğrulama

Smoke geçerse sıra: `lint` → `test` → `build` → `graphify update .` → commit

### DB Kısıtları (Aktif)
- `3001`'deki mevcut servise dokunma
- `DROP`, `TRUNCATE`, `DELETE` kullanma
- Sadece TeklifPro lokal DB hedeflenmeli
- Test kayıtları `SMOKE ...` prefix'li

---

## 12. Proje Boyutu

| Metrik | Değer |
|--------|-------|
| TypeScript/TSX dosyası | 82 |
| Toplam kaynak satırı | ~9.657 |
| React sayfa bileşeni | 17 |
| Server route modülü | 9 |
| Servis domain'i | 6 |
| Prod bağımlılık | 26 |
| Dev bağımlılık | 9 |
| Test sayısı | 5 (AI provider router) |
| Graphify node | 249 |
| Graphify edge | 247 |
| Graphify community | 60 |

---

## 13. Konsept → Mevcut Kod Gap Analizi

| Alan | Konseptte | Kodda | Durum | Not |
|------|-----------|-------|-------|-----|
| Multi-niche plugin | ✅ Tasarlandı | ⚠️ Kısmi | `/src/industries/` klasörü yok, sadece DB tablosu var |
| Industry plugin interface | ✅ Tanımlandı | ⚠️ Kısmi | `src/lib/plugins/` var ama tam implement yok |
| Supabase Storage | ✅ Planlandı | ❌ Yok | Logo/imza upload yok |
| Revision compare UI | ✅ Planlandı | ⚠️ Kısmi | Versiyon takibi var, diff UI yok |
| Mevzuat crawler | ✅ Planlandı | ❌ Yok | Manuel seed var, Crawl4AI yok |
| Template sistemi | ✅ Planlandı | ❌ Yok | Sektörel teklif şablonu implement edilmedi |
| Gelişmiş analitik | ✅ Planlandı | ⚠️ Temel | Dashboard var, ileri grafikler eksik |
| WhatsApp botu | ✅ 6 ay | ❌ Yok | Uzak roadmap |
| E-imza | ✅ Planlandı | ❌ Yok | PDF'te ıslak imza alanı var, e-imza yok |
| Mobil uygulama | ✅ 6 ay | ❌ Yok | Responsive web var |
| Next.js geçişi | ✅ Hedef | ❌ Beklemede | Pilot sonrası planlandı |
| Prisma geçişi | ✅ Hedef | ❌ Beklemede | Drizzle kullanılıyor |

---

## 14. Güçlü Yönler

- Tenant izolasyonu sağlam, client'a güvenilmiyor
- RBAC server-side enforce ediliyor
- AI multi-provider routing (OpenAI primary + Gemini fallback)
- Revizyon zinciri DB'de modellenmiş
- Servis katmanı domain'e göre ayrılmış (fat controller yok)
- Agent memory sistemi mevcut (`docs/agent-memory/`)
- TypeScript uçtan uca

---

## 15. Riskler & Dikkat Edilmesi Gerekenler

| Risk | Seviye | Açıklama |
|------|--------|----------|
| Test coverage çok düşük | 🔴 Yüksek | 5 test / 9.657 satır. Kritik akışlar korumasız |
| JS bundle boyutu | 🟡 Orta | Vite chunk splitting yapılmamış, LCP bütçesi tehdit altında |
| Puppeteer prod riski | 🟡 Orta | Container'da headless Chrome sorun çıkarabilir |
| Next.js migrasyonu | 🟡 Orta | Büyük diff, dikkatli cutover planı gerekir |
| Email servisi belirsiz | 🟡 Orta | SMTP konfigürasyonu env'e bağlı, transactional provider net değil |
| Industry plugin eksikliği | 🟡 Orta | DB'de hazır ama uygulama katmanı implemente edilmemiş |
| Mevzuat verisi manuel | 🟠 Düşük-Orta | Crawler yokken veriler hızla eskiyebilir |

---

## 16. Kalıcı Agent Hafızası Dosyaları

```
docs/agent-memory/
├── README.md
├── PROJECT_BRIEF.md
├── WORKING_STATE.md
├── ARCHITECTURE_DECISIONS.md
├── PILOT_PLAN.md
└── AGENT_PROTOCOL.md

graphify-out/
├── GRAPH_REPORT.md
├── graph.json
└── graph.html
```

---

## 17. Sonraki Adımlar (Öncelik Sırasıyla)

1. **Smoke script'i koştur** → `BASE_URL=http://localhost:3011 npm run smoke:pilot`
2. **Test coverage artır** → Quotation flow, auth, PDF için integration test
3. **Bundle optimize** → Vite chunk splitting, lazy import
4. **Industry plugin** → `/src/industries/` klasörünü implement et
5. **Email servisi sabitle** → Resend veya Postmark entegrasyonu
6. **Puppeteer alternatifi değerlendir** → @react-pdf/renderer veya external PDF servis
7. **Next.js migrasyon planı** → Pilot tamamlandıktan sonra parity analizi

---

*Bu dosya Claude Sonnet 4.6 tarafından 2026-05-15 tarihinde üretilmiştir.*  
*Kaynak: TeklifPro-repo tam kaynak analizi + .proje_/ dökümanları + summary.md*
