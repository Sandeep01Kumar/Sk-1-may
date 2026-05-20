import { defineConfig, devices } from '@playwright/test';

/*
 * Playwright Test Runner Configuration
 * =====================================
 *
 * Authoritative configuration for the SSO test suite's Playwright-driven
 * concerns:
 *
 *   - End-to-end specs   →  tests/e2e/**\/*.spec.ts
 *   - Visual regression  →  tests/visual/**\/*.spec.ts
 *   - A11y E2E scans     →  invoked via @axe-core/playwright from the
 *                           custom fixtures in tests/setup/playwright.ts
 *
 * Vitest-driven suites (unit / component / integration / a11y component
 * scans) are intentionally excluded by the narrow `testMatch` glob below.
 *
 * Cross-browser × cross-device matrix (AAP Section 0.9.2)
 * --------------------------------------------------------
 * Exactly nine projects — three browser engines crossed with three
 * viewports — give us the parity gate required by AAP Section 0.7.3.
 * One CI matrix shard is dispatched per project (see
 * `.github/workflows/test.yml`).
 *
 *   ┌──────────┬──────────────┬─────────────┬─────────────┐
 *   │          │ Desktop      │ Tablet      │ Mobile      │
 *   │          │ 1440 × 1024  │ 768 × 1024  │ 375 × 812   │
 *   ├──────────┼──────────────┼─────────────┼─────────────┤
 *   │ Chromium │ ✓ touch off  │ ✓ touch off │ ✓ touch on  │
 *   │ Firefox  │ ✓            │ ✓           │ ✓           │
 *   │ WebKit   │ ✓            │ ✓           │ ✓           │
 *   └──────────┴──────────────┴─────────────┴─────────────┘
 *
 * Visual baselines (AAP Section 0.5.1)
 * -------------------------------------
 * Authoritative baseline PNGs live under
 * tests/visual/baselines/{desktop,tablet,mobile}/*.png and are sourced
 * directly from Figma file `2qR7NSTmQLynkmlj9B4ltc`. Specs compare each
 * rendered page against the baseline using `toHaveScreenshot()` with the
 * tolerances declared in `expect.toHaveScreenshot` below.
 *
 * Dev server
 * ----------
 * The Playwright `webServer` block auto-launches Vite on
 * 127.0.0.1:5173 (matching `vite.config.ts` `server.host` / `server.port`)
 * and passes `MOCK_API=true` so the MSW browser worker registered by
 * `tests/mocks/browser.ts` intercepts OAuth provider calls. The frozen
 * `server.js` (port 3000) is unrelated to the test stack and is never
 * invoked here.
 *
 * Authority anchors
 * -----------------
 *   - AAP Section 0.5.1 — File-by-File Test Plan (this file).
 *   - AAP Section 0.5.4 — Test Configuration Updates.
 *   - AAP Section 0.7.2 — Parallelism, workers, performance budget.
 *   - AAP Section 0.7.3 — Visual + a11y + cross-browser + cross-device gates.
 *   - AAP Section 0.9.1 — `test:e2e`, `test:visual`, `test:e2e:headed`,
 *                          `test:e2e:debug` script bodies.
 *   - AAP Section 0.9.2 — CI matrix project names (must match exactly).
 *   - AAP Section 0.10.2 — Inter font; font-hinting tolerance rationale.
 */

// ---------------------------------------------------------------------------
// Environment-derived constants
// ---------------------------------------------------------------------------

/**
 * Base URL the test browsers navigate to. Defaults to the Vite dev server
 * but is overridable via `PLAYWRIGHT_BASE_URL` to support pointing the
 * suite at a staging environment without editing this file.
 */
const BASE_URL: string = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';

/**
 * Boolean flag derived from the canonical `CI` env var that GitHub
 * Actions (and most other CI systems) set automatically. Drives the
 * stricter `forbidOnly`, `retries`, `workers`, and `reuseExistingServer`
 * defaults that we want only in CI.
 */
