import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import ExcelJS from 'exceljs';

const require = createRequire(import.meta.url);

test('proxy trust rejects short IPv4-mapped subnet spoofing', () => {
  const proxyaddr = createRequire(require.resolve('express'))('proxy-addr');
  assert.equal(proxyaddr.compile('::ffff:10.0.0.0/8')('203.0.113.7', 0), false);
  assert.equal(proxyaddr.compile('10.0.0.0/8')('10.1.2.3', 0), true);
  assert.equal(proxyaddr.compile('10.0.0.0/8')('203.0.113.7', 0), false);
});

test('ExcelJS retains XLSX roundtrip and uuid CommonJS compatibility', async () => {
  const { v4 } = createRequire(require.resolve('exceljs'))('uuid');
  assert.match(v4(), /^[0-9a-f-]{36}$/);
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Quantities').addRow(['Concrete', 12.5]);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.equal(loaded.getWorksheet('Quantities')!.getCell('B1').value, 12.5);
});

test('Prisma config retains deepmerge CommonJS API', () => {
  const prisma = createRequire(require.resolve('prisma/package.json'));
  const config = createRequire(prisma.resolve('@prisma/config'));
  const { deepmerge } = config('deepmerge-ts');
  assert.deepEqual(deepmerge({ db: { host: 'localhost' } }, { db: { port: 5432 } }), { db: { host: 'localhost', port: 5432 } });
});
