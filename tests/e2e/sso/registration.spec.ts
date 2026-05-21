/**
 * E2E spec — Registration Completion form.
 *
 * Figma frame: 14980:28342
 * Route:       ROUTES.registration → /sso/register/complete
 *
 * --------------------------------------------------------------------------
 * Cross-browser × cross-viewport matrix
 * --------------------------------------------------------------------------
 *
 * Runs across the 9-project matrix per AAP Section 0.7.3.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, SSO components and Vite entry point do NOT
 * exist yet.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.4.2 — Registration Completion blueprint.
 *   - AAP Section 0.5.1 — `tests/e2e/sso/registration.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Cross-browser × cross-viewport parity.
 *   - AAP Section 0.9.1 — E2E execution conventions.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 2 — File missing.
 */

import { test, expect } from '@tests/setup/playwright';

test.describe('Registration Completion [E2E]', () => {
    test('renders all required fields @happy-path', async ({ signupPage }) => {
        await signupPage.navigate();
        await expect(signupPage.form).toBeVisible();
        await expect(signupPage.fieldInput('firstName')).toBeVisible();
        await expect(signupPage.fieldInput('lastName')).toBeVisible();
        await expect(signupPage.fieldInput('email')).toBeVisible();
        await expect(signupPage.fieldInput('password')).toBeVisible();
        await expect(signupPage.fieldInput('confirmPassword')).toBeVisible();
        await expect(signupPage.fieldInput('acceptTerms')).toBeVisible();
        await expect(signupPage.submitButton).toBeVisible();
    });

    test('submits valid registration without surfacing form-level errors @happy-path', async ({
        signupPage,
    }) => {
        await signupPage.navigate();
        await signupPage.fillRegistrationFields({
            firstName: 'New',
            lastName: 'User',
            email: 'new.user@blitzy.test',
            password: 'NewUserP@ssw0rd!',
            confirmPassword: 'NewUserP@ssw0rd!',
            acceptTerms: true,
        });
        await signupPage.submit();
        // Submission produces either navigation or in-place success;
        // we assert the email field is NOT marked invalid (valid input).
        await signupPage.page.waitForTimeout(500);
        const ariaInvalid = await signupPage.fieldInput('email').getAttribute('aria-invalid');
        expect(ariaInvalid === null || ariaInvalid === 'false').toBe(true);
    });

    test('marks blank submission fields as invalid @edge-case', async ({ signupPage }) => {
        await signupPage.navigate();
        await signupPage.submit();
        // At least the email and password fields should be aria-invalid.
        await expect(signupPage.fieldInput('email')).toHaveAttribute('aria-invalid', 'true');
        await expect(signupPage.fieldInput('password')).toHaveAttribute('aria-invalid', 'true');
    });

    test('marks malformed email as invalid @edge-case', async ({ signupPage }) => {
        await signupPage.navigate();
        await signupPage.fillRegistrationFields({
            firstName: 'New',
            lastName: 'User',
            email: 'not-an-email',
            password: 'NewUserP@ssw0rd!',
            confirmPassword: 'NewUserP@ssw0rd!',
            acceptTerms: true,
        });
        await signupPage.submit();
        await expect(signupPage.fieldInput('email')).toHaveAttribute('aria-invalid', 'true');
    });

    test('marks password mismatch as invalid @edge-case', async ({ signupPage }) => {
        await signupPage.navigate();
        await signupPage.fillRegistrationFields({
            firstName: 'New',
            lastName: 'User',
            email: 'new.user@blitzy.test',
            password: 'NewUserP@ssw0rd!',
            confirmPassword: 'WrongConfirmation1!',
            acceptTerms: true,
        });
        await signupPage.submit();
        await expect(signupPage.fieldInput('confirmPassword')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    test('marks unaccepted terms checkbox as invalid @edge-case', async ({ signupPage }) => {
        await signupPage.navigate();
        await signupPage.fillRegistrationFields({
            firstName: 'New',
            lastName: 'User',
            email: 'new.user@blitzy.test',
            password: 'NewUserP@ssw0rd!',
            confirmPassword: 'NewUserP@ssw0rd!',
            acceptTerms: false,
        });
        await signupPage.submit();
        await expect(signupPage.fieldInput('acceptTerms')).toHaveAttribute('aria-invalid', 'true');
    });

    test('passes WCAG 2.2 AA scan on initial load @a11y', async ({ signupPage, axeBuilder }) => {
        await signupPage.navigate();
        const results = await axeBuilder.analyze();
        expect(results.violations).toEqual([]);
    });
});
