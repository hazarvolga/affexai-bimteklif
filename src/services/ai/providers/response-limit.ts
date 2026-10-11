export async function readAIResponse(response: Response, maxBytes = 256 * 1024): Promise<string> {
 const reader = response.body?.getReader();
 if (!reader) throw new Error('AI_RESPONSE_EMPTY');
 const chunks: Uint8Array[] = [];
 let total = 0;
 try {
  while (true) {
   const {value,done} = await reader.read();
   if (done) break;
   total += value.byteLength;
   if (total > maxBytes) throw new Error('AI_RESPONSE_TOO_LARGE');
   chunks.push(value);
  }
  return Buffer.concat(chunks,total).toString('utf8');
 } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
