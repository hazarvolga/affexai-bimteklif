import assert from 'node:assert/strict';
import test from 'node:test';
import { readIfcEnvironmentLimits } from './ifc-limits';
import { validateProductionEnvironment } from './production';
test('IFC limits accept bounded integers and monthly zero but reject unsafe configuration', () => {
  assert.deepEqual(readIfcEnvironmentLimits({}), { maxFileBytes: 104857600, maxConcurrent: 2, monthlyLimit: null });
  assert.equal(readIfcEnvironmentLimits({ SMARTCHECK_IFC_MONTHLY_LIMIT: '0' }).monthlyLimit, 0);
  for (const key of ['SMARTCHECK_MAX_IFC_FILE_MB', 'SMARTCHECK_IFC_MAX_CONCURRENT', 'SMARTCHECK_IFC_MONTHLY_LIMIT']) {
    for (const value of ['', 'NaN', '1oops', '-1', '1.5', 'Infinity', '9007199254740992']) {
      assert.throws(() => readIfcEnvironmentLimits({ [key]: value }), /INVALID_IFC_LIMIT/);
    }
  }
  assert.throws(() => readIfcEnvironmentLimits({ SMARTCHECK_IFC_MAX_CONCURRENT: '0' }));
  assert.throws(() => readIfcEnvironmentLimits({ SMARTCHECK_MAX_IFC_FILE_MB: '101' }));
  assert.ok(validateProductionEnvironment({ NODE_ENV: 'production', SMARTCHECK_IFC_MAX_CONCURRENT: 'NaN' }).errors.some(error => error.includes('INVALID_IFC_LIMIT')));
});
