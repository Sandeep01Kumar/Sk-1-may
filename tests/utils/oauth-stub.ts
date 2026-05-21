/**
 * OAuth scenario composition module.
 *
 * Composes the primitive `window.open` and `navigator.clipboard` helpers
 * from `tests/mocks/window.ts` into higher-level OAuth fixtures used by
 * integration and E2E specs. The lower layer (`tests/mocks/window.ts`)
 * is deliberately OAuth-agnostic — it knows only about browser globals.
 * This module supplies the OAuth-specific knowledge: provider authorize
 * URLs, expected pop-up dimensions, redirect-URI parameter contract.
 *
 * --------------------------------------------------------------------------
 * Compositional contract
 * --------------------------------------------------------------------------
 *
 * Per the `tests/mocks/window.ts` docstring contract (lines 28-32):
 *
 *   "`tests/utils/oauth-stub.ts` composes the primitive helpers exported
 *   here (`setWindowOpenReturn`, `simulatePopupBlocked`, `simulatePopupAllowed`,
 *   `getWindowOpenCalls`) into OAuth-scenario fixtures."
 *
 * The functions in this module are PURE COMPOSITION — they do not access
 * `window` or `navigator` directly; everything routes through the
 * primitives in `tests/mocks/window.ts` so the OAuth-agnostic boundary
 * remains intact.
 *
 * --------------------------------------------------------------------------
 * What this module provides
 * --------------------------------------------------------------------------
 *
 *   Popup scenario simulators (per provider):
 *     - simulateMicrosoftPopupAllowed / simulateMicrosoftPopupBlocked
 *     - simulateGooglePopupAllowed   / simulateGooglePopupBlocked
 *     - simulateProviderPopupAllowed / simulateProviderPopupBlocked
 *
 *   Pop-up call introspection (provider-scoped views over the primitive
 *   `getWindowOpenCalls()` log):
 *     - getOAuthPopupCalls
 *     - getMicrosoftPopupCalls / getGooglePopupCalls / getProviderPopupCalls
 *
 *   Authorize-call assertions (one-line `expect`s for specs):
 *     - expectOAuthAuthorizeCalled
 *     - expectOAuthAuthorizeNotCalled
 *
 *   Pop-up bounding-box assertions (matches AAP spec for popup features):
 *     - assertPopupDimensions  (width=500, height=600 by default)
 *     - parsePopupFeatures
 *
 *   Mock authorize URL construction (used by tests that pre-stage the
 *   stubbed pop-up's `location.href` to assert callback handling):
 *     - buildMockMicrosoftAuthorizeUrl
 *     - buildMockGoogleAuthorizeUrl
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.3.1 — Mocking dependencies.
 *   - AAP Section 0.4.4 — Mock Object Specifications.
 *   - AAP Section 0.5.1 — File row for `tests/utils/oauth-stub.ts`.
 *   - QA Issue 4 — File missing.
 *   - tests/mocks/window.ts lines 28-32 — composition contract.
 */

import { expect } from 'vitest';
import {
    getWindowOpenCalls,
    simulatePopupAllowed,
    simulatePopupBlocked,
    type WindowOpenCall,
} from '@tests/mocks/window';
import {
    EXPECTED_GOOGLE_AUTHORIZE_URL,
    EXPECTED_MICROSOFT_AUTHORIZE_URL,
    GOOGLE_PROVIDER,
    MICROSOFT_PROVIDER,
    OAUTH_PROVIDERS,
    TEST_APP_ORIGIN,
    type OAuthProviderId,
} from '@tests/fixtures/oauth';

// =============================================================================
// CANONICAL POPUP DIMENSIONS
// =============================================================================

/**
 * Default expected dimensions for an OAuth pop-up window.
 *
 * 500×600 is the OAuth-spec recommended size (RFC 6749 Section 3.1.2
 * does not mandate dimensions but every major IdP — Microsoft, Google,
 * Apple, GitHub — documents 500×600 as the recommended pop-up size for
 * desktop authorize prompts).
 *
 * Tests that want to assert custom dimensions pass an override to
 * `assertPopupDimensions(...)`. The constants here are the default.
 */
