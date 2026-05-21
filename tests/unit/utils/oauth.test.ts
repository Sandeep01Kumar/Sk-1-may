/**
 * Unit tests for the SSO OAuth helper utility module.
 *
 * Target file under test: `src/utils/oauth.ts` (CREATED by a subsequent
 * implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Functions exercised
 * --------------------------------------------------------------------------
 *
 *   buildOAuthRedirectUrl(opts: BuildOAuthRedirectUrlOptions): string
 *     - Composes the IdP-bound authorize URL from a provider config,
 *       a PKCE pair, and per-request state and nonce.
 *     - Parameter order MUST be stable:
 *         client_id, redirect_uri, response_type, scope, state, nonce,
 *         code_challenge, code_challenge_method
 *       This is mandated because SignInButton uses string equality against
 *       the resulting URL in `window.open` assertions.
 *     - Scope encoding uses URLSearchParams (spaces -> `+`).
 *     - Provider-specific scope strings (Apple `name`, GitHub `read:user`)
 *       are URL-encoded faithfully.
 *
 *   generateOAuthState(): string
 *     - Returns a high-entropy anti-CSRF token drawn from the base64url
 *       alphabet `[A-Za-z0-9_-]`.
 *     - Length is bounded by [OAUTH_STATE_NONCE_MIN_LENGTH,
 *       OAUTH_STATE_NONCE_MAX_LENGTH] inclusive.
 *     - Invocations return distinct values with overwhelming probability
 *       (collision rate must be 0 across 1 000 generations).
 *
 *   generateOAuthNonce(): string
 *     - Same shape and entropy guarantees as generateOAuthState; the only
 *       difference is intended use (replay-attack mitigation rather than
 *       CSRF).
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the target module `src/utils/oauth.ts` does NOT
 * exist in the repository today. When Vitest resolves the
 * `@/utils/oauth` import below, the import will fail with
 * `Cannot find module '@/utils/oauth'`. This is the EXPECTED failure
 * mode — the test file acts as the executable design specification, and
 * the failing tests will become passing tests once a subsequent
 * implementation cycle authors the module.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.4 — Utility modules >= 100% coverage.
 *   - AAP Section 0.3.1 — Functions enumerated.
 *   - AAP Section 0.4.2 — PKCE deterministic challenge boundary.
 *   - AAP Section 0.5.1 — File row for `tests/unit/utils/oauth.test.ts`.
 *   - AAP Section 0.6.1 — Locked dependency versions for crypto helpers.
 *   - AAP Section 0.7.1 — Per-file coverage override 100%.
 *   - AAP Section 0.10.4 — Use crypto.getRandomValues / SubtleCrypto.
 *   - AAP Section 0.10.5 — SSO + utility modules not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';

import {
    APPLE_PROVIDER,
    DEFAULT_REDIRECT_URI,
    EXPECTED_GOOGLE_AUTHORIZE_URL,
    EXPECTED_MICROSOFT_AUTHORIZE_URL,
    GITHUB_PROVIDER,
    GITLAB_PROVIDER,
    GOOGLE_PROVIDER,
    MICROSOFT_PROVIDER,
    OAUTH_NONCE_PRIMARY,
    OAUTH_NONCE_SECONDARY,
    OAUTH_PROVIDER_IDS,
    OAUTH_PROVIDER_LIST,
    OAUTH_STATE_NONCE_CHARSET,
    OAUTH_STATE_NONCE_MAX_LENGTH,
    OAUTH_STATE_NONCE_MIN_LENGTH,
    OAUTH_STATE_PRIMARY,
    OAUTH_STATE_SECONDARY,
    OKTA_PROVIDER,
    PKCE_SAMPLE_PRIMARY,
    PKCE_SAMPLE_SECONDARY,
    PKCE_SAMPLES,
    REDIRECT_URIS,
    TEST_APP_ORIGIN,
    type OAuthProviderConfig,
    type OAuthProviderId,
    type PkceSample,
} from '@tests/fixtures/oauth';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================
//
// Per AAP Section 0.10.5, the path `@/utils/oauth` resolves to
// `src/utils/oauth.ts` (per `tsconfig.test.json` path alias mapping).
// That module does NOT exist yet. The import below will produce a
// `Cannot find module` error at test collection time. This IS the
// expected failure mode and will resolve once the implementation cycle
// authors the module.
//
// The SUT contract enforced by this file:
//   - `buildOAuthRedirectUrl` is a named export with the signature documented
//     in BuildOAuthRedirectUrlOptions.
//   - `generateOAuthState` is a named export returning a string.
//   - `generateOAuthNonce` is a named export returning a string.
//
import { buildOAuthRedirectUrl, generateOAuthNonce, generateOAuthState } from '@/utils/oauth';

// =============================================================================
// SHARED TYPES — SUT CONTRACT
// =============================================================================

/**
 * Options accepted by the buildOAuthRedirectUrl helper.
 *
 * This shape is the contract enforced by the unit tests below. The
 * implementation cycle MUST honour these exact field names. Exported
 * so the implementation cycle can reference the canonical contract
 * from its source files if desired.
 */
