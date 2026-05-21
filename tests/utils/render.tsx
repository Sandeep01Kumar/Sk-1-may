/**
 * Canonical React Testing Library render wrapper for the SSO test suite.
 *
 * Every component, integration, and a11y component test renders through this
 * function. No test imports `render` directly from `@testing-library/react`
 * — that import is reserved for THIS file alone.
 *
 * Responsibilities:
 *   - Wrap the UI in a Suspense boundary so React 19 streaming components
 *     don't throw before the test can assert.
 *   - Pre-instantiate `userEvent` so every test has a `user` handle in the
 *     return value (per AAP Section 0.10.2: never call fireEvent directly
 *     for interactions).
 *   - Re-export the full `@testing-library/react` query surface so specs
 *     have a single import path:
 *
 *       import { render, screen, within } from '@tests/utils/render';
 *
 * Authority:
 *   - AAP Section 0.5.1 (file row for `tests/utils/render.tsx`).
 *   - AAP Section 0.5.5 (canonical render wrapper for component tests).
 *   - AAP Section 0.6.1 (versions — React 19.2.6, RTL 16.3.2,
 *     user-event 14.6.1).
 *   - AAP Section 0.7.2 (assertion density — user-event is the realistic
 *     interaction layer).
 *   - AAP Section 0.10.2 (user-event mandate; never fireEvent for
 *     interactions).
 *   - AAP Section 0.10.5 (honest limitations — SSO components do not
 *     exist yet).
 *
 * Per folder-level spec rule 1: SINGLE render entry point — no test calls
 * `@testing-library/react`'s `render` directly.
 *
 * Router-agnostic by design: this wrapper does NOT import
 * `react-router-dom` (not in AAP Section 0.6.1 dependencies). Routing-aware
 * tests must supply their own wrapper via the `wrapper` option (e.g. by
 * importing `MemoryRouter` themselves once the repo adopts react-router-dom
 * in a future cycle).
 *
 * Side effect: this module calls `configure(...)` at import time to align
 * Testing Library's `testIdAttribute` with `playwright.config.ts`. The
 * configure call is idempotent so multiple imports of this module within
 * the same Vitest worker are safe.
 */

