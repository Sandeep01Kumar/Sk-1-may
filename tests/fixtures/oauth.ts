/**
 * OAuth fixtures: provider configurations, PKCE samples, and URL builders.
 *
 * These are STATIC samples used by:
 *   - tests/unit/utils/oauth.test.ts (helper unit tests)
 *   - tests/component/sso/SignInA|B|C.test.tsx (button click handlers)
 *   - tests/integration/signin-microsoft.test.tsx
 *   - tests/integration/signin-multi-provider.test.tsx
 *   - tests/mocks/handlers/auth.ts (MSW response data)
 *
 * Per folder-level spec rule 3: PKCE codes, states, and nonces are PRE-COMPUTED
 * static values — never `crypto.randomUUID()` or `Math.random()` at module load.
 * Tests that need to verify the SUT's randomness call the helper directly and
 * inspect the output; these fixtures provide the EXPECTED-SHAPED samples.
 *
 * Per AAP Section 0.10.4 ("Do not introduce a real backend OAuth implementation"):
 * client IDs and secrets below are PLACEHOLDERS, never real credentials.
 *
 * PKCE code_challenge values were computed offline by applying
 * `base64url(SHA-256(ASCII(codeVerifier)))` per RFC 7636 §4.2 against each
 * codeVerifier literal in this file. The unit test in
 * `tests/unit/utils/oauth.test.ts` will independently recompute the challenge
 * from the verifier and assert string equality with the fixture value.
 *
 * Authority:
 *   - AAP Section 0.3.1 (target functions buildOAuthRedirectUrl, generateOAuthState, generateOAuthNonce).
 *   - AAP Section 0.4.4 (fixture table).
 *   - AAP Section 0.5.1 (file row).
 *   - AAP Section 0.10.2 (typed exports only, pre-computed randomness, no factories).
 *   - AAP Section 0.10.4 (no real backend OAuth implementation).
 *   - tests/setup/global.ts OAUTH_ENDPOINTS + PROVIDERS — this file is the superset.
 */

// =============================================================================
// PROVIDER IDENTIFIER TYPES
// =============================================================================

/**
 * Provider identifiers used across the OAuth flow.
 *
 * Microsoft and Google are explicitly rendered in Figma frames Sign-in A/B.
 * The remaining four providers (apple, github, gitlab, okta) appear in
 * Sign-in C's "See more" expansion per the Figma file.
 */
export type OAuthProviderId = 'microsoft' | 'google' | 'apple' | 'github' | 'gitlab' | 'okta';

/**
 * Subset that has dedicated visual treatment in Sign-in A/B.
 *
 * The SignInA component renders only the Microsoft button.
 * The SignInB component renders Microsoft + Google buttons stacked
 * with a 16px gap (Figma layout token).
 */
export type PrimaryOAuthProviderId = 'microsoft' | 'google';

/**
 * Ordered list of every provider in canonical UI order.
 *
 * The order mirrors the Figma "See more" expanded layout: Microsoft and
 * Google are top of the list; remaining four appear in alphabetical order.
 */
export const OAUTH_PROVIDER_IDS: readonly OAuthProviderId[] = [
    'microsoft',
    'google',
    'apple',
    'github',
    'gitlab',
    'okta',
] as const;

// =============================================================================
// PROVIDER CONFIGURATION TYPE
// =============================================================================

/**
 * Per-provider OAuth configuration.
 *
 * All fields are `readonly` so consumers cannot mutate a shared fixture
 * between tests. Frozen-at-the-type-level discipline aligns with AAP
 * Section 0.10.2 (no shared mutable state).
 */
export interface OAuthProviderConfig {
    /** Stable provider identifier. */
    readonly id: OAuthProviderId;
    /** Human-readable label rendered in the SocialProviderButton. */
    readonly label: string;
    /** Path to the provider's logo asset (under src/assets/logos/ where applicable). */
    readonly logoPath: string;
    /** Placeholder OAuth client ID — never a real credential. */
    readonly clientId: string;
    /** Backend authorize endpoint path (relative to the app origin). */
    readonly authorizePath: string;
    /** Backend callback endpoint path (relative to the app origin). */
    readonly callbackPath: string;
    /** OAuth scopes requested for this provider. */
    readonly scopes: readonly string[];
    /** Standard OAuth response_type. */
    readonly responseType: 'code';
    /** PKCE challenge method. */
    readonly codeChallengeMethod: 'S256';
}

