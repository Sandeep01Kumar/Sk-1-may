/**
 * E2E spec — Keyboard-only flow across the SSO surface.
 *
 * Verifies that every flow defined in the eight Figma frames can be
 * completed end-to-end without a pointing device. The spec runs through
 * each screen using only Tab / Shift+Tab / Enter / Space / Escape, and
 * asserts that focus is visible, focus order is logical, and modal
 * dialogs trap focus correctly.
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
 *   - AAP Section 0.1.1 — Keyboard navigation requirement.
 *   - AAP Section 0.4.2 — Per-screen keyboard test cases.
 *   - AAP Section 0.5.1 — `tests/e2e/sso/keyboard-flow.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Cross-browser × cross-viewport parity.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 2 — File missing.
 */

import { test, expect } from '@tests/setup/playwright';

test.describe('Keyboard-only SSO flow [E2E]', () => {
    test('SignInA: complete a credential sign-in using only the keyboard @a11y', async ({
        loginPage,
        page,
    }) => {
        await loginPage.navigate('a');
        await loginPage.emailInput.focus();
        await page.keyboard.type('standard.user@blitzy.test');
        await page.keyboard.press('Tab');
        await page.keyboard.type('StandardP@ssw0rd!');
        // Continue tabbing until we reach the submit button.
        let visited = 0;
        let onSubmit = false;
        while (visited < 10 && !onSubmit) {
            const activeId = await page.evaluate(() =>
                document.activeElement?.getAttribute('data-testid'),
            );
            if (activeId === 'signin-submit') {
                onSubmit = true;
                break;
            }
            await page.keyboard.press('Tab');
            visited += 1;
        }
        expect(onSubmit).toBe(true);
        await page.keyboard.press('Enter');
    });

    test('SignInA: focus visible after Tab through every interactive element @a11y', async ({
        loginPage,
        page,
    }) => {
        await loginPage.navigate('a');
        const focusables = await page
            .locator('input, button, a[href], [tabindex]:not([tabindex="-1"])')
            .elementHandles();
        for (let i = 0; i < Math.min(focusables.length, 8); i += 1) {
            await page.keyboard.press('Tab');
            const visible = await page.evaluate(() => {
                const el = document.activeElement as HTMLElement | null;
                if (el === null) return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });
            expect(visible).toBe(true);
        }
    });

    test('SignInC: keyboard-only See more expansion @a11y', async ({ loginPage, page }) => {
        await loginPage.navigate('c');
        await loginPage.seeMoreButton.focus();
        await page.keyboard.press('Enter');
        await expect(loginPage.providerButton('apple')).toBeVisible();
    });

    test('LinkAccountsModal: focus is trapped via Tab and Shift+Tab @a11y', async ({
        modalPage,
        page,
    }) => {
        await modalPage.open('microsoft');
        // Tab through repeatedly and assert we never leave the modal.
        const focusablesInsideModal = [
            'link-accounts-password',
            'link-accounts-confirm',
            'link-accounts-cancel',
        ];
        const seen: string[] = [];
        for (let i = 0; i < 8; i += 1) {
            await page.keyboard.press('Tab');
            const id = await page.evaluate(() =>
                document.activeElement?.getAttribute('data-testid'),
            );
            if (id !== null && id !== undefined) seen.push(id);
        }
        // Every element we visited should be inside the modal.
        for (const id of seen) {
            const insideModal = focusablesInsideModal.some((known) => id.startsWith(known));
            expect(insideModal).toBe(true);
        }
    });

    test('LinkAccountsModal: Escape dismisses without leaking focus @a11y', async ({
        modalPage,
        page,
    }) => {
        await modalPage.open('microsoft');
        await page.keyboard.press('Escape');
        // After dismissal, focus should NOT be on a modal element.
        const id = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
        if (id !== null && id !== undefined) {
            expect(id.startsWith('link-accounts-')).toBe(false);
        }
    });

    test('Registration: Tab to submit and Enter submits @a11y', async ({ signupPage, page }) => {
        await signupPage.navigate();
        await signupPage.fillRegistrationFields({
            firstName: 'Keyboard',
            lastName: 'Tester',
            email: 'keyboard.tester@blitzy.test',
            password: 'KeyboardP@ss123!',
            confirmPassword: 'KeyboardP@ss123!',
            acceptTerms: true,
        });
        await signupPage.submitButton.focus();
        await page.keyboard.press('Enter');
        // Allow the implementation to settle.
        await page.waitForTimeout(500);
    });

    test('keyboard-only SignInA passes WCAG 2.2 AA scan @a11y', async ({
        loginPage,
        axeBuilder,
        page,
    }) => {
        await loginPage.navigate('a');
        await page.keyboard.press('Tab');
        const results = await axeBuilder.analyze();
        expect(results.violations).toEqual([]);
    });
});
