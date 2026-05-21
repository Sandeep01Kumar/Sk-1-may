/**
 * MSW request handlers for the SSO authentication surface.
 *
 * Intercepts every HTTP endpoint the SSO components fire against the
 * mock backend during component, integration, accessibility, and (when
 * Vite is launched with `MOCK_API=true`) Playwright dev-server runs.
 *
 * --------------------------------------------------------------------------
 * Endpoints covered
 * --------------------------------------------------------------------------
 *
 * Password-based sign-in (the Sign-in A/B/C primary form submission):
 *   - `POST /auth/sign-in`              — canonical endpoint per AAP routes
 *   - `POST /auth/login`                — legacy alias (some specs may use)
 *
 * Microsoft OAuth (Sign-in A primary, Sign-in B + C secondary):
 *   - `GET  /auth/sso/microsoft/authorize` — initiates redirect-flow
 *   - `POST /auth/sso/microsoft/callback`  — completes redirect-flow
 *
 * Google OAuth (Sign-in B + C secondary):
 *   - `GET  /auth/sso/google/authorize`
 *   - `POST /auth/sso/google/callback`
 *
 * Provider listing (Sign-in C "See more" expansion):
 *   - `GET  /auth/providers`
 *   - `GET  /auth/sso/providers` — alternate path naming some specs use
 *
 * --------------------------------------------------------------------------
 * Dual-URL registration pattern
 * --------------------------------------------------------------------------
 *
 * Per QA Phase 6 / Issue 8 directive, every handler is registered TWICE:
 *
 *   1. Once with the RELATIVE path (`'/auth/sign-in'`). MSW v2 matches
 *      requests whose URL is the SAME-ORIGIN expansion of the relative
 *      path; this works seamlessly under Vitest where `fetch('/auth/...')`
 *      resolves to `http://localhost/auth/...` per happy-dom defaults.
 *
 *   2. Once with the ABSOLUTE path against the canonical dev-server host
 *      (`'http://127.0.0.1:5173/auth/sign-in'`). MSW v2 matches these only
 *      when the request URL contains the absolute origin — which is the
 *      case under Playwright (where the browser is pointed at
 *      `http://127.0.0.1:5173` per `playwright.config.ts.baseURL`) and
 *      when a unit test explicitly composes the absolute URL.
 *
 * The two registrations are independent handler objects; MSW evaluates them
 * in declaration order and the first match wins. Because the URL space
 * never overlaps (a relative path is structurally distinct from an
 * absolute URL at the handler-matcher level), this pattern is non-ambiguous.
 *
 * --------------------------------------------------------------------------
 * Strict-mode contract
 * --------------------------------------------------------------------------
 *
 * Every handler returns a STRICT response status appropriate for the
 * incoming payload. `tests/setup/component.ts` invokes
 * `server.listen({ onUnhandledRequest: 'error' })` so any unhandled
 * request fails the test with a clear "no handler for request" error
 * rather than silently leaking to the real network.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.3.1 — Dependencies requiring mocking (OAuth providers).
 *   - AAP Section 0.4.4 — Mock Object Specifications (handlers table).
 *   - AAP Section 0.5.1 — File row for `tests/mocks/handlers/auth.ts`.
 *   - AAP Section 0.10.4 — No real backend OAuth implementation.
 *   - QA Issue 8 — File missing; dual URL registration mandatory.
 */

