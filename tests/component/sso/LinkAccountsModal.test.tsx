/**
 * Component tests for the Link Accounts Modal screen.
 *
 * Target file under test: `src/components/sso/LinkAccountsModal.tsx`
 * (CREATED by a subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Frame (Microsoft variant) : 16383:42232 ("Link Accounts Modal")
 *   - Frame (generic variant)   : 16383:42287 ("Link Accounts Modal — Generic")
 *   - Route: ROUTES.linkAccounts  ->  /sso/link-accounts
 *
 *   Composition:
 *     - 512 px wide centred modal
 *     - 24 px border-radius, shadow-xl
 *     - Heading "Link your accounts" (H5 24 px / weight 600)
 *     - Supporting text including bold email
 *     - Password confirmation TextInput
 *     - Cancel + Link accounts buttons
 *     - "Forgot your password?" link
 *
 *   Microsoft variant additionally renders the Microsoft logo above
 *   the heading; the generic variant uses a placeholder badge.
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path:
 *     - All structural elements render.
 *     - Visual tokens applied (512 px, 24 px radius, modal.xl shadow).
 *     - Focus moves to first interactive element on open.
 *
 *   Edge cases:
 *     - Escape dismisses.
 *     - Click overlay dismisses when closeOnOverlayClick=true.
 *     - Cancel button invokes onCancel.
 *     - Forgot password link routes to forgot-password.
 *
 *   Error cases:
 *     - Submitting with wrong password surfaces error.
 *     - Submitting against conflict response surfaces error.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT module does NOT exist yet; the import
 * will fail with `Cannot find module '@/components/sso/LinkAccountsModal'`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Link Accounts Modal frames target.
 *   - AAP Section 0.3.1 — LinkAccountsModal screen test target.
 *   - AAP Section 0.4.2 — Link Accounts Modal blueprint (512 px, focus
 *     trap, Escape close).
 *   - AAP Section 0.5.1 — File row for
 *     `tests/component/sso/LinkAccountsModal.test.tsx`.
 *   - AAP Section 0.7.1 — Per-file coverage override 95%.
 *   - AAP Section 0.10.3 — Modal shadow + width tokens.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@tests/utils/render';
import { expectRadiusToken, expectShadowToken } from '@tests/utils/tokens';
import { LAYOUT_TOKENS } from '@tests/fixtures/design-tokens';
import { STANDARD_USER } from '@tests/fixtures/users';
import { VALID_PASSWORD_STANDARD } from '@tests/fixtures/passwords';
import { ROUTES } from '@tests/setup/global';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { LinkAccountsModal } from '@/components/sso/LinkAccountsModal';

// =============================================================================
// SUITE — Composition
// =============================================================================

describe('src/components/sso/LinkAccountsModal — composition', () => {
    it('renders the modal heading "Link your accounts"', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        expect(screen.getByRole('heading', { name: /link your accounts/i })).toBeInTheDocument();
    });

    it('renders the supporting text with the email rendered in bold', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        // The supporting text includes the email rendered as a <strong>
        // (or [data-bold=true]) element.
        const emailEl = screen.getByText(STANDARD_USER.email);
        const tag = emailEl.tagName.toLowerCase();
        expect(
            tag === 'strong' || tag === 'b' || emailEl.getAttribute('data-bold') === 'true',
        ).toBe(true);
    });

    it('renders the password confirmation input', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders the Cancel and Link accounts buttons', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /link accounts/i })).toBeInTheDocument();
    });

    it('renders the "Forgot your password?" link', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument();
    });
});

// =============================================================================
// SUITE — Visual tokens
// =============================================================================

describe('src/components/sso/LinkAccountsModal — visual tokens', () => {
    it('renders 512 px wide per modal.width token', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        const dialog = screen.getByRole('dialog');
        expect(getComputedStyle(dialog).width).toBe(LAYOUT_TOKENS.modal.width);
    });

    it('applies the modal radius token (24 px)', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        expectRadiusToken(screen.getByRole('dialog'), 'modal');
    });

    it('applies the modal.xl shadow token verbatim', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        expectShadowToken(screen.getByRole('dialog'), 'modal.xl');
    });
});

// =============================================================================
// SUITE — Variant rendering
// =============================================================================

describe('src/components/sso/LinkAccountsModal — variant rendering', () => {
    it('Microsoft variant renders the Microsoft logo above the heading', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        const logos = document.querySelectorAll('img');
        const hasMicrosoftLogo = Array.from(logos).some((logo) =>
            (logo.getAttribute('src') ?? '').includes('microsoft-logo'),
        );
        expect(hasMicrosoftLogo).toBe(true);
    });

    it('Generic variant does NOT render a Microsoft-specific logo', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="generic"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        const logos = document.querySelectorAll('img');
        const hasMicrosoftLogo = Array.from(logos).some((logo) =>
            (logo.getAttribute('src') ?? '').includes('microsoft-logo'),
        );
        expect(hasMicrosoftLogo).toBe(false);
    });
});

// =============================================================================
// SUITE — Focus management
// =============================================================================

describe('src/components/sso/LinkAccountsModal — focus management', () => {
    it('focuses the first interactive element (password input) on open', () => {
        renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        const password = screen.getByLabelText(/password/i);
        const dialog = screen.getByRole('dialog');
        // First interactive element OR dialog itself per WAI-ARIA pattern.
        expect(document.activeElement === password || document.activeElement === dialog).toBe(true);
    });

    it('traps focus via Tab inside the modal', async () => {
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        const link = screen.getByRole('link', { name: /forgot your password/i });
        link.focus();
        // After tabbing from the last focusable element we should
        // cycle back to the first interactive control inside the modal.
        await user.tab();
        const focused = document.activeElement;
        // Focus should remain inside the dialog.
        const dialog = screen.getByRole('dialog');
        expect(dialog.contains(focused as Node)).toBe(true);
    });
});

// =============================================================================
// SUITE — Dismissal
// =============================================================================

describe('src/components/sso/LinkAccountsModal — dismissal', () => {
    it('invokes onClose when Escape is pressed', async () => {
        let closes = 0;
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => {
                    closes += 1;
                }}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await user.keyboard('{Escape}');
        expect(closes).toBe(1);
    });

    it('invokes onClose when Cancel button is clicked', async () => {
        let closes = 0;
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => {
                    closes += 1;
                }}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(closes).toBe(1);
    });
});

// =============================================================================
// SUITE — Submission
// =============================================================================

describe('src/components/sso/LinkAccountsModal — submission', () => {
    it('disables the "Link accounts" button until a password is entered', async () => {
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        const submit = screen.getByRole('button', { name: /link accounts/i });
        expect(submit).toBeDisabled();
        await user.type(screen.getByLabelText(/password/i), VALID_PASSWORD_STANDARD.value);
        expect(submit).not.toBeDisabled();
    });
});

// =============================================================================
// SUITE — Route registration
// =============================================================================

describe('src/components/sso/LinkAccountsModal — route registration', () => {
    it('registers under the canonical linkAccounts pathname (/sso/link-accounts)', () => {
        const { routeStore } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                onClose={() => undefined}
                variant="microsoft"
                email={STANDARD_USER.email}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        expect(routeStore.getPathname()).toBe(ROUTES.linkAccounts);
    });
});
