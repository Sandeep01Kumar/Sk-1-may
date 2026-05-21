/**
 * Visual regression spec — Sign in - C (Expanded providers).
 *
 * Figma frame: 15001:42214
 * Route:       ROUTES.signinC  →  /sso/sign-in/providers (with See-more clicked)
 * Baselines:   tests/visual/baselines/{desktop,tablet,mobile}/signin-c-expanded.png
 *
 * Sign-in C Expanded is the post-interaction state of Sign-in C
 * reached by clicking the "See more" affordance from the collapsed
 * state. It reveals the full provider list (Microsoft, Google, plus
 * additional providers per the Figma source) and replaces "See more"
 * with a "See less" affordance carrying a chevron-up indicator.
 *
 * Provider-list authoritative source:
 *   The Figma source (frame 15001:42214) is the canonical
 *   specification of which providers appear in the expanded list
 *   and in what order. AAP Section 0.10.3 establishes Figma as the
 *   source of truth, so the desktop baseline committed at
 *   `tests/visual/baselines/desktop/signin-c-expanded.png` (sourced
 *   directly from Figma via download_figma_images) is the
 *   authoritative reference — NOT any prose description of the
 *   provider count or order in checkpoint documentation. The
 *   expanded variant captured in the baseline shows the provider
 *   list as rendered in Figma at the time the baseline was
 *   committed.
 *
 * State transition:
 *   This spec exercises the same route as `signin-c-see-more.spec.ts`
 *   but additionally clicks the "See more" affordance to drive the
 *   component into its expanded state before capturing the
 *   screenshot. The `LoginPage.expandProviderList()` helper performs
 *   the click against `data-testid="signin-see-more"`.
 *
 * Cross-browser × cross-viewport matrix:
 *   Runs against all nine `playwright.config.ts` projects. Each
 *   project compares against the viewport-specific baseline through
 *   the `snapshotPathTemplate` indirection.
 *
 * Tag: `@visual`
 *
 * Authority:
 *   - AAP Section 0.4.2 — Sign in - C test-case blueprint.
 *   - AAP Section 0.5.1 — `tests/visual/signin-c-expanded.spec.ts` (CREATE).
 *   - AAP Section 0.7.3 — Visual regression ≤ 0.1% mismatch gate.
 *   - AAP Section 0.10.2 — Inter font preload mandate.
 *   - AAP Section 0.10.3 — Figma is source of truth (provider list).
 *   - AAP Section 0.10.5 — SSO components not yet implemented; visual
 *                          assertions execute fully once the component
 *                          tree materialises.
 */

import { test, expect } from '@tests/setup/playwright';
import { waitForInteractive } from '@tests/utils/visual';

test.describe('Sign in - C (Expanded providers) [visual]', () => {
    test('matches Figma baseline @visual', async ({ loginPage }) => {
        // Navigate to the Sign-in C route in its collapsed state.
        // Same starting point as signin-c-see-more.spec.ts.
        await loginPage.navigate('c');

        // Pre-interaction synchronisation. Waiting for interactivity
        // BEFORE the click ensures the See-more button has settled
        // into its idle layout — clicking a button that is still
        // mid-layout can produce a misclick or a flake.
        await waitForInteractive(loginPage.page);

        // Drive the expansion. `expandProviderList()` clicks the
        // `data-testid="signin-see-more"` affordance which is
        // expected to mount the additional provider buttons and
        // swap the chevron-down for chevron-up plus update the
        // visible label to "See less".
        //
        // The AAP § 0.4.2 expectation states the expansion animation
        // takes under 250 ms; the post-interaction waitForInteractive
        // below absorbs that animation plus any reflow.
        await loginPage.expandProviderList();

        // Post-expansion synchronisation. Critical here — the
        // expansion almost certainly triggers a CSS transition or
        // a layout reflow, and we want the screenshot to capture
        // the SETTLED expanded state, not a mid-animation frame.
        // The `animations: 'disabled'` Playwright option below is
        // belt-and-suspenders coverage for the same concern.
        await waitForInteractive(loginPage.page);

        // Capture the expanded-state screenshot.
        await expect(loginPage.page).toHaveScreenshot('signin-c-expanded.png', {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
        });
    });
});
