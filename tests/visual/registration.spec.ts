/**
 * Visual regression spec — Registration Completion Form.
 *
 * Figma frame: 14980:28342
 * Route:       ROUTES.registration  →  /sso/register/complete
 * Baselines:   tests/visual/baselines/{desktop,tablet,mobile}/registration-completion.png
 *
 * The Registration Completion form is the post-OAuth completion screen
 * shown after a federated identity provider returns user metadata that
 * still needs the user to fill in any missing required fields (first
 * name, last name, company, password rules, terms acceptance, etc.).
 * The Figma rendering at frame 14980:28342 is the canonical layout
 * captured at desktop resolution (2880×2048).
 *
 * Cross-browser × cross-viewport matrix:
 *   Runs against all nine `playwright.config.ts` projects (Chromium /
 *   Firefox / WebKit × desktop / tablet / mobile).
 *
 * Tag: `@visual`
 *
 * Authority:
 *   - AAP Section 0.4.2 — Registration Completion Form blueprint.
 *   - AAP Section 0.5.1 — `tests/visual/registration.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Visual regression ≤ 0.1% mismatch gate.
 *   - AAP Section 0.10.2 — Inter font preload mandate.
 */

import { test, expect } from '@tests/setup/playwright';
import { waitForInteractive } from '@tests/utils/visual';

test.describe('Registration Completion Form [visual]', () => {
    test('matches Figma baseline @visual', async ({ signupPage }) => {
        // Navigate to the registration completion route. The
        // `SignupPage.navigate()` helper goes to ROUTES.registration
        // (/sso/register/complete) and waits for the form's
        // `data-testid="registration-form"` to be visible.
        await signupPage.navigate();

        // Synchronise to screenshot-ready state. The registration
        // form has multiple inputs, a checkbox for terms acceptance,
        // and a primary submit button — the double-rAF settle inside
        // waitForInteractive ensures the layout has converged before
        // the screenshot is captured.
        await waitForInteractive(signupPage.page);

        // Capture and compare against the per-viewport baseline.
        await expect(signupPage.page).toHaveScreenshot('registration-completion.png', {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
        });
    });
});
