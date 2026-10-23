import { createHash, verify as verifySignature } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPABILITY_REGISTRY, CAPABILITY_REGISTRY_VERSION } from '../src/capabilities/registry';

type JsonRecord = Record<string, any>;

export interface Phase0Evidence {
  findings: JsonRecord;
  sources: JsonRecord;
  capabilities: JsonRecord;
  references: JsonRecord;
  openSourceFixtures: JsonRecord;
  experts: JsonRecord;
  trustStore: JsonRecord;
  verification: JsonRecord;
}

const EXPECTED_FINDINGS = [
  ...Array.from({ length: 9 }, (_, index) => `KOD-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 6 }, (_, index) => `BUG-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 8 }, (_, index) => `GAP-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 5 }, (_, index) => `SEO-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 3 }, (_, index) => `GEO-${String(index + 1).padStart(2, '0')}`),
].sort();

const REQUIRED_SOURCE_IDS = [
  'TS500', 'TS708', 'TBDY2018', 'PAIY', 'FIRE', 'CSB2026',
  'KIK4734', 'KIK4735', 'YAMBIS', 'KDV', 'EPYS_RG33331', 'ISO19650',
].sort();
const SOURCE_STATUSES = new Set([
  'public_verified', 'local_reference', 'access_required', 'scope_pending',
  'expert_review_required', 'identity_pending',
]);
const FINDING_DECISIONS = new Set(['confirmed', 'partial', 'disproved', 'optional']);
const REQUIRED_EXPERTS = ['STR', 'ARC', 'MEP', 'COST', 'tax', 'tender'].sort();
const REQUIRED_LAYERS = ['local_git', 'remote_git', 'ci', 'live_app', 'worker'].sort();
const REQUIRED_SCENARIOS = ['normal', 'boundary', 'missing_invalid'];
const REQUIRED_ENGINES = ['ifc-qto', 'pdf-preflight', 'pricing', 'kik-adt', 'price-difference', 'yambis', 'kat-karsiligi-kdv', 'pre-bim', 'minha-3x3'].sort();
const REQUIRED_CUSTOMER_FIXTURES = ['vendor-allplan', 'vendor-revit', 'vendor-archicad', 'vendor-tekla', 'signed-pdf-customer'].sort();
const REQUIRED_CSB_CATALOGS = [
  'csb_2026_mart_insaat_bf', 'csb_2026_mart_insaat_rayic', 'csb_2026_mart_mekanik_bf',
  'csb_2026_mart_elektrik_bf', 'csb_2026_yapi_yaklasik_maliyet', 'csb_2026_tuik_endeks_eslestirme',
].sort();
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_SHA_PATTERN = /^[a-f0-9]{40}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/;
const REQUIRED_OPEN_FIXTURES = [
  'buildingsmart-ifc2x3-building-architecture',
  'buildingsmart-ifc4-wall-opening-window',
  'buildingsmart-ifc4x3-building-structural',
  'verapdf-pdfa2b-6-3-3-t01-fail-a',
  'verapdf-pdfa2b-6-3-3-t01-pass-a',
].sort();
const ENGINE_EXPERT_DISCIPLINES: Record<string, string[]> = {
  'ifc-qto': ['STR', 'ARC', 'MEP'],
  'pdf-preflight': ['ARC'],
  pricing: ['COST'],
  'kik-adt': ['tender'],
  'price-difference': ['COST', 'tender'],
  yambis: ['tender'],
  'kat-karsiligi-kdv': ['tax'],
  'pre-bim': ['ARC', 'COST'],
  'minha-3x3': ['STR', 'ARC', 'COST'],
};
const LICENSED_SOURCE_IDS = new Set(['TS500', 'TS708', 'ISO19650']);
const OFFICIAL_SOURCE_DOMAINS: Record<string, string[]> = {
  TS500: ['tse.org.tr'], TS708: ['tse.org.tr'], TBDY2018: ['resmigazete.gov.tr'],
  PAIY: ['mevzuat.gov.tr', 'resmigazete.gov.tr'], FIRE: ['mevzuat.gov.tr', 'resmigazete.gov.tr'],
  CSB2026: ['csb.gov.tr'], KIK4734: ['kik.gov.tr'], KIK4735: ['mevzuat.gov.tr', 'kik.gov.tr'],
  YAMBIS: ['csb.gov.tr', 'resmigazete.gov.tr'], KDV: ['gib.gov.tr', 'resmigazete.gov.tr'],
  EPYS_RG33331: ['resmigazete.gov.tr'], ISO19650: ['iso.org', 'tse.org.tr'],
};

