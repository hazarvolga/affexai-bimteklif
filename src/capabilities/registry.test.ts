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
import { llmsFullTxt, llmsTxt, sitemapXml } from '../server/security/web-hardening';

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

  for (const cap of liveCaps) {
    assert.ok(
      cap.level === 'L3' || cap.level === 'L4',
      `Canlı yetenek (${cap.id}) en az L3 olmalı, mevcut: ${cap.level}`,
    );
    assert.ok(cap.reviewer, `Canlı yetenek (${cap.id}) için reviewer zorunludur`);
    assert.ok(cap.reviewer.registrationNo.trim().length >= 3, `Canlı yetenek (${cap.id}) için oda/sicil numarası zorunludur`);
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

  // The workspace is split into panels and hooks; the guard covers all of them (KİK lives in CalmKikPanel.tsx).
  const calmWorkspaceSrc = [
    'CalmIfcWorkspace.tsx', 'CalmKikPanel.tsx', 'CalmEscalationPanel.tsx', 'CalmCostTools.tsx', 'CalmPriceTable.tsx', 'useTuikEscalation.ts',
  ].map((file) => fs.readFileSync(path.resolve(REPO_ROOT, 'src/components/smartcheck', file), 'utf8')).join('\n');
  assert.ok(calmWorkspaceSrc.includes('evaluateKikAbnormallyLowBid'), 'the KİK analysis is still in the scanned sources');
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

test('Uydurma brüt çarpanı yasağı: icmal ve daire brüt hesabında kaynaksız sabit çarpan bulunmamalı', () => {
  const forbidden = ['* 1.115', '* 1.08', '* 1.215', '* 1.03', '1.132', '1.298', '* 1.12)', '* 1.28)'];
  for (const rel of ['src/ifc/calm-icmal.ts', 'workers/ifc/ifc_extract.py']) {
    const src = fs.readFileSync(path.resolve(REPO_ROOT, rel), 'utf8');
    for (const token of forbidden) {
      assert.equal(src.includes(token), false, `${rel} içinde kaynaksız brüt çarpanı bulunamaz: ${token}`);
    }
  }
});

test('Gerçek imza kapısı: kurgusal kurul/ajan/rol adı onay sayılmaz, her onaycının sicil numarası olmalı', () => {
  const fictional = /kurul|denetim|ajan|agent|bot|claude|codex|başdenetçi|komite|board/i;
  for (const cap of CAPABILITY_REGISTRY) {
    if (!cap.reviewer) continue;
    assert.equal(fictional.test(cap.reviewer.name), false, `${cap.id}: onaylayan gerçek bir kişi olmalı, bulundu: ${cap.reviewer.name}`);
    assert.ok(cap.reviewer.registrationNo.trim().length >= 3, `${cap.id}: sicil numarası eksik`);
    assert.match(cap.reviewer.name.trim(), /\S+\s+\S+/, `${cap.id}: ad ve soyad gerekli`);
  }
});

test('Yayımlanmamış hesaplayıcılar: kaynak doğrulaması bitmeyen yetenekler halka açık olamaz', () => {
  const unpublished = ['kat-karsiligi-ve-kentsel-donusum-calculator', 'yambis-muteahhitlik-grubu-calculator'];
  for (const id of unpublished) {
    const cap = CAPABILITY_REGISTRY.find((c) => c.id === id);
    assert.ok(cap, `${id} kayıtta olmalı`);
    assert.equal(cap.status, 'roadmap');
    assert.equal(cap.level, 'L1');
  }
  // Uzman önizlemesi: yalnız oturum gerektiren /app/uzman-onizleme/* altında, "yayında değil" uyarısıyla açılabilirler.
  const app = fs.readFileSync(path.resolve(REPO_ROOT, 'src/App.tsx'), 'utf8');
  const protectedStart = app.indexOf('<Route element={<ProtectedRoute />}>');
  const appShellStart = app.indexOf('<Route path="/app" element={<Shell />}>');
  assert.ok(protectedStart > 0 && appShellStart > protectedStart, 'korumalı /app kabuğu bulunamadı');
  for (const component of ['KatKarsiligiCalculatorPage', 'YambisCalculatorPage']) {
    const routes = [...app.matchAll(new RegExp(`<Route path="([^"]+)" element={<${component} />} />`, 'g'))];
    assert.equal(routes.length, 1, `${component}: tek bir rota olmalı`);
    const [match] = routes;
    assert.match(match[1], /^uzman-onizleme\/[a-z-]+$/, `${component}: yalnız /app/uzman-onizleme altında olabilir`);
    assert.ok(match.index! > appShellStart, `${component}: rota oturum gerektiren /app kabuğunun içinde olmalı`);
    const source = fs.readFileSync(path.resolve(REPO_ROOT, `src/pages/calculators/${component}.tsx`), 'utf8');
    assert.match(source, /<CalculatorShell[\s\S]*?\n\s+preview\n/, `${component}: önizleme kabuğu (uyarı, herkese açık meta yok) kullanılmalı`);
  }
  for (const generated of [sitemapXml('https://bimmetraj.com'), llmsTxt('https://bimmetraj.com'), llmsFullTxt('https://bimmetraj.com')]) {
    assert.doesNotMatch(generated, /\/app\/uzman-onizleme|\/hesaplayicilar\/(yambis|kat-karsiligi)/i);
  }
});

test('Halka açık hesaplayıcılar boş başlar: sayfalarda başlangıç değeri (varsayılan) bulunamaz', () => {
  const dir = path.resolve(REPO_ROOT, 'src/pages/calculators');
  const withNumericDefault = /useState<string>\(\s*["'`]\s*[0-9]/;
  const withNumericObjectDefault = /:\s*["'`]\s*[0-9][0-9.,]*\s*["'`]\s*[,}]/;
  // Yalnız App.tsx'te yayınlanan sayfalar denetlenir; yayından çıkarılmış sayfa yeniden rotaya alınırsa bu kapıya takılır.
  const appSrc = fs.readFileSync(path.resolve(REPO_ROOT, 'src/App.tsx'), 'utf8');
  const published = fs.readdirSync(dir).filter((f) => f.endsWith('.tsx') && appSrc.includes(f.replace(/\.tsx$/, '')));
  assert.ok(published.length >= 3, 'yayınlanmış hesaplayıcı sayfaları bulunamadı');
  for (const file of published) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    // CalculatorShell/Index gibi açıklama dosyalarında useState yoktur; form durumu içerenler denetlenir
    const stateLines = src.split('\n').filter((l) => /useState/.test(l));
    for (const line of stateLines) {
      assert.equal(withNumericDefault.test(line) || withNumericObjectDefault.test(line), false, `${file}: varsayılan değer yasak -> ${line.trim()}`);
    }
  }
});

test('Kişi ismi otorite yasağı: arayüz ve hesap modüllerinde şahıs ismi standart/otorite olarak kullanılamaz', () => {
  const checkedFiles = [
    'src/components/dashboard/ContractorWorkflowHub.tsx',
    'src/components/dashboard/SystemQuickTour.tsx',
    'src/ifc/apartment-subcontractor-shield.ts',
    'src/ifc/authoring-software-diagnostics.ts',
    'src/lib/pre-bim-feasibility.ts',
    'src/capabilities/registry.ts',
  ];
  for (const rel of checkedFiles) {
    const src = fs.readFileSync(path.resolve(REPO_ROOT, rel), 'utf8');
    assert.equal(
      /melih\s*dinekli/i.test(src),
      false,
      `${rel} içinde kişi ismi otorite/standart olarak kullanılamaz`,
    );
  }
});

