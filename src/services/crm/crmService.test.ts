import assert from 'node:assert/strict';
import test from 'node:test';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CRMIntelligenceService } from './crmService';

test('provider errors and malformed analysis reject instead of reporting fake success', async (t) => {
  const model = t.mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', (() => ({ generateContent: async () => { throw new Error('provider unavailable'); } })) as any);
  const service = new CRMIntelligenceService('test-only');
  await assert.rejects(service.analyzeDeal({}, {}, {}));
  model.mock.mockImplementation((() => ({ generateContent: async () => ({ response: { text: () => '{"probability":9}' } }) })) as any);
  await assert.rejects(service.analyzeDeal({}, {}, {}));
});
