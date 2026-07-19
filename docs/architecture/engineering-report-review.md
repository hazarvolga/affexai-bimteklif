# Engineering Report Review and Safety Boundary

Source reviewed: `teklif_ve_metraj_muhendislik_raporu.md` from the workspace root.

## What the report contributes

The report provides a useful domain map for:

- Architect and structural-engineer perspectives.
- Turkish cost and unit-price source categories.
- Quantity bases: m³ for concrete, kg/ton for reinforcement, m² for formwork and finishes.
- Minha/deduction concepts for openings.
- BIM classification and IFC targets.
- High-value SmartCheck candidates: unit/poz mismatch, duplicate quantities, waste/tolerance review, and model-priority conflicts.

## Safety classification

This document is a domain reference and candidate-rule source. It is not, by itself, a legally authoritative calculation engine specification.

Every rule that can influence a quotation or engineering decision must carry:

- Jurisdiction and project type.
- Source authority and exact URL/document identifier.
- Standard or tariff version.
- Effective date and expiry/review date.
- Unit basis and rounding policy.
- Applicability conditions and exclusions.
- Human reviewer and approval timestamp.
- Whether it is authoritative, company policy, or demo data.

## Phase 1 rule boundary

The first production-safe SmartCheck rules should be limited to explainable quotation and quantity checks:

1. Poz and unit mismatch.
2. Missing required quantity or unit.
3. Duplicate or overlapping quotation items where the source data proves the overlap.
4. Missing source/evidence metadata.
5. Company-approved waste or margin policy checks, clearly labeled as company policy.

The system must not automatically claim that a reinforcement lap length, cover, structural ratio, fire rating, or BIM model result is standards-compliant without a versioned source, complete applicability context, and qualified human approval.

## Source data policy

Official sources such as YFK unit-price publications and TÜİK cost indices should be ingested as versioned data sources, not copied into free-form prompts. The active source version must be visible in the rule/evidence UI.

## Product wording policy

Use:

> Demo engineering scenario; not an authoritative design or construction result.

Avoid:

- Standards-compliant result
- Required lap length
- Safe reinforcement calculation
- Legally valid unit price
- Automatically correct engineering decision
