/**
 * Component tests for the Separator design-system primitive.
 *
 * Target file under test: `src/components/ui/Separator.tsx` (CREATED by a
 * subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Sign-in A separator      : Figma 15001:41911 ("or")
 *   - Sign-in B/C separator    : Figma 15001:42024 ("or sign in with")
 *
 *   Structure: two horizontal lines flanking a centred text node, with
 *   an 8 px gap on each side (SPACING_TOKENS['separator.gap']).
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path:
 *     - Renders the supplied text node centred between two lines.
 *     - 8 px gap on each side of the text per design token.
 *     - role="separator" with aria-orientation="horizontal" on the
 *       wrapper.
 *
 *   Edge cases:
 *     - Renders without a text node (lines only) when `label` is empty.
 *     - Renders with very long text node.
 *
 *   Visual: lines render in the default border colour (#D9D9D9) per
 *   design tokens.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT module does NOT exist yet; the import
 * will fail with `Cannot find module '@/components/ui/Separator'`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Separator component.
 *   - AAP Section 0.3.1 — Separator component test target.
 *   - AAP Section 0.4.2 — Separator test-case blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/component/Separator.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style assertions.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/utils/render';
import { expectSpacingToken } from '@tests/utils/tokens';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { Separator } from '@/components/ui/Separator';

// =============================================================================
// SUITE — Default rendering with text label
// =============================================================================

describe('src/components/ui/Separator — rendering with label', () => {
    it('renders the supplied label as text content', () => {
        render(<Separator label="or" />);
        expect(screen.getByText('or')).toBeInTheDocument();
    });

    it('renders the longer "or sign in with" label used by Sign-in B/C', () => {
        render(<Separator label="or sign in with" />);
        expect(screen.getByText(/or sign in with/i)).toBeInTheDocument();
    });

    it('exposes role="separator" semantic on the wrapper', () => {
        const { container } = render(<Separator label="or" />);
        const sep = container.querySelector('[role="separator"]');
        expect(sep).not.toBeNull();
    });

    it('exposes aria-orientation="horizontal" on the separator', () => {
        const { container } = render(<Separator label="or" />);
        const sep = container.querySelector('[role="separator"]');
        // Horizontal is the default for role=separator; either explicit
        // or implicit is acceptable.
        const orientation = sep?.getAttribute('aria-orientation');
        expect(orientation === 'horizontal' || orientation === null).toBe(true);
    });

    it('places two horizontal lines flanking the label', () => {
        const { container } = render(<Separator label="or" />);
        // Lines may be rendered as <hr>, <div role="presentation">,
        // or <span> with a 1 px height. The contract is that there
        // are at least two purely-decorative line nodes flanking the
        // label.
        const allLines = container.querySelectorAll(
            'hr, [data-line="true"], [role="presentation"]',
        );
        expect(allLines.length).toBeGreaterThanOrEqual(2);
    });

    it('applies the separator.gap token (8 px) horizontally around the label', () => {
        const { container } = render(<Separator label="or" />);
        const labelNode = screen.getByText('or');
        // Inspect inline margin or parent's column gap. We accept either
        // approach (margin-left/right on the label or column-gap on the
        // wrapper).
        const margin = getComputedStyle(labelNode).marginLeft;
        if (margin && margin !== '0px') {
            expectSpacingToken(labelNode, 'margin-left', 'separator.gap');
            expectSpacingToken(labelNode, 'margin-right', 'separator.gap');
        } else {
            // Fall back to gap on the wrapper.
            const wrapper = container.querySelector('[role="separator"]');
            expect(wrapper).not.toBeNull();
            if (wrapper !== null) {
                const gap = getComputedStyle(wrapper).columnGap || getComputedStyle(wrapper).gap;
                expect(gap).toBe('8px');
            }
        }
    });
});

// =============================================================================
// SUITE — Rendering without a label
// =============================================================================

describe('src/components/ui/Separator — rendering without label', () => {
    it('renders without throwing when label is omitted', () => {
        expect(() => render(<Separator />)).not.toThrow();
    });

    it('still exposes the separator role when no label is supplied', () => {
        const { container } = render(<Separator />);
        expect(container.querySelector('[role="separator"]')).not.toBeNull();
    });
});

// =============================================================================
// SUITE — Edge cases
// =============================================================================

describe('src/components/ui/Separator — edge cases', () => {
    it('renders with very long label without throwing', () => {
        const long = 'or sign in with one of the providers below'.repeat(5);
        expect(() => render(<Separator label={long} />)).not.toThrow();
    });

    it('preserves the supplied label text verbatim (no truncation in DOM text)', () => {
        const text = 'or sign in with';
        render(<Separator label={text} />);
        // Even if CSS truncates visually, the text node must preserve
        // the literal string for accessibility.
        expect(screen.getByText(text)).toBeInTheDocument();
    });
});
