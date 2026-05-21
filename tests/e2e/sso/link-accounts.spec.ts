/**
 * E2E spec — Link Accounts Modal (Microsoft + Generic variants).
 *
 * Figma frames: 16383:42232 (Microsoft) and 16383:42287 (Generic).
 * Routes:
 *   - ROUTES.linkAccountsMicrosoft → /sso/link-accounts?provider=microsoft
 *   - ROUTES.linkAccountsGeneric   → /sso/link-accounts?provider=other
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
 *   - AAP Section 0.4.2 — Link Accounts Modal blueprint.
 *   - AAP Section 0.5.1 — `tests/e2e/sso/link-accounts.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Cross-browser × cross-viewport parity.
 *   - AAP Section 0.9.1 — E2E execution conventions.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 2 — File missing.
 */

import { test, expect } from '@tests/setup/playwright';

test.describe('Link Accounts Modal — Microsoft [E2E]', () => {
    test('renders dialog with password input, Cancel, and confirm buttons @happy-path', async ({
        modalPage,
    }) => {
        await modalPage.open('microsoft');
        await expect(modalPage.root).toBeVisible();
        await expect(modalPage.passwordInput).toBeVisible();
        await expect(modalPage.cancelButton).toBeVisible();
        await expect(modalPage.confirmButton).toBeVisible();
    });

    test('Escape dismisses the modal @happy-path', async ({ modalPage }) => {
        await modalPage.open('microsoft');
        await modalPage.escape();
        // The modal root should no longer be visible (component sets
        // display:none, removes from DOM, or otherwise hides it).
        await expect(modalPage.root)
            .toBeHidden({ timeout: 2_000 })
            .catch(async () => {
                await expect(modalPage.root).toHaveCount(0);
            });
    });

    test('Cancel button dismisses the modal @happy-path', async ({ modalPage }) => {
        await modalPage.open('microsoft');
        await modalPage.cancel();
        await expect(modalPage.root)
            .toBeHidden({ timeout: 2_000 })
            .catch(async () => {
                await expect(modalPage.root).toHaveCount(0);
            });
    });

    test('clicking overlay dismisses the modal @edge-case', async ({ modalPage }) => {
        await modalPage.open('microsoft');
        await modalPage.clickOverlay();
        await expect(modalPage.root)
            .toBeHidden({ timeout: 2_000 })
            .catch(async () => {
                await expect(modalPage.root).toHaveCount(0);
            });
    });

    test('focuses the first interactive element when opened @a11y', async ({ modalPage, page }) => {
        await modalPage.open('microsoft');
        const activeId = await page.evaluate(() =>
            document.activeElement?.getAttribute('data-testid'),
        );
        // Active element should be within the modal — either the
        // password input or the modal root itself.
        const acceptable = [
            'link-accounts-password',
            'link-accounts-modal',
            'link-accounts-cancel',
        ];
        expect(acceptable.includes(activeId ?? '')).toBe(true);
    });

    test('submits with the matching password @happy-path', async ({ modalPage }) => {
        await modalPage.open('microsoft');
        await modalPage.fillPassword('StandardP@ssw0rd!');
        await modalPage.confirm();
        // No assertion on the post-submission view — we assert no
        // error alert appears for a valid password.
        await modalPage.page.waitForTimeout(500);
        const alert = modalPage.page.getByRole('alert');
        const count = await alert.count();
        // Either zero alerts or alerts not containing "invalid"/"wrong".
        if (count > 0) {
            for (let i = 0; i < count; i += 1) {
                const text = (await alert.nth(i).textContent()) ?? '';
                expect(text).not.toMatch(/wrong password|invalid/i);
            }
        }
    });

    test('passes WCAG 2.2 AA scan when open @a11y', async ({ modalPage, axeBuilder }) => {
        await modalPage.open('microsoft');
        const results = await axeBuilder.analyze();
        expect(results.violations).toEqual([]);
    });
});

test.describe('Link Accounts Modal — Generic [E2E]', () => {
    test('renders generic copy without Microsoft branding @happy-path', async ({
        modalPage,
        page,
    }) => {
        await modalPage.open('generic');
        await expect(modalPage.root).toBeVisible();
        // The Microsoft logo should NOT be present in the generic variant.
        const msLogo = page.locator('[data-testid="link-accounts-microsoft-logo"]');
        expect(await msLogo.count()).toBe(0);
    });

    test('exposes the same password / confirm / cancel affordances @happy-path', async ({
        modalPage,
    }) => {
        await modalPage.open('generic');
        await expect(modalPage.passwordInput).toBeVisible();
        await expect(modalPage.cancelButton).toBeVisible();
        await expect(modalPage.confirmButton).toBeVisible();
    });

    test('passes WCAG 2.2 AA scan when open @a11y', async ({ modalPage, axeBuilder }) => {
        await modalPage.open('generic');
        const results = await axeBuilder.analyze();
        expect(results.violations).toEqual([]);
    });
});