export const DEFAULT_OAUTH_POPUP_WIDTH = 500 as const;
export const DEFAULT_OAUTH_POPUP_HEIGHT = 600 as const;

// =============================================================================
// SCENARIO SIMULATORS
// =============================================================================

/**
 * Make every subsequent `window.open(...)` call return a fresh fake popup
 * (one per call, isolated state). Equivalent to invoking the primitive
 * `simulatePopupAllowed()`.
 *
 * Returns the popup reference returned by the FIRST call. Callers that
 * need to mutate the popup (e.g., simulate a redirect by setting
 * `popup.location.href`) should call this BEFORE triggering the OAuth
 * button, then capture the result for use with the callback flow.
 *
 * @returns The fake popup that the next `window.open(...)` call will return.
 */
export function simulateMicrosoftPopupAllowed(): Window {
    return simulatePopupAllowed();
}

/**
 * Make the next Microsoft OAuth pop-up call return `null`, simulating
 * the browser blocking the pop-up.
 *
 * Equivalent to `simulatePopupBlocked()` from the primitive layer; the
 * provider-specific aliases exist solely so test specs can read more
 * naturally:
 *
 *   simulateMicrosoftPopupBlocked();
 *   // ... click Microsoft button ...
 *   // ... assert that the SignIn surface shows the "popup blocked" toast ...
 */
export function simulateMicrosoftPopupBlocked(): void {
    simulatePopupBlocked();
}

/**
 * Google equivalent of `simulateMicrosoftPopupAllowed`.
 */
export function simulateGooglePopupAllowed(): Window {
    return simulatePopupAllowed();
}

/**
 * Google equivalent of `simulateMicrosoftPopupBlocked`.
 */
export function simulateGooglePopupBlocked(): void {
    simulatePopupBlocked();
}

/**
 * Generic provider equivalent — for tests that exercise the See-more
 * expansion (Apple, GitHub, GitLab, Okta) without needing a
 * provider-specific function name.
 */
export function simulateProviderPopupAllowed(_provider: OAuthProviderId): Window {
    // The provider parameter is for caller readability; the underlying
    // stub does not differentiate between providers because
    // `window.open` itself is provider-agnostic.
    return simulatePopupAllowed();
}

/**
 * Generic provider equivalent of `simulatePopupBlocked`.
 */
export function simulateProviderPopupBlocked(_provider: OAuthProviderId): void {
    simulatePopupBlocked();
}

// =============================================================================
// POPUP CALL INTROSPECTION
// =============================================================================

/**
 * Return every recorded `window.open(...)` call whose URL (or string form)
 * targets the given provider's authorize endpoint.
 *
 * The matcher tolerates BOTH the relative form (`'/auth/sso/microsoft/authorize?...'`)
 * AND the absolute form (`'http://127.0.0.1:5173/auth/sso/microsoft/authorize?...'`)
 * because the SUT may issue either style depending on whether it uses
 * relative URLs or builds absolute URLs against `window.location.origin`.
 *
 * @param provider The OAuth provider whose calls should be returned.
 * @returns The matching subset of `getWindowOpenCalls()`.
 */
export function getProviderPopupCalls(provider: OAuthProviderId): WindowOpenCall[] {
    const authorizePath = OAUTH_PROVIDERS[provider].authorizePath;
    const absolutePrefix = `${TEST_APP_ORIGIN}${authorizePath}`;
    return getWindowOpenCalls().filter((call) => {
        const urlString = call.url === undefined ? '' : call.url.toString();
        return urlString.startsWith(authorizePath) || urlString.startsWith(absolutePrefix);
    });
}

/**
 * Microsoft alias for `getProviderPopupCalls('microsoft')`.
 */
export function getMicrosoftPopupCalls(): WindowOpenCall[] {
    return getProviderPopupCalls('microsoft');
}

/**
 * Google alias for `getProviderPopupCalls('google')`.
 */
export function getGooglePopupCalls(): WindowOpenCall[] {
    return getProviderPopupCalls('google');
}

