/**
 * Window-level stubs for `window.open` and `navigator.clipboard`.
 *
 * This module supplies process-local stubs for the *non-HTTP* browser globals
 * touched by the SSO surface — OAuth pop-up windows (`window.open`) and the
 * Clipboard API affordances (`navigator.clipboard.writeText`,
 * `navigator.clipboard.readText`). MSW intercepts HTTP traffic at the
 * `fetch` / `XMLHttpRequest` boundary; it does **not** intercept window
 * globals. The stubs below close that gap so OAuth-popup and
 * copy-to-clipboard flows are deterministic in the Vitest + happy-dom
 * environment.
 *
 * Lifecycle (see `tests/setup/component.ts`):
 *
 *   beforeAll(() => { installWindowStubs(); });   // once per suite
 *   afterEach(() => { resetWindowStubs(); });     // between every test
 *
 * `installWindowStubs()` attaches the spies once and is idempotent — calling
 * it a second time is a no-op. `resetWindowStubs()` only clears the call
 * history and per-test return values (via `mockClear()`); it does **not**
 * uninstall the spies. The spies stay attached for the lifetime of the test
 * suite so subsequent tests inherit a fully-prepared window environment
 * without re-spy bookkeeping.
 *
 * Composition:
 *
 *   - `tests/setup/component.ts` imports `installWindowStubs` and
 *     `resetWindowStubs` directly and wires them into the Vitest hooks.
 *   - `tests/utils/oauth-stub.ts` composes the primitive helpers exported
 *     here (`setWindowOpenReturn`, `simulatePopupBlocked`,
 *     `simulatePopupAllowed`, `getWindowOpenCalls`) into OAuth-scenario
 *     fixtures for the integration and E2E specs.
 *
 * Boundaries:
 *
 *   - **NOT** an MSW handler module. HTTP interception lives in
 *     `tests/mocks/server.ts` and `tests/mocks/browser.ts`.
 *   - **NOT** OAuth-aware. This module knows nothing about Microsoft,
 *     Google, PKCE, or redirect URLs. OAuth-specific logic belongs in
 *     `tests/utils/oauth-stub.ts`.
 *   - **NOT** font/asset-aware. Font-face preload stubs live in
 *     `tests/mocks/assets.ts`.
 *
 * @see AAP Section 0.3.1 — Dependencies requiring mocking
 * @see AAP Section 0.4.4 — Mock Object Specifications
 * @see AAP Section 0.10.2 — Test isolation is mandatory
 */
import { vi, type MockInstance } from 'vitest';

/**
 * Snapshot of a single observed `window.open` invocation.
 *
 * The three properties mirror the three positional arguments accepted by
 * `Window.open()`:
 *
 *   - `url`      — the requested resource (string or `URL` instance, optional)
 *   - `target`   — the browsing-context target (e.g., `'_blank'`,
 *                  `'oauth-popup'`)
 *   - `features` — the comma-delimited window features string (e.g.,
 *                  `'width=500,height=600'`)
 *
 * Test assertions typically read `url` and `target` to verify that an OAuth
 * provider was invoked with the correct authorize endpoint and pop-up target,
 * and read `features` to verify the requested pop-up dimensions match the
 * design specification.
 */
export interface WindowOpenCall {
    url: string | URL | undefined;
    target: string | undefined;
    features: string | undefined;
}

/**
 * The active spy attached to `window.open`. Remains `null` until
 * `installWindowStubs()` runs; remains non-`null` for the rest of the suite.
 * Typed via `MockInstance<typeof window.open>` so the spy's `mock.calls`
 * tuple is correctly inferred as `[url?, target?, features?]`.
 */
let openSpy: MockInstance<typeof window.open> | null = null;

/**
 * The value returned by the stubbed `window.open` for the **next** call.
 *
 * Default: a fresh fake popup (created at module load by
 * `createDefaultFakePopup()`). After every test, `resetWindowStubs()`
 * replaces this with a new fake popup so per-test mutations (e.g., a closed
 * popup, a redirected `location.href`) are not observable in subsequent
 * tests.
 *
 * Tests that need to assert pop-up-blocked behaviour call
 * `simulatePopupBlocked()` (or `setWindowOpenReturn(null)`) to switch this
 * to `null`. Tests that need to introspect post-open popup operations call
 * `simulatePopupAllowed()` to obtain a dedicated popup reference.
 */