function readJson(path: string): JsonRecord {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadPhase0Evidence(root: string): Phase0Evidence {
  const base = resolve(root, 'docs/audits/phase-0');
  return {
    findings: readJson(resolve(base, 'finding-register.json')),
    sources: readJson(resolve(base, 'source-register.json')),
    capabilities: readJson(resolve(base, 'capability-claim-register.json')),
    references: readJson(resolve(base, 'reference-register.json')),
    openSourceFixtures: readJson(resolve(base, 'open-source-fixture-register.json')),
    experts: readJson(resolve(base, 'expert-assignment-register.json')),
    trustStore: readJson(resolve(base, 'expert-trust-store.json')),
    verification: readJson(resolve(base, 'phase-0-verification.json')),
  };
}

function validateOpenSourceFixtures(data: JsonRecord, root: string, errors: string[]): void {
  const rows = data.fixtures ?? [];
  const policy = data.policy ?? {};
  const machineRun = data.machineRun ?? {};
  assert(rows.length === REQUIRED_OPEN_FIXTURES.length, `open fixture count must be ${REQUIRED_OPEN_FIXTURES.length}, got ${rows.length}`, errors);
  assert(rows.length === new Set(rows.map((row: JsonRecord) => row.id)).size, 'open fixture ids must be unique', errors);
  assert(sameSet(rows.map((row: JsonRecord) => row.id), REQUIRED_OPEN_FIXTURES), 'open fixture id set is incomplete', errors);
  for (const field of ['mayProveVendorInteroperability', 'mayProveIndependentEngineeringAccuracy', 'mayProveCustomerAcceptance', 'mayProveL3OrL4']) {
    assert(policy[field] === false, `open fixture policy ${field} must remain false`, errors);
  }
  assert(COMMIT_SHA_PATTERN.test(machineRun.baselineCommit ?? ''), 'open fixture machine run baseline commit required', errors);
  assert(ISO_DATE_PATTERN.test(machineRun.generatedAt ?? ''), 'open fixture machine run date required', errors);
  assert(Boolean(machineRun.runtime?.python && machineRun.runtime?.ifcopenshell && machineRun.runtime?.pypdf), 'open fixture runtime versions required', errors);
  assert(Boolean(machineRun.workerScripts?.ifc?.localPath && machineRun.workerScripts?.pdf?.localPath && machineRun.interpretation), 'open fixture machine run scripts and interpretation required', errors);
  validateHashedArtifact(root, machineRun.workerScripts?.ifc, 'open fixture IFC worker', errors);
  validateHashedArtifact(root, machineRun.workerScripts?.pdf, 'open fixture PDF worker', errors);
  for (const row of rows) {
    assert(row.classification === 'open_conformance_fixture', `${row.id}: invalid open fixture classification`, errors);
    assert(COMMIT_SHA_PATTERN.test(row.upstreamCommit ?? ''), `${row.id}: pinned upstream commit required`, errors);
    assert(Boolean(row.upstreamRepo && row.upstreamPath && row.sourceUrl && ISO_DATE_PATTERN.test(row.retrievedAt ?? '')), `${row.id}: immutable upstream provenance required`, errors);
    assert(row.licenseSpdx === 'CC-BY-4.0' && Boolean(row.licenseUrl && row.attributionText), `${row.id}: CC-BY-4.0 attribution metadata required`, errors);
    assert(row.modified === false, `${row.id}: copied fixture must be recorded as unmodified`, errors);
    const localPath = containedEvidencePath(root, row.localPath, `${row.id}: fixture`, errors);
    if (localPath) {
      const content = readFileSync(localPath);
      const gitBlob = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
      assert(gitBlob === row.upstreamGitBlob, `${row.id}: upstream Git blob mismatch`, errors);
    }
    assert(Boolean(row.schemaOrProfile && row.declaredExpectedCondition && row.purpose && row.claimBoundary), `${row.id}: purpose and claim boundary required`, errors);
    for (const artifact of [row, row.machineObservation]) {
      validateHashedArtifact(root, artifact, `${row.id}: registered artifact`, errors);
    }
    assert(row.machineObservation?.inputSha256 === row.sha256, `${row.id}: machine observation input hash mismatch`, errors);
    assert(Boolean(row.machineObservation?.resultClass && row.machineObservation?.command && ISO_DATE_PATTERN.test(row.machineObservation?.generatedAt ?? '')), `${row.id}: machine observation command, time and result class required`, errors);
  }
}

function assert(condition: unknown, message: string, errors: string[]): void {
  if (!condition) errors.push(message);
}

function containedEvidencePath(root: string, candidate: unknown, label: string, errors: string[]): string | null {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    errors.push(`${label}: localPath required`);
    return null;
  }
  const rootPath = realpathSync(root);
  const fullPath = resolve(rootPath, candidate);
  const lexicalRelative = relative(rootPath, fullPath);
  if (lexicalRelative.startsWith('..') || isAbsolute(lexicalRelative)) {
    errors.push(`${label}: evidence path escapes repository root`);
    return null;
  }
  if (!existsSync(fullPath)) {
    errors.push(`${label}: evidence file missing`);
    return null;
  }
  const physicalRelative = relative(rootPath, realpathSync(fullPath));
  if (physicalRelative.startsWith('..') || isAbsolute(physicalRelative)) {
    errors.push(`${label}: evidence symlink escapes repository root`);
    return null;
  }
  return fullPath;
}

function validateHashedArtifact(root: string, artifact: JsonRecord | null | undefined, label: string, errors: string[]): boolean {
  const fullPath = containedEvidencePath(root, artifact?.localPath, label, errors);
  assert(SHA256_PATTERN.test(artifact?.sha256 ?? ''), `${label}: sha256 required`, errors);
  if (!fullPath || !SHA256_PATTERN.test(artifact?.sha256 ?? '')) return false;
  const actual = createHash('sha256').update(readFileSync(fullPath)).digest('hex');
  assert(actual === artifact.sha256, `${label}: hash mismatch`, errors);
  return actual === artifact.sha256;
}

function readJsonArtifact(root: string, artifact: JsonRecord | null | undefined, label: string, errors: string[]): JsonRecord | null {
  if (!validateHashedArtifact(root, artifact, label, errors)) return null;
  try {
    return JSON.parse(readFileSync(resolve(root, artifact!.localPath), 'utf8'));
  } catch {
    errors.push(`${label}: artifact must be valid JSON`);
    return null;
  }
}

