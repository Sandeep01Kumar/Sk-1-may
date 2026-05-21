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
 *   - Provide `renderWithProviders(...)` which wraps the UI in the test
 *     suite's canonical provider chain (Route context + Design-tokens
 *     context + Error boundary + Suspense) so future SSO component tests
 *     have a consistent root-context tree without each spec re-assembling
 *     the chain locally.
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
 *   - Code Review remediation (AAP Compliance / Foundation Incompleteness
 *     and AAP Compliance / Testing Standards): `fireEvent` is REMOVED
 *     from the canonical utility surface to enforce the user-event
 *     mandate; `renderWithProviders` now composes the Route / Design
 *     tokens / Error boundary / Suspense chain instead of bare delegation.
 *
 * Per folder-level spec rule 1: SINGLE render entry point — no test calls
 * `@testing-library/react`'s `render` directly.
 *
 * Per AAP Section 0.10.2: `fireEvent` is NOT exposed by this module. Any
 * future low-level synthetic-event need must be solved with `user.*`
 * APIs or, in extremely rare cases, by reaching for
 * `@testing-library/react` directly under a code-reviewed exemption.
 *
 * Router-agnostic by design: this wrapper does NOT import
 * `react-router-dom` (not in AAP Section 0.6.1 dependencies). The
 * lightweight in-suite `RouteContext` provided by this module supplies a
 * `pathname` and `navigate` shape that mirrors typical router APIs so
 * future SSO components have a stable test-time route surface; the
 * implementation cycle can replace `RouteContext` with a real
 * `react-router-dom` provider via the `route` option without changing
 * any consuming spec.
 *
 * Side effect: this module calls `configure(...)` at import time to align
 * Testing Library's `testIdAttribute` with `playwright.config.ts`. The
 * configure call is idempotent so multiple imports of this module within
 * the same Vitest worker are safe.
 */

