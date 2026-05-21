/**
 * Shared test constants for the SSO test suite.
 *
 * This file is the SINGLE SOURCE OF TRUTH for:
 *   - BASE_URL          : URL the Vite dev server binds to.
 *   - VIEWPORTS         : Desktop / tablet / mobile breakpoint dimensions.
 *   - TIMEOUTS          : Default timeouts used by Vitest and Playwright tests.
 *   - TEST_USERS        : Common test user accounts.
 *   - ROUTES            : Canonical SSO route paths.
 *   - OAUTH_ENDPOINTS   : Provider callback URL constants for MSW handlers.
 *   - PROVIDERS         : OAuth provider metadata for SocialProviderButton tests.
 *   - getViewport       : Pure lookup helper for VIEWPORTS.
 *   - getRoute          : Pure lookup helper for ROUTES.
 *
 * Authority:
 *   - AAP Section 0.5.1 (file row for `tests/setup/global.ts`).
 *   - AAP Section 0.5.5 (imported by component.ts and playwright.ts).
 *   - AAP Section 0.7.2 (no hard-coded URLs/ports/credentials anywhere else).
 *   - AAP Section 0.1.1 (viewport dimensions: 1440x1024, 768x1024, 375x812).
 *   - AAP Section 0.4.4 (test data approach).
 *   - AAP Section 0.4.5 (asset paths under src/assets/logos/).
 *   - AAP Section 0.10.4 (no real backend OAuth — endpoints are mocked).
 *   - AAP Section 0.10.5 (SSO components/routes do not exist yet — forward-looking).
 *
 * Per AAP Section 0.10.2, no shared mutable state may live here — every export
 * is `as const` (a frozen, deeply-literal object). The file has NO
 * project-internal imports and NO module-level side effects.
 */

// =============================================================================
// BASE_URL
// =============================================================================

/**
 * The base URL the Vite dev server binds to.
 *
 * MUST equal:
 *   - vite.config.ts `server.host` + `server.port`
 *   - playwright.config.ts `baseURL`
 *
 * Per AAP Section 0.5.1, this is `http://127.0.0.1:5173`.
 *
 * The Playwright config also allows override via the PLAYWRIGHT_BASE_URL
 * environment variable; this constant reflects the default. Tests that need
 * to read the overridden value should use
 * `process.env.PLAYWRIGHT_BASE_URL ?? BASE_URL`.
 */
export const BASE_URL = 'http://127.0.0.1:5173' as const;

// =============================================================================
// VIEWPORTS
// =============================================================================

/**
 * Viewport breakpoints used by every Playwright project per AAP Section 0.1.1.
 *
 * These values are authoritative — `playwright.config.ts` uses them per project,
 * and visual baselines under `tests/visual/baselines/{desktop,tablet,mobile}/`
 * are captured at these exact dimensions.
 *
 * Dimensions:
 *   - desktop : 1440 x 1024 (default Figma frame size for SSO screens).
 *   - tablet  : 768  x 1024 (iPad portrait).
 *   - mobile  : 375  x 812  (iPhone 13/14 portrait).
 */
export const VIEWPORTS = {
    desktop: { width: 1440, height: 1024 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 812 },
} as const;

/**
 * Viewport names used by visual baseline path conventions.
 *
 * Visual baseline files live under:
 *   tests/visual/baselines/{viewport}/{frame-name}.png
 *
 * where {viewport} is one of these names.
 */
export type ViewportName = keyof typeof VIEWPORTS;

/**
 * Ordered list of viewport names. Iteration order is desktop → tablet → mobile
 * which matches the order visual specs iterate so the HTML report groups
 * projects predictably.
 */
export const VIEWPORT_NAMES: readonly ViewportName[] = ['desktop', 'tablet', 'mobile'] as const;

// =============================================================================
// TIMEOUTS
// =============================================================================

/**
 * Default per-test timeout (10 seconds).
 *
 * Per AAP Section 0.7.2, the Vitest suite must complete in under 90 seconds
 * locally. A 10-second per-test cap is wide enough to accommodate the slowest
 * a11y scan while keeping the suite well within budget.
 *
 * `vitest.config.ts` declares `testTimeout: 10000` which mirrors this value.
 */
export const TEST_TIMEOUT_MS = 10_000 as const;

/**
 * Default Vitest hook timeout (10 seconds). Applied to beforeAll / afterAll /
 * beforeEach / afterEach hooks via `vitest.config.ts` `hookTimeout`.
 */
export const HOOK_TIMEOUT_MS = 10_000 as const;

/**
 * Default Playwright action timeout (10 seconds).
 *
 * Used by `playwright.config.ts` `use.actionTimeout`. Click / fill / waitFor
 * calls fail after this duration.
 */
export const ACTION_TIMEOUT_MS = 10_000 as const;