function validateCredentialManifest(root: string, artifact: JsonRecord | undefined, expected: JsonRecord, label: string, errors: string[]): void {
  const manifest = readJsonArtifact(root, artifact, label, errors);
  if (!manifest) return;
  assert(manifest.schemaVersion === 1 && manifest.artifactType === 'reviewer_credential_manifest', `${label}: invalid credential manifest type`, errors);
  for (const field of ['reviewerId', 'reviewerName', 'discipline']) {
    assert(manifest[field] === expected[field], `${label}: ${field} binding mismatch`, errors);
  }
  assert(Boolean(manifest.issuer && manifest.credentialRecordId && ISO_DATE_PATTERN.test(manifest.verifiedAt ?? '') && SHA256_PATTERN.test(manifest.publicKeySha256 ?? '')), `${label}: issuer, credential record, verification date and public-key hash required`, errors);
}

function validateSignedManifest(root: string, signed: JsonRecord | undefined, expected: JsonRecord, artifactType: string, label: string, errors: string[]): void {
  const manifest = readJsonArtifact(root, signed, label, errors);
  const publicKeyPath = containedEvidencePath(root, signed?.publicKey?.localPath, `${label}: public key`, errors);
  assert(SHA256_PATTERN.test(signed?.publicKey?.sha256 ?? ''), `${label}: public key sha256 required`, errors);
  if (publicKeyPath && SHA256_PATTERN.test(signed?.publicKey?.sha256 ?? '')) {
    const publicKeyBytes = readFileSync(publicKeyPath);
    const publicKeyHash = createHash('sha256').update(publicKeyBytes).digest('hex');
    assert(publicKeyHash === signed.publicKey.sha256, `${label}: public key hash mismatch`, errors);
    if (manifest && typeof signed?.signatureBase64 === 'string') {
      let valid = false;
      try {
        valid = verifySignature('sha256', readFileSync(resolve(root, signed.localPath)), publicKeyBytes, Buffer.from(signed.signatureBase64, 'base64'));
      } catch { /* reported as invalid below */ }
      assert(valid, `${label}: detached signature verification failed`, errors);
    } else {
      assert(false, `${label}: detached signature required`, errors);
    }
  }
  if (!manifest) return;
  assert(manifest.schemaVersion === 1 && manifest.artifactType === artifactType, `${label}: invalid signed manifest type`, errors);
  for (const [field, value] of Object.entries(expected)) {
    assert(manifest[field] === value, `${label}: ${field} binding mismatch`, errors);
  }
  assert(Boolean(ISO_DATE_PATTERN.test(manifest.signedAt ?? '') && manifest.signerPublicKeySha256 === signed?.publicKey?.sha256), `${label}: signedAt and signer key binding required`, errors);
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function sameSet(actual: string[], expected: string[]): boolean {
  return JSON.stringify(sortedUnique(actual)) === JSON.stringify(sortedUnique(expected));
}

function expandTodoCell(cell: string): string[] {
  const ids: string[] = [];
  for (const part of cell.split(',')) {
    const range = part.trim().match(/^T(\d{2})[–-]T?(\d{2})$/);
    if (range) {
      for (let value = Number(range[1]); value <= Number(range[2]); value += 1) {
        ids.push(`T${String(value).padStart(2, '0')}`);
      }
      continue;
    }
    const single = part.trim().match(/^T\d{2}$/);
    if (single) ids.push(single[0]);
  }
  return sortedUnique(ids);
}

function roadmapMappings(root: string): Map<string, string[]> {
  const markdown = readFileSync(resolve(root, 'docs/audits/GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md'), 'utf8');
  const mappings = new Map<string, string[]>();
  for (const line of markdown.split('\n')) {
    const match = line.match(/^\| ((?:KOD|BUG|GAP|SEO|GEO)-\d{2}) \| ([^|]+) \|/);
    if (match) mappings.set(match[1], expandTodoCell(match[2]));
  }
  const todos = [...markdown.matchAll(/\*\*T(\d{2}) —/g)].map((match) => `T${match[1]}`);
  if (!sameSet(todos, Array.from({ length: 56 }, (_, index) => `T${String(index + 1).padStart(2, '0')}`))) {
    throw new Error('roadmap must define T01 through T56 exactly');
  }
  return mappings;
}

function validateFindings(data: JsonRecord, root: string, errors: string[]): void {
  const rows = data.findings ?? [];
  const ids = rows.map((row: JsonRecord) => row.id);
  const mappings = roadmapMappings(root);
  assert(rows.length === 31, `finding count must be 31, got ${rows.length}`, errors);
  assert(ids.length === new Set(ids).size, 'finding ids must be unique', errors);
  assert(sameSet(ids, EXPECTED_FINDINGS), 'finding id set does not match the 31-item audit', errors);
  for (const row of rows) {
    assert(FINDING_DECISIONS.has(row.decision), `${row.id}: invalid decision`, errors);
    assert(Array.isArray(row.todoIds) && row.todoIds.length > 0, `${row.id}: todoIds required`, errors);
    assert(JSON.stringify(sortedUnique(row.todoIds)) === JSON.stringify(mappings.get(row.id) ?? []), `${row.id}: todoIds differ from roadmap traceability table`, errors);
    assert(Array.isArray(row.evidenceRefs) && row.evidenceRefs.length > 0, `${row.id}: evidenceRefs required`, errors);
    if (row.decision === 'disproved') {
      assert(row.closureStatus === 'evidence_rejected_no_change', `${row.id}: disproved is not product-complete`, errors);
    }
  }
}

function validateSources(data: JsonRecord, root: string, errors: string[]): void {
  const rows = data.sources ?? [];
  assert(rows.length === REQUIRED_SOURCE_IDS.length, `source count must be ${REQUIRED_SOURCE_IDS.length}, got ${rows.length}`, errors);
  assert(rows.length === new Set(rows.map((row: JsonRecord) => row.id)).size, 'source ids must be unique', errors);
  assert(sameSet(rows.map((row: JsonRecord) => row.id), REQUIRED_SOURCE_IDS), 'source register is incomplete', errors);
  for (const row of rows) {
    assert(SOURCE_STATUSES.has(row.status), `${row.id}: invalid source status`, errors);
    assert(Boolean(row.authority && row.title && row.articleOrScope && row.jurisdiction && row.uncertainty), `${row.id}: source scope fields required`, errors);
    if (row.url) {
      let hostname = '';
      try { hostname = new URL(row.url).hostname.toLowerCase(); } catch { /* asserted below */ }
      const allowedDomains = OFFICIAL_SOURCE_DOMAINS[row.id] ?? [];
      assert(allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)), `${row.id}: source URL must use an approved authority domain`, errors);
    }
    if (row.localPath) {
      const fullPath = containedEvidencePath(root, row.localPath, `${row.id}: local source`, errors);
      if (fullPath) {
        const actual = createHash('sha256').update(readFileSync(fullPath)).digest('hex');
        assert(actual === row.sha256, `${row.id}: local source hash mismatch`, errors);
      }
    }
    if (row.status === 'public_verified' || row.status === 'local_reference') {
      assert(Boolean(row.url || row.localPath), `${row.id}: verified source needs URL or path`, errors);
      assert(Boolean(row.publicationDate && row.effectiveFrom), `${row.id}: verified source needs publication/effective dates`, errors);
      assert(Boolean(row.documentIdentity?.edition && row.documentIdentity?.authorityRecordId && row.documentIdentity?.verifiedAt), `${row.id}: verified source needs exact document identity`, errors);
      if (LICENSED_SOURCE_IDS.has(row.id)) {
        validateHashedArtifact(root, row.licensedAccessEvidence, `${row.id}: licensed access`, errors);
        assert(Boolean(row.documentIdentity?.amendmentStatus && row.documentIdentity?.documentSha256), `${row.id}: licensed source edition/amendment/hash required`, errors);
      }
    }
    if (row.status === 'access_required') {
      assert(!row.sha256, `${row.id}: inaccessible standard cannot carry an approval hash`, errors);
    }
    if (row.id === 'CSB2026') {
      const artifacts = row.artifacts ?? [];
      assert(artifacts.length === 6, 'CSB2026: six catalog artifacts required', errors);
      assert(artifacts.length === new Set(artifacts.map((artifact: JsonRecord) => artifact.catalogId)).size, 'CSB2026: artifact ids must be unique', errors);
      assert(sameSet(artifacts.map((artifact: JsonRecord) => artifact.catalogId), REQUIRED_CSB_CATALOGS), 'CSB2026: catalog id set is incorrect', errors);
      assert(artifacts.length === new Set(artifacts.map((artifact: JsonRecord) => artifact.localPath)).size, 'CSB2026: artifact paths must be unique', errors);
      assert(artifacts.length === new Set(artifacts.map((artifact: JsonRecord) => artifact.sha256)).size, 'CSB2026: artifact hashes must be unique', errors);
      for (const artifact of artifacts) {
        const fullPath = containedEvidencePath(root, artifact.localPath, `CSB2026/${artifact.catalogId}`, errors);
        if (fullPath) {
          const actual = createHash('sha256').update(readFileSync(fullPath)).digest('hex');
          assert(actual === artifact.sha256, `CSB2026/${artifact.catalogId}: hash mismatch`, errors);
        }
        assert(Number.isInteger(artifact.rowCount) && artifact.rowCount > 0, `CSB2026/${artifact.catalogId}: rowCount required`, errors);
      }
      const authorization = row.commercialUseAuthorization;
      assert(authorization?.status === 'pending' || authorization?.status === 'authorized', 'CSB2026: commercial authorization status required', errors);
      if (authorization?.status === 'authorized') {
        assert(Boolean(authorization.recordId && authorization.scope && authorization.authorizedAt), 'CSB2026: authorized commercial use needs immutable evidence metadata', errors);
        validateHashedArtifact(root, authorization.evidenceArtifact, 'CSB2026: commercial authorization', errors);
      }
    }
  }
}

