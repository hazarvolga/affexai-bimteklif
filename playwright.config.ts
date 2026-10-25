import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { E2E_BASE_URL } from './e2e/support/fixture';

// CI already ships Google Chrome for the Puppeteer smokes; reuse it instead of
// downloading a Playwright browser. Locally fall back to the installed Chrome.
const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const executablePath = chromeCandidates.find((path): path is string => Boolean(path && existsSync(path)));

export default defineConfig({
  testDir: './e2e',
  // One seeded tenant is shared, so specs run serially against one server.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['junit', { outputFile: 'test-results/e2e-junit.xml' }]],
  use: {
    baseURL: E2E_BASE_URL,
    locale: 'tr-TR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { executablePath } } }],
  webServer: {
    command: 'pnpm exec tsx e2e/support/server.ts',
    url: `${E2E_BASE_URL}/healthz`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 },
  },
});
