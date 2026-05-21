/**
 * Visual regression spec — Link Accounts Modal (Generic variant).
 *
 * Figma frame: 16383:42287
 * Route:       ROUTES.linkAccountsGeneric  →  /sso/link-accounts?provider=other
 * Baselines:   tests/visual/baselines/{desktop,tablet,mobile}/link-accounts-generic.png
 *
 * The generic variant of the Link Accounts modal is shown when the
 * federated provider is neither Microsoft nor Google (or when the
 * implementation does not have a branded variant for the calling
 * provider). The Figma source at frame 16383:42287 uses
 * placeholder copy (`{username}@{domain.com}` and `{Domain}`) to
 * indicate the variant is provider-agnostic; the actual rendered
 * variant in the SUT will substitute the live provider domain.
 *
 * Modal layout (per Figma):
 *   - Modal width: 512 px (per AAP § 0.4.2)
 *   - Border radius: 24 px
 *   - Shadow token shared with the Microsoft variant (AAP § 0.10.3):
 *       `0px 8px 8px -4px rgba(16, 24, 40, 0.04),
 *        0px 20px 24px -4px rgba(16, 24, 40, 0.1)`
 *
 * The desktop Figma rendering is 1104×854 (modal export crop, not
 * full-screen) per AAP § 0.4.5.
 *
 * Cross-browser × cross-viewport matrix:
 *   Runs against all nine `playwright.config.ts` projects.
 *
 * Tag: `@visual`
 *
 * Authority:
 *   - AAP Section 0.4.2 — Link Accounts Modal blueprint.
 *   - AAP Section 0.4.5 — Modal baseline dimensions (1104×854).
 *   - AAP Section 0.5.1 — `tests/visual/link-accounts-generic.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Visual regression ≤ 0.1% mismatch gate.
 *   - AAP Section 0.10.2 — Inter font preload mandate.
 *   - AAP Section 0.10.3 — Modal shadow token captured verbatim.
 */

import { test, expect } from '@tests/setup/playwright';
import { waitForInteractive } from '@tests/utils/visual';

test.describe('Link Accounts Modal (Generic) [visual]', () => {
    test('matches Figma baseline @visual', async ({ modalPage }) => {
        // Open the generic variant of the Link Accounts modal.
        // `ModalPage.open('generic')` navigates to
        // ROUTES.linkAccountsGeneric (/sso/link-accounts?provider=other)
        // and waits for the modal root locator to be visible.
        await modalPage.open('generic');

        // Synchronise to screenshot-ready state. The generic variant
        // shares the modal-open animation with the Microsoft variant
        // (AAP § 0.4.2 specifies <200 ms), so the same readiness
        // pipeline applies: networkidle → fonts ready → double-rAF.
        await waitForInteractive(modalPage.page);

        // Capture and compare against the per-viewport baseline. The
        // 1104×854 desktop baseline crop matches the Figma modal
        // export dimension exactly.
        await expect(modalPage.page).toHaveScreenshot('link-accounts-generic.png', {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
        });
    });
});