/**
 * Default Playwright navigation timeout (30 seconds).
 *
 * Used by `playwright.config.ts` `use.navigationTimeout`. page.goto fails
 * after this duration. The longer budget (versus action timeout) absorbs
 * dev-server cold-start latency on the first navigation of a worker.
 */
export const NAVIGATION_TIMEOUT_MS = 30_000 as const;

/**
 * Grouped defaults for convenient import.
 *
 * Used by tests/setup/component.ts:
 *   import { TEST_DEFAULTS } from '@tests/setup/global';
 *   vi.setConfig({ testTimeout: TEST_DEFAULTS.testTimeoutMs });
 */
export const TEST_DEFAULTS = {
    testTimeoutMs: TEST_TIMEOUT_MS,
    hookTimeoutMs: HOOK_TIMEOUT_MS,
    actionTimeoutMs: ACTION_TIMEOUT_MS,
    navigationTimeoutMs: NAVIGATION_TIMEOUT_MS,
} as const;

// =============================================================================
// TEST_USERS
// =============================================================================

/**
 * Common test user accounts.
 *
 * Per AAP Section 0.4.4, full user samples live in `tests/fixtures/users.ts`.
 * The constants here are the minimum set required by page-object helpers
 * (loginPage, signupPage) in `tests/setup/playwright.ts`.
 *
 * Per AAP Section 0.10.5, the credentials below are PLACEHOLDERS — they refer
 * to user records that exist only in MSW-mocked responses (per
 * `tests/mocks/handlers/auth.ts`). No real user account is implied or required.
 *
 * Per AAP Section 0.7.2, NEVER hard-code emails/passwords elsewhere — import
 * from this file or from `tests/fixtures/users.ts`.
 *
 * All `@blitzy.test` addresses use the IANA-reserved `.test` TLD per RFC 2606,
 * which guarantees they cannot resolve to a real mail server. They are safe to
 * commit to a public repository.
 */
export const TEST_USERS = {
    /**
     * The standard happy-path user. MSW handlers accept this email/password
     * combination and return a successful sign-in response.
     */
    standard: {
        email: 'standard.user@blitzy.test',
        password: 'StandardP@ssw0rd!',
        firstName: 'Standard',
        lastName: 'User',
        company: 'Blitzy Test Co.',
    },

    /**
     * A federated-identity-only user. MSW handlers respond to this email with
     * a "must use SSO" error, allowing tests to assert the Link Accounts flow.
     */
    federated: {
        email: 'federated.user@blitzy.test',
        password: 'FederatedP@ssw0rd!',
        firstName: 'Federated',
        lastName: 'User',
        company: 'Blitzy SSO Co.',
    },

    /**
     * A user whose credentials always fail authentication. Used by error-state
     * specs to assert that the SignUpError frame renders correctly.
     */
    invalid: {
        email: 'invalid.user@blitzy.test',
        password: 'WrongP@ssw0rd!',
        firstName: 'Invalid',
        lastName: 'User',
        company: 'Blitzy Bad Co.',
    },

    /**
     * A net-new user used by the Registration Completion flow. MSW handlers
     * accept registration submission for this email.
     */
    newUser: {
        email: 'new.user@blitzy.test',
        password: 'NewUserP@ssw0rd!',
        firstName: 'New',
        lastName: 'User',
        company: 'Blitzy Newcomers Inc.',
    },
} as const;

/**
 * Keys of TEST_USERS. Used for type-safe lookups in page-object helpers.
 */
export type TestUserName = keyof typeof TEST_USERS;

// =============================================================================
// ROUTES
// =============================================================================

/**
 * Canonical client-side route paths for every SSO screen.
 *
 * These routes are referenced by:
 *   - LoginPage.navigate()  in tests/setup/playwright.ts
 *   - SignupPage.navigate() in tests/setup/playwright.ts
 *   - E2E specs    under tests/e2e/sso/**
 *   - Visual specs under tests/visual/**
 *
 * Per AAP Section 0.10.5, the SSO components do not exist yet. When the
 * implementation cycle authors the React Router (or equivalent) routing layer,
 * the route paths declared here become the contract the router MUST honour.
 *
 * If the implementation chooses different paths, this constant MUST be updated
 * in lockstep so page objects and specs continue to resolve.
 */
