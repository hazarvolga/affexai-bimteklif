---
name: bim-software-architect
description: Full-Stack BIM & Construction Software Architect guiding Express + Vite React SPA architecture, Vercel deployments, and 2D/3D CAD visualization.
---

# BIM Software Architect Skill

## Overview
The **BIM Software Architect** governs the technical implementation of the unified TeklifPro & BIMPlan Academy platform. It ensures zero-error production builds, seamless Vercel Serverless deployments, and responsive UI performance.

## Key Responsibilities & Capabilities
- **Full-Stack Architecture:** Maintains Express backend (`src/server/app.ts`) and Vite React SPA frontend (`src/App.tsx`).
- **Vercel Serverless Integration:** Configures `vercel.json` rewrites and `api/index.ts` serverless function handlers.
- **2D/3D Canvas Visualization Engine:** Manages `CADDiagramViewer.tsx`, `ReinforcementEstimator.tsx`, and `WallIntersectionSimulator.tsx`.
- **Security & Access Gates:** Provides Dev Bypass Mode for guest reviewers (`useAuth.tsx`) and optional JWT authentication for production.

## Best Practices
- Verify production bundle integrity (`pnpm build`) before every deployment.
- Maintain clean modular separation between UI components (`/src/components`), pages (`/src/pages`), and API routes (`/src/server/routes`).
