/**
 * Integration test — multi-provider sign-in flows (SignInB + SignInC).
 *
 * Target files under test (CREATED by a subsequent implementation cycle
 * per AAP Section 0.10.5):
 *   - `src/components/sso/SignInB.tsx`
 *   - `src/components/sso/SignInC.tsx`
 *   - `src/components/ui/SocialProviderButton.tsx`
 *   - `src/utils/oauth.ts`
 *
 * --------------------------------------------------------------------------
 * Integration scope
 * --------------------------------------------------------------------------
 *
 * This test exercises both the Google OAuth flow (added on SignInB) and
 * the Sign-in C expansion behaviour (revealing Apple, GitHub, GitLab,
 * Okta after clicking "See more").
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
 *   - AAP Section 0.4.2 — SignInB + SignInC blueprints.
 *   - AAP Section 0.5.1 — File row for
 *     `tests/integration/signin-multi-provider.test.tsx`.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@tests/utils/render';
import {
    simulateGooglePopupAllowed,
    simulateGooglePopupBlocked,
    simulateProviderPopupAllowed,
    expectOAuthAuthorizeCalled,
    expectOAuthAuthorizeNotCalled,
} from '@tests/utils/oauth-stub';
import { OAUTH_PROVIDER_IDS } from '@tests/fixtures/oauth';

// =============================================================================
// SUT IMPORTS — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { SignInB } from '@/components/sso/SignInB';
import { SignInC } from '@/components/sso/SignInC';

// =============================================================================
// SUITE — Google OAuth flow on Sign-in B
// =============================================================================

describe('Integration — SignInB Google OAuth flow', () => {
    it('opens a pop-up and hits the Google authorize endpoint on Google button click', async () => {
        simulateGooglePopupAllowed();
        const { user } = renderWithProviders(<SignInB />, {
            route: { initialPathname: 'signinB' },
        });
        await user.click(screen.getByRole('button', { name: /google/i }));
        await waitFor(() => {
            expectOAuthAuthorizeCalled('google');
        });
    });

    it('surfaces an error when the Google pop-up is blocked', async () => {
        simulateGooglePopupBlocked();
        const { user } = renderWithProviders(<SignInB />, {
            route: { initialPathname: 'signinB' },
        });
        await user.click(screen.getByRole('button', { name: /google/i }));
        await waitFor(() => {
            const alert = screen.queryByRole('alert');
            expect(alert).not.toBeNull();
        });
    });

    it('does NOT trigger the Google authorize call when only the Microsoft button is clicked', async () => {
        simulateProviderPopupAllowed('microsoft');
        const { user } = renderWithProviders(<SignInB />, {
            route: { initialPathname: 'signinB' },
        });
        await user.click(screen.getByRole('button', { name: /microsoft/i }));
        await waitFor(() => {
            expectOAuthAuthorizeCalled('microsoft');
        });
        // Google flow should be untouched.
        expectOAuthAuthorizeNotCalled('google');
    });
});

// =============================================================================
// SUITE — Sign-in C expansion flow
// =============================================================================

describe('Integration — SignInC expansion reveals all secondary providers', () => {
    it('exposes Apple/GitHub/GitLab/Okta buttons after expansion', async () => {
        const { user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        await user.click(screen.getByRole('button', { name: /see more/i }));
        for (const id of OAUTH_PROVIDER_IDS) {
            expect(screen.getByTestId(`signin-provider-${id}`)).toBeInTheDocument();
        }
    });

    it('opens a pop-up and hits Apple authorize on Apple button click after expansion', async () => {
        simulateProviderPopupAllowed('apple');
        const { user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        await user.click(screen.getByRole('button', { name: /see more/i }));
        await user.click(screen.getByRole('button', { name: /apple/i }));
        await waitFor(() => {
            expectOAuthAuthorizeCalled('apple');
        });
    });

    it('opens a pop-up and hits GitHub authorize on GitHub button click after expansion', async () => {
        simulateProviderPopupAllowed('github');
        const { user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        await user.click(screen.getByRole('button', { name: /see more/i }));
        await user.click(screen.getByRole('button', { name: /github/i }));
        await waitFor(() => {
            expectOAuthAuthorizeCalled('github');
        });
    });
});

// =============================================================================
// SUITE — Provider-button isolation
// =============================================================================

describe('Integration — provider buttons do not invoke each other', () => {
    it('clicking Microsoft does not invoke the Google authorize endpoint', async () => {
        simulateProviderPopupAllowed('microsoft');
        const { user } = renderWithProviders(<SignInB />, {
            route: { initialPathname: 'signinB' },
        });
        await user.click(screen.getByRole('button', { name: /microsoft/i }));
        await waitFor(() => {
            expectOAuthAuthorizeCalled('microsoft');
        });
        expectOAuthAuthorizeNotCalled('google');
    });

    it('clicking Google does not invoke the Microsoft authorize endpoint', async () => {
        simulateProviderPopupAllowed('google');
        const { user } = renderWithProviders(<SignInB />, {
            route: { initialPathname: 'signinB' },
        });
        await user.click(screen.getByRole('button', { name: /google/i }));
        await waitFor(() => {
            expectOAuthAuthorizeCalled('google');
        });
        expectOAuthAuthorizeNotCalled('microsoft');
    });
});
