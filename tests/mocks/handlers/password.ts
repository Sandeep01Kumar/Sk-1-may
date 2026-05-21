/**
 * MSW request handlers for the password-reset surface.
 *
 * Intercepts `POST /auth/forgot-password` — the endpoint invoked by the
 * "Forgot your password?" link on the Sign-in screens.
 *
 * --------------------------------------------------------------------------
 * Response variants (per AAP § 0.4.4)
 * --------------------------------------------------------------------------
 *
 *   - `success`        — 200 with a generic success envelope.
 *   - `rateLimited`    — 429 with a Retry-After hint.
 *   - `notFound`       — 404 (only used by adversarial tests; the production
 *                        contract is to return 200 for unknown emails to
 *                        prevent account enumeration, so the default
 *                        success variant is what real tests will exercise).
 *   - `serverError`    — 500 with a generic error envelope.
 *
 * The default is `success`. Tests that need a different variant call
 * `activateForgotPasswordHandler(server, outcome)`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.3.1 — Dependencies requiring mocking.
 *   - AAP Section 0.4.4 — Mock Object Specifications.
 *   - AAP Section 0.5.1 — File row for `tests/mocks/handlers/password.ts`.
 *   - QA Issue 10 — File missing.
 */

import { http, HttpResponse, type HttpHandler } from 'msw';
import { setupServer } from 'msw/node';
import { OAUTH_ENDPOINTS } from '@tests/setup/global';
import { TEST_APP_ORIGIN } from '@tests/fixtures/oauth';

// =============================================================================
// REQUEST AND RESPONSE TYPES
// =============================================================================

/**
 * Shape of the request body POSTed to `/auth/forgot-password`.
 *
 * The SSO surface sends only the email address — the server initiates the
 * out-of-band reset email and returns a generic success response without
 * disclosing whether the email is on file (anti-enumeration contract).
 */
export interface ForgotPasswordRequest {
    /** Email address of the user requesting the reset. */
    email: string;
}

/**
 * Successful forgot-password response envelope.
 *
 * Deliberately generic so the same envelope can be returned for both
 * existing and unknown email addresses without leaking account state.
 */
export interface ForgotPasswordSuccessResponse {
    success: true;
    message: string;
}

/**
 * Rate-limited forgot-password response envelope.
 *
 * The `retryAfterSeconds` field mirrors the `Retry-After` header so
 * UI surfaces can compute a countdown without re-parsing the header.
 */
export interface ForgotPasswordRateLimitedResponse {
    success: false;
    code: 'rate_limited';
    message: string;
    retryAfterSeconds: number;
}

/**
 * Not-found forgot-password response envelope (adversarial-test-only).
 *
 * Production servers do NOT return this — the anti-enumeration contract
 * mandates the same 200 success envelope for unknown emails. This variant
 * exists solely so adversarial tests can verify the UI gracefully tolerates
 * a server that DOES leak account state (e.g., regression test for a future
 * server-side bug).
 */
export interface ForgotPasswordNotFoundResponse {
    success: false;
    code: 'not_found';
    message: string;
}

/**
 * Server-error forgot-password response envelope.
 */
export interface ForgotPasswordServerErrorResponse {
    success: false;
    code: 'server_error';
    message: string;
}

/**
 * Discriminated union of every variant the password handler can return.
 */
export type ForgotPasswordResponse =
    | ForgotPasswordSuccessResponse
    | ForgotPasswordRateLimitedResponse
    | ForgotPasswordNotFoundResponse
    | ForgotPasswordServerErrorResponse;

// =============================================================================
// CANONICAL RESPONSE PAYLOADS
// =============================================================================

/**
 * Default success payload — returned for any well-formed POST.
 *
 * The message text is the recommended copy from the SSO design system
 * spec (acknowledgement without confirming account existence).
 */
export const FORGOT_PASSWORD_SUCCESS: ForgotPasswordSuccessResponse = {
    success: true,
    message: 'If an account exists for that email, a password reset link has been sent.',
};

/**
 * Rate-limited payload — returned when the same email submits too many
 * resets in a short window.
 *
 * The 60-second hint mirrors the production sliding-window limiter.
 */
export const FORGOT_PASSWORD_RATE_LIMITED: ForgotPasswordRateLimitedResponse = {
    success: false,
    code: 'rate_limited',
    message: 'Too many password reset requests. Please try again in a minute.',
    retryAfterSeconds: 60,
};

/**
 * Not-found payload — adversarial-test-only.
 */
export const FORGOT_PASSWORD_NOT_FOUND: ForgotPasswordNotFoundResponse = {
    success: false,
    code: 'not_found',
    message: 'No account found for that email address.',
};

/**
 * Server-error payload — generic 500.
 */
export const FORGOT_PASSWORD_SERVER_ERROR: ForgotPasswordServerErrorResponse = {
    success: false,
    code: 'server_error',
    message: 'Something went wrong on our end. Please try again later.',
};

// =============================================================================
// OUTCOME ENUM
// =============================================================================

