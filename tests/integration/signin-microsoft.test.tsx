/**
 * Integration test — SignInA + Microsoft OAuth flow.
 *
 * Target files under test (CREATED by a subsequent implementation cycle
 * per AAP Section 0.10.5):
 *   - `src/components/sso/SignInA.tsx`
 *   - `src/components/ui/SocialProviderButton.tsx`
 *   - `src/utils/oauth.ts`
 *
 * --------------------------------------------------------------------------
 * Integration scope
 * --------------------------------------------------------------------------
 *
 * This test renders the full SignInA screen and exercises:
 *   - The credential sign-in path against the MSW `POST /auth/sign-in`
 *     handler.
 *   - The Microsoft OAuth path which:
 *     1. Synthesises a `window.open` invocation (intercepted by the
 *        window-stub helpers in `tests/mocks/window.ts`).
 *     2. Fires a `GET /auth/sso/microsoft/authorize` request to the
 *        backend (intercepted by the MSW handler in
 *        `tests/mocks/handlers/auth.ts`).
 *     3. On success, transitions to a logged-in state (mocked).
 *
 * MSW lifecycle is managed by `tests/setup/component.ts` — handlers are
 * reset between tests, so each test starts from the default sign-in
 * decision table.
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path: typing valid credentials + Sign in submits successfully.
 *   Edge cases: invalid credentials surface a server-error message;
 *     network failure handled gracefully; Microsoft pop-up blocked
 *     handled gracefully.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT modules do NOT exist yet; imports
 * below will fail.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.3.1 — Integration test target.
 *   - AAP Section 0.4.2 — SignInA blueprint (Microsoft OAuth path).
 *   - AAP Section 0.5.1 — File row for `tests/integration/signin-microsoft.test.tsx`.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@tests/utils/render';
import { STANDARD_USER, INVALID_USER } from '@tests/fixtures/users';
import { VALID_PASSWORD_STANDARD } from '@tests/fixtures/passwords';
import {
    simulateMicrosoftPopupAllowed,
    simulateMicrosoftPopupBlocked,
    expectOAuthAuthorizeCalled,
} from '@tests/utils/oauth-stub';
import { server } from '@tests/mocks/server';
import { signInServerError, signInNetworkError } from '@tests/mocks/handlers/auth';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { SignInA } from '@/components/sso/SignInA';

// =============================================================================
// SUITE — Credential sign-in happy path
// =============================================================================

describe('Integration — SignInA credential sign-in happy path', () => {
    it('submits credentials to the sign-in endpoint and succeeds with the standard user', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await user.type(screen.getByLabelText(/email/i), STANDARD_USER.email);
        await user.type(screen.getByLabelText(/password/i), STANDARD_USER.password);
        await user.click(screen.getByRole('button', { name: /^sign in$/i }));
        // The implementation must signal success somehow — either by
        // routing away from /sso/sign-in, by rendering a success
        // message, or by toggling a loading-then-success indicator.
        // We accept any of these signals via a forgiving assertion.
        await waitFor(() => {
            const success = document.querySelector('[data-signin-status="success"]');
            const heading = screen.queryByRole('heading', { name: /signing you in|welcome/i });
            expect(success !== null || heading !== null).toBe(true);
        });
    });
});

// =============================================================================
// SUITE — Credential sign-in error cases
// =============================================================================

describe('Integration — SignInA credential sign-in error cases', () => {
    it('shows an error when the server returns 401 for invalid credentials', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await user.type(screen.getByLabelText(/email/i), INVALID_USER.email);
        await user.type(screen.getByLabelText(/password/i), INVALID_USER.password);
        await user.click(screen.getByRole('button', { name: /^sign in$/i }));
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
        });
    });

    it('shows an error when the server returns 500 on the sign-in endpoint', async () => {
        server.use(...signInServerError());
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await user.type(screen.getByLabelText(/email/i), STANDARD_USER.email);
        await user.type(screen.getByLabelText(/password/i), STANDARD_USER.password);
        await user.click(screen.getByRole('button', { name: /^sign in$/i }));
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
        });
    });

    it('shows an error when the network request fails entirely', async () => {
        server.use(...signInNetworkError());
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await user.type(screen.getByLabelText(/email/i), STANDARD_USER.email);
        await user.type(screen.getByLabelText(/password/i), VALID_PASSWORD_STANDARD.value);
        await user.click(screen.getByRole('button', { name: /^sign in$/i }));
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
        });
    });
});

// =============================================================================
// SUITE — Microsoft OAuth flow
// =============================================================================

describe('Integration — SignInA Microsoft OAuth flow', () => {
    it('opens a pop-up window and hits the Microsoft authorize endpoint on social-button click', async () => {
        simulateMicrosoftPopupAllowed();
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await user.click(screen.getByRole('button', { name: /microsoft/i }));
        await waitFor(() => {
            expectOAuthAuthorizeCalled('microsoft');
        });
    });

    it('surfaces an error when the Microsoft pop-up is blocked', async () => {
        simulateMicrosoftPopupBlocked();
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await user.click(screen.getByRole('button', { name: /microsoft/i }));
        await waitFor(() => {
            // Either an alert or an error toast must appear with copy
            // referencing the blocked pop-up.
            const alert = screen.queryByRole('alert');
            expect(alert).not.toBeNull();
            if (alert !== null) {
                expect(alert.textContent ?? '').toMatch(/popup|pop-up|allow.*popup/i);
            }
        });
    });
});

// =============================================================================
// SUITE — Loading state during submission
// =============================================================================

describe('Integration — SignInA loading state during submission', () => {
    it('disables the submit button while waiting for the response', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        const submit = screen.getByRole('button', { name: /^sign in$/i });
        await user.type(screen.getByLabelText(/email/i), STANDARD_USER.email);
        await user.type(screen.getByLabelText(/password/i), STANDARD_USER.password);
        await user.click(submit);
        // The button should transition to a busy / disabled state.
        // We check both possible signals.
        const isBusy =
            submit.getAttribute('aria-busy') === 'true' || submit.hasAttribute('disabled');
        // Accept either state immediately after click.
        expect(isBusy || submit.querySelector('[role="status"]') !== null).toBe(true);
    });
});