import { http, HttpResponse, type HttpHandler } from 'msw';
import {
    AUTH_ERROR_ACCOUNT_LOCKED,
    AUTH_ERROR_INVALID_CREDENTIALS,
    AUTH_ERROR_RATE_LIMITED,
    AUTH_ERROR_REQUIRES_SSO,
    AUTH_ERROR_SERVER,
    FEDERATED_AUTH_SUCCESS,
    NEW_USER_AUTH_SUCCESS,
    STANDARD_AUTH_SUCCESS,
    type AuthErrorResponse,
    type AuthSuccessResponse,
} from '@tests/fixtures/sessions';
import {
    GOOGLE_PROVIDER,
    MICROSOFT_PROVIDER,
    OAUTH_PROVIDERS,
    OAUTH_PROVIDER_LIST,
    OAUTH_STATE_PRIMARY,
    OAUTH_STATE_TAMPERED,
    REDIRECT_URIS,
    TEST_APP_ORIGIN,
    type OAuthProviderConfig,
} from '@tests/fixtures/oauth';
import {
    PASSWORD_FOR_ACCOUNT_LOCKED,
    PASSWORD_FOR_RATE_LIMITED,
    PASSWORD_FOR_REQUIRES_SSO,
} from '@tests/fixtures/passwords';
import { OAUTH_ENDPOINTS } from '@tests/setup/global';

// =============================================================================
// SHAPE TYPES (request bodies the SSO components send)
// =============================================================================

/**
 * JSON request body the Sign-in form posts to `/auth/sign-in` and
 * `/auth/login`. Field names mirror what the SSO components fill from
 * the email / password inputs.
 */
interface SignInRequestBody {
    readonly email?: string;
    readonly password?: string;
    readonly rememberMe?: boolean;
}

/**
 * JSON request body the OAuth callback flow posts to
 * `/auth/sso/{provider}/callback` after the IdP redirects with `code` and
 * `state` query parameters.
 */
interface OAuthCallbackRequestBody {
    readonly code?: string;
    readonly state?: string;
    readonly codeVerifier?: string;
}

// =============================================================================
// AUTHENTICATION DECISION LOGIC
// =============================================================================

/**
 * Decide which canned response a `POST /auth/sign-in` request should receive
 * based on the email + password combination.
 *
 * The decision tree mirrors the fixture coordination documented in
 * `tests/fixtures/users.ts`, `tests/fixtures/passwords.ts`, and
 * `tests/fixtures/sessions.ts`. The handler is intentionally STATIC — no
 * "real" credential storage. Tests that want to assert a specific path use
 * one of the canonical fixtures.
 *
 * Algorithm (first match wins):
 *
 *   1. Empty email OR password           -> 400 validation error.
 *   2. Known "rate-limited" password     -> 429 rate-limit error.
 *   3. Known "account-locked" password   -> 423 locked error.
 *   4. Email is the federated user       ->
 *        - Password matches federated    -> 200 federated session success.
 *        - Password is the requires-SSO  -> 403 requires-SSO error.
 *        - Otherwise                     -> 401 invalid credentials.
 *   5. Email is the standard user        ->
 *        - Password matches standard     -> 200 standard session success.
 *        - Otherwise                     -> 401 invalid credentials.
 *   6. Email is the new user             ->
 *        - Password matches new user     -> 200 new user session success.
 *        - Otherwise                     -> 401 invalid credentials.
 *   7. Email is unknown                  -> 401 invalid credentials.
 *
 * @returns Tuple of `[httpStatus, jsonBody]`.
 */
function decideSignInResponse(
    body: SignInRequestBody,
): readonly [number, AuthSuccessResponse | AuthErrorResponse] {
    const email = body.email?.trim() ?? '';
    const password = body.password ?? '';

    if (email === '' || password === '') {
        return [400, AUTH_ERROR_INVALID_CREDENTIALS];
    }

    if (password === PASSWORD_FOR_RATE_LIMITED.value) {
        return [429, AUTH_ERROR_RATE_LIMITED];
    }

    if (password === PASSWORD_FOR_ACCOUNT_LOCKED.value) {
        return [423, AUTH_ERROR_ACCOUNT_LOCKED];
    }

    if (email === 'federated.user@blitzy.test') {
        if (password === 'FederatedP@ssw0rd!') {
            return [200, FEDERATED_AUTH_SUCCESS];
        }
        if (password === PASSWORD_FOR_REQUIRES_SSO.value) {
            return [403, AUTH_ERROR_REQUIRES_SSO];
        }
        return [401, AUTH_ERROR_INVALID_CREDENTIALS];
    }

    if (email === 'standard.user@blitzy.test') {
        if (password === 'StandardP@ssw0rd!') {
            return [200, STANDARD_AUTH_SUCCESS];
        }
        return [401, AUTH_ERROR_INVALID_CREDENTIALS];
    }

    if (email === 'new.user@blitzy.test') {
        if (password === 'NewUserP@ssw0rd!') {
            return [200, NEW_USER_AUTH_SUCCESS];
        }
        return [401, AUTH_ERROR_INVALID_CREDENTIALS];
    }

    return [401, AUTH_ERROR_INVALID_CREDENTIALS];
}

