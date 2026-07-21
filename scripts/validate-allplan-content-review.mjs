import fs from 'node:fs';
import path from 'node:path';
import reviewData from '../src/academy/allplan/contentReviewRecords.json' with { type: 'json' };
import { evaluateAllplanContentReview } from '../src/academy/allplan/releaseGate.ts';

const candidatePath = process.argv[2];
if (!candidatePath) {
  console.error('Usage: npm run allplan:review-validate -- <review-record.json>');
  process.exit(2);
}

const absolutePath = path.resolve(process.cwd(), candidatePath);
const record = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
if (!reviewData.structuralSourceIds.includes(record.sourceId)) {
  console.error(JSON.stringify({ approved: false, reasons: ['STRUCTURAL_SOURCE_ID_INVALID'], sourceId: record.sourceId ?? null }, null, 2));
  process.exit(2);
}

const result = evaluateAllplanContentReview(record);
console.log(JSON.stringify({ sourceId: record.sourceId, file: absolutePath, ...result }, null, 2));
if (!result.approved) process.exit(2);
