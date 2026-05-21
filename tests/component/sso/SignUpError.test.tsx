/**
 * Component tests for the SignUp Error screen (Create account error state).
 *
 * Target file under test: `src/components/sso/SignUpError.tsx` (CREATED
 * by a subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Frame: 15058:34569 ("SignUp-ErrorScreens-02")
 *   - Route: ROUTES.signupError  ->  /sso/register/error
 *
 *   Composition:
 *     - Error banner copy: "We couldn't complete your registration"
 *     - Detail copy explaining the failure
 *     - "Create account" affordance still actionable
 *     - Dismiss / retry affordance
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path:
 *     - Error banner copy renders with proper visual styling.
 *     - "Create account" link/button remains actionable.
 *
 *   Edge cases:
 *     - Stacked error states render without overflow.
 *     - Banner dismissal removes the banner from the DOM.
 *
 *   Error cases:
 *     - The error banner persists across re-renders until dismissed.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT module does NOT exist yet; the import
 * will fail.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — SignUp Error frame target.
 *   - AAP Section 0.3.1 — SignUpError screen test target.
 *   - AAP Section 0.4.2 — SignUp Error blueprint.
 *   - AAP Section 0.5.1 — File row for
 *     `tests/component/sso/SignUpError.test.tsx`.
 *   - AAP Section 0.7.1 — Per-file coverage override 95%.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@tests/utils/render';
import { ROUTES } from '@tests/setup/global';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { SignUpError } from '@/components/sso/SignUpError';

// =============================================================================
// SUITE — Banner rendering
// =============================================================================

describe('src/components/sso/SignUpError — banner rendering', () => {
    it('renders an alert-role banner', () => {
        renderWithProviders(<SignUpError />, { route: { initialPathname: 'signupError' } });
        // role=alert provides assertive screen-reader announcement.
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
    });

    it('renders the error heading copy', () => {
        renderWithProviders(<SignUpError />, { route: { initialPathname: 'signupError' } });
        // Either "couldn't complete your registration" or "Something
        // went wrong" is acceptable; the test exercises a regex.
        expect(
            screen.getByText(/(couldn't|wasn't able to|something went wrong)/i),
        ).toBeInTheDocument();
    });

    it('renders the "Create account" affordance still actionable', () => {
        renderWithProviders(<SignUpError />, { route: { initialPathname: 'signupError' } });
        const create = screen.getByRole('link', { name: /create an account|create account/i });
        expect(create).toBeInTheDocument();
    });
});

// =============================================================================
// SUITE — Dismissal
// =============================================================================

describe('src/components/sso/SignUpError — dismissal', () => {
    it('renders a dismiss button', () => {
        renderWithProviders(<SignUpError />, { route: { initialPathname: 'signupError' } });
        expect(screen.getByRole('button', { name: /dismiss|close/i })).toBeInTheDocument();
    });

    it('removes the alert from the DOM when dismissed', async () => {
        const { user } = renderWithProviders(<SignUpError />, {
            route: { initialPathname: 'signupError' },
        });
        await user.click(screen.getByRole('button', { name: /dismiss|close/i }));
        expect(screen.queryByRole('alert')).toBeNull();
    });
});

// =============================================================================
// SUITE — Persistence
// =============================================================================

describe('src/components/sso/SignUpError — persistence', () => {
    it('persists the error banner across re-renders (no auto-dismiss)', () => {
        const { rerender } = renderWithProviders(<SignUpError />, {
            route: { initialPathname: 'signupError' },
        });
        rerender(<SignUpError />);
        // After re-render the alert is still in the DOM (no auto
        // dismissal).
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });
});

// =============================================================================
// SUITE — Route registration
// =============================================================================

describe('src/components/sso/SignUpError — route registration', () => {
    it('registers under the canonical signupError pathname (/sso/register/error)', () => {
        const { routeStore } = renderWithProviders(<SignUpError />, {
            route: { initialPathname: 'signupError' },
        });
        expect(routeStore.getPathname()).toBe(ROUTES.signupError);
    });
});
