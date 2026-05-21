/**
 * Visual regression spec — Sign in - B (Microsoft + Google).
 *
 * Figma frame: 15001:41988
 * Route:       ROUTES.signinB  →  /sso/sign-in/multi
 * Baselines:   tests/visual/baselines/{desktop,tablet,mobile}/signin-b-microsoft-google.png
 *
 * Sign-in B is the two-provider variant of the canonical sign-in
 * screen. It composes the same Email + Password fields and primary
 * "Sign in" submit button as Sign-in A, and then ADDS a Google
 * provider button immediately below the Microsoft button (column gap
 * 16 px per Figma layout token). The separator copy reads "or sign in
 * with" (versus "or" in Sign-in A) — this is the smallest visual
 * delta between A and B.
 *
 * Cross-browser × cross-viewport matrix:
 *   Runs against all nine `playwright.config.ts` projects (Chromium /
 *   Firefox / WebKit × desktop / tablet / mobile). The
 *   `snapshotPathTemplate: '{snapshotDir}/{arg}{ext}'` config option
 *   plus the per-project `snapshotDir` constants dispatch the single
 *   `toHaveScreenshot('signin-b-microsoft-google.png', ...)` call to
 *   the three viewport-specific baselines under
 *   `tests/visual/baselines/{desktop,tablet,mobile}/`.
 *
 * Tag: `@visual`
 *   Matched by `npm run test:visual` (Playwright `--grep @visual`).
 *
 * Authority:
 *   - AAP Section 0.4.2 — Sign in - B test-case blueprint.
 *   - AAP Section 0.5.1 — `tests/visual/signin-b.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Visual regression ≤ 0.1% mismatch gate.
 *   - AAP Section 0.9.1 — `test:visual` script body uses `--grep @visual`.
 *   - AAP Section 0.10.2 — Inter font preload mandate.
 */

import { test, expect } from '@tests/setup/playwright';
import { waitForInteractive } from '@tests/utils/visual';

test.describe('Sign in - B (Microsoft + Google) [visual]', () => {
    test('matches Figma baseline @visual', async ({ loginPage }) => {
        // Navigate to the Sign-in B route. `LoginPage.navigate('b')`
        // resolves to ROUTES.signinB (/sso/sign-in/multi) and awaits
        // `data-testid="signin-form"` visibility before returning.
        await loginPage.navigate('b');

        // Synchronise to a screenshot-ready state. networkidle → fonts
        // ready → double-rAF settle eliminates the common sources of
        // baseline flake when two provider buttons rendering side-by-
        // side could yield slightly different paint timing.
        await waitForInteractive(loginPage.page);

        // Capture and compare against the per-viewport baseline. The
        // explicit `fullPage`, `animations`, and `caret` options
        // mirror the `playwright.config.ts` `expect.toHaveScreenshot`
        // defaults but are re-declared here so a future config tweak
        // cannot silently change spec behaviour.
        await expect(loginPage.page).toHaveScreenshot('signin-b-microsoft-google.png', {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
        });
    });
});
