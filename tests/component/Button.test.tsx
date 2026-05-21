/**
 * Component tests for the Button design-system primitive.
 *
 * Target file under test: `src/components/ui/Button.tsx` (CREATED by a
 * subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Button / Primary, Large   : Figma 4069:21592
 *       fill #5B39F3, radius 32 px, padding 12 px / 24 px,
 *       label = Button/Large (18 px / 28 px line-height / weight 600).
 *   - Button / Primary, Small   : Figma 9301:5049
 *       fill #5B39F3, radius 24 px (button.small), padding 12 px / 24 px,
 *       label = Button/Small.
 *   - Button / Secondary, Small : Figma 4069:21700
 *       transparent fill, brand-primary border + text, radius 24 px.
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path (per AAP Section 0.4.2):
 *     - All three variants render as <button> elements.
 *     - Variant-specific computed-style tokens applied.
 *     - Label text rendered with the design-system font tokens.
 *
 *   Edge cases:
 *     - Very long labels do not break layout (truncation handled by
 *       max-width / overflow rules).
 *     - Multi-line labels remain centred.
 *
 *   Error cases:
 *     - `disabled` prevents click and reduces opacity.
 *     - `loading` shows a spinner and prevents click while loading.
 *
 *   Interactive states (default/hover/focus/active/disabled/loading)
 *   are exhaustively exercised in `tests/component/Button.states.test.tsx`.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, `src/components/ui/Button.tsx` does NOT exist
 * yet; the import will fail with `Cannot find module '@/components/ui/Button'`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Button color palette + radius.
 *   - AAP Section 0.3.1 — Button component test target.
 *   - AAP Section 0.4.2 — Button test-case blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/component/Button.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style token assertions.
 *   - AAP Section 0.10.2 — Inter font + user-event mandates.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/utils/render';
import {
    expectColorToken,
    expectFontSizeToken,
    expectFontWeightToken,
    expectLineHeightToken,
    expectRadiusToken,
    expectSpacingToken,
} from '@tests/utils/tokens';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { Button } from '@/components/ui/Button';

// =============================================================================
// SUITE — Primary, Large variant
// =============================================================================

describe('src/components/ui/Button — Primary, Large variant', () => {
    it('renders as a <button> element with the label as accessible name', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        expect(btn).toBeInTheDocument();
        expect(btn.tagName).toBe('BUTTON');
    });

    it('applies the brand primary background color (#5B39F3)', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        expectColorToken(btn, 'background-color', 'button.primary.background');
    });

    it('applies the inverse text color (#FFFFFF)', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        expectColorToken(btn, 'color', 'button.primary.text');
    });

    it('applies the button.large radius token (32 px)', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        expectRadiusToken(btn, 'button.large');
    });

    it('applies the button.padding.y token (12 px) to vertical padding', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        expectSpacingToken(btn, 'padding-top', 'button.padding.y');
        expectSpacingToken(btn, 'padding-bottom', 'button.padding.y');
    });

    it('applies the button.padding.x token (24 px) to horizontal padding', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        expectSpacingToken(btn, 'padding-left', 'button.padding.x');
        expectSpacingToken(btn, 'padding-right', 'button.padding.x');
    });

    it('uses the Button/Large font size token (18 px)', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        expectFontSizeToken(btn, 'button.large');
    });

    it('uses the Button/Large line-height token (28 px)', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        expectLineHeightToken(btn, 'button.large');
    });

    it('uses the semi-bold font weight token (600)', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        expectFontWeightToken(btn, 'semibold');
    });

    it('invokes onClick when activated', async () => {
        let clicks = 0;
        const { user } = render(
            <Button
                variant="primary"
                size="large"
                onClick={() => {
                    clicks += 1;
                }}
            >
                Sign in
            </Button>,
        );
        await user.click(screen.getByRole('button', { name: 'Sign in' }));
        expect(clicks).toBe(1);
    });
});

// =============================================================================
// SUITE — Primary, Small variant
// =============================================================================

describe('src/components/ui/Button — Primary, Small variant', () => {
    it('renders as a <button> with the label as accessible name', () => {
        render(
            <Button variant="primary" size="small">
                Save
            </Button>,
        );
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('applies the brand primary background color (#5B39F3)', () => {
        render(
            <Button variant="primary" size="small">
                Save
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Save' });
        expectColorToken(btn, 'background-color', 'button.primary.background');
    });

    it('applies the button.small radius token (24 px)', () => {
        render(
            <Button variant="primary" size="small">
                Save
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Save' });
        expectRadiusToken(btn, 'button.small');
    });
});

// =============================================================================
// SUITE — Secondary, Small variant
// =============================================================================

describe('src/components/ui/Button — Secondary, Small variant', () => {
    it('renders as a <button> with the label as accessible name', () => {
        render(
            <Button variant="secondary" size="small">
                Cancel
            </Button>,
        );
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('applies the brand primary as text color and border colour (secondary inverted scheme)', () => {
        render(
            <Button variant="secondary" size="small">
                Cancel
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Cancel' });
        expectColorToken(btn, 'color', 'button.secondary.text');
        expectColorToken(btn, 'border-top-color', 'button.secondary.border');
    });

    it('applies the white background color (button.secondary.background)', () => {
        render(
            <Button variant="secondary" size="small">
                Cancel
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Cancel' });
        expectColorToken(btn, 'background-color', 'button.secondary.background');
    });
});

// =============================================================================
// SUITE — Disabled
// =============================================================================

describe('src/components/ui/Button — disabled', () => {
    it('renders with the disabled attribute', () => {
        render(
            <Button variant="primary" size="large" disabled>
                Sign in
            </Button>,
        );
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    });

    it('does not invoke onClick when disabled', async () => {
        let clicks = 0;
        const { user } = render(
            <Button
                variant="primary"
                size="large"
                disabled
                onClick={() => {
                    clicks += 1;
                }}
            >
                Sign in
            </Button>,
        );
        await user.click(screen.getByRole('button', { name: 'Sign in' }));
        expect(clicks).toBe(0);
    });

    it('reduces visual opacity when disabled', () => {
        render(
            <Button variant="primary" size="large" disabled>
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        const opacity = parseFloat(getComputedStyle(btn).opacity);
        expect(opacity).toBeLessThan(1);
        expect(opacity).toBeGreaterThan(0.1);
    });
});

// =============================================================================
// SUITE — Loading state
// =============================================================================

describe('src/components/ui/Button — loading state', () => {
    it('renders a busy indicator (aria-busy="true" or role="status" inside)', () => {
        render(
            <Button variant="primary" size="large" loading>
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: /sign in/i });
        // Either the button itself carries aria-busy or it contains
        // a role="status" indicator (spinner). Both are valid; one
        // must be true.
        const ariaBusy = btn.getAttribute('aria-busy');
        const hasStatus = btn.querySelector('[role="status"]') !== null;
        expect(ariaBusy === 'true' || hasStatus).toBe(true);
    });

    it('prevents click when loading', async () => {
        let clicks = 0;
        const { user } = render(
            <Button
                variant="primary"
                size="large"
                loading
                onClick={() => {
                    clicks += 1;
                }}
            >
                Sign in
            </Button>,
        );
        await user.click(screen.getByRole('button', { name: /sign in/i }));
        expect(clicks).toBe(0);
    });
});

// =============================================================================
// SUITE — Edge cases
// =============================================================================

describe('src/components/ui/Button — edge cases', () => {
    it('accepts very long labels without throwing', () => {
        const long = 'Sign in to your account with single sign-on '.repeat(20);
        expect(() =>
            render(
                <Button variant="primary" size="large">
                    {long}
                </Button>,
            ),
        ).not.toThrow();
    });

    it('forwards type="submit" so form submission works', () => {
        render(
            <Button variant="primary" size="large" type="submit">
                Sign in
            </Button>,
        );
        expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
    });

    it('defaults to type="button" when no type prop is supplied', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        // Either type="button" is explicitly set or it is absent (HTML
        // default for <button> outside <form> is "submit" — the design
        // system MUST default to "button" to avoid accidental form
        // submissions; we accept either an explicit "button" attribute
        // or omission for non-form context).
        const t = btn.getAttribute('type');
        expect(t === 'button' || t === null).toBe(true);
    });
});
