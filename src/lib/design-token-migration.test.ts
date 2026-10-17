import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateSource } from '../../scripts/migrate-design-tokens.mjs';

const run = (source: string): string => (migrateSource(source) as { out: string }).out;

test('nötr yüzey, çizgi ve metin sınıfları köprüyle aynı token\'lara çevrilir', () => {
  assert.equal(
    run('<div className="bg-zinc-950 text-zinc-400 border border-zinc-800 p-4" />'),
    '<div className="bg-background text-muted-foreground border border-border p-4" />',
  );
  assert.equal(run('"bg-zinc-900/50 border-zinc-700"'), '"bg-card border-border"');
  assert.equal(run('"bg-slate-800/60 divide-zinc-800/70"'), '"bg-surface-elevated divide-border"');
  assert.equal(run('"text-zinc-200"'), '"text-foreground"');
  assert.equal(run('"text-slate-300"'), '"text-foreground dark:text-muted-foreground"');
});

test('önek taşıyan nötr sınıflar (hover:, md:) pafta tokenlarına çevrilir; doymuş renkli öğede hover:text-white korunur', () => {
  const src = '"hover:bg-zinc-800 md:bg-zinc-900 text-indigo-300 bg-emerald-600 hover:text-white"';
  assert.equal(run(src), '"hover:bg-surface-elevated md:bg-card text-indigo-300 bg-emerald-600 hover:text-white"');
  assert.equal(run('"hover:bg-zinc-800 hover:text-white"'), '"hover:bg-surface-elevated hover:text-foreground"');
});

test('text-white yalnız doymuş arka planı olmayan öğede çevrilir', () => {
  assert.equal(run('"text-white font-bold"'), '"text-foreground font-bold"');
  assert.equal(run('"bg-indigo-600 text-white"'), '"bg-indigo-600 text-white"');
  assert.equal(run('"bg-red-700 hover:bg-red-800 text-white"'), '"bg-red-700 hover:bg-red-800 text-white"');
  assert.equal(
    run("`${active ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`"),
    "`${active ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-white'}`",
  );
});

test('sınıf içermeyen metinler ve benzer adlı sınıflar bozulmaz', () => {
  assert.equal(run('"Beyaz metin: text-whiteboard bg-zinc-9500"'), '"Beyaz metin: text-whiteboard bg-zinc-9500"');
  assert.equal(run('const x = "merhaba dünya";'), 'const x = "merhaba dünya";');
});
