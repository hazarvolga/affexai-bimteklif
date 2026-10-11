import assert from 'node:assert/strict';
import test from 'node:test';
import { AIProviderRouter } from './providerRouter';
import type { AIProvider } from './types';

const provider = (name: string, configured: boolean, generateText: (prompt: string, json?: boolean) => Promise<string>): AIProvider => ({
  name, isConfigured: () => configured, generateText,
  generateQuotation: async () => { throw new Error('unused'); },
  improveQuotation: async () => [],
});

test('shared text router skips unconfigured providers and falls back for CRM/profit/regulations', async () => {
  const calls: string[] = [];
  const router = new AIProviderRouter([
    provider('off', false, async () => { assert.fail('unconfigured called'); }),
    provider('primary', true, async () => { calls.push('primary'); throw new Error('failure'); }),
    provider('secondary', true, async (prompt, json) => { calls.push('secondary'); assert.equal(prompt, 'context'); assert.equal(json, true); return '{"ok":true}'; }),
  ]);
  assert.equal(await router.generateText('context', true), '{"ok":true}');
  assert.deepEqual(calls, ['primary', 'secondary']);
});

test('shared text router does not expose upstream response or credentials on failure', async () => {
  const router = new AIProviderRouter([provider('primary', true, async () => { throw new Error('private-request-content'); })]);
  await assert.rejects(router.generateText('context'), error => error instanceof Error && !error.message.includes('private-request-content'));
});
