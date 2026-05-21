/**
 * Visual regression spec — Sign in - C (See more / collapsed state).
 *
 * Figma frame: 15001:42082
 * Route:       ROUTES.signinC  →  /sso/sign-in/providers
 * Baselines:   tests/visual/baselines/{desktop,tablet,mobile}/signin-c-see-more.png
 *
 * Sign-in C is the multi-provider variant of the sign-in screen
 * whose provider list is initially collapsed to two entries
 * (Microsoft + Google) plus a "See more" affordance with a
 * chevron-down indicator. Clicking "See more" expands the list to
 * its full complement (captured by the sibling
 * `signin-c-expanded.spec.ts`); this spec captures the COLLAPSED
 * state as the user first lands on the route.
 *
 * Cross-browser × cross-viewport matrix:
 *   Runs against all nine `playwright.config.ts` projects.
 *   `snapshotPathTemplate` plus per-project `snapshotDir` route the
 *   single `toHaveScreenshot` call to three baselines:
 *
 *     tests/visual/baselines/desktop/signin-c-see-more.png
 *     tests/visual/baselines/tablet/signin-c-see-more.png
 *     tests/visual/baselines/mobile/signin-c-see-more.png
 *
 *   The desktop baseline is sourced directly from Figma frame
 *   15001:42082; tablet and mobile baselines are generated on first
 *   run per AAP Section 0.10.5.
 *
 * Tag: `@visual`
 *
 * Authority:
 *   - AAP Section 0.4.2 — Sign in - C test-case blueprint.
 *   - AAP Section 0.5.1 — `tests/visual/signin-c-see-more.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Visual regression ≤ 0.1% mismatch gate.
 *   - AAP Section 0.10.2 — Inter font preload mandate.
 *   - AAP Section 0.10.3 — Figma is source of truth for provider list.
 */

import { test, expect } from '@tests/setup/playwright';
import { waitForInteractive } from '@tests/utils/visual';

test.describe('Sign in - C (See more / collapsed) [visual]', () => {
    test('matches Figma baseline @visual', async ({ loginPage }) => {
        // Navigate to the Sign-in C route. `LoginPage.navigate('c')`
        // resolves to ROUTES.signinC (/sso/sign-in/providers) and
        // awaits the form's visibility. Crucially, the collapsed
        // state is the DEFAULT state of the route — no further
        // interaction is required.
        await loginPage.navigate('c');

        // Synchronise to screenshot-ready state. The collapsed
        // provider list renders two provider buttons plus a "See
        // more" button — the double-rAF settle inside
        // waitForInteractive ensures any post-mount layout
        // recalculation completes before capture.
        await waitForInteractive(loginPage.page);

        // Capture the collapsed-state screenshot.
        await expect(loginPage.page).toHaveScreenshot('signin-c-see-more.png', {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
        });
    });
});
