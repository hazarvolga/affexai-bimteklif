# System Environment & Workspace Architecture Guide

This document defines the complete computer configuration, folder hierarchy, installed toolchains, and AI skill ecosystem on this workstation (`Hazars-MacBook-Pro`).

---

## 📁 Workstation Directory Hierarchy (`/Users/hazarvolgaekiz/`)

```text
/Users/hazarvolgaekiz/
├── dev/                             # Main Software Development Directory
│   ├── products/                    # Production-Ready Products & Web Apps
│   │   ├── bimplanacademy/
│   │   │   └── TeklifPro-repo/      # [ACTIVE] 5D BIM & Academy Platform (Vite + Express + Vercel)
│   │   ├── AffeXAI-Cortex-main/     # AffeX AI Core Engine
│   │   ├── fpv-faceless-youtube/    # AI YouTube Video Pipeline
│   │   ├── fpvlovers.com.tr/        # FPV E-Commerce & Content Site
│   │   └── hazarvolga-web/          # Personal Portfolio & Consultancy
│   │
│   ├── studio/                      # Enterprise Client & Support Applications
│   │   ├── aluplan-support-desk-v02 # [ACTIVE] NestJS 11 + Next.js 15 + RAG + Dynamics 365 Support Desk
│   │   ├── FlexSoft/                # [NEW] Flexsoft Arge Allplan Rebar Automation Modules
│   │   ├── aluplan-2026/            # Allplan 2026 Corporate Portal
│   │   ├── aluplan-sertifka-sorgulama/ # Certificate Validation Portal
│   │   ├── A-Yap-/                  # A-Yapı Construction Portal
│   │   ├── Arsa-Video/              # Real Estate Video Automation
│   │   ├── Canakkale-Ilan/          # Real Estate Listing Portal
│   │   ├── bruekenbauer/            # Brückenbauer Platform
│   │   ├── konstantin/              # Konstantin Strategy & Pitch Suite
│   │   ├── orklab-ascent-main/      # Orklab Ascent Platform
│   │   ├── suntek-systems-architecture/
│   │   └── suntek-v03/
│   │
│   ├── ai-tools/                    # AI Engines, Runtimes, Agents & Skill Suites
│   │   ├── local-ai-suite/          # [NEW] Apple Silicon M5 Max Local LLM Engine (MLX 32B Models, OpenAI API:8080)
│   │   ├── everything-claude-code/  # Anthropic Hackathon Winner 9 Agents, 8 Rules & 15 Commands Framework
│   │   ├── marketingskills/         # Corey Haines 48 High-Value AI Marketing & Branding Skills
│   │   └── rules/                   # Universal Behavioral Rules (RULES.md)
│   │
│   ├── lab/                         # AI Core Frameworks & Experimental R&D
│   │   ├── AffeXAI-Brain-Framework/ # AffeXAI Brain Framework v0.6.0
│   │   ├── Signal/                  # Signal AI Communication Engine
│   │   └── fpv-lovers-sim/          # Unity FPV Simulator
│   │
│   ├── old-projects-staging/        # Transferred Archives (45 projects from old computer)
│   │
│   └── dashboard/
│       └── index.html               # Workspace Command Center (file:///Users/hazarvolgaekiz/dev/dashboard/index.html)
│
├── Desktop/                         # Active Working Desktop
│   ├── Eski_Bilgisayardan_Aktarilan_Tum_Projeler -> ~/dev/old-projects-staging
│   └── Eski_Bilgisayar_Kaynaklar_Klasoru -> ~/dev/products/bimplanacademy/TeklifPro-repo/docs/kaynaklar
│
├── .codex/                          # Codex State, Global Prompts & Local AI Endpoints
├── .claude/                         # Claude Desktop & Claude Code Settings
└── .gemini/config/plugins/          # Global AI Plugin Registry
```

---

## 🛠️ Installed Local AI Engines & Control Aliases

- **Start Local M5 Max AI Server:** `local-ai-start` (`http://127.0.0.1:8080/v1`)
- **Stop Server & Free Memory:** `local-ai-stop`
- **Check Server & RAM Status:** `local-ai-status`
- **Installed Models:** `mlx-community/Qwen2.5-Coder-32B-Instruct-4bit` (Reasoning & Editing) & `mlx-community/Qwen2.5-Coder-1.5B-Instruct-4bit` (Draft / Autocomplete).
- **OpenAI CODEX Endpoint:** `http://127.0.0.1:8080/v1`
- **VS Code Continue Config:** `~/.continue/config.json`
