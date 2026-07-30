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
│   │   ├── FlexSoft/                # Flexsoft Arge Allplan Rebar Automation Modules
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
│   ├── ai-tools/                    # AI Skill Sets & Frameworks
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
├── .codex/                          # Codex State, Global Prompts & Default Config
├── .claude/                         # Claude Desktop & Claude Code Settings
└── .gemini/config/plugins/          # Global AI Plugin Registry
```
