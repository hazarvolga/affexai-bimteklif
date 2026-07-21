import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import reviewData from '../src/academy/allplan/contentReviewRecords.json' with { type: 'json' };
import { evaluateAllplanContentReview } from '../src/academy/allplan/releaseGate.ts';

const candidatePath = process.argv[2];
if (!candidatePath) {
  console.error('Usage: npm run allplan:review-validate -- <review-record.json> [source-id]');
  process.exit(2);
}

const absolutePath = path.resolve(process.cwd(), candidatePath);
const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
const record = parsed.records ? parsed.records[process.argv[3]] : parsed;
if (!record) {
  console.error(JSON.stringify({ approved: false, reasons: ['CONTENT_REVIEW_RECORD_MISSING'], sourceId: process.argv[3] ?? null }, null, 2));
  process.exit(2);
}
if (!reviewData.structuralSourceIds.includes(record.sourceId)) {
  console.error(JSON.stringify({ approved: false, reasons: ['STRUCTURAL_SOURCE_ID_INVALID'], sourceId: record.sourceId ?? null }, null, 2));
  process.exit(2);
}

const result = evaluateAllplanContentReview(record);
const evidenceReasons = [];
for (const step of record.stepsEvidence ?? []) {
  if (!step.evidenceRef || !fs.existsSync(path.resolve(process.cwd(), step.evidenceRef))) evidenceReasons.push(`STEP_EVIDENCE_FILE_MISSING:${step.step ?? '?'}`);
}
const sourceEvidencePath = record.sourceEvidenceRef ? path.resolve(process.cwd(), record.sourceEvidenceRef) : '';
if (!sourceEvidencePath || !fs.existsSync(sourceEvidencePath)) evidenceReasons.push('SOURCE_EVIDENCE_FILE_MISSING');
else {
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(sourceEvidencePath)).digest('hex');
  if (actualHash !== record.sourceEvidenceHash) evidenceReasons.push('SOURCE_EVIDENCE_HASH_MISMATCH');
}
const reasons = [...result.reasons, ...evidenceReasons];
const approved = reasons.length === 0;
console.log(JSON.stringify({ sourceId: record.sourceId, file: absolutePath, approved, reasons }, null, 2));
if (!approved) process.exit(2);