// =============================================================================
// PROVIDER CONFIGURATION CONSTANTS
// =============================================================================

/**
 * Microsoft OAuth configuration (Figma frame Sign-in A primary provider).
 *
 * Logo path matches the asset committed by the Image Assets phase:
 *   src/assets/logos/microsoft-logo.png
 *   (Figma imageRef 5f6c2ee4d3e2fdb8e07e3a7170e08d7deb519f89; rendered 24x24)
 *
 * Scopes include `User.Read` to match Microsoft Graph's minimum profile
 * read permission alongside the standard OpenID Connect trio.
 */
export const MICROSOFT_PROVIDER: OAuthProviderConfig = {
    id: 'microsoft',
    label: 'Microsoft',
    logoPath: '/src/assets/logos/microsoft-logo.png',
    clientId: 'placeholder-microsoft-client-id',
    authorizePath: '/auth/sso/microsoft/authorize',
    callbackPath: '/auth/sso/microsoft/callback',
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    responseType: 'code',
    codeChallengeMethod: 'S256',
};

/**
 * Google OAuth configuration (Figma frame Sign-in B secondary provider).
 *
 * Logo path matches the asset committed by the Image Assets phase:
 *   src/assets/logos/google-logo.png
 *   (Figma imageRef 0ebadeab0135cd2b6336c55ab458370f6f54c9d2; rendered 24x24)
 */
export const GOOGLE_PROVIDER: OAuthProviderConfig = {
    id: 'google',
    label: 'Google',
    logoPath: '/src/assets/logos/google-logo.png',
    clientId: 'placeholder-google-client-id',
    authorizePath: '/auth/sso/google/authorize',
    callbackPath: '/auth/sso/google/callback',
    scopes: ['openid', 'profile', 'email'],
    responseType: 'code',
    codeChallengeMethod: 'S256',
};

/**
 * Apple OAuth configuration — appears in Sign-in C "See more" expansion.
 *
 * Logo path is the canonical implementation path; not committed by this plan
 * because no Figma frame renders the icon at this size. The implementation
 * cycle decides whether to download from Apple's brand guidelines or import
 * from a package.
 *
 * Per Apple's OAuth scope spec, the supported scopes are limited to
 * `name` and `email` plus the implicit `openid` for ID token issuance.
 */
export const APPLE_PROVIDER: OAuthProviderConfig = {
    id: 'apple',
    label: 'Apple',
    logoPath: '/src/assets/logos/apple-logo.svg',
    clientId: 'placeholder-apple-client-id',
    authorizePath: '/auth/sso/apple/authorize',
    callbackPath: '/auth/sso/apple/callback',
    scopes: ['openid', 'name', 'email'],
    responseType: 'code',
    codeChallengeMethod: 'S256',
};

/**
 * GitHub OAuth configuration — Sign-in C expansion.
 *
 * GitHub uses colon-separated scope names (e.g., `read:user`, `user:email`)
 * instead of the OpenID Connect standard scopes. The implementation must
 * URL-encode the colon as `%3A` when building the authorize URL.
 */
export const GITHUB_PROVIDER: OAuthProviderConfig = {
    id: 'github',
    label: 'GitHub',
    logoPath: '/src/assets/logos/github-logo.svg',
    clientId: 'placeholder-github-client-id',
    authorizePath: '/auth/sso/github/authorize',
    callbackPath: '/auth/sso/github/callback',
    scopes: ['read:user', 'user:email'],
    responseType: 'code',
    codeChallengeMethod: 'S256',
};

/**
 * GitLab OAuth configuration — Sign-in C expansion.
 */