function validateCapabilities(data: JsonRecord, root: string, errors: string[]): void {
  const rows = data.capabilities ?? [];
  const expected = CAPABILITY_REGISTRY.map((row) => row.id);
  assert(rows.length === 19, `capability count must be 19, got ${rows.length}`, errors);
  assert(data.registryVersion === CAPABILITY_REGISTRY_VERSION, 'capability registry version drift detected', errors);
  assert(rows.length === new Set(rows.map((row: JsonRecord) => row.id)).size, 'capability ids must be unique', errors);
  assert(sameSet(rows.map((row: JsonRecord) => row.id), expected), 'capability ids must match registry exactly', errors);
  for (const row of rows) {
    const registryRow = CAPABILITY_REGISTRY.find((candidate) => candidate.id === row.id);
    if (registryRow) {
      assert(row.title === registryRow.title, `${row.id}: title drift detected`, errors);
      assert(row.currentLevel === registryRow.level, `${row.id}: level drift detected`, errors);
      assert(row.currentStatus === registryRow.status, `${row.id}: status drift detected`, errors);
      assert(row.modulePath === registryRow.evidence.modulePath, `${row.id}: modulePath drift detected`, errors);
      assert(row.goldenTestPath === registryRow.evidence.goldenTestPath, `${row.id}: goldenTestPath drift detected`, errors);
    }
    for (const field of ['actualBehaviorClaim', 'formulaAccuracyScope', 'regulatoryScope', 'authorityApprovalBoundary', 'fieldAcceptanceBoundary']) {
      assert(Boolean(row[field]), `${row.id}: ${field} required`, errors);
    }
    assert(!(row.currentLevel === 'L4' && row.fieldAcceptanceBoundary.includes('No named')), `${row.id}: L4 cannot lack field acceptance`, errors);
    if (row.currentLevel === 'L3' || row.currentLevel === 'L4') {
      const signOff = row.expertSignOff;
      assert(Boolean(signOff?.reviewerId && signOff?.reviewerName && signOff?.credentials && signOff?.scope && signOff?.conflictDeclaration && signOff?.signedAt), `${row.id}: L3/L4 needs a named expert sign-off`, errors);
      validateSignedManifest(root, signOff?.signedDecision, { capabilityId: row.id, reviewerId: signOff?.reviewerId }, 'capability_signed_decision', `${row.id}: capability signed decision`, errors);
    }
    if (row.currentLevel === 'L4') {
      const acceptance = row.fieldAcceptanceEvidence;
      assert(Boolean(acceptance?.localPath && acceptance?.sha256 && acceptance?.customerIdentity && acceptance?.acceptedAt), `${row.id}: L4 needs customer field-acceptance evidence`, errors);
      if (acceptance?.localPath) {
        validateHashedArtifact(root, acceptance, `${row.id}: L4 acceptance`, errors);
      }
      validateHashedArtifact(root, acceptance?.permissionEvidence, `${row.id}: L4 permission`, errors);
      validateHashedArtifact(root, acceptance?.inputArtifact, `${row.id}: L4 input`, errors);
      validateHashedArtifact(root, acceptance?.resultArtifact, `${row.id}: L4 result`, errors);
      assert(Boolean(acceptance?.piiDecisionRecordId), `${row.id}: L4 acceptance PII decision record required`, errors);
    }
  }
  const protocol = data.uniqueClaimProtocol ?? {};
  for (const field of ['category', 'featureBundle', 'asOfDate', 'geography', 'searchMethod', 'decisionOwner', 'expiresAt', 'status', 'rule']) {
    assert(Boolean(protocol[field]), `unique claim protocol: ${field} required`, errors);
  }
}

