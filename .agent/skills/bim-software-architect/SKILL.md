---
name: bim-software-architect
description: BIMMetraj/TeklifPro yazılım mimarı. Express + Vite React SPA + Drizzle/PostgreSQL + Graphile Worker + Python IfcOpenShell işçisi mimarisi, Coolify/Docker Compose dağıtımı, migration zinciri, tenant güvenliği, kota/plan altyapısı, PDF motoru ve test kapıları için kullan. Kod yazarken, refactor ederken, deploy veya migration planlarken devreye gir.
---

# BIM Software Architect

## Gerçek topoloji (2026-10-13)
- Üretim: `https://bimmetraj.com`, Coolify (uygulama UUID `ibjv2zbpecdcbd71lxo1vqd7`), Cloudflare Full (strict). Compose: `compose.coolify.yaml` → `app`, `worker`, `ifc-worker`, `migrate`, `backup`. **Vercel kullanılmıyor**; `vercel.json` / `api/index.ts` eski kalıntıdır, yeni iş için hedef değildir.
- Remote: `affexai` = `hazarvolga/affexai-bimteklif`, dal `main`. Eski `origin`'e push etme.
- Migration: yalnız `drizzle-release/` (0000–0006) sürümlü zinciri; ad-hoc SQL yok.
- Secret'lar yalnız Coolify runtime değişkeni; build arg veya Git'te secret yok.
- E-posta: Stalwart (`mail.affexai.tr`, 465 implicit TLS), fail-closed, 15 sn toplam süre sınırı.

## Değişmez kurallar
- Demo/guest girişi yalnız `import.meta.env.DEV` altında; üretim build'ine asla sızmasın.
- Her tenant sorgusu `companyId` ile; middleware rolü her istekte `memberships`'ten okur.
- Teklif + kalemler + revizyon tek transaction (`src/services/quotations/integrity.ts`, `edit.ts`).
- Kota: teklif ve IFC sayaçları DB kilitli ve fail-closed (`src/services/billing/quota.ts`). Bilinen boşluk: AI/PDF/CRM/mevzuat/kârlılık limitleri DB planından değil eski `PLAN_LIMITS` enum'undan (`starter`) geliyor; plan kataloğuna taşınmalı.
- Para hesabı: `src/lib/calculations.ts`. Bilinen boşluk: `toFixed` yuvarlaması (1.005 → 1.00) ve satır toplamı ile genel toplamın ayrı yuvarlanması; satır bazında yarım-yukarı yuvarlama + toplamın satırlardan türetilmesi gerekli.
- PDF: `escapeHtml`, istek yakalama, sandbox açık; `--no-sandbox` ekleme.
- Mühendislik/maliyet mantığı içeren kodda test değerlerini `yuksek-muhendis-mimar` skill'inin `eng_calc.py` aracıyla üret.

## Doğrulama
`pnpm lint && pnpm test && pnpm run build` (veya `pnpm run verify`); Python işçisi `pytest workers/ifc`; değişiklikten sonra `graphify update .`; `docs/agent-memory/WORKING_STATE.md` en üst bölümünü güncelle. Health'teki `revision` güvenilmez — sürümü Coolify geçmişinden doğrula.
