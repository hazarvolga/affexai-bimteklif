import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  CONTRACTOR_GROUPS, CONTRACTOR_GROUP_ORDER, computeYapiSinirBedeli, evaluateContractorGroups, maxJobTry, minExperienceTry,
  type ContractorInput,
} from './yambis-classification';

// 2026 yapı sınır bedeli: ÇŞB 2026 Yapı Yaklaşık Birim Maliyetleri Tebliği, III. ve IV. sınıf (A, B, C) birim maliyetleri.
const THIRD_AND_FOURTH_CLASS_2026 = [19_800, 21_050, 23_400, 26_450, 33_900, 40_500];
const LIMIT_2026 = 1_238_250_000;

const baseMali = { donenVarliklarTry: 800, kisaVadeliBorclarTry: 1_000, ozKaynaklarTry: 200, toplamAktifTry: 1_000, kisaVadeliBankaBorclariTry: 100 };
const input = (overrides: Partial<ContractorInput> = {}): ContractorInput => ({
  yapiSinirBedeliTry: LIMIT_2026,
  isDeneyimTutariTry: 0,
  yillikUstaIsGucu: 0,
  teknikPersonelIsGucu: 0,
  mali: baseMali,
  cirosuTry: 0,
  ...overrides,
});

test('yapı sınır bedeli: III. ve IV. sınıf ortalamasının 45.000 katı = 2026 için 1.238.250.000 TL', () => {
  assert.equal(computeYapiSinirBedeli(THIRD_AND_FOURTH_CLASS_2026), LIMIT_2026);
});

test('yapı sınır bedeli, depodaki resmî 2026 birim maliyet kataloğundan aynı değeri verir', () => {
  const file = path.resolve(import.meta.dirname, '../server/crawler/data/csb-2026-official-catalogs.json');
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, { rows: { itemCode: string; price: string }[] }>;
  const rows = catalog.csb_2026_yapi_yaklasik_maliyet.rows.filter(row => /^YBM-2026-(III|IV)-[ABC]$/.test(row.itemCode));
  assert.equal(rows.length, 6);
  assert.equal(computeYapiSinirBedeli(rows.map(row => Number(row.price))), LIMIT_2026);
});

test('yapı sınır bedeli girdisi doğrulanır', () => {
  assert.throws(() => computeYapiSinirBedeli([]), RangeError);
  assert.throws(() => computeYapiSinirBedeli([10, 0]), RangeError);
  assert.throws(() => computeYapiSinirBedeli([10, Number.NaN]), RangeError);
});

test('grup eşikleri m.14(1) katsayılarıdır ve 14 grup üstten alta sıralıdır', () => {
  assert.equal(CONTRACTOR_GROUP_ORDER.length, 14);
  assert.equal(minExperienceTry('A', LIMIT_2026), 2_476_500_000);
  assert.equal(minExperienceTry('B', LIMIT_2026), 1_733_550_000);
  assert.equal(minExperienceTry('C', LIMIT_2026), LIMIT_2026);
  assert.equal(minExperienceTry('D', LIMIT_2026), 825_500_000);
  assert.equal(minExperienceTry('E', LIMIT_2026), 412_750_000);
  assert.equal(minExperienceTry('F', LIMIT_2026), 123_825_000);
  assert.equal(minExperienceTry('F1', LIMIT_2026), 105_251_250);
  assert.equal(minExperienceTry('G', LIMIT_2026), 86_677_500);
  assert.equal(minExperienceTry('G1', LIMIT_2026), 61_912_500);
  assert.equal(minExperienceTry('H', LIMIT_2026), null);
  const values = CONTRACTOR_GROUP_ORDER.slice(0, -1).map(code => minExperienceTry(code, LIMIT_2026) as number);
  assert.deepEqual([...values].sort((a, b) => b - a), values, 'eşikler üstten alta azalmalı');
});

test('iş gücü eşikleri yönetmelik m.14(1) ile aynıdır', () => {
  const expected: Record<string, [number, number]> = {
    A: [50, 8], B: [24, 6], B1: [18, 4], C: [12, 3], C1: [10, 3], D: [9, 2], D1: [8, 2],
    E: [6, 2], E1: [5, 2], F: [3, 1], F1: [3, 1], G: [1, 1], G1: [1, 1],
  };
  for (const [code, [usta, teknik]] of Object.entries(expected)) {
    const def = CONTRACTOR_GROUPS[code as keyof typeof CONTRACTOR_GROUPS];
    assert.deepEqual([def.minUstaIsGucu, def.minTeknikPersonelIsGucu], [usta, teknik], code);
  }
});