/**
 * Return every recorded `window.open(...)` call whose URL points at an
 * authorize endpoint for ANY known OAuth provider.
 *
 * Useful for assertions like "exactly one OAuth pop-up was opened in
 * this test" without binding to a specific provider. Tolerates both
 * relative and absolute URL forms.
 */
export function getOAuthPopupCalls(): WindowOpenCall[] {
    return getWindowOpenCalls().filter((call) => {
        const urlString = call.url === undefined ? '' : call.url.toString();
        for (const id of Object.keys(OAUTH_PROVIDERS) as OAuthProviderId[]) {
            const authorizePath = OAUTH_PROVIDERS[id].authorizePath;
            const absolutePrefix = `${TEST_APP_ORIGIN}${authorizePath}`;
            if (urlString.startsWith(authorizePath) || urlString.startsWith(absolutePrefix)) {
                return true;
            }
        }
        return false;
    });
}

// =============================================================================
// ASSERTION SUGAR
// =============================================================================

/**
 * Assert that the OAuth pop-up for the given provider was opened
 * exactly `times` times (default 1).
 *
 * @param provider The OAuth provider whose pop-up should have been opened.
 * @param times    The expected call count (default 1).
 *
 * @example
 *   await user.click(microsoftButton);
 *   expectOAuthAuthorizeCalled('microsoft');
 */
export function expectOAuthAuthorizeCalled(
    provider: OAuthProviderId,
    times: number = 1,
): void {
    const calls = getProviderPopupCalls(provider);
    expect(
        calls.length === times,
        `Expected ${provider} authorize pop-up to be called ${times} time(s) but received ${calls.length} call(s)`,
    ).toBe(true);
}

/**
 * Assert that the OAuth pop-up for the given provider was NOT opened.
 *
 * @example
 *   await user.click(googleButton);
 *   expectOAuthAuthorizeCalled('google');
 *   expectOAuthAuthorizeNotCalled('microsoft');
 */
export function expectOAuthAuthorizeNotCalled(provider: OAuthProviderId): void {
    expectOAuthAuthorizeCalled(provider, 0);
}

// =============================================================================
// POPUP BOUNDING-BOX HELPERS
// =============================================================================

/**
 * Parse a `window.open(...)` features string into a key/value record.
 *
 * Accepts the standard `'width=500,height=600,scrollbars=yes'` form;
 * returns an empty object for `undefined` or an empty string. Values
 * are kept as raw strings so the caller can parse them into the
 * appropriate type (e.g., numeric width).
 *
 * @param features The `features` field from a `WindowOpenCall`.
 * @returns The parsed key/value map.
 */
export function parsePopupFeatures(features: string | undefined): Record<string, string> {
    if (features === undefined || features.length === 0) {
        return {};
    }
    const out: Record<string, string> = {};
    for (const segment of features.split(',')) {
        const trimmed = segment.trim();
        if (trimmed.length === 0) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) {
            // Boolean feature (`'noopener'`, etc.) — set to empty string sentinel.
            out[trimmed] = '';
        } else {
            const key = trimmed.slice(0, eqIdx).trim();
            const value = trimmed.slice(eqIdx + 1).trim();
            out[key] = value;
        }
    }
    return out;
}

/**
 * Assert that the popup features string declared the expected width
 * and height.
 *
 * Pass `expectedWidth = null` (or `expectedHeight = null`) to skip a
 * dimension. Pass numbers to require an exact match.
 *
 * @param call            The `WindowOpenCall` whose features to inspect.
 * @param expectedWidth   Expected width in px (default 500).
 * @param expectedHeight  Expected height in px (default 600).
 *
 * @example
 *   const [call] = getMicrosoftPopupCalls();
 *   assertPopupDimensions(call);
 *
 *   // Or with overrides:
 *   assertPopupDimensions(call, 600, 800);
 */