const IS_CI: boolean = !!process.env.CI;

// ---------------------------------------------------------------------------
// Viewport dimensions (AAP Section 0.1.1)
// ---------------------------------------------------------------------------
//
// These constants are hoisted so that a single Figma-side viewport change
// is a one-line edit rather than nine project-level edits.

const DESKTOP_VIEWPORT = { width: 1440, height: 1024 } as const;
const TABLET_VIEWPORT = { width: 768, height: 1024 } as const;
const MOBILE_VIEWPORT = { width: 375, height: 812 } as const;

// ---------------------------------------------------------------------------
// Visual baseline directories (AAP Section 0.5.1)
// ---------------------------------------------------------------------------
//
// Authoritative on-disk locations for the visual-regression baselines.
// The committed Figma renderings live under `tests/visual/baselines/desktop/`
// today (eight PNGs); tablet and mobile directories will be populated on
// first run per AAP Section 0.10.5 once the SSO components are authored.
//
// Each Playwright project assigns one of these constants as its
// per-project `snapshotDir`. The top-level `snapshotPathTemplate` then
// resolves `{snapshotDir}` to the project-specific value, ensuring all
// three browsers at the same viewport share a single canonical baseline
// (Figma delivers only one rendering per viewport).
//
// Paths are repository-root-relative; Playwright resolves them against
// `testDir`'s parent (the repo root) at runtime.

const DESKTOP_BASELINE_DIR = 'tests/visual/baselines/desktop';
const TABLET_BASELINE_DIR = 'tests/visual/baselines/tablet';
const MOBILE_BASELINE_DIR = 'tests/visual/baselines/mobile';

// ---------------------------------------------------------------------------
// Default export — the Playwright `PlaywrightTestConfig` object.
// ---------------------------------------------------------------------------