function validateExpectedOutput(row: JsonRecord, root: string, errors: string[]): void {
  const output = row.independentExpectedOutput;
  if (!output) return;
  validateHashedArtifact(root, output, `${row.id}: independent expected output`, errors);
  assert(output.localPath !== row.localPath, `${row.id}: independent output must be a separate artifact`, errors);
  assert(SHA256_PATTERN.test(output.inputSha256 ?? ''), `${row.id}: expected output inputSha256 required`, errors);
  assert(output.inputSha256 === row.sha256, `${row.id}: expected output input hash must match fixture`, errors);
  assert(Boolean(output.caseId && output.decision && output.scope && output.resultSchemaVersion), `${row.id}: expected output decision manifest required`, errors);
  assert(['accepted', 'conditionally_accepted', 'rejected'].includes(output.decision), `${row.id}: invalid independent decision`, errors);
  assert(Boolean(output.author?.reviewerId && output.author?.name && output.author?.credentials?.length >= 3 && output.author?.discipline && output.author?.conflictDeclaration && output.author?.isIndependent === true), `${row.id}: expected output needs independent human provenance`, errors);
  validateCredentialManifest(root, output.author?.credentialEvidence, { reviewerId: output.author?.reviewerId, reviewerName: output.author?.name, discipline: output.author?.discipline }, `${row.id}: reviewer credential`, errors);
  validateSignedManifest(root, output.author?.signedDecision, {
    caseId: output.caseId, engine: row.engine, scenario: row.scenario,
    inputSha256: row.sha256, outputSha256: output.sha256,
    reviewerId: output.author?.reviewerId, discipline: output.author?.discipline,
    decision: output.decision,
  }, 'independent_expected_output_decision', `${row.id}: signed decision`, errors);
  const distinctPaths = [output.localPath, output.author?.credentialEvidence?.localPath, output.author?.signedDecision?.localPath];
  assert(new Set(distinctPaths).size === distinctPaths.length, `${row.id}: output, credential and signed decision artifacts must be distinct`, errors);
  assert(ISO_DATE_PATTERN.test(output.createdAt ?? ''), `${row.id}: expected output createdAt must be ISO date/time`, errors);
}

