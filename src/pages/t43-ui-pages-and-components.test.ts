import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

// 1. Setup JSDOM globals before importing React or any UI components
const dom = new JSDOM(
  '<!DOCTYPE html><html lang="tr"><head><title>BIMMetraj UI Coverage Suite</title></head><body><div id="root"></div></body></html>',
  {
    url: 'https://bimmetraj.com/app',
    pretendToBeVisual: true,
  },
);

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});
globalThis.location = dom.window.location;
globalThis.history = dom.window.history;
Object.defineProperty(globalThis, 'localStorage', {
  value: dom.window.localStorage,
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, 'sessionStorage', {
  value: dom.window.sessionStorage,
  configurable: true,
  writable: true,
});
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
globalThis.HTMLButtonElement = dom.window.HTMLButtonElement;
globalThis.HTMLFormElement = dom.window.HTMLFormElement;
globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;
globalThis.HTMLAnchorElement = dom.window.HTMLAnchorElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.FocusEvent = dom.window.FocusEvent;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.FileReader = dom.window.FileReader;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  const id = setTimeout(() => cb(Date.now()), 0);
  if (typeof id.unref === 'function') id.unref();
  return Number(id);
}) as unknown as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame = ((id: number) => {
  clearTimeout(id);
}) as typeof cancelAnimationFrame;

if (!globalThis.PointerEvent) {
  globalThis.PointerEvent = dom.window.MouseEvent as unknown as typeof PointerEvent;
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '0px';
    readonly thresholds = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

dom.window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

dom.window.scrollTo = (() => {}) as unknown as typeof window.scrollTo;
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
  return {
    x: 10,
    y: 10,
    width: 800,
    height: 450,
    top: 10,
    left: 10,
    right: 810,
    bottom: 460,
    toJSON() {
      return this;
    },
  } as DOMRect;
};
if (!dom.window.URL.createObjectURL) {
  dom.window.URL.createObjectURL = () => 'blob:https://bimmetraj.com/mock-blob';
}
if (!dom.window.URL.revokeObjectURL) {
  dom.window.URL.revokeObjectURL = () => {};
}
Object.defineProperty(dom.window.navigator, 'clipboard', {
  value: {
    writeText: async () => undefined,
    readText: async () => '',
  },
  configurable: true,
});

