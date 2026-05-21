/**
 * MSW Node-server entry point.
 *
 * Boots Mock Service Worker inside the Vitest worker process so component,
 * integration, and accessibility tests can intercept HTTP requests issued
 * by the code under test without contacting any real backend.
 *
 * --------------------------------------------------------------------------
 * Lifecycle (wired by `tests/setup/component.ts`)
 * --------------------------------------------------------------------------
 *
 *   - `server.listen({ onUnhandledRequest: 'error' })`  in `beforeAll`
 *     Activates request interception. The `error` strategy fails any test
 *     that triggers an unhandled outbound request so missing handlers are
 *     surfaced immediately rather than silently passing through to the
 *     real network (which would be flaky and slow).
 *
 *   - `server.resetHandlers()`  in `afterEach`
 *     Restores the default handler set after each test. Tests that called
 *     `server.use(...)` to install overrides (e.g., via
 *     `activateLinkAccountsHandler`) get their overrides cleared so the
 *     next test starts from a clean baseline.
 *
 *   - `server.close()`  in `afterAll`
 *     Tears down request interception. Required so the worker process
 *     does not leak handles after the suite finishes.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.4.4 — Mock Object Specifications.
 *   - AAP Section 0.5.1 — File row for `tests/mocks/server.ts`.
 *   - QA Issue 5 — File missing.
 *   - MSW v2 documentation: setupServer accepts a variadic list of handlers
 *     and returns a `SetupServer` instance with `.listen`, `.close`,
 *     `.use`, `.resetHandlers`, `.restoreHandlers`, `.listHandlers`.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * The singleton MSW Node server.
 *
 * Exported so:
 *
 *   - `tests/setup/component.ts` can manage its lifecycle.
 *   - Individual test specs can call `server.use(...)` to install
 *     one-off handler overrides for the current test.
 *   - Activation helpers (`activateLinkAccountsHandler`,
 *     `activateForgotPasswordHandler`) accept the server as their
 *     first argument so the activation graph is explicit at the call site.
 *
 * The spread of `handlers` registers every handler in the aggregation
 * (auth + link-accounts + password). Each handler is registered TWICE
 * (relative + absolute URL) so the same server instance intercepts
 * requests from both Vitest+happy-dom and Playwright dev-server flows.
 */
export const server = setupServer(...handlers);