export interface BuildOAuthRedirectUrlOptions {
    /** Provider config from `tests/fixtures/oauth.ts` (or implementation-equivalent). */
    readonly provider: OAuthProviderConfig;
    /** Origin used to construct the redirect_uri parameter (absolute). */
    readonly origin: string;
    /** Per-request anti-CSRF state token. */
    readonly state: string;
    /** Per-request anti-replay nonce. */
    readonly nonce: string;
    /** PKCE challenge pair (S256). */
    readonly pkce: PkceSample;
    /**
     * Optional explicit redirect URI; when omitted the helper derives the
     * URI from `origin` and the provider's callbackPath.
     */
    readonly redirectUri?: string;
}

// =============================================================================
// PARAMETER ORDER CONTRACT
// =============================================================================

/**
 * The canonical query-parameter order. Tests assert that the actual URL
 * places these names in exactly this sequence (no alphabetical sorting
 * by URLSearchParams; the helper MUST preserve the order shown here).
 *
 * Authority: AAP Section 0.4.2 — stable parameter order; SignInButton
 * compares URLs via string equality.
 */
const EXPECTED_PARAMETER_ORDER = [
    'client_id',
    'redirect_uri',
    'response_type',
    'scope',
    'state',
    'nonce',
    'code_challenge',
    'code_challenge_method',
] as const;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Independently compute the PKCE S256 challenge from a verifier using
 * Node's `crypto` module. The unit test compares the SUT's output to
 * the fixture's pre-computed challenge AND to the value this helper
 * produces from the same verifier — if the two computations disagree,
 * we know with certainty the fixture is wrong rather than the SUT.
 */
