import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { emptyImportMessage } from './import-progress';
test('empty state distinguishes before upload, processing, successful empty, failed, and unreadable', () => {
 assert.match(emptyImportMessage('idle'), /Dosya/); assert.match(emptyImportMessage('processing'), /işleniyor/i);
 assert.match(emptyImportMessage('empty'), /satır bulunamadı/i); assert.match(emptyImportMessage('failed'), /başarısız/i);
 assert.match(emptyImportMessage('error'), /yüklenemedi/i);
});
