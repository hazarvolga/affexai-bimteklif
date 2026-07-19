import { test } from 'node:test';
import assert from 'node:assert';
import {
  normalizeUnicode,
  foldCaseTurkish,
  normalizeWhitespace,
  normalizeNumeric,
  normalizeUnit,
  normalizeText
} from './normalize';

test('normalize: unicode NFC normalization', () => {
  // \u00C5 (Å) ve \u0041\u030A (A + combiner circle) NFC'de aynı olmalıdır
  const combined = '\u0041\u030A';
  const expected = '\u00C5';
  assert.strictEqual(normalizeUnicode(combined), expected);
});

test('normalize: Turkish case folding (I/İ/ı/i)', () => {
  assert.strictEqual(foldCaseTurkish('I'), 'ı');
  assert.strictEqual(foldCaseTurkish('İ'), 'i');
  assert.strictEqual(foldCaseTurkish('Ş'), 'ş');
  assert.strictEqual(foldCaseTurkish('Ç'), 'ç');
  assert.strictEqual(foldCaseTurkish('ISPARTA'), 'ısparta');
  assert.strictEqual(foldCaseTurkish('İSTANBUL'), 'istanbul');
});

test('normalize: consecutive whitespace removal', () => {
  assert.strictEqual(normalizeWhitespace('  hello   world  '), 'hello world');
  assert.strictEqual(normalizeWhitespace('hello\n\tworld'), 'hello world');
});

test('normalize: numeric stabilization', () => {
  assert.strictEqual(normalizeNumeric('1.000'), '1.000');
  assert.strictEqual(normalizeNumeric('1,0'), '1');
  assert.strictEqual(normalizeNumeric('1.0'), '1');
  assert.strictEqual(normalizeNumeric('123,45'), '123.45');
  assert.strictEqual(normalizeNumeric('1.250,50'), '1250.5');
  assert.strictEqual(normalizeNumeric('1,250.50'), '1250.5');
  assert.strictEqual(normalizeNumeric('abc'), 'abc'); // sayısal olmayan
});

test('normalize: unit standardization', () => {
  assert.strictEqual(normalizeUnit('adet'), 'pcs');
  assert.strictEqual(normalizeUnit('Tane'), 'pcs');
  assert.strictEqual(normalizeUnit('pieces '), 'pcs');
  assert.strictEqual(normalizeUnit('metre'), 'm');
  assert.strictEqual(normalizeUnit('m2'), 'm2');
  assert.strictEqual(normalizeUnit('metreküp'), 'm3');
  assert.strictEqual(normalizeUnit('BilinmeyenBirim'), 'bilinmeyenbirim');
});

test('normalize: composite text normalization', () => {
  assert.strictEqual(normalizeText('  KOLON  Pozu   '), 'kolon pozu');
});