/**
 * Discriminator for which canned response variant the password handler
 * should serve.
 */
export type ForgotPasswordOutcome = 'success' | 'rateLimited' | 'notFound' | 'serverError';

// =============================================================================
// PER-VARIANT HANDLER FACTORIES
// =============================================================================

/**
 * Build a SINGLE forgot-password handler for the given URL prefix and outcome.
 *
 * The resolver dispatches on `outcome` to the matching canonical payload
 * and HTTP status code:
 *
 *   - `success`     → 200 + `FORGOT_PASSWORD_SUCCESS`
 *   - `rateLimited` → 429 + `FORGOT_PASSWORD_RATE_LIMITED` + `Retry-After` header
 *   - `notFound`    → 404 + `FORGOT_PASSWORD_NOT_FOUND`
 *   - `serverError` → 500 + `FORGOT_PASSWORD_SERVER_ERROR`
 *
 * The resolver also performs a minimal request-body sanity check — if the
 * body omits the `email` field entirely (which the UI should never permit),
 * the handler returns a 400 with a validation envelope. This guards against
 * regression where the UI submits the form before email is populated.
 *
 * @param prefix  URL prefix (`''` for relative, `TEST_APP_ORIGIN` for absolute).
 * @param outcome Which response variant to serve.
 * @returns A single MSW `HttpHandler`.
 */
function buildForgotPasswordHandler(prefix: string, outcome: ForgotPasswordOutcome): HttpHandler {
    return http.post(`${prefix}${OAUTH_ENDPOINTS.forgotPassword}`, async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as Partial<ForgotPasswordRequest>;

        // Reject submissions that omit the email entirely — the UI must
        // always include this field. This is a structural pre-check; it
        // runs BEFORE the outcome dispatch so a mis-wired form surfaces
        // immediately as a 400, not as a false success.
        if (typeof body.email !== 'string' || body.email.length === 0) {
            return HttpResponse.json(
                {
                    success: false,
                    code: 'validation_error',
                    message: 'Email is required.',
                    fieldErrors: { email: 'Email is required.' },
                },
                { status: 400 },
            );
        }

        switch (outcome) {
            case 'success': {
                return HttpResponse.json(FORGOT_PASSWORD_SUCCESS, { status: 200 });
            }
            case 'rateLimited': {
                return HttpResponse.json(FORGOT_PASSWORD_RATE_LIMITED, {
                    status: 429,
                    headers: {
                        'Retry-After': String(FORGOT_PASSWORD_RATE_LIMITED.retryAfterSeconds),
                    },
                });
            }
            case 'notFound': {
                return HttpResponse.json(FORGOT_PASSWORD_NOT_FOUND, { status: 404 });
            }
            case 'serverError': {
                return HttpResponse.json(FORGOT_PASSWORD_SERVER_ERROR, { status: 500 });
            }
            default: {
                const exhaustive: never = outcome;
                throw new Error(`Unhandled forgot-password outcome: ${String(exhaustive)}`);
            }
        }
    });
}

/**
 * Build BOTH relative and absolute handlers for a single outcome.
 */
function buildDualUrlForgotPasswordHandlers(
    outcome: ForgotPasswordOutcome,
): readonly HttpHandler[] {
    return [
        buildForgotPasswordHandler('', outcome),
        buildForgotPasswordHandler(TEST_APP_ORIGIN, outcome),
    ];
}

// =============================================================================
// DEFAULT HANDLERS (success variant)
// =============================================================================

/**
 * Default forgot-password handlers — registered with the MSW server at
 * module load time and serve the `success` outcome for happy-path tests.
 */
export const passwordHandlers: readonly HttpHandler[] =
    buildDualUrlForgotPasswordHandlers('success');

// =============================================================================
// ACTIVATE HELPER
// =============================================================================

/**
 * Type alias for the MSW server instance accepted by `activateForgotPasswordHandler`.
 *
 * See `tests/mocks/handlers/link.ts` for the rationale (avoids re-exporting
 * the `SetupServer` symbol whose name varies across MSW patch releases).
 */
export type ForgotPasswordHandlerServer = ReturnType<typeof setupServer>;

/**
 * Switch the forgot-password handler to the given outcome variant.
 *
 * Equivalent to calling `server.use(...handlers)` with the handler set
 * for the requested outcome — the new handlers override the default
 * `success` registration for the lifetime of the current test (or until
 * `server.resetHandlers()` runs, which happens in `afterEach` per
 * `tests/setup/component.ts`).
 *
 * @param server  The MSW server instance.
 * @param outcome Which response variant to activate.
 *
 * @example
 *   it('shows the throttle message when the user re-submits too quickly', async () => {
 *     activateForgotPasswordHandler(server, 'rateLimited');
 *     // ... submit forgot-password, assert throttle UI ...
 *   });
 */
export function activateForgotPasswordHandler(
    server: ForgotPasswordHandlerServer,
    outcome: ForgotPasswordOutcome,
): void {
    const handlers = buildDualUrlForgotPasswordHandlers(outcome);
    server.use(...handlers);
}