export const GITLAB_PROVIDER: OAuthProviderConfig = {
    id: 'gitlab',
    label: 'GitLab',
    logoPath: '/src/assets/logos/gitlab-logo.svg',
    clientId: 'placeholder-gitlab-client-id',
    authorizePath: '/auth/sso/gitlab/authorize',
    callbackPath: '/auth/sso/gitlab/callback',
    scopes: ['openid', 'profile', 'email'],
    responseType: 'code',
    codeChallengeMethod: 'S256',
};

/**
 * Okta OAuth configuration — Sign-in C expansion.
 */
export const OKTA_PROVIDER: OAuthProviderConfig = {
    id: 'okta',
    label: 'Okta',
    logoPath: '/src/assets/logos/okta-logo.svg',
    clientId: 'placeholder-okta-client-id',
    authorizePath: '/auth/sso/okta/authorize',
    callbackPath: '/auth/sso/okta/callback',
    scopes: ['openid', 'profile', 'email'],
    responseType: 'code',
    codeChallengeMethod: 'S256',
};

/**
 * All providers indexed by id.
 *
 * `Readonly<Record<OAuthProviderId, ...>>` enforces exhaustive provider
 * coverage at compile time. If a new entry is added to `OAuthProviderId`
 * and not added here, TypeScript reports the missing-key error.
 */
export const OAUTH_PROVIDERS: Readonly<Record<OAuthProviderId, OAuthProviderConfig>> = {
    microsoft: MICROSOFT_PROVIDER,
    google: GOOGLE_PROVIDER,
    apple: APPLE_PROVIDER,
    github: GITHUB_PROVIDER,
    gitlab: GITLAB_PROVIDER,
    okta: OKTA_PROVIDER,
};

/**
 * All providers in canonical UI order — useful when iterating in tests.
 *
 * The order intentionally matches OAUTH_PROVIDER_IDS so visual baselines
 * and accessibility tab-order tests remain consistent across runs.
 */
export const OAUTH_PROVIDER_LIST: readonly OAuthProviderConfig[] = [
    MICROSOFT_PROVIDER,
    GOOGLE_PROVIDER,
    APPLE_PROVIDER,
    GITHUB_PROVIDER,
    GITLAB_PROVIDER,
    OKTA_PROVIDER,
] as const;

/**
 * Primary providers (always visible — never hidden behind "See more").
 *
 * Sign-in A renders the first entry only; Sign-in B renders both entries.
 */
export const PRIMARY_OAUTH_PROVIDERS: readonly OAuthProviderConfig[] = [
    MICROSOFT_PROVIDER,
    GOOGLE_PROVIDER,
] as const;

/**
 * Providers hidden behind the "See more" affordance on Sign-in C.
 *
 * Sign-in C (collapsed) shows PRIMARY_OAUTH_PROVIDERS only;
 * after the user clicks "See more", these four appear below the primary set.
 */
export const SECONDARY_OAUTH_PROVIDERS: readonly OAuthProviderConfig[] = [
    APPLE_PROVIDER,
    GITHUB_PROVIDER,
    GITLAB_PROVIDER,
    OKTA_PROVIDER,
] as const;

// =============================================================================
// PKCE SAMPLES
// =============================================================================

/**
 * PKCE sample shape (RFC 7636).
 *
 * Per RFC 7636 §4.1, the `code_verifier` is a high-entropy string drawn from
 * the base64url alphabet plus `-._~` and is 43 to 128 characters long.
 * Per RFC 7636 §4.2, when `code_challenge_method = S256`, the
 * `code_challenge` is `base64url(SHA-256(ASCII(code_verifier)))` without
 * the trailing `=` padding, which always evaluates to exactly 43 chars.
 */
export interface PkceSample {
    /** Random code verifier (43-128 chars, base64url alphabet). */
    readonly codeVerifier: string;
    /** base64url(SHA-256(codeVerifier)) — exactly 43 chars. */
    readonly codeChallenge: string;
    /** Always 'S256' for SHA-256 challenges. */
    readonly codeChallengeMethod: 'S256';
}