export default defineConfig({
    // -----------------------------------------------------------------------
    // Test discovery
    // -----------------------------------------------------------------------

    // Scope discovery to the `tests/` directory; Vitest-only directories
    // (`tests/unit`, `tests/component`, `tests/integration`, `tests/a11y`)
    // are excluded by the explicit `testMatch` glob below.
    testDir: 'tests',

    // Match only E2E and visual regression spec files. Listed as a tuple
    // so adding a third Playwright-driven directory in the future is a
    // single-line append rather than a glob refactor.
    testMatch: ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts'],

    // -----------------------------------------------------------------------
    // Timeouts
    // -----------------------------------------------------------------------

    // Per-test timeout — generous enough for first-paint + OAuth modal
    // flows on slow CI runners but tight enough to surface deadlocks.
    timeout: 60_000,

    // -----------------------------------------------------------------------
    // Snapshot path resolution (AAP Section 0.5.1 + 0.7.3)
    // -----------------------------------------------------------------------
    //
    // Maps `expect(page).toHaveScreenshot('signin-a-microsoft-only.png')`
    // to a file on disk at `tests/visual/baselines/{viewport}/signin-a-microsoft-only.png`.
    //
    // Why `{snapshotDir}/{arg}{ext}` (and not `{projectName}` or
    // `{platform}`):
    //
    //   - The Figma file (`2qR7NSTmQLynkmlj9B4ltc`) delivers one PNG per
    //     screen at one resolution — desktop. All three browsers running
    //     at the desktop viewport must compare against that single
    //     authoritative baseline; introducing per-browser baselines
    //     would silently mask cross-browser regressions because each
    //     engine's first capture would become its own ground truth.
    //
    //   - Playwright's default template is
    //     `{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}`,
    //     which would orphan the committed `tests/visual/baselines/desktop/*.png`
    //     files (Issue 3 in the I1 QA report). Pointing the template at
    //     `{snapshotDir}` lets every project name its own baseline root
    //     via the per-project `snapshotDir` declaration, decoupling the
    //     storage layout from the project-name string.
    //
    //   - `{arg}` is the bare filename argument passed to
    //     `toHaveScreenshot(...)` (e.g. `'signin-a-microsoft-only'`),
    //     and `{ext}` is the file extension with its leading dot
    //     (`.png`). Together they reproduce the canonical filename the
    //     baseline was committed under.
    //
    // The companion per-project `snapshotDir` declarations (in
    // `projects[]` below) supply the `{snapshotDir}` value:
    //
    //   chromium-desktop ─┐
    //   firefox-desktop  ─┼─→ tests/visual/baselines/desktop/{arg}{ext}
    //   webkit-desktop   ─┘
    //
    //   chromium-tablet  ─┐
    //   firefox-tablet   ─┼─→ tests/visual/baselines/tablet/{arg}{ext}
    //   webkit-tablet    ─┘
    //
    //   chromium-mobile  ─┐
    //   firefox-mobile   ─┼─→ tests/visual/baselines/mobile/{arg}{ext}
    //   webkit-mobile    ─┘
    snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',

    // -----------------------------------------------------------------------
    // Assertion / matcher configuration
    // -----------------------------------------------------------------------

    expect: {
        // Default timeout for web-first assertions (`expect(locator)...`),
        // independent of the per-test `timeout` above.
        timeout: 10_000,

        // Visual regression baseline comparison defaults.
        //
        // `maxDiffPixelRatio: 0.001` enforces the ≤ 0.1% pixel-mismatch
        // gate required by AAP Section 0.7.3.
        //
        // `threshold: 0.2` controls per-pixel color sensitivity in the
        // 0..1 YIQ distance domain — large enough to tolerate font
        // hinting and sub-pixel anti-aliasing differences between
        // browsers (AAP Section 0.10.2) yet small enough to catch
        // genuine palette regressions like an `#5B39F3` → `#5B39F4`
        // drift in the brand-primary token.
        //
        // `animations: 'disabled'` halts CSS transitions and Web
        // Animations before the screenshot is captured, so the
        // captured pixels match the resting state of the page.
        //
        // `caret: 'hide'` removes the blinking text-input caret from
        // screenshots — focused inputs render identically whether the
        // caret is rendered or not, eliminating a common flake source.
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.001,
            threshold: 0.2,
            animations: 'disabled',
            caret: 'hide',
        },
    },

    // -----------------------------------------------------------------------
    // Execution model
    // -----------------------------------------------------------------------

    // Run every test file in parallel inside each project, and run
    // every project in parallel against every other project. Combined
    // with shard-per-project in CI, this gives us the
    // "under 12 minutes total across the nine-project matrix" budget
    // from AAP Section 0.7.2.
    fullyParallel: true,

    // Fail the build if `.only` was committed to any spec when running
    // in CI. Local runs allow `.only` to support focused debugging.
    forbidOnly: IS_CI,

    // Two retries per test in CI to absorb transient flakes (network,
    // first-paint timing); zero retries locally so flakes surface
    // immediately instead of being masked.
    retries: IS_CI ? 2 : 0,

    // Worker concurrency.
    //
    // AAP Section 0.7.2 mandates "two parallel workers" in CI; locally
    // Playwright auto-selects based on CPU count.
    //
    // The shape `...(IS_CI ? { workers: 2 } : {})` is required because
    // `tsconfig.json` enables `exactOptionalPropertyTypes: true`, under
    // which `workers: IS_CI ? 2 : undefined` would be a type error
    // (`undefined` is not assignable to an optional `number` property).
    // The conditional spread either includes or omits the property
    // entirely, satisfying both Playwright's runtime semantics and the
    // strict-TS contract.
    ...(IS_CI ? { workers: 2 } : {}),

    // -----------------------------------------------------------------------
    // Reporters
    // -----------------------------------------------------------------------
    //
    //   - `list`  — human-readable terminal output during local runs.
    //   - `html`  — self-contained HTML report under playwright-report/;
    //               `open: 'never'` so we don't auto-open a browser tab
    //               in CI or on a headless workstation.
    //   - `junit` — XML report ingested by GitHub Actions' test summary
    //               and by downstream CI dashboards.
    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['junit', { outputFile: 'test-results/junit/playwright.xml' }],
    ],

    // Per-test failure artifacts (screenshots, videos, traces) are
    // collected under this directory tree. The `.gitignore` excludes
    // it from version control.
    outputDir: 'test-results/playwright-artifacts',

    // -----------------------------------------------------------------------
    // `use` — defaults applied to every project unless overridden
    // -----------------------------------------------------------------------

    use: {
        // Browsers will resolve relative URLs against this base. Visual
        // and E2E specs therefore call `page.goto('/sso/sign-in')`
        // rather than hardcoding the host:port.
        baseURL: BASE_URL,

        // Capture a full Playwright trace (DOM snapshots, network log,
        // console messages, screenshots per action) only for tests
        // that fail, keeping artifact size manageable while preserving
        // forensic detail for triage. Open with
        // `npx playwright show-trace test-results/.../trace.zip`.
        trace: 'retain-on-failure',

        // Likewise for videos — recorded for every test but discarded
        // unless the test failed.
        video: 'retain-on-failure',

        // Capture a screenshot only on test failure (not on success
        // paths). Visual regression specs use `toHaveScreenshot()`
        // which produces its own artifacts independently of this.
        screenshot: 'only-on-failure',

        // Default timeout for actionable locators (click, fill, etc.).
        actionTimeout: 10_000,

        // Default timeout for page navigations. Generous because the
        // Vite dev server cold-start can dominate the first navigation
        // in a fresh CI runner.
        navigationTimeout: 30_000,

        // Standardize on `data-testid` for test-id queries. Aligns
        // Playwright's `page.getByTestId(...)` with the default used by
        // `@testing-library/dom` so the same selectors work across
        // Playwright specs and Vitest component tests.
        testIdAttribute: 'data-testid',

        // Force light mode. The Figma SSO frames are designed for
        // light mode only; pinning here ensures `prefers-color-scheme`
        // never flips to dark on hosts whose desktop is configured for
        // dark mode (common on macOS CI agents).
        colorScheme: 'light',

        // Pin the browser locale to English (US). Used by `Intl`,
        // `Date.toLocaleString()`, and form input placeholders so
        // visual baselines remain stable across runners with different
        // host locales.
        locale: 'en-US',

        // Pin the browser timezone to UTC. Any future date/time content
        // in the SSO screens renders identically across runners.
        timezoneId: 'UTC',
    },

    // -----------------------------------------------------------------------
    // Project matrix (AAP Section 0.9.2)
    // -----------------------------------------------------------------------
    //
    // Exactly nine projects. Project names MUST match the matrix in
    // `.github/workflows/test.yml` exactly — any drift causes CI to
    // dispatch a shard against a non-existent project, which Playwright
    // treats as "0 tests" (a silent pass).
    projects: [
        // --- Chromium × {desktop, tablet, mobile} ----------------------------
        //
        // Each project sets `snapshotDir` to the viewport-specific baseline
        // directory. Combined with the top-level
        // `snapshotPathTemplate: '{snapshotDir}/{arg}{ext}'`, this makes
        // every Chromium/Firefox/WebKit project at a given viewport compare
        // against the single Figma-sourced baseline for that viewport.
        {
            name: 'chromium-desktop',
            snapshotDir: DESKTOP_BASELINE_DIR,
            use: {
                ...devices['Desktop Chrome'],
                viewport: DESKTOP_VIEWPORT,
            },
        },
        {
            name: 'chromium-tablet',
            snapshotDir: TABLET_BASELINE_DIR,
            use: {
                ...devices['Desktop Chrome'],
                viewport: TABLET_VIEWPORT,
            },
        },
        {
            // The Chromium-mobile project additionally enables
            // `isMobile` (sets a mobile UA, viewport meta, and device
            // pixel ratio) and `hasTouch` (enables Touch* events). This
            // exercises the mobile code paths of the SSO surface as
            // closely as possible without a real device. Firefox does
            // not support `isMobile` (Playwright limitation, see
            // https://playwright.dev/docs/emulation#ismobile) so the
            // mobile variant is omitted from the Firefox projects.
            name: 'chromium-mobile',
            snapshotDir: MOBILE_BASELINE_DIR,
            use: {
                ...devices['Desktop Chrome'],
                viewport: MOBILE_VIEWPORT,
                isMobile: true,
                hasTouch: true,
            },
        },

        // --- Firefox × {desktop, tablet, mobile} -----------------------------
        {
            name: 'firefox-desktop',
            snapshotDir: DESKTOP_BASELINE_DIR,
            use: {
                ...devices['Desktop Firefox'],
                viewport: DESKTOP_VIEWPORT,
            },
        },
        {
            name: 'firefox-tablet',
            snapshotDir: TABLET_BASELINE_DIR,
            use: {
                ...devices['Desktop Firefox'],
                viewport: TABLET_VIEWPORT,
            },
        },
        {
            name: 'firefox-mobile',
            snapshotDir: MOBILE_BASELINE_DIR,
            use: {
                ...devices['Desktop Firefox'],
                viewport: MOBILE_VIEWPORT,
            },
        },

        // --- WebKit × {desktop, tablet, mobile} ------------------------------
        {
            name: 'webkit-desktop',
            snapshotDir: DESKTOP_BASELINE_DIR,
            use: {
                ...devices['Desktop Safari'],
                viewport: DESKTOP_VIEWPORT,
            },
        },
        {
            name: 'webkit-tablet',
            snapshotDir: TABLET_BASELINE_DIR,
            use: {
                ...devices['Desktop Safari'],
                viewport: TABLET_VIEWPORT,
            },
        },
        {
            name: 'webkit-mobile',
            snapshotDir: MOBILE_BASELINE_DIR,
            use: {
                ...devices['Desktop Safari'],
                viewport: MOBILE_VIEWPORT,
            },
        },
    ],

    // -----------------------------------------------------------------------
    // Dev server
    // -----------------------------------------------------------------------
    //
    // Playwright launches this server (or reuses an already-running one
    // locally) before any tests execute, then waits for `url` to respond
    // with a 2xx/3xx status. The server is gracefully shut down when
    // the suite finishes.
    webServer: {
        // Invoke Vite via `npx` so the resolution works regardless of
        // whether `node_modules/.bin` is on PATH. `--strictPort` makes
        // a port conflict fail fast rather than silently rebinding to
        // a different port (which would leave Playwright pointing at
        // the wrong URL).
        command: 'npx vite --host 127.0.0.1 --port 5173 --strictPort',

        // The URL Playwright probes to determine "the server is ready".
        // Must match the `--host` / `--port` arguments above and the
        // `BASE_URL` constant.
        url: BASE_URL,

        // Reuse a server that the developer already started with
        // `npm run dev`. In CI we always start fresh to guarantee a
        // clean process state.
        reuseExistingServer: !IS_CI,

        // Generous startup budget. Cold Vite startup on a fresh CI
        // runner — including dependency optimization and the React 19
        // pre-bundle — fits comfortably under this limit.
        timeout: 120_000,

        // Pipe the dev server's stdout/stderr to Playwright's reporter
        // so Vite errors (e.g., missing `index.html` once the SSO
        // implementation lands) surface in the test output rather than
        // being silently swallowed.
        stdout: 'pipe',
        stderr: 'pipe',

        // Activate the MSW browser worker (registered by
        // `tests/mocks/browser.ts` per AAP Section 0.4.4) so OAuth
        // provider, account-linking, and password-reset endpoints are
        // intercepted at the network layer. The Vite config reads this
        // flag via `loadEnv` (see `vite.config.ts` for the wiring).
        env: {
            MOCK_API: 'true',
        },
    },
});