/**
 * Compose the deterministic absolute redirect URL an OAuth `authorize`
 * endpoint returns. The SSO components consume this URL via
 * `window.open(...)` and expect the IdP to redirect back to the matching
 * callback path with `code` and `state` query parameters.
 *
 * Because no real IdP is contacted, the mock authorize endpoint returns a
 * synthetic URL that points BACK to our own dev-server callback path with
 * a hard-coded code and state. The SSO components then POST that data to
 * `/auth/sso/{provider}/callback` and the success path is exercised
 * end-to-end without ever leaving the test process.
 *
 * @param provider OAuth provider configuration (Microsoft / Google / ...).
 * @returns Absolute redirect URL.
 */
function buildMockAuthorizeRedirect(provider: OAuthProviderConfig): string {
    const callbackUrl = REDIRECT_URIS[provider.id];
    const search = new URLSearchParams({
        code: `mock-${provider.id}-authcode-001`,
        state: OAUTH_STATE_PRIMARY,
    }).toString();
    return `${callbackUrl}?${search}`;
}

/**
 * Decide the response for an OAuth `callback` POST.
 *
 * Decision tree (first match wins):
 *
 *   1. Tampered state    -> 400 invalid_state error.
 *   2. Empty code        -> 400 invalid_request error.
 *   3. Valid combination -> 200 authentication success (federated user).
 */
function decideOAuthCallbackResponse(
    body: OAuthCallbackRequestBody,
    provider: 'microsoft' | 'google',
): readonly [number, AuthSuccessResponse | AuthErrorResponse | { readonly error: string; readonly error_description: string }] {
    const state = body.state ?? '';
    const code = body.code ?? '';

    if (state === OAUTH_STATE_TAMPERED) {
        return [
            400,
            {
                error: 'invalid_state',
                error_description: `The state value does not match for provider ${provider}.`,
            },
        ];
    }

    if (code === '' || state === '') {
        return [
            400,
            {
                error: 'invalid_request',
                error_description: `Missing required parameter for provider ${provider}.`,
            },
        ];
    }

    return [200, FEDERATED_AUTH_SUCCESS];
}

// =============================================================================
// HANDLER FACTORIES (the heart of the dual-URL pattern)
// =============================================================================

/**
 * Build the set of HTTP handlers for a SINGLE URL — the same handler graph
 * is then registered twice: once with the relative URL and once with the
 * absolute URL against `TEST_APP_ORIGIN`.
 *
 * Centralising the resolver bodies in a single function avoids duplication
 * between the two URL variants while keeping the dual-registration intent
 * unambiguous at the call site.
 *
 * @param prefix URL prefix to prepend to every path. `''` for relative,
 *               `TEST_APP_ORIGIN` for absolute.
 */
