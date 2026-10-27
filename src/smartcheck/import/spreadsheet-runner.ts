import { fork } from 'node:child_process';
import path from 'node:path';
import type { ColumnMapping } from './normalize';
import type { DocumentPreview, parseDocument as parser } from './spreadsheet-parser';
let active = 0;
async function run(content: Buffer, kind: 'csv' | 'xlsx', mode: 'preview' | 'parse', mapping?: ColumnMapping): Promise<any> {
  if (content.length > 25 * 1024 * 1024) throw new Error('FILE_SIZE_INVALID');
  if (active >= 2) throw new Error('SPREADSHEET_BUSY');
  active += 1;
  try {
    return await new Promise((resolve, reject) => {
      const production = process.env.NODE_ENV === 'production';
      const child = fork(path.resolve(production ? 'dist/spreadsheet-worker.cjs' : 'src/smartcheck/import/spreadsheet-worker.ts'), [], {
        execArgv: production ? ['--max-old-space-size=256'] : ['--import', 'tsx', '--max-old-space-size=512'],
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'], serialization: 'advanced',
      });
      let result: any;
      let failure: Error | undefined;
      const timer = setTimeout(() => { failure = new Error('SPREADSHEET_TIMEOUT'); child.kill('SIGKILL'); }, 30_000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('message', (message: any) => { result = message.result; if (message.error) failure = new Error(message.error); });
      child.once('exit', code => {
        clearTimeout(timer);
        if (failure || code !== 0 || result === undefined) reject(failure ?? new Error('SPREADSHEET_WORKER_FAILED'));
        else resolve(result);
      });
      child.send({ content, kind, mode, mapping }, error => { if (error) { failure = error; child.kill('SIGKILL'); } });
    });
  } finally { active -= 1; }
}
export const inspectDocument = (content: Buffer, kind: 'csv' | 'xlsx'): Promise<DocumentPreview> => run(content, kind, 'preview');
export const parseDocument = (content: Buffer, kind: 'csv' | 'xlsx', mapping: ColumnMapping): ReturnType<typeof parser> => run(content, kind, 'parse', mapping);
