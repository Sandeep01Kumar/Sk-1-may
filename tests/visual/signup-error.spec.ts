/**
 * Visual regression spec — SignUp Error screen.
 *
 * Figma frame: 15058:34569
 * Route:       ROUTES.signupError  →  /sso/register/error
 * Baselines:   tests/visual/baselines/{desktop,tablet,mobile}/signup-error.png
 *
 * The SignUp Error screen renders the post-failure variant of the
 * registration flow — for example, when a federated provider returns
 * an error payload or when the backend rejects the submitted form. The
 * Figma rendering at frame 15058:34569 is the canonical layout
 * captured at desktop resolution (2880×2048); it shows the error
 * banner copy, the "Create account" affordance that remains
 * actionable, and the underlying form fields preserving their last
 * input.
 *
 * Page object:
 *   The error screen is not opened via an existing fixture (the
 *   AAP § 0.4.2 blueprint treats it as a navigation target, not a
 *   page-object surface). We therefore use the `page` fixture
 *   directly and `page.goto(ROUTES.signupError)` for navigation,
 *   then synchronise via `waitForInteractive(page)` before
 *   capturing the screenshot.
 *
 * Cross-browser × cross-viewport matrix:
 *   Runs against all nine `playwright.config.ts` projects.
 *
 * Tag: `@visual`
 *
 * Authority:
 *   - AAP Section 0.4.2 — SignUp Error blueprint.
 *   - AAP Section 0.5.1 — `tests/visual/signup-error.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Visual regression ≤ 0.1% mismatch gate.
 *   - AAP Section 0.10.2 — Inter font preload mandate.
 */

import { test, expect } from '@tests/setup/playwright';
import { waitForInteractive } from '@tests/utils/visual';
import { ROUTES } from '@tests/setup/global';

test.describe('SignUp Error [visual]', () => {
    test('matches Figma baseline @visual', async ({ page }) => {
        // Navigate to the SignUp Error route directly. Unlike the
        // sign-in / registration / link-accounts screens, the error
        // variant does not have a dedicated page-object fixture —
        // its testing surface is purely visual + screen-reader
        // assertions. We use the raw `page` fixture and rely on
        // `waitForInteractive` to gate the screenshot capture.
        await page.goto(ROUTES.signupError);

        // Synchronise to screenshot-ready state. The error banner
        // is a static element with no inbound animations once the
        // page mounts, but the standard pipeline (networkidle →
        // fonts ready → double-rAF) still applies because:
        //
        //   - networkidle catches any in-flight font fetch
        //   - fonts.ready ensures Inter is resolved before the
        //     error banner copy is rendered with its final pixel
        //     footprint
        //   - double-rAF absorbs any post-mount layout pass
        await waitForInteractive(page);

        // Capture the screenshot.
        await expect(page).toHaveScreenshot('signup-error.png', {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
        });
    });
});
