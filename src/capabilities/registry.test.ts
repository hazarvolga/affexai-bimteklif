import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  CAPABILITY_REGISTRY,
  CAPABILITY_REGISTRY_VERSION,
  getLiveCapabilities,
  getPilotCapabilities,
  getRoadmapCapabilities,
} from './registry';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

test('Yetenek Kaydı v1: sürüm ve benzersiz id kontrolü', () => {
  assert.match(CAPABILITY_REGISTRY_VERSION, /^BIM-CAP-2026-/);
  assert.ok(CAPABILITY_REGISTRY.length >= 9);

  const ids = new Set<string>();
  for (const cap of CAPABILITY_REGISTRY) {
    assert.equal(ids.has(cap.id), false, `Mükerrer yetenek ID: ${cap.id}`);
    ids.add(cap.id);
    assert.ok(cap.title.length >= 10);
    assert.ok(cap.shortClaim.length >= 20);
    assert.ok(cap.planIds.length >= 1);
  }
});

test('Kanıt Kapısı (Evidence Gate): status="live" olan her yetenek L3+ olmalı, modül ve golden testi diskte bulunmalı ve uzman onayı dolu olmalı', () => {
  const liveCaps = getLiveCapabilities();
  assert.ok(liveCaps.length >= 7);

  for (const cap of liveCaps) {
    assert.ok(
      cap.level === 'L3' || cap.level === 'L4',
      `Canlı yetenek (${cap.id}) en az L3 olmalı, mevcut: ${cap.level}`,
    );
    assert.ok(cap.reviewer, `Canlı yetenek (${cap.id}) için reviewer zorunludur`);
    assert.match(
      cap.reviewer.approvedAt,
      /^\d{4}-\d{2}-\d{2}$/,
      `Canlı yetenek (${cap.id}) onay tarihi geçerli YYYY-MM-DD olmalı`,
    );

    const absModule = path.resolve(REPO_ROOT, cap.evidence.modulePath);
    const absGolden = path.resolve(REPO_ROOT, cap.evidence.goldenTestPath);
    assert.equal(
      fs.existsSync(absModule),
      true,
      `Canlı yetenek (${cap.id}) modül dosyası bulunamadı: ${cap.evidence.modulePath}`,
    );
    assert.equal(
      fs.existsSync(absGolden),
      true,
      `Canlı yetenek (${cap.id}) golden test dosyası bulunamadı: ${cap.evidence.goldenTestPath}`,
    );
    assert.ok(cap.evidence.officialSource.institution.length > 0);
    assert.ok(cap.evidence.officialSource.documentTitle.length > 0);
    assert.ok(cap.evidence.officialSource.articleOrTable.length > 0);
  }

  assert.ok(getPilotCapabilities().length >= 1);
  assert.ok(getRoadmapCapabilities().length >= 1);
});

test('Sabit/Sahte Girdi Yasağı (No Hardcoded/Fabricated Inputs Gate): hesap ve kural motorlarında uydurma YM, teklif, CDE, kat veya kaynaksız 4m2 eşiği bulunmamalı', () => {
  const ifcRuleRunSrc = fs.readFileSync(
    path.resolve(REPO_ROOT, 'src/smartcheck/rules/ifc-rule-run.ts'),
    'utf8',
  );
  assert.equal(
    ifcRuleRunSrc.includes("cdeState: 'SHARED'") || ifcRuleRunSrc.includes('cdeState: "SHARED"'),
    false,
    'ifc-rule-run.ts içinde sabit cdeState: SHARED bulunamaz',
  );
  assert.equal(
    ifcRuleRunSrc.includes("suitabilityCode: 'S3'") || ifcRuleRunSrc.includes('suitabilityCode: "S3"'),
    false,
    'ifc-rule-run.ts içinde sabit suitabilityCode: S3 bulunamaz',
  );
  assert.equal(
    ifcRuleRunSrc.includes("revisionCode: 'P01.01'") || ifcRuleRunSrc.includes('revisionCode: "P01.01"'),
    false,
    'ifc-rule-run.ts içinde sabit revisionCode: P01.01 bulunamaz',
  );
  assert.equal(
    ifcRuleRunSrc.includes("?? 'Zemin Kat'") || ifcRuleRunSrc.includes('?? "Zemin Kat"'),
    false,
    'ifc-rule-run.ts içinde kat bilgisi eksikse Zemin Kat varsayımı yapılamaz',
  );

  const calmWorkspaceSrc = fs.readFileSync(
    path.resolve(REPO_ROOT, 'src/components/smartcheck/CalmIfcWorkspace.tsx'),
    'utf8',
  );
  assert.equal(
    calmWorkspaceSrc.includes('directTotal * 1.25'),
    false,
    'CalmIfcWorkspace.tsx içinde uydurma YM (directTotal * 1.25) bulunamaz',
  );
  assert.equal(
    calmWorkspaceSrc.includes('estimatedYm * 0.84'),
    false,
    'CalmIfcWorkspace.tsx içinde uydurma rakip teklif dizisi bulunamaz',
  );

  const minhaSrc = fs.readFileSync(
    path.resolve(REPO_ROOT, 'src/smartcheck/rules/minha.ts'),
    'utf8',
  );
  assert.equal(
    minhaSrc.includes('CSB_FORMWORK_4M2'),
    false,
    'minha.ts içinde kaynaksız CSB_FORMWORK_4M2 profili bulunamaz',
  );
});