/**
 * Pre-computed PKCE sample #1 — used as the primary fixture.
 *
 * `codeVerifier`  : 61-char base64url string (deterministic for tests).
 * `codeChallenge` : base64url(SHA-256(codeVerifier)) — computed offline once
 *                   using the standard Node.js crypto pipeline:
 *                     base64url(SHA-256(ASCII(codeVerifier)))
 *
 * The unit test in `tests/unit/utils/oauth.test.ts` independently recomputes
 * the challenge from the verifier and asserts string equality with this
 * literal. If the test fails after the SUT lands, the bug is in the SUT —
 * NOT in this fixture.
 */
export const PKCE_SAMPLE_PRIMARY: PkceSample = {
    codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk1d3Bjf-tJe9Z4CVPmB',
    codeChallenge: 'ow4A4leGDB4rP-C5AdSR_rGfwmFajahD5TdYywSV_Mo',
    codeChallengeMethod: 'S256',
};

/**
 * Pre-computed PKCE sample #2 — used for second-flow scenarios.
 *
 * Same computation pipeline as PKCE_SAMPLE_PRIMARY.
 */
export const PKCE_SAMPLE_SECONDARY: PkceSample = {
    codeVerifier: 'a1B2c3D4e5F6g7H8i9J0kLmNoPqRsTuVwXyZAaBbCcDdEeFfGgHhIiJjKkLlMm',
    codeChallenge: 'QPj73M-h2Q9qzM9NctrLUffhuqbx8mKWbAb9nLXKg3g',
    codeChallengeMethod: 'S256',
};

/**
 * All PKCE samples — used for iteration in unit tests.
 *
 * The unit test runs the SUT's challenge generator against every entry's
 * `codeVerifier` and asserts equality with `codeChallenge`.
 */
export const PKCE_SAMPLES: readonly PkceSample[] = [
    PKCE_SAMPLE_PRIMARY,
    PKCE_SAMPLE_SECONDARY,
] as const;

// =============================================================================
// STATE AND NONCE SAMPLES
// =============================================================================

/**
 * Pre-computed OAuth `state` parameter samples.
 *
 * The state is opaque to the IdP; it's an anti-CSRF token the client generates
 * and verifies on callback. These samples are base64url-conformant strings
 * (alphabet `[A-Za-z0-9-_]`) of length ≥ OAUTH_STATE_NONCE_MIN_LENGTH and
 * ≤ OAUTH_STATE_NONCE_MAX_LENGTH.
 */
export const OAUTH_STATE_PRIMARY = 'st4t3-fixturE-sAmpl3-prImaRy-001A' as const;
export const OAUTH_STATE_SECONDARY = 'st4t3-fixturE-sAmpl3-sec0ndary-02B' as const;

/**
 * State value that intentionally does NOT match the originally-stored state.
 *
 * Used by CSRF-detection tests in `tests/integration/signin-microsoft.test.tsx`
 * to verify the implementation rejects mismatched state in the callback.
 */
export const OAUTH_STATE_TAMPERED = 'tAmperedSt4te-do_n0t_accEpt-XX003' as const;

/**
 * Pre-computed OAuth `nonce` parameter samples.
 *
 * The nonce is sent in the authorize request and echoed in the id_token to
 * prevent replay attacks. These samples are base64url-conformant strings.
 */
export const OAUTH_NONCE_PRIMARY = 'n0nce-FixT_sample-prImaRy-AAA001a' as const;
export const OAUTH_NONCE_SECONDARY = 'n0nce-FixT_sample-secOndary-BB002' as const;

/**
 * Charset that valid state/nonce values must conform to (base64url alphabet
 * without padding). Used by `tests/unit/utils/oauth.test.ts` to validate the
 * SUT's randomness output.
 *
 * Order matches the canonical base64url alphabet:
 *   uppercase letters, lowercase letters, digits, then `-` and `_`.
 */
export const OAUTH_STATE_NONCE_CHARSET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_' as const;

