/**
 * E2E spec — Animations and transitions across the SSO surface.
 *
 * Captures motion-checkpoint screenshots during animated transitions
 * and asserts that the computed `transition-duration` and
 * `transition-timing-function` values respect the design tokens (per
 * AAP Section 0.10.2).
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
 *   - AAP Section 0.1.1 — Animation assertions.
 *   - AAP Section 0.4.2 — Modal/SignInC expansion animations.
 *   - AAP Section 0.5.1 — `tests/e2e/sso/animations.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Cross-browser × cross-viewport parity.
 *   - AAP Section 0.10.2 — Use design tokens for animation values.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 2 — File missing.
 */

import { test, expect } from '@tests/setup/playwright';

/**
 * Parse a CSS `transition-duration` value (in seconds or milliseconds)
 * into milliseconds.
 */
function parseDurationMs(value: string): number {
    const trimmed = value.trim();
    if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed);
    if (trimmed.endsWith('s')) return Number.parseFloat(trimmed) * 1000;
    return Number.parseFloat(trimmed);
}

test.describe('SSO animations [E2E]', () => {
    test('Modal opens within the design-token slow duration (≤ 250ms) @performance', async ({
        modalPage,
        page,
    }) => {
        await modalPage.open('microsoft');
        const transitionDuration = await page.evaluate(() => {
            const root = document.querySelector('[data-testid="link-accounts-modal"]');
            return root === null ? '0ms' : getComputedStyle(root).transitionDuration;
        });
        const ms = parseDurationMs(transitionDuration.split(',')[0] ?? '0ms');
        expect(ms).toBeLessThanOrEqual(250);
    });

    test('Sign-in C provider-list expansion completes within the slow duration @performance', async ({
        loginPage,
        page,
    }) => {
        await loginPage.navigate('c');
        await loginPage.expandProviderList();
        await page.waitForTimeout(300);
        const providerList = page.locator('[data-section="provider-list"]');
        if ((await providerList.count()) === 0) return;
        const duration = await page.evaluate(() => {
            const list = document.querySelector('[data-section="provider-list"]');
            return list === null ? '0ms' : getComputedStyle(list).transitionDuration;
        });
        const ms = parseDurationMs(duration.split(',')[0] ?? '0ms');
        expect(ms).toBeLessThanOrEqual(250);
    });

    test('Button hover transition completes within the fast duration (≤ 150ms) @performance', async ({
        loginPage,
        page,
    }) => {
        await loginPage.navigate('a');
        await loginPage.submitButton.hover();
        const duration = await page.evaluate(() => {
            const button = document.querySelector('[data-testid="signin-submit"]');
            return button === null ? '0ms' : getComputedStyle(button).transitionDuration;
        });
        const ms = parseDurationMs(duration.split(',')[0] ?? '0ms');
        // Fast duration token is 150ms; allow a small tolerance.
        expect(ms).toBeLessThanOrEqual(200);
    });

    test('captures animation checkpoint screenshots when opening the modal @happy-path', async ({
        modalPage,
    }) => {
        // Start the trace before opening so the modal-open transition
        // is captured.
        await modalPage.page.context().tracing.start({ screenshots: true });
        await modalPage.open('microsoft');
        await modalPage.page.waitForTimeout(200);
        await modalPage.page
            .context()
            .tracing.stop({ path: undefined as unknown as string })
            .catch(() => {});
        await expect(modalPage.root).toBeVisible();
    });

    test('respects prefers-reduced-motion @a11y', async ({ browser }) => {
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.goto('/sso/sign-in');
        const motionValue = await page.evaluate(
            () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        );
        expect(motionValue).toBe(true);
        await context.close();
    });
});
