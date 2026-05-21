/**
 * Vitest setup file for component, integration, and a11y test suites.
 *
 * This module is loaded by Vitest via `setupFiles: ['tests/setup/component.ts']`
 * in `vitest.config.ts`. Vitest evaluates it once per worker BEFORE any
 * test file runs, so the side-effects below configure the testing
 * environment for every test in the worker:
 *
 *   - Side-effect import of `@testing-library/jest-dom` registers
 *     DOM matchers (`toBeInTheDocument`, `toHaveAttribute`, etc.) on
 *     Vitest's `expect`.
 *
 *   - `beforeAll`/`afterEach`/`afterAll` hooks manage the MSW Node server
 *     and the `window.open` / `navigator.clipboard` stubs.
 *
 *   - `afterEach` calls `cleanup()` from `@testing-library/react` so the
 *     DOM is wiped between tests — preventing cross-test contamination
 *     from React components left mounted by previous specs.
 *
 * --------------------------------------------------------------------------
 * Hook order matters
 * --------------------------------------------------------------------------
 *
 *   beforeAll (in order):
 *     1. server.listen({ onUnhandledRequest: 'error' })
 *     2. installWindowStubs()
 *     3. installFontFaceSetStub() (only if FontFace API is missing)
 *     4. preloadInterFont() — fire-and-forget; the returned promise is
 *        awaited by tests that explicitly need it.
 *
 *   afterEach (in order):
 *     1. cleanup() — unmount React trees BEFORE resetting handlers so
 *        any unmount-triggered requests are intercepted by the current
 *        handlers (not the next test's handlers).
 *     2. server.resetHandlers() — restore the default handler set.
 *     3. resetWindowStubs() — restore the default popup return and clear
 *        the call log.
 *
 *   afterAll (in order):
 *     1. server.close() — tear down request interception.
 *     2. restoreFontFaceSetStub() — restore the pre-stub FontFace API.
 *
 * --------------------------------------------------------------------------
 * The `onUnhandledRequest: 'error'` strategy
 * --------------------------------------------------------------------------
 *
 * MSW v2's `'error'` strategy causes any unhandled outbound HTTP request
 * to throw — failing the test loudly rather than silently passing
 * through to the real network. This is the recommended strategy for
 * Vitest because:
 *
 *   - Tests should not contact real backends — that would be flaky.
 *   - Missing handlers should surface as test failures, not as
 *     unexplained timeouts when the real backend is slow.
 *   - The strict mode forces fixtures to stay in sync with the
 *     application's actual network usage as the SUT evolves.
 *
 * Tests that intentionally make a request the handlers do not match
 * either (a) add a handler via `server.use(...)` or (b) call
 * `server.listen({ onUnhandledRequest: 'bypass' })` in a `beforeAll`
 * override for that test file.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.4.4 — Mock Object Specifications.
 *   - AAP Section 0.5.1 — File row for `tests/setup/component.ts`.
 *   - AAP Section 0.7.2 — Test isolation requirements.
 *   - QA Issue 1 — File missing.
 *   - vitest.config.ts line for `setupFiles: ['tests/setup/component.ts']`.
 */

// =============================================================================
// SIDE-EFFECT IMPORTS — register DOM matchers and font face stubs
// =============================================================================

/**
 * Register `toBeInTheDocument`, `toHaveAttribute`, `toHaveTextContent`,
 * `toHaveStyle`, and all other jest-dom matchers on Vitest's `expect`.
 *
 * jest-dom v6 ships a Vitest-compatible entry point that detects
 * Vitest's `expect` and calls `expect.extend(...)` automatically when
 * the module is loaded.
 */
import '@testing-library/jest-dom/vitest';

// =============================================================================
// NAMED IMPORTS
// =============================================================================

import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '@tests/mocks/server';
import {
    installFontFaceSetStub,
    preloadInterFont,
    restoreFontFaceSetStub,
} from '@tests/mocks/assets';
import { installWindowStubs, resetWindowStubs } from '@tests/mocks/window';

// =============================================================================
// LIFECYCLE HOOKS
// =============================================================================

beforeAll(() => {
    // 1. Activate request interception. The `'error'` strategy fails
    //    tests that issue unhandled requests so missing handlers
    //    surface as actionable test failures.
    server.listen({ onUnhandledRequest: 'error' });

    // 2. Install window-level stubs (`window.open` spy and clipboard
    //    spy). Subsequent tests can introspect `getWindowOpenCalls()`
    //    and call `simulatePopupBlocked()` / `simulatePopupAllowed()`
    //    without re-installing.
    installWindowStubs();

    // 3. Install the FontFace stub for environments (like happy-dom)
    //    that do not implement the FontFace API. Idempotent — no-op
    //    when the API is already present.
    installFontFaceSetStub();

    // 4. Pre-warm the Inter font cache. `preloadInterFont()` returns a
    //    promise; we fire-and-forget here because most tests do not
    //    need to await it. Tests that depend on font-loaded layout
    //    (e.g., precise width measurements) should `await
    //    preloadInterFont()` again — the helper is idempotent.
    void preloadInterFont();
});

afterEach(() => {
    // 1. Unmount any React trees still in the DOM. This must run BEFORE
    //    `server.resetHandlers()` so unmount-triggered requests (e.g.,
    //    React's effect-cleanup `fetch` cancellations) are intercepted
    //    by the current test's handlers, not by the next test's.
    cleanup();

    // 2. Restore the default handler graph. Tests that called
    //    `server.use(...)` during the test (e.g., via
    //    `activateLinkAccountsHandler`) get their overrides cleared.
    server.resetHandlers();

    // 3. Clear the `window.open` call log and restore the default
    //    popup return value. Subsequent tests start from a clean
    //    introspection state.
    resetWindowStubs();
});

afterAll(() => {
    // 1. Tear down MSW request interception. Required so the worker
    //    process does not leak handles after the suite finishes.
    server.close();

    // 2. Restore the pre-stub FontFace API. Idempotent — no-op when
    //    the stub was not installed.
    restoreFontFaceSetStub();
});