const mockCanvasCtx = {
  fillStyle: '#000',
  strokeStyle: '#000',
  lineWidth: 1,
  font: '12px sans-serif',
  textAlign: 'left',
  textBaseline: 'alphabetic',
  globalAlpha: 1,
  shadowColor: 'transparent',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  fillRect: () => {},
  clearRect: () => {},
  strokeRect: () => {},
  beginPath: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arc: () => {},
  arcTo: () => {},
  quadraticCurveTo: () => {},
  bezierCurveTo: () => {},
  rect: () => {},
  fill: () => {},
  stroke: () => {},
  clip: () => {},
  fillText: () => {},
  strokeText: () => {},
  measureText: (text: string) => ({ width: String(text).length * 7.5 }),
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  scale: () => {},
  setTransform: () => {},
  setLineDash: () => {},
  getLineDash: () => [],
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  drawImage: () => {},
  putImageData: () => {},
  getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
};
dom.window.HTMLCanvasElement.prototype.getContext = (() => mockCanvasCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
dom.window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// 2. Comprehensive API Mock Router for fetch & fetchWithAuth
function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const MOCK_PLANS = [
  {
    id: 'plan-pro',
    name: 'Profesyonel Mühendislik Ofisi',
    monthlyPrice: 2450,
    monthlyQuoteLimit: 25,
    monthlyIfcLimit: 15,
    ifcMaxFileMb: 75,
    ifcMaxConcurrent: 2,
    isActive: true,
    isPublished: true,
    isFeatured: true,
    displayOrder: 1,
    marketingBadge: 'En Çok Tercih Edilen',
    marketingDescription: 'Orta ölçekli mühendislik ve mimarlık ofisleri için tam kapsamlı metraj ve hakediş paketi.',
    monthlyAiLimit: 50,
    monthlyPdfLimit: 30,
    monthlyCrmLimit: 100,
    monthlyRegulationLimit: 50,
    monthlyProfitAnalysisLimit: 25,
    storageMaxBytes: 5 * 1024 * 1024 * 1024,
    maxDocuments: 500,
    isTrial: false,
    subscriberCount: 4,
    subscribers: [{ companyId: 'comp-1', companyName: 'BIMPlan Mühendislik A.Ş.', status: 'active' }],
  },
  {
    id: 'plan-trial',
    name: '14 Günlük Ücretsiz Deneme',
    monthlyPrice: 0,
    monthlyQuoteLimit: 3,
    monthlyIfcLimit: 1,
    ifcMaxFileMb: 25,
    ifcMaxConcurrent: 1,
    isActive: true,
    isPublished: true,
    isFeatured: false,
    displayOrder: 0,
    marketingBadge: '14 Gün Ücretsiz',
    marketingDescription: 'Deneme paketi.',
    monthlyAiLimit: 5,
    monthlyPdfLimit: 3,
    monthlyCrmLimit: 15,
    monthlyRegulationLimit: 5,
    monthlyProfitAnalysisLimit: 5,
    storageMaxBytes: 256 * 1024 * 1024,
    maxDocuments: 25,
    isTrial: true,
    subscriberCount: 1,
    subscribers: [],
  },
];

const MOCK_PRICING_SOURCES = [
  {
    id: 'src-csb-2026',
    code: 'csb_yfk_2026',
    name: 'ÇŞB 2026 İnşaat ve Tesisat Birim Fiyatları',
    authority: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı',
    category: 'official_gazette',
    sourceUrl: 'https://yfk.csb.gov.tr/2026',
    status: 'active',
    syncFrequency: 'monthly',
    itemCount: 540,
    validityStart: '2026-01-01',
    validityEnd: '2026-12-31',
    lastSyncAt: '2026-10-25T03:00:00Z',
    versionTag: '2026/1',
    dataHash: 'a'.repeat(64),
    crawlerConfig: { autoApprove: true },
    pendingReviewCount: 2,
  },
  {
    id: 'src-tuik-2026',
    code: 'tuik_ime_2026',
    name: 'TÜİK İnşaat Maliyet Endeksi (İME)',
    authority: 'TÜİK',
    category: 'tuik_index',
    sourceUrl: 'https://data.tuik.gov.tr/ime',
    status: 'active',
    syncFrequency: 'monthly',
    itemCount: 24,
    validityStart: '2026-01-01',
    validityEnd: '2026-12-31',
    lastSyncAt: '2026-10-25T03:05:00Z',
    versionTag: '2026/10',
    dataHash: 'b'.repeat(64),
    crawlerConfig: { autoApprove: false },
    pendingReviewCount: 1,
  },
  {
    id: 'src-market-2026',
    code: 'market_rebar_2026',
    name: 'Piyasa Nervürlü Demir ve Hazır Beton Endeksi',
    authority: 'Ticaret Borsası',
    category: 'market_commodity',
    sourceUrl: 'https://borsa.example.com/demir',
    status: 'warning',
    syncFrequency: 'daily',
    itemCount: 42,
    validityStart: '2026-01-01',
    validityEnd: '2026-06-30',
    lastSyncAt: '2026-10-20T03:00:00Z',
    versionTag: 'metadata-only',
    dataHash: 'c'.repeat(64),
    crawlerConfig: null,
    pendingReviewCount: 0,
  },
];

const MOCK_STAGING_ITEMS = [
  {
    id: 'stg-1',
    sourceId: 'src-csb-2026',
    sourceName: 'ÇŞB 2026 İnşaat ve Tesisat Birim Fiyatları',
    sourceCode: 'csb_yfk_2026',
    itemCode: '15.150.1005',
    itemName: 'C 25/30 Basınç Dayanım Sınıfında Gri Hazır Beton Dökülmesi',
    unit: 'm³',
    currentPrice: '2500.00',
    crawledPrice: '2650.00',
    diffPercent: '6.00',
    sourceUrl: 'https://yfk.csb.gov.tr/2026',
    status: 'pending',
    confidenceScore: '0.96',
    notes: 'Resmî cetvel revizyonu',
    crawledAt: '2026-10-25T03:00:00Z',
    reviewedAt: null,
  },
  {
    id: 'stg-2',
    sourceId: 'src-tuik-2026',
    sourceName: 'TÜİK İnşaat Maliyet Endeksi',
    sourceCode: 'tuik_ime_2026',
    itemCode: '15.160.1003',
    itemName: 'Ø 8-Ø 12 mm Nervürlü Beton Çelik Çubuğu B420C',
    unit: 'ton',
    currentPrice: '35000.00',
    crawledPrice: '36800.00',
    diffPercent: '5.14',
    sourceUrl: 'https://data.tuik.gov.tr/ime',
    status: 'approved',
    confidenceScore: '0.92',
    notes: 'Onaylandı',
    crawledAt: '2026-10-24T03:00:00Z',
    reviewedAt: '2026-10-24T09:00:00Z',
  },
];

const MOCK_QUOTATIONS = [
  {
    id: 'quote-1',
    quoteNumber: 'TKF-2026-001',
    projectName: 'Kadıköy Kentsel Dönüşüm B Blok Betonarme & İnce İşler',
    title: 'Kadıköy Kentsel Dönüşüm B Blok',
    clientId: 'client-1',
    clientName: 'Anadolu Yapı Yatırım A.Ş.',
    industryId: 'residential',
    status: 'sent',
    currency: 'TRY',
    subtotal: 2850000,
    discountTotal: 50000,
    vatRate: 20,
    vatTotal: 560000,
    grandTotal: 3360000,
    totalAmount: 3360000,
    profitMargin: 18.5,
    riskLevel: 'medium',
    validityDays: 30,
    expiryDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    createdAt: '2026-10-15T10:00:00Z',
    updatedAt: '2026-10-20T12:00:00Z',
    observedActualCost: 2400000,
    observedActualDurationMonths: 8,
    calibrationNote: 'Saha gerçekleşmesi uyumlu.',
    revisions: [
      { id: 'quote-1', revisionVersion: 1, isLatest: true, status: 'sent', createdAt: '2026-10-20T12:00:00Z', grandTotal: 3360000, currency: 'TRY' },
    ],
    items: [
      {
        id: 'qi-1',
        itemCode: '15.150.1005',
        positionCode: '15.150.1005',
        description: 'C 30/37 Hazır Beton Dökülmesi',
        unit: 'm³',
        quantity: 450,
        unitPrice: 2890,
        totalPrice: 1300500,
        vatRate: 20,
        category: 'Betonarme',
      },
      {
        id: 'qi-2',
        itemCode: '15.160.1003',
        positionCode: '15.160.1003',
        description: 'B420C Nervürlü İnşaat Demiri',
        unit: 'ton',
        quantity: 42,
        unitPrice: 36800,
        totalPrice: 1545600,
        vatRate: 20,
        category: 'Donatı',
      },
    ],
  },
  {
    id: 'quote-2',
    quoteNumber: 'TKF-2026-002',
    projectName: 'Ataşehir Ofis Kulesi MEP & Cephe Paketi',
    title: 'Ataşehir Ofis Kulesi',
    clientId: 'client-2',
    clientName: 'Marmara Gayrimenkul GYO',
    industryId: 'commercial',
    status: 'accepted',
    currency: 'TRY',
    subtotal: 4200000,
    discountTotal: 0,
    vatRate: 20,
    vatTotal: 840000,
    grandTotal: 5040000,
    totalAmount: 5040000,
    profitMargin: 22.4,
    riskLevel: 'low',
    validityDays: 30,
    expiryDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-18T14:00:00Z',
    items: [],
  },
];

let mockIsSuperAdmin = false;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const u = new URL(rawUrl, 'https://bimmetraj.com');
  const path = u.pathname;
  const method = (init?.method || 'GET').toUpperCase();

  if (path === '/api/auth/me') {
    return jsonResponse({
      user: {
        id: 'user-admin-1',
        email: 'hazarvolga@gmail.com',
        fullName: 'Hazar Volga Ekiz',
        emailVerified: '2026-10-20T09:00:00Z',
        isSuperAdmin: mockIsSuperAdmin,
      },
      company: {
        id: 'comp-1',
        name: 'BIMPlan Mühendislik A.Ş.',
        defaultCurrency: 'TRY',
        defaultVatRate: 20,
        industryId: 'residential',
      },
      role: 'owner',
      accountType: 'workspace',
      learnerProfile: {
        onboardingCompletedAt: '2026-10-20T09:05:00Z',
        selectedLessonSlug: 'allplan-bim-101',
      },
    });
  }
  if (path === '/api/auth/login' || path === '/api/auth/register' || path === '/api/auth/academy-acquisition') {
    return jsonResponse({
      token: 'session-cookie',
      user: { id: 'user-admin-1', email: 'hazarvolga@gmail.com', fullName: 'Hazar Volga Ekiz', emailVerified: '2026-10-20T09:00:00Z', isSuperAdmin: true },
      company: { id: 'comp-1', name: 'BIMPlan Mühendislik A.Ş.', defaultCurrency: 'TRY', defaultVatRate: 20 },
      role: 'owner',
      accountType: 'workspace',
    });
  }
  if (path.startsWith('/api/auth/verify-email/')) {
    return jsonResponse({ ok: true, message: 'E-posta doğrulandı.' });
  }
  if (path === '/api/admin/plans') {
    if (method === 'POST') return jsonResponse(MOCK_PLANS[0], 201);
    return jsonResponse(MOCK_PLANS);
  }
  if (path.startsWith('/api/admin/plans/')) {
    return jsonResponse({ ok: true, plan: MOCK_PLANS[0], syncedCount: 4 });
  }
  if (path === '/api/public/plans') {
    return jsonResponse(MOCK_PLANS);
  }
  if (path === '/api/admin/dashboard') {
    return jsonResponse({
      totalTenants: 18,
      statusCounts: { active: 14, trialing: 3, past_due: 1 },
      totalMRR: 44100,
      totalQuotesThisMonth: 62,
      totalIfcThisMonth: 29,
      planDistribution: [
        { name: 'Profesyonel Mühendislik Ofisi', count: 14 },
        { name: '14 Günlük Ücretsiz Deneme', count: 4 },
      ],
      queueStats: { queued: 1, running: 1, failed24h: 1, succeeded24h: 24 },
    });
  }
  if (path === '/api/admin/pricing-sources') {
    if (method === 'POST') return jsonResponse(MOCK_PRICING_SOURCES[0], 201);
    return jsonResponse({ sources: MOCK_PRICING_SOURCES });
  }
  if (path === '/api/admin/pricing-sources/staging') {
    return jsonResponse({ items: MOCK_STAGING_ITEMS });
  }
  if (path === '/api/admin/pricing-sources/scheduler/status') {
    return jsonResponse({
      isRunning: false,
      nextScheduledRun: '2026-10-27T00:00:00Z',
      lastBatchSummary: {
        startedAt: '2026-10-26T00:00:00Z',
        completedAt: '2026-10-26T00:02:15Z',
        totalSources: 3,
        successfulSources: 3,
        failedSources: 0,
        totalItemsStaged: 12,
        durationMs: 135000,
        results: [],
      },
    });
  }
  if (path === '/api/admin/pricing-sources/official-catalogs') {
    return jsonResponse({
      generatedAt: '2026-10-26T09:00:00Z',
      totalBooks: 2,
      fullCoverageBooks: 2,
      totalIngestedRows: 564,
      totalRowsInBooks: 564,
      overallCoveragePercent: 100,
      books: [
        {
          id: 'csb_2026_mart_insaat_bf',
          title: 'ÇŞB 2026 İnşaat Birim Fiyatları Kitabı',
          fileName: 'csb_2026_insaat.csv',
          sha256: 'e'.repeat(64),
          ingestedRowCount: 540,
          totalRowsInBook: 540,
          coveragePercent: 100,
          periodType: 'annual',
          validityStart: '2026-01-01',
          validityEnd: '2026-12-31',
          status: 'full',
        },
        {
          id: 'tuik_2026_ime',
          title: 'TÜİK 2026 İME Bülteni',
          fileName: 'tuik_2026_ime.csv',
          sha256: 'f'.repeat(64),
          ingestedRowCount: 24,
          totalRowsInBook: 24,
          coveragePercent: 100,
          periodType: 'monthly',
          validityStart: '2026-01-01',
          validityEnd: '2026-12-31',
          status: 'full',
        },
      ],
    });
  }
  if (path.startsWith('/api/admin/pricing-sources/')) {
    return jsonResponse({ ok: true, stagedCount: 5, approvedCount: 5 });
  }
  if (path === '/api/admin/queue') {
    return jsonResponse({
      summary: { queued: 1, running: 1, succeeded24h: 14, failed24h: 1, stale: 1 },
      jobs: [
        {
          id: 'run-1',
          kind: 'ifc',
          fileName: 'konut_blok_a.ifc',
          status: 'stale',
          attempts: 1,
          maxAttempts: 3,
          createdAt: '2026-10-26T08:00:00Z',
          startedAt: '2026-10-26T08:01:00Z',
          finishedAt: null,
          errorMessage: 'Worker heartbeat timeout',
          companyId: 'comp-1',
          companyName: 'BIMPlan Mühendislik A.Ş.',
          isStale: true,
        },
        {
          id: 'run-2',
          kind: 'xlsx',
          fileName: 'metraj_icmal.xlsx',
          status: 'failed',
          attempts: 2,
          maxAttempts: 3,
          createdAt: '2026-10-26T07:00:00Z',
          startedAt: '2026-10-26T07:01:00Z',
          finishedAt: '2026-10-26T07:02:00Z',
          errorMessage: 'Invalid formula reference',
          companyId: 'comp-1',
          companyName: 'BIMPlan Mühendislik A.Ş.',
          isStale: false,
        },
        {
          id: 'run-3',
          kind: 'ifc',
          fileName: 'ofis_statik.ifc',
          status: 'succeeded',
          attempts: 1,
          maxAttempts: 3,
          createdAt: '2026-10-26T06:00:00Z',
          startedAt: '2026-10-26T06:00:05Z',
          finishedAt: '2026-10-26T06:01:12Z',
          errorMessage: null,
          companyId: 'comp-1',
          companyName: 'BIMPlan Mühendislik A.Ş.',
          isStale: false,
        },
      ],
    });
  }
  if (path === '/api/admin/queue/recover' || path === '/api/admin/queue/retry') {
    return jsonResponse({ ok: true });
  }
  if (path === '/api/admin/reports/usage') {
    return jsonResponse({
      monthlyTrends: [
        { period: '2026-08', total_quotes: '34', total_ifcs: '12' },
        { period: '2026-09', total_quotes: '48', total_ifcs: '19' },
        { period: '2026-10', total_quotes: '62', total_ifcs: '29' },
      ],
      topConsumers: [
        { id: 'comp-1', name: 'BIMPlan Mühendislik A.Ş.', total_quotes: '18', total_ifcs: '9' },
      ],
    });
  }
  if (path === '/api/admin/reports/export') {
    return new Response('company,quotes,ifc\nBIMPlan,18,9\n', {
      status: 200,
      headers: { 'Content-Type': 'text/csv' },
    });
  }
  if (path === '/api/admin/logs') {
    return jsonResponse({
      items: [
        {
          id: 'log-1',
          action: 'plan.updated',
          actorEmail: 'hazarvolga@gmail.com',
          targetType: 'plan',
          targetId: 'plan-pro',
          createdAt: '2026-10-26T09:00:00Z',
          details: {
            before: { monthlyPrice: 2200, isActive: true },
            after: { monthlyPrice: 2450, isActive: true },
          },
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    });
  }
  if (path === '/api/admin/tenants') {
    return jsonResponse([
      {
        id: 'comp-1',
        name: 'BIMPlan Mühendislik A.Ş.',
        email: 'info@bimplan.com',
        phone: '+90 216 555 0101',
        planId: 'plan-pro',
        planName: 'Profesyonel Mühendislik Ofisi',
        subscriptionStatus: 'active',
        memberCount: 5,
        quoteUsage: 14,
        quoteLimit: 25,
        ifcUsage: 6,
        ifcLimit: 15,
        bonusQuoteLimit: 2,
        bonusIfcLimit: 1,
        createdAt: '2026-01-15T10:00:00Z',
      },
    ]);
  }
  if (path.startsWith('/api/admin/tenants/')) {
    return jsonResponse({
      company: {
        id: 'comp-1',
        name: 'BIMPlan Mühendislik A.Ş.',
        phone: '+90 216 555 0101',
        email: 'info@bimplan.com',
        taxNumber: '1234567890',
        taxOffice: 'Kadıköy VD',
        address: 'Caferağa Mah. Moda Cad. No: 42 Kadıköy / İstanbul',
        defaultCurrency: 'TRY',
        defaultVatRate: 20,
        createdAt: '2026-01-15T10:00:00Z',
        isSmartcheckEnabled: true,
        adminNotes: 'Kurumsal pilot müşteri.',
      },
      subscription: {
        id: 'sub-1',
        status: 'active',
        planId: 'plan-pro',
        bonusQuoteLimit: 5,
        bonusIfcLimit: 2,
        currentPeriodStart: '2026-10-01T00:00:00Z',
        currentPeriodEnd: '2026-11-01T00:00:00Z',
      },
      plan: {
        id: 'plan-pro',
        name: 'Profesyonel Mühendislik Ofisi',
        monthlyPrice: 2450,
        monthlyQuoteLimit: 25,
        monthlyIfcLimit: 15,
        ifcMaxFileMb: 75,
        ifcMaxConcurrent: 2,
      },
      members: [
        {
          userId: 'user-admin-1',
          fullName: 'Hazar Volga Ekiz',
          email: 'hazarvolga@gmail.com',
          role: 'owner',
          createdAt: '2026-01-15T10:00:00Z',
        },
      ],
      usageHistory: [
        { period: '2026-09', quoteCount: 11, ifcCount: 4, lastActiveAt: '2026-09-29T16:00:00Z' },
        { period: '2026-10', quoteCount: 14, ifcCount: 6, lastActiveAt: '2026-10-26T09:00:00Z' },
      ],
      recentRuns: [
        {
          runId: 'run-3',
          documentId: 'doc-1',
          fileName: 'ofis_statik.ifc',
          status: 'succeeded',
          currentStage: 'completed',
          errorCode: null,
          errorMessage: null,
          createdAt: '2026-10-26T06:00:00Z',
          completedAt: '2026-10-26T06:01:12Z',
        },
      ],
    });
  }
  if (path === '/api/admin/billing/bank-accounts' || path === '/api/billing/bank-accounts' || path === '/api/public/bank-accounts') {
    return jsonResponse({
      accounts: [
        {
          id: 'bank-1',
          bankName: 'Garanti BBVA',
          branchName: 'Kadıköy Ticari Şube',
          accountHolder: 'BIMPlan Teknoloji A.Ş.',
          iban: 'TR330006100519786457841326',
          currency: 'TRY',
          descriptionNote: 'Açıklamaya referans kodunu yazınız.',
          isActive: true,
        },
      ],
    });
  }
  if (path.startsWith('/api/admin/billing/payment-requests') || path.startsWith('/api/billing/payment-requests')) {
    const reqItem = {
      requestId: 'pay-1',
      referenceCode: 'BM-2026-9041',
      companyId: 'comp-1',
      companyName: 'BIMPlan Mühendislik A.Ş.',
      planId: 'plan-pro',
      planName: 'Profesyonel Mühendislik Ofisi',
      amountTry: 24500,
      billingCycle: 'yearly',
      status: 'pending_approval',
      bankAccountId: 'bank-1',
      bankName: 'Garanti BBVA',
      senderName: 'BIMPlan Mühendislik A.Ş.',
      transferReference: 'FAST-881920',
      receiptNumber: 'FAST-881920',
      taxOffice: 'Kadıköy VD',
      taxNumber: '1234567890',
      notes: 'Yıllık abonelik ödemesi',
      adminNote: null,
      createdAt: '2026-10-25T14:00:00Z',
      updatedAt: '2026-10-25T14:10:00Z',
    };
    return jsonResponse({ requests: [reqItem], request: reqItem });
  }
  if (path === '/api/billing/usage-stats' || path === '/api/usage/report') {
    return jsonResponse({
      plan: 'Profesyonel Mühendislik Ofisi',
      totalMonthlyCost: 2450,
      period: { start: '2026-10-01', end: '2026-10-31', timezone: 'Europe/Istanbul' },
      usage: [
        { key: 'quotes', feature: 'quotes', label: 'Teklif Oluşturma', current: 8, limit: 25, percentage: 32 },
        { key: 'ifc_analyses', feature: 'ifc_analyses', label: 'IFC 4.3 Metraj Analizi', current: 4, limit: 15, percentage: 26 },
        { key: 'pdf_exports', feature: 'pdf_exports', label: 'PDF Teklif Çıktısı', current: 11, limit: 30, percentage: 36 },
      ],
    });
  }
  if (path === '/api/billing/subscription') {
    return jsonResponse({
      id: 'sub-1',
      planId: 'plan-pro',
      planName: 'Profesyonel Mühendislik Ofisi',
      status: 'active',
      monthlyPrice: 2450,
      currentPeriodEnd: '2026-11-01T00:00:00Z',
    });
  }
  if (path === '/api/quotations') {
    if (method === 'POST') return jsonResponse(MOCK_QUOTATIONS[0], 201);
    return jsonResponse(MOCK_QUOTATIONS);
  }
  if (path.endsWith('/pricing-snapshot')) {
    return jsonResponse({
      quote: {
        pricingSnapshotLockStatus: 'locked',
        pricingSnapshotLockHash: 'abcdef1234567890abcdef1234567890',
      },
      warnings: [],
      items: MOCK_QUOTATIONS[0].items.map((item) => ({
        item,
        missing: false,
        stale: false,
        snapshot: { amount: item.unitPrice, currency: 'TRY', validUntil: '2026-12-31' },
      })),
    });
  }
  if (path === '/api/source-intelligence/health') {
    return jsonResponse([
      {
        adapter: {
          id: 'ad-1',
          adapterKey: 'csb_2026',
          displayName: 'ÇŞB 2026 Birim Fiyat Adaptörü',
          authority: 'ÇŞB',
          cadence: 'monthly',
          sourceUrl: 'https://yfk.csb.gov.tr',
          lastSourceHash: 'a'.repeat(64),
          lastSuccessAt: '2026-10-25T03:00:00Z',
          enabled: true,
        },
        latestRun: { status: 'succeeded', createdAt: '2026-10-25T03:00:00Z', completedAt: '2026-10-25T03:01:00Z', sourceHash: 'a'.repeat(64) },
        health: 'healthy',
      },
    ]);
  }
  if (path === '/api/source-intelligence/review-queue') {
    return jsonResponse([
      {
        id: 'rq-1',
        itemType: 'price_snapshot',
        title: '15.150.1005 C 25/30 Hazır Beton',
        rationale: 'Resmî bülten güncellemesi',
        createdAt: '2026-10-25T03:01:00Z',
        adapter: { displayName: 'ÇŞB 2026', adapterKey: 'csb_2026' },
        run: { id: 'r-1', sourceDocumentIdentifier: 'CSB-2026-1', status: 'succeeded' },
      },
    ]);
  }
  if (path.endsWith('/smartcheck')) {
    return jsonResponse({
      score: 94,
      riskLevel: 'low',
      findings: [
        { severity: 'info', category: 'Poz Uyumu', message: 'Tüm pozlar ÇŞB 2026 resmi katalogla eşleşti.' },
      ],
    });
  }
  if (path.startsWith('/api/quotations/')) {
    return jsonResponse(MOCK_QUOTATIONS[0]);
  }
  if (path.startsWith('/api/profit/report/') || path === '/api/profit/calculate') {
    return jsonResponse({
      financials: {
        quotationId: 'quote-1',
        totalRevenue: 2800000,
        directCost: 2150000,
        overheadCost: 180000,
        contingencyCost: 95000,
        netProfit: 375000,
        grossMarginPercent: 23.2,
        netMarginPercent: 13.4,
        breakEvenAmount: 2425000,
        recommendations: ['Donatı zayiat payı %4 olarak optimize edildi.'],
      },
    });
  }
  if (path === '/api/clients' || path.startsWith('/api/clients/')) {
    const mockClient1 = {
      id: 'client-1',
      name: 'Anadolu Yapı Yatırım A.Ş.',
      type: 'company',
      contactPerson: 'Murat Kaya',
      email: 'murat@anadoluyapi.com.tr',
      phone: '+90 212 444 0900',
      address: 'Levent / İstanbul',
      pipelineStage: 'quotation_sent',
      notes: '[[STAGE_NOTE|stage=quotation_sent|at=2026-10-27T10:00:00Z|id=n-1]] Teklif sunuldu, revize bekleniyor.',
      estimatedValue: 3360000,
      createdAt: '2026-05-10T10:00:00Z',
      deals: [{ id: 'deal-1', name: 'Kadıköy Konut İhalesi', stage: 'quotation_sent', value: '3360000' }],
      quotations: [{ id: 'quote-1', quoteNumber: 'TKF-2026-001', projectName: 'Kadıköy B Blok', grandTotal: 3360000, currency: 'TRY' }],
    };
    if (path === '/api/clients/bulk-import') {
      return jsonResponse({ importedCount: 2, createdCount: 2, updatedCount: 0, skippedCount: 0, clients: [mockClient1] });
    }
    if (path.startsWith('/api/clients/client-1')) {
      return jsonResponse(mockClient1);
    }
    return jsonResponse([
      mockClient1,
      {
        id: 'client-2',
        name: 'Marmara Gayrimenkul GYO',
        type: 'company',
        contactPerson: 'Selin Demir',
        email: 'selin@marmaragyo.com.tr',
        phone: '+90 216 333 0800',
        address: 'Ataşehir / İstanbul',
        pipelineStage: 'lead',
        estimatedValue: 5040000,
        createdAt: '2026-06-12T10:00:00Z',
      },
    ]);
  }
  if (path === '/api/ai/industries') {
    return jsonResponse([
      { id: 'residential', name: 'Konut & Rezidans İnşaatı', description: 'Betonarme konut blokları ve toplu konut projeleri' },
      { id: 'commercial', name: 'Ticari Ofis & AVM', description: 'Ofis kuleleri ve karma kullanımlı yapılar' },
    ]);
  }
  if (path === '/api/company/industry-settings') {
    return jsonResponse([
      { industryId: 'residential', enabled: true },
      { industryId: 'commercial', enabled: true },
    ]);
  }
  if (path === '/api/company/profile') {
    return jsonResponse({
      id: 'comp-1',
      name: 'BIMPlan Mühendislik A.Ş.',
      taxOffice: 'Kadıköy VD',
      taxNumber: '1234567890',
      phone: '+90 216 555 0101',
      email: 'info@bimplan.com',
      address: 'Moda Cad. No: 42 Kadıköy / İstanbul',
      defaultCurrency: 'TRY',
      defaultVatRate: 20,
    });
  }
  if (path === '/api/company/risk-settings') {
    return jsonResponse({
      targetProfitMargin: 18,
      minAcceptableMargin: 10,
      defaultContingencyPercent: 5,
      defaultOverheadPercent: 8,
      inflationBufferPercent: 12,
    });
  }
  if (path === '/api/company/risk-calibration' || path === '/api/company/risk-calibration/report') {
    return jsonResponse({
      calibratedCount: 4,
      meanAbsoluteCostErrorPercent: 3.8,
      meanDurationDriftMonths: 0.4,
      suggestedContingencyPercent: 5.5,
      entries: [
        {
          quotationId: 'quote-1',
          projectName: 'Kadıköy B Blok',
          estimatedCost: 2320000,
          actualCost: 2400000,
          variancePercent: 3.45,
        },
      ],
    });
  }
  if (path === '/api/invitations') {
    return jsonResponse([
      {
        id: 'inv-1',
        email: 'stajyer@bimplan.com',
        role: 'estimator',
        status: 'pending',
        expiresAt: '2026-11-05T10:00:00Z',
        companyName: 'BIMPlan Mühendislik A.Ş.',
      },
    ]);
  }
  if (path.startsWith('/api/invitations/')) {
    return jsonResponse({
      id: 'inv-1',
      email: 'stajyer@bimplan.com',
      role: 'estimator',
      status: 'pending',
      companyName: 'BIMPlan Mühendislik A.Ş.',
    });
  }
  if (path.startsWith('/api/pricing/benchmarks')) {
    return jsonResponse({
      items: [
        {
          id: 'bm-1',
          itemCode: '15.150.1005',
          itemName: 'C 25/30 Basınç Dayanım Sınıfında Gri Hazır Beton Dökülmesi',
          description: 'C 25/30 Basınç Dayanım Sınıfında Gri Hazır Beton Dökülmesi',
          unit: 'm³',
          crawledPrice: '2650.00',
          unitPrice: 2650,
          sourceName: 'ÇŞB 2026/1',
          reviewedAt: '2026-10-25T09:00:00Z',
          validityStart: '2026-01-01',
          validityEnd: '2026-12-31',
        },
      ],
    });
  }
  if (path.startsWith('/api/pricing/snapshots')) {
    return jsonResponse({
      snapshots: [
        {
          id: 'snap-1',
          positionCode: '15.150.1005',
          description: 'C 25/30 Hazır Beton',
          unit: 'm³',
          amount: '2650.00',
          currency: 'TRY',
          stale: false,
          reviewStatus: 'approved',
          sourceId: 'src-csb-2026',
          sourceName: 'ÇŞB 2026/1',
          sourceDocumentHash: 'a'.repeat(64),
          capturedAt: '2026-10-25T09:00:00Z',
        },
      ],
    });
  }
  if (path === '/api/crm/deals' || path === '/api/crm/pipeline') {
    return jsonResponse([
      {
        id: 'deal-1',
        title: 'Kadıköy B Blok İhale Teklifi',
        clientName: 'Anadolu Yapı Yatırım A.Ş.',
        stage: 'proposal',
        value: 3360000,
        currency: 'TRY',
        probability: 75,
        expectedCloseDate: '2026-11-15',
        updatedAt: '2026-10-25T10:00:00Z',
      },
    ]);
  }
  if (path.startsWith('/api/crm/deals/')) {
    return jsonResponse({
      id: 'deal-1',
      title: 'Kadıköy B Blok İhale Teklifi',
      clientName: 'Anadolu Yapı Yatırım A.Ş.',
      stage: 'proposal',
      value: 3360000,
      currency: 'TRY',
      probability: 75,
      notes: 'Teknik şartname incelendi.',
      activities: [
        { id: 'act-1', type: 'call', summary: 'Keşif özeti sunuldu', createdAt: '2026-10-24T11:00:00Z' },
      ],
    });
  }
  if (path === '/api/regulations' || path === '/api/regulations/versions') {
    return jsonResponse([
      {
        id: 'reg-1',
        code: 'TBDY-2018',
        title: 'Türkiye Bina Deprem Yönetmeliği',
        authority: 'AFAD / ÇŞB',
        version: '2018.1',
        effectiveDate: '2019-01-01',
        status: 'active',
        summary: 'Deprem etkisi altında binaların tasarımı için esaslar.',
      },
      {
        id: 'reg-2',
        code: 'RG-33331-EPYS',
        title: 'Elektronik Proje Yönetim Sistemi (e-PYS) ve BIM Zorunluluğu',
        authority: 'ÇŞB',
        version: '2026/33331',
        effectiveDate: '2026-07-01',
        status: 'active',
        summary: 'IFC 4.3 açık kaynak model ve PDF/A teslim kuralları.',
      },
    ]);
  }
  if (path === '/api/regulations/alerts') {
    return jsonResponse([
      {
        id: 'alert-1',
        title: 'ÇŞB 2026/1 Birim Fiyat Güncellemesi',
        category: 'Birim Fiyat',
        impactLevel: 'high',
        severity: 'high',
        impactSummary: 'Hazır beton ve nervürlü çelik pozlarında %5,4 artış.',
        publishedAt: '2026-10-20T09:00:00Z',
      },
    ]);
  }
  if (path === '/api/progress-payments/contracts') {
    return jsonResponse({
      contracts: [
        {
          id: 'pp-contract-1',
          contractName: 'Kadıköy B Blok Anahtar Teslim Sözleşmesi',
          contractorName: 'BIMPlan Mühendislik A.Ş.',
          employerName: 'Anadolu Yapı Yatırım A.Ş.',
          contractPrice: '12500000.00',
          currency: 'TRY',
          advancePaymentBalance: '750000.00',
          advanceDeductionRatePercent: '15.00',
          retentionRatePercent: '5.00',
          vatRatePercent: '20.00',
          vatWithholdingTenth: 4,
          incomeTaxWithholdingRatePercent: '5.00',
          stampTaxRatePerThousand: '9.48',
          createdAt: '2026-09-01T10:00:00Z',
        },
      ],
    });
  }
  if (path === '/api/market-intelligence/supplier-quotes') {
    return jsonResponse([
      {
        id: 'sq-1',
        supplierName: 'BetonSA Marmara',
        documentId: 'doc-1',
        sourceDocumentIdentifier: 'BSA-2026-441',
        quoteNumber: 'BSA-2026-441',
        region: 'Marmara',
        deliveryTerms: 'Şantiye Teslim',
        status: 'active',
        confidence: '0.95',
        entries: [
          {
            id: 'mi-1',
            description: 'C 30/37 Hazır Beton',
            positionCode: '15.150.1005',
            unit: 'm³',
            unitPrice: '2790.00',
            currency: 'TRY',
            outlierStatus: 'normal',
            baselineCount: 5,
            confidence: '0.95',
            reviewStatus: 'approved',
            priceSnapshotId: 'snap-1',
            sourceProcessingRunId: 'run-3',
            sourceQuantityRowId: 'row-1',
            sourceCellRange: 'A4:F4',
          },
        ],
      },
    ]);
  }
  if (path.startsWith('/api/market-intelligence/')) {
    return jsonResponse({
      summary: { count: 12, median: 2790, min: 2650, max: 2950 },
    });
  }
  if (path === '/api/smartcheck/pilot-metrics') {
    return jsonResponse({
      summary: {
        caseCount: 5,
        totalRows: 120,
        parsedRows: 118,
        manuallyCorrectedRows: 2,
        findingCount: 1,
        approvedRows: 118,
        exceptionRows: 0,
        transferredRows: 118,
        provenanceCompleteRows: 118,
        parseRate: 0.983,
        manualReentryFreeRate: 0.983,
        provenanceCoverage: 1.0,
        averageProcessingDurationSeconds: 2.4,
        averageWorkflowDurationSeconds: 45,
      },
      gates: {
        fiveCases: true,
        parseRateAtLeast90: true,
        manualReentryFreeAtLeast90: true,
        provenanceCompleteForTransfers: true,
      },
    });
  }
  if (path === '/api/smartcheck/pilot-cases') {
    return jsonResponse([
      {
        id: 'pc-1',
        pilotId: 'PILOT-01',
        customerReference: 'Anadolu Yapı',
        projectReference: 'Kadıköy B Blok',
        documentId: 'doc-1',
        status: 'approved',
        reviewerDecision: 'approved',
        reviewedAt: '2026-10-25T10:00:00Z',
        latestMeasurement: {
          totalRows: 40,
          parsedRows: 40,
          manuallyCorrectedRows: 0,
          findingCount: 0,
          approvedRows: 40,
          transferredRows: 40,
          provenanceCompleteRows: 40,
          parseRate: 1.0,
          manualReentryFreeRate: 1.0,
          provenanceCoverage: 1.0,
          processingDurationSeconds: 2.1,
          workflowDurationSeconds: 38,
        },
      },
    ]);
  }
  if (path === '/api/pilot-applications') {
    return jsonResponse([
      {
        id: 'pilot-1',
        fullName: 'Ahmet Yılmaz',
        companyName: 'Kuzey Mühendislik Ltd.',
        email: 'ahmet@kuzeymuh.com',
        phone: '+90 532 111 2233',
        teamSize: '11-50',
        currentWorkflow: 'Allplan + Excel',
        source: 'pilot_form',
        status: 'new',
        offerAmount: '2450',
        offerCurrency: 'TRY',
        paymentStatus: 'offered',
        provisionedCompanyId: null,
        createdAt: '2026-10-24T10:00:00Z',
      },
    ]);
  }
  if (path === '/api/pilot-applications/metrics') {
    return jsonResponse({
      total: 12,
      converted: 4,
      paid: 3,
      newLeads: 5,
      bottleneckContacted: 3,
      conversionRate: 33.3,
      paidRate: 25.0,
      averageDaysToConvert: 4.5,
    });
  }
  if (path === '/api/faq') {
    return jsonResponse([
      {
        id: 'faq-1',
        category: 'IFC 4.3 & openBIM',
        question: 'IFC 4.3 dosyası nasıl yüklenir?',
        answer: 'SmartCheck ekranından doğrudan yüklenebilir.',
        tags: ['ifc', 'smartcheck'],
      },
    ]);
  }
  if (path === '/api/academy/activation/summary') {
    return jsonResponse({
      counts: {
        landingViews: 420,
        registrations: 85,
        verifiedLearners: 72,
        firstLessonLearners: 64,
        secondLessonLearners: 49,
        activeLearners7d: 38,
        structuralEarlyAccessRequests: 14,
      },
      conversion: {
        landingToRegistrationPercent: 20.2,
        registrationToVerifiedPercent: 84.7,
        registrationToFirstLessonPercent: 75.3,
        firstToSecondLessonPercent: 76.5,
      },
    });
  }
  if (path === '/api/academy/allplan/certification') {
    return jsonResponse({
      programVersion: '2026.1',
      passingScore: 70,
      maxDailyAttempts: 3,
      attemptsToday: 0,
      eligibility: {
        eligible: true,
        completedLessons: 5,
        requiredLessons: 5,
        completedCheckpoints: 2,
        requiredCheckpoints: 2,
      },
      assessment: [
        {
          id: 'q-1',
          prompt: 'Allplan içinde kat yüksekliklerini yöneten temel araç hangisidir?',
          options: ['Floor Manager', 'Layer Palette', 'SmartSymbol'],
        },
      ],
      certificate: null,
      entitlement: {
        source: 'academy_free',
        accessMode: 'free_learner',
        edition: 'Allplan 2026',
        endsAt: null,
      },
    });
  }
  if (path.startsWith('/api/academy/')) {
    return jsonResponse({
      entitled: true,
      accessTier: 'full',
      curriculum: [],
      coverage: {
        pathCount: 2,
        courseCount: 4,
        moduleCount: 12,
        detailedLessonCount: 8,
        reviewRequiredModuleCount: 4,
      },
      profile: {
        onboardingCompletedAt: '2026-10-20T09:05:00Z',
        selectedLessonSlug: 'allplan-bim-101',
      },
      lessons: [],
      completedLessons: ['allplan-bim-101'],
      attempts: [
        { id: 'att-1', score: 26, total: 30, percentage: 87, passed: true, createdAt: '2026-10-21T14:00:00Z' },
      ],
      certification: {
        earned: true,
        certificateId: 'ALL-2026-HZR-01',
        verificationHash: '9f86d081884c7d659a2feaa0c55ad015',
        issuedAt: '2026-10-21T14:05:00Z',
      },
      summary: {
        totalLearners: 42,
        completedOnboarding: 38,
        certifiedCount: 19,
      },
    });
  }
  if (path.startsWith('/api/cde/')) {
    const cdeContainer = {
      id: 'cde-cont-1',
      containerCode: 'KDK-B-STR-001',
      title: 'Kadıköy B Blok Statik Model',
      currentState: 'SHARED',
      currentRevisionId: 'rev-1',
      currentScopeHash: 'a'.repeat(64),
      lockVersion: 1,
    };
    if (path.includes('/containers/')) {
      return jsonResponse({
        container: cdeContainer,
        revisions: [
          {
            id: 'rev-1',
            revisionCode: 'P01.01',
            scopeHash: 'a'.repeat(64),
            createdByUserId: 'user-admin-1',
            createdAt: '2026-10-25T10:00:00Z',
          },
        ],
        events: [
          {
            event: {
              id: 'ev-1',
              revisionId: 'rev-1',
              action: 'approve',
              decision: 'accepted',
              fromState: 'WIP',
              toState: 'SHARED',
              suitabilityCode: 'S1',
              revisionCode: 'P01.01',
              scopeHash: 'a'.repeat(64),
              expectedVersion: 0,
              resultingVersion: 1,
              actorUserId: 'user-admin-1',
              actorProjectRole: 'coordinator',
              actorDiscipline: 'BIM',
              reason: 'Koordinasyon onayı verildi.',
              createdAt: '2026-10-25T10:05:00Z',
            },
            actor: { id: 'user-admin-1', fullName: 'Hazar Volga Ekiz', email: 'hazarvolga@gmail.com' },
          },
        ],
      });
    }
    return jsonResponse({
      id: 'cde-proj-1',
      documentId: 'doc-1',
      name: 'Kadıköy B Blok CDE',
      members: [
        { userId: 'user-admin-1', projectRole: 'coordinator', discipline: 'BIM' },
      ],
      containers: [cdeContainer],
    });
  }
  if (path.startsWith('/api/smartcheck/documents')) {
    if (path.endsWith('/epys-preflight')) {
      return jsonResponse({
        summary: { hata: 1, uyari: 2, bilgi: 4, elle: 1 },
        ek9Table: { tablo: 'Tablo 1', baslik: 'Mimari Model Kalite Kontrol', satirSayisi: 1 },
        ek9: [
          {
            no: 1,
            bolum: 'Genel',
            kategori: 'Dosya Yapısı',
            baslik: 'IFC Şema Sürümü',
            soru: 'Model IFC4 veya IFC4X3 şemasında mı?',
            karar: 'Evet',
            elleNotu: '',
            bulgu: 0,
          },
        ],
        findings: [
          {
            kod: 'EPYS-01',
            seviye: 'uyari',
            mesaj: 'Bazı mahallerde TR_Pset_Alan bilgisi eksik.',
            madde: 'Ek-9 Madde 4.2',
            ek9: 4,
            varliklar: ['IfcSpace#104'],
            sayi: 1,
          },
        ],
        findingsTruncated: false,
        disclaimer: 'Bu rapor ön kontrol amaçlıdır.',
        ruleSource: {
          regulation: { ad: 'Planlı Alanlar İmar Yönetmeliği (e-PYS)', resmiGazete: '33331' },
          engine: { name: 'BIMMetraj e-PYS Engine', version: '1.0.0', upstreamCommit: '4502ced' },
        },
        model: { fileName: 'ofis_statik.ifc', schema: 'IFC4X3', discipline: 'STR' },
      });
    }
    if (path.endsWith('/pdf-preflight')) {
      return jsonResponse({
        schemaVersion: 2,
        file: { fileName: 'mimari_pafta_A01.pdf', pageCount: 4 },
        pdfa: { claimed: { part: '1', conformance: 'B' }, note: 'XMP üstverisinde PDF/A-1b beyanı bulundu.' },
        eSignature: {
          signatureFieldPresent: true,
          fieldStatus: 'signed',
          signedValueCount: 1,
          emptyFieldCount: 0,
          malformedFieldCount: 0,
          scanComplete: true,
          pagesScanned: 4,
          pagesTotal: 4,
          objectsScanned: 120,
          verification: {
            cryptographic: { status: 'not_checked', note: 'Kontrol edilmedi' },
            trust: { status: 'not_checked', note: 'Kontrol edilmedi' },
            revocation: { status: 'not_checked', note: 'Kontrol edilmedi' },
            timestamp: { status: 'not_checked', note: 'Kontrol edilmedi' },
          },
          note: '1 adet imzalı alan tespit edildi.',
        },
        summary: { hata: 0, uyari: 1, elle: 0 },
        findings: [
          { kod: 'PDF-01', seviye: 'uyari', mesaj: 'Örnek uyarı', madde: 'EK-9', sayfalar: [1] },
        ],
        disclaimer: 'Bu rapor ön kontrol amaçlıdır.',
      });
    }
    if (path.endsWith('/pdfa-validate') || path.endsWith('/pdfa-validation')) {
      return jsonResponse({
        status: 'completed',
        tool: { name: 'veraPDF', version: '1.26.0', status: 'available' },
        profile: { code: '1b', name: 'PDF/A-1B validation profile' },
        source: { fileName: 'mimari_pafta_A01.pdf', checksumSha256: 'a'.repeat(64), preserved: true },
        validation: { isCompliant: true, scanComplete: true, failedRules: 0, failedChecks: 0 },
        conversion: { status: 'disabled_requires_licensed_provider', outputCreated: false, sourceOverwritten: false },
        unavailableReason: null,
      });
    }
    if (path.endsWith('/rows')) {
      return jsonResponse({
        rows: [
          {
            id: 'row-1',
            sheetName: 'İcmal',
            sourceRowNumber: 4,
            sourceCellRange: 'A4:F4',
            rawDescription: 'C 30/37 Hazır Beton',
            rawPositionCode: '15.150.1006',
            rawUnit: 'm³',
            rawQuantity: '320',
            rawPrice: '2890',
            rawWastePercent: '3',
            formulaJson: {},
            normalizedDescription: 'C 30/37 Hazır Beton',
            normalizedPositionCode: '15.150.1006',
            normalizedUnit: 'm3',
            normalizedQuantity: '320.00',
            normalizedPrice: '2890.00',
            normalizedWastePercent: '3.00',
            mappingConfidence: '0.95',
            reviewStatus: 'pending_review',
            reviewerUserId: null,
            reviewedAt: null,
            reviewerNotes: null,
            findingsJson: [],
          },
        ],
      });
    }
    return jsonResponse({
      documents: [
        {
          id: 'doc-1',
          fileName: 'ofis_statik.ifc',
          mimeType: 'model/ifc',
          status: 'succeeded',
          createdAt: '2026-10-26T06:00:00Z',
        },
      ],
      queue: [
        {
          id: 'run-3',
          documentId: 'doc-1',
          fileName: 'ofis_statik.ifc',
          status: 'succeeded',
          currentStage: 'completed',
          progressPercent: 100,
          progressMessage: 'Tamamlandı',
          errorCode: null,
          errorMessage: null,
          createdAt: '2026-10-26T06:00:00Z',
        },
      ],
    });
  }
  return jsonResponse({ ok: true, items: [], data: [] });
}) as typeof fetch;

// 3. Import React and Application Modules
import React, { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { AuthProvider } from '@/hooks/useAuth';
import { SmartCheckDemoProvider } from '@/smartcheck/SmartCheckDemoContext';
import { setSessionHint } from '@/lib/api';

// Admin pages
import { PricingSources } from '@/pages/admin/PricingSources';
import { PlanEditor } from '@/pages/admin/PlanEditor';
import { PlansList } from '@/pages/admin/PlansList';
import { TenantDetail } from '@/pages/admin/TenantDetail';
import { TenantsList } from '@/pages/admin/TenantsList';
import { AdminQueue } from '@/pages/admin/AdminQueue';
import { AdminReports } from '@/pages/admin/AdminReports';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminLogs } from '@/pages/admin/AdminLogs';
import { DeveloperRoadmap } from '@/pages/admin/DeveloperRoadmap';
import { CalculationMethods } from '@/pages/admin/CalculationMethods';
import { ExpertReview } from '@/pages/admin/ExpertReview';

// Workspace & Business pages
import { CreateQuote } from '@/pages/CreateQuote';
import { Quotes } from '@/pages/Quotes';
import { QuoteDetail } from '@/pages/QuoteDetail';
import { Billing } from '@/pages/Billing';
import { Settings } from '@/pages/Settings';
import { Dashboard } from '@/pages/Dashboard';
import { Clients, normalizePipelineStage } from '@/pages/Clients';
import { ClientDetail } from '@/pages/ClientDetail';
import { ClientImportModal } from '@/components/clients/ClientImportModal';
import { ClientQuickDrawer } from '@/components/clients/ClientQuickDrawer';
import { CRM } from '@/pages/CRM';
import { DealDetail } from '@/pages/DealDetail';
import { Profitability } from '@/pages/Profitability';
import { ProgressPayments, formatMoney } from '@/pages/ProgressPayments';
import { MarketIntelligence } from '@/pages/MarketIntelligence';
import { Regulations } from '@/pages/Regulations';
import { PilotApplications } from '@/pages/PilotApplications';
import { PilotApplication } from '@/pages/PilotApplication';
import { PilotEvidence } from '@/pages/PilotEvidence';
import { SmartCheck } from '@/pages/SmartCheck';
import { BimIfcParserPage } from '@/pages/BimIfcParserPage';
import BimStandardsPage from '@/pages/BimStandardsPage';
import BimGlossaryPage, { PublicBimGlossaryPage } from '@/pages/BimGlossaryPage';
import { AIAssistant } from '@/pages/AIAssistant';

// Public, Auth & Calculator pages
import { LandingPage } from '@/pages/LandingPage';
import { SmartCheckDemo } from '@/pages/SmartCheckDemo';
import { PublicAcademy } from '@/pages/PublicAcademy';
import { PublicAcademyDetail } from '@/pages/PublicAcademyDetail';
import { HowItWorks } from '@/pages/HowItWorks';
import { LegalPage } from '@/pages/LegalPage';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { PasswordRecovery } from '@/pages/PasswordRecovery';
import { VerifyEmail } from '@/pages/VerifyEmail';
import { AcceptInvite } from '@/pages/AcceptInvite';
import { NotFound } from '@/pages/NotFound';
import { CalculatorsIndexPage } from '@/pages/calculators/CalculatorsIndexPage';
import { PriceEscalationCalculatorPage } from '@/pages/calculators/PriceEscalationCalculatorPage';
import { KatKarsiligiCalculatorPage } from '@/pages/calculators/KatKarsiligiCalculatorPage';
import { KikAdtCalculatorPage } from '@/pages/calculators/KikAdtCalculatorPage';
import { YambisCalculatorPage } from '@/pages/calculators/YambisCalculatorPage';

// Academy pages & components
import { Academy } from '@/pages/Academy';
import { AcademyActivation } from '@/pages/AcademyActivation';
import AcademyCADPage from '@/pages/AcademyCADPage';
import AcademyCertificatesPage from '@/pages/AcademyCertificatesPage';
import AcademyExamPage from '@/pages/AcademyExamPage';
import AcademyProfilePage from '@/pages/AcademyProfilePage';
import { AllplanAcademy } from '@/pages/AllplanAcademy';
import { AllplanAccessGate } from '@/pages/AllplanAccessGate';
import { CompleteAcademyContent } from '@/pages/CompleteAcademyContent';
import { LessonViewerPage } from '@/pages/LessonViewerPage';
import { ProtectedAllplanLessonPage } from '@/pages/ProtectedAllplanLessonPage';
import { CADDiagramViewer } from '@/components/academy/CADDiagramViewer';
import { StudentProfile } from '@/components/academy/StudentProfile';
import { AIBIMCompanion } from '@/components/academy/AIBIMCompanion';
import { AcademyCompanion } from '@/components/academy/AcademyCompanion';
import { ExamInterface } from '@/components/academy/ExamInterface';
import { CertificatesViewer } from '@/components/academy/CertificatesViewer';
import { SubGuideDrawer } from '@/components/academy/SubGuideDrawer';
import { InlineCheckpoint } from '@/components/academy/InlineCheckpoint';
import { ReinforcementEstimator } from '@/components/academy/ReinforcementEstimator';
import { WallIntersectionSimulator } from '@/components/academy/WallIntersectionSimulator';
import { BIMFAQViewer } from '@/components/academy/BIMFAQViewer';
import { CoordinateCalculator } from '@/components/academy/CoordinateCalculator';
import { ShortcutTrainer } from '@/components/academy/ShortcutTrainer';
import { TechnicalBadge, TechnicalButton, TechnicalPanel, TechnicalProgressBar } from '@/components/academy/TechnicalUI';
import { subGuidesData } from '@/academy/subGuidesData';

// SmartCheck & BIMPlan components
import { CalmIfcWorkspace } from '@/components/smartcheck/CalmIfcWorkspace';
import { SmartCheckImportWorkspace } from '@/components/smartcheck/SmartCheckImportWorkspace';
import { BimIfcParser } from '@/components/bimplan/BimIfcParser';
import BimGapAnalysis from '@/components/bimplan/BimGapAnalysis';
import BimGlossary from '@/components/bimplan/BimGlossary';
import BimDashboard from '@/components/bimplan/BimDashboard';
import DocumentsView from '@/components/bimplan/DocumentsView';
import { PreBimFeasibilityPanel } from '@/components/smartcheck/PreBimFeasibilityPanel';
import { ParcelFeasibility } from '@/pages/ParcelFeasibility';
import HomeView from '@/components/bimplan/HomeView';
import LegislationView from '@/components/bimplan/LegislationView';
import StandardsView from '@/components/bimplan/StandardsView';
import Header from '@/components/bimplan/Header';
import Footer from '@/components/bimplan/Footer';
import { IfcCoverageCard } from '@/components/smartcheck/IfcCoverageCard';
import { ContractorWorkflowHub } from '@/components/dashboard/ContractorWorkflowHub';
import {
  AuthoringAdvisoryBanner,
  RevitChecklistCards,
  RevitPreUploadChecklistPanel,
} from '@/components/smartcheck/AuthoringAdvisoryBanner';
import { detectAuthoringSoftware, REVIT_PRE_EXPORT_CHECKLIST } from '@/ifc/authoring-software-diagnostics';
import { ApartmentSubcontractorShieldCard } from '@/components/smartcheck/ApartmentSubcontractorShieldCard';
import { SourceIntelligencePanel } from '@/components/smartcheck/SourceIntelligencePanel';
import { CdeWorkflowPanel } from '@/components/smartcheck/CdeWorkflowPanel';
import { RegulationImpactPanel } from '@/components/smartcheck/RegulationImpactPanel';
import { EpysPreflightPanel } from '@/components/smartcheck/EpysPreflightPanel';
import { PdfPreflightPanel } from '@/components/smartcheck/PdfPreflightPanel';
import { MetrajCetveliSheet } from '@/components/smartcheck/MetrajCetveliSheet';
import { ExpertLineVerification, parseExpertValue } from '@/components/smartcheck/ExpertLineVerification';
import { ExpertVerificationBar } from '@/components/smartcheck/ExpertVerificationBar';
import { UncoveredItemsView } from '@/components/smartcheck/IfcUncoveredItemsView';
import { CalculationTraceSection } from '@/components/smartcheck/CalculationTraceSection';
import { buildCalmIfcDatasetFromElements } from '@/ifc/calm-icmal';

// Layout, Tour, UI primitives & Utilities
import { Shell } from '@/components/layout/Shell';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionWrapper } from '@/components/layout/SectionWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PublicMetadata } from '@/components/PublicMetadata';
import { GuidedTour } from '@/components/tour/GuidedTour';
import { TourCard, tooltipStyle } from '@/components/tour/TourCard';
import { USER_TOUR_STEPS } from '@/components/tour/user-tour-steps';
import { TourWelcomeBanner } from '@/components/dashboard/SystemQuickTour';
import { QuotationCard } from '@/components/business/QuotationCard';
import { ProfitabilityBadge } from '@/components/business/ProfitabilityBadge';
import { StatusBadge } from '@/components/business/StatusBadge';
import { StatCard } from '@/components/data/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PaftaDrawing } from '@/components/ui/PaftaDrawing';
import { ThemeToggle, applyPaftaTheme, getActiveTheme } from '@/components/ui/ThemeToggle';
import { PublicPricingSection } from '@/features/public-pricing/PublicPricingSection';
import { generateCertificateImage } from '@/utils/CertificateGenerator';

