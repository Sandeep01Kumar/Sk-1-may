/**
 * Cross-component typography assertions.
 *
 * Target files under test (CREATED by a subsequent implementation cycle
 * per AAP Section 0.10.5):
 *   - `src/components/ui/Button.tsx`
 *   - `src/components/ui/TextInput.tsx`
 *   - `src/components/ui/Modal.tsx`
 *   - `src/components/sso/SignInA.tsx`
 *   - `src/components/sso/SignInB.tsx`
 *   - `src/components/sso/LinkAccountsModal.tsx`
 *
 * --------------------------------------------------------------------------
 * Test scope
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.1.1 every text node in the SSO surface must render
 * with:
 *   - The Inter font family (with the canonical system-font fallback
 *     stack).
 *   - One of the captured font-size tokens (62.78 / 32 / 24 / 18 / 16 /
 *     14 / 12 px).
 *   - One of the captured font-weight tokens (400 Regular or 600
 *     Semi Bold).
 *   - One of the captured line-height tokens.
 *   - One of the captured letter-spacing tokens.
 *
 * This file enforces those guarantees at the component layer for every
 * primitive and screen that renders text. The Figma-mandated mapping
 * between text style and token is encoded in
 * `tests/fixtures/design-tokens.ts` and asserted via the helpers in
 * `tests/utils/tokens.ts`.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT modules do NOT exist yet; the imports
 * below will fail with `Cannot find module ...`. This IS the expected
 * failure mode.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Typography assertions scope.
 *   - AAP Section 0.4.2 — Typography per-frame typography assertions.
 *   - AAP Section 0.5.1 — File row for `tests/component/typography.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style token assertions.
 *   - AAP Section 0.10.2 — Inter font mandatory; tokens are the source
 *     of truth (no literal px or hex in tests).
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it } from 'vitest';
import { render, screen } from '@tests/utils/render';
import {
    expectFontFamily,
    expectFontSizeToken,
    expectFontWeightToken,
    expectLetterSpacingToken,
    expectLineHeightToken,
} from '@tests/utils/tokens';

// =============================================================================
// SUT IMPORTS — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Modal } from '@/components/ui/Modal';
import { SignInA } from '@/components/sso/SignInA';
import { SignInB } from '@/components/sso/SignInB';
import { LinkAccountsModal } from '@/components/sso/LinkAccountsModal';

// =============================================================================
// SUITE — Inter font family across all text-rendering components
// =============================================================================

describe('Typography — Inter font family across all text-rendering components', () => {
    it('Button (Primary/Large) renders text with the Inter font family', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        expectFontFamily(screen.getByRole('button', { name: 'Sign in' }));
    });

    it('TextInput renders text with the Inter font family', () => {
        render(<TextInput label="Email" name="email" />);
        expectFontFamily(screen.getByLabelText('Email'));
    });

    it('Modal heading renders text with the Inter font family', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const heading = screen.getByRole('heading', { name: /link your accounts/i });
        expectFontFamily(heading);
    });

    it('SignInA page applies Inter to body copy', () => {
        render(<SignInA />);
        // The body copy ("New to Blitzy? Create an account") must use Inter.
        const subtitle = screen.getByText(/new to blitzy/i);
        expectFontFamily(subtitle);
    });

    it('SignInB page applies Inter to the Sign-in heading', () => {
        render(<SignInB />);
        const heading = screen.getByRole('heading', { name: /^sign in$/i });
        expectFontFamily(heading);
    });

    it('LinkAccountsModal applies Inter to the H5 heading', () => {
        render(<LinkAccountsModal isOpen onClose={() => undefined} variant="microsoft" />);
        const heading = screen.getByRole('heading', { name: /link your accounts/i });
        expectFontFamily(heading);
    });
});

// =============================================================================
// SUITE — Font size tokens
// =============================================================================

describe('Typography — font size tokens applied per Figma text styles', () => {
    it('SignInA "Sign in" heading uses the h1.signin token (32 px)', () => {
        render(<SignInA />);
        const heading = screen.getByRole('heading', { name: /^sign in$/i });
        expectFontSizeToken(heading, 'h1.signin');
    });

    it('Button (Large) label uses the button.large token (18 px)', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        expectFontSizeToken(screen.getByRole('button', { name: 'Sign in' }), 'button.large');
    });

    it('TextInput uses the body font-size token (16 px)', () => {
        render(<TextInput label="Email" name="email" />);
        expectFontSizeToken(screen.getByLabelText('Email'), 'body');
    });

    it('LinkAccountsModal heading uses the h5 token (24 px)', () => {
        render(<LinkAccountsModal isOpen onClose={() => undefined} variant="microsoft" />);
        const heading = screen.getByRole('heading', { name: /link your accounts/i });
        expectFontSizeToken(heading, 'h5');
    });

    it('SignInA forgot-password link uses the small token (14 px)', () => {
        render(<SignInA />);
        const forgot = screen.getByRole('link', { name: /forgot your password/i });
        expectFontSizeToken(forgot, 'small');
    });
});

// =============================================================================
// SUITE — Font weight tokens
// =============================================================================

describe('Typography — font weight tokens applied per Figma text styles', () => {
    it('Button (Large) label is rendered with weight=600 (Semi Bold)', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        expectFontWeightToken(screen.getByRole('button', { name: 'Sign in' }), 'semibold');
    });

    it('SignInA "Sign in" heading is rendered with weight=600 (Semi Bold)', () => {
        render(<SignInA />);
        const heading = screen.getByRole('heading', { name: /^sign in$/i });
        expectFontWeightToken(heading, 'semibold');
    });

    it('TextInput body copy is rendered with weight=400 (Regular)', () => {
        render(<TextInput label="Email" name="email" />);
        expectFontWeightToken(screen.getByLabelText('Email'), 'regular');
    });

    it('SignInA subtitle ("New to Blitzy?") is rendered with weight=400 (Regular)', () => {
        render(<SignInA />);
        const subtitle = screen.getByText(/new to blitzy/i);
        expectFontWeightToken(subtitle, 'regular');
    });

    it('LinkAccountsModal H5 heading is rendered with weight=600 (Semi Bold)', () => {
        render(<LinkAccountsModal isOpen onClose={() => undefined} variant="microsoft" />);
        const heading = screen.getByRole('heading', { name: /link your accounts/i });
        expectFontWeightToken(heading, 'semibold');
    });
});

// =============================================================================
// SUITE — Line height tokens
// =============================================================================

describe('Typography — line-height tokens applied per Figma text styles', () => {
    it('SignInA "Sign in" heading uses line-height token h1.signin (32 px)', () => {
        render(<SignInA />);
        const heading = screen.getByRole('heading', { name: /^sign in$/i });
        expectLineHeightToken(heading, 'h1.signin');
    });

    it('Button (Large) label uses line-height token button.large (28 px)', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        expectLineHeightToken(screen.getByRole('button', { name: 'Sign in' }), 'button.large');
    });

    it('TextInput uses line-height token body (24 px)', () => {
        render(<TextInput label="Email" name="email" />);
        expectLineHeightToken(screen.getByLabelText('Email'), 'body');
    });

    it('LinkAccountsModal H5 uses line-height token h5 (31.2 px)', () => {
        render(<LinkAccountsModal isOpen onClose={() => undefined} variant="microsoft" />);
        const heading = screen.getByRole('heading', { name: /link your accounts/i });
        expectLineHeightToken(heading, 'h5');
    });
});

// =============================================================================
// SUITE — Letter spacing tokens
// =============================================================================

describe('Typography — letter-spacing tokens applied per Figma text styles', () => {
    it('SignInA "Sign in" heading uses letter-spacing token h1.signin (-0.64 px)', () => {
        render(<SignInA />);
        const heading = screen.getByRole('heading', { name: /^sign in$/i });
        expectLetterSpacingToken(heading, 'h1.signin');
    });

    it('TextInput body copy uses letter-spacing token body (-0.30 px)', () => {
        render(<TextInput label="Email" name="email" />);
        expectLetterSpacingToken(screen.getByLabelText('Email'), 'body');
    });

    it('Button (Large) label uses default tracking (button.large = 0 px)', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        expectLetterSpacingToken(screen.getByRole('button', { name: 'Sign in' }), 'button.large');
    });

    it('LinkAccountsModal H5 uses default tracking (h5 = 0 px)', () => {
        render(<LinkAccountsModal isOpen onClose={() => undefined} variant="microsoft" />);
        const heading = screen.getByRole('heading', { name: /link your accounts/i });
        expectLetterSpacingToken(heading, 'h5');
    });
});
