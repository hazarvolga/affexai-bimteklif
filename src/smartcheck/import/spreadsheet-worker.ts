import { inspectDocument, parseDocument } from './spreadsheet-parser';
process.once('message', async (input: any) => {
  try {
    const content = Buffer.from(input.content);
    if (content.length > 25 * 1024 * 1024 || !['csv', 'xlsx'].includes(input.kind)) throw new Error('FILE_SIZE_INVALID');
    const result = input.mode === 'preview' ? await inspectDocument(content, input.kind) : await parseDocument(content, input.kind, input.mapping);
    process.send?.({ result }, () => process.exit(0));
  } catch (error) {
    const code = error instanceof Error && /^[A-Z][A-Z_]+$/.test(error.message) ? error.message : 'SPREADSHEET_PARSE_FAILED';
    process.send?.({ error: code }, () => process.exit(1));
  }
});