setSessionHint(true);

async function flushReact(ms = 12): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, ms));
    await Promise.resolve();
  });
}

function exerciseFormInputs(container: HTMLElement) {
  const inputs = Array.from(container.querySelectorAll('input, textarea, select'));
  for (const raw of inputs) {
    try {
      if (raw instanceof dom.window.HTMLSelectElement) {
        if (raw.options.length > 0) {
          const nextIdx = raw.options.length > 1 ? 1 : 0;
          const desc = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, 'value');
          desc?.set?.call(raw, raw.options[nextIdx].value);
          raw.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        }
      } else if (raw instanceof dom.window.HTMLTextAreaElement) {
        const desc = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value');
        desc?.set?.call(raw, 'Test açıklama notu');
        raw.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
        raw.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      } else if (raw instanceof dom.window.HTMLInputElement) {
        if (raw.type === 'file') continue;
        if (raw.type === 'checkbox' || raw.type === 'radio') {
          raw.click();
          continue;
        }
        const nextVal =
          raw.type === 'number' || raw.type === 'range'
            ? '25'
            : raw.type === 'date'
              ? '2026-10-26'
              : raw.type === 'email'
                ? 'test@bimplan.com'
                : '15.150.1005';
        const desc = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value');
        desc?.set?.call(raw, nextVal);
        raw.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
        raw.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      }
    } catch {
      // Ignore controlled/uncontrolled edge cases during teardown exercise
    }
  }
}

