/**
 * Component tests for the Sign in - A (Microsoft only) screen.
 *
 * Target file under test: `src/components/sso/SignInA.tsx` (CREATED by a
 * subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Frame: 15001:41875 ("Sign in - A (Microsoft only)")
 *   - Route: ROUTES.signinA  ->  /sso/sign-in
 *   - Primary provider: Microsoft (the only social provider on this frame)
 *
 *   Composition:
 *     - Heading "Sign in" (32 px / weight 600)
 *     - Subtitle "New to Blitzy? Create an account" with "Create an
 *       account" rendered as a link
 *     - Email TextInput
 *     - Password TextInput (RightIcon variant for show/hide toggle)
 *     - Primary "Sign in" Button (Large)
 *     - Separator "or"
 *     - SocialProviderButton for Microsoft
 *     - Footer links: "Forgot your password?", terms-of-service,
 *       privacy-policy, service-status
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path (per AAP Section 0.4.2):
 *     - All structural elements render in the documented order.
 *     - Microsoft button is the only social provider rendered.
 *     - Forgot-password link present.
 *
 *   Edge cases:
 *     - Blank email submission yields a field-level error.
 *     - Malformed email submission yields a field-level error.
 *     - Blank password submission yields a field-level error.
 *
 * Integration with MSW handlers (real network round-trips) lives in
 * `tests/integration/signin-microsoft.test.tsx`. E2E user flows live in
 * `tests/e2e/sso/signin-a.spec.ts`.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, `src/components/sso/SignInA.tsx` does NOT
 * exist yet; the import below will fail with
 * `Cannot find module '@/components/sso/SignInA'`. This IS the expected
 * failure mode.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Sign in - A frame target.
 *   - AAP Section 0.3.1 — SignInA screen test target.
 *   - AAP Section 0.4.2 — Sign in - A blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/component/sso/SignInA.test.tsx`.
 *   - AAP Section 0.7.1 — Per-file coverage override 95%.
 *   - AAP Section 0.10.2 — user-event mandate.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@tests/utils/render';
import { INVALID_EMAILS, VALID_EMAIL_STANDARD } from '@tests/fixtures/users';
import { ROUTES } from '@tests/setup/global';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { SignInA } from '@/components/sso/SignInA';

// =============================================================================
// SUITE — Composition (structural elements present)
// =============================================================================

describe('src/components/sso/SignInA — composition', () => {
    it('renders the "Sign in" heading', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        expect(screen.getByRole('heading', { name: /^sign in$/i })).toBeInTheDocument();
    });

    it('renders the subtitle "New to Blitzy?" copy', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        expect(screen.getByText(/new to blitzy/i)).toBeInTheDocument();
    });

    it('renders the "Create an account" link', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument();
    });

    it('renders the Email input', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('renders the Password input', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders the primary "Sign in" submit button', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        const submit = screen.getByRole('button', { name: /^sign in$/i });
        expect(submit).toBeInTheDocument();
    });

    it('renders the "or" separator between primary form and social row', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        expect(screen.getByText(/^or$/i)).toBeInTheDocument();
    });

    it('renders the Microsoft social button', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        expect(screen.getByRole('button', { name: /microsoft/i })).toBeInTheDocument();
    });

    it('does NOT render a Google social button (Sign-in A is Microsoft-only)', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        expect(screen.queryByRole('button', { name: /google/i })).toBeNull();
    });

    it('renders the "Forgot your password?" link', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument();
    });

    it('renders the legal-footer links (terms, privacy, service status)', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        expect(screen.getByRole('link', { name: /terms/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /privacy/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /service status/i })).toBeInTheDocument();
    });
});

// =============================================================================
// SUITE — Provider order
// =============================================================================

describe('src/components/sso/SignInA — provider order', () => {
    it('exposes exactly one social provider button (Microsoft)', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        // We look only at buttons that have provider semantics — those
        // testIds start with `signin-provider-`.
        const providerButtons = document.querySelectorAll('[data-testid^="signin-provider-"]');
        expect(providerButtons).toHaveLength(1);
    });
});

// =============================================================================
// SUITE — Field-level validation (client-side)
// =============================================================================

describe('src/components/sso/SignInA — field-level validation (client-side)', () => {
    it('surfaces an error when submitting with a blank email', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await user.click(screen.getByRole('button', { name: /^sign in$/i }));
        // The implementation may render an aria-describedby error
        // element or an inline error message; we accept any aria-invalid
        // on the empty input.
        const email = screen.getByLabelText(/email/i);
        expect(email).toHaveAttribute('aria-invalid', 'true');
    });

    it('surfaces an error when submitting with a blank password', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        // Fill the email so password is the only blank field.
        const email = screen.getByLabelText(/email/i);
        await user.type(email, VALID_EMAIL_STANDARD.value);
        await user.click(screen.getByRole('button', { name: /^sign in$/i }));
        const password = screen.getByLabelText(/password/i);
        expect(password).toHaveAttribute('aria-invalid', 'true');
    });

    it.each(INVALID_EMAILS.filter((s) => s.reason !== 'empty'))(
        'surfaces an error for malformed email "$value" ($reason)',
        async (sample) => {
            const { user } = renderWithProviders(<SignInA />, {
                route: { initialPathname: 'signinA' },
            });
            const email = screen.getByLabelText(/email/i);
            await user.type(email, sample.value);
            await user.click(screen.getByRole('button', { name: /^sign in$/i }));
            expect(email).toHaveAttribute('aria-invalid', 'true');
        },
    );
});

// =============================================================================
// SUITE — Route registration
// =============================================================================

describe('src/components/sso/SignInA — route registration', () => {
    it('registers under the canonical signinA pathname (/sso/sign-in)', () => {
        const { routeStore } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        expect(routeStore.getPathname()).toBe(ROUTES.signinA);
    });
});