test('azami iş tutarı m.14(3): B–D1 asgari tutar, E 1,15, E1 4/3, F 2, F1 1,75, G ve G1 1,5, H G1 asgarisinin 5/7\'si, A sınırsız', () => {
  assert.equal(maxJobTry('B', LIMIT_2026), 1_733_550_000);
  assert.equal(maxJobTry('D1', LIMIT_2026), 619_125_000);
  assert.equal(maxJobTry('E', LIMIT_2026), 474_662_500);
  assert.equal(maxJobTry('E1', LIMIT_2026), 330_200_000);
  assert.equal(maxJobTry('F', LIMIT_2026), 247_650_000);
  assert.equal(maxJobTry('F1', LIMIT_2026), 184_189_687.5);
  assert.equal(maxJobTry('G', LIMIT_2026), 130_016_250);
  assert.equal(maxJobTry('G1', LIMIT_2026), 92_868_750);
  assert.equal(Math.round((maxJobTry('H', LIMIT_2026) as number) * 100) / 100, 44_223_214.29);
  assert.equal(maxJobTry('A', LIMIT_2026), 'unlimited');
});

test('"geçen" ifadesi: iş deneyim tutarı eşiğe eşitse grup alınamaz, bir kuruş fazlası yeterlidir', () => {
  const common = { yillikUstaIsGucu: 12, teknikPersonelIsGucu: 3, cirosuTry: 400_000_000, bankaKrediVeyaMevduatTry: 100_000_000, mali: { ...baseMali, donenVarliklarTry: 2_000, kisaVadeliBorclarTry: 1_000 } };
  const equal = evaluateContractorGroups(input({ ...common, isDeneyimTutariTry: LIMIT_2026 }));
  assert.equal(equal.groups.find(g => g.group === 'C')?.eligible, false);
  assert.equal(equal.highestEligibleGroup, 'C1');
  const above = evaluateContractorGroups(input({ ...common, isDeneyimTutariTry: LIMIT_2026 + 0.01 }));
  assert.equal(above.groups.find(g => g.group === 'C')?.eligible, true);
  assert.equal(above.highestEligibleGroup, 'C');
});

test('tam yeterli bir firma en üst uygun grubu alır; ciro eşiği %15 üst gruplarda aranır', () => {
  const full = input({
    isDeneyimTutariTry: 900_000_000, yillikUstaIsGucu: 9, teknikPersonelIsGucu: 2,
    cirosuTry: 123_825_000, // D için asgari 825.500.000 × %15 = 123.825.000
    bankaKrediVeyaMevduatTry: 41_275_000,
    mali: { ...baseMali, donenVarliklarTry: 750, kisaVadeliBorclarTry: 1_000, ozKaynaklarTry: 150, kisaVadeliBankaBorclariTry: 112 },
  });
  const result = evaluateContractorGroups(full);
  assert.equal(result.highestEligibleGroup, 'D');
  const ciro = result.groups.find(g => g.group === 'D')?.criteria.find(c => c.id === 'ciro');
  assert.equal(ciro?.status, 'ok');
  const short = evaluateContractorGroups({ ...full, cirosuTry: 123_824_999 });
  assert.equal(short.groups.find(g => g.group === 'D')?.criteria.find(c => c.id === 'ciro')?.status, 'fail');
  assert.notEqual(short.highestEligibleGroup, 'D');
});