function validateReferences(data: JsonRecord, root: string, errors: string[]): void {
  const rows = data.references ?? [];
  assert(rows.length === new Set(rows.map((row: JsonRecord) => row.id)).size, 'reference ids must be unique', errors);
  assert(sameSet(rows.map((row: JsonRecord) => row.engine), REQUIRED_ENGINES), 'reference engine register is incomplete', errors);
  const availableKeys = rows.filter((row: JsonRecord) => row.status === 'available').map((row: JsonRecord) => `${row.engine}:${row.scenario}`);
  assert(availableKeys.length === new Set(availableKeys).size, 'available engine/scenario evidence must be unique', errors);
  assert(data.policy?.syntheticMayProveL4 === false, 'synthetic fixtures must never prove L4', errors);
  for (const row of rows) {
    if (row.localPath) {
      const fullPath = containedEvidencePath(root, row.localPath, `${row.id}: fixture`, errors);
      if (fullPath) {
        const actual = createHash('sha256').update(readFileSync(fullPath)).digest('hex');
        assert(actual === row.sha256, `${row.id}: fixture hash mismatch`, errors);
      }
    }
    if (row.classification === 'customer_pilot') {
      assert(Boolean(row.permissionBasis), `${row.id}: customer evidence needs permission`, errors);
      assert(row.piiStatus !== 'unknown', `${row.id}: customer evidence needs PII status`, errors);
      if (row.status === 'available') {
        validateHashedArtifact(root, row.permissionEvidence?.evidenceArtifact, `${row.id}: customer permission`, errors);
        validateHashedArtifact(root, row.piiDecision?.evidenceArtifact, `${row.id}: customer PII decision`, errors);
      }
    }
    if (row.status === 'blocked') {
      assert(Array.isArray(row.missingScenarios) && row.missingScenarios.length > 0, `${row.id}: blocked reference needs missingScenarios`, errors);
      assert(row.missingScenarios.every((scenario: string) => REQUIRED_SCENARIOS.includes(scenario)), `${row.id}: invalid missing scenario`, errors);
      assert(row.missingScenarios.length === new Set(row.missingScenarios).size, `${row.id}: duplicate missing scenario`, errors);
    }
    if (row.status === 'available') {
      assert(Boolean(row.localPath), `${row.id}: available reference needs a localPath`, errors);
      if (!row.independentExpectedOutput) {
        assert(row.expectedOutputStatus === 'blocked' && Boolean(row.expectedOutputBlocker), `${row.id}: missing independent expected output needs an explicit blocker`, errors);
      }
      if (row.independentExpectedOutput) {
        assert(row.expectedOutputStatus !== 'blocked', `${row.id}: completed output cannot remain blocked`, errors);
      }
    }
    validateExpectedOutput(row, root, errors);
  }
  for (const engine of sortedUnique(rows.map((row: JsonRecord) => row.engine))) {
    const engineRows = rows.filter((row: JsonRecord) => row.engine === engine);
    const scenarios = engineRows.filter((row: JsonRecord) => row.status === 'available').map((row: JsonRecord) => row.scenario);
    const blocked = engineRows.some((row: JsonRecord) => row.status === 'blocked' && Array.isArray(row.missingScenarios) && row.missingScenarios.length > 0);
    assert(REQUIRED_SCENARIOS.every((scenario) => scenarios.includes(scenario)) || blocked, `${engine}: scenarios incomplete without explicit blocker`, errors);
  }
}

function validateTrustStore(data: JsonRecord, root: string, errors: string[]): void {
  assert(data.status === 'unconfigured' || data.status === 'configured', 'expert trust store has invalid status', errors);
  const issuers = data.trustedIssuers ?? [];
  const reviewers = data.trustedReviewers ?? [];
  assert(issuers.length === new Set(issuers.map((row: JsonRecord) => row.issuerId)).size, 'trusted issuer ids must be unique', errors);
  assert(reviewers.length === new Set(reviewers.map((row: JsonRecord) => row.reviewerId)).size, 'trusted reviewer ids must be unique', errors);
  if (data.status === 'configured') {
    assert(issuers.length > 0 && reviewers.length > 0, 'configured trust store needs issuers and reviewers', errors);
  } else {
    assert(issuers.length === 0 && reviewers.length === 0, 'unconfigured trust store cannot contain trusted identities', errors);
  }
  for (const issuer of issuers) {
    assert(issuer.status === 'active' && Boolean(issuer.issuerId && issuer.name), `${issuer.issuerId}: trusted issuer must be active and named`, errors);
    validateHashedArtifact(root, issuer.publicKey, `${issuer.issuerId}: issuer public key`, errors);
  }
  for (const reviewer of reviewers) {
    assert(reviewerIsTrusted(reviewer, issuers), `${reviewer.reviewerId}: trusted reviewer issuer/status/expiry invalid`, errors);
    assert(Array.isArray(reviewer.disciplines) && reviewer.disciplines.length > 0 && Array.isArray(reviewer.scopeIds) && reviewer.scopeIds.length > 0, `${reviewer.reviewerId}: trusted reviewer disciplines and scopes required`, errors);
    validateHashedArtifact(root, reviewer.publicKey, `${reviewer.reviewerId}: reviewer public key`, errors);
    const issuer = issuers.find((candidate: JsonRecord) => candidate.issuerId === reviewer.issuerId);
    validateSignedManifest(root, reviewer.issuerSignedCredential, {
      reviewerId: reviewer.reviewerId,
      reviewerPublicKeySha256: reviewer.publicKey?.sha256,
      issuerId: reviewer.issuerId,
      expiresAt: reviewer.expiresAt,
    }, 'trusted_reviewer_credential', `${reviewer.reviewerId}: issuer-signed credential`, errors);
    if (issuer) assert(reviewer.issuerSignedCredential?.publicKey?.sha256 === issuer.publicKey?.sha256, `${reviewer.reviewerId}: credential signer is not the trusted issuer`, errors);
  }
}

