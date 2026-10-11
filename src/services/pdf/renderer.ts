import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer';

const RENDER_TIMEOUT_MS = 30_000;
const CLOSE_TIMEOUT_MS = 2_000;
const CSP = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

interface RenderOptions {
  launch?: (options: LaunchOptions) => Promise<Browser>;
  timeoutMs?: number;
  closeTimeoutMs?: number;
  acquireTimeoutMs?: number;
  signal?: AbortSignal;
}

export class PdfRenderError extends Error {
  constructor(readonly code: 'PDF_QUEUE_FULL' | 'PDF_QUEUE_TIMEOUT' | 'PDF_REQUEST_ABORTED', readonly status: 429 | 503 | 499) {
    super(code);
  }
}
const aborted = () => new PdfRenderError('PDF_REQUEST_ABORTED', 499);

function limit(value: number, maximum: number): number {
  if (!Number.isInteger(value) || value <= 0 || value > maximum) {
    throw new Error('Invalid PDF renderer time limit');
  }
  return value;
}

async function closeBrowser(browser: Browser, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    await Promise.race([
      browser.close(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('PDF cleanup timed out')), timeoutMs);
      }),
    ]);
  } catch {
    // A wedged DevTools connection must not leave a Chromium process running.
    try { browser.process()?.kill('SIGKILL'); } catch { /* Process may already have exited. */ }
  } finally {
    clearTimeout(timer!);
  }
}

async function renderPage(browser: Browser, html: string, timeoutMs: number): Promise<Buffer> {
  const page = await browser.newPage();
  let denyFailed: (reason: unknown) => void;
  const policyFailure = new Promise<never>((_, reject) => { denyFailed = reject; });
  const work = async () => {
    await page.setJavaScriptEnabled(false);
    await page.setBypassServiceWorker(true);
    await page.setOfflineMode(true);
    page.on('request', request => {
      // No URLs are allowlisted, including localhost, metadata, file and data URLs.
      void request.abort('blockedbyclient').catch(denyFailed);
    });
    await page.setRequestInterception(true);
    await page.setContent(`<!DOCTYPE html><meta http-equiv="Content-Security-Policy" content="${CSP}">${html}`, {
      waitUntil: 'domcontentloaded', timeout: timeoutMs,
    });
    const pdf = await page.pdf({
      format: 'A4', printBackground: true, timeout: timeoutMs,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });
    return Buffer.from(pdf);
  };
  return Promise.race([work(), policyFailure]);
}

class Semaphore {
  private queue: (() => void)[] = [];
  constructor(private capacity: number, private readonly maxWaiting = 8) {}
  private lease() {
    let released = false;
    return () => { if (!released) { released = true; this.release(); } };
  }
  async acquire(timeoutMs: number, signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) throw aborted();
    if (this.capacity > 0) {
      this.capacity--;
      return this.lease();
    }
    if (this.queue.length >= this.maxWaiting) throw new PdfRenderError('PDF_QUEUE_FULL', 429);
    return new Promise((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); };
      const fail = (error: PdfRenderError) => {
        this.queue = this.queue.filter(entry => entry !== grant);
        cleanup();
        reject(error);
      };
      const grant = () => { cleanup(); resolve(this.lease()); };
      const cancel = () => fail(aborted());
      const timer = setTimeout(() => fail(new PdfRenderError('PDF_QUEUE_TIMEOUT', 503)), timeoutMs);
      this.queue.push(grant);
      signal?.addEventListener('abort', cancel, { once: true });
    });
  }
  private release() {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.capacity++;
    }
  }
}

const renderSemaphore = new Semaphore(2);

/** Offline, scriptless, sandboxed rendering with a deadline covering every stage. */
export async function renderPdf(html: string, options: RenderOptions = {}): Promise<Buffer> {
  const timeoutMs = limit(options.timeoutMs ?? RENDER_TIMEOUT_MS, RENDER_TIMEOUT_MS);
  const closeTimeoutMs = limit(options.closeTimeoutMs ?? CLOSE_TIMEOUT_MS, CLOSE_TIMEOUT_MS);
  const acquireTimeoutMs = limit(options.acquireTimeoutMs ?? 5_000, RENDER_TIMEOUT_MS);
  const release = await renderSemaphore.acquire(acquireTimeoutMs, options.signal);
  let browser: Browser | undefined;
  let expired = false;
  let timer: ReturnType<typeof setTimeout>;
  let cancel: () => void = () => {};
  let launchInFlight = true;

  const work = async () => {
    try {
      if (options.signal?.aborted) throw aborted();
      const launched = await (options.launch ?? (opts => puppeteer.launch(opts)))({
        headless: true, timeout: timeoutMs, protocolTimeout: timeoutMs,
        // Chromium's sandbox stays enabled. Do not accept tenant-supplied flags.
        args: ['--disable-background-networking'],
      });
      if (expired) {
        await closeBrowser(launched, closeTimeoutMs);
        throw new Error('PDF rendering timed out');
      }
      browser = launched;
    } finally {
      // Late launch cleanup also belongs to the lease, even after HTTP cancellation.
      launchInFlight = false;
    }
    return renderPage(browser, html, timeoutMs);
  };
  const running = work();
  try {
    return await Promise.race([
      running,
      new Promise<never>((_, reject) => {
        cancel = () => { expired = true; reject(aborted()); };
        options.signal?.addEventListener('abort', cancel, { once: true });
        if (options.signal?.aborted) cancel();
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error('PDF rendering timed out'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
    options.signal?.removeEventListener('abort', cancel);
    if (launchInFlight) {
      // An aborted caller must not free capacity while Chromium is still launching.
      // Both branches are handled so a late launch/close failure cannot go unhandled.
      void running.then(release, release);
    } else {
      try { if (browser) await closeBrowser(browser, closeTimeoutMs); }
      finally { release(); }
    }
  }
}

