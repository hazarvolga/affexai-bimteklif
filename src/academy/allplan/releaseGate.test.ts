import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canReleaseAllplanLesson, evaluateAllplanContentReview, type AllplanContentReviewRecord } from './releaseGate';

const approvedRecord: AllplanContentReviewRecord = {
  sourceId: 'p3-c1-m1', decision: 'approved', learningOutcomes: ['Create a model column'], prerequisites: ['Project structure configured'], allplanVersions: ['2026'], interfaceContext: 'Actionbar Architecture role',
  stepsEvidence: [1, 2, 3].map(step => ({ step, title: `Step ${step}`, evidenceRef: `evidence/page-${step}.png`, expectedOutput: `Verified model output ${step}` })),
  learnerOutput: 'A classified structural column in the model', references: [{ title: 'Allplan Help', versionOrDate: '2026', locator: 'https://help.allplan.com/example' }],
  technicalReviewer: { name: 'Technical Reviewer', role: 'Allplan BIM Coordinator', reviewedAt: '2026-07-21T00:00:00.000Z' },
  checkpoint: { prompt: 'Create the column', acceptanceCriteria: 'Column classification and dimensions match the evidence' }, assessmentQuestion: { prompt: 'What must be checked?', expectedAnswer: 'Classification, dimensions, level and output evidence' },
  engineeringDisclaimer: true, sourceEvidenceHash: 'a'.repeat(64),
};

describe('Allplan Structural content release gate', () => {
  it('accepts a complete approved evidence and reviewer contract', () => {
    assert.deepEqual(evaluateAllplanContentReview(approvedRecord, new Date('2026-07-22T00:00:00.000Z')), { approved: true, reasons: [] });
  });

  it('rejects missing reviewer approval and evidence integrity', () => {
    const result = evaluateAllplanContentReview({ ...approvedRecord, decision: 'changes-requested', sourceEvidenceHash: '' }, new Date('2026-07-22T00:00:00.000Z'));
    assert.equal(result.approved, false);
    assert.deepEqual(result.reasons, ['TECHNICAL_REVIEW_NOT_APPROVED', 'SOURCE_EVIDENCE_HASH_INVALID']);
  });

  it('keeps Structural modules locked even if a lesson body is added without a review record', () => {
    assert.equal(canReleaseAllplanLesson('p3-c1-m1', true), false);
    assert.equal(canReleaseAllplanLesson('p1-c1-m1', true), true);
  });
});