import { Suspense } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import {
    render as rtlRender,
    renderHook as rtlRenderHook,
    cleanup,
    screen,
    within,
    fireEvent,
    waitFor,
    waitForElementToBeRemoved,
    act,
    queries,
    queryHelpers,
    configure,
    type RenderOptions as RtlRenderOptions,
    type RenderResult as RtlRenderResult,
    type RenderHookOptions as RtlRenderHookOptions,
    type RenderHookResult,
    type Queries,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// =============================================================================
// One-time library configuration
// =============================================================================

/**
 * Configure Testing Library globally for this test suite.
 *
 * - `testIdAttribute: 'data-testid'` matches the Playwright config (per
 *   `playwright.config.ts` `use.testIdAttribute`) so component-test
 *   selectors and E2E-test selectors stay in lock-step.
 * - `asyncUtilTimeout: 2000` keeps `waitFor` timeouts short by default.
 *   Specs that need longer can pass `{ timeout }` to individual calls.
 * - `defaultHidden: false` ensures `getByRole` does NOT return ARIA-hidden
 *   elements; tests that need hidden elements can opt in per query.
 *
 * This is a module-scoped side effect that runs once when the module is
 * first imported. Multiple imports of this module within the same Vitest
 * worker are safe because `configure` is idempotent — Testing Library
 * applies the partial config delta to its internal global config object.
 */
configure({
    testIdAttribute: 'data-testid',
    asyncUtilTimeout: 2000,
    defaultHidden: false,
});

// =============================================================================
// Public types
// =============================================================================

/**
 * Wrapper component shape — a React component that receives `children` and
 * returns wrapped JSX. Used for opt-in providers (theme, router, query
 * client, etc.) that the SSO components will eventually need.
 *
 * The signature deliberately mirrors React Testing Library's `wrapper`
 * option (a component, not a render-prop function) so callers can pass an
 * existing provider directly.
 *
 * @example
 *   const MyWrapper: RenderWrapper = ({ children }) => (
 *     <ThemeProvider>{children}</ThemeProvider>
 *   );
 */
export type RenderWrapper = ComponentType<{ children: ReactNode }>;

/**
 * Options accepted by the canonical `render` function.
 *
 * Extends RTL's `RenderOptions` but overrides `wrapper` with our
 * extension-point type and adds Suspense and userEvent customisation.
 *
 * The `queries` field is omitted because Testing Library's default query
 * set is universally used in this codebase; specs that need custom
 * queries should fall back to `rtlRender` directly (intentionally rare).
 */
export interface RenderOptions extends Omit<RtlRenderOptions, 'wrapper' | 'queries'> {
    /**
     * Optional additional wrapper. Must accept `children` and render them.
     * Typical use cases (when those libraries are added to deps):
     *   - `MemoryRouter` for routing tests.
     *   - `ThemeProvider` once a theme system exists.
     *   - Any context provider an SSO component needs.
     *
     * Composed AROUND the built-in Suspense boundary so the provider
     * context is available both to Suspense's fallback and to the UI
     * under test.
     */
    wrapper?: RenderWrapper;

    /**
     * Whether to install a Suspense boundary. Defaults to `true`.
     *
     * Disable only when you specifically want to assert React's
     * suspension behaviour (e.g. testing a custom suspense fallback in
     * isolation).
     */
    withSuspense?: boolean;

    /**
     * The fallback rendered while Suspense is suspended. Defaults to
     * `null` so test output is not polluted by spinner markup.
     */
    suspenseFallback?: ReactNode;

    /**
     * Options forwarded to `userEvent.setup(...)`. Defaults to no
     * options (real timers, default keyboard/pointer maps).
     *
     * Per AAP Section 0.10.2: every interaction is via user-event,
     * never fireEvent. Tests that use fake timers (`vi.useFakeTimers`)
     * should pass `{ advanceTimers: vi.advanceTimersByTime }` here.
     */
    userEventOptions?: Parameters<typeof userEvent.setup>[0];
}

/**
 * The return value of the canonical render function.
 *
 * Extends RTL's `RenderResult` by adding a pre-configured `user` instance
 * so specs can immediately call `await user.click(...)` etc. without
 * manually setting up user-event in every test.
 */
export interface RenderResult extends RtlRenderResult {
    /**
     * Pre-instantiated `userEvent` handle bound to the rendered DOM.
     * Per AAP Section 0.10.2 — use this for every interaction.
     *
     * @example
     *   const { user } = render(<Form />);
     *   await user.type(screen.getByLabelText('Email'), 'a@b.test');
     *   await user.click(screen.getByRole('button', { name: 'Submit' }));
     */
    user: ReturnType<typeof userEvent.setup>;
}

// =============================================================================
// Internal: wrapper composition
// =============================================================================

/**
 * Compose the rendered UI with the built-in Suspense boundary and the
 * caller-supplied wrapper (if any).
 *
 * Wrapper order (outer → inner):
 *   1. Caller-supplied `wrapper` (so its context is available to
 *      Suspense AND to the rendered UI).
 *   2. Suspense boundary (optional, default ON).
 *   3. The UI under test.
 *
 * The wrapper is OUTSIDE Suspense by deliberate choice — most providers
 * (Router, ThemeProvider, QueryClientProvider) must wrap suspending
 * components, not the other way around. If Suspense were the outer
 * element, the wrapper's context would not be available during the
 * fallback render phase.
 *
 * Accepts a `ReactNode` rather than just `ReactElement` so the helper
 * can be called from the wrapper-aware `rerender` override, whose
 * parameter type is inherited from RTL's `RenderResult['rerender']`
 * (which is `(ui: ReactNode) => void`). When the `withSuspense` flag
 * is false AND `ui` could be a non-element ReactNode (string, number,
 * null, etc.), we wrap in a `<>...</>` Fragment so the function's
 * declared `ReactElement` return contract is preserved without
 * affecting the rendered DOM (Fragments emit no DOM nodes).
 *
 * @param ui                The UI under test.
 * @param wrapper           Optional wrapper component (undefined to skip).
 * @param withSuspense      Whether to install the Suspense boundary.
 * @param suspenseFallback  Fallback content for the Suspense boundary.
 * @returns A single composed `ReactElement` ready for `rtlRender`.
 */
function composeWrappers(
    ui: ReactNode,
    wrapper: RenderWrapper | undefined,
    withSuspense: boolean,
    suspenseFallback: ReactNode,
): ReactElement {
    const inner: ReactElement = withSuspense ? (
        <Suspense fallback={suspenseFallback}>{ui}</Suspense>
    ) : (
        // Fragment is transparent in the rendered DOM but lets us
        // preserve the `ReactElement` return type when `ui` may be a
        // non-element `ReactNode` (e.g. on `rerender` invocations).
        <>{ui}</>
    );
    if (wrapper === undefined) {
        return inner;
    }
    const Wrapper = wrapper;
    return <Wrapper>{inner}</Wrapper>;
}

// =============================================================================
// Public: canonical `render` function
// =============================================================================

/**
 * Render `ui` under the canonical wrapper chain and return an extended
 * `RenderResult` carrying a `user` (userEvent) handle.
 *
 * The `rerender` method is overridden to re-apply the same wrapper chain
 * on subsequent renders so callers that pass a wrapper don't silently
 * lose it on the second render — a subtle bug that's hard to diagnose.
 *
 * @param ui       The React element to render.
 * @param options  Optional render configuration; defaults to `{}`.
 * @returns A `RenderResult` with all RTL utilities plus a `user` handle.
 *
 * @example
 *   const { user } = render(<SignInA />);
 *   await user.click(screen.getByRole('button', { name: 'Sign in' }));
 *
 * @example With a custom wrapper (e.g. once react-router-dom is added):
 *   const { user } = render(<SignInA />, {
 *     wrapper: ({ children }) => (
 *       <MemoryRouter initialEntries={['/sso/sign-in']}>{children}</MemoryRouter>
 *     ),
 *   });
 *
 * @example With fake timers:
 *   vi.useFakeTimers();
 *   const { user } = render(<Form />, {
 *     userEventOptions: { advanceTimers: vi.advanceTimersByTime },
 *   });
 */
export function render(ui: ReactElement, options: RenderOptions = {}): RenderResult {
    const {
        wrapper,
        withSuspense = true,
        suspenseFallback = null,
        userEventOptions,
        ...rtlOptions
    } = options;

    // Per AAP Section 0.10.2 + the validation checklist: when no options
    // are supplied, call `userEvent.setup()` with NO argument (not
    // `setup(undefined)`) to satisfy `exactOptionalPropertyTypes`.
    // user-event's `setup` signature is `setup(options?: Options)`, so
    // passing `undefined` would be valid at runtime but `userEvent`'s
    // type tightening in v14 + strict mode complains in some toolchains.
    const user =
        userEventOptions === undefined ? userEvent.setup() : userEvent.setup(userEventOptions);

    const composed = composeWrappers(ui, wrapper, withSuspense, suspenseFallback);

    // Forward every option we haven't explicitly redefined to RTL.
    // `container`, `baseElement`, `hydrate`, `legacyRoot`, etc. all
    // pass through intact. RTL's render returns the standard
    // `RenderResult` shape; we extend it with `user` and override
    // `rerender` below.
    const rtl = rtlRender(composed, rtlOptions);

    // Override `rerender` so callers that passed a wrapper don't lose
    // it on subsequent renders. Without this override, `rerender(<UI/>)`
    // would unwrap to bare RTL semantics and silently drop our wrapper
    // chain.
    //
    // The parameter is typed `ReactNode` (not just `ReactElement`) to
    // match RTL's `RenderResult['rerender']` signature exactly, keeping
    // the extended `RenderResult` interface structurally compatible
    // with its base `RtlRenderResult`.
    const originalRerender = rtl.rerender;
    const rerender = (nextUi: ReactNode): void => {
        originalRerender(composeWrappers(nextUi, wrapper, withSuspense, suspenseFallback));
    };

    return {
        ...rtl,
        rerender,
        user,
    };
}

// =============================================================================
// Public: `renderWithProviders` — future-proofing extension point
// =============================================================================

/**
 * Convenience: render with the default provider chain once the chain is
 * available in the repository.
 *
 * Today: identical to `render()` because no providers exist yet (the
 * SSO components themselves are scheduled for a subsequent implementation
 * cycle per AAP Section 0.10.5).
 *
 * Tomorrow: as `ThemeProvider`, `QueryClientProvider`, router, etc.
 * land, this function grows to compose them in. Specs that always need
 * the full chain should call this helper, not `render` directly, so
 * they automatically benefit from future additions without touching
 * the spec file.
 *
 * Per AAP Section 0.10.5 honest-limitation disclosure: SSO providers do
 * not exist yet; this helper is the future-proof extension point.
 *
 * @param ui       The React element to render.
 * @param options  Optional render configuration; defaults to `{}`.
 * @returns A `RenderResult` with all RTL utilities plus a `user` handle.
 */
export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}): RenderResult {
    // Today there are no providers to compose, so we delegate verbatim.
    // When the SSO component implementation adds a provider chain, edit
    // this function in one place; every spec benefits.
    return render(ui, options);
}

