/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { TOUR_STEPS } from './SystemQuickTour.js';

test('SystemQuickTour defines 5 distinct workflow steps covering all user stages', () => {
  assert.equal(TOUR_STEPS.length, 5, 'Quick tour must contain exactly 5 steps');

  const targets = TOUR_STEPS.map((s) => s.targetSelector);
  assert.ok(
    targets.includes('[data-tour="workflow-hub"]'),
    'Step 1 must target workflow-hub'
  );
  assert.ok(
    targets.includes('[data-tour="smartcheck-action"]'),
    'Step 2 must target smartcheck-action'
  );
  assert.ok(
    targets.includes('[data-tour="subcontractor-shield"]'),
    'Step 3 must target subcontractor-shield'
  );
  assert.ok(
    targets.includes('[data-tour="public-procurement"]'),
    'Step 4 must target public-procurement'
  );
  assert.ok(
    targets.includes('[data-tour="blueprint-header"]'),
    'Step 5 must target blueprint-header'
  );

  // Check that every step has title, badge, and descriptive text
  for (const step of TOUR_STEPS) {
    assert.ok(step.title.length > 5, `Step title must not be empty: ${step.title}`);
    assert.ok(step.badge.length > 3, `Step badge must not be empty: ${step.badge}`);
    assert.ok(
      step.description.length > 20,
      `Step description must be detailed: ${step.description}`
    );
  }
});
