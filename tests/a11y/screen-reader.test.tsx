/**
 * Screen-reader / ARIA-attribute accessibility tests.
 *
 * --------------------------------------------------------------------------
 * Scope
 * --------------------------------------------------------------------------
 *
 * Asserts that every screen-reader-critical ARIA attribute referenced in
 * the Figma design is present and behaves correctly:
 *
 *   - aria-label on the brand logo
 *   - aria-pressed on the password show/hide toggle (and that it
 *     updates dynamically)
 *   - aria-modal=true on open dialogs
 *   - aria-labelledby on modal headings
 *   - aria-invalid on form inputs with field-level errors
 *   - aria-describedby pairing the input with its error message
 *   - aria-expanded on the See more toggle of Sign-in C
 *   - aria-busy or role="status" on loading buttons
 *   - role="alert" on error banners
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
 *   - AAP Section 0.1.1 — Screen-reader ARIA attribute requirement.
 *   - AAP Section 0.4.2 — Per-screen ARIA attribute tests.
 *   - AAP Section 0.5.1 — File row for `tests/a11y/screen-reader.test.tsx`.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, render, screen, waitFor } from '@tests/utils/render';
import { LINK_ACCOUNTS_MICROSOFT_REQUEST } from '@tests/fixtures/link-accounts';

// =============================================================================
// SUT IMPORTS — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { Logo } from '@/components/ui/Logo';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SignInA } from '@/components/sso/SignInA';
import { SignInC } from '@/components/sso/SignInC';
import { SignUpError } from '@/components/sso/SignUpError';
import { LinkAccountsModal } from '@/components/sso/LinkAccountsModal';

// =============================================================================
// SUITE — Logo ARIA
// =============================================================================

describe('A11y/ARIA — Logo', () => {
    it('exposes an aria-label naming the brand', () => {
        render(<Logo />);
        // The Logo is implemented either as an <img> with alt text, an
        // <svg role="img" aria-label="...">, or a styled <span> with an
        // aria-label. We accept any of these by looking for an element
        // with role="img" and an accessible name.
        const named = screen.queryByRole('img', { name: /blitzy/i });
        expect(named).not.toBeNull();
    });
});

// =============================================================================
// SUITE — Password toggle aria-pressed
// =============================================================================

describe('A11y/ARIA — password toggle aria-pressed lifecycle', () => {
    it('aria-pressed starts as false and toggles after click', async () => {
        const { user } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        const toggle = screen.getByRole('button', {
            name: /show password|hide password/i,
        });
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
        await user.click(toggle);
        await waitFor(() => {
            expect(
                screen
                    .getByRole('button', { name: /show password|hide password/i })
                    .getAttribute('aria-pressed'),
            ).toBe('true');
        });
    });
});

// =============================================================================
// SUITE — Modal aria-modal + aria-labelledby
// =============================================================================

describe('A11y/ARIA — Modal dialog attributes', () => {
    it('exposes aria-modal=true and aria-labelledby pointing at a real heading', () => {
        render(
            <Modal isOpen onClose={() => {}} ariaLabelledBy="modal-heading">
                <h2 id="modal-heading">Confirm account link</h2>
                <button type="button">OK</button>
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        const labelledBy = dialog.getAttribute('aria-labelledby');
        expect(labelledBy).toBe('modal-heading');
        const heading = document.getElementById(labelledBy ?? '');
        expect(heading).not.toBeNull();
        expect(heading?.textContent).toMatch(/confirm account link/i);
    });

    it('the LinkAccountsModal uses aria-labelledby on a present heading element', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="microsoft"
                email={LINK_ACCOUNTS_MICROSOFT_REQUEST.email}
                providerState={LINK_ACCOUNTS_MICROSOFT_REQUEST.providerState}
                onClose={() => {}}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        const dialog = screen.getByRole('dialog');
        const labelledBy = dialog.getAttribute('aria-labelledby');
        expect(labelledBy).toBeTruthy();
        if (labelledBy !== null) {
            expect(document.getElementById(labelledBy)).not.toBeNull();
        }
    });
});

// =============================================================================
// SUITE — Input aria-invalid + aria-describedby
// =============================================================================

describe('A11y/ARIA — TextInput error semantics', () => {
    it('sets aria-invalid=true when an error prop is supplied', () => {
        render(
            <TextInput
                id="err"
                label="Email"
                name="email"
                type="email"
                error="This email is invalid"
            />,
        );
        const input = screen.getByLabelText(/email/i);
        expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('aria-describedby points at the error message element', () => {
        render(
            <TextInput
                id="email-desc"
                label="Email"
                name="email"
                type="email"
                error="This email is invalid"
            />,
        );
        const input = screen.getByLabelText(/email/i);
        const describedBy = input.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();
        if (describedBy !== null) {
            const errorEl = document.getElementById(describedBy);
            expect(errorEl).not.toBeNull();
            expect(errorEl?.textContent).toMatch(/email is invalid/i);
        }
    });
});

// =============================================================================
// SUITE — Sign-in C aria-expanded on See more
// =============================================================================

describe('A11y/ARIA — SignInC See more aria-expanded', () => {
    it('starts with aria-expanded=false', () => {
        renderWithProviders(<SignInC />, { route: { initialPathname: 'signinC' } });
        const seeMore = screen.getByRole('button', { name: /see more/i });
        expect(seeMore.getAttribute('aria-expanded')).toBe('false');
    });

    it('updates aria-expanded to true after click', async () => {
        const { user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        const seeMore = screen.getByRole('button', { name: /see more/i });
        await user.click(seeMore);
        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: /see more/i }).getAttribute('aria-expanded'),
            ).toBe('true');
        });
    });
});

// =============================================================================
// SUITE — Button loading state
// =============================================================================

describe('A11y/ARIA — Button loading state semantics', () => {
    it('exposes aria-busy=true OR a role=status indicator while loading', () => {
        render(
            <Button variant="primary" size="large" loading>
                Submitting…
            </Button>,
        );
        const button = screen.getByRole('button');
        const ariaBusy = button.getAttribute('aria-busy');
        const status = button.querySelector('[role="status"]');
        const semanticsPresent = ariaBusy === 'true' || status !== null;
        expect(semanticsPresent).toBe(true);
    });
});

// =============================================================================
// SUITE — Alert banner semantics
// =============================================================================

describe('A11y/ARIA — Error banner alert role', () => {
    it('SignUpError renders an element with role=alert', () => {
        renderWithProviders(<SignUpError />, { route: { initialPathname: 'signupError' } });
        const alert = screen.queryByRole('alert');
        expect(alert).not.toBeNull();
    });
});
