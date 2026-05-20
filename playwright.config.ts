import { defineConfig, devices } from '@playwright/test';

// Playwright configuration for E2E + visual regression + cross-browser +
// cross-device coverage of the eight Figma SSO frames.
//
// Project matrix: { chromium, firefox, webkit } x { desktop, tablet, mobile }
// = 9 distinct projects. Every E2E spec under tests/e2e and every
// visual spec under tests/visual runs across the matrix.
//
// - desktop : 1440 x 1024 (Figma frame size)
// - tablet  :  768 x 1024
// - mobile  :  375 x  812
//
// Visual baselines live under tests/visual/baselines/{viewport}/*.png and
// are compared by `expect(page).toHaveScreenshot()`. Tolerance is set to
// 0.1% pixel mismatch per AAP Section 0.7.3.
//
// The dev server is launched automatically by Playwright unless a server
// is already running at baseURL. Set CI=true to enable the deterministic
// CI defaults (no retries during local development, single retry in CI).
export default defineConfig({
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Under `exactOptionalPropertyTypes: true` (see tsconfig.json), `undefined`
  // is not assignable to an exact-optional property. Spread the `workers`
  // option only when CI is set so the property is genuinely absent locally.
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
  ],
  outputDir: 'test-results',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // Chromium x viewports
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 } },
    },
    {
      name: 'chromium-tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
    },
    // Firefox x viewports
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 1024 } },
    },
    {
      name: 'firefox-tablet',
      use: { ...devices['Desktop Firefox'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'firefox-mobile',
      use: { ...devices['Desktop Firefox'], viewport: { width: 375, height: 812 } },
    },
    // WebKit x viewports
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 1024 } },
    },
    {
      name: 'webkit-tablet',
      use: { ...devices['Desktop Safari'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['Desktop Safari'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