function computeS256Challenge(verifier: string): string {
    return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

/**
 * Verifies a value is conformant to the base64url alphabet defined in
 * `OAUTH_STATE_NONCE_CHARSET`. Returns true when every character is a
 * member of the charset.
 */
function isBase64UrlConformant(value: string): boolean {
    for (let i = 0; i < value.length; i += 1) {
        const ch = value.charAt(i);
        if (!OAUTH_STATE_NONCE_CHARSET.includes(ch)) {
            return false;
        }
    }
    return true;
}

/**
 * Extracts query parameter names from a URL string in their original
 * order. Used to verify the SUT preserves the canonical order.
 */
function extractParameterOrder(url: string): readonly string[] {
    const queryIndex = url.indexOf('?');
    if (queryIndex < 0) {
        return [];
    }
    const query = url.slice(queryIndex + 1);
    const names: string[] = [];
    for (const pair of query.split('&')) {
        const eqIndex = pair.indexOf('=');
        names.push(eqIndex >= 0 ? pair.slice(0, eqIndex) : pair);
    }
    return names;
}

// =============================================================================
// SUITE — buildOAuthRedirectUrl
// =============================================================================

describe('src/utils/oauth — buildOAuthRedirectUrl', () => {
    describe('Microsoft provider (Sign-in A primary)', () => {
        it('produces the canonical Microsoft authorize URL when called with the primary fixtures', () => {
            const url = buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
                redirectUri: REDIRECT_URIS.microsoft,
            });

            expect(url).toBe(EXPECTED_MICROSOFT_AUTHORIZE_URL);
        });

        it('derives the redirect_uri from origin + provider.callbackPath when redirectUri is omitted', () => {
            const url = buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
            });

            expect(url).toBe(EXPECTED_MICROSOFT_AUTHORIZE_URL);
        });

        it('encodes the Microsoft `User.Read` scope verbatim alongside OpenID Connect scopes', () => {
            const url = buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
            });

            expect(url).toContain('&scope=openid+profile+email+User.Read');
        });
    });

    describe('Google provider (Sign-in B secondary)', () => {
        it('produces the canonical Google authorize URL when called with the primary fixtures', () => {
            const url = buildOAuthRedirectUrl({
                provider: GOOGLE_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
                redirectUri: REDIRECT_URIS.google,
            });

            expect(url).toBe(EXPECTED_GOOGLE_AUTHORIZE_URL);
        });

        it('omits the Microsoft-specific User.Read scope and only requests OpenID Connect scopes', () => {
            const url = buildOAuthRedirectUrl({
                provider: GOOGLE_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
            });

            expect(url).toContain('&scope=openid+profile+email&');
            expect(url).not.toContain('User.Read');
        });
    });

    describe('Sign-in C expanded providers (Apple, GitHub, GitLab, Okta)', () => {
        it('builds a valid Apple authorize URL with the limited Apple scopes', () => {
            const url = buildOAuthRedirectUrl({
                provider: APPLE_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_SECONDARY,
                nonce: OAUTH_NONCE_SECONDARY,
                pkce: PKCE_SAMPLE_SECONDARY,
            });

            expect(url).toContain(`${TEST_APP_ORIGIN}${APPLE_PROVIDER.authorizePath}?`);
            expect(url).toContain(`client_id=${APPLE_PROVIDER.clientId}`);
            expect(url).toContain('&scope=openid+name+email');
            expect(url).toContain('&response_type=code');
            expect(url).toContain('&code_challenge_method=S256');
        });

        it('URL-encodes the GitHub colon-separated scopes (read:user, user:email)', () => {
            const url = buildOAuthRedirectUrl({
                provider: GITHUB_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_SECONDARY,
                nonce: OAUTH_NONCE_SECONDARY,
                pkce: PKCE_SAMPLE_SECONDARY,
            });

            // URLSearchParams encodes colons as %3A.
            expect(url).toContain('&scope=read%3Auser+user%3Aemail');
        });

        it('builds a valid GitLab authorize URL with OpenID Connect scopes', () => {
            const url = buildOAuthRedirectUrl({
                provider: GITLAB_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_SECONDARY,
                nonce: OAUTH_NONCE_SECONDARY,
                pkce: PKCE_SAMPLE_SECONDARY,
            });

            expect(url).toContain(`${TEST_APP_ORIGIN}${GITLAB_PROVIDER.authorizePath}?`);
            expect(url).toContain('&scope=openid+profile+email');
        });

        it('builds a valid Okta authorize URL with the Okta client id', () => {
            const url = buildOAuthRedirectUrl({
                provider: OKTA_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_SECONDARY,
                nonce: OAUTH_NONCE_SECONDARY,
                pkce: PKCE_SAMPLE_SECONDARY,
            });

            expect(url).toContain(`client_id=${OKTA_PROVIDER.clientId}`);
            expect(url).toContain(`${TEST_APP_ORIGIN}${OKTA_PROVIDER.authorizePath}?`);
        });
    });

    describe('Stable parameter order across providers', () => {
        it.each<OAuthProviderId>([...OAUTH_PROVIDER_IDS])(
            'preserves the canonical parameter order for provider %s',
            (providerId) => {
                const provider = OAUTH_PROVIDER_LIST.find((p) => p.id === providerId);
                expect(provider).toBeDefined();
                if (!provider) {
                    return;
                }

                const url = buildOAuthRedirectUrl({
                    provider,
                    origin: TEST_APP_ORIGIN,
                    state: OAUTH_STATE_PRIMARY,
                    nonce: OAUTH_NONCE_PRIMARY,
                    pkce: PKCE_SAMPLE_PRIMARY,
                });

                const actualOrder = extractParameterOrder(url);
                expect(actualOrder).toStrictEqual([...EXPECTED_PARAMETER_ORDER]);
            },
        );
    });

    describe('Required parameter values', () => {
        it.each<OAuthProviderConfig>(OAUTH_PROVIDER_LIST.map((p) => p))(
            'always emits response_type=code for provider $id',
            (provider) => {
                const url = buildOAuthRedirectUrl({
                    provider,
                    origin: TEST_APP_ORIGIN,
                    state: OAUTH_STATE_PRIMARY,
                    nonce: OAUTH_NONCE_PRIMARY,
                    pkce: PKCE_SAMPLE_PRIMARY,
                });

                expect(url).toContain('&response_type=code');
            },
        );

        it.each<OAuthProviderConfig>(OAUTH_PROVIDER_LIST.map((p) => p))(
            'always emits code_challenge_method=S256 for provider $id',
            (provider) => {
                const url = buildOAuthRedirectUrl({
                    provider,
                    origin: TEST_APP_ORIGIN,
                    state: OAUTH_STATE_PRIMARY,
                    nonce: OAUTH_NONCE_PRIMARY,
                    pkce: PKCE_SAMPLE_PRIMARY,
                });

                expect(url).toContain('&code_challenge_method=S256');
            },
        );

        it.each<OAuthProviderConfig>(OAUTH_PROVIDER_LIST.map((p) => p))(
            'echoes the supplied state value verbatim into the URL for provider $id',
            (provider) => {
                const url = buildOAuthRedirectUrl({
                    provider,
                    origin: TEST_APP_ORIGIN,
                    state: OAUTH_STATE_PRIMARY,
                    nonce: OAUTH_NONCE_PRIMARY,
                    pkce: PKCE_SAMPLE_PRIMARY,
                });

                expect(url).toContain(`&state=${OAUTH_STATE_PRIMARY}`);
            },
        );

        it.each<OAuthProviderConfig>(OAUTH_PROVIDER_LIST.map((p) => p))(
            'echoes the supplied nonce value verbatim into the URL for provider $id',
            (provider) => {
                const url = buildOAuthRedirectUrl({
                    provider,
                    origin: TEST_APP_ORIGIN,
                    state: OAUTH_STATE_PRIMARY,
                    nonce: OAUTH_NONCE_PRIMARY,
                    pkce: PKCE_SAMPLE_PRIMARY,
                });

                expect(url).toContain(`&nonce=${OAUTH_NONCE_PRIMARY}`);
            },
        );

        it.each<OAuthProviderConfig>(OAUTH_PROVIDER_LIST.map((p) => p))(
            'echoes the supplied code_challenge value verbatim into the URL for provider $id',
            (provider) => {
                const url = buildOAuthRedirectUrl({
                    provider,
                    origin: TEST_APP_ORIGIN,
                    state: OAUTH_STATE_PRIMARY,
                    nonce: OAUTH_NONCE_PRIMARY,
                    pkce: PKCE_SAMPLE_PRIMARY,
                });

                expect(url).toContain(`&code_challenge=${PKCE_SAMPLE_PRIMARY.codeChallenge}`);
            },
        );

        it.each<OAuthProviderConfig>(OAUTH_PROVIDER_LIST.map((p) => p))(
            'emits the provider-specific clientId for provider $id',
            (provider) => {
                const url = buildOAuthRedirectUrl({
                    provider,
                    origin: TEST_APP_ORIGIN,
                    state: OAUTH_STATE_PRIMARY,
                    nonce: OAUTH_NONCE_PRIMARY,
                    pkce: PKCE_SAMPLE_PRIMARY,
                });

                expect(url).toContain(`client_id=${provider.clientId}`);
            },
        );
    });

    describe('Redirect URI encoding', () => {
        it.each<OAuthProviderConfig>(OAUTH_PROVIDER_LIST.map((p) => p))(
            'percent-encodes the redirect_uri value for provider $id',
            (provider) => {
                const url = buildOAuthRedirectUrl({
                    provider,
                    origin: TEST_APP_ORIGIN,
                    state: OAUTH_STATE_PRIMARY,
                    nonce: OAUTH_NONCE_PRIMARY,
                    pkce: PKCE_SAMPLE_PRIMARY,
                });

                const expectedUri = REDIRECT_URIS[provider.id];
                const encoded = encodeURIComponent(expectedUri);
                expect(url).toContain(`redirect_uri=${encoded}`);
                // Verify the unencoded form does not leak through.
                expect(url).not.toContain(`redirect_uri=${expectedUri}&`);
            },
        );

        it('honours an explicit redirectUri override when supplied', () => {
            const customUri = 'http://127.0.0.1:5173/custom/callback/path';
            const url = buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
                redirectUri: customUri,
            });

            expect(url).toContain(`redirect_uri=${encodeURIComponent(customUri)}`);
        });

        it('accepts the DEFAULT_REDIRECT_URI constant as a valid override', () => {
            const url = buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
                redirectUri: DEFAULT_REDIRECT_URI,
            });

            expect(url).toContain(`redirect_uri=${encodeURIComponent(DEFAULT_REDIRECT_URI)}`);
        });
    });

    describe('Determinism and purity', () => {
        it('returns the same URL when called twice with identical arguments (determinism)', () => {
            const opts = {
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
            } as const;

            expect(buildOAuthRedirectUrl(opts)).toBe(buildOAuthRedirectUrl(opts));
        });

        it('does not mutate the passed-in PkceSample object', () => {
            const samplePkce: PkceSample = {
                ...PKCE_SAMPLE_PRIMARY,
            };
            const snapshot = JSON.stringify(samplePkce);

            buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: samplePkce,
            });

            expect(JSON.stringify(samplePkce)).toBe(snapshot);
        });

        it('does not mutate the passed-in OAuthProviderConfig object', () => {
            const cloned: OAuthProviderConfig = {
                ...MICROSOFT_PROVIDER,
                scopes: [...MICROSOFT_PROVIDER.scopes],
            };
            const snapshot = JSON.stringify(cloned);

            buildOAuthRedirectUrl({
                provider: cloned,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
            });

            expect(JSON.stringify(cloned)).toBe(snapshot);
        });

        it('changes the URL output when only the state value changes', () => {
            const a = buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
            });
            const b = buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_SECONDARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
            });

            expect(a).not.toBe(b);
        });

        it('changes the URL output when only the nonce value changes', () => {
            const a = buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
            });
            const b = buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_SECONDARY,
                pkce: PKCE_SAMPLE_PRIMARY,
            });

            expect(a).not.toBe(b);
        });

        it('changes the URL output when only the PKCE pair changes', () => {
            const a = buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_PRIMARY,
            });
            const b = buildOAuthRedirectUrl({
                provider: MICROSOFT_PROVIDER,
                origin: TEST_APP_ORIGIN,
                state: OAUTH_STATE_PRIMARY,
                nonce: OAUTH_NONCE_PRIMARY,
                pkce: PKCE_SAMPLE_SECONDARY,
            });

            expect(a).not.toBe(b);
        });
    });

    describe('PKCE challenge derivation re-verification (independent computation)', () => {
        it.each<PkceSample>(PKCE_SAMPLES.map((s) => s))(
            'fixture codeChallenge equals SHA-256(codeVerifier) base64url for sample with verifier $codeVerifier',
            (sample) => {
                // Re-derive the challenge from the verifier; assert equality
                // with the fixture's pre-computed value. If this assertion
                // fails, the fixture is broken (not the SUT).
                const recomputed = computeS256Challenge(sample.codeVerifier);
                expect(recomputed).toBe(sample.codeChallenge);
            },
        );

        it('fixture codeChallenge values are exactly 43 chars (base64url, unpadded)', () => {
            for (const sample of PKCE_SAMPLES) {
                expect(sample.codeChallenge.length).toBe(43);
            }
        });

        it('fixture codeVerifier values fall within the RFC 7636 length window [43, 128]', () => {
            for (const sample of PKCE_SAMPLES) {
                expect(sample.codeVerifier.length).toBeGreaterThanOrEqual(43);
                expect(sample.codeVerifier.length).toBeLessThanOrEqual(128);
            }
        });
    });
});

