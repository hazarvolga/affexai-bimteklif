/**
 * Academy is temporarily out of product scope (2026-10-13). Its pages, APIs and data stay
 * in the codebase; while this is false it has no menu entry, no links, and its routes
 * redirect home. Flip to true to bring it back.
 */
export const ACADEMY_ENABLED = false;

/**
 * The landing "Paketler" section and its nav links are hidden temporarily (Hazar, 2026-11-06).
 * /pricing renders the same landing page, so it shows no package cards either while this is
 * false. Flip to true to bring the section back.
 */
export const PRICING_SECTION_ENABLED = false;

/**
 * The landing "14 Gün Ücretsiz Deneyin" section, its footer link and the trial wording on the
 * landing and login buttons stay hidden until the expert tests finish (Hazar, 2026-11-06); the
 * buttons say "Kayıt Ol" instead. Flip to true to bring them back.
 */
export const TRIAL_SECTION_ENABLED = false;

/**
 * While false, /register shows a plain form (src/pages/RegisterSimple.tsx) with no package,
 * pricing or trial wording, so expert testers are not confused (Hazar, 2026-11-06). The original
 * src/pages/Register.tsx is untouched; flip to true to bring it back for real customers.
 */
export const REGISTER_PLAN_PICKER_ENABLED = false;

/**
 * Lean Academy v1 (Hazar, 2026-11-06): only /academy and /academy/:slug, five vendor-neutral topics
 * from src/academy/library/topics.ts. Exams, certificates, profiles, Allplan track and the old
 * Academy pages stay behind ACADEMY_ENABLED. Old /academy/* paths redirect to /academy.
 */
export const ACADEMY_LIBRARY_ENABLED = true;
