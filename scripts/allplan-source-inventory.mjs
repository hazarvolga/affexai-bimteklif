import fs from 'node:fs';
import path from 'node:path';

const repo = process.cwd();
const sourceRoot = path.resolve(repo, '../allplanAkademi-main');
const read = relative => fs.readFileSync(path.join(sourceRoot, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(sourceRoot, relative));
const count = (text, pattern) => (text.match(pattern) ?? []).length;

const constants = read('src/constants.ts');
const lessons = read('src/data/lessonsContent.ts');
const firebase = read('src/lib/firebase.ts');
const rules = read('firestore.rules');
const componentFiles = fs.readdirSync(path.join(sourceRoot, 'src/components')).filter(file => file.endsWith('.tsx'));
const componentText = componentFiles.map(file => read(`src/components/${file}`)).join('\n');

const lessonKeys = [...lessons.matchAll(/^  ['"]([^'"]+)['"]:\s*{/gm)].map(match => match[1]);
const moduleTitles = [...constants.matchAll(/id:\s*['"]p\d+-c\d+-m\d+['"],\s*title:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
const interactiveTools = [...lessons.matchAll(/interactiveTool:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
const exportedComponents = [...componentText.matchAll(/export const ([A-Z][A-Za-z0-9_]*)/g)].map(match => match[1]);
const sourceWarnings = [
  rules.includes('allow read, write: if true') && 'Firestore rules allow unrestricted read/write',
  firebase.includes('default_user') && 'Progress storage uses a shared default user id',
  firebase.includes('droneracingturkey@gmail.com') && 'Trainee identity is hard-coded in the data layer',
  lessons.includes('getLessonDetail') && 'Unknown lessons receive generated fallback content',
].filter(Boolean);

const report = {
  sourceRoot,
  courseTree: {
    paths: count(constants, /type:\s*'path'/g),
    courses: count(constants, /type:\s*'course'/g),
    modules: count(constants, /type:\s*'module'/g),
    declaredLessonText: lessonKeys.length,
  },
  content: {
    lessonDetailKeys: lessonKeys,
    lessonDetailCount: lessonKeys.length,
    interactiveToolRefs: [...new Set(interactiveTools)],
    interactiveToolRefCount: interactiveTools.length,
    coveredModuleCount: moduleTitles.filter(title => lessonKeys.includes(title)).length,
    reviewRequiredModuleCount: moduleTitles.filter(title => !lessonKeys.includes(title)).length,
    coveragePercent: moduleTitles.length ? Math.round((moduleTitles.filter(title => lessonKeys.includes(title)).length / moduleTitles.length) * 100) : 0,
    missingLessonTitles: moduleTitles.filter(title => !lessonKeys.includes(title)),
  },
  components: {
    fileCount: componentFiles.length,
    exportedComponentCount: exportedComponents.length,
    exportedComponents,
  },
  persistence: {
    firebaseModulePresent: exists('src/lib/firebase.ts'),
    firestoreRulesPresent: exists('firestore.rules'),
    authModulePresent: exists('src/lib/auth.ts') || exists('src/lib/authentication.ts'),
  },
  risks: sourceWarnings,
  status: sourceWarnings.length > 0 ? 'REVIEW_REQUIRED' : 'PASS',
};

console.log(JSON.stringify(report, null, 2));