// =============================================================================
// SUITE — generateOAuthState
// =============================================================================

describe('src/utils/oauth — generateOAuthState', () => {
    it('returns a non-empty string', () => {
        const value = generateOAuthState();
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
    });

    it('returns a value with length within [OAUTH_STATE_NONCE_MIN_LENGTH, OAUTH_STATE_NONCE_MAX_LENGTH]', () => {
        const value = generateOAuthState();
        expect(value.length).toBeGreaterThanOrEqual(OAUTH_STATE_NONCE_MIN_LENGTH);
        expect(value.length).toBeLessThanOrEqual(OAUTH_STATE_NONCE_MAX_LENGTH);
    });

    it('returns a value drawn entirely from the base64url alphabet', () => {
        const value = generateOAuthState();
        expect(isBase64UrlConformant(value)).toBe(true);
    });

    it('returns 1000 unique values across 1000 invocations (no collisions)', () => {
        const generated = new Set<string>();
        for (let i = 0; i < 1000; i += 1) {
            generated.add(generateOAuthState());
        }
        expect(generated.size).toBe(1000);
    });

    it('returns base64url-conformant strings across 100 invocations (sustained property)', () => {
        for (let i = 0; i < 100; i += 1) {
            const value = generateOAuthState();
            expect(isBase64UrlConformant(value)).toBe(true);
            expect(value.length).toBeGreaterThanOrEqual(OAUTH_STATE_NONCE_MIN_LENGTH);
            expect(value.length).toBeLessThanOrEqual(OAUTH_STATE_NONCE_MAX_LENGTH);
        }
    });

    it('never returns the OAUTH_STATE_TAMPERED fixture (sanity bound on entropy)', () => {
        // 100 draws against a 22-char minimum from a 64-symbol alphabet
        // collide with a specific 33-char string at probability of order
        // 10^-50 per draw; observing zero collisions is overwhelmingly
        // likely and serves as a smoke test for the generator's range.
        const TAMPERED = 'tAmperedSt4te-do_n0t_accEpt-XX003';
        for (let i = 0; i < 100; i += 1) {
            expect(generateOAuthState()).not.toBe(TAMPERED);
        }
    });

    it('does not return the fixture sample OAUTH_STATE_PRIMARY (entropy boundary)', () => {
        for (let i = 0; i < 100; i += 1) {
            expect(generateOAuthState()).not.toBe(OAUTH_STATE_PRIMARY);
        }
    });
});

