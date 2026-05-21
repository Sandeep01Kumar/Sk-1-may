/**
 * Cross-component spacing assertions.
 *
 * Target files under test (CREATED by a subsequent implementation cycle
 * per AAP Section 0.10.5):
 *   - `src/components/ui/Button.tsx`
 *   - `src/components/ui/TextInput.tsx`
 *   - `src/components/ui/Modal.tsx`
 *   - `src/components/sso/SignInA.tsx`
 *
 * --------------------------------------------------------------------------
 * Test scope
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.1.1 the SSO surface enforces these layout tokens:
 *   - 24 px gap inside Form    -> SPACING_TOKENS['form.gap']
 *   - 16 px gap inside Buttons -> SPACING_TOKENS['button.gap']
 *   - 32 px gap inside Login   -> SPACING_TOKENS['login.gap']
 *   - 12 px x 24 px padding on Buttons
 *   - 8 px x 16 px padding on TextInputs
 *   - Modal padding 24 px x/y, modal gap 24 px (Figma layout_ZG5EM5 outer content gap)
 *
 * This file enforces those guarantees at the component layer for every
 * primitive and screen that owns a measurable container.
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
 *   - AAP Section 0.1.1 — Spacing tokens enumerated.
 *   - AAP Section 0.4.2 — Spacing per-component blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/component/spacing.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style token assertions.
 *   - AAP Section 0.10.2 — Tokens are the source of truth; no literal
 *     px in tests.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/utils/render';
import { expectSpacingToken } from '@tests/utils/tokens';

// =============================================================================
// SUT IMPORTS — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Modal } from '@/components/ui/Modal';
import { SignInA } from '@/components/sso/SignInA';

// =============================================================================
// SUITE — Button padding tokens
// =============================================================================

describe('Spacing — Button padding tokens', () => {
    it('Button (Large) applies button.padding.y (12 px) on padding-top', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        expectSpacingToken(
            screen.getByRole('button', { name: 'Sign in' }),
            'padding-top',
            'button.padding.y',
        );
    });

    it('Button (Large) applies button.padding.y (12 px) on padding-bottom', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        expectSpacingToken(
            screen.getByRole('button', { name: 'Sign in' }),
            'padding-bottom',
            'button.padding.y',
        );
    });

    it('Button (Large) applies button.padding.x (24 px) on padding-left', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        expectSpacingToken(
            screen.getByRole('button', { name: 'Sign in' }),
            'padding-left',
            'button.padding.x',
        );
    });

    it('Button (Large) applies button.padding.x (24 px) on padding-right', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        expectSpacingToken(
            screen.getByRole('button', { name: 'Sign in' }),
            'padding-right',
            'button.padding.x',
        );
    });

    it('Button (Small Primary) applies the same padding tokens as Button (Large)', () => {
        // The Figma 9301:5049 spec shares the padding tokens with Large;
        // only the border-radius differs.
        render(
            <Button variant="primary" size="small">
                Save
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Save' });
        expectSpacingToken(btn, 'padding-top', 'button.padding.y');
        expectSpacingToken(btn, 'padding-bottom', 'button.padding.y');
        expectSpacingToken(btn, 'padding-left', 'button.padding.x');
        expectSpacingToken(btn, 'padding-right', 'button.padding.x');
    });
});

// =============================================================================
// SUITE — TextInput padding tokens
// =============================================================================

describe('Spacing — TextInput padding tokens', () => {
    it('TextInput applies input.padding.y (8 px) on padding-top', () => {
        render(<TextInput label="Email" name="email" />);
        expectSpacingToken(screen.getByLabelText('Email'), 'padding-top', 'input.padding.y');
    });

    it('TextInput applies input.padding.y (8 px) on padding-bottom', () => {
        render(<TextInput label="Email" name="email" />);
        expectSpacingToken(screen.getByLabelText('Email'), 'padding-bottom', 'input.padding.y');
    });

    it('TextInput applies input.padding.x (16 px) on padding-left', () => {
        render(<TextInput label="Email" name="email" />);
        expectSpacingToken(screen.getByLabelText('Email'), 'padding-left', 'input.padding.x');
    });

    it('TextInput applies input.padding.x (16 px) on padding-right', () => {
        render(<TextInput label="Email" name="email" />);
        expectSpacingToken(screen.getByLabelText('Email'), 'padding-right', 'input.padding.x');
    });
});

// =============================================================================
// SUITE — Modal padding/gap tokens
// =============================================================================

describe('Spacing — Modal padding/gap tokens', () => {
    it('Modal applies modal.padding.y on padding-top', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        expectSpacingToken(dialog, 'padding-top', 'modal.padding.y');
    });

    it('Modal applies modal.padding.y on padding-bottom', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        expectSpacingToken(dialog, 'padding-bottom', 'modal.padding.y');
    });

    it('Modal applies modal.padding.x on padding-left', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        expectSpacingToken(dialog, 'padding-left', 'modal.padding.x');
    });

    it('Modal applies modal.padding.x on padding-right', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        expectSpacingToken(dialog, 'padding-right', 'modal.padding.x');
    });
});

// =============================================================================
// SUITE — SignInA gap tokens (form, button, login)
// =============================================================================

describe('Spacing — SignInA composition gap tokens', () => {
    it('SignInA form container applies form.gap (24 px) row-gap', () => {
        render(<SignInA />);
        const form =
            screen.getByRole('form', { hidden: true }) ?? screen.getByTestId('signin-form');
        // Flex row-gap / grid row-gap is the canonical implementation.
        // The helper computes either gap, row-gap, or column-gap.
        const styles = getComputedStyle(form);
        const rowGap = styles.rowGap || styles.gap;
        expect(rowGap).toBe('24px');
    });

    it('SignInA login container applies login.gap (32 px)', () => {
        render(<SignInA />);
        // The login container is the wrapper around Form + Buttons +
        // Social row. It should have a vertical gap of 32 px.
        const root = document.querySelector('[data-section="login"]');
        expect(root).not.toBeNull();
        if (root === null) {
            return;
        }
        const styles = getComputedStyle(root);
        const rowGap = styles.rowGap || styles.gap;
        expect(rowGap).toBe('32px');
    });

    it('SignInA button row applies button.gap (16 px)', () => {
        render(<SignInA />);
        const row = document.querySelector('[data-section="buttons"]');
        expect(row).not.toBeNull();
        if (row === null) {
            return;
        }
        const styles = getComputedStyle(row);
        const rowGap = styles.rowGap || styles.gap || styles.columnGap;
        expect(rowGap).toBe('16px');
    });
});
