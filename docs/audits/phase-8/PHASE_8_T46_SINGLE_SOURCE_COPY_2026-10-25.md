# Faz 8 / T46 — Tek Kaynaklı Ürün Doğruluğu Kanıt Dosyası

- **İş ID:** `T46` (SEO-01, SEO-02, GAP-01)
- **Tarih:** 25 Ekim 2026
- **Durum:** Kod ve otomatik kanıt kapısı tamamlandı (`[x]`) — Rev. 74 (`bc0ee54`), Rev. 75 (`b8ea6d2`) ve Rev. 77

## 1. Kabul Kriteri → Kanıt Eşlemesi

| Kabul Kriteri | Uygulama / Kaynak Dosya | Test / Doğrulama Kanıtı |
|---|---|---|
| `llms.txt`, `/pricing` ve site geneli JSON-LD (`Organization` / `SoftwareApplication`) yetenek kaydı (`CAPABILITY_REGISTRY`) ve yayındaki plan kataloğundan (`canonicalPlans`, `BILLING_PERIOD_OPTIONS`) üretilir | `src/server/security/web-hardening.ts`, `src/server/security/route-meta.ts`, `src/server/security/site-jsonld.ts` | `src/server/security/web-hardening.test.ts`, `src/server/security/route-meta.test.ts` |
| Mevzuat sayfası (`LegislationView.tsx`), sözlük (`BimGlossary.tsx`, `public-glossary.ts`), BIM olgunluk ekranı (`BimDashboard.tsx`) ve admin sayfaları (`DeveloperRoadmap.tsx`, `CalculationMethods.tsx`, `AdminDashboard.tsx`, `PricingSources.tsx`) fiilî kanıt seviyesinden üretilir/hizalanır | `src/components/bimplan/LegislationView.tsx`, `src/components/bimplan/BimGlossary.tsx`, `src/components/bimplan/BimDashboard.tsx`, `src/pages/admin/DeveloperRoadmap.tsx`, `src/pages/admin/CalculationMethods.tsx`, `src/pages/admin/AdminDashboard.tsx`, `src/pages/admin/PricingSources.tsx` | `src/pages/public-copy.test.ts`, `src/pages/admin/roadmap/content.test.ts` |
| Doğru 18.848 resmi katalog kaydı küçültülmez; yapısal satır varlığı ile ticari kullanım lisansı (BYOL/ÇŞB yetkisi), yürürlük dönemi ve bağımsız maliyet uzmanı onayı ayrı tutulur | `src/components/bimplan/LegislationView.tsx`, `src/pages/admin/PricingSources.tsx`, `src/capabilities/registry.ts` (`csb-2026-official-catalogs-full`) | `src/services/pricing/catalog-audit.test.ts`, `src/pages/public-copy.test.ts` |
| Kurgusal/sahte uzman imzası ("fake expert") ve doğrulanmamış uygunluk/doğruluk/tekillik iddiası (`%100`, `tam uyumlu`, `garanti`, `Türkiye'de tek`, `hatasız`) bulunmaz | `src/capabilities/registry.ts`, `src/pages/LandingPage.tsx`, `src/components/bimplan/LegislationView.tsx`, `src/components/bimplan/BimGlossary.tsx`, `src/pages/admin/*` | `src/capabilities/registry.test.ts`, `src/pages/public-copy.test.ts` |
| Eski dış raporlardaki "103 poz", "CDE yok", "Rev35 canlı" yanlış teşhisleri tarihî revizyon kayıtları sessizce yeniden yazılmadan güncel denetim ekiyle düzeltilir | `docs/audits/GAP_RAPORU_KOD_DOGRULAMA_2026-10-23.md` ve bu kanıt dosyası (§2) | `src/pages/admin/roadmap/content.test.ts` |

## 2. Eski Dış Rapor Teşhislerinin Güncel Kanıtla Düzeltilmesi (Tarihî Kayıtlar Korunarak)

1. **"Sistemde yalnız 103 poz var" teşhisi (SEO-02 / GAP-01):**
   - **Gerçek durum:** 103 poz yalnızca erken bir örnek/tohum alt kümesiydi. `src/data/csb-2026-official-catalogs.json` ve `getOfficialCatalogCoverageReport()` içinde 6 resmi 2026 ÇŞB PDF kitabındaki **18.848 satırın tamamı** (İnşaat BF 1.861, İnşaat Rayiç 5.360, Mekanik BF 5.678, Elektrik BF 5.910, Yapı Yaklaşık Maliyet 18, TÜİK Endeks 21) SHA-256 belge özetleriyle mevcuttur. Yapısal satır varlığı ticari kullanım lisansı veya uzman onayı anlamına gelmez; bunlar ayrı kapılardır.
2. **"CDE durum makinesi / iş akışı yok" teşhisi (SEO-01 / KOD-05):**
   - **Gerçek durum:** `src/smartcheck/rules/iso19650.ts` (`validateCdeStateTransition`) ve Faz 4 (`src/services/cde/service.ts`, `src/server/routes/cde.ts`, `0014_cde_tenant_rls.sql`) ile WIP → SHARED → PUBLISHED → ARCHIVED geçiş doğrulayıcısı, tenant/proje/revizyon kapsamlı PostgreSQL kalıcılığı, maker-checker ve append-only karar izi **Pilot / L2** düzeyinde çalışmaktadır.
3. **"Canlı ortam Rev. 35'te kaldı" teşhisi (GAP-08):**
   - **Gerçek durum:** Tarihî Rev. 35 kaydı (18 Ekim 2026) olduğu gibi korunmuştur; güncel canlı sürüm 25 Ekim 2026 itibarıyla `f474e99` (Rev. 72, ayrık DB rolleriyle) ve `main` dalı Rev. 77'dir.

## 3. Çalıştırılan Doğrulama Komutları

```bash
pnpm exec tsx --test src/pages/public-copy.test.ts src/pages/admin/roadmap/content.test.ts src/capabilities/registry.test.ts src/server/security/route-meta.test.ts src/server/security/web-hardening.test.ts
```

## 4. Kalan Sınır

- `T46` kapsamındaki tüm kamu, sözlük, mevzuat ve admin metin hizalamaları ile tek kaynaklı üretim kapıları tamamlanmıştır.
- Yeteneklerin `pilot / L2` durumundan `live / L3` durumuna yükseltilmesi **Faz 9 (`T50–T51`)** kapsamındaki gerçek isimli bağımsız uzman imzalarına ve saha kabulüne bağlıdır; o zamana kadar hiçbir yüzeyde L3/canlı uzman onayı beyan edilmez.
