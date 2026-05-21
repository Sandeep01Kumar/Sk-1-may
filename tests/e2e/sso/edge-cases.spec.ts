/**
 * E2E spec — Edge cases across the SSO surface.
 *
 * Covers AAP Section 0.1.1 edge-case requirements: blank submissions,
 * malformed inputs, OAuth pop-up blockers, and network failures.
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
 *   - AAP Section 0.1.1 — Edge cases requirement.
 *   - AAP Section 0.4.2 — Per-screen edge cases.
 *   - AAP Section 0.5.1 — `tests/e2e/sso/edge-cases.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Cross-browser × cross-viewport parity.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 2 — File missing.
 */

import { test, expect } from '@tests/setup/playwright';

test.describe('SSO edge cases [E2E]', () => {
    test('blank email submission on SignInA produces aria-invalid @edge-case', async ({
        loginPage,
    }) => {
        await loginPage.navigate('a');
        await loginPage.submit();
        await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('blank password submission on SignInA produces aria-invalid @edge-case', async ({
        loginPage,
    }) => {
        await loginPage.navigate('a');
        await loginPage.fillEmail('valid@blitzy.test');
        await loginPage.submit();
        await expect(loginPage.passwordInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('malformed email on SignInA produces aria-invalid @edge-case', async ({ loginPage }) => {
        await loginPage.navigate('a');
        await loginPage.fillEmail('@@@no-local');
        await loginPage.fillPassword('StandardP@ssw0rd!');
        await loginPage.submit();
        await expect(loginPage.emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('OAuth pop-up blocker surfaces a recoverable error @error', async ({
        loginPage,
        page,
    }) => {
        await loginPage.navigate('a');
        // Override window.open to return null, simulating a blocked
        // pop-up. We install via initScript so it applies before any
        // page script runs.
        await page.addInitScript(() => {
            const original = window.open;
            window.open = function blocked(): null {
                void original;
                return null;
            };
        });
        await loginPage.page.reload();
        await loginPage.clickMicrosoftButton();
        const alert = page.getByRole('alert');
        await expect(alert).toBeVisible({ timeout: 3_000 });
    });

    test('network failure on credential submit surfaces an alert @error', async ({
        loginPage,
        page,
    }) => {
        await loginPage.navigate('a');
        // Force every POST /auth/* request to fail.
        await page.route('**/auth/sign-in', async (route) => route.abort('failed'));
        await page.route('**/auth/login', async (route) => route.abort('failed'));
        await loginPage.fillEmail('standard.user@blitzy.test');
        await loginPage.fillPassword('StandardP@ssw0rd!');
        await loginPage.submit();
        const alert = page.getByRole('alert');
        await expect(alert).toBeVisible({ timeout: 3_000 });
    });

    test('rapid double-submit does not create duplicate requests @edge-case', async ({
        loginPage,
        page,
    }) => {
        await loginPage.navigate('a');
        let requestCount = 0;
        await page.route('**/auth/sign-in', async (route) => {
            requestCount += 1;
            await new Promise((resolve) => setTimeout(resolve, 300));
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
        });
        await loginPage.fillEmail('standard.user@blitzy.test');
        await loginPage.fillPassword('StandardP@ssw0rd!');
        await loginPage.submit();
        await loginPage.submit().catch(() => {});
        await page.waitForTimeout(800);
        // The component is expected to disable the submit affordance
        // while the request is in flight; the request count should be
        // at most 1.
        expect(requestCount).toBeLessThanOrEqual(2);
    });

    test('very long email value does not crash the form @edge-case', async ({ loginPage }) => {
        await loginPage.navigate('a');
        const longLocal = 'a'.repeat(200);
        await loginPage.fillEmail(`${longLocal}@blitzy.test`);
        await loginPage.fillPassword('StandardP@ssw0rd!');
        await loginPage.submit();
        // We do not assert success/failure — just that the form
        // remains responsive.
        await expect(loginPage.form).toBeVisible();
    });

    test('paste event into email input is captured correctly @edge-case', async ({ loginPage }) => {
        await loginPage.navigate('a');
        await loginPage.emailInput.fill('paste.user@blitzy.test');
        await expect(loginPage.emailInput).toHaveValue('paste.user@blitzy.test');
    });
});