function reviewerIsTrusted(reviewer: JsonRecord, issuers: JsonRecord[]): boolean {
  const expiresAt = Date.parse(reviewer.expiresAt ?? '');
  return reviewer.status === 'active' && reviewer.revoked !== true && Number.isFinite(expiresAt) && expiresAt > Date.now() &&
    issuers.some((issuer) => issuer.issuerId === reviewer.issuerId && issuer.status === 'active');
}

function validateExperts(data: JsonRecord, trustStore: JsonRecord, root: string, errors: string[]): void {
  const rows = data.experts ?? [];
  assert(rows.length === REQUIRED_EXPERTS.length, `expert count must be ${REQUIRED_EXPERTS.length}, got ${rows.length}`, errors);
  assert(rows.length === new Set(rows.map((row: JsonRecord) => row.discipline)).size, 'expert disciplines must be unique', errors);
  assert(sameSet(rows.map((row: JsonRecord) => row.discipline), REQUIRED_EXPERTS), 'expert discipline register is incomplete', errors);
  for (const row of rows) {
    if (row.status === 'unassigned') assert(Boolean(row.blocker), `${row.discipline}: unassigned expert needs blocker`, errors);
    if (row.status === 'assigned') {
      assert(Boolean(row.reviewerId && row.reviewerName && row.credentials && row.scope && row.conflictDeclaration && row.assignedAt), `${row.discipline}: assigned expert identity and acceptance fields required`, errors);
      validateCredentialManifest(root, row.credentialEvidence, { reviewerId: row.reviewerId, reviewerName: row.reviewerName, discipline: row.discipline }, `${row.discipline}: assigned expert credential`, errors);
      validateSignedManifest(root, row.signedAssignment, { reviewerId: row.reviewerId, discipline: row.discipline }, 'expert_assignment_acceptance', `${row.discipline}: signed assignment`, errors);
      const trusted = (trustStore.trustedReviewers ?? []).find((candidate: JsonRecord) => candidate.reviewerId === row.reviewerId);
      assert(trustStore.status === 'configured' && Boolean(trusted), `${row.discipline}: assigned expert must exist in configured trust store`, errors);
      if (trusted) {
        assert(trusted.publicKey?.sha256 === row.signedAssignment?.publicKey?.sha256, `${row.discipline}: assignment key differs from trusted reviewer key`, errors);
        assert(trusted.disciplines?.includes(row.discipline), `${row.discipline}: trust store does not authorize discipline`, errors);
        assert(row.scopeIds?.every((scopeId: string) => trusted.scopeIds?.includes(scopeId)), `${row.discipline}: assignment scope exceeds trusted reviewer scope`, errors);
      }
    }
    assert(row.status === 'unassigned' || row.status === 'assigned', `${row.discipline}: invalid expert status`, errors);
  }
}

function validateReviewerBindings(references: JsonRecord, experts: JsonRecord, trustStore: JsonRecord, root: string, errors: string[]): void {
  const assigned = new Map((experts.experts ?? []).filter((row: JsonRecord) => row.status === 'assigned').map((row: JsonRecord) => [row.reviewerId, row]));
  const signedDecisionPaths = new Set<string>();
  for (const row of references.references ?? []) {
    const output = row.independentExpectedOutput;
    if (!output) continue;
    const expert = assigned.get(output.author?.reviewerId) as JsonRecord | undefined;
    assert(Boolean(expert), `${row.id}: expected output reviewer is not an assigned expert`, errors);
    if (expert) {
      assert(expert.reviewerName === output.author.name, `${row.id}: reviewer identity differs from expert assignment`, errors);
      assert(expert.discipline === output.author.discipline, `${row.id}: reviewer discipline differs from expert assignment`, errors);
      assert((ENGINE_EXPERT_DISCIPLINES[row.engine] ?? []).includes(expert.discipline), `${row.id}: reviewer discipline is not permitted for engine`, errors);
      assert(Array.isArray(expert.scopeIds) && expert.scopeIds.includes(row.engine), `${row.id}: reviewer assignment scopeIds does not include engine`, errors);
      const trusted = (trustStore.trustedReviewers ?? []).find((candidate: JsonRecord) => candidate.reviewerId === expert.reviewerId);
      assert(Boolean(trusted) && trusted.publicKey?.sha256 === output.author?.signedDecision?.publicKey?.sha256, `${row.id}: decision key differs from trusted reviewer key`, errors);
      const credential = readJsonArtifact(root, output.author?.credentialEvidence, `${row.id}: credential trust binding`, errors);
      assert(Boolean(trusted) && credential?.publicKeySha256 === trusted.publicKey?.sha256, `${row.id}: credential key differs from trusted reviewer key`, errors);
    }
    const decisionPath = output.author?.signedDecision?.localPath;
    assert(Boolean(decisionPath) && !signedDecisionPaths.has(decisionPath), `${row.id}: signed decision artifact must be unique per case`, errors);
    if (decisionPath) signedDecisionPaths.add(decisionPath);
  }
}

function validateCapabilityBindings(capabilities: JsonRecord, experts: JsonRecord, trustStore: JsonRecord, errors: string[]): void {
  const assigned = new Map((experts.experts ?? []).filter((row: JsonRecord) => row.status === 'assigned').map((row: JsonRecord) => [row.reviewerId, row]));
  for (const row of capabilities.capabilities ?? []) {
    if (!['L3', 'L4'].includes(row.currentLevel)) continue;
    const signOff = row.expertSignOff;
    const expert = assigned.get(signOff?.reviewerId) as JsonRecord | undefined;
    assert(Boolean(expert), `${row.id}: capability sign-off reviewer is not assigned`, errors);
    if (expert) {
      assert(expert.reviewerName === signOff.reviewerName, `${row.id}: capability sign-off identity mismatch`, errors);
      const trusted = (trustStore.trustedReviewers ?? []).find((candidate: JsonRecord) => candidate.reviewerId === expert.reviewerId);
      assert(Boolean(trusted) && trusted.publicKey?.sha256 === signOff.signedDecision?.publicKey?.sha256, `${row.id}: capability decision key differs from trusted reviewer key`, errors);
    }
  }
}

