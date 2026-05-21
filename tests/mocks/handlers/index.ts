/**
 * Aggregates every MSW handler module under `tests/mocks/handlers/` into a
 * single `handlers` array consumed by:
 *
 *   - `tests/mocks/server.ts`  — boots MSW in the Node (Vitest) worker.
 *   - `tests/mocks/browser.ts` — boots MSW in the browser (Vite dev server)
 *                                used by Playwright dev-server flows.
 *
 * --------------------------------------------------------------------------
 * Aggregation order
 * --------------------------------------------------------------------------
 *
 * The order in which handlers appear in the array matters: MSW resolves
 * matches first-match-wins, so MORE specific handlers must come earlier
 * than catch-all handlers. The current modules do not have overlapping
 * URLs (auth, link-accounts, and password each cover distinct endpoints),
 * so the order is purely organisational:
 *
 *   1. `authHandlers`           — sign-in, sign-up, OAuth authorize/callback.
 *   2. `linkAccountsHandlers`   — account-link confirmation.
 *   3. `passwordHandlers`       — forgot-password.
 *
 * Each handler module registers BOTH a relative-URL and an absolute-URL
 * variant of every endpoint (see `tests/mocks/handlers/auth.ts` for the
 * pattern). This dual-URL contract is mandatory because Vitest+happy-dom
 * issues relative-URL requests against `about:blank` while Playwright
 * dev-server flows issue absolute-URL requests against `TEST_APP_ORIGIN`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.4.4 — Mock Object Specifications.
 *   - AAP Section 0.5.1 — File row for `tests/mocks/handlers/index.ts`.
 *   - QA Issue 7 — File missing.
 */

import type { HttpHandler } from 'msw';
import { authHandlers } from './auth';
import { linkAccountsHandlers } from './link';
import { passwordHandlers } from './password';

/**
 * Concatenated handler array consumed by `setupServer(...handlers)` in
 * `tests/mocks/server.ts` and `setupWorker(...handlers)` in
 * `tests/mocks/browser.ts`.
 *
 * Declared `readonly` so downstream consumers cannot accidentally mutate
 * the shared registration — handler overrides for individual tests go
 * through `server.use(...)` / `worker.use(...)` instead.
 */
export const handlers: readonly HttpHandler[] = [
    ...authHandlers,
    ...linkAccountsHandlers,
    ...passwordHandlers,
];

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Re-export the per-module handler arrays so test specs can install a
// subset of handlers (e.g., a spec that only cares about the password
// endpoint can do `server.use(...passwordHandlers)` without dragging in
// the entire auth + link surface).
export { authHandlers } from './auth';
export { linkAccountsHandlers } from './link';
export { passwordHandlers } from './password';

// Re-export the activation helpers so specs can drive non-default
// response variants without importing the per-handler files directly.
// These are the canonical, contract-stable entry points for variant
// activation.
export {
    activateLinkAccountsHandler,
    type LinkAccountsOutcome,
    type LinkAccountsHandlerServer,
} from './link';
export {
    activateForgotPasswordHandler,
    type ForgotPasswordOutcome,
    type ForgotPasswordHandlerServer,
} from './password';

// Re-export the auth-handler error injection factories so specs can
// register one-off network or server errors without importing
// `./auth` directly.
export { signInServerError, signInNetworkError } from './auth';
