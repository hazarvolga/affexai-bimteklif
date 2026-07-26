# TeklifPro & BIMPlan Academy - Codex & AI Agent Integration Guide

Welcome Codex! You are working on the unified **TeklifPro & BIMPlan Academy** platform — an integrated enterprise 5D BIM quantity surveying, cost estimation, structural Eurocode 2 compliance, and interactive OpenBIM education system.

---

## 🏛️ Project Architecture & Tech Stack

1. **Frontend:** React + TypeScript + Vite (`/src`), TailwindCSS.
2. **Backend:** Express API (`/src/server/app.ts` & `/src/server/routes`).
3. **Deployment / Serverless:** Vercel Serverless Function mapped via `/api/index.ts` and `/vercel.json`.
4. **Active Skill Sets (`.agent/skills/`):**
   - `ai-bim-director`: Strategic ISO 19650 maturity & 3x3 error thresholding.
   - `bim-knowledge-engineer`: ÇŞB poz libraries, Eurocode 2 rebar rules & certification exams.
   - `bim-software-architect`: Full-stack React + Express + Vercel + 2D/3D CAD canvas engine.
   - `aluplan-support-intelligence`: Support desk & RAG intelligence rules.

---

## 🔓 Developer Review Access Mode (Temporary Guest Mode)

For development & reviewer access, mandatory login gates present a 1-click **"DEMO / MİSAFİR OLARAK DOĞRUDAN GİRİŞ YAP & İNCELE"** bypass button (`useAuth.tsx`, `Login.tsx`, `AllplanAccessGate.tsx`). Do not remove or block guest access during active development iterations.

---

## 📂 Key Directory Map

- `/src/pages`: Main application routes (Dashboard, BimDashboard, LessonViewerPage, AcademyExamPage, CertificatesViewer).
- `/src/components`: Reusable UI components, 2D/3D CAD Canvas (`CADDiagramViewer.tsx`), Checkpoints (`InlineCheckpoint.tsx`), AI Companion (`AIBIMCompanion.tsx`).
- `/src/server`: Backend Express server routes (auth, tender, poz, exam, certificates).
- `/api`: Vercel serverless entry point (`index.ts`).
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
