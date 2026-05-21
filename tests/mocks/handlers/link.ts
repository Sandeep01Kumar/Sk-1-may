/**
 * MSW request handlers for the account-link surface.
 *
 * Intercepts `POST /auth/link-accounts` — the endpoint the Link Accounts
 * Modal (Microsoft + Generic variants) calls when the user confirms
 * linking an OAuth identity to their existing local Blitzy account.
 *
 * --------------------------------------------------------------------------
 * Response variants (per AAP § 0.4.4)
 * --------------------------------------------------------------------------
 *
 *   - `success`            — 200 with `LINK_ACCOUNTS_*_SUCCESS` (provider-aware)
 *   - `conflict`           — 409 with `LINK_ACCOUNTS_CONFLICT`
 *   - `invalidPassword`    — 401 with `LINK_ACCOUNTS_INVALID_PASSWORD`
 *   - `validationError`    — 400 with `LINK_ACCOUNTS_VALIDATION_ERROR`
 *
 * The default (registered at module init) is `success` — the canonical
 * happy-path response chosen so that integration specs that never call
 * `activateLinkAccountsHandler()` still observe a sensible success path
 * end-to-end.
 *
 * --------------------------------------------------------------------------
 * `activateLinkAccountsHandler(...)` (per QA Issue 11)
 * --------------------------------------------------------------------------
 *
 * Tests that want to drive the modal through a non-success variant call
 * `activateLinkAccountsHandler(server, outcome)` to swap the response
 * handler mid-suite without re-registering the entire handler graph:
 *
 *   import { server } from '@tests/mocks/server';
 *   import { activateLinkAccountsHandler } from '@tests/mocks/handlers/link';
 *
 *   it('shows conflict banner when provider already linked', async () => {
 *     activateLinkAccountsHandler(server, 'conflict');
 *     // ... exercise the modal ...
 *   });
 *
 * Internally the helper composes `server.use(...)` with the variant-
 * specific handler so it overrides any prior registration for the same
 * URL space. The handler is reset back to the default `success` variant
 * by `server.resetHandlers()` between tests (wired up in
 * `tests/setup/component.ts`).
 *
 * Dual-URL contract (relative + absolute) mirrors `tests/mocks/handlers/auth.ts`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.3.1 — Dependencies requiring mocking.
 *   - AAP Section 0.4.2 — Link Accounts Modal test case blueprint.
 *   - AAP Section 0.4.4 — Mock Object Specifications.
 *   - AAP Section 0.5.1 — File row for `tests/mocks/handlers/link.ts`.
 *   - QA Issue 9 — File missing.
 *   - QA Issue 11 — `activateLinkAccountsHandler` not exported anywhere.
 */

import { http, HttpResponse, type HttpHandler } from 'msw';
import { setupServer } from 'msw/node';
import {
    LINK_ACCOUNTS_CONFLICT,
    LINK_ACCOUNTS_GENERIC_SUCCESS,
    LINK_ACCOUNTS_GOOGLE_SUCCESS,
    LINK_ACCOUNTS_INVALID_PASSWORD,
    LINK_ACCOUNTS_MICROSOFT_SUCCESS,
    LINK_ACCOUNTS_VALIDATION_ERROR,
    type LinkAccountsRequest,
} from '@tests/fixtures/link-accounts';
import { OAUTH_ENDPOINTS } from '@tests/setup/global';
import { TEST_APP_ORIGIN } from '@tests/fixtures/oauth';

// =============================================================================
// OUTCOME ENUM
// =============================================================================

/**
 * Discriminator for which canned response variant the link-accounts handler
 * should serve.
 *
 * Per QA Phase 6 the literal union must be `'success' | 'invalidPassword' |
 * 'conflict' | 'validationError'` — match-string for-string.
 *
 * Exported so test specs can declare the outcome with a typed parameter:
 *
 *   import type { LinkAccountsOutcome } from '@tests/mocks/handlers/link';
 *   const outcome: LinkAccountsOutcome = 'invalidPassword';
 */
export type LinkAccountsOutcome = 'success' | 'invalidPassword' | 'conflict' | 'validationError';

// =============================================================================
// PER-VARIANT HANDLER FACTORIES
// =============================================================================

/**
 * Build a SINGLE link-accounts handler for the given URL prefix and outcome.
 *
 * The resolver inspects the request body to choose between provider-specific
 * success payloads — `microsoft` returns `LINK_ACCOUNTS_MICROSOFT_SUCCESS`,
 * `google` returns `LINK_ACCOUNTS_GOOGLE_SUCCESS`, and any other provider
 * (or a missing provider field) returns `LINK_ACCOUNTS_GENERIC_SUCCESS`.
 *
 * For error variants the response is the same for every provider because the
 * error payload itself does not vary by provider (the `provider` field on
 * `LINK_ACCOUNTS_CONFLICT` is informational only; the SSO modal renders the
 * conflict message without per-provider customisation).
 *
 * @param prefix  URL prefix (`''` for relative, `TEST_APP_ORIGIN` for absolute).
 * @param outcome Which response variant to serve.
 * @returns A single MSW `HttpHandler`.
 */
