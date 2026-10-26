import { randomUUID } from 'node:crypto';
import { deliverTransactionalEmail } from '../auth/email-delivery';
import type { EmailDetailRow } from '../auth/email-templates';
import { readBuildRevision } from '../observability/error-tracking';
import type { ExpertFeedback, ExpertFeedbackEngine, ExpertFeedbackSnapshot, ExpertFeedbackVerdict } from '../../features/expert-feedback/contract';

type Env = Record<string, string | undefined>;

export interface ExpertFeedbackActor {
  userId: string;
  email: string;
  companyId: string | null;
  role: string | null;
}

export interface ExpertFeedbackDependencies {
  env?: Env;
  deliver?: typeof deliverTransactionalEmail;
  now?: () => Date;
  createReference?: () => string;
  /** Running build revision; defaults to the image build stamp, then SOURCE_COMMIT. */
  revision?: () => string | null;
}

export interface ExpertFeedbackReceipt {
  reference: string;
  status: 'accepted' | 'development';
}

/** Raised when the deployment cannot carry feedback content to a reviewer inbox. */
export class ExpertFeedbackUnavailableError extends Error {
  constructor(readonly reason: 'RECIPIENT_MISSING' | 'DELIVERY_MODE_UNSUPPORTED' | 'PUBLIC_URL_INVALID') {
    super('EXPERT_FEEDBACK_UNAVAILABLE');
    this.name = 'ExpertFeedbackUnavailableError';
  }
}

export const EXPERT_FEEDBACK_REVIEW_PATH = '/admin/roadmap/expert-review';

const ENGINE_LABELS: Record<ExpertFeedbackEngine, string> = {
  yambis: 'YAMBİS iş deneyim ve yeterlik',
  kik_adt: 'KİK aşırı düşük teklif (ADT) ve %80 listesi',
  price_escalation_4735: '4735 fiyat farkı ve TÜİK endeksi',
  kat_karsiligi_kdv: 'Kat karşılığı, KDV ve 6306',
  pre_bim_zoning: 'Pre-BIM imar fizibilitesi',
  minha_ts500_tbdy_epys: 'Minha, TS 500/TBDY, 3x3 ve e-PYS kuralları',
  general: 'Genel (ekran / akış)',
};

const VERDICT_LABELS: Record<ExpertFeedbackVerdict, string> = {
  correct: 'Doğru — kendi hesabımla tutuyor',
  incorrect: 'Hatalı — kendi hesabımla tutmuyor',
  unsure: 'Emin değilim',
};

const EMAIL_PATTERN = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;

export function resolveFeedbackRecipient(env: Env): string | null {
  const recipient = env.EXPERT_FEEDBACK_EMAIL?.trim() ?? '';
  return recipient.length <= 254 && EMAIL_PATTERN.test(recipient) ? recipient : null;
}

function snapshotRows(prefix: string, snapshot: ExpertFeedbackSnapshot | undefined): EmailDetailRow[] {
  if (!snapshot) return [];
  return Object.entries(snapshot).map(([key, value]) => ({
    label: `${prefix} · ${key}`,
    value: value === null ? '—' : String(value),
    mono: typeof value === 'number',
  }));
}

export function buildFeedbackDetailRows(
  feedback: ExpertFeedback,
  actor: ExpertFeedbackActor,
  reference: string,
  submittedAt: Date,
  sourceCommit = '',
): EmailDetailRow[] {
  const rows: EmailDetailRow[] = [
    { label: 'Referans', value: reference, mono: true },
    { label: 'Hesap motoru', value: ENGINE_LABELS[feedback.engineId] },
    { label: 'Değerlendirme', value: VERDICT_LABELS[feedback.verdict], highlight: feedback.verdict === 'incorrect' },
    { label: 'Açıklama', value: feedback.note || '—' },
    { label: 'Uzmanın bulduğu değer', value: feedback.expectedValue || '—', mono: true },
    { label: 'Hesap sürümü', value: feedback.calcVersion || '—', mono: true },
    { label: 'Uygulama sürümü (commit)', value: sourceCommit || '—', mono: true },
    { label: 'Sayfa', value: feedback.pagePath || '—', mono: true },
    { label: 'Gönderen', value: actor.email },
    { label: 'Firma kimliği', value: actor.companyId ?? '—', mono: true },
    { label: 'Rol', value: actor.role ?? '—' },
    { label: 'Gönderim zamanı (UTC)', value: submittedAt.toISOString(), mono: true },
    { label: 'Girdi/sonuç paylaşımı', value: feedback.shareSnapshot ? 'Onaylandı' : 'Onay verilmedi' },
  ];
  if (!feedback.shareSnapshot) return rows;
  return [...rows, ...snapshotRows('Girdi', feedback.inputs), ...snapshotRows('Sonuç', feedback.result)];
}

function assertDeliverable(env: Env): { recipient: string; reviewUrl: string } {
  const recipient = resolveFeedbackRecipient(env);
  if (!recipient) throw new ExpertFeedbackUnavailableError('RECIPIENT_MISSING');
  const production = env.NODE_ENV === 'production';
  // Webhook delivery forwards only template, recipient and URL; the feedback body would be lost in any
  // environment. Only the local development stub (no webhook URL outside production) is let through,
  // and it reports status "development" so the UI never claims the feedback reached an inbox.
  const smtp = env.AUTH_EMAIL_DELIVERY_MODE === 'smtp';
  if (!smtp && (production || env.AUTH_EMAIL_WEBHOOK_URL)) throw new ExpertFeedbackUnavailableError('DELIVERY_MODE_UNSUPPORTED');
  const base = (env.PUBLIC_APP_URL ?? '').replace(/\/+$/, '');
  if (production && !base.startsWith('https://')) throw new ExpertFeedbackUnavailableError('PUBLIC_URL_INVALID');
  return { recipient, reviewUrl: `${base || 'https://localhost'}${EXPERT_FEEDBACK_REVIEW_PATH}` };
}

export async function sendExpertFeedback(
  feedback: ExpertFeedback,
  actor: ExpertFeedbackActor,
  dependencies: ExpertFeedbackDependencies = {},
): Promise<ExpertFeedbackReceipt> {
  const env = dependencies.env ?? process.env;
  const { recipient, reviewUrl } = assertDeliverable(env);
  const reference = (dependencies.createReference ?? randomUUID)();
  const submittedAt = (dependencies.now ?? (() => new Date()))();
  const deliver = dependencies.deliver ?? deliverTransactionalEmail;
  const delivery = await deliver('expert_feedback', recipient, reviewUrl, env, fetch, undefined, {
    subjectOverride: `BIMMetraj — Uzman Geri Bildirimi · ${ENGINE_LABELS[feedback.engineId]} · ${VERDICT_LABELS[feedback.verdict].split(' — ')[0]}`,
    detailRows: buildFeedbackDetailRows(feedback, actor, reference, submittedAt, (dependencies.revision ?? (() => readBuildRevision(env).revision))()?.slice(0, 64) ?? ''),
  });
  return { reference, status: delivery.status };
}
