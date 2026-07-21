import reviewData from './contentReviewRecords.json';

export interface AllplanContentReviewRecord {
  sourceId: string;
  decision: 'approved' | 'rejected' | 'changes-requested';
  learningOutcomes: string[];
  prerequisites: string[];
  allplanVersions: string[];
  interfaceContext: string;
  stepsEvidence: Array<{ step: number; title: string; evidenceRef: string; expectedOutput: string }>;
  learnerOutput: string;
  references: Array<{ title: string; versionOrDate: string; locator: string }>;
  technicalReviewer: { name: string; role: string; reviewedAt: string };
  checkpoint: { prompt: string; acceptanceCriteria: string };
  assessmentQuestion: { prompt: string; expectedAnswer: string };
  engineeringDisclaimer: true;
  sourceEvidenceRef: string;
  sourceEvidenceHash: string;
}

export interface ReleaseGateResult {
  approved: boolean;
  reasons: string[];
}

const present = (value: unknown, min = 3) => typeof value === 'string' && value.trim().length >= min;
const localEvidence = (value: unknown) => typeof value === 'string' && /^docs\/academy\/content-review\/evidence\/[a-z0-9/_-]+\.(?:png|jpe?g|webp|pdf)$/i.test(value);

export function evaluateAllplanContentReview(record: AllplanContentReviewRecord | undefined, now = new Date()): ReleaseGateResult {
  if (!record) return { approved: false, reasons: ['CONTENT_REVIEW_RECORD_MISSING'] };
  const reasons: string[] = [];
  if (record.decision !== 'approved') reasons.push('TECHNICAL_REVIEW_NOT_APPROVED');
  if (!record.learningOutcomes?.length || record.learningOutcomes.some(value => !present(value))) reasons.push('LEARNING_OUTCOMES_MISSING');
  if (!record.prerequisites?.length || record.prerequisites.some(value => !present(value))) reasons.push('PREREQUISITES_MISSING');
  if (!record.allplanVersions?.length || record.allplanVersions.some(value => !/^20\d{2}(?:\.\d+)?$/.test(value))) reasons.push('ALLPLAN_VERSION_INVALID');
  if (!present(record.interfaceContext, 10)) reasons.push('INTERFACE_CONTEXT_MISSING');
  if (!Array.isArray(record.stepsEvidence) || record.stepsEvidence.length < 3 || record.stepsEvidence.some((step, index) => step.step !== index + 1 || !present(step.title) || !localEvidence(step.evidenceRef) || !present(step.expectedOutput, 8))) reasons.push('STEP_EVIDENCE_INCOMPLETE');
  if (!present(record.learnerOutput, 8)) reasons.push('LEARNER_OUTPUT_MISSING');
  if (!record.references?.length || record.references.some(reference => !present(reference.title) || !present(reference.versionOrDate) || !present(reference.locator, 8))) reasons.push('REFERENCES_MISSING');
  const reviewedAt = new Date(record.technicalReviewer?.reviewedAt ?? '');
  if (!present(record.technicalReviewer?.name) || !present(record.technicalReviewer?.role) || !Number.isFinite(reviewedAt.getTime()) || reviewedAt > now) reasons.push('TECHNICAL_REVIEW_INVALID');
  if (!present(record.checkpoint?.prompt) || !present(record.checkpoint?.acceptanceCriteria, 8)) reasons.push('CHECKPOINT_MISSING');
  if (!present(record.assessmentQuestion?.prompt) || !present(record.assessmentQuestion?.expectedAnswer, 8)) reasons.push('ASSESSMENT_MISSING');
  if (record.engineeringDisclaimer !== true) reasons.push('ENGINEERING_DISCLAIMER_MISSING');
  if (!/^docs\/academy\/content-review\/evidence\/[a-z0-9/_-]+\.(?:md|pdf)$/i.test(record.sourceEvidenceRef ?? '')) reasons.push('SOURCE_EVIDENCE_REF_INVALID');
  if (!/^[a-f0-9]{64}$/i.test(record.sourceEvidenceHash ?? '')) reasons.push('SOURCE_EVIDENCE_HASH_INVALID');
  return { approved: reasons.length === 0, reasons };
}

export function canReleaseAllplanLesson(sourceId: string, hasDetailedBody: boolean): boolean {
  if (!hasDetailedBody) return false;
  if (!reviewData.structuralSourceIds.includes(sourceId)) return true;
  const record = (reviewData.records as Record<string, AllplanContentReviewRecord>)[sourceId];
  return evaluateAllplanContentReview(record).approved;
}