// =============================================================================
// SUITE — generateOAuthNonce
// =============================================================================

describe('src/utils/oauth — generateOAuthNonce', () => {
    it('returns a non-empty string', () => {
        const value = generateOAuthNonce();
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
    });

    it('returns a value with length within [OAUTH_STATE_NONCE_MIN_LENGTH, OAUTH_STATE_NONCE_MAX_LENGTH]', () => {
        const value = generateOAuthNonce();
        expect(value.length).toBeGreaterThanOrEqual(OAUTH_STATE_NONCE_MIN_LENGTH);
        expect(value.length).toBeLessThanOrEqual(OAUTH_STATE_NONCE_MAX_LENGTH);
    });

    it('returns a value drawn entirely from the base64url alphabet', () => {
        const value = generateOAuthNonce();
        expect(isBase64UrlConformant(value)).toBe(true);
    });

    it('returns 1000 unique values across 1000 invocations (no collisions)', () => {
        const generated = new Set<string>();
        for (let i = 0; i < 1000; i += 1) {
            generated.add(generateOAuthNonce());
        }
        expect(generated.size).toBe(1000);
    });

    it('returns base64url-conformant strings across 100 invocations (sustained property)', () => {
        for (let i = 0; i < 100; i += 1) {
            const value = generateOAuthNonce();
            expect(isBase64UrlConformant(value)).toBe(true);
            expect(value.length).toBeGreaterThanOrEqual(OAUTH_STATE_NONCE_MIN_LENGTH);
            expect(value.length).toBeLessThanOrEqual(OAUTH_STATE_NONCE_MAX_LENGTH);
        }
    });

    it('does not return the fixture sample OAUTH_NONCE_PRIMARY (entropy boundary)', () => {
        for (let i = 0; i < 100; i += 1) {
            expect(generateOAuthNonce()).not.toBe(OAUTH_NONCE_PRIMARY);
        }
    });

    it('does not produce values that match generated state values (independence)', () => {
        // The independence property is critical: state mitigates CSRF and
        // nonce mitigates replay; reusing the same value undermines both.
        const states = new Set<string>();
        const nonces = new Set<string>();
        for (let i = 0; i < 100; i += 1) {
            states.add(generateOAuthState());
            nonces.add(generateOAuthNonce());
        }
        // Compute the intersection.
        let collisions = 0;
        for (const s of states) {
            if (nonces.has(s)) {
                collisions += 1;
            }
        }
        expect(collisions).toBe(0);
    });
});
