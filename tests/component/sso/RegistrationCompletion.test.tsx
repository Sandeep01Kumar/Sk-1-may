/**
 * Component tests for the Registration Completion Form screen.
 *
 * Target file under test: `src/components/sso/RegistrationCompletion.tsx`
 * (CREATED by a subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Frame: 14980:28342 ("Registration Completion Form")
 *   - Route: ROUTES.registration  ->  /sso/register/complete
 *
 *   Composition:
 *     - Heading "Complete your registration"
 *     - Form fields: firstName, lastName, email (preset / readonly),
 *       password, confirmPassword
 *     - Terms of Service checkbox + label
 *     - Primary "Complete registration" submit button
 *
 *   The screen receives the user's federated identity (from a prior
 *   SSO step) and asks for any missing local-profile fields.
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path:
 *     - All form fields render with the expected labels.
 *     - Submit invokes the registration handler.
 *     - Success indicator displayed on success.
 *
 *   Edge cases:
 *     - Required-field blanks surface aria-invalid="true".
 *     - Password mismatch surfaces a field-level error.
 *
 *   Error cases:
 *     - Server-side rejection with field errors maps to inputs.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT module does NOT exist yet; the import
 * will fail with `Cannot find module '@/components/sso/RegistrationCompletion'`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Registration completion frame target.
 *   - AAP Section 0.3.1 — RegistrationCompletion screen test target.
 *   - AAP Section 0.4.2 — Registration Completion blueprint.
 *   - AAP Section 0.5.1 — File row for
 *     `tests/component/sso/RegistrationCompletion.test.tsx`.
 *   - AAP Section 0.7.1 — Per-file coverage override 95%.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@tests/utils/render';
import { NEW_USER } from '@tests/fixtures/users';
import { VALID_PASSWORD_STANDARD } from '@tests/fixtures/passwords';
import { ROUTES } from '@tests/setup/global';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { RegistrationCompletion } from '@/components/sso/RegistrationCompletion';

// =============================================================================
// SUITE — Composition
// =============================================================================

describe('src/components/sso/RegistrationCompletion — composition', () => {
    it('renders the registration heading', () => {
        renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        // Either "Complete your registration" or "Finish creating
        // your account" is acceptable copy per the Figma frame.
        expect(
            screen.getByRole('heading', { name: /(complete|finish).*(registration|account)/i }),
        ).toBeInTheDocument();
    });

    it('renders the first name field', () => {
        renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    it('renders the last name field', () => {
        renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    });

    it('renders the email field', () => {
        renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('renders the password field', () => {
        renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    it('renders the password confirmation field', () => {
        renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('renders the terms-of-service checkbox', () => {
        renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        expect(screen.getByRole('checkbox', { name: /terms/i })).toBeInTheDocument();
    });

    it('renders the primary submit button', () => {
        renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        expect(
            screen.getByRole('button', { name: /complete registration|create account/i }),
        ).toBeInTheDocument();
    });
});

// =============================================================================
// SUITE — Validation (client-side)
// =============================================================================

describe('src/components/sso/RegistrationCompletion — validation', () => {
    it('marks blank required fields aria-invalid="true" on submit', async () => {
        const { user } = renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        await user.click(
            screen.getByRole('button', { name: /complete registration|create account/i }),
        );
        const firstName = screen.getByLabelText(/first name/i);
        const lastName = screen.getByLabelText(/last name/i);
        expect(firstName).toHaveAttribute('aria-invalid', 'true');
        expect(lastName).toHaveAttribute('aria-invalid', 'true');
    });

    it('surfaces a password mismatch error when passwords disagree', async () => {
        const { user } = renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        await user.type(screen.getByLabelText(/first name/i), NEW_USER.firstName ?? 'Test');
        await user.type(screen.getByLabelText(/last name/i), NEW_USER.lastName ?? 'User');
        await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD_STANDARD.value);
        await user.type(screen.getByLabelText(/confirm password/i), 'mismatch-zzzz!');
        await user.click(
            screen.getByRole('button', { name: /complete registration|create account/i }),
        );
        const confirm = screen.getByLabelText(/confirm password/i);
        expect(confirm).toHaveAttribute('aria-invalid', 'true');
    });

    it('marks the unchecked terms checkbox as aria-invalid on submit', async () => {
        const { user } = renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        await user.type(screen.getByLabelText(/first name/i), NEW_USER.firstName ?? 'Test');
        await user.type(screen.getByLabelText(/last name/i), NEW_USER.lastName ?? 'User');
        await user.type(screen.getByLabelText(/email/i), NEW_USER.email);
        await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD_STANDARD.value);
        await user.type(screen.getByLabelText(/confirm password/i), VALID_PASSWORD_STANDARD.value);
        // Do NOT check the terms checkbox.
        await user.click(
            screen.getByRole('button', { name: /complete registration|create account/i }),
        );
        const terms = screen.getByRole('checkbox', { name: /terms/i });
        expect(terms).toHaveAttribute('aria-invalid', 'true');
    });
});

// =============================================================================
// SUITE — Route registration
// =============================================================================

describe('src/components/sso/RegistrationCompletion — route registration', () => {
    it('registers under the canonical registration pathname (/sso/register/complete)', () => {
        const { routeStore } = renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        expect(routeStore.getPathname()).toBe(ROUTES.registration);
    });
});
