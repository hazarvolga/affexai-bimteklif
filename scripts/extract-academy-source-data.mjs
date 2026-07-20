import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourcePath = path.resolve(repoRoot, '../kaynaklar/bim_master_platformu_final_g_ncellemesi.html');
const outputPath = path.resolve(repoRoot, 'src/academy/sourceData.ts');
const sectionsOutputPath = path.resolve(repoRoot, 'src/academy/sourceSections.ts');
const source = fs.readFileSync(sourcePath, 'utf8');

const ranges = [
  ['data6D', 'const data6D =', '        const rebarData'],
  ['rebarData', 'const rebarData =', '\n\n        // Global Chart Instances'],
  ['data4D', 'const data4D =', '\n\n        function simulate4D'],
  ['rbacData', 'const rbacData =', '\n\n        function checkRBAC'],
  ['clashData', 'const clashData =', '\n\n        function showClashInfo'],
  ['curriculumDetailData', 'const curriculumDetailData =', '\n\n        function showCurriculumDetail'],
  ['dataIsoParts', 'const dataIsoParts =', '\n\n        const dataPyramid'],
  ['dataPyramid', 'const dataPyramid =', '\n\n        const dataCdeStates'],
  ['dataCdeStates', 'const dataCdeStates =', '\n\n        const dataLCAStages'],
  ['dataLCAStages', 'const dataLCAStages =', '\n\n        function simulateLCA'],
];

const blocks = ranges.map(([name, startMarker, endMarker]) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`Could not extract ${name}`);
  return source.slice(start, end).trim().replace(/^const /, 'export const ');
});

const output = `/**
 * Source-derived BIMPlan Academy data.
 *
 * Generated from kaynaklar/bim_master_platformu_final_g_ncellemesi.html.
 * Do not summarize or hand-edit the extracted source blocks. Add native
 * presentation logic around these data models and keep provenance visible.
 */

${blocks.join('\n\n')}
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
const sectionMatches = [...source.matchAll(/^[ \t]*<div id="(sec-[^"]+)"/gm)];
const sections = Object.fromEntries(sectionMatches.map((match, index) => {
  const start = match.index;
  const end = sectionMatches[index + 1]?.index ?? source.indexOf('\n        <script>', start);
  return [match[1], source.slice(start, end).trim()];
}));
fs.writeFileSync(sectionsOutputPath, `/** Exact section content extracted from the BIMPlan Academy source HTML. */\nexport const sourceSections = ${JSON.stringify(sections, null, 2)} as const;\n`);
console.log(`Extracted ${blocks.length} source data models to ${outputPath}`);
console.log(`Extracted ${Object.keys(sections).length} complete source sections to ${sectionsOutputPath}`);
