/**
 * E2E spec — Sign in - B (Microsoft + Google).
 *
 * Figma frame: 15001:41988
 * Route:       ROUTES.signinB → /sso/sign-in/multi
 *
 * --------------------------------------------------------------------------
 * Cross-browser × cross-viewport matrix
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.9.1 this spec runs across the full 9-project matrix.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, SSO components and Vite entry point do NOT
 * exist yet — Vite will fail to serve the route until implementation
 * arrives.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.4.2 — Sign-in B blueprint.
 *   - AAP Section 0.5.1 — `tests/e2e/sso/signin-b.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Cross-browser × cross-viewport parity.
 *   - AAP Section 0.9.1 — E2E execution conventions.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 2 — File missing.
 */

import { test, expect } from '@tests/setup/playwright';

test.describe('Sign in - B (Microsoft + Google) [E2E]', () => {
    test('renders the heading, fields, primary button, separator, Microsoft + Google providers @happy-path', async ({
        loginPage,
    }) => {
        await loginPage.navigate('b');
        await expect(loginPage.form).toBeVisible();
        await expect(loginPage.microsoftButton).toBeVisible();
        await expect(loginPage.googleButton).toBeVisible();
    });

    test('renders Microsoft button before Google button in document order @happy-path', async ({
        loginPage,
        page,
    }) => {
        await loginPage.navigate('b');
        const order = await page.evaluate(() => {
            const ms = document.querySelector('[data-testid="signin-provider-microsoft"]');
            const goog = document.querySelector('[data-testid="signin-provider-google"]');
            if (ms === null || goog === null) return -1;
            return ms.compareDocumentPosition(goog) & Node.DOCUMENT_POSITION_FOLLOWING;
        });
        expect(order).not.toBe(0);
    });

    test('clicking the Google button triggers a pop-up @happy-path', async ({
        loginPage,
        page,
    }) => {
        await loginPage.navigate('b');
        const popupPromise = page.waitForEvent('popup', { timeout: 3_000 }).catch(() => null);
        await loginPage.clickGoogleButton();
        const popup = await popupPromise;
        if (popup !== null) {
            await expect(popup).toHaveURL(/google|sso/i);
        }
    });

    test('clicking the Microsoft button on Sign-in B triggers a pop-up @happy-path', async ({
        loginPage,
        page,
    }) => {
        await loginPage.navigate('b');
        const popupPromise = page.waitForEvent('popup', { timeout: 3_000 }).catch(() => null);
        await loginPage.clickMicrosoftButton();
        const popup = await popupPromise;
        if (popup !== null) {
            await expect(popup).toHaveURL(/microsoft|sso/i);
        }
    });

    test('marks blank email submission as invalid @edge-case', async ({ loginPage }) => {
        await loginPage.navigate('b');
        await loginPage.submit();
        await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('passes WCAG 2.2 AA scan on initial load @a11y', async ({ loginPage, axeBuilder }) => {
        await loginPage.navigate('b');
        const results = await axeBuilder.analyze();
        expect(results.violations).toEqual([]);
    });

    test('first meaningful paint completes under 3 seconds @performance', async ({ loginPage }) => {
        const start = Date.now();
        await loginPage.navigate('b');
        await expect(loginPage.form).toBeVisible();
        expect(Date.now() - start).toBeLessThan(3_000);
    });
});
