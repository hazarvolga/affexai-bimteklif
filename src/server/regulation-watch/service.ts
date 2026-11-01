import { gazetteBodyText, gazetteIssueUrl, matchRegulationKeywords, parseGazetteIssue, recentIssueDates } from "./gazette";
import { GIB_ANNOUNCEMENTS_URL, parseGibAnnouncements } from "./gib";
import type { PdfText } from "./pdf-text";

export const REGULATION_WATCH_LOOKBACK_DAYS = 7;
const LAYOUT_UNRECOGNIZED = "GAZETTE_LAYOUT_UNRECOGNIZED";
const BODY_FETCH_PAUSE_MS = 1000;

export type RegulationWatchSource = "resmi_gazete" | "gib";

export interface RegulationWatchItemInput {
  source: RegulationWatchSource;
  matchScope: "title" | "body";
  issueDate: string;
  title: string;
  url: string;
  matchedKeywords: string[];
  region?: string | null;
}

export interface RegulationWatchDayInput {
  source: RegulationWatchSource;
  issueDate: string;
  status: "checked" | "failed";
  matchedCount: number;
  unreadCount: number;
  errorCode: string | null;
}

export interface RegulationWatchStore {
  checkedDays(issueDates: string[]): Promise<string[]>;
  saveItems(items: RegulationWatchItemInput[]): Promise<void>;
  saveDay(day: RegulationWatchDayInput): Promise<void>;
}

interface WatchInput {
  store: RegulationWatchStore;
  fetchHtml: (url: string) => Promise<string>;
  postJson: (url: string, body: unknown) => Promise<string>;
  readPdfText: (url: string) => Promise<PdfText>;
  now: Date;
  lookbackDays?: number;
  pause?: () => Promise<void>;
}

function failureCode(error: unknown): string {
  return error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : "REGULATION_FETCH_FAILED";
}

const defaultPause = () => new Promise<void>(resolve => { setTimeout(resolve, BODY_FETCH_PAUSE_MS); });

async function scanGazetteDay(input: WatchInput, issueDate: string) {
  const entries = parseGazetteIssue(await input.fetchHtml(gazetteIssueUrl(issueDate)), issueDate);
  if (!entries.length) throw new Error(LAYOUT_UNRECOGNIZED);
  const items: RegulationWatchItemInput[] = [];
  let unreadCount = 0;
  for (const entry of entries) {
    const base = { source: "resmi_gazete" as const, issueDate, title: entry.title, url: entry.url };
    const titleMatches = matchRegulationKeywords(entry.title);
    if (titleMatches.length) {
      items.push({ ...base, matchScope: "title", matchedKeywords: titleMatches });
    } else if (entry.url.toLowerCase().endsWith(".pdf")) {
      await (input.pause ?? defaultPause)();
      // One unreadable PDF must not hide the rest of the day; it is counted and shown instead.
      const pdf = await input.readPdfText(entry.url).catch(() => null);
      const bodyMatches = matchRegulationKeywords(pdf?.text ?? "");
      if (bodyMatches.length) items.push({ ...base, matchScope: "body", matchedKeywords: bodyMatches });
      if (!pdf || pdf.truncated || !pdf.text.trim()) unreadCount += 1;
    } else {
      await (input.pause ?? defaultPause)();
      const bodyMatches = matchRegulationKeywords(gazetteBodyText(await input.fetchHtml(entry.url)));
      if (bodyMatches.length) items.push({ ...base, matchScope: "body", matchedKeywords: bodyMatches });
    }
  }
  return { items, unreadCount };
}

async function scanGib(input: WatchInput, today: string) {
  try {
    const items = parseGibAnnouncements(await input.postJson(GIB_ANNOUNCEMENTS_URL, {}));
    if (items.length) await input.store.saveItems(items);
    await input.store.saveDay({ source: "gib", issueDate: today, status: "checked", matchedCount: items.length, unreadCount: 0, errorCode: null });
    return { failed: 0, matched: items.length };
  } catch (error) {
    await input.store.saveDay({ source: "gib", issueDate: today, status: "failed", matchedCount: 0, unreadCount: 0, errorCode: failureCode(error) });
    return { failed: 1, matched: 0 };
  }
}

/** Records candidates for a person to read. It never changes a rate or any calculation input. */
export async function runRegulationWatch(input: WatchInput) {
  const issueDates = recentIssueDates(input.now, input.lookbackDays ?? REGULATION_WATCH_LOOKBACK_DAYS);
  const alreadyChecked = new Set(await input.store.checkedDays(issueDates));
  let checked = 0;
  let failed = 0;
  let matched = 0;
  for (const issueDate of issueDates) {
    if (alreadyChecked.has(issueDate)) continue;
    try {
      const { items, unreadCount } = await scanGazetteDay(input, issueDate);
      if (items.length) await input.store.saveItems(items);
      await input.store.saveDay({ source: "resmi_gazete", issueDate, status: "checked", matchedCount: items.length, unreadCount, errorCode: null });
      checked += 1;
      matched += items.length;
    } catch (error) {
      await input.store.saveDay({ source: "resmi_gazete", issueDate, status: "failed", matchedCount: 0, unreadCount: 0, errorCode: failureCode(error) });
      failed += 1;
    }
  }
  const gib = await scanGib(input, issueDates[0]);
  return { checked, failed: failed + gib.failed, matched: matched + gib.matched };
}
