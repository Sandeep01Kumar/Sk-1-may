/**
 * Playwright fixture extensions for E2E, visual, and accessibility specs.
 *
 * This module extends `@playwright/test`'s `test` with four custom
 * fixtures — `axeBuilder`, `loginPage`, `signupPage`, `modalPage` —
 * that encapsulate the recurring page-object logic across every SSO
 * test spec. Specs import `test` and `expect` from this module
 * (NEVER from `@playwright/test` directly) so the fixtures are wired
 * in automatically.
 *
 * --------------------------------------------------------------------------
 * Fixture catalog (matches QA Issue 2)
 * --------------------------------------------------------------------------
 *
 *   axeBuilder
 *     A fresh `AxeBuilder` instance scoped to the current `page` and
 *     pre-configured with `WCAG_22_AA_TAGS`. Specs call
 *     `axeBuilder.analyze()` to scan the current page and assert zero
 *     violations.
 *
 *   loginPage
 *     Page object for the three Sign-in screens (A, B, C). Exposes
 *     `navigate(variant)` to load the matching route, plus form
 *     helpers (`fillEmail`, `fillPassword`, `submit`,
 *     `togglePasswordVisibility`), social-button helpers
 *     (`clickMicrosoftButton`, `clickGoogleButton`,
 *     `clickProviderButton`), and the See-more expansion helper
 *     (`expandProviderList`). Locator properties (`emailInput`,
 *     `passwordInput`, `submitButton`, etc.) are pre-bound to
 *     `data-testid` selectors so specs do not need to repeat them.
 *
 *   signupPage
 *     Page object for the Registration Completion form. Exposes
 *     `navigate()`, `fillRegistrationFields(fields)`, and `submit()`.
 *
 *   modalPage
 *     Page object for the Link Accounts modal. Exposes `open(variant)`
 *     to load either the Microsoft or generic variant, plus the
 *     modal-internal helpers `close`, `tab`, `shiftTab`, `escape`,
 *     `clickOverlay`, `fillPassword`, `confirm`, `cancel`. The modal
 *     root locator uses `data-testid="link-accounts-modal"` per the
 *     AAP § 0.4.2 spec.
 *
 * --------------------------------------------------------------------------
 * Test-id selector contract
 * --------------------------------------------------------------------------
 *
 * The fixtures rely on `data-testid` attributes the SSO components are
 * required to expose. The complete contract is enumerated below — when
 * the implementation cycle authors the components, these attributes
 * MUST appear at the noted positions:
 *
 *   Sign-in screens:
 *     - data-testid="signin-form"             on the <form> root
 *     - data-testid="signin-email"            on the email <input>
 *     - data-testid="signin-password"         on the password <input>
 *     - data-testid="signin-submit"           on the primary "Sign in" button
 *     - data-testid="signin-password-toggle"  on the password show/hide button
 *     - data-testid="signin-provider-microsoft" on the Microsoft button
 *     - data-testid="signin-provider-google"    on the Google button
 *     - data-testid="signin-provider-{id}"      on each provider button
 *     - data-testid="signin-see-more"         on the See-more affordance
 *
 *   Registration completion:
 *     - data-testid="registration-form"           on the <form> root
 *     - data-testid="registration-field-{name}"   on each <input>
 *     - data-testid="registration-submit"         on the submit button
 *
 *   Link Accounts modal:
 *     - data-testid="link-accounts-modal"         on the modal root
 *     - data-testid="link-accounts-overlay"       on the overlay element
 *     - data-testid="link-accounts-password"      on the password <input>
 *     - data-testid="link-accounts-confirm"       on the "Link accounts" button
 *     - data-testid="link-accounts-cancel"        on the Cancel button
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.4.2 — Per-screen test-case blueprints.
 *   - AAP Section 0.4.4 — Mock Object Specifications.
 *   - AAP Section 0.5.1 — File row for `tests/setup/playwright.ts`.
 *   - QA Issue 2 — File missing.
 */

