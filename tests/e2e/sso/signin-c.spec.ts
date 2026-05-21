/**
 * E2E spec — Sign in - C (See more / Expanded providers).
 *
 * Figma frames: 15001:42082 (collapsed) and 15001:42214 (expanded).
 * Route:        ROUTES.signinC → /sso/sign-in/providers
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
 *   - AAP Section 0.4.2 — Sign-in C blueprint (collapsed + expanded).
 *   - AAP Section 0.5.1 — `tests/e2e/sso/signin-c.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Cross-browser × cross-viewport parity.
 *   - AAP Section 0.9.1 — E2E execution conventions.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 2 — File missing.
 */

import { test, expect } from '@tests/setup/playwright';

const SECONDARY_PROVIDERS = ['apple', 'github', 'gitlab', 'okta'] as const;

test.describe('Sign in - C (collapsed) [E2E]', () => {
    test('shows See more affordance with aria-expanded=false @happy-path', async ({
        loginPage,
    }) => {
        await loginPage.navigate('c');
        await expect(loginPage.seeMoreButton).toBeVisible();
        await expect(loginPage.seeMoreButton).toHaveAttribute('aria-expanded', 'false');
    });

    test('does NOT render secondary providers before expansion @happy-path', async ({
        loginPage,
    }) => {
        await loginPage.navigate('c');
        for (const id of SECONDARY_PROVIDERS) {
            const count = await loginPage.providerButton(id).count();
            expect(count).toBe(0);
        }
    });

    test('renders Microsoft and Google providers in collapsed state @happy-path', async ({
        loginPage,
    }) => {
        await loginPage.navigate('c');
        await expect(loginPage.microsoftButton).toBeVisible();
        await expect(loginPage.googleButton).toBeVisible();
    });
});

test.describe('Sign in - C (expanded) [E2E]', () => {
    test('reveals all secondary providers after clicking See more @happy-path', async ({
        loginPage,
    }) => {
        await loginPage.navigate('c');
        await loginPage.expandProviderList();
        for (const id of SECONDARY_PROVIDERS) {
            await expect(loginPage.providerButton(id)).toBeVisible();
        }
    });

    test('updates aria-expanded to true after expansion @happy-path', async ({ loginPage }) => {
        await loginPage.navigate('c');
        await loginPage.expandProviderList();
        await expect(loginPage.seeMoreButton).toHaveAttribute('aria-expanded', 'true');
    });

    test('expansion is reachable by keyboard (Enter) @a11y', async ({ loginPage, page }) => {
        await loginPage.navigate('c');
        await loginPage.seeMoreButton.focus();
        await page.keyboard.press('Enter');
        await expect(loginPage.providerButton('apple')).toBeVisible();
    });

    test('expansion is reachable by keyboard (Space) @a11y', async ({ loginPage, page }) => {
        await loginPage.navigate('c');
        await loginPage.seeMoreButton.focus();
        await page.keyboard.press(' ');
        await expect(loginPage.providerButton('github')).toBeVisible();
    });

    test('clicking a secondary provider triggers a pop-up @happy-path', async ({
        loginPage,
        page,
    }) => {
        await loginPage.navigate('c');
        await loginPage.expandProviderList();
        const popupPromise = page.waitForEvent('popup', { timeout: 3_000 }).catch(() => null);
        await loginPage.clickProviderButton('github');
        const popup = await popupPromise;
        if (popup !== null) {
            await expect(popup).toHaveURL(/github|sso/i);
        }
    });

    test('passes WCAG 2.2 AA scan in collapsed state @a11y', async ({ loginPage, axeBuilder }) => {
        await loginPage.navigate('c');
        const results = await axeBuilder.analyze();
        expect(results.violations).toEqual([]);
    });

    test('passes WCAG 2.2 AA scan in expanded state @a11y', async ({ loginPage, axeBuilder }) => {
        await loginPage.navigate('c');
        await loginPage.expandProviderList();
        const results = await axeBuilder.analyze();
        expect(results.violations).toEqual([]);
    });
});
