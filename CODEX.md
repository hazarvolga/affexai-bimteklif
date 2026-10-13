# TeklifPro & BIMPlan Academy - Codex & AI Agent Integration Guide

Welcome Codex! You are working on the unified **TeklifPro & BIMPlan Academy** platform — an integrated enterprise 5D BIM quantity surveying, cost estimation, structural TS 500 / TBDY 2018 compliance (Eurocode 2 only when `activeStandard = EUROCODE_2`), and interactive OpenBIM education system.

---

## 🏛️ Project Architecture & Tech Stack

1. **Frontend:** React + TypeScript + Vite (`/src`), TailwindCSS.
2. **Backend:** Express API (`/src/server/app.ts` & `/src/server/routes`).
3. **Deployment:** Coolify + Docker Compose (`compose.coolify.yaml`): `app`, `worker`, `ifc-worker`, `migrate`, `backup`. Migrations run only in the `migrate` job; secrets are runtime-only. Vercel (`/api/index.ts`, `/vercel.json`) is legacy.
4. **Active Skill Sets (`.agent/skills/`):**
   - `ai-bim-director`: Product/BIM governance, 3x3 company policy, pilot acceptance gates.
   - `bim-knowledge-engineer`: ÇŞB poz libraries, TS 500 rebar rules (EC2 only by `activeStandard`) & certification exams.
   - `bim-software-architect`: Full-stack React + Express + Coolify/Docker + 2D/3D CAD canvas engine.
   - `yuksek-muhendis-mimar`: Numeric engineering, metraj and cost verification.
   - `aluplan-support-intelligence`: Support desk & RAG intelligence rules.

---

## 🔓 Developer Review Access Mode (Dev-only Guest Mode)

In development builds (`import.meta.env.DEV`), login gates present a 1-click **"DEMO / MİSAFİR OLARAK DOĞRUDAN GİRİŞ YAP & İNCELE"** bypass button (`useAuth.tsx`, `Login.tsx`, `AllplanAccessGate.tsx`). Keep it working in dev; it must never be reachable in production builds.

---

## 📂 Key Directory Map

- `/src/pages`: Main application routes (Dashboard, BimDashboard, LessonViewerPage, AcademyExamPage, CertificatesViewer).
- `/src/components`: Reusable UI components, 2D/3D CAD Canvas (`CADDiagramViewer.tsx`), Checkpoints (`InlineCheckpoint.tsx`), AI Companion (`AIBIMCompanion.tsx`).
- `/src/server`: Backend Express server routes (auth, tender, poz, exam, certificates).
- `/api`: Legacy Vercel serverless entry point (`index.ts`); production uses `server.ts` via Coolify.
- `/docs/kaynaklar`: Engineering research papers & PRD specifications.
- `/.agent/skills`: Specialist AI skill definitions.

---

## ⚙️ Execution Commands

- **Local Dev:** `pnpm dev` (Vite SPA + Express backend)
- **Build Verification:** `pnpm build`
- **Git Repository:** `https://github.com/hazarvolga/bimplanacademy.git` (main branch)

---

## 💡 Instructions for Codex Session Initiation

When starting a session in Codex, execute the following prompt:
`"Read CODEX.md, AGENTS.md, and .agent/skills/ to initialize your working memory for TeklifPro & BIMPlan Academy. Confirm active skills and architecture."`
