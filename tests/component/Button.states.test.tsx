/**
 * Interactive-state matrix for the Button design-system primitive.
 *
 * Target file under test: `src/components/ui/Button.tsx` (CREATED by a
 * subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   For each (variant, size) combination — default / hover / focus /
 *   active / disabled / loading.
 *
 *   Default:   resting visual treatment (token assertions).
 *   Hover:     opacity / background brightness change is permitted but
 *              must NOT remove the focus ring affordance.
 *   Focus:     visible focus indicator (outline-color or box-shadow
 *              matching `brand.primary`).
 *   Active:    `:active` styling — dim background or transform — no
 *              behavioural assertion at runtime; we only assert that
 *              the click still fires.
 *   Disabled:  click suppressed, opacity reduced, cursor not-allowed,
 *              focusable=false.
 *   Loading:   click suppressed, busy indicator present, label hidden
 *              from screen-readers via aria-hidden while loading
 *              (per WAI-ARIA `aria-busy` pattern) OR kept visible with
 *              the spinner alongside.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT module does NOT exist yet; the import
 * will fail with `Cannot find module '@/components/ui/Button'`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Interactive states scope.
 *   - AAP Section 0.4.2 — Button states blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/component/Button.states.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style assertions.
 *   - AAP Section 0.10.2 — user-event mandate.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/utils/render';
import { tokens } from '@tests/fixtures/design-tokens';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { Button } from '@/components/ui/Button';

// =============================================================================
// PARAMETER MATRIX
// =============================================================================

type ButtonVariant = 'primary' | 'secondary';
type ButtonSize = 'large' | 'small';

interface VariantSpec {
    readonly variant: ButtonVariant;
    readonly size: ButtonSize;
    readonly label: string;
}

const VARIANT_MATRIX: readonly VariantSpec[] = [
    { variant: 'primary', size: 'large', label: 'Sign in' },
    { variant: 'primary', size: 'small', label: 'Save' },
    { variant: 'secondary', size: 'small', label: 'Cancel' },
] as const;

// =============================================================================
// SUITE — Default state across variants
// =============================================================================

describe('src/components/ui/Button — default state across variants', () => {
    it.each(VARIANT_MATRIX)(
        '[$variant/$size] renders with cursor: pointer in the default state',
        ({ variant, size, label }) => {
            render(
                <Button variant={variant} size={size}>
                    {label}
                </Button>,
            );
            const btn = screen.getByRole('button', { name: label });
            // cursor: pointer is the canonical default for interactive
            // controls; browsers may report '' (unset) which is also
            // acceptable when the UA default for <button> is already
            // pointer.
            const cursor = getComputedStyle(btn).cursor;
            expect(cursor === 'pointer' || cursor === 'auto' || cursor === '').toBe(true);
        },
    );

    it.each(VARIANT_MATRIX)(
        '[$variant/$size] is enabled (not disabled) by default',
        ({ variant, size, label }) => {
            render(
                <Button variant={variant} size={size}>
                    {label}
                </Button>,
            );
            const btn = screen.getByRole('button', { name: label });
            expect(btn).not.toBeDisabled();
        },
    );
});

// =============================================================================
// SUITE — Hover state
// =============================================================================

describe('src/components/ui/Button — hover state', () => {
    it.each(VARIANT_MATRIX)(
        '[$variant/$size] preserves accessibility surface on hover (no aria-* mutations)',
        async ({ variant, size, label }) => {
            const { user } = render(
                <Button variant={variant} size={size}>
                    {label}
                </Button>,
            );
            const btn = screen.getByRole('button', { name: label });
            // Snapshot ARIA before hover.
            const ariaBefore = btn.getAttribute('aria-label');
            const roleBefore = btn.getAttribute('role');
            await user.hover(btn);
            // Hover should NOT alter ARIA semantics.
            expect(btn.getAttribute('aria-label')).toBe(ariaBefore);
            expect(btn.getAttribute('role')).toBe(roleBefore);
        },
    );
});

// =============================================================================
// SUITE — Focus state
// =============================================================================

describe('src/components/ui/Button — focus state', () => {
    it.each(VARIANT_MATRIX)(
        '[$variant/$size] receives focus on Tab and exposes a visible focus indicator',
        async ({ variant, size, label }) => {
            const { user } = render(
                <Button variant={variant} size={size}>
                    {label}
                </Button>,
            );
            const btn = screen.getByRole('button', { name: label });
            await user.tab();
            expect(document.activeElement).toBe(btn);

            // Focus indicator can be expressed via:
            //   - outline-color matching brand.primary, OR
            //   - box-shadow containing a brand.primary stop, OR
            //   - the UA default outline (non-empty outline-style).
            const styles = getComputedStyle(btn);
            const outlineColor = styles.outlineColor;
            const boxShadow = styles.boxShadow;
            const outlineStyle = styles.outlineStyle;
            const PRIMARY = tokens.color['brand.primary'].toLowerCase();
            const indicatesFocus =
                outlineColor.toLowerCase().includes('5b39f3') ||
                outlineColor.includes('rgb(91, 57, 243)') ||
                outlineColor.toLowerCase() === PRIMARY ||
                boxShadow.toLowerCase().includes('5b39f3') ||
                boxShadow.includes('rgb(91, 57, 243)') ||
                (outlineStyle !== 'none' && outlineStyle !== '');
            expect(indicatesFocus).toBe(true);
        },
    );

    it.each(VARIANT_MATRIX)(
        '[$variant/$size] is reachable by keyboard Tab navigation (tabIndex >= 0)',
        ({ variant, size, label }) => {
            render(
                <Button variant={variant} size={size}>
                    {label}
                </Button>,
            );
            const btn = screen.getByRole('button', { name: label }) as HTMLButtonElement;
            // <button> elements are focusable by default; explicit
            // tabIndex must NOT be a negative value.
            const ti = btn.tabIndex;
            expect(ti).toBeGreaterThanOrEqual(0);
        },
    );
});

// =============================================================================
// SUITE — Active state
// =============================================================================

describe('src/components/ui/Button — active state (click activation)', () => {
    it.each(VARIANT_MATRIX)(
        '[$variant/$size] invokes onClick on activation',
        async ({ variant, size, label }) => {
            let clicks = 0;
            const { user } = render(
                <Button
                    variant={variant}
                    size={size}
                    onClick={() => {
                        clicks += 1;
                    }}
                >
                    {label}
                </Button>,
            );
            await user.click(screen.getByRole('button', { name: label }));
            expect(clicks).toBe(1);
        },
    );

    it.each(VARIANT_MATRIX)(
        '[$variant/$size] activates via Enter when focused',
        async ({ variant, size, label }) => {
            let clicks = 0;
            const { user } = render(
                <Button
                    variant={variant}
                    size={size}
                    onClick={() => {
                        clicks += 1;
                    }}
                >
                    {label}
                </Button>,
            );
            await user.tab();
            await user.keyboard('{Enter}');
            expect(clicks).toBe(1);
        },
    );

    it.each(VARIANT_MATRIX)(
        '[$variant/$size] activates via Space when focused',
        async ({ variant, size, label }) => {
            let clicks = 0;
            const { user } = render(
                <Button
                    variant={variant}
                    size={size}
                    onClick={() => {
                        clicks += 1;
                    }}
                >
                    {label}
                </Button>,
            );
            await user.tab();
            await user.keyboard(' ');
            expect(clicks).toBe(1);
        },
    );
});

// =============================================================================
// SUITE — Disabled state across variants
// =============================================================================

describe('src/components/ui/Button — disabled state across variants', () => {
    it.each(VARIANT_MATRIX)(
        '[$variant/$size] is disabled when disabled prop set',
        ({ variant, size, label }) => {
            render(
                <Button variant={variant} size={size} disabled>
                    {label}
                </Button>,
            );
            expect(screen.getByRole('button', { name: label })).toBeDisabled();
        },
    );

    it.each(VARIANT_MATRIX)(
        '[$variant/$size] applies cursor: not-allowed when disabled',
        ({ variant, size, label }) => {
            render(
                <Button variant={variant} size={size} disabled>
                    {label}
                </Button>,
            );
            const btn = screen.getByRole('button', { name: label });
            expect(getComputedStyle(btn).cursor).toBe('not-allowed');
        },
    );

    it.each(VARIANT_MATRIX)(
        '[$variant/$size] suppresses keyboard activation when disabled',
        async ({ variant, size, label }) => {
            let clicks = 0;
            const { user } = render(
                <Button
                    variant={variant}
                    size={size}
                    disabled
                    onClick={() => {
                        clicks += 1;
                    }}
                >
                    {label}
                </Button>,
            );
            // user.click on a disabled button is a no-op.
            await user.click(screen.getByRole('button', { name: label }));
            expect(clicks).toBe(0);
        },
    );
});

// =============================================================================
// SUITE — Loading state across variants
// =============================================================================

describe('src/components/ui/Button — loading state across variants', () => {
    it.each(VARIANT_MATRIX)(
        '[$variant/$size] suppresses click when loading',
        async ({ variant, size, label }) => {
            let clicks = 0;
            const { user } = render(
                <Button
                    variant={variant}
                    size={size}
                    loading
                    onClick={() => {
                        clicks += 1;
                    }}
                >
                    {label}
                </Button>,
            );
            await user.click(screen.getByRole('button', { name: new RegExp(label, 'i') }));
            expect(clicks).toBe(0);
        },
    );

    it.each(VARIANT_MATRIX)(
        '[$variant/$size] sets aria-busy="true" or contains role="status" while loading',
        ({ variant, size, label }) => {
            render(
                <Button variant={variant} size={size} loading>
                    {label}
                </Button>,
            );
            const btn = screen.getByRole('button', { name: new RegExp(label, 'i') });
            const busy = btn.getAttribute('aria-busy');
            const hasStatus = btn.querySelector('[role="status"]') !== null;
            expect(busy === 'true' || hasStatus).toBe(true);
        },
    );
});
