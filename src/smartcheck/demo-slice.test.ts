/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  demoReducer,
  hydrateDemoState,
  persistDemoState,
  defaultState,
  demoAcademyContent,
  demoRules,
  DemoFinding,
  initialFindings
} from './SmartCheckDemoContext';

// Mock localStorage for isolated node test environment
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: (index: number) => Object.keys(mockStorage)[index] || null,
  length: 0
};

test('SmartCheck Demo Vertical Slice v0 - Comprehensive Contract Verification', async (t) => {

  await t.test('1. Başlangıç state’i idle durumundadır.', () => {
    localStorage.removeItem('teklifpro.smartcheck.demo.v1');
    const state = hydrateDemoState();
    assert.strictEqual(state.checkRunStatus, 'idle');
  });

  await t.test('2. Demo check run üç Finding oluşturur.', () => {
    const state = demoReducer(defaultState, { type: 'START_DEMO_CHECK' });
    assert.strictEqual(state.checkRunStatus, 'completed');
    assert.strictEqual(state.findings.length, 3);
  });

  await t.test('3. Üç canonical skill code doğru kullanılır.', () => {
    const skillCodes = demoRules.map(r => r.skillCode);
    assert.ok(skillCodes.includes('quantity.unit_mapping'));
    assert.ok(skillCodes.includes('allplan.reinforcement.cover'));
    assert.ok(skillCodes.includes('allplan.wall.priority'));
  });

  await t.test('4. Poz Finding’i doğru demo metadata’sı taşır.', () => {
    const findingA = initialFindings.find(f => f.id === 'finding-a')!;
    assert.strictEqual(findingA.sourceType, 'demo_dictionary');
    assert.strictEqual(findingA.authorityStatus, 'unverified_demo_data');
    assert.strictEqual(findingA.ruleType, 'demo_dictionary_mapping');
    assert.strictEqual(findingA.skillCode, 'quantity.unit_mapping');
  });

  await t.test('5. İki model Finding’i doğru simulated metadata’sı taşır.', () => {
    const findingB = initialFindings.find(f => f.id === 'finding-b')!;
    const findingC = initialFindings.find(f => f.id === 'finding-c')!;

    assert.strictEqual(findingB.sourceType, 'simulated_model_finding');
    assert.strictEqual(findingB.authorityStatus, 'non_authoritative_demo');
    assert.strictEqual(findingB.ruleType, 'demo_engineering_rule');
    assert.strictEqual(findingB.scenarioLabel, 'XC3 demo scenario');

    assert.strictEqual(findingC.sourceType, 'simulated_model_finding');
    assert.strictEqual(findingC.authorityStatus, 'non_authoritative_demo');
    assert.strictEqual(findingC.ruleType, 'demo_office_rule');
    assert.strictEqual(findingC.sourceName, 'Demo Office Modeling Standard');
  });

  await t.test('6. Fix action Finding’i doğrudan resolved yapmaz.', () => {
    let state = demoReducer(defaultState, { type: 'START_DEMO_CHECK' });
    state = demoReducer(state, {
      type: 'APPLY_DEMO_FIX',
      payload: { field: 'reinforcementCoverMm', value: 35 }
    });

    const findingB = state.findings.find(f => f.id === 'finding-b')!;
    assert.strictEqual(findingB.currentValue, 35);
    // Value changes but status must remain open or in_progress (not resolved yet)
    assert.notStrictEqual(findingB.status, 'resolved');
  });

  await t.test('7. Doğru değerle re-check Finding’i resolved yapar.', () => {
    let state = demoReducer(defaultState, { type: 'START_DEMO_CHECK' });
    state = demoReducer(state, {
      type: 'APPLY_DEMO_FIX',
      payload: { field: 'reinforcementCoverMm', value: 35 }
    });
    state = demoReducer(state, { type: 'RUN_RECHECK' });

    const findingB = state.findings.find(f => f.id === 'finding-b')!;
    assert.strictEqual(findingB.status, 'resolved');
  });

  await t.test('8. Hatalı değerle re-check Finding’i open bırakır.', () => {
    let state = demoReducer(defaultState, { type: 'START_DEMO_CHECK' });
    state = demoReducer(state, {
      type: 'APPLY_DEMO_FIX',
      payload: { field: 'reinforcementCoverMm', value: 20 }
    });
    state = demoReducer(state, { type: 'RUN_RECHECK' });

    const findingB = state.findings.find(f => f.id === 'finding-b')!;
    assert.strictEqual(findingB.status, 'open');
  });

  await t.test('9. Daha önce resolved olan değer yeniden bozulursa re-check ile Finding tekrar open olur.', () => {
    let state = demoReducer(defaultState, { type: 'START_DEMO_CHECK' });

    // First fix it to correct value
    state = demoReducer(state, {
      type: 'APPLY_DEMO_FIX',
      payload: { field: 'reinforcementCoverMm', value: 35 }
    });
    state = demoReducer(state, { type: 'RUN_RECHECK' });
    assert.strictEqual(state.findings.find(f => f.id === 'finding-b')!.status, 'resolved');

    // Now break it again to 25 mm
    state = demoReducer(state, {
      type: 'APPLY_DEMO_FIX',
      payload: { field: 'reinforcementCoverMm', value: 25 }
    });
    state = demoReducer(state, { type: 'RUN_RECHECK' });
    assert.strictEqual(state.findings.find(f => f.id === 'finding-b')!.status, 'open');
  });

  await t.test('10. quantity.unit_mapping merkezi Akademi içeriğine eşleşir.', () => {
    const mapping = demoAcademyContent.find(c => c.skillCode === 'quantity.unit_mapping')!;
    assert.strictEqual(mapping.domain, 'proposal_quantity');
    assert.strictEqual(mapping.slug, 'quantity-unit-mapping');
  });

  await t.test('11. quantity.unit_mapping ALLPLAN route’una yönlenmez (no productCode).', () => {
    const mapping = demoAcademyContent.find(c => c.skillCode === 'quantity.unit_mapping')!;
    assert.strictEqual(mapping.productCode, undefined);
  });

  await t.test('12. allplan.reinforcement.cover doğru ALLPLAN içeriğine eşleşir.', () => {
    const mapping = demoAcademyContent.find(c => c.skillCode === 'allplan.reinforcement.cover')!;
    assert.strictEqual(mapping.productCode, 'ALLPLAN');
    assert.strictEqual(mapping.slug, 'reinforcement-cover');
  });

  await t.test('13. allplan.wall.priority doğru ALLPLAN içeriğine eşleşir.', () => {
    const mapping = demoAcademyContent.find(c => c.skillCode === 'allplan.wall.priority')!;
    assert.strictEqual(mapping.productCode, 'ALLPLAN');
    assert.strictEqual(mapping.slug, 'wall-priority');
  });

  await t.test('14. Geçerli schema v1 state hydrate edilir.', () => {
    const testState = {
      checkRunStatus: 'completed' as const,
      values: { quantityUnit: 'm³', reinforcementCoverMm: 35, wallPriority: 500 },
      findings: initialFindings
    };
    persistDemoState(testState);

    const loaded = hydrateDemoState();
    assert.strictEqual(loaded.checkRunStatus, 'completed');
    assert.strictEqual(loaded.values.quantityUnit, 'm³');
  });

  await t.test('15. Bozuk JSON başlangıç state’ine döner.', () => {
    localStorage.setItem('teklifpro.smartcheck.demo.v1', '{invalid-json}');
    const loaded = hydrateDemoState();
    assert.strictEqual(loaded.checkRunStatus, 'idle');
  });

  await t.test('16. Yanlış schema version başlangıç state’ine döner.', () => {
    const testState = {
      schemaVersion: 2,
      state: defaultState
    };
    localStorage.setItem('teklifpro.smartcheck.demo.v1', JSON.stringify(testState));

    const loaded = hydrateDemoState();
    assert.strictEqual(loaded.checkRunStatus, 'idle');
  });

  await t.test('17. Geçersiz state shape başlangıç state’ine döner.', () => {
    const testState = {
      schemaVersion: 1,
      state: {
        checkRunStatus: 'invalid_status',
        values: {},
        findings: null
      }
    };
    localStorage.setItem('teklifpro.smartcheck.demo.v1', JSON.stringify(testState));

    const loaded = hydrateDemoState();
    assert.strictEqual(loaded.checkRunStatus, 'idle');
  });

  await t.test('18. Reset context state’ini başlangıca döndürür.', () => {
    const state = demoReducer(defaultState, { type: 'RESET_DEMO' });
    assert.strictEqual(state.checkRunStatus, 'idle');
  });

  await t.test('19. Reset local storage kaydını kaldırır.', () => {
    const testState = {
      checkRunStatus: 'completed' as const,
      values: { quantityUnit: 'm³', reinforcementCoverMm: 35, wallPriority: 500 },
      findings: initialFindings
    };
    persistDemoState(testState);

    demoReducer(testState, { type: 'RESET_DEMO' });
    assert.strictEqual(localStorage.getItem('teklifpro.smartcheck.demo.v1'), null);
  });

  await t.test('20. Route değişimiyle ilişkili state serialization/hydration kaybolmaz.', () => {
    const testState = {
      checkRunStatus: 'completed' as const,
      values: { quantityUnit: 'm³', reinforcementCoverMm: 45, wallPriority: 700 },
      findings: initialFindings
    };
    persistDemoState(testState);

    const loaded = hydrateDemoState();
    assert.strictEqual(loaded.values.reinforcementCoverMm, 45);
    assert.strictEqual(loaded.values.wallPriority, 700);
  });

});