export function assertPopupDimensions(
    call: WindowOpenCall,
    expectedWidth: number | null = DEFAULT_OAUTH_POPUP_WIDTH,
    expectedHeight: number | null = DEFAULT_OAUTH_POPUP_HEIGHT,
): void {
    const features = parsePopupFeatures(call.features);
    if (expectedWidth !== null) {
        const widthRaw = features['width'];
        expect(
            widthRaw !== undefined,
            `Expected popup features to include width=${expectedWidth} but features was "${call.features ?? ''}"`,
        ).toBe(true);
        const widthValue = Number.parseInt(widthRaw ?? '0', 10);
        expect(
            widthValue === expectedWidth,
            `Expected popup width to be ${expectedWidth} but received ${widthValue} (raw="${widthRaw ?? ''}")`,
        ).toBe(true);
    }
    if (expectedHeight !== null) {
        const heightRaw = features['height'];
        expect(
            heightRaw !== undefined,
            `Expected popup features to include height=${expectedHeight} but features was "${call.features ?? ''}"`,
        ).toBe(true);
        const heightValue = Number.parseInt(heightRaw ?? '0', 10);
        expect(
            heightValue === expectedHeight,
            `Expected popup height to be ${expectedHeight} but received ${heightValue} (raw="${heightRaw ?? ''}")`,
        ).toBe(true);
    }
}

// =============================================================================
// MOCK AUTHORIZE URL CONSTRUCTORS
// =============================================================================

/**
 * Build a synthetic Microsoft authorize URL with override query
 * parameters merged into the baseline.
 *
 * Tests use this to construct the URL a stubbed popup should report
 * via `popup.location.href` BEFORE the OAuth callback handler reads
 * it. Defaults match `EXPECTED_MICROSOFT_AUTHORIZE_URL` so the caller
 * only needs to override the `state` or `code` fields per scenario.
 *
 * @param overrides Query-parameter overrides (replacing keys present
 *                  in the baseline URL).
 * @returns The composed authorize URL string.
 *
 * @example
 *   const url = buildMockMicrosoftAuthorizeUrl({ code: 'mock-code-001', state: OAUTH_STATE_PRIMARY });
 *   popup.location.href = url;
 */
export function buildMockMicrosoftAuthorizeUrl(overrides: Record<string, string> = {}): string {
    const parsed = new URL(EXPECTED_MICROSOFT_AUTHORIZE_URL);
    for (const [key, value] of Object.entries(overrides)) {
        parsed.searchParams.set(key, value);
    }
    return parsed.toString();
}

/**
 * Google equivalent of `buildMockMicrosoftAuthorizeUrl`.
 */
export function buildMockGoogleAuthorizeUrl(overrides: Record<string, string> = {}): string {
    const parsed = new URL(EXPECTED_GOOGLE_AUTHORIZE_URL);
    for (const [key, value] of Object.entries(overrides)) {
        parsed.searchParams.set(key, value);
    }
    return parsed.toString();
}

/**
 * Provider-agnostic authorize URL builder.
 *
 * Delegates to the Microsoft/Google specific builder, or — for the
 * See-more providers (apple, github, gitlab, okta) — composes a fresh
 * URL from the provider's `authorizeBaseUrl` and the supplied
 * overrides. The See-more providers' canonical authorize URLs are not
 * pre-computed in fixtures because the SSO surface lists them but does
 * not exercise their full E2E flow in this checkpoint.
 *
 * @param provider  The OAuth provider.
 * @param overrides Query-parameter overrides.
 * @returns The composed authorize URL string.
 */
export function buildMockAuthorizeUrl(
    provider: OAuthProviderId,
    overrides: Record<string, string> = {},
): string {
    if (provider === 'microsoft') return buildMockMicrosoftAuthorizeUrl(overrides);
    if (provider === 'google') return buildMockGoogleAuthorizeUrl(overrides);
    const config = OAUTH_PROVIDERS[provider];
    const parsed = new URL(`${TEST_APP_ORIGIN}${config.authorizePath}`);
    for (const [key, value] of Object.entries(overrides)) {
        parsed.searchParams.set(key, value);
    }
    return parsed.toString();
}

// =============================================================================
// RE-EXPORTS FOR CONVENIENCE
// =============================================================================

// Re-export the provider config constants so test specs can grab the
// provider metadata (clientId, scopes, redirectUri) from a single
// import location. Tests that import the lower-level
// `tests/fixtures/oauth.ts` directly remain valid; this re-export is
// for ergonomic discoverability.
export { MICROSOFT_PROVIDER, GOOGLE_PROVIDER };