function buildLinkAccountsHandler(prefix: string, outcome: LinkAccountsOutcome): HttpHandler {
    return http.post(`${prefix}${OAUTH_ENDPOINTS.linkAccounts}`, async ({ request }) => {
        // Pull the request body for provider-aware success variants. A
        // malformed body falls back to an empty object so the catch path
        // is well-typed.
        const body = (await request.json().catch(() => ({}))) as Partial<LinkAccountsRequest>;

        switch (outcome) {
            case 'success': {
                if (body.provider === 'microsoft') {
                    return HttpResponse.json(LINK_ACCOUNTS_MICROSOFT_SUCCESS, { status: 200 });
                }
                if (body.provider === 'google') {
                    return HttpResponse.json(LINK_ACCOUNTS_GOOGLE_SUCCESS, { status: 200 });
                }
                return HttpResponse.json(LINK_ACCOUNTS_GENERIC_SUCCESS, { status: 200 });
            }
            case 'conflict': {
                return HttpResponse.json(LINK_ACCOUNTS_CONFLICT, { status: 409 });
            }
            case 'invalidPassword': {
                return HttpResponse.json(LINK_ACCOUNTS_INVALID_PASSWORD, { status: 401 });
            }
            case 'validationError': {
                return HttpResponse.json(LINK_ACCOUNTS_VALIDATION_ERROR, { status: 400 });
            }
            default: {
                // Exhaustiveness check — TypeScript narrows `outcome` to
                // `never` at this point. If a new outcome is added to
                // `LinkAccountsOutcome` and not handled above, this throw
                // surfaces as a clear runtime failure with a usable
                // diagnostic message.
                const exhaustive: never = outcome;
                throw new Error(`Unhandled link-accounts outcome: ${String(exhaustive)}`);
            }
        }
    });
}

/**
 * Build BOTH relative and absolute handlers for a single outcome.
 *
 * Mirrors the dual-URL contract enforced for the auth handlers — every
 * outcome registers two handlers so requests under either Vitest
 * (same-origin relative path) or Playwright (absolute URL) are intercepted.
 *
 * @param outcome Which response variant to serve.
 * @returns A tuple of two handlers — relative then absolute.
 */
function buildDualUrlLinkAccountsHandlers(outcome: LinkAccountsOutcome): readonly HttpHandler[] {
    return [
        buildLinkAccountsHandler('', outcome),
        buildLinkAccountsHandler(TEST_APP_ORIGIN, outcome),
    ];
}

// =============================================================================
// DEFAULT HANDLERS (success variant)
// =============================================================================

/**
 * Default link-accounts handlers — registered with the MSW server at module
 * load time and serve the `success` outcome for happy-path tests.
 *
 * Per AAP § 0.4.4, the default is success so tests that never explicitly
 * override the variant still drive the modal through its happy-path UI
 * (showing the success state with the "Accounts linked successfully"
 * message). Tests that need a different variant call
 * `activateLinkAccountsHandler(server, 'invalidPassword' | 'conflict' | 'validationError')`.
 */
export const linkAccountsHandlers: readonly HttpHandler[] =
    buildDualUrlLinkAccountsHandlers('success');

// =============================================================================
// ACTIVATE HELPER (QA Issue 11 resolution)
// =============================================================================

/**
 * Type alias for the MSW server instance accepted by `activateLinkAccountsHandler`.
 *
 * `ReturnType<typeof setupServer>` is the canonical way to derive the
 * server's typed interface without re-importing the full `SetupServer`
 * symbol (which `msw/node` exports under a different name across minor
 * versions). The alias keeps the function signature stable across MSW
 * patch upgrades.
 */
export type LinkAccountsHandlerServer = ReturnType<typeof setupServer>;

/**
 * Switch the link-accounts handler to the given outcome variant.
 *
 * Equivalent to calling `server.use(...handlers)` with the handler set
 * for the requested outcome — the new handlers override the default
 * `success` registration for the lifetime of the current test (or until
 * `server.resetHandlers()` runs, which happens in `afterEach` per
 * `tests/setup/component.ts`).
 *
 * Per QA Phase 6 / Issue 11, this function is the SINGLE contract entry
 * point downstream tests use to drive non-success response variants. It
 * lives in this file (not in `tests/fixtures/link-accounts.ts`) because
 * activation requires runtime side effects (`server.use(...)`) and
 * fixtures are mandated to be pure-static per the fixture folder spec.
 *
 * @param server  The MSW server instance (typically `import { server } from '@tests/mocks/server'`).
 * @param outcome Which response variant to activate.
 *
 * @example
 *   it('renders the password mismatch error when the wrong password is typed', async () => {
 *     activateLinkAccountsHandler(server, 'invalidPassword');
 *     // ... type wrong password, submit, assert error message ...
 *   });
 *
 *   it('renders the conflict banner when the identity is linked elsewhere', async () => {
 *     activateLinkAccountsHandler(server, 'conflict');
 *     // ... submit, assert conflict UI ...
 *   });
 *
 *   it('maps field-level validation errors back to inputs', async () => {
 *     activateLinkAccountsHandler(server, 'validationError');
 *     // ... submit, assert aria-invalid on inputs ...
 *   });
 *
 *   it('falls back to the explicit success activation', async () => {
 *     activateLinkAccountsHandler(server, 'success');
 *     // ... default-equivalent ...
 *   });
 */
export function activateLinkAccountsHandler(
    server: LinkAccountsHandlerServer,
    outcome: LinkAccountsOutcome,
): void {
    const handlers = buildDualUrlLinkAccountsHandlers(outcome);
    server.use(...handlers);
}
