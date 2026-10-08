import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Browser, HTTPRequest, LaunchOptions } from 'puppeteer';
import { renderPdf } from './renderer';

function harness(stall?: string, fail?: string) {
  const calls: string[] = [];
  let options: LaunchOptions;
  let content = '';
  let requestHandler: (request: HTTPRequest) => void;
  const action = async (name: string) => {
    calls.push(name);
    if (fail === name) throw new Error(name);
    if (stall === name) await new Promise(() => {});
  };
  const browser = {
    newPage: async () => { await action('newPage'); return page; },
    close: () => action('close'),
    process: () => ({ kill: () => { calls.push('kill'); } }),
  } as unknown as Browser;
  const page = {
    setJavaScriptEnabled: async (enabled: boolean) => { assert.equal(enabled, false); await action('js'); },
    setBypassServiceWorker: async (bypass: boolean) => { assert.equal(bypass, true); await action('worker'); },
    setOfflineMode: async (offline: boolean) => { assert.equal(offline, true); await action('offline'); },
    setRequestInterception: async (enabled: boolean) => { assert.equal(enabled, true); await action('interception'); },
    on: (_event: string, handler: typeof requestHandler) => { requestHandler = handler; },
    setContent: async (html: string, opts: { timeout: number }) => { content = html; assert.ok(opts.timeout > 0); await action('content'); },
    pdf: async (opts: { timeout: number }) => { assert.ok(opts.timeout > 0); await action('pdf'); return Buffer.from('%PDF-1.7'); },
  };
  return {
    calls, browser,
    launch: async (opts: LaunchOptions) => { options = opts; await action('launch'); return browser; },
    get options() { return options; },
    get content() { return content; },
    request: async (url: string, reject = false) => {
      await requestHandler({ url: () => url, abort: async () => { calls.push(`abort:${url}`); if (reject) throw new Error('abort failed'); }, continue: () => assert.fail('No request may continue') } as unknown as HTTPRequest);
    },
  };
}

test('renderer secures the page before loading content and keeps Chromium sandbox enabled', async () => {
  const h = harness();
  assert.equal((await renderPdf('<p>Teklif</p>', { launch: h.launch })).toString(), '%PDF-1.7');
  assert.deepEqual(h.calls, ['launch', 'newPage', 'js', 'worker', 'offline', 'interception', 'content', 'pdf', 'close']);
  assert.ok(!h.options.args?.some(arg => /no-sandbox|disable-setuid-sandbox/.test(arg)));
  assert.ok(h.options.timeout! > 0);
  assert.ok(h.options.protocolTimeout! > 0);
  assert.match(h.content, /Content-Security-Policy/);
  assert.match(h.content, /default-src 'none'/);
  assert.match(h.content, /script-src 'none'/);
  for (const url of ['http://127.0.0.1/private', 'http://169.254.169.254/', 'https://example.com', 'file:///etc/passwd', 'ftp://host/file', 'data:text/html,hi', 'blob:example', 'about:blank']) {
    await h.request(url);
    assert.ok(h.calls.includes(`abort:${url}`));
  }
});

for (const stage of ['launch', 'newPage', 'js', 'worker', 'offline', 'interception', 'content', 'pdf']) {
  test(`renderer closes on ${stage} failure`, async () => {
    const h = harness(undefined, stage);
    await assert.rejects(renderPdf('<p/>', { launch: h.launch }), new RegExp(stage));
    assert.equal(h.calls.includes('close'), stage !== 'launch');
  });
  test(`renderer bounds stalled ${stage}`, async () => {
    const h = harness(stage);
    await assert.rejects(renderPdf('<p/>', { launch: h.launch, timeoutMs: 20, closeTimeoutMs: 10 }), /timed out/);
    assert.equal(h.calls.includes('close'), stage !== 'launch');
  });
}

for (const failure of ['stall', 'reject']) {
  test(`renderer kills Chromium when close ${failure}s`, async () => {
    const h = harness(failure === 'stall' ? 'close' : undefined, failure === 'reject' ? 'close' : undefined);
    await renderPdf('<p/>', { launch: h.launch, closeTimeoutMs: 10 });
    assert.ok(h.calls.includes('kill'));
  });
}

test('renderer closes a browser that launches after the deadline', async () => {
  const h = harness();
  let resolve: (browser: Browser) => void;
  await assert.rejects(renderPdf('<p/>', { launch: () => new Promise(r => { resolve = r; }), timeoutMs: 10 }), /timed out/);
  resolve!(h.browser);
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(h.calls, ['close']);
});

test('request interception failures fail the render closed', async () => {
  const h = harness('pdf');
  const result = renderPdf('<p/>', { launch: h.launch });
  while (!h.calls.includes('pdf')) await new Promise(r => setTimeout(r, 1));
  await h.request('file:///private', true);
  await assert.rejects(result, /abort failed/);
  assert.ok(h.calls.includes('close'));
});

test('invalid or excessive limits fail before launching a browser', async () => {
  for (const timeoutMs of [0, -1, NaN, Infinity, 30001]) {
    const h = harness();
    await assert.rejects(renderPdf('<p/>', { launch: h.launch, timeoutMs }), /limit/i);
    assert.deepEqual(h.calls, []);
  }
});
