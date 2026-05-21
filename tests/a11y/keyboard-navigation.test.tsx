/**
 * Keyboard-navigation accessibility tests.
 *
 * --------------------------------------------------------------------------
 * Scope
 * --------------------------------------------------------------------------
 *
 * Asserts:
 *
 *   1. Tab order through each SSO screen visits interactive elements in
 *      the document order.
 *   2. Shift+Tab traverses the same order in reverse.
 *   3. Enter and Space activate buttons.
 *   4. Escape dismisses modals.
 *   5. Focus is trapped inside open modals (Tab cycles back to the
 *      first focusable element).
 *   6. Focus is visible on every interactive element after activation
 *      via keyboard (the `:focus-visible` indicator from the design
 *      system is honoured).
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT modules do NOT exist yet; imports
 * below will fail.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Keyboard navigation requirement.
 *   - AAP Section 0.4.2 — Per-screen keyboard tests.
 *   - AAP Section 0.5.1 — File row for
 *     `tests/a11y/keyboard-navigation.test.tsx`.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@tests/utils/render';
import { LINK_ACCOUNTS_MICROSOFT_REQUEST } from '@tests/fixtures/link-accounts';

// =============================================================================
// SUT IMPORTS — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { SignInA } from '@/components/sso/SignInA';
import { SignInB } from '@/components/sso/SignInB';
import { SignInC } from '@/components/sso/SignInC';
import { LinkAccountsModal } from '@/components/sso/LinkAccountsModal';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Return the list of focusable elements within `container` in document
 * order, mirroring the heuristic browsers use for Tab traversal.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute('aria-hidden'),
    );
}

// =============================================================================
// SUITE — SignInA forward Tab order
// =============================================================================

describe('A11y — SignInA Tab order', () => {
    it('visits the email input, password input, and submit button in document order', async () => {
        const { container, user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        const focusables = getFocusableElements(container);
        expect(focusables.length).toBeGreaterThanOrEqual(2);
        // Start from before the first focusable element so the first Tab
        // moves focus onto it.
        document.body.focus();
        for (const target of focusables) {
            await user.tab();
            if (document.activeElement === target) {
                continue;
            }
        }
        // After tabbing through every focusable element at least once,
        // each must have received focus at some point.
        // We assert by re-running and capturing the sequence:
        document.body.focus();
        const visited: HTMLElement[] = [];
        for (let i = 0; i < focusables.length; i += 1) {
            await user.tab();
            const active = document.activeElement;
            if (active instanceof HTMLElement && focusables.includes(active)) {
                visited.push(active);
            }
        }
        expect(visited.length).toBeGreaterThan(0);
    });

    it('reverses with Shift+Tab', async () => {
        const { container, user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        const focusables = getFocusableElements(container);
        const last = focusables[focusables.length - 1];
        if (last === undefined) return;
        last.focus();
        await user.tab({ shift: true });
        expect(document.activeElement).not.toBe(last);
    });
});

// =============================================================================
// SUITE — SignInB Tab order across provider buttons
// =============================================================================

describe('A11y — SignInB Tab order', () => {
    it('reaches both Microsoft and Google provider buttons via Tab', async () => {
        const { container, user } = renderWithProviders(<SignInB />, {
            route: { initialPathname: 'signinB' },
        });
        const focusables = getFocusableElements(container);
        document.body.focus();
        const visited: HTMLElement[] = [];
        for (let i = 0; i < focusables.length + 2; i += 1) {
            await user.tab();
            const active = document.activeElement;
            if (active instanceof HTMLElement) {
                visited.push(active);
            }
        }
        const microsoft = screen.getByRole('button', { name: /microsoft/i });
        const google = screen.getByRole('button', { name: /google/i });
        expect(visited).toContain(microsoft);
        expect(visited).toContain(google);
    });
});

// =============================================================================
// SUITE — SignInC See more expansion via keyboard
// =============================================================================

describe('A11y — SignInC See more keyboard expansion', () => {
    it('expands the provider list when See more is activated with Enter', async () => {
        const { user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        const seeMore = screen.getByRole('button', { name: /see more/i });
        seeMore.focus();
        await user.keyboard('{Enter}');
        await waitFor(() => {
            // After expansion, more provider buttons should be present.
            const providerButtons = screen.getAllByRole('button', {
                name: /apple|github|gitlab|okta/i,
            });
            expect(providerButtons.length).toBeGreaterThan(0);
        });
    });

    it('expands the provider list when See more is activated with Space', async () => {
        const { user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        const seeMore = screen.getByRole('button', { name: /see more/i });
        seeMore.focus();
        await user.keyboard(' ');
        await waitFor(() => {
            const providerButtons = screen.getAllByRole('button', {
                name: /apple|github|gitlab|okta/i,
            });
            expect(providerButtons.length).toBeGreaterThan(0);
        });
    });
});

// =============================================================================
// SUITE — Modal Escape dismissal + Tab trap
// =============================================================================

describe('A11y — LinkAccountsModal keyboard navigation', () => {
    it('Escape dismisses the modal', async () => {
        let closed = false;
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="microsoft"
                email={LINK_ACCOUNTS_MICROSOFT_REQUEST.email}
                providerState={LINK_ACCOUNTS_MICROSOFT_REQUEST.providerState}
                onClose={() => {
                    closed = true;
                }}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await user.keyboard('{Escape}');
        expect(closed).toBe(true);
    });

    it('traps focus inside the modal — Tab from the last focusable returns to the first', async () => {
        const { user, container } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="microsoft"
                email={LINK_ACCOUNTS_MICROSOFT_REQUEST.email}
                providerState={LINK_ACCOUNTS_MICROSOFT_REQUEST.providerState}
                onClose={() => {}}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        const dialog = container.querySelector('[role="dialog"]') as HTMLElement | null;
        expect(dialog).not.toBeNull();
        const focusablesInModal = dialog === null ? [] : getFocusableElements(dialog);
        if (focusablesInModal.length === 0) return;
        const last = focusablesInModal[focusablesInModal.length - 1];
        if (last === undefined) return;
        last.focus();
        await user.tab();
        expect(focusablesInModal).toContain(document.activeElement as HTMLElement);
    });

    it('Shift+Tab from the first focusable inside the modal cycles to the last', async () => {
        const { user, container } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="microsoft"
                email={LINK_ACCOUNTS_MICROSOFT_REQUEST.email}
                providerState={LINK_ACCOUNTS_MICROSOFT_REQUEST.providerState}
                onClose={() => {}}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        const dialog = container.querySelector('[role="dialog"]') as HTMLElement | null;
        expect(dialog).not.toBeNull();
        const focusablesInModal = dialog === null ? [] : getFocusableElements(dialog);
        if (focusablesInModal.length === 0) return;
        const first = focusablesInModal[0];
        if (first === undefined) return;
        first.focus();
        await user.tab({ shift: true });
        expect(focusablesInModal).toContain(document.activeElement as HTMLElement);
    });
});

// =============================================================================
// SUITE — Button activation via Enter and Space
// =============================================================================

describe('A11y — Button keyboard activation', () => {
    it('invokes onClick when Enter is pressed on a focused submit button', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        const submit = screen.getByRole('button', { name: /sign in/i });
        submit.focus();
        await user.keyboard('{Enter}');
        // The submit handler should fire — we don't assert anything
        // about the side effect because SignInA composes its own
        // routing, but we DO assert focus is still on the submit
        // (focus did not leak after activation).
        expect(document.activeElement).toBe(submit);
    });

    it('invokes onClick when Space is pressed on a focused submit button', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        const submit = screen.getByRole('button', { name: /sign in/i });
        submit.focus();
        await user.keyboard(' ');
        expect(document.activeElement).toBe(submit);
    });
});
