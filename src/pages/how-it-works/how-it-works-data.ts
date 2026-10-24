/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import { PROGRESS_PAYMENTS_ENABLED } from "@/config/client-features";
import { CALC_MODULES } from "../admin/roadmap/calculation-content";
import type { CalcModule } from "../admin/roadmap/doc-types";

/**
 * Kullanıcıya gösterilmeyen modüller: Akademi şu an kapsam dışı, pilot metrikleri ve paket
 * kotaları iç işletim kuralıdır; hesap yöntemi değildir.
 */
export const HIDDEN_MODULE_IDS = ["bindirme", "pilot-metrik", "kota"] as const;

const HIDDEN = new Set<string>(HIDDEN_MODULE_IDS);

const CODE_PATH = String.raw`(?:src|workers|scripts)/[^\s,;)]+`;
const PARENTHESISED_CODE_PATH = new RegExp(String.raw`\s*\(${CODE_PATH}\)`, "g");
const TRAILING_CODE_PATH = new RegExp(String.raw`\s*—\s*${CODE_PATH}(?:\s+[A-Za-z]+)?$`);

/** Yönetim sayfası için yazılmış metinlerdeki kod yollarını uzman görünümünden çıkarır. */
export function withoutCodePaths(text: string): string {
  return text.replace(PARENTHESISED_CODE_PATH, "").replace(TRAILING_CODE_PATH, "");
}

function forReaders(module: CalcModule): CalcModule {
  const clean = (items: string[]) => items.map(withoutCodePaths);
  return {
    ...module,
    purpose: withoutCodePaths(module.purpose),
    formulas: clean(module.formulas),
    rules: module.rules && { columns: module.rules.columns, rows: module.rules.rows.map(clean) },
    example: {
      inputs: module.example.inputs.map(([name, value]) => [withoutCodePaths(name), withoutCodePaths(value)] as [string, string]),
      steps: clean(module.example.steps),
      result: withoutCodePaths(module.example.result),
    },
    references: clean(module.references),
    assumptions: clean(module.assumptions),
    questions: clean(module.questions),
  };
}

export const EXPERT_MODULES: CalcModule[] = CALC_MODULES.filter((module) => !HIDDEN.has(module.id)).map(forReaders);

const SMARTCHECK = "/app/smartcheck";

/** Her modülü kullanıcının gerçekten çalıştırabileceği ekrana bağlar; demo sayfalarına bağlamaz. */
const TRY_ROUTES: Record<string, string> = {
  "teklif-satir": "/app/quotes/new",
  "kdv-tevkifat": "/app/quotes/new",
  "maliyet-marj": "/app/profitability",
  eskalasyon: "/app/profitability",
  "risk-fiyat-araligi": "/app/profitability",
  "ifc-metraj": SMARTCHECK,
  kalip: SMARTCHECK,
  "donati-kutle": SMARTCHECK,
  "ifc-teklif-aktarim": SMARTCHECK,
  "satir-dogrulama": SMARTCHECK,
  "fiyat-eslestirme": "/app/market-intelligence",
  "aykiri-fiyat": "/app/market-intelligence",
  "uc-x-uc": SMARTCHECK,
  "yapisal-sihirbaz": SMARTCHECK,
  minha: SMARTCHECK,
  "taseron-hakedis-kalkani": SMARTCHECK,
  "kaynak-yazilim-guvenilirligi": SMARTCHECK,
  "on-teklif-fizibilite": "/app",
  iso19650: SMARTCHECK,
  "kik-adt": "/hesaplayicilar/kik-asiri-dusuk-teklif",
  "epys-on-kontrol": SMARTCHECK,
  "epys-hizli": SMARTCHECK,
  pdfa: SMARTCHECK,
};

export function tryRouteFor(moduleId: string): string | null {
  if (moduleId === "hakedis-donem") return PROGRESS_PAYMENTS_ENABLED ? "/app/progress-payments" : null;
  return TRY_ROUTES[moduleId] ?? null;
}

export const FEEDBACK_EMAIL = "info@bimmetraj.com";

export function feedbackHref(module: Pick<CalcModule, "id" | "title">): string {
  const subject = `[Nasıl Çalışır] ${module.id} · ${module.title}`;
  const body = "Ekran / adım:\nNe bekliyordum:\nNe gördüm:\nKaynak veya madde (varsa):\n";
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