// =============================================================================
// Public: `renderHook` — wrapper-aware hook tester
// =============================================================================

/**
 * Custom `renderHook` aligned with the same wrapper semantics as
 * `render`.
 *
 * Re-exported separately because hook tests are a distinct API from
 * component tests in `@testing-library/react@16.x` — they return a
 * `RenderHookResult<TResult, TProps>` with a `result.current` accessor
 * instead of DOM queries.
 *
 * @param callback  The hook to invoke under test.
 * @param options   Optional render configuration; defaults to `{}`. The
 *                  `wrapper` option accepts the same `RenderWrapper`
 *                  type used by `render(...)`.
 * @returns A standard RTL `RenderHookResult` (no `user` handle — hook
 *          tests don't interact with the DOM directly).
 *
 * @example
 *   const { result } = renderHook(() => useSignInForm({ provider: 'microsoft' }));
 *   expect(result.current.isValid).toBe(false);
 */
export function renderHook<TResult, TProps>(
    callback: (initialProps: TProps) => TResult,
    options: Omit<RtlRenderHookOptions<TProps>, 'wrapper'> & {
        wrapper?: RenderWrapper;
    } = {},
): RenderHookResult<TResult, TProps> {
    const { wrapper, ...rest } = options;
    if (wrapper === undefined) {
        return rtlRenderHook(callback, rest);
    }
    return rtlRenderHook(callback, { ...rest, wrapper });
}