let openReturnValue: Window | null = createDefaultFakePopup();

/**
 * The active spy attached to `navigator.clipboard.writeText`. Null until
 * `installWindowStubs()` runs. The spy's `mock.calls` tuple is `[text:
 * string]`; `getClipboardWrites()` projects the first element of every
 * tuple into a flat `string[]` for ergonomic assertions.
 */
let clipboardWriteSpy: MockInstance<(text: string) => Promise<void>> | null = null;

/**
 * The active spy attached to `navigator.clipboard.readText`. Null until
 * `installWindowStubs()` runs. Resolves to `clipboardReadValue` on every
 * invocation so tests can stage a value via `setClipboardReadValue()` and
 * then assert that a paste-handling component received it.
 */
let clipboardReadSpy: MockInstance<() => Promise<string>> | null = null;

/**
 * The string returned by every stubbed `navigator.clipboard.readText()`
 * call. Reset to `''` by `resetWindowStubs()` between tests.
 */
let clipboardReadValue = '';

/**
 * Snapshot of the pre-install `navigator.clipboard` reference. Captured
 * inside `installWindowStubs()` so a future cleanup hook can restore the
 * runtime to its pre-stubbed state if required. In the typical
 * Vitest-per-suite lifecycle the process tears down before any restoration
 * is needed, so this binding is reserved for forward compatibility only.
 *
 * Note: happy-dom does not always expose `navigator.clipboard`; the
 * variable is therefore typed `Clipboard | undefined` and the install
 * function casts the RHS to the same union to keep the optional-undefined
 * branch reachable under TypeScript's strict null analysis.
 */
let originalClipboard: Clipboard | undefined;

/**
 * Builds a minimal `Window`-shaped object suitable as a stand-in for an
 * OAuth pop-up window reference.
 *
 * The returned object exposes only the five surface properties an OAuth
 * client typically touches after `window.open(...)` returns:
 *
 *   - `closed`       — initial state (false) until the implementation sets it
 *   - `close`        — spied so tests can assert the popup was dismissed
 *   - `focus`        — spied so tests can assert the popup regained focus
 *   - `postMessage`  — spied so tests can assert the popup received a message
 *   - `location.href` — writable string so a test can simulate the popup
 *                       navigating to a callback URL
 *
 * The full `Window` interface declares dozens of members the OAuth surface
 * never accesses; instead of stubbing them all (and risking drift if a new
 * member is added to lib.dom), we use the documented `as unknown as Window`
 * double-cast escape hatch. This is the canonical pattern for partial
 * window mocks per the Vitest documentation.
 *
 * Every call returns a **fresh** object — never a shared reference — so
 * per-test mutations are isolated and `resetWindowStubs()` can supply a
 * clean popup to the next test without aliasing concerns.
 */
function createDefaultFakePopup(): Window {
    const fakePopup = {
        closed: false,
        close: vi.fn(),
        focus: vi.fn(),
        postMessage: vi.fn(),
        location: { href: '' } as Location,
    };
    return fakePopup as unknown as Window;
}

/**
 * Installs the `window.open` and `navigator.clipboard` spies.
 *
 * Idempotent — the second and subsequent invocations short-circuit on
 * `openSpy !== null`. The setup file calls this exactly once inside
 * `beforeAll`; the early-return guard is a defence against accidental
 * re-installation from cohabiting setup files.
 *
 * Implementation notes:
 *
 *   1. `vi.spyOn(window, 'open')` attaches a spy that preserves the real
 *      property descriptor and, on restore, would return the implementation
 *      to its original value. We never call `restore()` here, so the spy
 *      lives for the suite.
 *
 *   2. The `mockImplementation` closure captures `openReturnValue` via
 *      closure scope — every subsequent reassignment of `openReturnValue`
 *      (by `setWindowOpenReturn`, `simulatePopupBlocked`, etc.) is observed
 *      by the spy. The cast `as typeof window.open` is required because
 *      TypeScript narrows the inferred return type of the arrow function to
 *      `Window | null` (matching `openReturnValue`) — the cast simply
 *      restates the contract for the `MockInstance` generic.
 *
 *   3. happy-dom may or may not expose `navigator.clipboard` depending on
 *      its version and the active permissions policy. The install function:
 *
 *        a. Captures the current reference (cast to `Clipboard | undefined`
 *           so the strict null analysis admits the undefined branch).
 *        b. If the runtime does not provide `navigator.clipboard`, defines
 *           a stub object via `Object.defineProperty` so `vi.spyOn` has a
 *           target. `configurable: true` and `writable: true` ensure the
 *           definition does not lock the property — happy-dom upgrades and
 *           future test fixtures can still overwrite it if needed.
 *        c. Spies on `writeText` and `readText` with implementations that
 *           resolve immediately to the recorded state. No real OS clipboard
 *           is contacted at any point.
 *
 *   4. `typeof navigator !== 'undefined'` is a defensive guard for
 *      environments where Vitest runs without a DOM (e.g., a hypothetical
 *      future `environment: 'node'` block). With happy-dom the branch is
 *      always taken.
 */
