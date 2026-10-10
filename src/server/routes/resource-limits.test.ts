import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiApp } from '../app';
import { renderPdf } from '../../services/pdf/renderer';

test('pilot applications rejects missing or invalid email format', async () => {
  const app = createApiApp();
  const server = app.listen(0);
  const address = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${address.port}/api/pilot-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Ali Veli', companyName: 'Insaat A.S.', email: 'not-an-email' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as { error: string };
    assert.match(body.error, /Eksik veya geçersiz/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

test('PDF renderer semaphore bounds concurrent executions', async () => {
  let activeCount = 0;
  let maxActive = 0;

  const mockLaunch = async () => {
    activeCount++;
    if (activeCount > maxActive) maxActive = activeCount;
    await new Promise((r) => setTimeout(r, 50));
    activeCount--;

    return {
      newPage: async () => ({
        setJavaScriptEnabled: async () => {},
        setBypassServiceWorker: async () => {},
        setOfflineMode: async () => {},
        setRequestInterception: async () => {},
        on: () => {},
        setContent: async () => {},
        pdf: async () => Buffer.from('%PDF-1.7'),
      }),
      close: async () => {},
      process: () => ({ kill: () => {} }),
    } as any;
  };

  // Launch 5 concurrent render requests
  const renders = Promise.all([
    renderPdf('<p>1</p>', { launch: mockLaunch }),
    renderPdf('<p>2</p>', { launch: mockLaunch }),
    renderPdf('<p>3</p>', { launch: mockLaunch }),
    renderPdf('<p>4</p>', { launch: mockLaunch }),
    renderPdf('<p>5</p>', { launch: mockLaunch }),
  ]);

  await renders;
  // Semaphore capacity is 2; maxActive must not exceed 2
  assert.ok(maxActive <= 2, `Expected maxActive <= 2, got ${maxActive}`);
});
