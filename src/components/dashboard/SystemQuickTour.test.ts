/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { USER_TOUR_STEPS } from '../tour/user-tour-steps.js';

test('Panel adımlarının hedeflediği data-tour öğeleri Panel bileşenlerinde gerçekten var', () => {
  const sources = ['src/pages/Dashboard.tsx', 'src/components/dashboard/ContractorWorkflowHub.tsx']
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  const panelTargets = USER_TOUR_STEPS.filter((step) => step.route === '/app' && step.targetSelector).map((step) => step.targetSelector!);
  assert.ok(panelTargets.length >= 4);
  for (const selector of panelTargets) {
    const name = /data-tour="([^"]+)"/.exec(selector)?.[1];
    assert.ok(name && sources.includes(`data-tour="${name}"`), `Panelde hedef yok: ${selector}`);
  }
});