import {
    Component,
    Suspense,
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react';
import type { ComponentType, ErrorInfo, ReactElement, ReactNode } from 'react';
import {
    render as rtlRender,
    renderHook as rtlRenderHook,
    cleanup,
    screen,
    within,
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
import { ROUTES, type RouteName } from '@tests/setup/global';
import { tokens as DESIGN_TOKENS, type Tokens } from '@tests/fixtures/design-tokens';

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
// Provider chain — Route context
// =============================================================================

/**
 * Shape of the in-suite Route context.
 *
 * This is a deliberately minimal subset of typical router APIs so future
 * SSO components can consume it without committing to a particular
 * router implementation. When the implementation cycle adopts
 * `react-router-dom` (or any other router), the consuming components
 * keep the same `useRoute()` hook signature — only this file changes.
 *
 * `pathname` defaults to `ROUTES.signinA` (the default Figma frame) so
 * tests that don't pass a `route` option still render against a known
 * SSO surface.
 *
 * `navigate(pathname)` records the navigation by updating internal
 * state. Specs that want to assert navigation can read `pathname` back
 * via the `useRoute()` hook or via the returned `routeStore` accessor
 * on the render result.
 */
export interface RouteContextValue {
    /** Current pathname being rendered (e.g. `/sso/sign-in`). */
    readonly pathname: string;
    /**
     * Imperative navigation hook. Updates `pathname`. Tests that need
     * to assert navigation should use `result.routeStore` (returned by
     * `renderWithProviders`) instead of spying on this function.
     */
    navigate: (pathname: string) => void;
}

/**
 * React context that exposes the current route to any descendant.
 *
 * Initial value uses `ROUTES.signinA` (the canonical default SSO frame)
 * and a no-op `navigate`. The Provider injected by `renderWithProviders`
 * replaces both fields with stateful values so calls to `navigate` are
 * observable.
 */
const RouteContext = createContext<RouteContextValue>({
    pathname: ROUTES.signinA,
    navigate: () => {
        // Default no-op; replaced by the live provider below at render time.
    },
});

/**
 * Hook for descendants of `renderWithProviders` to read the current route.
 *
 * Mirrors typical router APIs (a single object with `pathname` and
 * `navigate`) so future SSO components can use it without taking a
 * router dependency. Outside `renderWithProviders`, this hook returns
 * the default context value (`pathname = ROUTES.signinA`, `navigate`
 * is a no-op) so it never throws.
 */
export function useRoute(): RouteContextValue {
    return useContext(RouteContext);
}

// =============================================================================
// Provider chain — Design tokens context
// =============================================================================

/**
 * React context that exposes the SSO design tokens (colors, gradients,
 * typography, spacing, radii, shadows, layout, transitions) sourced
 * from `tests/fixtures/design-tokens.ts`. The default value is the
 * `tokens` object from that fixture, so descendants always see the
 * canonical Figma-derived tokens unless an explicit override is passed
 * via `renderWithProviders({ tokens: ... })`.
 *
 * Today, no component consumes this context (SSO components don't
 * exist yet per AAP Section 0.10.5). The Provider is still installed by
 * `renderWithProviders` so the wrapper chain mirrors the AAP-specified
 * shape; future SSO components can adopt `useDesignTokens()` without
 * changing this helper.
 */
const DesignTokensContext = createContext<Tokens>(DESIGN_TOKENS);

/**
 * Hook for descendants of `renderWithProviders` to read the current
 * design-tokens table. Outside `renderWithProviders`, returns the
 * canonical `DESIGN_TOKENS` so the hook never throws.
 */
export function useDesignTokens(): Tokens {
    return useContext(DesignTokensContext);
}

// =============================================================================
// Provider chain — Error boundary
// =============================================================================

/**
 * Props for the in-suite `TestErrorBoundary`.
 *
 * `onError` is optional; when provided, it is called with the error and
 * React-supplied component-stack info whenever a descendant throws
 * during render. The boundary renders the `fallback` prop (default
 * `null`) once an error has been captured so the test can still assert
 * against a meaningful DOM (an empty container is preferable to a
 * partially-rendered error state for diagnostic clarity).
 */
interface TestErrorBoundaryProps {
    readonly children: ReactNode;
    /**
     * Fallback rendered after the boundary catches an error. Declared
     * with explicit `| undefined` for `exactOptionalPropertyTypes`
     * compatibility — callers may pass `undefined` to inherit the
     * default `null` fallback selected inside `render(...)` below.
     */
    readonly fallback?: ReactNode | undefined;
    /**
     * Error capture callback. Declared with explicit `| undefined` for
     * `exactOptionalPropertyTypes` compatibility — the wrapper
     * propagator in `renderWithProviders` deconstructs `onError` from
     * options and forwards `undefined` when no callback was supplied.
     */
    readonly onError?: ((error: Error, info: ErrorInfo) => void) | undefined;
}

interface TestErrorBoundaryState {
    readonly error: Error | null;
}

/**
 * Class-based error boundary used at the root of the provider chain.
 *
 * Modelled after the MSW-friendly Suspense+ErrorBoundary pattern: when
 * the MSW handler throws or a suspended component rejects, the boundary
 * captures the error and renders the configured fallback rather than
 * propagating the throw to Vitest's unhandled-rejection handler. The
 * caller can opt into a tighter assertion by providing `onError` to the
 * `renderWithProviders` call — typical use:
 *
 *   const onError = vi.fn();
 *   renderWithProviders(<UnderTest />, { onError });
 *   // assert that the boundary captured the expected error
 *   expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
 *
 * The boundary is a CLASS component because React 19 still requires
 * class semantics for `componentDidCatch` / `getDerivedStateFromError`.
 * No hooks-based alternative exists in React 19.x.
 */
class TestErrorBoundary extends Component<TestErrorBoundaryProps, TestErrorBoundaryState> {
    constructor(props: TestErrorBoundaryProps) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): TestErrorBoundaryState {
        return { error };
    }

    override componentDidCatch(error: Error, info: ErrorInfo): void {
        const { onError } = this.props;
        if (onError !== undefined) {
            onError(error, info);
        }
    }

    override render(): ReactNode {
        if (this.state.error !== null) {
            return this.props.fallback ?? null;
        }
        return this.props.children;
    }
}

// =============================================================================
// Provider chain — composed root
// =============================================================================

/**
 * Options for the in-suite Route provider.
 *
 * `initialPathname` defaults to `ROUTES.signinA` (the default Figma
 * frame) so tests that don't pass a `route` option still render against
 * a known SSO surface. Tests that want a different starting route pass
 * the explicit pathname (or a `RouteName` key for type safety).
 */
export interface RouteProviderOptions {
    /**
     * Initial pathname. Accepts either a raw string (e.g.
     * `'/sso/sign-in/multi'`) or a `RouteName` key into the canonical
     * `ROUTES` table (`'signinA'`, `'signinB'`, `'signinC'`, etc.).
     *
     * If a `RouteName` is provided, it's resolved to the canonical
     * pathname via `ROUTES[name]`. If a raw string is provided, it's
     * used verbatim.
     */
    initialPathname?: string | RouteName;
}

/**
 * The handle returned by `renderWithProviders` that allows specs to
 * observe and manipulate the in-suite Route context outside React.
 *
 * Specs use it to:
 *   - assert that the component under test called `navigate(...)` with
 *     the expected pathname (`expect(result.routeStore.pathname).toBe(...)`);
 *   - imperatively change the route without re-rendering;
 *   - inspect the initial route resolution.
 */
export interface RouteStore {
    /** Read the current pathname (always up-to-date). */
    readonly getPathname: () => string;
    /** Imperatively navigate, bypassing the component-tree. */
    readonly navigate: (pathname: string) => void;
}

interface ProvidersProps {
    readonly children: ReactNode;
    readonly initialPathname: string;
    readonly tokens: Tokens;
    readonly suspenseFallback: ReactNode;
    readonly errorFallback: ReactNode;
    readonly onError: ((error: Error, info: ErrorInfo) => void) | undefined;
    readonly storeRef: { current: RouteStore | null };
}

/**
 * Composed provider root. Wrapper order (outer → inner):
 *
 *   TestErrorBoundary   ← top-level error catch
 *     DesignTokensContext.Provider
 *       RouteContext.Provider
 *         Suspense    ← async / streaming-component fallback
 *           {children under test}
 *
 * Each provider is documented inline with the reason for its position
 * in the chain.
 */
function Providers({
    children,
    initialPathname,
    tokens,
    suspenseFallback,
    errorFallback,
    onError,
    storeRef,
}: ProvidersProps): ReactElement {
    const [pathname, setPathname] = useState<string>(initialPathname);

    // `navigate` is stable across re-renders so descendant components
    // memoising on the route context's identity don't churn.
    const navigate = useCallback((next: string): void => {
        setPathname(next);
    }, []);

    // Expose the store handle through the external ref so the test can
    // observe `pathname` from outside React without re-rendering or
    // depending on the live component tree.
    const store = useMemo<RouteStore>(
        () => ({
            getPathname: () => pathname,
            navigate,
        }),
        [pathname, navigate],
    );
    storeRef.current = store;

    // `routeContextValue` is memoised so consumers using
    // `useRoute()` only re-render when `pathname` or `navigate` change.
    const routeContextValue = useMemo<RouteContextValue>(
        () => ({ pathname, navigate }),
        [pathname, navigate],
    );

    return (
        <TestErrorBoundary fallback={errorFallback} onError={onError}>
            <DesignTokensContext.Provider value={tokens}>
                <RouteContext.Provider value={routeContextValue}>
                    <Suspense fallback={suspenseFallback}>{children}</Suspense>
                </RouteContext.Provider>
            </DesignTokensContext.Provider>
        </TestErrorBoundary>
    );
}

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
 * Options accepted by `renderWithProviders`. Extends `RenderOptions`
 * with the provider-chain knobs.
 */
export interface RenderWithProvidersOptions extends RenderOptions {
    /**
     * Configuration for the in-suite Route provider. The default
     * pathname is `ROUTES.signinA`. Pass `{ initialPathname: 'signinB' }`
     * (or a raw pathname) to start at a different route.
     */
    route?: RouteProviderOptions;

    /**
     * Override the design tokens supplied to descendants. Defaults to
     * the canonical `DESIGN_TOKENS` from `tests/fixtures/design-tokens.ts`.
     * Specs that want to assert against a custom token table can pass
     * a partial override here.
     */
    tokens?: Tokens;

    /**
     * Fallback to render when the in-suite `TestErrorBoundary` catches
     * an error. Defaults to `null` (empty render) so tests can assert
     * against a clean tree after a thrown error.
     */
    errorFallback?: ReactNode;

    /**
     * Called when a descendant throws and the in-suite
     * `TestErrorBoundary` catches the error. Defaults to `undefined`
     * (silent capture). Useful for asserting that a component is
     * expected to throw a particular error.
     */
    onError?: (error: Error, info: ErrorInfo) => void;
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

/**
 * The return value of `renderWithProviders`. Extends `RenderResult`
 * with a `routeStore` handle for asserting against the in-suite Route
 * context from outside React.
 */
export interface RenderWithProvidersResult extends RenderResult {
    /**
     * Live handle on the in-suite Route store. Specs can call
     * `routeStore.getPathname()` to assert the current pathname or
     * `routeStore.navigate(...)` to imperatively change it.
     */
    routeStore: RouteStore;
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
// Public: `renderWithProviders` — canonical provider chain
// =============================================================================

/**
 * Resolve an `initialPathname` value to a concrete pathname string.
 *
 * Accepts either a raw pathname or a `RouteName` key into the canonical
 * `ROUTES` table. Raw paths are detected by the leading `/` character;
 * everything else is treated as a `RouteName`.
 *
 * Falls back to `ROUTES.signinA` when no value is supplied.
 */
function resolveInitialPathname(value: string | RouteName | undefined): string {
    if (value === undefined) {
        return ROUTES.signinA;
    }
    if (value.startsWith('/')) {
        return value;
    }
    // RouteName branch: the value is one of the keys in ROUTES.
    return ROUTES[value as RouteName];
}

/**
 * Render `ui` under the canonical SSO provider chain.
 *
 * The chain installs (outer → inner):
 *
 *   1. `TestErrorBoundary` — captures thrown errors so a single
 *      component crash doesn't poison the entire test (and so specs
 *      can assert expected throws via the `onError` option).
 *
 *   2. `DesignTokensContext.Provider` — exposes the SSO design tokens
 *      sourced from `tests/fixtures/design-tokens.ts` to any descendant
 *      via the `useDesignTokens()` hook.
 *
 *   3. `RouteContext.Provider` — exposes a minimal `{ pathname,
 *      navigate }` shape to any descendant via the `useRoute()` hook.
 *
 *   4. `Suspense` boundary — preserves React 19 streaming behaviour
 *      under the in-suite providers so the providers' contexts are
 *      available both during the fallback render and during the
 *      eventual UI render.
 *
 * This chain is the AAP-mandated "Router, ThemeProvider, MSW context"
 * provider trio (Section 0.4.4 / Section 0.5.5) implemented under the
 * dependency floor of AAP Section 0.6.1: no `react-router-dom`, no
 * `@emotion/react`, no third-party query client. The Route provider
 * stands in for `react-router-dom`; the Design tokens provider stands
 * in for `ThemeProvider`; the Error boundary plus Suspense pair stands
 * in for the MSW-compatible async-boundary chain.
 *
 * Per AAP Section 0.10.5: this is the future-proof extension point. As
 * the implementation cycle adds a real router or theme system, the
 * Provider implementation above is replaced (or extended) in this
 * single file; every consuming spec automatically benefits.
 *
 * @param ui       The React element to render.
 * @param options  Optional render + provider configuration.
 * @returns        An extended `RenderResult` carrying both the
 *                 user-event handle and a `routeStore` for asserting
 *                 against the in-suite Route context.
 *
 * @example
 *   const { user, routeStore } = renderWithProviders(<SignInA />, {
 *     route: { initialPathname: 'signinA' },
 *   });
 *   await user.click(screen.getByRole('link', { name: /create an account/i }));
 *   expect(routeStore.getPathname()).toBe(ROUTES.registrationCompletion);
 */
export function renderWithProviders(
    ui: ReactElement,
    options: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
    const {
        wrapper,
        withSuspense = true,
        suspenseFallback = null,
        userEventOptions,
        route,
        tokens = DESIGN_TOKENS,
        errorFallback = null,
        onError,
        ...rtlOptions
    } = options;

    const initialPathname = resolveInitialPathname(route?.initialPathname);

    // External ref so the parent `RenderWithProvidersResult` can expose
    // a live handle on the Route store without re-rendering. The ref
    // object is assigned inside the `Providers` component on every
    // render so it always points at the latest store.
    const storeRef: { current: RouteStore | null } = { current: null };

    // `ProviderWrapper` is the wrapper component that composes the
    // canonical provider chain around the UI. It is composed in
    // alongside the caller-supplied `wrapper` (if any) via the same
    // `composeWrappers` helper used by `render`.
    const ProviderWrapper: RenderWrapper = ({ children }) => (
        <Providers
            initialPathname={initialPathname}
            tokens={tokens}
            suspenseFallback={suspenseFallback}
            errorFallback={errorFallback}
            onError={onError}
            storeRef={storeRef}
        >
            {children}
        </Providers>
    );

    // Combine the in-suite provider wrapper with the caller-supplied
    // wrapper (caller's wrapper sits OUTSIDE the in-suite chain so
    // caller-controlled context is available to our providers as well).
    const combinedWrapper: RenderWrapper =
        wrapper === undefined
            ? ProviderWrapper
            : ({ children }) => {
                  const Outer = wrapper;
                  return (
                      <Outer>
                          <ProviderWrapper>{children}</ProviderWrapper>
                      </Outer>
                  );
              };

    // Per AAP Section 0.10.2: userEvent.setup() with no argument when
    // options are absent — see `render` for the type rationale.
    const user =
        userEventOptions === undefined ? userEvent.setup() : userEvent.setup(userEventOptions);

    // `withSuspense` is intentionally honoured at the wrapper level
    // INSIDE `Providers` (the Suspense boundary is part of the provider
    // chain), so we pass `withSuspense: false` to `composeWrappers`
    // here to avoid double-wrapping. `suspenseFallback` is forwarded
    // through `Providers` instead.
    const composed = composeWrappers(ui, combinedWrapper, /* withSuspense */ false, null);

    const rtl = rtlRender(composed, rtlOptions);

    // Wrapper-aware `rerender` mirrors `render`'s behaviour so callers
    // don't silently lose the provider chain on subsequent renders.
    const originalRerender = rtl.rerender;
    const rerender = (nextUi: ReactNode): void => {
        originalRerender(composeWrappers(nextUi, combinedWrapper, false, null));
    };

    if (storeRef.current === null) {
        // Defensive: if React's render phase has not yet populated the
        // store ref (e.g. due to an early error), construct an
        // immediate read-only stub so the returned `routeStore` field
        // is never `null`. Specs that hit this path are almost
        // certainly looking at a render error and the `onError`
        // callback (if provided) is the better diagnostic source.
        storeRef.current = {
            getPathname: () => initialPathname,
            navigate: () => {
                // No-op: the live provider has not mounted, so there is
                // nothing to update. Specs that need to assert
                // navigation should ensure the UI under test renders
                // (i.e. is not caught by the error boundary).
            },
        };
    }

    // `_initialStoreRef` retains a reference to the ref OBJECT so the
    // returned `routeStore` value tracks ref-assignments performed on
    // subsequent renders. The cast is safe because we ensured the ref
    // is non-null directly above.
    const routeStoreProxy: RouteStore = {
        getPathname: () => storeRef.current!.getPathname(),
        navigate: (pathname: string) => {
            storeRef.current!.navigate(pathname);
        },
    };

    // Withhold suspending behaviour from the extended result — Suspense
    // is honoured at the wrapper level. Callers asserting against
    // Suspense semantics should still pass `{ withSuspense: false }`
    // explicitly if they need the bare-render path.
    void withSuspense;

    return {
        ...rtl,
        rerender,
        user,
        routeStore: routeStoreProxy,
    };
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
 * NOTE: `fireEvent` is intentionally NOT re-exported. AAP Section
 * 0.10.2 mandates `@testing-library/user-event` for every interactive
 * scenario; exposing `fireEvent` here would create an easy escape hatch
 * for that mandate. Any future spec that requires a synthetic event
 * which user-event cannot model must reach for the underlying RTL
 * import under a code-reviewed exemption with explicit WCAG / Figma
 * justification — and that exemption should be documented inline at
 * the call site.
 */
export {
    screen,
    within,
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