/**
 * Expected minimum length of generated state/nonce values.
 *
 * Sufficient entropy for anti-CSRF and anti-replay use cases per OWASP
 * guidance (≥ 128 bits → 22 base64url chars).
 */
export const OAUTH_STATE_NONCE_MIN_LENGTH = 22 as const;

/**
 * Expected maximum length of generated state/nonce values.
 *
 * Long enough to remain comfortably under the typical 2048-char URL length
 * limit when combined with other authorize-URL parameters.
 */
export const OAUTH_STATE_NONCE_MAX_LENGTH = 64 as const;

// =============================================================================
// REDIRECT URIs AND ORIGINS
// =============================================================================

/**
 * App origin used in tests.
 *
 * MUST match `tests/setup/global.ts.BASE_URL` to keep MSW handlers, Playwright
 * baseURL, and these fixtures in lockstep. The mismatch would surface in the
 * unit test that validates EXPECTED_*_AUTHORIZE_URL composition.
 *
 * Authority: AAP Section 0.5.1 (`baseURL http://127.0.0.1:5173`).
 */
export const TEST_APP_ORIGIN = 'http://127.0.0.1:5173' as const;

/**
 * Default redirect URI used in OAuth authorize requests.
 *
 * Provider-agnostic fallback. Most providers in this fixture use
 * `REDIRECT_URIS[providerId]` instead because the IdPs require per-provider
 * pre-registration of redirect URIs.
 */
export const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:5173/sso/callback' as const;

/**
 * Per-provider redirect URIs (some providers require provider-specific paths).
 *
 * Each value is the absolute URL the provider will redirect to after the user
 * authorizes (or denies) the application. Tests use these to:
 *   - Assert the SUT builds the correct authorize URL.
 *   - Configure MSW handlers to intercept callbacks on the correct path.
 *   - Drive Playwright navigation in E2E tests.
 */
export const REDIRECT_URIS: Readonly<Record<OAuthProviderId, string>> = {
    microsoft: 'http://127.0.0.1:5173/auth/sso/microsoft/callback',
    google: 'http://127.0.0.1:5173/auth/sso/google/callback',
    apple: 'http://127.0.0.1:5173/auth/sso/apple/callback',
    github: 'http://127.0.0.1:5173/auth/sso/github/callback',
    gitlab: 'http://127.0.0.1:5173/auth/sso/gitlab/callback',
    okta: 'http://127.0.0.1:5173/auth/sso/okta/callback',
};

// =============================================================================
// EXPECTED AUTHORIZE URLS
// =============================================================================

/**
 * The output that `buildOAuthRedirectUrl` should produce for each provider
 * using PKCE_SAMPLE_PRIMARY, OAUTH_STATE_PRIMARY, OAUTH_NONCE_PRIMARY.
 *
 * Format: <authorizePath>?<query-string with stable parameter order>.
 *
 * Stable parameter order MUST be:
 *   client_id, redirect_uri, response_type, scope, state, nonce,
 *   code_challenge, code_challenge_method
 *
 * Scope encoding uses URLSearchParams' default behaviour — spaces become
 * `+`. This matches the application/x-www-form-urlencoded conventions most
 * OAuth libraries adopt.
 *
 * Authority: AAP Section 0.3.1 — the SUT's stable URL is critical for
 * snapshot reproducibility (SignInButton's `window.open(url)` assertion
 * compares strings, not parsed components).
 */
export const EXPECTED_MICROSOFT_AUTHORIZE_URL =
    'http://127.0.0.1:5173/auth/sso/microsoft/authorize' +
    '?client_id=placeholder-microsoft-client-id' +
    '&redirect_uri=http%3A%2F%2F127.0.0.1%3A5173%2Fauth%2Fsso%2Fmicrosoft%2Fcallback' +
    '&response_type=code' +
    '&scope=openid+profile+email+User.Read' +
    '&state=st4t3-fixturE-sAmpl3-prImaRy-001A' +
    '&nonce=n0nce-FixT_sample-prImaRy-AAA001a' +
    '&code_challenge=ow4A4leGDB4rP-C5AdSR_rGfwmFajahD5TdYywSV_Mo' +
    '&code_challenge_method=S256';

