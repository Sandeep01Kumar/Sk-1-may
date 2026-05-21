/**
 * MSW browser-worker entry point.
 *
 * Boots Mock Service Worker inside the browser context served by the
 * Vite dev server so Playwright E2E and visual specs running against
 * `http://127.0.0.1:5173` can intercept HTTP requests at the network
 * layer without contacting any real backend.
 *
 * --------------------------------------------------------------------------
 * Activation flow
 * --------------------------------------------------------------------------
 *
 * The worker is started automatically by the Vite dev server when the
 * `MOCK_API=true` environment variable is set (see `vite.config.ts`).
 * Activation happens in two steps:
 *
 *   1. The Vite plugin pipeline injects a tiny entry script that calls
 *      `worker.start({ onUnhandledRequest: 'bypass' })` before the React
 *      app boots. The `bypass` strategy is correct for the browser
 *      context because Vite itself issues HMR/asset requests that MSW
 *      should not intercept.
 *
 *   2. Test specs that need to override handlers per-test call
 *      `worker.use(...)` from within Playwright via `page.evaluate(...)`.
 *
 * --------------------------------------------------------------------------
 * Service worker file
 * --------------------------------------------------------------------------
 *
 * MSW's browser integration requires a generated `mockServiceWorker.js`
 * file served from the public root. Bootstrapping that file is handled
 * by `npx msw init <public-dir>` during local setup; it is not committed
 * by this module because the file is environment-specific (it contains
 * the MSW version it was generated against).
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.4.4 — Mock Object Specifications.
 *   - AAP Section 0.5.1 — File row for `tests/mocks/browser.ts`.
 *   - QA Issue 6 — File missing.
 *   - MSW v2 documentation: setupWorker accepts a variadic list of
 *     handlers and returns a `SetupWorker` instance with `.start`,
 *     `.stop`, `.use`, `.resetHandlers`, `.restoreHandlers`.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * The singleton MSW browser worker.
 *
 * Exported so:
 *
 *   - The Vite dev-server activation script can call `worker.start(...)`.
 *   - Playwright specs can install per-test handler overrides via
 *     `page.evaluate(() => window.__mswWorker.use(...))` patterns.
 *
 * The spread of `handlers` registers every handler in the aggregation.
 * Each handler is registered TWICE (relative + absolute URL) so requests
 * issued either as same-origin relative paths or as absolute URLs against
 * the dev server are both intercepted by the same worker instance.
 */
export const worker = setupWorker(...handlers);
