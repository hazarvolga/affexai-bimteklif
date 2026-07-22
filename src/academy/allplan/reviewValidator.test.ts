import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import reviewData from './contentReviewRecords.json' with { type: 'json' };

const repo = process.cwd();
const validator = path.join(repo, 'node_modules/.bin/tsx');
const script = path.join(repo, 'scripts/validate-allplan-content-review.mjs');

const run = (...args: string[]) => spawnSync(validator, [script, ...args], { cwd: repo, encoding: 'utf8' });

describe('Allplan content review validator CLI', () => {
  it('reports a deterministic aggregate status for every Structural module', () => {
    const result = run('src/academy/allplan/contentReviewRecords.json', '--all');
    assert.equal(result.status, 2);
    const output = JSON.parse(result.stdout);
    assert.deepEqual(output.summary, { total: 9, approved: 0, locked: 9 });
    assert.deepEqual(output.records.map((record: { sourceId: string }) => record.sourceId), reviewData.structuralSourceIds);
    assert.equal(output.records.flatMap((record: { missingEvidenceRefs: string[] }) => record.missingEvidenceRefs).length, 27);
  });

  it('accepts the pnpm argument separator used by the documented command', () => {
    const result = run('--', 'src/academy/allplan/contentReviewRecords.json', '--all');
    assert.equal(result.status, 2);
    const output = JSON.parse(result.stdout);
    assert.deepEqual(output.summary, { total: 9, approved: 0, locked: 9 });
  });

  it('rejects evidence symlinks that resolve outside the evidence directory', () => {
    const evidenceRoot = path.join(repo, 'docs/academy/content-review/evidence');
    const suffix = `${process.pid}-${Date.now()}`;
    const stepRefs = [1, 2, 3].map(step => `docs/academy/content-review/evidence/validator-${suffix}-${step}.png`);
    const sourceRef = `docs/academy/content-review/evidence/validator-${suffix}.md`;
    const links = [...stepRefs, sourceRef].map(ref => path.join(repo, ref));
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'allplan-review-validator-'));
    const candidatePath = path.join(tempDir, 'record.json');
    try {
      for (const link of links) fs.symlinkSync('/etc/hosts', link);
      const record = structuredClone(reviewData.records['p3-c1-m1']);
      record.decision = 'approved';
      record.technicalReviewer = { name: 'Reviewer', role: 'Allplan BIM Coordinator', reviewedAt: '2026-07-22T00:00:00.000Z' };
      record.stepsEvidence = record.stepsEvidence.map((step, index) => ({ ...step, evidenceRef: stepRefs[index] }));
      record.sourceEvidenceRef = sourceRef;
      record.sourceEvidenceHash = crypto.createHash('sha256').update(fs.readFileSync('/etc/hosts')).digest('hex');
      fs.writeFileSync(candidatePath, JSON.stringify(record));
      const result = run(candidatePath);
      assert.equal(result.status, 2);
      const output = JSON.parse(result.stdout);
      assert.ok(output.reasons.includes('SOURCE_EVIDENCE_FILE_MISSING'));
      assert.deepEqual(output.reasons.filter((reason: string) => reason.startsWith('STEP_EVIDENCE_FILE_MISSING:')), [
        'STEP_EVIDENCE_FILE_MISSING:1',
        'STEP_EVIDENCE_FILE_MISSING:2',
        'STEP_EVIDENCE_FILE_MISSING:3',
      ]);
    } finally {
      for (const link of links) fs.rmSync(link, { force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
      assert.ok(fs.existsSync(evidenceRoot));
    }
  });
});
