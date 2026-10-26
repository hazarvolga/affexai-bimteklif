import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const MATRIX_JSON_PATH = resolve(ROOT, 'docs/audits/phase-11/final-evidence-matrix.json');
const MATRIX_MD_PATH = resolve(ROOT, 'docs/audits/phase-11/PHASE_11_T56_FINAL_EVIDENCE_MATRIX_2026-10-26.md');
const GAP_DOC_PATH = resolve(ROOT, 'docs/audits/GAP_KAPATMA_VE_KANIT_YOL_HARITASI_2026-10-23.md');

interface TodoEntry {
  id: string;
  phase: number;
  title: string;
  roadmapCheckbox: '[x]' | '[ ]';
  codeGateStatus: 'completed' | 'partial_awaiting_external' | 'external_only';
  evidenceFiles: string[];
  automatedTests: string[];
  externalBlocker: string | null;
}

interface AuditFindingEntry {
  id: string;
  category: 'KOD' | 'BUG' | 'GAP' | 'SEO' | 'GEO';
  linkedTodos: string[];
  disposition: 'implemented_and_tested' | 'rejected_false_diagnosis_with_evidence' | 'scope_decision_recorded';
  codeGateStatus: 'completed' | 'partial_awaiting_external';
  remainingExternalGate: string | null;
}

interface CalculationEngineEntry {
  engineId: string;
  name: string;
  linkedTodos: string[];
  sourceModules: string[];
  testModules: string[];
  codeGateStatus: 'completed';
  expertL3Status: string;
}

interface DefectEntry {
  defectId: string;
  revision: string;
  title: string;
  fixedModules: string[];
  regressionTest: string;
  status: 'closed';
}

interface FinalEvidenceMatrix {
  schemaVersion: string;
  matrixId: string;
  overallDeclaration: {
    fullClosureClaimPermitted: boolean;
    generalRegulatoryComplianceClaimPermitted: boolean;
    singleInTurkeyClaimPermitted: boolean;
    summary: string;
    counts: {
      totalTodos: number;
      closedCodeAndTestTodos: number;
      partialAwaitingExternalOrDeployTodos: number;
      openExternalOnlyTodos: number;
    };
  };
  todoItems: TodoEntry[];
  auditFindings: AuditFindingEntry[];
  calculationEngines: CalculationEngineEntry[];
  sessionDiscoveredDefects: DefectEntry[];
}

test('T56-1: Nihai kanıt matrisi 56 To-Do maddesinin tamamını (T01–T56) eksiksiz ve dosya kanıtlarıyla içerir', () => {
  assert.ok(existsSync(MATRIX_JSON_PATH), 'final-evidence-matrix.json mevcut olmalı');
  assert.ok(existsSync(MATRIX_MD_PATH), 'PHASE_11_T56_FINAL_EVIDENCE_MATRIX_2026-10-26.md mevcut olmalı');

  const matrix = JSON.parse(readFileSync(MATRIX_JSON_PATH, 'utf8')) as FinalEvidenceMatrix;
  assert.equal(matrix.schemaVersion, '1.0.0');
  assert.equal(matrix.todoItems.length, 56, 'Tam 56 To-Do maddesi kayıtlı olmalı');

  const expectedIds = Array.from({ length: 56 }, (_, idx) => `T${String(idx + 1).padStart(2, '0')}`);
  const actualIds = matrix.todoItems.map((item) => item.id);
  assert.deepEqual(actualIds, expectedIds, 'T01..T56 sıralı ve eksiksiz olmalı');

  for (const item of matrix.todoItems) {
    assert.ok(item.evidenceFiles.length >= 1, `${item.id} en az bir kanıt dosyasına bağlı olmalı`);
    for (const relPath of item.evidenceFiles) {
      assert.ok(existsSync(resolve(ROOT, relPath)), `${item.id} kanıt dosyası mevcut olmalı: ${relPath}`);
    }
    assert.ok(item.automatedTests.length >= 1, `${item.id} en az bir otomatik test dosyasına bağlı olmalı`);
    for (const testPath of item.automatedTests) {
      assert.ok(existsSync(resolve(ROOT, testPath)), `${item.id} test dosyası mevcut olmalı: ${testPath}`);
    }
    if (item.roadmapCheckbox === '[ ]') {
      assert.ok(
        item.externalBlocker && item.externalBlocker.trim().length > 10,
        `Açık tutulan ${item.id} maddesinin somut dış girdi veya canlı deploy gerekçesi yazılı olmalı`,
      );
    }
  }

  const closedCount = matrix.todoItems.filter((item) => item.roadmapCheckbox === '[x]').length;
  const partialCount = matrix.todoItems.filter(
    (item) => item.roadmapCheckbox === '[ ]' && item.codeGateStatus === 'partial_awaiting_external',
  ).length;
  const externalOnlyCount = matrix.todoItems.filter(
    (item) => item.roadmapCheckbox === '[ ]' && item.codeGateStatus === 'external_only',
  ).length;

  assert.equal(closedCount, matrix.overallDeclaration.counts.closedCodeAndTestTodos);
  assert.equal(partialCount, matrix.overallDeclaration.counts.partialAwaitingExternalOrDeployTodos);
  assert.equal(externalOnlyCount, matrix.overallDeclaration.counts.openExternalOnlyTodos);
  assert.equal(closedCount + partialCount + externalOnlyCount, 56);
});