export function installWindowStubs(): void {
    if (openSpy !== null) {
        return;
    }

    // ---------------------------------------------------------------------
    // window.open spy
    // ---------------------------------------------------------------------
    openSpy = vi.spyOn(window, 'open').mockImplementation(((
        _url?: string | URL,
        _target?: string,
        _features?: string,
    ): Window | null => {
        return openReturnValue;
    }) as typeof window.open);

    // ---------------------------------------------------------------------
    // navigator.clipboard spies
    // ---------------------------------------------------------------------
    if (typeof navigator !== 'undefined') {
        // The cast to `Clipboard | undefined` is intentional: per lib.dom,
        // `navigator.clipboard` is typed `Clipboard` (non-optional), but
        // happy-dom does not always provide it at runtime. Without the
        // cast TypeScript narrows `originalClipboard` to `Clipboard` after
        // the assignment, which then makes the `=== undefined` comparison
        // below unreachable in the type system.
        originalClipboard = navigator.clipboard as Clipboard | undefined;

        if (originalClipboard === undefined) {
            Object.defineProperty(navigator, 'clipboard', {
                value: {
                    writeText: async (_text: string): Promise<void> => undefined,
                    readText: async (): Promise<string> => '',
                },
                configurable: true,
                writable: true,
            });
        }

        clipboardWriteSpy = vi
            .spyOn(navigator.clipboard, 'writeText')
            .mockImplementation(async (_text: string): Promise<void> => undefined);

        clipboardReadSpy = vi
            .spyOn(navigator.clipboard, 'readText')
            .mockImplementation(async (): Promise<string> => clipboardReadValue);
    }
}

/**
 * Resets the stubs' per-test state without uninstalling the spies.
 *
 * Operations performed (in order):
 *
 *   1. Replace `openReturnValue` with a fresh fake popup, so a previous
 *      test's mutations (e.g., setting `popup.closed = true`) cannot leak
 *      into the next test.
 *   2. Clear the recorded call history on every spy via `mockClear()`. This
 *      preserves the mock implementation but empties `mock.calls`,
 *      `mock.results`, and `mock.instances`.
 *   3. Reset `clipboardReadValue` to the empty string so the next test
 *      starts with a known, empty clipboard read response.
 *
 * Critical: this function uses `mockClear()`, **not** `mockRestore()`.
 *
 *   - `mockClear()` zeroes call history, keeps the mock implementation.
 *   - `mockRestore()` zeroes call history, replaces the mock with the
 *     original implementation, and detaches the spy.
 *
 * Calling `mockRestore()` here would force the next test's `beforeAll`
 * pass to reinstall the spies — but `installWindowStubs()` is wired into
 * `beforeAll` (suite-level), not `beforeEach` (test-level). The
 * `mockClear()` path is what makes the install-once / reset-per-test
 * lifecycle work.
 *
 * The optional-chaining on `clipboardWriteSpy?` and `clipboardReadSpy?` is
 * a defence against the rare environment where the clipboard install
 * branch did not run (e.g., `navigator` undefined). In that case the
 * spies are null and the optional chain short-circuits cleanly.
 */
export function resetWindowStubs(): void {
    openReturnValue = createDefaultFakePopup();
    openSpy?.mockClear();
    clipboardWriteSpy?.mockClear();
    clipboardReadSpy?.mockClear();
    clipboardReadValue = '';
}

