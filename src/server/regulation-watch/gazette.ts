const GAZETTE_ORIGIN = "https://www.resmigazete.gov.tr";
const ISTANBUL_TIMEZONE = "Europe/Istanbul";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Titles that can change a rate or rule the product calculates with. A match only asks a person to look. */
export const REGULATION_KEYWORDS = [
  "katma değer vergisi", "tevkifat", "damga vergisi", "gelir vergisi", "kurumlar vergisi", "stopaj",
  "kamu ihale", "fiyat farkı", "yapım işleri", "asgari işçilik", "sosyal sigorta işlemleri",
  "yaklaşık birim maliyet", "birim fiyat", "planlı alanlar", "yapı müteahhit", "yapı denetimi",
  "mimarlık ve mühendislik", "binalarda ısı", "binalarda enerji",
] as const;

export interface GazetteEntry { title: string; url: string }

function toTitle(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/^[\s–—-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function officialEntryUrl(href: string, issueDate: string): string | null {
  const [year, month] = issueDate.split("-");
  const stamp = issueDate.replaceAll("-", "");
  const fileName = href.replace(`${GAZETTE_ORIGIN}/eskiler/${year}/${month}/`, "");
  if (!new RegExp(`^${stamp}(M\\d+)?-\\d+\\.(htm|pdf)$`, "i").test(fileName)) return null;
  return `${GAZETTE_ORIGIN}/eskiler/${year}/${month}/${fileName}`;
}

export function parseGazetteIssue(html: string, issueDate: string): GazetteEntry[] {
  const entries: GazetteEntry[] = [];
  for (const [, href, markup] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = officialEntryUrl(href.trim(), issueDate);
    const title = toTitle(markup);
    if (url && title) entries.push({ title, url });
  }
  return entries;
}

export function matchRegulationKeywords(title: string): string[] {
  const normalized = title.toLocaleLowerCase("tr-TR");
  return REGULATION_KEYWORDS.filter(keyword => normalized.includes(keyword));
}

export function gazetteIssueUrl(issueDate: string): string {
  const [year, month] = issueDate.split("-");
  return `${GAZETTE_ORIGIN}/eskiler/${year}/${month}/${issueDate.replaceAll("-", "")}.htm`;
}

/** Newest first. Looking back lets a day missed by an outage or a late issue be caught on the next run. */
export function recentIssueDates(now: Date, days: number): string[] {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: ISTANBUL_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
  return Array.from({ length: days }, (_, index) => format.format(new Date(now.getTime() - index * DAY_MS)));
}
