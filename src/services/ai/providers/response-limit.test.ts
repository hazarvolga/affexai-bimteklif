import assert from 'node:assert/strict';
import test from 'node:test';
import { readAIResponse } from './response-limit';
test('AI response reader bounds streamed bodies even without content-length', async () => {
 const small = new Response('{"choices":[]}');
 assert.equal(await readAIResponse(small,32),'{"choices":[]}');
 await assert.rejects(readAIResponse(new Response('x'.repeat(33)),32),/AI_RESPONSE_TOO_LARGE/);
});
