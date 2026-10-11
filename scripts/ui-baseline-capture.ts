import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';

async function captureBaseline() {
  const outputDir = './output/ui-baseline';
  await mkdir(outputDir, { recursive: true });

  const vite = await createServer({
    server: { port: 0, host: '127.0.0.1', hmr: false },
    appType: 'spa'
  });
  await vite.listen();
  const addr = vite.httpServer!.address();
  assert.ok(addr && typeof addr === 'object');
  const base = `http://127.0.0.1:${addr.port}`;

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(String(err)));

    // Inject mock auth token
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('token', 'ui-redesign-baseline-fixture');
    });

    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) {
        void request.continue();
        return;
      }

      const respond = (body: unknown, status = 200) =>
        request.respond({
          status,
          contentType: 'application/json',
          body: JSON.stringify(body)
        });

      if (url.pathname === '/api/auth/me') {
        void respond({
          user: {
            id: '11111111-1111-4111-8111-111111111111',
            email: 'admin@teklifpro.ai',
            fullName: 'Ahmet Yılmaz (Teknik Ofis Şefi)',
            isSuperAdmin: false,
            emailVerified: '2026-10-11'
          },
          company: {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Atlas İnşaat Taahhüt A.Ş.',
            countryCode: 'TR',
            activeStandard: 'TBDY_TS500',
            measurementSystem: 'metric'
          },
          role: 'owner',
          accountType: 'workspace'
        });
        return;
      }

      if (url.pathname === '/api/company/profile') {
        void respond({
          company: {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Atlas İnşaat Taahhüt A.Ş.',
            taxNumber: '1234567890',
            taxOffice: 'Zincirlikuyu V.D.',
            countryCode: 'TR',
            activeStandard: 'TBDY_TS500',
            measurementSystem: 'metric',
            classificationSystem: 'CSB_TR'
          }
        });
        return;
      }

      if (url.pathname === '/api/quotes') {
        void respond([
          {
            id: 'quote-001',
            name: 'Kadıköy Konut Projesi Kaba Yapı',
            clientName: 'Yıldız Gayrimenkul',
            totalAmount: 14500000,
            status: 'draft',
            createdAt: '2026-10-10T10:00:00Z',
            updatedAt: '2026-10-11T12:00:00Z',
            itemsCount: 42
          },
          {
            id: 'quote-002',
            name: 'Ataşehir Ticaret Merkezi Güçlendirme',
            clientName: 'Doğan Holding',
            totalAmount: 8900000,
            status: 'sent',
            createdAt: '2026-10-08T09:00:00Z',
            updatedAt: '2026-10-09T14:00:00Z',
            itemsCount: 18
          }
        ]);
        return;
      }

      if (url.pathname === '/api/clients') {
        void respond([
          { id: 'cli-1', name: 'Yıldız Gayrimenkul', contactPerson: 'Mehmet Yıldız', phone: '05321112233' },
          { id: 'cli-2', name: 'Doğan Holding', contactPerson: 'Ayşe Doğan', phone: '05332223344' }
        ]);
        return;
      }

      if (url.pathname === '/api/pricing/benchmarks') {
        void respond({
          activeSourcesCount: 2,
          sources: [
            { id: 'src-1', name: 'ÇŞB Rayiç Poz Kataloğu (2026/1)', authority: 'Resmi', currency: 'TRY' },
            { id: 'src-2', name: 'Piyasa İnşaat Demiri Endeksi (Payas)', authority: 'Piyasa', currency: 'TRY' }
          ],
          benchmarks: [
            { itemCode: '15.120.1001', itemName: 'C30/37 Hazır Beton Dökümü', unit: 'm³', price: '2850.00' },
            { itemCode: '15.160.1003', itemName: 'B420C Nervürlü Donatı Çeliği (Q14)', unit: 'ton', price: '28400.00' }
          ]
        });
        return;
      }

      void respond([]);
    });

    const routesToCapture = [
      { path: '/', name: 'landing' },
      { path: '/login', name: 'login' },
      { path: '/academy', name: 'public-academy' },
      { path: '/app', name: 'app-dashboard' },
      { path: '/app/quotes', name: 'app-quotes-list' },
      { path: '/app/quotes/new', name: 'app-quotes-new' },
      { path: '/app/settings', name: 'app-settings' },
      { path: '/app/smartcheck', name: 'app-smartcheck' }
    ];

    const viewports = [
      { width: 360, height: 780, label: '360px-mobile' },
      { width: 768, height: 1024, label: '768px-tablet' },
      { width: 1280, height: 800, label: '1280px-desktop' },
      { width: 1920, height: 1080, label: '1920px-wide' }
    ];

    console.log(`Starting baseline capture across ${routesToCapture.length} routes and ${viewports.length} viewports...`);

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      for (const route of routesToCapture) {
        try {
          await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle0', timeout: 10000 });
          // Give React 200ms to settle rendering
          await new Promise(r => setTimeout(r, 200));
          const filename = `${outputDir}/${route.name}-${vp.label}.png`;
          await page.screenshot({ path: filename, fullPage: false });
          console.log(`Saved: ${filename}`);
        } catch (e: any) {
          console.warn(`Failed capturing ${route.path} at ${vp.label}: ${e.message}`);
        }
      }
    }

    console.log('Baseline screenshot capture completed.');
  } finally {
    await browser?.close();
    await vite.close();
  }
}

captureBaseline().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