// =============================================================================
// Re-exports — single canonical import path for specs
// =============================================================================

/**
 * Re-export Testing Library's query surface so specs have a single
 * canonical import path:
 *
 *   import { render, screen, within } from '@tests/utils/render';
 *
 * Per folder-level spec: `render.tsx` re-exports `screen`, `within`,
 * etc. from `@testing-library/react`.
 *
 * NOTE: `fireEvent` is re-exported for the rare case where specs need
 * to dispatch synthetic events that user-event cannot model (e.g.
 * `submit` on a form without an actual submit button). Per AAP Section
 * 0.10.2, fireEvent is BANNED for interactive scenarios that user-event
 * supports — use `user.click(...)`, `user.type(...)`, etc. instead.
 */
export {
    screen,
    within,
    fireEvent,
    waitFor,
    waitForElementToBeRemoved,
    act,
    cleanup,
    queries,
    queryHelpers,
    configure,
};

/**
 * Re-export `userEvent` as a named symbol so specs can construct ad-hoc
 * instances (e.g. for fake-timer scenarios) without an extra import.
 *
 * NOTE: Per AAP Section 0.10.2 the canonical entry point is the `user`
 * property of the `render` return value. Direct calls to
 * `userEvent.setup` should be rare and limited to setups where the
 * user handle must outlive the rendered DOM (e.g. multi-render
 * scenarios that simulate persistent user state).
 */
export { userEvent };

/**
 * Re-export the underlying RTL types under stable public aliases so
 * specs that need the raw RTL option/result shapes can reach them
 * through this module's single canonical import path:
 *
 *   import type { RtlRenderOptions, RtlRenderResult, Queries }
 *     from '@tests/utils/render';
 *
 * The canonical public types are the `RenderOptions` and `RenderResult`
 * interfaces declared above — they extend the RTL types with our
 * Suspense and userEvent additions. The aliases re-exported here exist
 * for the rare case where a spec needs to declare a value typed with
 * the raw RTL contract (e.g. when composing helpers that bypass this
 * wrapper).
 */
export type { RtlRenderOptions, RtlRenderResult, Queries };
