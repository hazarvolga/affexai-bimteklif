import assert from 'node:assert/strict';
import test from 'node:test';
import { dealInput, activityInput, stageInput, dealIntelligenceInput } from './input';

const id = '11111111-1111-4111-8111-111111111111';
test('CRM inputs allow only supported fields and reject invalid amounts/stages', () => {
  const parsed = dealInput.parse({ clientId: id, name: ' Job ', value: '0', companyId: 'spoof', probability: 1 });
  assert.equal(parsed.name, 'Job');
  assert.equal(parsed.value, 0);
  assert.equal('companyId' in parsed, false);
  for (const value of [-1, 'NaN', '', null, Infinity]) assert.equal(dealInput.safeParse({ clientId: id, name: 'Job', value }).success, false);
  assert.equal(stageInput.safeParse({ dealId: id, stage: 'won' }).success, true);
  assert.equal(stageInput.safeParse({ dealId: id, stage: 'hacked' }).success, false);
  assert.equal(activityInput.safeParse({ dealId: id, description: '   ' }).success, false);
  assert.deepEqual(activityInput.parse({ dealId: id, description: 'Note', userId: id, type: 'stage_change' }), { dealId: id, description: 'Note' });
});

test('AI output must be a valid analysis, never a fallback or malformed provider response', () => {
  const analysis = { probability: 0.4, riskLevel: 'medium', recommendedAction: 'Call', expectedCloseValue: 20, insights: 'Review' };
  assert.deepEqual(dealIntelligenceInput.parse(analysis), analysis);
  for (const override of [{ probability: 2 }, { insights: '' }, { riskLevel: 'unknown' }]) {
    assert.equal(dealIntelligenceInput.safeParse({ ...analysis, ...override }).success, false);
  }
});
