/**
 * E2E spec — SignUp Error.
 *
 * Figma frame: 15058:34569
 * Route:       ROUTES.signupError → /sso/register/error
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
 *   - AAP Section 0.4.2 — SignUp Error blueprint.
 *   - AAP Section 0.5.1 — `tests/e2e/sso/signup-error.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Cross-browser × cross-viewport parity.
 *   - AAP Section 0.9.1 — E2E execution conventions.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 2 — File missing.
 */

import { test, expect } from '@tests/setup/playwright';

test.describe('SignUp Error [E2E]', () => {
    test('renders the error banner with role=alert @happy-path', async ({ page }) => {
        await page.goto('/sso/register/error');
        const alert = page.getByRole('alert');
        await expect(alert).toBeVisible();
    });

    test('keeps the "Create account" affordance actionable @happy-path', async ({ page }) => {
        await page.goto('/sso/register/error');
        const createAccount = page.getByRole('button', { name: /create account/i });
        await expect(createAccount).toBeVisible();
        await expect(createAccount).toBeEnabled();
    });

    test('error banner persists across re-renders until dismissed @happy-path', async ({
        page,
    }) => {
        await page.goto('/sso/register/error');
        const alert = page.getByRole('alert');
        await expect(alert).toBeVisible();
        // Re-renders are triggered by hash changes; we use a query-param
        // change as a lightweight re-render trigger.
        await page.evaluate(() => {
            const url = new URL(window.location.href);
            url.searchParams.set('_rerender', String(Date.now()));
            window.history.replaceState(null, '', url.toString());
            window.dispatchEvent(new Event('popstate'));
        });
        await expect(alert).toBeVisible();
    });

    test('dismissing the banner removes it from the DOM @edge-case', async ({ page }) => {
        await page.goto('/sso/register/error');
        const dismiss = page.getByRole('button', { name: /dismiss|close/i });
        if ((await dismiss.count()) > 0) {
            await dismiss.first().click();
            await expect(page.getByRole('alert')).toHaveCount(0);
        }
    });

    test('passes WCAG 2.2 AA scan on initial load @a11y', async ({ page, axeBuilder }) => {
        await page.goto('/sso/register/error');
        const results = await axeBuilder.analyze();
        expect(results.violations).toEqual([]);
    });
});