test('T56-2: Kaynak rapordaki 31 denetim bulgusu (9 KOD + 6 BUG + 8 GAP + 5 SEO + 3 GEO) ve 6 hesap motoru eksiksiz bağlıdır', () => {
  const matrix = JSON.parse(readFileSync(MATRIX_JSON_PATH, 'utf8')) as FinalEvidenceMatrix;
  const validTodoIds = new Set(matrix.todoItems.map((item) => item.id));

  assert.equal(matrix.auditFindings.length, 31, '9 KOD + 6 BUG + 8 GAP + 5 SEO + 3 GEO = 31 bulgu olmalı');
  const byCategory = {
    KOD: matrix.auditFindings.filter((f) => f.category === 'KOD').length,
    BUG: matrix.auditFindings.filter((f) => f.category === 'BUG').length,
    GAP: matrix.auditFindings.filter((f) => f.category === 'GAP').length,
    SEO: matrix.auditFindings.filter((f) => f.category === 'SEO').length,
    GEO: matrix.auditFindings.filter((f) => f.category === 'GEO').length,
  };
  assert.deepEqual(byCategory, { KOD: 9, BUG: 6, GAP: 8, SEO: 5, GEO: 3 });

  for (const finding of matrix.auditFindings) {
    assert.ok(finding.linkedTodos.length >= 1, `${finding.id} en az bir To-Do maddesine bağlı olmalı`);
    for (const todoId of finding.linkedTodos) {
      assert.ok(validTodoIds.has(todoId), `${finding.id} geçerli bir To-Do kimliğine bağlı olmalı: ${todoId}`);
    }
  }

  assert.equal(matrix.calculationEngines.length, 6, 'Altı mühendislik ve mevzuat hesap motoru kayıtlı olmalı');
  for (const engine of matrix.calculationEngines) {
    assert.equal(engine.codeGateStatus, 'completed');
    assert.equal(engine.expertL3Status, 'pending_t50_independent_expert_signature');
    for (const src of engine.sourceModules) {
      assert.ok(existsSync(resolve(ROOT, src)), `${engine.engineId} kaynak modülü mevcut olmalı: ${src}`);
    }
    for (const tst of engine.testModules) {
      assert.ok(existsSync(resolve(ROOT, tst)), `${engine.engineId} test modülü mevcut olmalı: ${tst}`);
    }
  }
});

test('T56-3: Oturumda yakalanan 11 canlı üretim kusuru (D01–D11) ve kapanış beyanı sınırları doğrulanır', () => {
  const matrix = JSON.parse(readFileSync(MATRIX_JSON_PATH, 'utf8')) as FinalEvidenceMatrix;

  // Açık dış girdili madde varken tam kapanış, genel mevzuat uygunluğu veya "Türkiye'de tek" beyanı kesinlikle yasaktır
  assert.equal(matrix.overallDeclaration.fullClosureClaimPermitted, false);
  assert.equal(matrix.overallDeclaration.generalRegulatoryComplianceClaimPermitted, false);
  assert.equal(matrix.overallDeclaration.singleInTurkeyClaimPermitted, false);

  assert.equal(matrix.sessionDiscoveredDefects.length, 11, 'D01..D11 arası 11 üretim kusuru kayıtlı olmalı');
  for (const defect of matrix.sessionDiscoveredDefects) {
    assert.equal(defect.status, 'closed');
    for (const mod of defect.fixedModules) {
      assert.ok(existsSync(resolve(ROOT, mod)), `${defect.defectId} düzeltilen modül mevcut olmalı: ${mod}`);
    }
    assert.ok(existsSync(resolve(ROOT, defect.regressionTest)), `${defect.defectId} regresyon testi mevcut olmalı: ${defect.regressionTest}`);
  }

  // GAP yol haritasındaki [x] / [ ] işaretleriyle matrisin birebir uyumu
  const gapDoc = readFileSync(GAP_DOC_PATH, 'utf8');
  for (const item of matrix.todoItems) {
    const pattern = new RegExp(`^- \\[${item.roadmapCheckbox === '[x]' ? 'x' : ' '}\\] \\*\\*${item.id} —`, 'm');
    assert.match(
      gapDoc,
      pattern,
      `GAP yol haritasındaki ${item.id} onay kutusu (${item.roadmapCheckbox}) final-evidence-matrix.json ile eşleşmeli`,
    );
  }
});