export const EXPECTED_GOOGLE_AUTHORIZE_URL =
    'http://127.0.0.1:5173/auth/sso/google/authorize' +
    '?client_id=placeholder-google-client-id' +
    '&redirect_uri=http%3A%2F%2F127.0.0.1%3A5173%2Fauth%2Fsso%2Fgoogle%2Fcallback' +
    '&response_type=code' +
    '&scope=openid+profile+email' +
    '&state=st4t3-fixturE-sAmpl3-prImaRy-001A' +
    '&nonce=n0nce-FixT_sample-prImaRy-AAA001a' +
    '&code_challenge=ow4A4leGDB4rP-C5AdSR_rGfwmFajahD5TdYywSV_Mo' +
    '&code_challenge_method=S256';

// =============================================================================
// CALLBACK PAYLOADS AND ERRORS
// =============================================================================

/**
 * Shape of an OAuth callback URL's query parameters as parsed by the SUT.
 *
 * The `provider` field is added by the SUT after URL parsing (not part of
 * the IdP's callback parameters); tests use it as a discriminator when a
 * single handler dispatches to provider-specific code paths.
 */
export interface OAuthCallbackPayload {
    readonly code: string;
    readonly state: string;
    readonly provider: OAuthProviderId;
}

/**
 * Successful Microsoft callback.
 *
 * `state` mirrors the OAUTH_STATE_PRIMARY value the SUT would have stored
 * in the authorize step, allowing the round-trip test to verify state
 * matching without conditional logic.
 */
export const MICROSOFT_CALLBACK_SUCCESS: OAuthCallbackPayload = {
    code: 'authcode-microsoft-success-001',
    state: OAUTH_STATE_PRIMARY,
    provider: 'microsoft',
};

/**
 * Successful Google callback.
 */
export const GOOGLE_CALLBACK_SUCCESS: OAuthCallbackPayload = {
    code: 'authcode-google-success-001',
    state: OAUTH_STATE_PRIMARY,
    provider: 'google',
};

/**
 * Shape of an OAuth callback error.
 *
 * The error parameter names (`error`, `error_description`) follow
 * RFC 6749 §4.1.2.1 conventions exactly so MSW handlers can stub the
 * IdP's wire format faithfully.
 */
export interface OAuthCallbackError {
    readonly error: string;
    readonly error_description: string;
    readonly state: string;
    readonly provider: OAuthProviderId;
}

/**
 * Microsoft callback with `access_denied` error (user clicked Cancel).
 *
 * Exercised by `tests/e2e/sso/edge-cases.spec.ts` and
 * `tests/integration/signin-microsoft.test.tsx` to verify the SUT presents
 * a friendly recovery prompt rather than a generic failure screen.
 */
export const MICROSOFT_CALLBACK_ACCESS_DENIED: OAuthCallbackError = {
    error: 'access_denied',
    error_description: 'The user denied the authorization request',
    state: OAUTH_STATE_PRIMARY,
    provider: 'microsoft',
};

/**
 * Microsoft callback with `invalid_state` error (CSRF detection).
 *
 * The `state` value intentionally mismatches what the client stored,
 * simulating an attacker injecting a fake callback. The SUT should refuse
 * to exchange the code and surface a security-error message.
 */
export const MICROSOFT_CALLBACK_INVALID_STATE: OAuthCallbackError = {
    error: 'invalid_state',
    error_description: 'The provided state does not match the expected value',
    state: OAUTH_STATE_TAMPERED,
    provider: 'microsoft',
};

/**
 * Google callback with `access_denied` error.
 */
export const GOOGLE_CALLBACK_ACCESS_DENIED: OAuthCallbackError = {
    error: 'access_denied',
    error_description: 'The user denied the authorization request',
    state: OAUTH_STATE_PRIMARY,
    provider: 'google',
};

/**
 * Generic provider-error response — used when the IdP returns a server error.
 *
 * Provider field defaults to `'microsoft'` for the canonical sample; tests
 * needing a Google-specific server-error payload can derive a copy with the
 * spread syntax (the readonly modifiers permit shallow copy via spread).
 */
