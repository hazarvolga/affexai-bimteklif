/** Structured document content for admin knowledge pages (roadmap, calculation methods). */
export type DocBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "callout"; tone: "info" | "warn" | "ok"; title?: string; text: string }
  | { type: "formula"; lines: string[] };

export interface DocSection {
  id: string;
  title: string;
  blocks: DocBlock[];
}

export interface DocSource {
  label: string;
  url?: string;
  note?: string;
}

/** How authoritative a calculation is; experts verify against this label. */
export type CalcStatus = "mevzuat" | "standart" | "sirket_politikasi" | "sezgisel" | "bilgi_amacli";

export interface CalcModule {
  id: string;
  title: string;
  area: string;
  status: CalcStatus;
  sourceFiles: string[];
  references: string[];
  purpose: string;
  formulas: string[];
  rules?: { columns: string[]; rows: string[][] };
  example: { inputs: [string, string][]; steps: string[]; result: string };
  assumptions: string[];
  questions: string[];
}

export const CALC_STATUS_LABEL: Record<CalcStatus, string> = {
  mevzuat: "Mevzuata dayalı",
  standart: "Standarda dayalı",
  sirket_politikasi: "Şirket politikası",
  sezgisel: "Sezgisel / iş kuralı",
  bilgi_amacli: "Bilgi amaçlı (eğitim)",
};