test('mali oranlar: cari oran 0,75 ve öz kaynak 0,15 dahil sağlar; banka borcu / öz kaynak 0,75\'ten KÜÇÜK olmalı', () => {
  const experienceForE = { isDeneyimTutariTry: 500_000_000, yillikUstaIsGucu: 6, teknikPersonelIsGucu: 2, cirosuTry: 100_000_000 };
  const passes = evaluateContractorGroups(input({ ...experienceForE, mali: { ...baseMali, donenVarliklarTry: 750, kisaVadeliBorclarTry: 1_000, ozKaynaklarTry: 150, kisaVadeliBankaBorclariTry: 112 } }));
  assert.equal(passes.groups.find(g => g.group === 'E')?.eligible, true);
  const bankEqual = evaluateContractorGroups(input({ ...experienceForE, mali: { ...baseMali, ozKaynaklarTry: 200, kisaVadeliBankaBorclariTry: 150 } }));
  assert.equal(bankEqual.ratios.bankaBorcuOzKaynakOrani, 0.75);
  assert.equal(bankEqual.groups.find(g => g.group === 'E')?.criteria.find(c => c.id === 'banka_borcu_orani')?.status, 'fail');
  const lowCurrent = evaluateContractorGroups(input({ ...experienceForE, mali: { ...baseMali, donenVarliklarTry: 749, kisaVadeliBorclarTry: 1_000 } }));
  assert.equal(lowCurrent.groups.find(g => g.group === 'E')?.criteria.find(c => c.id === 'cari_oran')?.status, 'fail');
  const lowEquity = evaluateContractorGroups(input({ ...experienceForE, mali: { ...baseMali, ozKaynaklarTry: 149, toplamAktifTry: 1_000 } }));
  assert.equal(lowEquity.groups.find(g => g.group === 'E')?.criteria.find(c => c.id === 'oz_kaynak_orani')?.status, 'fail');
});

test('G ve G1: bilanço oranları ve ciro aranmaz, yalnız banka referans beyanı istenir (m.11(2)); H için hiçbir şart yok (m.11(3))', () => {
  const weakBalanceSheet = { ...baseMali, donenVarliklarTry: 1, ozKaynaklarTry: 1, kisaVadeliBankaBorclariTry: 1_000 };
  const g = evaluateContractorGroups(input({ isDeneyimTutariTry: 90_000_000, yillikUstaIsGucu: 1, teknikPersonelIsGucu: 1, mali: weakBalanceSheet, bankaKrediVeyaMevduatTry: 4_333_875 }));
  assert.equal(g.highestEligibleGroup, 'G');
  const ids = g.groups.find(x => x.group === 'G')?.criteria.map(c => c.id);
  assert.deepEqual(ids, ['is_deneyimi', 'usta', 'teknik_personel', 'banka_referans']);

  const none = evaluateContractorGroups(input({ mali: weakBalanceSheet }));
  assert.equal(none.highestEligibleGroup, 'H');
  assert.deepEqual(none.groups.find(x => x.group === 'H')?.criteria, []);
});

test('banka referans: girilmezse değerlendirilmedi sayılır (grubu engellemez), girilip yetersizse engeller (asgari tutarın %5\'i)', () => {
  const eligible = { isDeneyimTutariTry: 90_000_000, yillikUstaIsGucu: 1, teknikPersonelIsGucu: 1 };
  const missing = evaluateContractorGroups(input(eligible));
  assert.equal(missing.groups.find(x => x.group === 'G')?.criteria.find(c => c.id === 'banka_referans')?.status, 'not_evaluated');
  assert.equal(missing.highestEligibleGroup, 'G');
  const short = evaluateContractorGroups(input({ ...eligible, bankaKrediVeyaMevduatTry: 4_333_874 })); // 86.677.500 × 0,05 = 4.333.875
  assert.equal(short.groups.find(x => x.group === 'G')?.criteria.find(c => c.id === 'banka_referans')?.status, 'fail');
  assert.equal(short.highestEligibleGroup, 'G1');
});

test('iş gücü yetersizse üst grup alınamaz', () => {
  const result = evaluateContractorGroups(input({ isDeneyimTutariTry: 3_000_000_000, yillikUstaIsGucu: 49, teknikPersonelIsGucu: 8, cirosuTry: 1_000_000_000 }));
  assert.equal(result.groups.find(g => g.group === 'A')?.criteria.find(c => c.id === 'usta')?.status, 'fail');
  assert.notEqual(result.highestEligibleGroup, 'A');
});

test('geçersiz girdi reddedilir', () => {
  assert.throws(() => evaluateContractorGroups(input({ yapiSinirBedeliTry: 0 })), RangeError);
  assert.throws(() => evaluateContractorGroups(input({ isDeneyimTutariTry: -1 })), RangeError);
  assert.throws(() => evaluateContractorGroups(input({ cirosuTry: Number.NaN })), RangeError);
});

test('kapsam dışı hükümler sonuçta açıkça belirtilir', () => {
  const result = evaluateContractorGroups(input());
  assert.ok(result.notes.length >= 3);
  assert.ok(result.notes.some(note => note.includes('üç yılın')));
});
