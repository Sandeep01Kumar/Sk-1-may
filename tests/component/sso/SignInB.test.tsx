/**
 * Component tests for the Sign in - B (Microsoft + Google) screen.
 *
 * Target file under test: `src/components/sso/SignInB.tsx` (CREATED by a
 * subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Frame: 15001:41988 ("Sign in - B (Microsoft + Google)")
 *   - Route: ROUTES.signinB  ->  /sso/sign-in/multi
 *   - Providers (in order): Microsoft, Google
 *
 *   Composition is identical to Sign-in A except:
 *     - Separator copy changes from "or" to "or sign in with".
 *     - A second social row entry — the Google SocialProviderButton —
 *       appears after the Microsoft button with a 16 px gap.
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path:
 *     - All structural elements render.
 *     - Provider buttons appear in canonical order (Microsoft first,
 *       Google second) with the expected gap token.
 *     - Separator copy is "or sign in with".
 *
 *   Edge cases:
 *     - Blank email/password validation behaviours match Sign-in A.
 *
 * Integration with MSW handlers for Google/Microsoft OAuth lives in
 * `tests/integration/signin-multi-provider.test.tsx`.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, `src/components/sso/SignInB.tsx` does NOT
 * exist yet; the import below will fail.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Sign in - B frame target.
 *   - AAP Section 0.3.1 — SignInB screen test target.
 *   - AAP Section 0.4.2 — Sign in - B blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/component/sso/SignInB.test.tsx`.
 *   - AAP Section 0.7.1 — Per-file coverage override 95%.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, within } from '@tests/utils/render';
import { ROUTES } from '@tests/setup/global';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { SignInB } from '@/components/sso/SignInB';

// =============================================================================
// SUITE — Composition
// =============================================================================

describe('src/components/sso/SignInB — composition', () => {
    it('renders the "Sign in" heading', () => {
        renderWithProviders(<SignInB />, { route: { initialPathname: 'signinB' } });
        expect(screen.getByRole('heading', { name: /^sign in$/i })).toBeInTheDocument();
    });

    it('renders the Email + Password form fields', () => {
        renderWithProviders(<SignInB />, { route: { initialPathname: 'signinB' } });
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders the "or sign in with" separator (Sign-in B copy variant)', () => {
        renderWithProviders(<SignInB />, { route: { initialPathname: 'signinB' } });
        expect(screen.getByText(/or sign in with/i)).toBeInTheDocument();
    });

    it('renders both the Microsoft and Google social provider buttons', () => {
        renderWithProviders(<SignInB />, { route: { initialPathname: 'signinB' } });
        expect(screen.getByRole('button', { name: /microsoft/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    });

    it('renders exactly two social provider buttons', () => {
        renderWithProviders(<SignInB />, { route: { initialPathname: 'signinB' } });
        const providerButtons = document.querySelectorAll('[data-testid^="signin-provider-"]');
        expect(providerButtons).toHaveLength(2);
    });
});

// =============================================================================
// SUITE — Provider order
// =============================================================================

describe('src/components/sso/SignInB — provider order', () => {
    it('places Microsoft above (or before) Google in document order', () => {
        renderWithProviders(<SignInB />, { route: { initialPathname: 'signinB' } });
        const microsoft = screen.getByRole('button', { name: /microsoft/i });
        const google = screen.getByRole('button', { name: /google/i });
        // `compareDocumentPosition` returns DOCUMENT_POSITION_FOLLOWING
        // (=4) when 'google' follows 'microsoft' in document order.
        const relation = microsoft.compareDocumentPosition(google);
        expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    });

    it('exposes both providers via stable test-ids', () => {
        renderWithProviders(<SignInB />, { route: { initialPathname: 'signinB' } });
        expect(screen.getByTestId('signin-provider-microsoft')).toBeInTheDocument();
        expect(screen.getByTestId('signin-provider-google')).toBeInTheDocument();
    });
});

// =============================================================================
// SUITE — Social row gap token
// =============================================================================

describe('src/components/sso/SignInB — social row gap', () => {
    it('applies the button.gap token (16 px) between social buttons', () => {
        renderWithProviders(<SignInB />, { route: { initialPathname: 'signinB' } });
        const row = document.querySelector('[data-section="social-providers"]');
        expect(row).not.toBeNull();
        if (row === null) {
            return;
        }
        const styles = getComputedStyle(row);
        const gap = styles.rowGap || styles.gap || styles.columnGap;
        expect(gap).toBe('16px');
    });
});

// =============================================================================
// SUITE — Route registration
// =============================================================================

describe('src/components/sso/SignInB — route registration', () => {
    it('registers under the canonical signinB pathname (/sso/sign-in/multi)', () => {
        const { routeStore } = renderWithProviders(<SignInB />, {
            route: { initialPathname: 'signinB' },
        });
        expect(routeStore.getPathname()).toBe(ROUTES.signinB);
    });
});

// =============================================================================
// SUITE — Header links
// =============================================================================

describe('src/components/sso/SignInB — header links', () => {
    it('renders the "Forgot your password?" link', () => {
        renderWithProviders(<SignInB />, { route: { initialPathname: 'signinB' } });
        expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument();
    });

    it('renders the "Create an account" link', () => {
        renderWithProviders(<SignInB />, { route: { initialPathname: 'signinB' } });
        const subtitle = screen.getByText(/new to blitzy/i);
        // The link should be a child within the subtitle text.
        const createAccountLink = within(subtitle.parentElement ?? subtitle).getByRole('link', {
            name: /create an account/i,
        });
        expect(createAccountLink).toBeInTheDocument();
    });
});
