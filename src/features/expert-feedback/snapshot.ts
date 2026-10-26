import { MAX_SNAPSHOT_ENTRIES, MAX_SNAPSHOT_VALUE_LENGTH, type ExpertFeedbackSnapshot } from './contract';

const MAX_KEY_LENGTH = 80;
const MAX_DEPTH = 4;
/** Stops walking pathological objects; anything past the API limit is only counted. */
const MAX_COLLECTED = 1000;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]+/gu;
export const SNAPSHOT_TRUNCATED_KEY = '_gönderilmeyen_alan_sayısı';

type Entry = [string, ExpertFeedbackSnapshot[string]];

function cleanText(value: string, maximum: number): string {
  // Multi-line fields (bid lists, item tables) become one line so the server accepts them.
  return value.replace(/\r?\n+/g, ' | ').replace(CONTROL_CHARACTERS, ' ').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function scalar(value: unknown): string | number | boolean | null | undefined {
  if (value === null) return null;
  if (typeof value === 'string') return cleanText(value, MAX_SNAPSHOT_VALUE_LENGTH);
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return undefined;
}

function collect(prefix: string, value: unknown, depth: number, entries: Entry[]): void {
  if (entries.length >= MAX_COLLECTED) return;
  const flat = scalar(value);
  if (flat !== undefined) {
    const key = cleanText(prefix, MAX_KEY_LENGTH);
    if (key) entries.push([key, flat]);
    return;
  }
  if (depth >= MAX_DEPTH || typeof value !== 'object' || value === undefined) return;
  const children = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value);
  for (const [key, child] of children) collect(prefix ? `${prefix}.${key}` : key, child, depth + 1, entries);
}

/** Keys cut to the length limit can collide; later ones get a numbered suffix instead of overwriting. */
function uniqueKeys(entries: readonly Entry[]): Entry[] {
  const seen = new Set<string>();
  return entries.map(([key, value]) => {
    let candidate = key;
    for (let suffix = 2; seen.has(candidate); suffix += 1) {
      const tail = `~${suffix}`;
      candidate = `${key.slice(0, MAX_KEY_LENGTH - tail.length)}${tail}`;
    }
    seen.add(candidate);
    return [candidate, value];
  });
}

/**
 * Flattens calculator form/result objects into the bounded key → scalar map the feedback API accepts.
 * Nested keys use dots (rows.0.weight). When a form has more fields than the API allows, the last slot
 * records how many were left out so the reviewer knows the snapshot is partial.
 */
export function toFeedbackSnapshot(source: object | null | undefined): ExpertFeedbackSnapshot | undefined {
  if (!source) return undefined;
  const collected: Entry[] = [];
  collect('', source, 0, collected);
  if (!collected.length) return undefined;
  const entries = uniqueKeys(collected);
  if (entries.length <= MAX_SNAPSHOT_ENTRIES) return Object.fromEntries(entries);
  const kept = entries.slice(0, MAX_SNAPSHOT_ENTRIES - 1);
  return Object.fromEntries([...kept, [SNAPSHOT_TRUNCATED_KEY, entries.length - kept.length]]);
}
