```md
You are a world-class senior SaaS architect, staff full-stack engineer, product designer, AI systems engineer, and startup CTO.

Your mission is to build a production-grade web application from scratch based on the following concept.

# PROJECT NAME

TeklifPro AI

# PRODUCT CATEGORY

AI-powered SaaS for Turkish construction companies, contractors, builders, renovation firms, and subcontractors.

# CORE PRODUCT IDEA

A platform that combines:

1. Smart quotation management  
2. AI-generated construction proposals  
3. Profitability analysis  
4. Regulation intelligence (Turkey)  
5. CRM sales pipeline  
6. Revision management  
7. Professional PDF proposal generation

This product replaces Excel, Word, and WhatsApp-based quotation workflows.

---

# PRIMARY USERS

- Construction companies
- General contractors
- Villa builders
- Renovation firms
- Mechanical contractors
- Electrical contractors
- Subcontractors
- Technical office teams
- Sales managers

---

# TARGET MARKET

Turkey first.

Language priority:

1. Turkish  
2. English

Currency:

- TRY
- USD
- EUR

---

# REQUIRED TECH STACK

Frontend:
- Next.js latest App Router
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:
- Next.js Server Actions or API routes

Database:
- PostgreSQL

ORM:
- Prisma

Authentication:
- Supabase Auth

Storage:
- Supabase Storage

PDF:
- Puppeteer

AI Provider:
- OpenAI (provider abstraction ready)

Deployment:
- Vercel + Supabase

---

# UI / UX STYLE

- Premium SaaS
- Clean
- Fast
- Minimal
- Corporate
- Elegant dashboard
- Responsive
- Mobile friendly
- Dark/light mode ready

---

# MAIN MODULES

# 1. AUTH SYSTEM

Build:

- Register
- Login
- Forgot password
- Protected routes
- Team invites

---

# 2. COMPANY SETTINGS

Fields:

- Company name
- Logo
- Tax number
- Tax office
- Address
- Signature image
- Stamp image
- Default currency
- Default VAT rate

---

# 3. CLIENT CRM

Build full CRUD:

- Client name
- Company / person
- Phone
- Email
- Address
- Notes
- Previous quotations
- Pipeline stage

Stages:

- New Lead
- Contacted
- Proposal Sent
- Negotiation
- Won
- Lost

---

# 4. QUOTATION SYSTEM

Build full quotation engine.

Quotation Header:

- Quote number
- Client
- Project name
- Date
- Expiry date
- Currency
- Notes

Line Items:

- Description
- Unit
- Quantity
- Unit price
- Discount %
- VAT %
- Total

Totals:

- Subtotal
- Discount total
- VAT total
- Grand total

Features:

- Duplicate quote
- Save draft
- Send quote
- Convert to revision
- Archive quote

---

# 5. REVISION SYSTEM

Need:

- V1
- V2
- V3
- Full revision history
- Compare revisions
- Show changed items

---

# 6. AI QUOTE GENERATOR

If user types:

"500 m2 3 floor villa rough construction"

AI converts to structured quotation items:

- Excavation
- Foundation concrete
- Rebar
- Formwork
- Wall works
- Labor
- Transport

Need button:

Generate With AI

Also add:

- rewrite proposal professionally
- detect missing items
- suggest margin
- summarize quote

---

# 7. PROFITABILITY ENGINE

Each quotation should show:

- Estimated cost
- Sale price
- Gross profit
- Margin %
- Risk level

Warnings:

- Margin too low
- Material risk high
- Labor missing
- Currency risk

---

# 8. PDF GENERATOR

Create beautiful professional PDF with:

- Logo
- Company info
- Client info
- Project title
- Items table
- Totals
- Terms & conditions
- Signature area
- Stamp area

Need downloadable PDF.

---

# 9. REGULATION INTELLIGENCE MODULE

Create separate dashboard widget.

Track manually seeded regulation records for now.

Fields:

- Title
- Category
- Effective date
- Impact level
- Summary
- Affected modules

Examples:

- VAT change
- Tevkifat update
- Minimum wage increase
- Currency alert

Show:

- 3 active alerts
- impacted quotations count

Build architecture ready for crawler later.

---

# 10. ANALYTICS DASHBOARD

Cards:

- Total quotations
- Total sent
- Won rate
- Monthly pipeline value
- Average quote value
- Profit forecast

Charts:

- Monthly quotes
- Win rate
- Revenue pipeline

---

# 11. MULTI TENANT SAAS

Every company must have isolated data.

Use:

company_id on all tables.

Implement scalable architecture.

---

# DATABASE TABLES

Create complete schema for:

users
companies
memberships
clients
quotations
quotation_items
quotation_revisions
activities
regulation_alerts
subscriptions

Include relations and indexes.

---

# REQUIRED PAGES

Public:

- Landing page
- Features
- Pricing
- Login
- Register

App:

- Dashboard
- Clients
- Quotations
- Create Quote
- Quote Detail
- Templates
- Analytics
- Regulations
- Settings

---

# LANDING PAGE COPY

Headline:

Türkiye’de Müteahhitler İçin Yeni Nesil Teklif Hazırlama Sistemi

Subheadline:

Excel’den çıkın. Dakikalar içinde profesyonel teklif hazırlayın.

CTA:

14 Gün Ücretsiz Deneyin

---

# PRICING

Starter:
₺1.990 / month

Pro:
₺4.990 / month

Elite:
₺9.990 / month

Enterprise:
Custom

---

# CODING RULES

- Clean architecture
- Reusable components
- Strong typing
- Secure auth
- Production ready
- Modular code
- SEO optimized
- Fast loading
- Excellent UX
- Use server components where useful

---

# IMPORTANT EXECUTION RULE

Do NOT give explanation only.

Generate the REAL CODEBASE.

Start by:

1. full folder structure  
2. Prisma schema  
3. setup commands  
4. UI components  
5. dashboard pages  
6. quotation CRUD  
7. AI integration  
8. PDF generation  
9. deployment guide

---

# OUTPUT FORMAT

Return code in organized file-by-file blocks.

Start building now.
```
