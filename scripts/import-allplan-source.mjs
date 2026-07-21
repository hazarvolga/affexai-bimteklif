import fs from 'node:fs';
import path from 'node:path';

const repo = process.cwd();
const sourceRoot = path.resolve(repo, '../allplanAkademi-main/src');
const targetRoot = path.resolve(repo, 'src/academy/allplan/source');
fs.mkdirSync(targetRoot, { recursive: true });

const lessons = fs.readFileSync(path.join(sourceRoot, 'data/lessonsContent.ts'), 'utf8');
const constants = fs.readFileSync(path.join(sourceRoot, 'constants.ts'), 'utf8').replace(/^import React from 'react';\s*/m, '');
const header = '// Generated from allplanAkademi-main. Do not edit manually; rerun scripts/import-allplan-source.mjs.\n';

fs.writeFileSync(path.join(targetRoot, 'lessonsContent.ts'), `${header}\n${lessons}`);
fs.writeFileSync(path.join(targetRoot, 'constants.ts'), `${header}\n${constants}`);
console.log(JSON.stringify({ sourceRoot, targetRoot, imported: ['lessonsContent.ts', 'constants.ts'], status: 'PASS' }, null, 2));
