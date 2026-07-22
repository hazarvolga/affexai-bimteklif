import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import reviewData from '../src/academy/allplan/contentReviewRecords.json' with { type: 'json' };
import { evaluateAllplanContentReview } from '../src/academy/allplan/releaseGate.ts';

const cliArgs = process.argv.slice(2);
if (cliArgs[0] === '--') cliArgs.shift();
const candidatePath = cliArgs[0];
if (!candidatePath) {
  console.error('Usage: npm run allplan:review-validate -- <review-record.json> [source-id|--all]');
  process.exit(2);
}

const absolutePath = path.resolve(process.cwd(), candidatePath);
const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
const evidenceRoot = path.resolve(process.cwd(), 'docs/academy/content-review/evidence');

const resolveEvidenceFile = ref => {
  if (typeof ref !== 'string') return null;
  const candidate = path.resolve(process.cwd(), ref);
  if (candidate !== evidenceRoot && !candidate.startsWith(`${evidenceRoot}${path.sep}`)) return null;
  if (!fs.existsSync(candidate) || !fs.lstatSync(candidate).isFile()) return null;
  const real = fs.realpathSync(candidate);
  if (real !== evidenceRoot && !real.startsWith(`${evidenceRoot}${path.sep}`)) return null;
  return real;
};

const validateRecord = record => {
  if (!record) return { sourceId: null, approved: false, reasons: ['CONTENT_REVIEW_RECORD_MISSING'], missingEvidenceRefs: [] };
  if (!reviewData.structuralSourceIds.includes(record.sourceId)) return { sourceId: record.sourceId ?? null, approved: false, reasons: ['STRUCTURAL_SOURCE_ID_INVALID'], missingEvidenceRefs: [] };
  const result = evaluateAllplanContentReview(record);
  const evidenceReasons = [];
  const missingEvidenceRefs = [];
  for (const step of record.stepsEvidence ?? []) {
    if (!resolveEvidenceFile(step.evidenceRef)) {
      evidenceReasons.push(`STEP_EVIDENCE_FILE_MISSING:${step.step ?? '?'}`);
      if (step.evidenceRef) missingEvidenceRefs.push(step.evidenceRef);
    }
  }
  const sourceEvidencePath = resolveEvidenceFile(record.sourceEvidenceRef);
  if (!sourceEvidencePath) evidenceReasons.push('SOURCE_EVIDENCE_FILE_MISSING');
  else if (crypto.createHash('sha256').update(fs.readFileSync(sourceEvidencePath)).digest('hex') !== record.sourceEvidenceHash) evidenceReasons.push('SOURCE_EVIDENCE_HASH_MISMATCH');
  const reasons = [...result.reasons, ...evidenceReasons];
  return { sourceId: record.sourceId, approved: reasons.length === 0, reasons, missingEvidenceRefs };
};

const sourceId = cliArgs[1];
if (sourceId === '--all') {
  if (!parsed.records) {
    console.error(JSON.stringify({ approved: false, reasons: ['CONTENT_REVIEW_REGISTRY_REQUIRED'], file: absolutePath }, null, 2));
    process.exit(2);
  }
  const records = reviewData.structuralSourceIds.map(id => validateRecord(parsed.records[id]));
  const approvedCount = records.filter(record => record.approved).length;
  const output = { file: absolutePath, approved: approvedCount === records.length, summary: { total: records.length, approved: approvedCount, locked: records.length - approvedCount }, records };
  console.log(JSON.stringify(output, null, 2));
  if (!output.approved) process.exit(2);
} else {
  const record = parsed.records ? parsed.records[sourceId] : parsed;
  const output = { file: absolutePath, ...validateRecord(record) };
  console.log(JSON.stringify(output, null, 2));
  if (!output.approved) process.exit(2);
}
