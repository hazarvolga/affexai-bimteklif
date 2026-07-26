# System Environment & Workspace Architecture Guide

This document defines the complete computer configuration, folder hierarchy, installed toolchains, and AI skill ecosystem on this workstation (`Hazars-MacBook-Pro`).

---

## 📁 Workstation Directory Hierarchy (`/Users/hazarvolgaekiz/`)

```text
/Users/hazarvolgaekiz/
├── dev/                             # Main Software Development Directory
│   ├── products/                    # Production-Ready Products & Web Apps
│   │   └── bimplanacademy/
│   │       └── TeklifPro-repo/      # [ACTIVE] Unified 5D BIM & Academy Platform (Vite + Express + Vercel)
│   │   └── AffeXAI-Cortex-main/
│   ├── studio/                      # Enterprise Client & Support Applications
│   │   ├── aluplan-support-desk-v02 # [ACTIVE] NestJS 11 + Next.js 15 + RAG + Dynamics 365 Support Desk
│   │   ├── aluplan-2026/
│   │   └── bruekenbauer/
│   ├── old-projects-staging/        # Transferred Archives (45 projects from old computer)
│   ├── lab/                         # AI Core Frameworks & Experimental R&D
│   │   ├── AffeXAI-Brain-Framework/
│   │   └── Signal/
│   └── ai-tools/rules/RULES.md      # Development Behavioral Rules
│
├── Desktop/                         # Active Working Desktop
│   ├── Eski_Bilgisayardan_Aktarilan_Tum_Projeler -> ~/dev/old-projects-staging
│   └── Eski_Bilgisayar_Kaynaklar_Klasoru -> ~/dev/products/bimplanacademy/TeklifPro-repo/docs/kaynaklar
│
├── .codex/                          # Codex State, Global Prompts & Configurations
├── .gemini/config/plugins/          # Global AI Plugin & Skill Registry (Antigravity & Gemini)
└── .ssh/                            # SSH Keys for GitHub (git@github.com:hazarvolga/...)
```

---

## 🛠️ Installed Toolchain & Runtimes

1. **Runtimes & Package Managers:**
   - Node.js & `pnpm` (Primary package manager across monorepos)
   - `uv` (Fast Python package manager)
   - Git with SSH authentication (`git@github.com:hazarvolga/...`)

2. **Deployment & Serverless Infrastructure:**
   - **Vercel Deployment:** Configured via `vercel.json` and Express serverless wrapper (`api/index.ts`).
   - GitHub Repository: `https://github.com/hazarvolga/bimplanacademy.git` (main branch).

3. **AI Agent Systems & Skill Ecosystem:**
   - **Antigravity (AGY 2.0):** Native agentic SDK & CLI.
   - **OpenAI Codex:** `.codex` state & rules.
   - **Skill Sets Installed (`.agent/skills/` & `~/.gemini/config/plugins/`):**
     - `ai-bim-director`: Strategic ISO 19650 maturity & 3x3 error thresholding.
     - `bim-knowledge-engineer`: ÇŞB poz libraries, Eurocode 2 rebar rules & certification exams.
     - `bim-software-architect`: Full-stack React + Express + Vercel + 2D/3D CAD canvas engine.
     - `aluplan-support-intelligence`: Support desk, RAG & Dynamics 365 CRM rules.

---

## 🔓 Developer Review Access Policy

- In active development web apps (`TeklifPro-repo`), mandatory login gates feature a 1-click **"DEMO / MİSAFİR OLARAK DOĞRUDAN GİRİŞ YAP & İNCELE"** bypass button (`useAuth.tsx`, `Login.tsx`).
