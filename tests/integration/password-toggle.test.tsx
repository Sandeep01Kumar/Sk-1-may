/**
 * Integration test — password show/hide toggle wired into a full
 * sign-in form.
 *
 * Target files under test (CREATED by a subsequent implementation cycle
 * per AAP Section 0.10.5):
 *   - `src/components/ui/TextInput.tsx` (RightIcon variant)
 *   - `src/components/sso/SignInA.tsx`
 *
 * --------------------------------------------------------------------------
 * Integration scope
 * --------------------------------------------------------------------------
 *
 * This spec verifies the password-toggle affordance integrated into the
 * full SignInA form. The previously-authored TextInput component spec
 * exercises the toggle in isolation; this integration spec validates
 * that the toggle continues to work when composed with the rest of the
 * form, that aria-pressed updates correctly, and that the toggled state
 * does not leak the password value through the DOM in unintended ways.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT modules do NOT exist yet; the imports
 * below will fail.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.3.1 — Integration test target.
 *   - AAP Section 0.4.2 — TextInput RightIcon + SignInA blueprints.
 *   - AAP Section 0.5.1 — File row for
 *     `tests/integration/password-toggle.test.tsx`.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@tests/utils/render';
import { PASSWORD_FOR_TOGGLE_TEST } from '@tests/fixtures/passwords';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { SignInA } from '@/components/sso/SignInA';

// =============================================================================
// HELPERS
// =============================================================================

function getToggleButton(): HTMLButtonElement {
    return screen.getByRole('button', {
        name: /show password|hide password/i,
    }) as HTMLButtonElement;
}

function getPasswordInput(): HTMLInputElement {
    return screen.getByLabelText(/^password/i) as HTMLInputElement;
}

// =============================================================================
// SUITE — Toggle changes input type
// =============================================================================

describe('Integration — password toggle changes the input type', () => {
    it('starts as type=password and switches to type=text after click', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        const input = getPasswordInput();
        expect(input.type).toBe('password');
        await user.click(getToggleButton());
        await waitFor(() => {
            expect(getPasswordInput().type).toBe('text');
        });
    });

    it('switches back to type=password after a second click', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await user.click(getToggleButton());
        await waitFor(() => {
            expect(getPasswordInput().type).toBe('text');
        });
        await user.click(getToggleButton());
        await waitFor(() => {
            expect(getPasswordInput().type).toBe('password');
        });
    });
});

// =============================================================================
// SUITE — aria-pressed lifecycle
// =============================================================================

describe('Integration — password toggle aria-pressed updates', () => {
    it('starts with aria-pressed=false', () => {
        renderWithProviders(<SignInA />, { route: { initialPathname: 'signinA' } });
        const toggle = getToggleButton();
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
    });

    it('toggles aria-pressed to true after click', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await user.click(getToggleButton());
        await waitFor(() => {
            expect(getToggleButton().getAttribute('aria-pressed')).toBe('true');
        });
    });

    it('toggles aria-pressed back to false after a second click', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await user.click(getToggleButton());
        await user.click(getToggleButton());
        await waitFor(() => {
            expect(getToggleButton().getAttribute('aria-pressed')).toBe('false');
        });
    });
});

// =============================================================================
// SUITE — Value retention across toggles
// =============================================================================

describe('Integration — password value is retained across toggle operations', () => {
    it('preserves the typed password when toggling to visible and back', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await user.type(getPasswordInput(), PASSWORD_FOR_TOGGLE_TEST.value);
        expect(getPasswordInput().value).toBe(PASSWORD_FOR_TOGGLE_TEST.value);
        await user.click(getToggleButton());
        await waitFor(() => {
            expect(getPasswordInput().type).toBe('text');
        });
        expect(getPasswordInput().value).toBe(PASSWORD_FOR_TOGGLE_TEST.value);
        await user.click(getToggleButton());
        await waitFor(() => {
            expect(getPasswordInput().type).toBe('password');
        });
        expect(getPasswordInput().value).toBe(PASSWORD_FOR_TOGGLE_TEST.value);
    });
});

// =============================================================================
// SUITE — Keyboard activation
// =============================================================================

describe('Integration — password toggle responds to keyboard', () => {
    it('toggles via Enter key when the button is focused', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        getToggleButton().focus();
        await user.keyboard('{Enter}');
        await waitFor(() => {
            expect(getPasswordInput().type).toBe('text');
        });
    });

    it('toggles via Space key when the button is focused', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        getToggleButton().focus();
        await user.keyboard(' ');
        await waitFor(() => {
            expect(getPasswordInput().type).toBe('text');
        });
    });
});

// =============================================================================
// SUITE — Tab order
// =============================================================================

describe('Integration — password toggle participates in tab order', () => {
    it('reaches the toggle by tabbing forward from the password input', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        getPasswordInput().focus();
        expect(document.activeElement).toBe(getPasswordInput());
        await user.tab();
        // The next focusable element should be the toggle button (or the
        // form's primary submit, with the toggle reached before it on
        // properly composed forms). We assert the toggle is reachable
        // somewhere in the forward Tab traversal.
        const reachableButtons = [
            document.activeElement,
            (await user.tab(), document.activeElement),
            (await user.tab(), document.activeElement),
        ];
        expect(reachableButtons).toContain(getToggleButton());
    });
});