export const ROUTES = {
    /** Sign in - A (Microsoft only) — Figma 15001:41875 */
    signinA: '/sso/sign-in',

    /** Sign in - B (Microsoft + Google) — Figma 15001:41988 */
    signinB: '/sso/sign-in/multi',

    /**
     * Sign in - C (See more / Expanded providers) — Figma 15001:42082 / 15001:42214.
     * The "expanded" view is reached by clicking the See more affordance from
     * the collapsed view — they share a single route.
     */
    signinC: '/sso/sign-in/providers',

    /** Registration Completion Form — Figma 14980:28342 */
    registration: '/sso/register/complete',

    /** SignUp-ErrorScreens-02 (Create account) — Figma 15058:34569 */
    signupError: '/sso/register/error',

    /**
     * Link Accounts Modal route. Both Microsoft and Generic variants render
     * at this route; the variant is selected by query parameter `?provider=`.
     */
    linkAccounts: '/sso/link-accounts',

    /** Link Accounts Modal — Microsoft variant — Figma 16383:42232 */
    linkAccountsMicrosoft: '/sso/link-accounts?provider=microsoft',

    /** Link Accounts Modal — Generic (non-Microsoft) variant — Figma 16383:42287 */
    linkAccountsGeneric: '/sso/link-accounts?provider=other',
} as const;

/**
 * Keys of ROUTES. Used for type-safe lookups in page-object helpers.
 */
export type RouteName = keyof typeof ROUTES;

// =============================================================================
// OAUTH_ENDPOINTS
// =============================================================================

/**
 * OAuth provider endpoints that MSW handlers (per `tests/mocks/handlers/auth.ts`)
 * intercept. Spec assertions use these paths to verify MSW received expected
 * requests via `server.events.on('request:match', ...)`.
 *
 * Per AAP Section 0.3.1, the MSW handlers intercept:
 *   - GET  /auth/sso/microsoft/authorize
 *   - POST /auth/sso/microsoft/callback
 *   - GET  /auth/sso/google/authorize
 *   - POST /auth/sso/google/callback
 *   - POST /auth/link-accounts
 *   - POST /auth/forgot-password
 *
 * Per AAP Section 0.10.4, NO real backend OAuth implementation exists — these
 * paths are mocked endpoints only.
 */
export const OAUTH_ENDPOINTS = {
    microsoft: {
        authorize: '/auth/sso/microsoft/authorize',
        callback: '/auth/sso/microsoft/callback',
    },
    google: {
        authorize: '/auth/sso/google/authorize',
        callback: '/auth/sso/google/callback',
    },
    linkAccounts: '/auth/link-accounts',
    forgotPassword: '/auth/forgot-password',
} as const;

/**
 * Identifiers of OAuth providers supported by the test suite.
 */
export type OAuthProvider = 'microsoft' | 'google';

// =============================================================================
// PROVIDERS
// =============================================================================

/**
 * Provider metadata used by SocialProviderButton tests to assert label,
 * icon path, and click handler invocation.
 *
 * Logo paths point to the Figma assets committed under `src/assets/logos/`
 * per AAP Section 0.4.5 (asset inventory).
 *
 * Each provider record contains:
 *   - id       : Stable identifier used by click handlers and OAuth state.
 *   - label    : Visible button text per the Figma "Sign in with <provider>" copy.
 *   - logoPath : URL the React component imports for the provider icon.
 *   - endpoint : MSW-intercepted authorize URL (kicks off the OAuth flow).
 */
export const PROVIDERS = {
    microsoft: {
        id: 'microsoft' as const,
        label: 'Sign in with Microsoft',
        logoPath: '/src/assets/logos/microsoft-logo.png',
        endpoint: OAUTH_ENDPOINTS.microsoft.authorize,
    },
    google: {
        id: 'google' as const,
        label: 'Sign in with Google',
        logoPath: '/src/assets/logos/google-logo.png',
        endpoint: OAUTH_ENDPOINTS.google.authorize,
    },
} as const;

/**
 * Keys of PROVIDERS. Used for type-safe lookups by SocialProviderButton tests.
 */
export type ProviderId = keyof typeof PROVIDERS;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convenience helper: returns the viewport dimensions for the given name.
 *
 * Pure function, no side effects. Safe to call at module scope.
 *
 * @param name - One of the keys of VIEWPORTS ('desktop' | 'tablet' | 'mobile').
 * @returns The viewport's width and height in CSS pixels.
 *
 * @example
 *   const { width, height } = getViewport('desktop'); // { width: 1440, height: 1024 }
 */
export function getViewport(name: ViewportName): { width: number; height: number } {
    // Note: with `noUncheckedIndexedAccess: true` in tsconfig, indexing into
    // a closed object literal with a `keyof` type still produces a non-undefined
    // value because TypeScript knows every key is present. No null-check is
    // required.
    const viewport = VIEWPORTS[name];
    return { width: viewport.width, height: viewport.height };
}

/**
 * Convenience helper: returns the canonical route path for a given screen name.
 *
 * Pure function, no side effects. Safe to call at module scope.
 *
 * @param name - One of the keys of ROUTES.
 * @returns The route path including any query string.
 *
 * @example
 *   const path = getRoute('signinA'); // '/sso/sign-in'
 *   await page.goto(`${BASE_URL}${getRoute('linkAccountsMicrosoft')}`);
 */
export function getRoute(name: RouteName): string {
    return ROUTES[name];
}