/**
 * Returns a snapshot of every `window.open` call observed since the last
 * `resetWindowStubs()` (or since install if no reset has occurred).
 *
 * The returned array is freshly constructed on every call; callers can
 * safely mutate it without affecting the spy's internal state.
 *
 * If the spy is not yet installed (i.e., `installWindowStubs()` has not
 * run), returns an empty array rather than throwing. This makes the
 * function safe to call from defensive assertion helpers that may run
 * before suite setup completes.
 */
export function getWindowOpenCalls(): WindowOpenCall[] {
    if (openSpy === null) {
        return [];
    }
    return openSpy.mock.calls.map((args) => ({
        url: args[0] as string | URL | undefined,
        target: args[1] as string | undefined,
        features: args[2] as string | undefined,
    }));
}

/**
 * Sets the value the stubbed `window.open` returns on its **next**
 * invocation. The value persists until the next `resetWindowStubs()` or
 * the next `setWindowOpenReturn()` call.
 *
 * Pass `null` to simulate a blocked pop-up; pass a `Window`-shaped object
 * (typically constructed via `simulatePopupAllowed()`) to simulate an
 * allowed pop-up that returns a controllable reference.
 *
 * @param value The reference to return from `window.open`. `null`
 *              simulates browser pop-up blocking; a `Window`-shaped object
 *              simulates a successful pop-up open.
 */
export function setWindowOpenReturn(value: Window | null): void {
    openReturnValue = value;
}

/**
 * Configures the next `window.open` call to return `null`, modelling a
 * browser pop-up blocker rejecting the OAuth provider redirect.
 *
 * This is the primary helper for the "OAuth pop-up blocked" edge-case
 * specs called out in AAP Section 0.4.2 (Test Case Blueprint, Sign-in
 * screen error-cases): "Microsoft OAuth pop-up blocked", "Google OAuth
 * pop-up blocked".
 *
 * Equivalent to `setWindowOpenReturn(null)`; provided as a named helper so
 * the call-site reads as an intent declaration rather than a value
 * mutation.
 */
export function simulatePopupBlocked(): void {
    setWindowOpenReturn(null);
}

/**
 * Configures the next `window.open` call to return a fresh fake popup,
 * and returns the same reference to the caller so the test can introspect
 * post-open operations.
 *
 * Typical usage:
 *
 *   const popup = simulatePopupAllowed();
 *   await user.click(microsoftButton);
 *   expect(popup.focus).toHaveBeenCalledOnce();
 *   expect(popup.postMessage).toHaveBeenCalledWith(
 *     expect.objectContaining({ type: 'oauth-callback' }),
 *     expect.any(String),
 *   );
 *
 * The popup is independent per call: invoking `simulatePopupAllowed()`
 * twice yields two distinct popup references, so multi-provider tests
 * can verify that each provider received its own popup.
 *
 * @returns The same popup reference that `window.open` will return on
 *          its next invocation.
 */
export function simulatePopupAllowed(): Window {
    const popup = createDefaultFakePopup();
    setWindowOpenReturn(popup);
    return popup;
}

/**
 * Returns the ordered list of strings written via
 * `navigator.clipboard.writeText()` since the last `resetWindowStubs()`.
 *
 * Each entry is the first positional argument of one observed
 * `writeText` call. The order matches invocation order.
 *
 * If the spy is not yet installed, returns an empty array (mirroring the
 * defensive behaviour of `getWindowOpenCalls`).
 */
export function getClipboardWrites(): string[] {
    if (clipboardWriteSpy === null) {
        return [];
    }
    return clipboardWriteSpy.mock.calls.map((args) => args[0] as string);
}

/**
 * Stages the string that the next (and every subsequent)
 * `navigator.clipboard.readText()` call resolves to.
 *
 * Persists until `resetWindowStubs()` clears it back to the empty string
 * or another `setClipboardReadValue()` call replaces it.
 *
 * @param value The string to be returned by future `readText()` calls.
 */
export function setClipboardReadValue(value: string): void {
    clipboardReadValue = value;
}

/**
 * Returns the number of times `navigator.clipboard.readText()` has been
 * called since the last `resetWindowStubs()`.
 *
 * Useful for assertions of the form "the reset link was read from the
 * clipboard exactly once" without requiring the test to capture the
 * read return value itself.
 *
 * Returns `0` if the spy is not yet installed.
 */
export function getClipboardReadCallCount(): number {
    return clipboardReadSpy?.mock.calls.length ?? 0;
}