import { test as base, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { OAUTH_ENDPOINTS, ROUTES, WCAG_22_AA_TAGS } from '@tests/setup/global';

// =============================================================================
// LOCATOR HELPERS
// =============================================================================

/**
 * Convenience: build a `data-testid` locator on the given page.
 *
 * Centralising the selector format here so that if Playwright ever
 * recommends a different convention (e.g., `getByTestId(...)`) we
 * change one helper instead of every page-object call site.
 *
 * Note: `page.getByTestId(...)` is Playwright's canonical helper and
 * uses the `testIdAttribute` configured in `playwright.config.ts`. We
 * use it here directly so the resolved attribute name matches the
 * project-wide config without duplication.
 */
function byTestId(page: Page, id: string): Locator {
    return page.getByTestId(id);
}

// =============================================================================
// LOGIN PAGE OBJECT
// =============================================================================

/**
 * The three SignIn variants per the Figma frames.
 *
 *   - `'a'` — Microsoft only          (Figma 15001:41875)
 *   - `'b'` — Microsoft + Google      (Figma 15001:41988)
 *   - `'c'` — See more (collapsed)    (Figma 15001:42082)
 */
export type SignInVariant = 'a' | 'b' | 'c';

/**
 * Page object for the SignIn screens.
 *
 * All methods are async — Playwright fixture lifecycle requires
 * promise-returning operations so the test runner can correctly serialise
 * actions and `await` retries.
 */
export class LoginPage {
    constructor(public readonly page: Page) {}

    // -------------------------------------------------------------------------
    // Locators
    // -------------------------------------------------------------------------

    get form(): Locator {
        return byTestId(this.page, 'signin-form');
    }
    get emailInput(): Locator {
        return byTestId(this.page, 'signin-email');
    }
    get passwordInput(): Locator {
        return byTestId(this.page, 'signin-password');
    }
    get submitButton(): Locator {
        return byTestId(this.page, 'signin-submit');
    }
    get passwordToggle(): Locator {
        return byTestId(this.page, 'signin-password-toggle');
    }
    get microsoftButton(): Locator {
        return byTestId(this.page, 'signin-provider-microsoft');
    }
    get googleButton(): Locator {
        return byTestId(this.page, 'signin-provider-google');
    }
    get seeMoreButton(): Locator {
        return byTestId(this.page, 'signin-see-more');
    }
    providerButton(id: string): Locator {
        return byTestId(this.page, `signin-provider-${id}`);
    }

    // -------------------------------------------------------------------------
    // Navigation
    // -------------------------------------------------------------------------

    /**
     * Navigate to the SignIn screen for the given variant.
     *
     * Resolves the route from `tests/setup/global.ts ROUTES` so any
     * future route change is reflected in a single place.
     */
    async navigate(variant: SignInVariant): Promise<void> {
        const route =
            variant === 'a' ? ROUTES.signinA : variant === 'b' ? ROUTES.signinB : ROUTES.signinC;
        await this.page.goto(route);
        // Wait for the form to be present before returning so subsequent
        // interactions do not race with React hydration.
        await this.form.waitFor({ state: 'visible' });
    }

    // -------------------------------------------------------------------------
    // Form interaction
    // -------------------------------------------------------------------------

    /**
     * Type the given email into the email input.
     *
     * Uses `fill(...)` which clears the input first — convenient when
     * a previous test left residual text in a long-lived dev-server
     * session (though Playwright per-test isolation usually prevents this).
     */
    async fillEmail(email: string): Promise<void> {
        await this.emailInput.fill(email);
    }

    /**
     * Type the given password into the password input.
     */
    async fillPassword(password: string): Promise<void> {
        await this.passwordInput.fill(password);
    }

    /**
     * Click the primary "Sign in" submit button.
     *
     * Returns once the click handler has fired; the spec is responsible
     * for awaiting any subsequent navigation or DOM update.
     */
    async submit(): Promise<void> {
        await this.submitButton.click();
    }

    /**
     * Click the password show/hide toggle.
     *
     * Each call flips the input's `type` attribute between `password`
     * and `text`. Tests can assert `aria-pressed` updates by inspecting
     * the toggle locator after the click resolves.
     */
    async togglePasswordVisibility(): Promise<void> {
        await this.passwordToggle.click();
    }

    // -------------------------------------------------------------------------
    // Social-provider interaction
    // -------------------------------------------------------------------------

    /**
     * Click the Microsoft provider button.
     *
     * Triggers the SUT's OAuth flow which opens a pop-up to the
     * Microsoft authorize endpoint. The pop-up handling is mocked at
     * the network layer via `tests/mocks/handlers/auth.ts`.
     */
    async clickMicrosoftButton(): Promise<void> {
        await this.microsoftButton.click();
    }

    /**
     * Click the Google provider button.
     */
    async clickGoogleButton(): Promise<void> {
        await this.googleButton.click();
    }

    /**
     * Click an arbitrary provider button by id (apple, github, gitlab, okta).
     */
    async clickProviderButton(id: string): Promise<void> {
        await this.providerButton(id).click();
    }

    /**
     * Click the See-more affordance on Sign-in C to reveal the full
     * list of providers.
     */
    async expandProviderList(): Promise<void> {
        await this.seeMoreButton.click();
    }
}

// =============================================================================
// SIGNUP PAGE OBJECT
// =============================================================================

/**
 * Shape of the Registration Completion form fields.
 *
 * Only the keys the spec wants to fill are required — `fillRegistrationFields`
 * iterates over the supplied fields and skips undefined values.
 */
export interface RegistrationFields {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms?: boolean;
}

/**
 * Page object for the Registration Completion form.
 */
export class SignupPage {
    constructor(public readonly page: Page) {}

    // -------------------------------------------------------------------------
    // Locators
    // -------------------------------------------------------------------------

    get form(): Locator {
        return byTestId(this.page, 'registration-form');
    }
    get submitButton(): Locator {
        return byTestId(this.page, 'registration-submit');
    }
    fieldInput(name: string): Locator {
        return byTestId(this.page, `registration-field-${name}`);
    }

    // -------------------------------------------------------------------------
    // Navigation
    // -------------------------------------------------------------------------

    /**
     * Navigate to the Registration Completion form.
     */
    async navigate(): Promise<void> {
        await this.page.goto(ROUTES.registration);
        await this.form.waitFor({ state: 'visible' });
    }

    // -------------------------------------------------------------------------
    // Form interaction
    // -------------------------------------------------------------------------

    /**
     * Fill in the supplied registration fields. Skips any field whose
     * value is `undefined`.
     *
     * For the `acceptTerms` checkbox, `true` checks it and `false`
     * leaves it unchecked. Passing `acceptTerms: undefined` leaves the
     * checkbox in its current state.
     */
    async fillRegistrationFields(fields: RegistrationFields): Promise<void> {
        for (const [key, value] of Object.entries(fields)) {
            if (value === undefined) continue;
            const locator = this.fieldInput(key);
            if (key === 'acceptTerms') {
                if (value === true) {
                    await locator.check();
                } else if (value === false) {
                    await locator.uncheck();
                }
            } else {
                await locator.fill(String(value));
            }
        }
    }

    /**
     * Click the registration submit button.
     */
    async submit(): Promise<void> {
        await this.submitButton.click();
    }
}

// =============================================================================
// MODAL PAGE OBJECT
// =============================================================================

/**
 * The Link Accounts modal variants.
 *
 *   - `'microsoft'` — Figma 16383:42232 — Microsoft-branded variant.
 *   - `'generic'`   — Figma 16383:42287 — provider-agnostic variant.
 */
export type LinkAccountsVariant = 'microsoft' | 'generic';

/**
 * Page object for the Link Accounts modal.
 *
 * The modal root locator uses `data-testid="link-accounts-modal"` per
 * the AAP § 0.4.2 spec.
 */
export class ModalPage {
    constructor(public readonly page: Page) {}

    // -------------------------------------------------------------------------
    // Locators
    // -------------------------------------------------------------------------

    get root(): Locator {
        return byTestId(this.page, 'link-accounts-modal');
    }
    get overlay(): Locator {
        return byTestId(this.page, 'link-accounts-overlay');
    }
    get passwordInput(): Locator {
        return byTestId(this.page, 'link-accounts-password');
    }
    get confirmButton(): Locator {
        return byTestId(this.page, 'link-accounts-confirm');
    }
    get cancelButton(): Locator {
        return byTestId(this.page, 'link-accounts-cancel');
    }

    // -------------------------------------------------------------------------
    // Navigation
    // -------------------------------------------------------------------------

    /**
     * Open the Link Accounts modal at the given variant.
     */
    async open(variant: LinkAccountsVariant): Promise<void> {
        const route =
            variant === 'microsoft' ? ROUTES.linkAccountsMicrosoft : ROUTES.linkAccountsGeneric;
        await this.page.goto(route);
        await this.root.waitFor({ state: 'visible' });
    }

    /**
     * Close the modal by clicking the Cancel button (equivalent to user
     * dismissal). For Escape-key dismissal use `escape()`; for overlay
     * click use `clickOverlay()`.
     */
    async close(): Promise<void> {
        await this.cancelButton.click();
    }

    // -------------------------------------------------------------------------
    // Keyboard interaction (focus trap testing)
    // -------------------------------------------------------------------------

    /**
     * Press Tab to move focus to the next focusable element.
     *
     * A modal with a properly-implemented focus trap should cycle focus
     * back to the first focusable element when Tab is pressed on the
     * last one. Specs assert this by reading the active element's
     * `data-testid` after the press.
     */
    async tab(): Promise<void> {
        await this.page.keyboard.press('Tab');
    }

    /**
     * Press Shift+Tab to move focus to the previous focusable element.
     */
    async shiftTab(): Promise<void> {
        await this.page.keyboard.press('Shift+Tab');
    }

    /**
     * Press Escape to dismiss the modal.
     *
     * A properly-implemented modal should:
     *   1. Close.
     *   2. Restore focus to the element that opened it.
     *   3. Not bubble the Escape event up to the page (preventing
     *      unrelated handlers from firing).
     */
    async escape(): Promise<void> {
        await this.page.keyboard.press('Escape');
    }

    // -------------------------------------------------------------------------
    // Overlay click (dismiss-by-click-outside)
    // -------------------------------------------------------------------------

    /**
     * Click the modal overlay (outside the modal content).
     *
     * Per AAP § 0.4.2, the modal SHOULD dismiss when the overlay is
     * clicked. The click is positioned at the overlay's top-left
     * corner — far enough outside the modal content that the click
     * never lands on a modal-internal element.
     */
    async clickOverlay(): Promise<void> {
        await this.overlay.click({ position: { x: 4, y: 4 } });
    }

    // -------------------------------------------------------------------------
    // Form interaction
    // -------------------------------------------------------------------------

    /**
     * Fill the password confirmation input.
     */
    async fillPassword(password: string): Promise<void> {
        await this.passwordInput.fill(password);
    }

    /**
     * Click the "Link accounts" confirmation button.
     */
    async confirm(): Promise<void> {
        await this.confirmButton.click();
    }

    /**
     * Click the Cancel button. Equivalent to `close()`.
     */
    async cancel(): Promise<void> {
        await this.cancelButton.click();
    }
}

// =============================================================================
// FIXTURE WIRING
// =============================================================================

/**
 * Custom fixtures exposed by the extended `test`.
 *
 * Each fixture is `test`-scoped (created fresh per test) — Playwright's
 * default scope. Worker-scoped fixtures would survive across tests in
 * the same worker and risk cross-test contamination, which we
 * explicitly forbid per AAP § 0.7.2.
 */
export interface SsoFixtures {
    /** Pre-configured AxeBuilder for the current page with WCAG 2.2 AA tags. */
    axeBuilder: AxeBuilder;
    /** Page object for the Sign-in screens. */
    loginPage: LoginPage;
    /** Page object for the Registration Completion form. */
    signupPage: SignupPage;
    /** Page object for the Link Accounts modal. */
    modalPage: ModalPage;
}

/**
 * Extended `test` from `@playwright/test` with our four custom fixtures.
 *
 * Specs import `test` and `expect` from THIS module:
 *
 *   import { test, expect } from '@tests/setup/playwright';
 *
 *   test('user signs in via Microsoft', async ({ loginPage, axeBuilder }) => {
 *     await loginPage.navigate('a');
 *     await loginPage.clickMicrosoftButton();
 *     const results = await axeBuilder.analyze();
 *     expect(results.violations).toEqual([]);
 *   });
 */
export const test = base.extend<SsoFixtures>({
    /**
     * `axeBuilder` — fresh per test, configured with WCAG 2.2 AA tags.
     *
     * The `withTags(...)` call configures axe to scan only WCAG 2.2 AA
     * rules — matches the zero-violation gate defined in AAP § 0.7.3.
     * Specs can chain additional `.include(...)` / `.exclude(...)`
     * calls on the returned builder before calling `.analyze()`.
     */
    axeBuilder: async ({ page }, use) => {
        const builder = new AxeBuilder({ page }).withTags([...WCAG_22_AA_TAGS]);
        await use(builder);
    },

    /**
     * `loginPage` — fresh per test.
     */
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },

    /**
     * `signupPage` — fresh per test.
     */
    signupPage: async ({ page }, use) => {
        await use(new SignupPage(page));
    },

    /**
     * `modalPage` — fresh per test.
     */
    modalPage: async ({ page }, use) => {
        await use(new ModalPage(page));
    },
});

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Re-export `expect` from the base Playwright test runner so specs can
// import both `test` and `expect` from this single module — keeping
// import lines short and ensuring specs never accidentally import the
// non-extended `test`.
export { expect };

// Re-export the OAuth endpoints so E2E specs can construct expected
// URL matchers without importing setup/global directly.
export { OAUTH_ENDPOINTS };
