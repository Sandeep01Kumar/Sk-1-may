/**
 * Visual regression spec — Sign in - A (Microsoft only).
 *
 * Figma frame: 15001:41875
 * Route:       ROUTES.signinA  →  /sso/sign-in
 * Baselines:   tests/visual/baselines/{desktop,tablet,mobile}/signin-a-microsoft-only.png
 *
 * The Figma file (`2qR7NSTmQLynkmlj9B4ltc`) provides the desktop
 * rendering (2880×2048) committed at the canonical path above; the
 * tablet and mobile baselines are generated on first run after design
 * review approves them per AAP Section 0.10.5.
 *
 * Cross-browser × cross-viewport matrix:
 *   This spec runs automatically against every Playwright project
 *   declared in `playwright.config.ts` — three browsers (Chromium,
 *   Firefox, WebKit) × three viewports (desktop, tablet, mobile) = 9
 *   project invocations per file. Each project resolves its baseline
 *   directory via the per-project `snapshotDir` constant, so this
 *   single `toHaveScreenshot('signin-a-microsoft-only.png', ...)`
 *   call dispatches to:
 *
 *     chromium-desktop / firefox-desktop / webkit-desktop
 *         → tests/visual/baselines/desktop/signin-a-microsoft-only.png
 *     chromium-tablet  / firefox-tablet  / webkit-tablet
 *         → tests/visual/baselines/tablet/signin-a-microsoft-only.png
 *     chromium-mobile  / firefox-mobile  / webkit-mobile
 *         → tests/visual/baselines/mobile/signin-a-microsoft-only.png
 *
 *   Each browser at a given viewport compares against ONE baseline so
 *   cross-engine drift surfaces immediately.
 *
 * Tag: `@visual`
 *   The tag is matched by `npm run test:visual` (which maps to
 *   `playwright test --grep @visual`) so visual specs can be run in
 *   isolation without first executing the E2E suite.
 *
 * Implementation note — page object:
 *   This spec uses the `loginPage` fixture exported by
 *   `@tests/setup/playwright`. The fixture navigates to the matching
 *   route, waits for the form to be visible, and exposes the
 *   underlying `page` instance via `loginPage.page` for screenshot
 *   capture.
 *
 * Implementation note — readiness gate:
 *   `waitForInteractive(loginPage.page)` is called before the
 *   screenshot to ensure (1) the network has gone idle, (2) the Inter
 *   font face has loaded (AAP Section 0.10.2), and (3) two animation
 *   frames have settled — eliminating the most common sources of
 *   baseline flake on first-paint comparisons.
 *
 * Authority:
 *   - AAP Section 0.4.2 — Sign in - A test-case blueprint.
 *   - AAP Section 0.5.1 — `tests/visual/signin-a.spec.ts` (CREATE).
 *   - AAP Section 0.5.2 — Visual spec authoring conventions.
 *   - AAP Section 0.7.3 — Visual regression ≤ 0.1% mismatch gate.
 *   - AAP Section 0.9.1 — `test:visual` script body uses `--grep @visual`.
 *   - AAP Section 0.10.2 — Inter font preload mandate.
 *   - AAP Section 0.10.5 — SSO components not yet implemented; visual
 *                          assertions execute fully once the component
 *                          tree materialises.
 */

import { test, expect } from '@tests/setup/playwright';
import { waitForInteractive } from '@tests/utils/visual';

test.describe('Sign in - A (Microsoft only) [visual]', () => {
    test('matches Figma baseline @visual', async ({ loginPage }) => {
        // Navigate to the Sign-in A route. `LoginPage.navigate('a')`
        // resolves to ROUTES.signinA (/sso/sign-in) and awaits the
        // `data-testid="signin-form"` locator's visible state before
        // returning, so the form is mounted by the time control
        // returns here.
        await loginPage.navigate('a');

        // Synchronise to the screenshot-ready state. Order of stages
        // matters — networkidle must precede font-ready (font fetches
        // are subject to the network gate) and font-ready must
        // precede the double-rAF settle (font swap can trigger a
        // reflow that we want to capture in the post-settle frame).
        await waitForInteractive(loginPage.page);

        // Capture and compare against the per-viewport baseline. The
        // `snapshotPathTemplate` (`{snapshotDir}/{arg}{ext}`) resolves
        // the filename against the project-specific `snapshotDir`, so
        // the same call dispatches to three different baselines
        // depending on which Playwright project is executing.
        //
        // Options:
        //   - fullPage: capture the full document, not just the viewport.
        //               This is critical for desktop screens whose hero
        //               panel extends below the fold (2880×2048 baseline).
        //   - animations: redundant with the config default but
        //                  re-declared here so a future config tweak
        //                  doesn't silently change spec behaviour.
        //   - caret:    hide the text-input caret — focused inputs
        //                render identically with or without the caret
        //                and the blinking caret is a notorious flake
        //                source. The Playwright config sets this
        //                globally; we re-declare for documentation.
        await expect(loginPage.page).toHaveScreenshot('signin-a-microsoft-only.png', {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
        });
    });
});
