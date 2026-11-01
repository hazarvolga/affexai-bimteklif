import { gazetteIssueUrl, matchRegulationKeywords, parseGazetteIssue, recentIssueDates } from "./gazette";

export const REGULATION_WATCH_LOOKBACK_DAYS = 7;
const LAYOUT_UNRECOGNIZED = "GAZETTE_LAYOUT_UNRECOGNIZED";

export interface RegulationWatchItemInput {
  issueDate: string;
  title: string;
  url: string;
  matchedKeywords: string[];
}

export interface RegulationWatchDayInput {
  issueDate: string;
  status: "checked" | "failed";
  matchedCount: number;
  errorCode: string | null;
}

export interface RegulationWatchStore {
  checkedDays(issueDates: string[]): Promise<string[]>;
  saveItems(items: RegulationWatchItemInput[]): Promise<void>;
  saveDay(day: RegulationWatchDayInput): Promise<void>;
}

function failureCode(error: unknown): string {
  return error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : "GAZETTE_FETCH_FAILED";
}

/** Records candidates for a person to read. It never changes a rate or any calculation input. */
export async function runRegulationWatch(input: {
  store: RegulationWatchStore;
  fetchHtml: (url: string) => Promise<string>;
  now: Date;
  lookbackDays?: number;
}) {
  const issueDates = recentIssueDates(input.now, input.lookbackDays ?? REGULATION_WATCH_LOOKBACK_DAYS);
  const alreadyChecked = new Set(await input.store.checkedDays(issueDates));
  let checked = 0;
  let failed = 0;
  let matched = 0;
  for (const issueDate of issueDates) {
    if (alreadyChecked.has(issueDate)) continue;
    try {
      const entries = parseGazetteIssue(await input.fetchHtml(gazetteIssueUrl(issueDate)), issueDate);
      if (!entries.length) throw new Error(LAYOUT_UNRECOGNIZED);
      const items = entries.flatMap(entry => {
        const matchedKeywords = matchRegulationKeywords(entry.title);
        return matchedKeywords.length ? [{ issueDate, title: entry.title, url: entry.url, matchedKeywords }] : [];
      });
      if (items.length) await input.store.saveItems(items);
      await input.store.saveDay({ issueDate, status: "checked", matchedCount: items.length, errorCode: null });
      checked += 1;
      matched += items.length;
    } catch (error) {
      await input.store.saveDay({ issueDate, status: "failed", matchedCount: 0, errorCode: failureCode(error) });
      failed += 1;
    }
  }
  return { checked, failed, matched };
}
