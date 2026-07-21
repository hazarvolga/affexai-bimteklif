import fs from 'node:fs';
import path from 'node:path';
import reviewData from '../src/academy/allplan/contentReviewRecords.json' with { type: 'json' };
import { evaluateAllplanContentReview } from '../src/academy/allplan/releaseGate.ts';

const repo = process.cwd();
const sourceRoot = path.resolve(repo, '../allplanAkademi-main');
const read = relative => fs.readFileSync(path.join(sourceRoot, relative), 'utf8');
const constants = read('src/constants.ts');
const lessons = read('src/data/lessonsContent.ts');
const lessonKeys = [...lessons.matchAll(/^  ['"]([^'"]+)['"]:\s*{/gm)].map(match => match[1]);
const structuralBlock = constants.match(/id:\s*'p3',[\s\S]*?(?=\n\s*\{\n\s*id:\s*'p4')/)?.[0];

if (!structuralBlock) throw new Error('[allplan-structural-audit] p3 Structural Engineering path not found');

const modules = [...structuralBlock.matchAll(/id:\s*'([^']+)',\s*title:\s*'([^']+)',\s*type:\s*'module'/g)].map(([, sourceId, title]) => {
  const hasDetailedLessonBody = lessonKeys.includes(title);
  const reviewGate = evaluateAllplanContentReview(reviewData.records[sourceId]);
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