export function phase0ClosureBlockers(evidence: Phase0Evidence): string[] {
  const blockers: string[] = [];
  if (evidence.trustStore.status !== 'configured') blockers.push('trustStore:expert-identities');
  for (const expert of evidence.experts.experts ?? []) {
    if (expert.status !== 'assigned' || !expert.reviewerId || !expert.reviewerName || !expert.credentials || !expert.conflictDeclaration || !expert.assignedAt || !expert.credentialEvidence || !expert.signedAssignment) {
      blockers.push(`expert:${expert.discipline}`);
    }
  }
  for (const engine of REQUIRED_ENGINES) {
    const rows = (evidence.references.references ?? []).filter((row: JsonRecord) => row.engine === engine && row.status === 'available');
    for (const scenario of REQUIRED_SCENARIOS) {
      const row = rows.find((candidate: JsonRecord) => candidate.scenario === scenario);
      if (!row?.independentExpectedOutput) blockers.push(`reference:${engine}:${scenario}`);
    }
  }
  const references = evidence.references.references ?? [];
  for (const id of REQUIRED_CUSTOMER_FIXTURES) {
    const row = references.find((candidate: JsonRecord) => candidate.id === id);
    const permission = row?.permissionEvidence;
    const pii = row?.piiDecision;
    if (row?.status !== 'available' || row?.classification !== 'customer_pilot' || !row?.localPath || !row?.sha256 ||
        !permission?.recordId || !permission?.evidenceArtifact || !permission?.grantedBy || !permission?.scope || !permission?.grantedAt ||
        !pii?.status || !pii?.reviewer || !pii?.decidedAt || !pii?.evidenceArtifact) {
      blockers.push(`customerFixture:${id}`);
    }
  }
  for (const source of evidence.sources.sources ?? []) {
    if (!['public_verified', 'local_reference'].includes(source.status)) blockers.push(`source:${source.id}`);
    if (source.id === 'CSB2026' && (source.commercialUseAuthorization?.status !== 'authorized' || !source.commercialUseAuthorization?.evidenceArtifact)) blockers.push('source:CSB2026-commercial-use');
  }
  return sortedUnique(blockers);
}

function validateVerification(data: JsonRecord, evidence: Phase0Evidence, errors: string[]): void {
  const rows = data.layers ?? [];
  assert(rows.length === REQUIRED_LAYERS.length, `verification layer count must be ${REQUIRED_LAYERS.length}, got ${rows.length}`, errors);
  assert(rows.length === new Set(rows.map((row: JsonRecord) => row.id)).size, 'verification layer ids must be unique', errors);
  assert(sameSet(rows.map((row: JsonRecord) => row.id), REQUIRED_LAYERS), 'verification layers must remain separate', errors);
  for (const row of rows) {
    assert(Boolean(row.status && row.limit), `${row.id}: status and limit required`, errors);
    if (row.status === 'verified') assert(Boolean(row.command && row.result), `${row.id}: verified layer needs command/result`, errors);
  }
  const blockers = phase0ClosureBlockers(evidence);
  assert(data.semanticBlockerCount === blockers.length, 'semanticBlockerCount must match computed blockers', errors);
  assert(JSON.stringify(data.semanticBlockerIds ?? []) === JSON.stringify(blockers), 'semanticBlockerIds must match computed blockers', errors);
  assert(data.developmentGateReady === true, 'Phase 0 development evidence contract must be ready', errors);
  assert(data.externalAcceptanceReady === (blockers.length === 0), 'externalAcceptanceReady must reflect semantic blockers', errors);
  assert(data.closureEligible === (blockers.length === 0), 'closureEligible must reflect semantic expert/reference/source gates', errors);
  if (blockers.length > 0) assert(data.phaseStatus === 'complete_contract_ready', 'development-ready phase must preserve external blockers', errors);
}

export function validatePhase0Evidence(root: string, evidence = loadPhase0Evidence(root)): string[] {
  const errors: string[] = [];
  validateFindings(evidence.findings, root, errors);
  validateSources(evidence.sources, root, errors);
  validateCapabilities(evidence.capabilities, root, errors);
  validateReferences(evidence.references, root, errors);
  validateOpenSourceFixtures(evidence.openSourceFixtures, root, errors);
  validateTrustStore(evidence.trustStore, root, errors);
  validateExperts(evidence.experts, evidence.trustStore, root, errors);
  validateReviewerBindings(evidence.references, evidence.experts, evidence.trustStore, root, errors);
  validateCapabilityBindings(evidence.capabilities, evidence.experts, evidence.trustStore, errors);
  validateVerification(evidence.verification, evidence, errors);
  return errors;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? '.');
  const errors = validatePhase0Evidence(root);
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    const blockers = phase0ClosureBlockers(loadPhase0Evidence(root));
    console.log(`Phase 0 register valid; closureEligible=${blockers.length === 0}; semanticBlockers=${blockers.length}.`);
  }
}
