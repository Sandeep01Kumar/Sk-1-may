/**
 * Visual regression spec — Link Accounts Modal (Microsoft variant).
 *
 * Figma frame: 16383:42232
 * Route:       ROUTES.linkAccountsMicrosoft  →  /sso/link-accounts?provider=microsoft
 * Baselines:   tests/visual/baselines/{desktop,tablet,mobile}/link-accounts-microsoft.png
 *
 * The Link Accounts modal is shown when a user attempts to sign in
 * with a federated identity that matches an existing email on file.
 * The Microsoft variant (Figma frame 16383:42232) explicitly mentions
 * Microsoft in the supporting copy and uses Microsoft-branded
 * provider identification.
 *
 * Modal layout (per Figma):
 *   - Modal width: 512 px (per AAP § 0.4.2)
 *   - Border radius: 24 px
 *   - Shadow: `0px 8px 8px -4px rgba(16, 24, 40, 0.04),
 *              0px 20px 24px -4px rgba(16, 24, 40, 0.1)` (AAP § 0.10.3)
 *   - Centred on a semi-transparent overlay
 *
 * The desktop Figma rendering is 1104×854 (not 2880×2048) because
 * the modal frame is exported at a tighter crop than the full
 * sign-in screens; this is documented in AAP § 0.4.5.
 *
 * Cross-browser × cross-viewport matrix:
 *   Runs against all nine `playwright.config.ts` projects.
 *
 * Tag: `@visual`
 *
 * Authority:
 *   - AAP Section 0.4.2 — Link Accounts Modal blueprint.
 *   - AAP Section 0.4.5 — Modal baseline dimensions (1104×854).
 *   - AAP Section 0.5.1 — `tests/visual/link-accounts-microsoft.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Visual regression ≤ 0.1% mismatch gate.
 *   - AAP Section 0.10.2 — Inter font preload mandate.
 *   - AAP Section 0.10.3 — Modal shadow token captured verbatim.
 */

import { test, expect } from '@tests/setup/playwright';
import { waitForInteractive } from '@tests/utils/visual';

test.describe('Link Accounts Modal (Microsoft) [visual]', () => {
    test('matches Figma baseline @visual', async ({ modalPage }) => {
        // Open the Microsoft variant of the Link Accounts modal.
        // `ModalPage.open('microsoft')` navigates to
        // ROUTES.linkAccountsMicrosoft (/sso/link-accounts?provider=microsoft)
        // and waits for the `data-testid="link-accounts-modal"`
        // root to be visible before returning.
        await modalPage.open('microsoft');

        // Synchronise to screenshot-ready state. Modals carry an
        // open animation (AAP § 0.4.2 specifies <200 ms to first
        // paint of the modal), and we must wait for the modal to
        // fully settle into its open position before capturing.
        // The double-rAF settle inside waitForInteractive plus
        // Playwright's `animations: 'disabled'` option below
        // collaborate to neutralise modal-open animation flake.
        await waitForInteractive(modalPage.page);

        // Capture and compare against the per-viewport baseline. The
        // 1104×854 desktop baseline crop matches the Figma modal
        // export dimension exactly, so any horizontal/vertical
        // offset between the rendered modal and the baseline will
        // surface as a clearly-localised pixel diff in the report.
        await expect(modalPage.page).toHaveScreenshot('link-accounts-microsoft.png', {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
        });
    });
});
