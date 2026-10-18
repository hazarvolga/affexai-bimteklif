/**
 * Real Browser (Chromium / Puppeteer) WCAG 2.2 AA Accessibility & Contrast Gate
 *
 * Unlike jsdom (which cannot compute real CSS colors/backgrounds), this script
 * launches a real headless Chromium browser against a live Vite server and runs
 * axe-core across all key public routes in BOTH Light Mode ("Açık Pafta") and
 * Dark Mode ("Gece Paftası" / html.dark), including color-contrast, landmarks,
 * aria-required-children, label-content-name-mismatch, and heading order.
 */

import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core');
const axeSource = fs.readFileSync(axePath, 'utf8');

const ROUTES = [
  '/',
  '/pricing',
  '/bim-sozlugu',
  '/register',
  '/login',
  '/pilot',
  '/smartcheck',
  '/hesaplayicilar/kik-asiri-dusuk-teklif',
];

const MOCK_PLANS = [
  {
    id: 'starter-trial',
    name: 'Başlangıç (Deneme)',
    monthlyPrice: 0,
    monthlyQuoteLimit: 3,
    monthlyIfcLimit: 1,
    ifcMaxFileMb: 25,
    ifcMaxConcurrent: 1,
    isFeatured: false,
    marketingBadge: 'ÜCRETSİZ',
    marketingDescription: '14 gün boyunca 1 IFC model ve 3 teklif ile platformu test edin.',
  },
  {
    id: 'pro-office',
    name: 'Teknik Ofis Pro',
    monthlyPrice: 2900,
    monthlyQuoteLimit: 25,
    monthlyIfcLimit: 15,
    ifcMaxFileMb: 150,
    ifcMaxConcurrent: 2,
    isFeatured: true,
    marketingBadge: 'EN POPÜLER',
    marketingDescription: 'Aktif ihale ve hakediş hazırlayan mühendislik ve mimarlık ofisleri için.',
  },
];

async function runAudit() {
  const vite = await createServer({
    root: path.resolve(process.cwd()),
    server: { port: 0 },
    logLevel: 'silent',
  });
  await vite.listen();
  const address = vite.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 4173;
  const baseUrl = `http://127.0.0.1:${port}`;

  const candidatePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter((p): p is string => Boolean(p && fs.existsSync(p)));

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: candidatePaths[0],
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let totalViolations = 0;

  try {
    for (const mode of ['light', 'dark'] as const) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().includes('/api/public/plans')) {
          void req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_PLANS),
          });
          return;
        }
        if (req.url().includes('/api/public/bank-accounts')) {
          void req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
          return;
        }
        void req.continue();
      });

      for (const route of ROUTES) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle0' });
        await page.evaluate((themeMode) => {
          localStorage.setItem('theme', themeMode);
          document.documentElement.dataset.theme = themeMode;
          document.documentElement.classList.toggle('dark', themeMode === 'dark');
        }, mode);
        await new Promise((r) => setTimeout(r, 250));

        await page.evaluate(axeSource);
        const results = await page.evaluate(async () => {
          // @ts-expect-error axe is injected into window
          return await window.axe.run(document, {
            runOnly: {
              type: 'tag',
              values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
            },
          });
        });

        const violations = results.violations || [];
        if (violations.length > 0) {
          console.error(`\n❌ [${mode.toUpperCase()}] ${route} — ${violations.length} rule(s) violated:`);
          for (const v of violations) {
            totalViolations += v.nodes.length;
            console.error(`  - ${v.id} (${v.impact}, ${v.nodes.length} nodes): ${v.help}`);
            for (const n of v.nodes.slice(0, 5)) {
              console.error(`      target: ${JSON.stringify(n.target)} | html: ${n.html.slice(0, 120)}`);
              if (n.failureSummary) {
                console.error(`      summary: ${n.failureSummary.replace(/\n/g, ' ')}`);
              }
            }
          }
        } else {
          console.log(`✅ [${mode.toUpperCase()}] ${route} — 0 violations`);
        }
      }

      await page.close();
    }
  } finally {
    await browser.close();
    await vite.close();
  }

  if (totalViolations > 0) {
    console.error(`\nTotal violation nodes across all routes/themes: ${totalViolations}`);
    process.exit(1);
  } else {
    console.log('\n🎉 All 8 public routes passed real-browser axe-core audit in both Light & Dark modes with 0 violations!');
  }
}

void runAudit();