function buildAuthHandlers(prefix: string): readonly HttpHandler[] {
    return [
        // ---------------------------------------------------------------
        // Password-based sign-in (canonical + legacy aliases)
        // ---------------------------------------------------------------
        http.post(`${prefix}/auth/sign-in`, async ({ request }) => {
            const body = (await request.json().catch(() => ({}))) as SignInRequestBody;
            const [status, json] = decideSignInResponse(body);
            return HttpResponse.json(json, { status });
        }),
        http.post(`${prefix}/auth/login`, async ({ request }) => {
            const body = (await request.json().catch(() => ({}))) as SignInRequestBody;
            const [status, json] = decideSignInResponse(body);
            return HttpResponse.json(json, { status });
        }),

        // ---------------------------------------------------------------
        // OAuth provider listing (Sign-in C "See more" expansion)
        // ---------------------------------------------------------------
        http.get(`${prefix}/auth/providers`, () =>
            HttpResponse.json({ providers: OAUTH_PROVIDER_LIST }, { status: 200 }),
        ),
        http.get(`${prefix}/auth/sso/providers`, () =>
            HttpResponse.json({ providers: OAUTH_PROVIDER_LIST }, { status: 200 }),
        ),

        // ---------------------------------------------------------------
        // Microsoft OAuth (authorize + callback)
        // ---------------------------------------------------------------
        //
        // The authorize endpoint returns a 302 to a SYNTHETIC callback URL
        // (pointing at our own dev-server) — keeping the round-trip entirely
        // inside the test process. The body field `redirectUrl` is also
        // surfaced for tests that prefer to assert the redirect target by
        // reading the JSON payload rather than following the `Location`.
        http.get(`${prefix}${OAUTH_ENDPOINTS.microsoft.authorize}`, () => {
            const redirectUrl = buildMockAuthorizeRedirect(MICROSOFT_PROVIDER);
            return HttpResponse.json(
                { redirectUrl, provider: 'microsoft' },
                { status: 200, headers: { Location: redirectUrl } },
            );
        }),
        http.post(`${prefix}${OAUTH_ENDPOINTS.microsoft.callback}`, async ({ request }) => {
            const body = (await request
                .json()
                .catch(() => ({}))) as OAuthCallbackRequestBody;
            const [status, json] = decideOAuthCallbackResponse(body, 'microsoft');
            return HttpResponse.json(json, { status });
        }),

        // ---------------------------------------------------------------
        // Google OAuth (authorize + callback)
        // ---------------------------------------------------------------
        http.get(`${prefix}${OAUTH_ENDPOINTS.google.authorize}`, () => {
            const redirectUrl = buildMockAuthorizeRedirect(GOOGLE_PROVIDER);
            return HttpResponse.json(
                { redirectUrl, provider: 'google' },
                { status: 200, headers: { Location: redirectUrl } },
            );
        }),
        http.post(`${prefix}${OAUTH_ENDPOINTS.google.callback}`, async ({ request }) => {
            const body = (await request
                .json()
                .catch(() => ({}))) as OAuthCallbackRequestBody;
            const [status, json] = decideOAuthCallbackResponse(body, 'google');
            return HttpResponse.json(json, { status });
        }),

        // ---------------------------------------------------------------
        // Generic provider authorize/callback (Sign-in C secondary
        // providers — apple, github, gitlab, okta)
        //
        // Each follows the same pattern as Microsoft/Google but uses the
        // provider's own authorize/callback path from OAUTH_PROVIDERS.
        // ---------------------------------------------------------------
        ...(['apple', 'github', 'gitlab', 'okta'] as const).flatMap((id) => {
            const provider = OAUTH_PROVIDERS[id];
            return [
                http.get(`${prefix}${provider.authorizePath}`, () => {
                    const redirectUrl = buildMockAuthorizeRedirect(provider);
                    return HttpResponse.json(
                        { redirectUrl, provider: provider.id },
                        { status: 200, headers: { Location: redirectUrl } },
                    );
                }),
                http.post(`${prefix}${provider.callbackPath}`, async ({ request }) => {
                    const body = (await request
                        .json()
                        .catch(() => ({}))) as OAuthCallbackRequestBody;
                    const state = body.state ?? '';
                    const code = body.code ?? '';
                    if (state === OAUTH_STATE_TAMPERED) {
                        return HttpResponse.json(
                            {
                                error: 'invalid_state',
                                error_description: `The state value does not match for provider ${provider.id}.`,
                            },
                            { status: 400 },
                        );
                    }
                    if (code === '' || state === '') {
                        return HttpResponse.json(
                            {
                                error: 'invalid_request',
                                error_description: `Missing required parameter for provider ${provider.id}.`,
                            },
                            { status: 400 },
                        );
                    }
                    return HttpResponse.json(FEDERATED_AUTH_SUCCESS, { status: 200 });
                }),
            ];
        }),
    ];
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Relative-URL handlers — match requests whose URL is a SAME-ORIGIN path
 * (e.g., `fetch('/auth/sign-in', ...)` under Vitest / happy-dom).
 *
 * Per QA Issue 8 dual-URL contract, this set is paired with
 * `ABSOLUTE_AUTH_HANDLERS` below; the index module concatenates both.
 */
export const RELATIVE_AUTH_HANDLERS: readonly HttpHandler[] = buildAuthHandlers('');

/**
 * Absolute-URL handlers — match requests with the absolute dev-server
 * origin (e.g., `fetch('http://127.0.0.1:5173/auth/sign-in', ...)` under
 * Playwright dev-server interception).
 *
 * Per QA Issue 8 dual-URL contract, this set is paired with
 * `RELATIVE_AUTH_HANDLERS` above; the index module concatenates both.
 */
export const ABSOLUTE_AUTH_HANDLERS: readonly HttpHandler[] = buildAuthHandlers(TEST_APP_ORIGIN);

/**
 * Convenience alias — `RELATIVE_AUTH_HANDLERS ++ ABSOLUTE_AUTH_HANDLERS`.
 *
 * The order matters: relative matches are tried first because they are the
 * most common request shape under Vitest. Absolute matches catch the
 * minority Playwright dev-server cases that escape the relative match.
 *
 * Consumed by `tests/mocks/handlers/index.ts` which aggregates this list
 * with the link-accounts and password handler lists into a single
 * top-level `handlers` array passed to `setupServer(...)` and
 * `setupWorker(...)`.
 */
export const authHandlers: readonly HttpHandler[] = [
    ...RELATIVE_AUTH_HANDLERS,
    ...ABSOLUTE_AUTH_HANDLERS,
];

/**
 * Error-injection handler factory — overrides the canonical sign-in
 * response with a server-error variant for chaos / failure-path tests.
 *
 * Tests use this via `server.use(...)` to swap the default behaviour
 * mid-test without redefining the entire handler graph:
 *
 *   import { server } from '@tests/mocks/server';
 *   import { signInServerError } from '@tests/mocks/handlers/auth';
 *   it('renders error banner on 500', async () => {
 *     server.use(signInServerError());
 *     // ... exercise the sign-in form ...
 *   });
 *
 * The override applies to BOTH relative and absolute URLs so it works
 * uniformly across Vitest and Playwright environments.
 */
export function signInServerError(): readonly HttpHandler[] {
    const factory = (prefix: string): HttpHandler =>
        http.post(`${prefix}/auth/sign-in`, () =>
            HttpResponse.json(AUTH_ERROR_SERVER, { status: 500 }),
        );
    return [factory(''), factory(TEST_APP_ORIGIN)];
}

/**
 * Network-failure handler factory — causes the sign-in endpoint to fail
 * with a network error (no response at all) rather than a JSON error.
 *
 * Used by edge-case specs that verify the SUT distinguishes between
 * "server returned an error response" and "network was unreachable" and
 * surfaces appropriate copy in each case.
 */
export function signInNetworkError(): readonly HttpHandler[] {
    const factory = (prefix: string): HttpHandler =>
        http.post(`${prefix}/auth/sign-in`, () => HttpResponse.error());
    return [factory(''), factory(TEST_APP_ORIGIN)];
}
