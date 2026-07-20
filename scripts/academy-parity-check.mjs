import fs from 'node:fs';
import path from 'node:path';

const repo = process.cwd();
const sourcePath = path.resolve(repo, '../kaynaklar/bim_master_platformu_final_g_ncellemesi.html');
const source = fs.readFileSync(sourcePath, 'utf8');
const sectionsFile = fs.readFileSync(path.resolve(repo, 'src/academy/sourceSections.ts'), 'utf8');
const dataFile = fs.readFileSync(path.resolve(repo, 'src/academy/sourceData.ts'), 'utf8');
const contentFile = fs.readFileSync(path.resolve(repo, 'src/pages/CompleteAcademyContent.tsx'), 'utf8');

const fail = message => { throw new Error(`[academy-parity] ${message}`); };
const sourceSections = [...source.matchAll(/id="(sec-[^"]+)"/g)].map(match => match[1]);
const exportedSections = [...sectionsFile.matchAll(/^\s*"(sec-[^"]+)":/gm)].map(match => match[1]);
const unique = values => [...new Set(values)];

if (unique(sourceSections).length !== 13) fail(`source section count changed: ${unique(sourceSections).length}`);
if (unique(exportedSections).length !== unique(sourceSections).length) fail(`section registry mismatch: source=${unique(sourceSections).length}, registry=${unique(exportedSections).length}`);
for (const id of unique(sourceSections)) if (!exportedSections.includes(id)) fail(`missing section registry entry: ${id}`);

const handlers = unique([...source.matchAll(/onclick="\s*([A-Za-z_$][\w$]*)\s*\(/g)].map(match => match[1]));
const mappingBlock = contentFile.slice(contentFile.indexOf('const sourceActions'), contentFile.indexOf('const tabRoutes'));
const tabBlock = contentFile.slice(contentFile.indexOf('const tabRoutes'), contentFile.indexOf('function parseInlineCall'));
const missingHandlers = handlers.filter(handler => !mappingBlock.includes(`${handler}:`) && !(handler === 'switchTab' && tabBlock.includes('switchTab')));
if (missingHandlers.length) fail(`unmapped source handlers: ${missingHandlers.join(', ')}`);

const requiredModels = ['data6D', 'dataLCAStages', 'dataIsoParts', 'dataPyramid', 'dataCdeStates', 'data4D', 'rebarData', 'rbacData', 'clashData', 'curriculumDetailData'];
for (const model of requiredModels) if (!new RegExp(`export const ${model}\\s*=`).test(dataFile)) fail(`missing extracted model: ${model}`);
if (!contentFile.includes('dangerouslySetInnerHTML')) fail('complete source content renderer missing');

console.log(JSON.stringify({
  sourceSections: unique(sourceSections).length,
  registeredSections: unique(exportedSections).length,
  inlineHandlers: handlers.length,
  mappedHandlers: handlers.length - missingHandlers.length,
  extractedModels: requiredModels.length,
  status: 'PASS',
}, null, 2));
