import { z } from 'zod';

/** Engine ids follow docs/audits/phase-11/final-evidence-matrix.json; "general" covers any other screen. */
export const expertFeedbackEngines = [
  'yambis',
  'kik_adt',
  'price_escalation_4735',
  'kat_karsiligi_kdv',
  'pre_bim_zoning',
  'minha_ts500_tbdy_epys',
  'general',
] as const;
export type ExpertFeedbackEngine = (typeof expertFeedbackEngines)[number];

export const expertFeedbackVerdicts = ['correct', 'incorrect', 'unsure'] as const;
export type ExpertFeedbackVerdict = (typeof expertFeedbackVerdicts)[number];

export const MAX_SNAPSHOT_ENTRIES = 80;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const SINGLE_LINE_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;

const singleLine = (maximum: number) => z.string()
  .refine(value => !SINGLE_LINE_CONTROL_CHARACTERS.test(value), 'Kontrol karakterleri kabul edilmez.')
  .transform(value => value.trim())
  .pipe(z.string().max(maximum));

// Notes may span lines; tabs and line breaks stay, other control characters are rejected.
const multiLine = (maximum: number) => z.string()
  .refine(value => !CONTROL_CHARACTERS.test(value), 'Kontrol karakterleri kabul edilmez.')
  .transform(value => value.trim())
  .pipe(z.string().max(maximum));

export const MAX_SNAPSHOT_VALUE_LENGTH = 1000;
const snapshotValue = z.union([singleLine(MAX_SNAPSHOT_VALUE_LENGTH), z.number().finite(), z.boolean(), z.null()]);
const snapshot = z.record(singleLine(80).pipe(z.string().min(1)), snapshotValue)
  .refine(value => Object.keys(value).length <= MAX_SNAPSHOT_ENTRIES, `En fazla ${MAX_SNAPSHOT_ENTRIES} alan gönderilebilir.`);

export const expertFeedbackInput = z.strictObject({
  engineId: z.enum(expertFeedbackEngines),
  verdict: z.enum(expertFeedbackVerdicts),
  note: multiLine(2000).default(''),
  expectedValue: singleLine(200).default(''),
  calcVersion: singleLine(60).default(''),
  pagePath: singleLine(200).refine(value => value === '' || value.startsWith('/'), 'Sayfa yolu / ile başlamalıdır.').default(''),
  shareSnapshot: z.boolean().default(false),
  inputs: snapshot.optional(),
  result: snapshot.optional(),
}).superRefine((value, context) => {
  if (value.verdict === 'incorrect' && !value.note) {
    context.addIssue({ code: 'custom', path: ['note'], message: 'Hatalı bulduğunuz sonuç için kısa bir açıklama yazın.' });
  }
  if (!value.shareSnapshot && (value.inputs || value.result)) {
    context.addIssue({ code: 'custom', path: ['shareSnapshot'], message: 'Girdi ve sonuçlar yalnızca paylaşım onayıyla gönderilebilir.' });
  }
});

export type ExpertFeedback = z.infer<typeof expertFeedbackInput>;
export type ExpertFeedbackSnapshot = Record<string, string | number | boolean | null>;