async function renderInRouter(
  element: React.ReactElement,
  routePath = '/test',
  initialEntry = '/test',
  interact?: (container: HTMLElement) => Promise<void> | void,
): Promise<string> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: [initialEntry] },
          createElement(
            AuthProvider,
            null,
            createElement(
              SmartCheckDemoProvider,
              null,
              createElement(Routes, null, createElement(Route, { path: routePath, element }), createElement(Route, { path: '*', element })),
            ),
          ),
        ),
      );
    });
    await flushReact(15);

    if (interact) {
      await act(async () => {
        await interact(container);
      });
      await flushReact(10);
    }

    const html = container.innerHTML;
    await act(async () => {
      exerciseFormInputs(container);
    });
    await flushReact(5);
    return html;
  } finally {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  }
}

function clickButtonsByText(container: HTMLElement, substrings: string[]) {
  const buttons = Array.from(container.querySelectorAll('button'));
  for (const sub of substrings) {
    const match = buttons.find((b) => (b.textContent || '').includes(sub));
    if (match && !match.disabled) {
      match.click();
    }
  }
}

test('T43 UI Slice 1: Admin yönetim sayfaları (PricingSources, PlanEditor, PlansList, TenantDetail, TenantsList, AdminQueue, AdminReports, AdminDashboard, AdminLogs) JSDOM altında veri yükler ve etkileşimleri çalıştırır', async () => {
  mockIsSuperAdmin = true;
  const pricingHtml = await renderInRouter(
    createElement(PricingSources),
    '/admin/pricing-sources',
    '/admin/pricing-sources',
    async (container) => {
      clickButtonsByText(container, ['Yeni Kaynak', 'Resmî Katalog', 'Bekleyen', 'Kapsam', 'Denetim', 'Senkronize', 'Onayla', 'CSV']);
      await flushReact(10);
      const inputs = Array.from(container.querySelectorAll('input'));
      for (const inp of inputs.slice(0, 4)) {
        inp.value = '15.150.1005';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
      clickButtonsByText(container, ['Sorgula', 'Kaydet', 'Kapat', 'İptal']);
    },
  );
  assert.ok(pricingHtml.length > 500);

  const planEditorNewHtml = await renderInRouter(
    createElement(PlanEditor),
    '/admin/plans/new',
    '/admin/plans/new',
    async (container) => {
      clickButtonsByText(container, ['14 Günlük', 'Denetçi', 'Profesyonel', 'Kurumsal', 'Kaydet']);
    },
  );
  assert.ok(planEditorNewHtml.length > 300);

  const planEditorEditHtml = await renderInRouter(
    createElement(PlanEditor),
    '/admin/plans/:planId',
    '/admin/plans/plan-pro',
    async (container) => {
      clickButtonsByText(container, ['Kaydet', 'Önizleme']);
    },
  );
  assert.ok(planEditorEditHtml.length > 300);

  const plansListHtml = await renderInRouter(
    createElement(PlansList),
    '/admin/plans',
    '/admin/plans',
    async (container) => {
      clickButtonsByText(container, ['Pasife Al', 'Onayla', 'Reddet', 'Banka', 'Yeni']);
    },
  );
  assert.ok(plansListHtml.length > 300);

  const tenantDetailHtml = await renderInRouter(
    createElement(TenantDetail),
    '/admin/tenants/:companyId',
    '/admin/tenants/comp-1',
    async (container) => {
      clickButtonsByText(container, ['Kaydet', 'Güncelle', 'Oturum', 'Onayla', 'UZMAN Ata']);
    },
  );
  assert.ok(tenantDetailHtml.length > 300);
  assert.match(tenantDetailHtml, /Aylık Teklif Kotası:[\s\S]{0,250}25 adet/);

  const tenantsListHtml = await renderInRouter(
    createElement(TenantsList),
    '/admin/tenants',
    '/admin/tenants',
    async (container) => {
      clickButtonsByText(container, ['Düzenle', 'CSV', 'Yenile']);
    },
  );
  assert.ok(tenantsListHtml.length > 200);

  const queueHtml = await renderInRouter(
    createElement(AdminQueue),
    '/admin/queue',
    '/admin/queue',
    async (container) => {
      clickButtonsByText(container, ['Başarılı']);
    },
  );
  assert.ok(queueHtml.length > 200);
  assert.match(queueHtml, /ofis_statik\.ifc/);
  assert.doesNotMatch(queueHtml, /Eşleşen kuyruk işlemi bulunamadı/);

  const reportsHtml = await renderInRouter(
    createElement(AdminReports),
    '/admin/reports',
    '/admin/reports',
    async (container) => {
      clickButtonsByText(container, ['CSV', 'İndir', 'Yenile']);
    },
  );
  assert.ok(reportsHtml.length > 200);
  assert.match(reportsHtml, /BIMPlan Mühendislik A\.Ş\./);
  assert.match(reportsHtml, /62 Teklif/);
  assert.match(reportsHtml, /29 IFC/);
  assert.doesNotMatch(reportsHtml, /Henüz kullanım verisi bulunan firma yok/);

  const dashHtml = await renderInRouter(createElement(AdminDashboard), '/admin', '/admin');
  assert.ok(dashHtml.length > 200);

  const logsHtml = await renderInRouter(createElement(AdminLogs), '/admin/logs', '/admin/logs');
  assert.ok(logsHtml.length > 100);

  const roadmapHtml = await renderInRouter(createElement(DeveloperRoadmap), '/admin/roadmap', '/admin/roadmap');
  assert.ok(roadmapHtml.length > 500);

  const calcMethodsHtml = await renderInRouter(
    createElement(CalculationMethods),
    '/admin/roadmap/calculations',
    '/admin/roadmap/calculations',
    async (container) => {
      clickButtonsByText(container, ['Revizyon', 'Formül', 'Kanıt']);
    },
  );
  assert.ok(calcMethodsHtml.length > 500);

  const expertHtml = await renderInRouter(createElement(ExpertReview), '/admin/roadmap/expert-review', '/admin/roadmap/expert-review');
  assert.ok(expertHtml.length > 200);
});

test('T43 UI Slice 2: Çalışma alanı ve ticari sayfalar (CreateQuote, Quotes, QuoteDetail, Billing, Settings, Dashboard, Clients, CRM, DealDetail, Profitability, ProgressPayments, MarketIntelligence, Regulations, PilotApplications) JSDOM altında çalışır', async () => {
  mockIsSuperAdmin = false;
  const createQuoteHtml = await renderInRouter(
    createElement(CreateQuote),
    '/app/quotes/new',
    '/app/quotes/new',
    async (container) => {
      clickButtonsByText(container, ['Kalem Ekle', 'Katalog', 'Hızlı Müşteri Ekle', 'Taslak', 'Kaydet']);
    },
  );
  assert.ok(createQuoteHtml.length > 400);
  assert.match(createQuoteHtml, /data-testid="quote-toolbar"/);
  // M-12.4: risk and delivery assumptions live in a closed "Gelişmiş" section that states their values.
  assert.match(createQuoteHtml, /data-testid="quote-advanced"/);
  assert.match(createQuoteHtml, /Gelişmiş · süre, risk primleri, bilgi teslimi/);
  assert.match(createQuoteHtml, /data-testid="quote-advanced-summary">[^<]*ay · %/);
  assert.doesNotMatch(createQuoteHtml, /<details[^>]*data-testid="quote-advanced"[^>]* open=""/, 'advanced section starts closed');

  const quotesHtml = await renderInRouter(
    createElement(Quotes),
    '/app/quotes',
    '/app/quotes',
    async (container) => {
      const search = container.querySelector('input');
      if (search) {
        search.value = 'Kadıköy';
        search.dispatchEvent(new Event('input', { bubbles: true }));
        search.dispatchEvent(new Event('change', { bubbles: true }));
      }
      clickButtonsByText(container, ['Yenile', 'Kopyala']);
    },
  );
  assert.ok(quotesHtml.length > 200);

  const quoteDetailHtml = await renderInRouter(
    createElement(QuoteDetail),
    '/app/quotes/:id',
    '/app/quotes/quote-1',
    async (container) => {
      clickButtonsByText(container, ['Finansal', 'Kalibrasyon', 'Kaydet', 'Revizyon', 'PDF']);
    },
  );
  assert.ok(quoteDetailHtml.length > 300);

  const billingHtml = await renderInRouter(
    createElement(Billing),
    '/app/billing',
    '/app/billing?planId=plan-pro&cycle=yearly',
    async (container) => {
      clickButtonsByText(container, ['Yıllık', 'Aylık', '3 Aylık', 'Havale', 'Bildir', 'Seç']);
    },
  );
  assert.ok(billingHtml.length > 300);

  const settingsHtml = await renderInRouter(
    createElement(Settings),
    '/app/settings',
    '/app/settings',
    async (container) => {
      clickButtonsByText(container, ['Almanya', 'Birleşik Krallık', 'Amerika', 'Türkiye', 'Kaydet', 'Davet']);
    },
  );
  assert.ok(settingsHtml.length > 300);

  const dashboardHtml = await renderInRouter(createElement(Dashboard), '/app', '/app');
  assert.ok(dashboardHtml.length > 300);

  assert.equal(normalizePipelineStage('unknown'), null);
  const clientsHtml = await renderInRouter(
    createElement(Clients),
    '/app/clients',
    '/app/clients',
    async (container) => {
      clickButtonsByText(container, ['Potansiyel', 'Düzenle / Not', 'Excel / CSV İçe Aktar', 'Yeni Müşteri', 'Kaydet']);
    },
  );
  assert.ok(clientsHtml.length > 200);

  const clientDetailHtml = await renderInRouter(
    createElement(ClientDetail),
    '/app/clients/:id',
    '/app/clients/client-1',
    async (container) => {
      clickButtonsByText(container, ['Görüşüldü', 'Fırsat Aç', 'Notu Kaydet', 'Değişiklikleri Kaydet']);
    },
  );
  assert.ok(clientDetailHtml.length > 200);

  await renderInRouter(
    createElement(ClientImportModal, { open: true, onOpenChange: () => {}, onImported: () => {} }),
    '/app/clients',
    '/app/clients',
  );

  await renderInRouter(
    createElement(ClientQuickDrawer, {
      open: true,
      client: {
        id: 'client-1',
        companyId: 'comp-1',
        name: 'Anadolu Yapı Yatırım A.Ş.',
        type: 'company',
        email: 'murat@anadoluyapi.com.tr',
        phone: '+90 212 444 0900',
        address: 'Levent / İstanbul',
        pipelineStage: 'quotation_sent' as any,
        notes: '[[STAGE_NOTE|stage=quotation_sent|at=2026-10-27T10:00:00Z|id=n-1]] Teklif sunuldu.',
        createdAt: Date.now(),
      },
      onOpenChange: () => {},
      onUpdated: () => {},
    }),
    '/app/clients',
    '/app/clients',
    async () => {
      clickButtonsByText(document.body, ['Pazarlık', 'Kaydet']);
    },
  );

  const crmHtml = await renderInRouter(
    createElement(CRM),
    '/app/crm',
    '/app/crm',
    async (container) => {
      clickButtonsByText(container, ['Lead havuzu', 'Fırsatlar', 'Yeni fırsat']);
    },
  );
  assert.ok(crmHtml.length > 200);

  const dealDetailHtml = await renderInRouter(createElement(DealDetail), '/app/crm/:id', '/app/crm/deal-1');
  assert.ok(dealDetailHtml.length > 150);

  const profitHtml = await renderInRouter(createElement(Profitability), '/app/profitability', '/app/profitability');
  assert.ok(profitHtml.length > 150);

  assert.match(formatMoney('12500', 'TRY'), /12\.500/);
  const ppHtml = await renderInRouter(createElement(ProgressPayments), '/app/progress-payments', '/app/progress-payments');
  assert.ok(ppHtml.length > 200);

  const miHtml = await renderInRouter(createElement(MarketIntelligence), '/app/market-intelligence', '/app/market-intelligence');
  assert.ok(miHtml.length > 200);

  const regHtml = await renderInRouter(
    createElement(Regulations),
    '/app/regulations',
    '/app/regulations',
    async (container) => {
      clickButtonsByText(container, ['Senkronize', 'Uyarı', 'Versiyon']);
    },
  );
  assert.ok(regHtml.length > 200);

  const pilotAppsHtml = await renderInRouter(createElement(PilotApplications), '/app/pilot-applications', '/app/pilot-applications');
  assert.ok(pilotAppsHtml.length > 200);

  const pilotAppHtml = await renderInRouter(createElement(PilotApplication), '/pilot-basvuru', '/pilot-basvuru');
  assert.ok(pilotAppHtml.length > 150);

  const pilotEvidenceHtml = await renderInRouter(createElement(PilotEvidence), '/pilot-kanit', '/pilot-kanit');
  assert.ok(pilotEvidenceHtml.length > 150);

  const aiHtml = await renderInRouter(createElement(AIAssistant), '/app/ai-assistant', '/app/ai-assistant');
  assert.ok(aiHtml.length > 100);
});

test('T43 UI Slice 3: Genel vitrin, kimlik doğrulama ve mühendislik hesaplayıcı sayfaları JSDOM altında çalışır', async () => {
  const landingHtml = await renderInRouter(
    createElement(LandingPage),
    '/',
    '/',
    async (container) => {
      clickButtonsByText(container, ['Yıllık', 'Aylık', 'SSS', 'Nasıl']);
    },
  );
  assert.ok(landingHtml.length > 500);


  const smartCheckDemoHtml = await renderInRouter(
    createElement(SmartCheckDemo),
    '/smartcheck-demo',
    '/smartcheck-demo',
    async (container) => {
      clickButtonsByText(container, ['Analiz', 'Örnek', 'Rapor']);
    },
  );
  assert.ok(smartCheckDemoHtml.length > 300);

  const pubAcadHtml = await renderInRouter(createElement(PublicAcademy), '/academy', '/academy');
  assert.ok(pubAcadHtml.length > 200);

  const pubAcadDetailHtml = await renderInRouter(
    createElement(PublicAcademyDetail),
    '/academy/:slug',
    '/academy/allplan-bim-temelleri',
  );
  assert.ok(pubAcadDetailHtml.length > 200);

  const howHtml = await renderInRouter(createElement(HowItWorks), '/nasil-calisir', '/nasil-calisir');
  assert.ok(howHtml.length > 200);

  const legalKvkk = await renderInRouter(createElement(LegalPage), '/hukuk/:slug', '/hukuk/kvkk');
  assert.ok(legalKvkk.length > 150);

  const loginHtml = await renderInRouter(createElement(Login), '/login', '/login');
  assert.ok(loginHtml.length > 150);

  const registerHtml = await renderInRouter(
    createElement(Register),
    '/register',
    '/register?plan=plan-pro&cycle=yearly',
    async (container) => {
      clickButtonsByText(container, ['Kurumsal', 'Akademi', 'Devam', 'Kayıt']);
    },
  );
  assert.ok(registerHtml.length > 300);

  const recoveryHtml = await renderInRouter(createElement(PasswordRecovery), '/forgot-password', '/forgot-password');
  assert.ok(recoveryHtml.length > 100);

  const verifyHtml = await renderInRouter(createElement(VerifyEmail), '/verify-email/:token', '/verify-email/tok-123');
  assert.ok(verifyHtml.length > 100);

  const inviteHtml = await renderInRouter(createElement(AcceptInvite), '/accept-invite/:token', '/accept-invite/inv-123');
  assert.ok(inviteHtml.length > 150);

  const notFoundHtml = await renderInRouter(createElement(NotFound), '/404', '/404');
  assert.ok(notFoundHtml.length > 100);

  const calcIndexHtml = await renderInRouter(createElement(CalculatorsIndexPage), '/hesaplayicilar', '/hesaplayicilar');
  assert.ok(calcIndexHtml.length > 200);

  const ffHtml = await renderInRouter(
    createElement(PriceEscalationCalculatorPage),
    '/hesaplayicilar/fiyat-farki',
    '/hesaplayicilar/fiyat-farki',
    async (container) => {
      clickButtonsByText(container, ['Örnek', 'Hesapla', 'Temizle']);
    },
  );
  assert.ok(ffHtml.length > 300);

  const kkHtml = await renderInRouter(
    createElement(KatKarsiligiCalculatorPage),
    '/hesaplayicilar/kat-karsiligi',
    '/hesaplayicilar/kat-karsiligi',
    async (container) => {
      clickButtonsByText(container, ['Örnek', 'Hesapla']);
    },
  );
  assert.ok(kkHtml.length > 300);

  const kikHtml = await renderInRouter(
    createElement(KikAdtCalculatorPage),
    '/hesaplayicilar/kik-asiri-dusuk',
    '/hesaplayicilar/kik-asiri-dusuk',
    async (container) => {
      clickButtonsByText(container, ['Örnek', 'Hesapla']);
    },
  );
  assert.ok(kikHtml.length > 300);

  const yambisHtml = await renderInRouter(
    createElement(YambisCalculatorPage),
    '/hesaplayicilar/yambis-yetki-sinifi',
    '/hesaplayicilar/yambis-yetki-sinifi',
    async (container) => {
      clickButtonsByText(container, ['Örnek', 'Hesapla']);
    },
  );
  assert.ok(yambisHtml.length > 300);
});

test('T43 UI Slice 4: SmartCheck, CalmIfcWorkspace, BimIfcParser, BimGapAnalysis ve BIMPlan mühendislik bileşenleri JSDOM altında çalışır', async () => {
  const sampleElements = [
    {
      id: 'el-wall-1',
      guid: '2O2Fr$t4X7Zf8NOew3FLOH',
      type: 'IfcWall' as const,
      name: 'Dış Cephe Tuğla Duvar 20cm',
      storey: 'Zemin Kat',
      storeySource: 'ifc_spatial' as const,
      volumeM3: 12.4,
      areaM2: 62.0,
      grossAreaM2: 62.0,
      openingAreaM2: 7.5,
      formworkM2: 0,
      rebarKg: 0,
      pozNo: '15.270.1005',
      quantitySource: 'qto' as const,
      quantitySourcePath: 'Qto_WallBaseQuantities.NetSideArea',
      smartCheckStatus: 'pass' as const,
      smartCheckNote: 'Doğrulandı',
    },
    {
      id: 'el-col-1',
      guid: '3P3Gs$u5Y8Ag9OPfx4GMPI',
      type: 'IfcColumn' as const,
      name: 'Kolon S101 C30/37',
      storey: 'Zemin Kat',
      storeySource: 'ifc_spatial' as const,
      volumeM3: 4.8,
      formworkM2: 24.0,
      rebarKg: 620,
      pozNo: '15.150.1006',
      quantitySource: 'qto' as const,
      quantitySourcePath: 'Qto_ColumnBaseQuantities.NetVolume',
      smartCheckStatus: 'pass' as const,
      smartCheckNote: 'Doğrulandı',
    },
    {
      id: 'el-rebar-1',
      guid: '4Q4Ht$v6Z9Bh0PQgy5HNQJ',
      type: 'IfcReinforcingBar' as const,
      name: 'Donatı B420C Ø16',
      storey: 'Zemin Kat',
      storeySource: 'ifc_spatial' as const,
      volumeM3: 0.12,
      formworkM2: 0,
      rebarKg: 942,
      pozNo: '15.160.1004',
      quantitySource: 'qto' as const,
      quantitySourcePath: 'Qto_ReinforcingElementBaseQuantities.Weight',
      smartCheckStatus: 'pass' as const,
      smartCheckNote: 'Doğrulandı',
    },
  ];

  const sampleApartment = {
    unitCode: 'D-01',
    unitLabel: 'Daire 1 (Zemin Kat)',
    storey: 'Zemin Kat',
    roomCount: 2,
    netSweepableM2: 50.5,
    balconyM2: 6.0,
    totalNetM2: 56.5,
    unitGrossM2: null,
    generalGrossM2: null,
    rooms: [
      { code: 'M-101', name: 'Salon', storey: 'Zemin Kat', netAreaM2: 34.0, floorFinish: 'Laminat Parke' },
      { code: 'M-102', name: 'Mutfak', storey: 'Zemin Kat', netAreaM2: 16.5, floorFinish: 'Seramik' },
    ],
  };

  const calmDataset = buildCalmIfcDatasetFromElements(
    sampleElements,
    {
      totalElements: 3,
      totalVolumeM3: 17.2,
      totalFormworkM2: 24.0,
      totalRebarKg: 1562,
      parseStatus: 'succeeded',
      apartmentSchedule: [sampleApartment],
    },
    'ornek_konut_ifc4.ifc',
  );

  const calmHtml = await renderInRouter(
    createElement(CalmIfcWorkspace, {
      dataset: calmDataset,
      documentId: 'doc-1',
      quotations: [{ id: 'quote-1', quoteNumber: 'TKF-2026-001', projectName: 'Kadıköy B Blok', status: 'draft' }],
      transferTarget: { mode: 'revision', quotationId: 'quote-1' },
      showTechnicalToggle: true,
      technicalViewOpen: false,
    }),
    '/app/smartcheck',
    '/app/smartcheck',
    async (container) => {
      clickButtonsByText(container, ['Daire', 'Maliyet', 'İcmal', 'Uzman', 'Cetvel', 'Aktar']);
    },
  );
  assert.ok(calmHtml.length > 500);

  // M-14.5: KİK and 4735 tools only for public tenders; the ISO 19650 card stays in the Araçlar section.
  const calmCostProps = {
    dataset: calmDataset,
    documentId: 'doc-1',
    quotations: [{ id: 'quote-1', quoteNumber: 'TKF-2026-001', projectName: 'Kadıköy B Blok', status: 'draft' }],
    transferTarget: { mode: 'revision' as const, quotationId: 'quote-1' },
  };
  localStorage.removeItem('bimmetraj:calm-public-tender:v1');
  const privateCostHtml = await renderInRouter(createElement(CalmIfcWorkspace, calmCostProps), '/app/smartcheck', '/app/smartcheck', async (container) => {
    clickButtonsByText(container, ['Maliyet']);
  });
  assert.match(privateCostHtml, /data-testid="cost-tools"/);
  assert.doesNotMatch(privateCostHtml, /4734 KİK m\.38/, 'private work hides the public tender threshold tool');
  assert.doesNotMatch(privateCostHtml, /4735 FİYAT FARKI/);
  assert.match(privateCostHtml, /ISO 19650/);
  localStorage.setItem('bimmetraj:calm-public-tender:v1', '1');
  const publicCostHtml = await renderInRouter(createElement(CalmIfcWorkspace, calmCostProps), '/app/smartcheck', '/app/smartcheck', async (container) => {
    clickButtonsByText(container, ['Maliyet']);
  });
  assert.match(publicCostHtml, /4734 KİK m\.38/);
  assert.match(publicCostHtml, /4735 FİYAT FARKI/);
  localStorage.removeItem('bimmetraj:calm-public-tender:v1');

  const smartCheckWsHtml = await renderInRouter(
    createElement(SmartCheckImportWorkspace),
    '/app/smartcheck',
    '/app/smartcheck',
    async (container) => {
      clickButtonsByText(container, ['Yenile', 'Katalog', 'Eşleştir']);
    },
  );
  assert.ok(smartCheckWsHtml.length > 300);

  const bimIfcHtml = await renderInRouter(
    createElement(BimIfcParser, {}),
    '/app/ifc-parser',
    '/app/ifc-parser',
    async (container) => {
      clickButtonsByText(container, ['5-Katlı Betonarme Konut', 'Demo']);
      await flushReact(550);
      clickButtonsByText(container, ['Teknik', 'Detay']);
    },
  );
  assert.ok(bimIfcHtml.length > 400);

  const gapHtml = await renderInRouter(
    createElement(BimGapAnalysis),
    '/app/gap-analysis',
    '/app/gap-analysis',
    async (container) => {
      clickButtonsByText(container, ['Mimari', 'Statik', 'Mekanik', 'Tümü']);
    },
  );
  assert.ok(gapHtml.length > 400);

  const glossaryHtml = await renderInRouter(
    createElement(BimGlossary),
    '/bim-sozluk',
    '/bim-sozluk',
    async (container) => {
      const inp = container.querySelector('input');
      if (inp) {
        inp.value = 'IFC';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    },
  );
  assert.ok(glossaryHtml.length > 400);

  const bimDashHtml = await renderInRouter(createElement(BimDashboard), '/app/bim-dashboard', '/app/bim-dashboard');
  assert.ok(bimDashHtml.length > 300);

  const docsHtml = await renderInRouter(createElement(DocumentsView), '/app/documents', '/app/documents');
  assert.ok(docsHtml.length > 300);

  const preBimHtml = await renderInRouter(
    createElement(PreBimFeasibilityPanel),
    '/app/feasibility',
    '/app/feasibility',
    async (container) => {
      clickButtonsByText(container, ['Hesapla', 'Örnek']);
    },
  );
  assert.ok(preBimHtml.length > 300);
  // M-13.4: an untouched form shows a hint, not the validation errors of empty fields.
  assert.match(preBimHtml, /data-testid="feasibility-untouched"/);
  assert.doesNotMatch(preBimHtml, /Arsa alanı pozitif olmalı/);

  const feasibilityPageHtml = await renderInRouter(createElement(ParcelFeasibility), '/app/arsa-fizibilitesi', '/app/arsa-fizibilitesi');
  assert.match(feasibilityPageHtml, /Arsa Ön Fizibilitesi/);
  assert.match(feasibilityPageHtml, /data-testid="pre-bim-feasibility"/);

  const homeViewHtml = await renderInRouter(createElement(HomeView, { setView: () => {} }));
  assert.ok(homeViewHtml.length > 200);

  const legViewHtml = await renderInRouter(createElement(LegislationView));
  assert.ok(legViewHtml.length > 200);

  const stdViewHtml = await renderInRouter(createElement(StandardsView));
  assert.ok(stdViewHtml.length > 200);

  const headerFooterHtml = await renderInRouter(
    createElement('div', null, createElement(Header, { currentView: 'home', setView: () => {} }), createElement(Footer, { setView: () => {} })),
  );
  assert.ok(headerFooterHtml.length > 200);

  const firstItem = calmDataset.groups[0]?.items[0];
  const smartComponentsHtml = await renderInRouter(
    createElement(
      'div',
      null,
      createElement(ContractorWorkflowHub, { compact: false }),
      createElement(RevitChecklistCards, { items: REVIT_PRE_EXPORT_CHECKLIST }),
      createElement(AuthoringAdvisoryBanner, {}),
      createElement(RevitPreUploadChecklistPanel, {
        selectedDetection: detectAuthoringSoftware("FILE_NAME('proje.ifc','2026-10-26',(''),(''),'','Autodesk Revit 2026','');"),
      }),
      createElement(ApartmentSubcontractorShieldCard, {
        apartment: sampleApartment,
      }),
      createElement(SourceIntelligencePanel),
      createElement(CdeWorkflowPanel, {
        documentId: 'doc-1',
        targetState: 'SHARED',
        suitabilityCode: 'S1',
        revisionCode: 'P01.01',
      }),
      createElement(RegulationImpactPanel),
      createElement(EpysPreflightPanel, { documentId: 'doc-1', refreshKey: 1 }),
      createElement(PdfPreflightPanel, { documentId: 'doc-1', refreshKey: 1 }),
      createElement(IfcCoverageCard, {
        report: calmDataset.consistencyReport,
        elements: sampleElements,
        selectedElementKey: null,
        onSelectElement: () => {},
      }),
      createElement(UncoveredItemsView, {
        items: [
          {
            globalId: 'GUID-UNC-1',
            ifcClass: 'IfcWall',
            name: 'Bölme Duvar',
            storey: 'Kat 1',
            reason: 'Poz eşleşmedi',
            scope: 'in_takeoff',
            quantity: { value: 18.5, unit: 'm²' },
          },
        ],
        selectedElementKey: null,
        onRowClick: () => {},
      }),
      firstItem
        ? createElement(
            'div',
            null,
            createElement(MetrajCetveliSheet, {
              item: firstItem,
              fileName: 'ornek_konut_ifc4.ifc',
              open: true,
              onOpenChange: () => {},
            }),
            createElement(CalculationTraceSection, {
              item: firstItem,
              fileName: 'ornek_konut_ifc4.ifc',
              openings: 'unknown',
            }),
            createElement(ExpertLineVerification, {
              item: firstItem,
              record: undefined,
              onSave: () => {},
            }),
            createElement(ExpertVerificationBar, {
              items: [firstItem],
              records: {},
              reviewer: { name: 'Hazar Volga Ekiz', title: 'Yüksek İnşaat Mühendisi', registrationNo: 'İMO-54321' },
              onReviewerChange: () => {},
              fileName: 'ornek_konut_ifc4.ifc',
            }),
          )
        : null,
    ),
  );
  assert.ok(smartComponentsHtml.length > 500);
  assert.equal(parseExpertValue('12,5'), 12.5);
});

test('T43 UI Slice 5: Academy sayfaları, CADDiagramViewer, StudentProfile, AIBIMCompanion, ExamInterface, CertificatesViewer ve sertifika üretici JSDOM altında çalışır', async () => {
  await generateCertificateImage({
    studentName: 'Hazar Volga Ekiz',
    courseTitle: 'Allplan 2026 BIM Uzmanlık Sertifikası',
    certId: 'ALL-2026-HZR-01',
    verificationHash: '9f86d081884c7d659a2feaa0c55ad015',
    dateStr: '2026-10-26',
  });

  const sampleTrainee = {
    name: 'Hazar Volga Ekiz',
    email: 'hazarvolga@gmail.com',
    role: 'BIM Specialist',
    status: 'active' as const,
    completedCount: 12,
    totalCount: 30,
    highestExamScore: 90,
    certStatus: 'earned' as const,
    certHash: 'ALL-2026-HZR-01',
    updatedAt: Date.now(),
  };

  const sampleAttempts = [
    { id: 'att-1', score: 27, total: 30, percentage: 90, passed: true, timestamp: Date.now() },
  ];

  const firstGuide = Object.values(subGuidesData)[0] ?? null;

  const acadCompHtml = await renderInRouter(
    createElement(
      'div',
      null,
      createElement(CADDiagramViewer, { lessonTitle: 'Wall & Slab Structural Modeling' }),
      createElement(StudentProfile, {
        trainee: sampleTrainee,
        onUpdateTrainee: async () => {},
        completedLessons: ['Software overview', 'Building structure'],
        examAttempts: sampleAttempts,
        bookmarks: [{ moduleId: 'm1', moduleTitle: 'Building structure', bookmarkedAt: Date.now() }],
        notes: [{ id: 'n1', moduleId: 'm1', moduleTitle: 'Building structure', text: 'Kat yükseklikleri kontrol edildi.', createdAt: Date.now() }],
        lessonTimes: { 'Software overview': 950, 'Building structure': 1420 },
      }),
      createElement(AIBIMCompanion, {
        lessonTitle: 'Software overview',
        courseTitle: 'Allplan 2026 QuickStart',
      }),
      createElement(AcademyCompanion),
      createElement(ExamInterface, {
        onFinishExam: () => {},
        onClose: () => {},
      }),
      createElement(CertificatesViewer, {
        completedLessons: ['Software overview', 'Building structure'],
        examAttempts: sampleAttempts,
        trainee: sampleTrainee,
        onUpdateTrainee: async () => {},
      }),
      createElement(SubGuideDrawer, {
        guide: firstGuide,
        onClose: () => {},
      }),
      createElement(InlineCheckpoint, { lessonTitle: 'Software overview' }),
      createElement(ReinforcementEstimator, { initialCover: 30 }),
      createElement(WallIntersectionSimulator, { initialPriority: 300 }),
      createElement(BIMFAQViewer),
      createElement(CoordinateCalculator, {}),
      createElement(ShortcutTrainer, {}),
      createElement(TechnicalPanel, {
        title: 'Teknik Panel',
        children: createElement(
          'div',
          null,
          createElement(TechnicalBadge, { status: 'active', label: 'Aktif' }),
          createElement(TechnicalProgressBar, { progress: 75, status: 'complete' }),
          createElement(TechnicalButton, { onClick: () => {}, children: 'Çalıştır' }),
        ),
      }),
    ),
    '/app/academy',
    '/app/academy',
    async (container) => {
      clickButtonsByText(container, ['Düzenle', 'Sertifika', 'Kontrol', 'Sonraki', 'Tamamla']);
    },
  );
  assert.ok(acadCompHtml.length > 800);

  const acadPagesHtml = await renderInRouter(
    createElement(
      'div',
      null,
      createElement(Academy),
      createElement(AcademyActivation),
      createElement(AcademyCADPage),
      createElement(AcademyCertificatesPage),
      createElement(AcademyExamPage),
      createElement(AcademyProfilePage),
      createElement(AllplanAcademy),
      createElement(AllplanAccessGate),
      createElement(CompleteAcademyContent),
      createElement(LessonViewerPage),
      createElement(ProtectedAllplanLessonPage),
      createElement(SmartCheck),
      createElement(BimIfcParserPage),
      createElement(BimStandardsPage),
      createElement(BimGlossaryPage),
      createElement(PublicBimGlossaryPage),
    ),
  );
  assert.ok(acadPagesHtml.length > 500);
});

test('T43 UI Slice 6: Kabuk (Shell, AdminShell), Hızlı Tur (GuidedTour, TourCard), fiyatlandırma ve ortak UI bileşenleri JSDOM altında çalışır', async () => {
  mockIsSuperAdmin = true;
  applyPaftaTheme('dark');
  assert.equal(getActiveTheme(), 'dark');
  applyPaftaTheme('light');

  const style = tooltipStyle(USER_TOUR_STEPS[0], null);
  assert.equal(style.position, 'fixed');

  const shellHtml = await renderInRouter(
    createElement(
      ErrorBoundary,
      {
        children: createElement(
          'div',
          null,
          createElement(PublicMetadata, {
            title: 'BIMMetraj Test',
            description: 'Test açıklama',
            canonicalPath: '/app',
          }),
          createElement(Shell),
          createElement(AdminShell),
          createElement(PageHeader, {
            title: 'Metraj İcmal Başlığı',
            description: 'ÇŞB 2026 uyumlu metraj özeti',
            backButton: { label: 'Geri', onClick: () => {} },
          }),
          createElement(SectionWrapper, {
            title: 'Bölüm',
            description: 'Alt açıklama',
            children: createElement('p', null, 'İçerik'),
          }),
          createElement(GuidedTour, {
            steps: USER_TOUR_STEPS,
            open: true,
            onClose: () => {},
            storageKey: 'tour_test',
            ariaLabel: 'Hızlı Tur',
          }),
          createElement(TourCard, {
            ariaLabel: 'Tur Kartı',
            step: USER_TOUR_STEPS[0],
            index: 0,
            total: USER_TOUR_STEPS.length,
            rect: null,
            loading: false,
            onPrev: () => {},
            onNext: () => {},
            onDismiss: () => {},
            onJump: () => {},
          }),
          createElement(TourWelcomeBanner, { onStartTour: () => {} }),
          createElement(QuotationCard, {
            quote: {
              id: 'q-1',
              title: 'Kadıköy B Blok',
              clientName: 'Anadolu Yapı',
              totalAmount: 3360000,
              status: 'sent',
              profitMargin: 18.5,
              createdAt: '2026-10-20',
            },
          }),
          createElement(ProfitabilityBadge, { margin: 22.5 }),
          createElement(ProfitabilityBadge, { margin: 12.0 }),
          createElement(ProfitabilityBadge, { margin: 4.0 }),
          createElement(StatusBadge, { status: 'sent' }),
          createElement(StatusBadge, { status: 'accepted' }),
          createElement(StatusBadge, { status: 'rejected' }),
          createElement(StatCard, { title: 'Toplam Teklif', value: '42', trend: '+12%', icon: TrendingUp }),
          createElement(EmptyState, {
            title: 'Kayıt Yok',
            description: 'Henüz kayıt eklenmedi.',
            actionText: 'Yeni Ekle',
            onAction: () => {},
          }),
          createElement(PaftaDrawing, { compact: false }),
          createElement(ThemeToggle),
          createElement(PublicPricingSection, {}),
        ),
      },
    ),
    '/app',
    '/app',
  );
  assert.ok(shellHtml.length > 500);
});
