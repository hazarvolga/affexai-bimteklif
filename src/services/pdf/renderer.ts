import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer';

const RENDER_TIMEOUT_MS = 30_000;
const CLOSE_TIMEOUT_MS = 2_000;
const CSP = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

interface RenderOptions {
  launch?: (options: LaunchOptions) => Promise<Browser>;
  timeoutMs?: number;
  closeTimeoutMs?: number;
}

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
    browser.process()?.kill('SIGKILL');
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

/** Offline, scriptless, sandboxed rendering with a deadline covering every stage. */
export async function renderPdf(html: string, options: RenderOptions = {}): Promise<Buffer> {
  const timeoutMs = limit(options.timeoutMs ?? RENDER_TIMEOUT_MS, RENDER_TIMEOUT_MS);
  const closeTimeoutMs = limit(options.closeTimeoutMs ?? CLOSE_TIMEOUT_MS, CLOSE_TIMEOUT_MS);
  let browser: Browser | undefined;
  let expired = false;
  let timer: ReturnType<typeof setTimeout>;
  const work = async () => {
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
    return renderPage(browser, html, timeoutMs);
  };
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error('PDF rendering timed out'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
    if (browser) await closeBrowser(browser, closeTimeoutMs);
  }
}
