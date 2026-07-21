import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import reviewData from '../src/academy/allplan/contentReviewRecords.json' with { type: 'json' };
import { evaluateAllplanContentReview } from '../src/academy/allplan/releaseGate.ts';

const repo = process.cwd();
const evidenceRoot = path.resolve(repo, 'docs/academy/content-review/evidence');
const sourceRoot = path.resolve(repo, '../allplanAkademi-main');
const read = relative => fs.readFileSync(path.join(sourceRoot, relative), 'utf8');
const constants = read('src/constants.ts');
const lessons = read('src/data/lessonsContent.ts');
const lessonKeys = [...lessons.matchAll(/^  ['"]([^'"]+)['"]:\s*{/gm)].map(match => match[1]);
const structuralBlock = constants.match(/id:\s*'p3',[\s\S]*?(?=\n\s*\{\n\s*id:\s*'p4')/)?.[0];

const evaluateEvidenceFiles = record => {
  if (!record) return [];
  const reasons = [];
  const resolveEvidenceFile = ref => {
    if (typeof ref !== 'string') return null;
    const candidate = path.resolve(repo, ref);
    if (candidate !== evidenceRoot && !candidate.startsWith(`${evidenceRoot}${path.sep}`)) return null;
    if (!fs.existsSync(candidate) || !fs.lstatSync(candidate).isFile()) return null;
    const real = fs.realpathSync(candidate);
    return real === evidenceRoot || real.startsWith(`${evidenceRoot}${path.sep}`) ? real : null;
  };
  for (const step of record.stepsEvidence ?? []) {
    if (!resolveEvidenceFile(step.evidenceRef)) reasons.push(`STEP_EVIDENCE_FILE_MISSING:${step.step ?? '?'}`);
  }
  const sourcePath = resolveEvidenceFile(record.sourceEvidenceRef);
  if (!sourcePath) reasons.push('SOURCE_EVIDENCE_FILE_MISSING');
  else if (crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex') !== record.sourceEvidenceHash) reasons.push('SOURCE_EVIDENCE_HASH_MISMATCH');
  return reasons;
};

if (!structuralBlock) throw new Error('[allplan-structural-audit] p3 Structural Engineering path not found');

const modules = [...structuralBlock.matchAll(/id:\s*'([^']+)',\s*title:\s*'([^']+)',\s*type:\s*'module'/g)].map(([, sourceId, title]) => {
  const hasDetailedLessonBody = lessonKeys.includes(title);
  const record = reviewData.records[sourceId];
  const contractGate = evaluateAllplanContentReview(record);
  const reasons = [...contractGate.reasons, ...evaluateEvidenceFiles(record)];
  const reviewGate = { approved: reasons.length === 0, reasons };
  const releaseApproved = hasDetailedLessonBody && reviewGate.approved;
  return {
    sourceId,
    title,
    hasDetailedLessonBody,
    reviewGate,
    contentStatus: releaseApproved ? 'verified' : 'needs-review',
    releaseDecision: releaseApproved ? 'available' : 'locked',
  };
});

const componentEvidence = [
  { source: 'KnowledgeBase.tsx', signal: 'Automated Reinforcement Workflows', matches: read('src/components/KnowledgeBase.tsx').includes('Automated Reinforcement Workflows') },
  { source: 'KnowledgeBase.tsx', signal: 'Custom Bending Schedules', matches: read('src/components/KnowledgeBase.tsx').includes('Custom Bending Schedules') },
  { source: 'KnowledgeBase.tsx', signal: 'IFC4 Export for Scia Engineer', matches: read('src/components/KnowledgeBase.tsx').includes('IFC4 Export for Scia Engineer') },
  { source: 'CADDiagramViewer.tsx', signal: 'Beam cross-section diagram', matches: read('src/components/CADDiagramViewer.tsx').includes('BEAM DESIGN SECTION') },
  { source: 'ExamInterface.tsx', signal: 'Structural modeling standards question', matches: read('src/components/ExamInterface.tsx').includes('REINFORCEMENT MODELING STANDARDS') },
].filter(item => item.matches);

const missingModules = modules.filter(module => module.releaseDecision !== 'available');
const releaseGate = {
  unlockable: missingModules.length === 0,
  decision: missingModules.length === 0 ? 'PASS' : 'LOCKED',
  reasons: missingModules.length === 0 ? [] : [
    'Structural modüller kaynak ders gövdesi ve onaylı content review record birlikte olmadan açılamaz.',
    'Review record; hedef, ön koşul, sürüm, adım kanıtı, çıktı, referans, reviewer, checkpoint, değerlendirme ve evidence hash sözleşmesini karşılamalıdır.',
    'Eksik modüller fallback veya uydurma içerikle açılmamalı.',
  ],
};

console.log(JSON.stringify({
  sourceRoot,
  path: { sourceId: 'p3', title: '3. Allplan Structural Engineering' },
  moduleCount: modules.length,
  detailedLessonBodyCount: modules.filter(module => module.hasDetailedLessonBody).length,
  reviewRequiredModuleCount: missingModules.length,
  modules,
  adjacentComponentEvidence: componentEvidence,
  releaseGate,
  status: releaseGate.decision,
}, null, 2));