export const PROVIDER_CALLBACK_SERVER_ERROR: OAuthCallbackError = {
    error: 'server_error',
    error_description: 'The provider returned an internal error',
    state: OAUTH_STATE_PRIMARY,
    provider: 'microsoft',
};

/**
 * Pop-up blocker error — synthesised by the OAuth helper when window.open
 * returns null.
 *
 * Unlike the IdP-issued errors above, this error originates client-side and
 * has no `state` or `provider` field at the time it's raised (those values
 * are filled in by the SUT before display when context is known).
 *
 * Exercised by `tests/e2e/sso/edge-cases.spec.ts` to verify the SUT
 * presents a "Please allow popups" recovery prompt.
 */
export const OAUTH_POPUP_BLOCKED_ERROR = {
    error: 'popup_blocked',
    error_description: 'The browser blocked the OAuth popup. Please allow popups and try again.',
} as const;

// =============================================================================
// CONVENIENCE BUNDLE
// =============================================================================

/**
 * Convenience bundle for ergonomic single-import access.
 *
 * Tests that touch multiple OAuth concerns (provider configs + PKCE + state +
 * callbacks) can `import { oauth } from '@tests/fixtures/oauth'` and then
 * navigate via dot notation (e.g., `oauth.microsoft.clientId`,
 * `oauth.callbacks.microsoftSuccess`).
 *
 * The `as const` assertion at the end propagates literal types through every
 * nested field so TypeScript can narrow string fields to their precise
 * literal values in tests that destructure them.
 */
export const oauth = {
    providers: OAUTH_PROVIDERS,
    providerList: OAUTH_PROVIDER_LIST,
    primary: PRIMARY_OAUTH_PROVIDERS,
    secondary: SECONDARY_OAUTH_PROVIDERS,
    microsoft: MICROSOFT_PROVIDER,
    google: GOOGLE_PROVIDER,
    apple: APPLE_PROVIDER,
    github: GITHUB_PROVIDER,
    gitlab: GITLAB_PROVIDER,
    okta: OKTA_PROVIDER,
    pkce: {
        primary: PKCE_SAMPLE_PRIMARY,
        secondary: PKCE_SAMPLE_SECONDARY,
        all: PKCE_SAMPLES,
    },
    state: {
        primary: OAUTH_STATE_PRIMARY,
        secondary: OAUTH_STATE_SECONDARY,
        tampered: OAUTH_STATE_TAMPERED,
        charset: OAUTH_STATE_NONCE_CHARSET,
        minLength: OAUTH_STATE_NONCE_MIN_LENGTH,
        maxLength: OAUTH_STATE_NONCE_MAX_LENGTH,
    },
    nonce: {
        primary: OAUTH_NONCE_PRIMARY,
        secondary: OAUTH_NONCE_SECONDARY,
    },
    origins: {
        app: TEST_APP_ORIGIN,
        defaultRedirect: DEFAULT_REDIRECT_URI,
        perProvider: REDIRECT_URIS,
    },
    expectedAuthorizeUrls: {
        microsoft: EXPECTED_MICROSOFT_AUTHORIZE_URL,
        google: EXPECTED_GOOGLE_AUTHORIZE_URL,
    },
    callbacks: {
        microsoftSuccess: MICROSOFT_CALLBACK_SUCCESS,
        googleSuccess: GOOGLE_CALLBACK_SUCCESS,
        microsoftAccessDenied: MICROSOFT_CALLBACK_ACCESS_DENIED,
        microsoftInvalidState: MICROSOFT_CALLBACK_INVALID_STATE,
        googleAccessDenied: GOOGLE_CALLBACK_ACCESS_DENIED,
        providerServerError: PROVIDER_CALLBACK_SERVER_ERROR,
        popupBlocked: OAUTH_POPUP_BLOCKED_ERROR,
    },
    ids: OAUTH_PROVIDER_IDS,
} as const;
