import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { loadPhase0Evidence, phase0ClosureBlockers, validatePhase0Evidence, type Phase0Evidence } from './phase-0-evidence-validator';

const root = resolve(import.meta.dirname, '..');

function cloneEvidence(): Phase0Evidence {
  return structuredClone(loadPhase0Evidence(root));
}

test('current Phase 0 evidence contract is complete and internally consistent', () => {
  assert.deepEqual(validatePhase0Evidence(root), []);
});

test('current Phase 0 remains ineligible for closure while external evidence is missing', () => {
  const evidence = cloneEvidence();
  assert.equal(evidence.verification.closureEligible, false);
  assert.ok(phase0ClosureBlockers(evidence).length > 0);
  for (const id of ['vendor-allplan', 'vendor-revit', 'vendor-archicad', 'vendor-tekla', 'signed-pdf-customer']) {
    assert.ok(phase0ClosureBlockers(evidence).includes(`customerFixture:${id}`));
  }
  assert.ok(phase0ClosureBlockers(evidence).includes('source:CSB2026-commercial-use'));
  assert.ok(phase0ClosureBlockers(evidence).includes('trustStore:expert-identities'));
});

test('duplicate audit finding is rejected', () => {
  const evidence = cloneEvidence();
  evidence.findings.findings[1].id = evidence.findings.findings[0].id;
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /finding ids must be unique/);
});

test('capability registry drift is rejected', () => {
  const evidence = cloneEvidence();
  evidence.capabilities.capabilities.pop();
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /capability count must be 19/);
});

test('capability metadata drift is rejected even when ids are unchanged', () => {
  const evidence = cloneEvidence();
  evidence.capabilities.capabilities[0].modulePath = 'src/fake.ts';
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /modulePath drift detected/);
});

test('duplicate source ids cannot hide a missing source', () => {
  const evidence = cloneEvidence();
  evidence.sources.sources[1].id = evidence.sources.sources[0].id;
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /source ids must be unique/);
});

test('an inaccessible standard cannot masquerade as approved hashed evidence', () => {
  const evidence = cloneEvidence();
  const source = evidence.sources.sources.find((row: any) => row.id === 'TS500');
  source.sha256 = 'a'.repeat(64);
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /inaccessible standard cannot carry an approval hash/);
});

test('a missing scenario needs an explicit blocker', () => {
  const evidence = cloneEvidence();
  evidence.references.references = evidence.references.references.filter((row: any) => row.engine !== 'kik-adt');
  evidence.references.references.push({
    id: 'kik-only-normal', engine: 'kik-adt', scenario: 'normal', status: 'available',
    classification: 'synthetic', permissionBasis: 'repository-owned', piiStatus: 'none_detected',
  });
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /kik-adt: scenarios incomplete without explicit blocker/);
});

test('a fake expected-output path cannot satisfy independent evidence', () => {
  const evidence = cloneEvidence();
  const row = evidence.references.references.find((candidate: any) => candidate.status === 'available');
  row.independentExpectedOutput = {
    localPath: 'approved.xlsx', sha256: 'a'.repeat(64), inputSha256: 'b'.repeat(64), createdAt: '2026-10-23',
    author: { name: 'Reviewer', credentials: 'Credential', discipline: 'COST', conflictDeclaration: 'none', isIndependent: true },
  };
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /independent expected output: evidence file missing/);
});

test('expected output input hash must match its fixture', () => {
  const evidence = cloneEvidence();
  const row = evidence.references.references.find((candidate: any) => candidate.status === 'available');
  row.independentExpectedOutput = {
    localPath: row.localPath, sha256: row.sha256, inputSha256: 'b'.repeat(64), createdAt: '2026-10-23',
    author: { name: 'Reviewer', credentials: 'Credential', discipline: 'COST', conflictDeclaration: 'none', isIndependent: true },
  };
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /input hash must match fixture/);
});

test('duplicate available engine/scenario evidence is rejected', () => {
  const evidence = cloneEvidence();
  const row = evidence.references.references.find((candidate: any) => candidate.status === 'available');
  evidence.references.references.push({ ...structuredClone(row), id: `${row.id}-duplicate` });
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /engine\/scenario evidence must be unique/);
});

test('removing an entire required engine is rejected', () => {
  const evidence = cloneEvidence();
  evidence.references.references = evidence.references.references.filter((row: any) => row.engine !== 'yambis');
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /reference engine register is incomplete/);
});

test('meaningless blocker scenarios are rejected', () => {
  const evidence = cloneEvidence();
  const row = evidence.references.references.find((candidate: any) => candidate.status === 'blocked');
  row.missingScenarios = ['banana'];
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /invalid missing scenario/);
});

test('assigned expert requires identity, credentials, conflict declaration and date', () => {
  const evidence = cloneEvidence();
  const expert = evidence.experts.experts[0];
  expert.status = 'assigned';
  expert.blocker = null;
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /assigned expert identity and acceptance fields required/);
});

test('self-asserted experts cannot bypass an unconfigured external trust store', () => {
  const evidence = cloneEvidence();
  const expert = evidence.experts.experts[0];
  Object.assign(expert, {
    status: 'assigned', reviewerId: 'self-signed', reviewerName: 'Self Signed', credentials: 'claimed',
    scope: 'ifc-qto', scopeIds: ['ifc-qto'], conflictDeclaration: 'none', assignedAt: '2026-10-23',
  });
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /assigned expert must exist in configured trust store/);
  assert.ok(phase0ClosureBlockers(evidence).includes('trustStore:expert-identities'));
});

test('L4 capability requires named expert sign-off', () => {
  const evidence = cloneEvidence();
  evidence.capabilities.capabilities[0].currentLevel = 'L4';
  evidence.capabilities.capabilities[0].fieldAcceptanceBoundary = 'Accepted';
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /L3\/L4 needs a named expert sign-off/);
});

test('synthetic evidence is explicitly barred from L4', () => {
  const evidence = cloneEvidence();
  evidence.references.policy.syntheticMayProveL4 = true;
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /synthetic fixtures must never prove L4/);
});

test('open conformance fixtures cannot be promoted to vendor or customer acceptance evidence', () => {
  const evidence = cloneEvidence();
  evidence.openSourceFixtures.policy.mayProveVendorInteroperability = true;
  evidence.openSourceFixtures.policy.mayProveCustomerAcceptance = true;
  const errors = validatePhase0Evidence(root, evidence).join('\n');
  assert.match(errors, /mayProveVendorInteroperability must remain false/);
  assert.match(errors, /mayProveCustomerAcceptance must remain false/);
});

test('open fixture provenance and generated result hashes are immutable', () => {
  const evidence = cloneEvidence();
  evidence.openSourceFixtures.fixtures[0].upstreamCommit = 'main';
  evidence.openSourceFixtures.fixtures[1].machineObservation.sha256 = 'a'.repeat(64);
  const errors = validatePhase0Evidence(root, evidence).join('\n');
  assert.match(errors, /pinned upstream commit required/);
  assert.match(errors, /registered artifact: hash mismatch/);
});

test('an input fixture cannot be reused as its own independent expected output', () => {
  const evidence = cloneEvidence();
  const row = evidence.references.references.find((candidate: any) => candidate.status === 'available');
  row.independentExpectedOutput = {
    localPath: row.localPath,
    sha256: row.sha256,
    inputSha256: row.sha256,
    caseId: 'fake-case',
    decision: 'accepted',
    scope: row.engine,
    resultSchemaVersion: 1,
    createdAt: '2026-10-23',
    author: {
      reviewerId: 'fake-reviewer',
      name: 'Reviewer',
      credentials: 'abc',
      discipline: 'COST',
      conflictDeclaration: 'none',
      isIndependent: true,
    },
  };
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /independent output must be a separate artifact/);
});

test('evidence paths cannot escape the repository root', () => {
  const evidence = cloneEvidence();
  evidence.openSourceFixtures.fixtures[0].localPath = '/etc/hosts';
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /evidence path escapes repository root/);
});

test('all unresolved source statuses remain semantic closure blockers', () => {
  const evidence = cloneEvidence();
  for (const source of evidence.sources.sources) {
    if (['scope_pending', 'expert_review_required', 'identity_pending', 'access_required'].includes(source.status)) {
      assert.ok(phase0ClosureBlockers(evidence).includes(`source:${source.id}`));
    }
  }
});

test('CSB catalog artifacts cannot reuse the same path under different ids', () => {
  const evidence = cloneEvidence();
  const source = evidence.sources.sources.find((row: any) => row.id === 'CSB2026');
  source.artifacts[1].localPath = source.artifacts[0].localPath;
  source.artifacts[1].sha256 = source.artifacts[0].sha256;
  assert.match(validatePhase0Evidence(root, evidence).join('\n'), /artifact paths must be unique/);
});
