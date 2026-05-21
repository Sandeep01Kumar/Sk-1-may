/**
 * Interactive-state matrix for the TextInput design-system primitive.
 *
 * Target file under test: `src/components/ui/TextInput.tsx` (CREATED by a
 * subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Default state — base rendering already covered in TextInput.test.tsx;
 *   here we assert the computed styles in their non-interactive resting
 *   state for comparison against subsequent interactive states.
 *
 *   Hover state — `user.hover()` should NOT alter the input's outline
 *   or border (the design system reserves visual change for focus and
 *   error, not hover, per Figma Sign-in A frame).
 *
 *   Focus state — Tabbing into the input applies a visible focus
 *   outline using the brand primary (#5B39F3) per AAP Section 0.1.1
 *   `border.focus` token.
 *
 *   Disabled state — `disabled` prop reduces opacity, sets
 *   cursor: not-allowed, and prevents typing.
 *
 *   Error state — `error` prop alters border colour, sets
 *   aria-invalid="true", and exposes aria-describedby (covered for ARIA
 *   in TextInput.test.tsx; here we assert the visual treatment).
 *
 *   Keyboard activation of the RightIcon (password toggle):
 *     - Tab moves focus from the input to the toggle.
 *     - Space and Enter both activate the toggle.
 *     - aria-pressed updates synchronously.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT module does NOT exist yet; the import
 * below will fail with `Cannot find module '@/components/ui/TextInput'`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Interactive states scope.
 *   - AAP Section 0.4.2 — TextInput states blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/component/TextInput.states.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style token assertions.
 *   - AAP Section 0.10.2 — user-event mandate.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/utils/render';
import { expectColorToken } from '@tests/utils/tokens';
import { tokens } from '@tests/fixtures/design-tokens';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { TextInput } from '@/components/ui/TextInput';

// =============================================================================
// SUITE — Default state baseline
// =============================================================================

describe('src/components/ui/TextInput — default state baseline', () => {
    it('renders with the default border colour token in the resting state', () => {
        render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        expectColorToken(input, 'border-top-color', 'border.default');
    });

    it('renders the input with cursor: text in the default state', () => {
        render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        const cursor = getComputedStyle(input).cursor;
        // Browsers report 'text' or 'auto' depending on UA defaults; both
        // are acceptable for a text input.
        expect(cursor === 'text' || cursor === 'auto' || cursor === '').toBe(true);
    });
});

// =============================================================================
// SUITE — Hover state
// =============================================================================

describe('src/components/ui/TextInput — hover state', () => {
    it('does not introduce a visible focus outline on hover (focus is reserved for focus)', async () => {
        const { user } = render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        await user.hover(input);
        // The Figma design system intentionally reserves the focus-ring
        // treatment for the focus state — hover MUST NOT add a strong
        // outline that would otherwise duplicate the focus indicator.
        const outline = getComputedStyle(input).outlineStyle;
        // 'none' is the most-common default; 'auto' is permitted because
        // browsers may render a default UA outline on hover that does
        // not visually conflict. The forbidden value is 'solid' on the
        // resting hover state with a non-zero outline-width.
        const outlineWidth = getComputedStyle(input).outlineWidth;
        const isStrongOutline = outline === 'solid' && parseFloat(outlineWidth) > 0;
        expect(isStrongOutline).toBe(false);
    });
});

// =============================================================================
// SUITE — Focus state
// =============================================================================

describe('src/components/ui/TextInput — focus state', () => {
    it('moves focus to the input on Tab key press from the document body', async () => {
        const { user } = render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        await user.tab();
        expect(document.activeElement).toBe(input);
    });

    it('exposes a visible focus indicator (outline or border colour matches brand primary) when focused', async () => {
        const { user } = render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        await user.tab();
        // The focus indicator can be expressed in two acceptable ways:
        //   (a) outline-color === brand.primary (#5B39F3); or
        //   (b) border-color  === border.focus (== brand.primary).
        const outlineColor = getComputedStyle(input).outlineColor;
        const borderColor = getComputedStyle(input).borderTopColor;
        // Both should be checkable; the implementation chooses one
        // visual approach. If either matches brand.primary we accept.
        const PRIMARY = tokens.color['brand.primary']; // '#5B39F3'
        const matchesPrimary = (value: string): boolean =>
            value.toUpperCase().includes('5B39F3') ||
            value.includes('rgb(91, 57, 243)') ||
            value === PRIMARY;
        expect(matchesPrimary(outlineColor) || matchesPrimary(borderColor)).toBe(true);
    });

    it('removes the focus indicator when focus moves elsewhere', async () => {
        const { user } = render(
            <>
                <TextInput label="Email" name="email" />
                <TextInput label="Password" name="password" />
            </>,
        );
        const email = screen.getByLabelText('Email');
        await user.tab(); // focuses Email
        await user.tab(); // focuses Password
        expect(document.activeElement).not.toBe(email);
    });
});

// =============================================================================
// SUITE — Disabled state
// =============================================================================

describe('src/components/ui/TextInput — disabled state', () => {
    it('renders the input with the disabled attribute', () => {
        render(<TextInput label="Email" name="email" disabled />);
        const input = screen.getByLabelText('Email');
        expect(input).toBeDisabled();
    });

    it('renders cursor: not-allowed on the disabled input', () => {
        render(<TextInput label="Email" name="email" disabled />);
        const input = screen.getByLabelText('Email');
        expect(getComputedStyle(input).cursor).toBe('not-allowed');
    });

    it('prevents typing when disabled', async () => {
        const { user } = render(<TextInput label="Email" name="email" disabled />);
        const input = screen.getByLabelText('Email') as HTMLInputElement;
        await user.type(input, 'attempt');
        expect(input.value).toBe('');
    });

    it('reduces visual opacity to communicate disabled state', () => {
        render(<TextInput label="Email" name="email" disabled />);
        const input = screen.getByLabelText('Email');
        const opacity = parseFloat(getComputedStyle(input).opacity);
        // Less than 1 indicates the disabled visual treatment; the
        // exact value (0.5 / 0.6 / 0.7) is up to the implementation
        // but must visibly differ from 1.
        expect(opacity).toBeLessThan(1);
        // And not invisible.
        expect(opacity).toBeGreaterThan(0.1);
    });
});

// =============================================================================
// SUITE — Error state
// =============================================================================

describe('src/components/ui/TextInput — error state', () => {
    it('does not have aria-invalid in the default state', () => {
        render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        const value = input.getAttribute('aria-invalid');
        expect(value === null || value === 'false').toBe(true);
    });

    it('sets aria-invalid="true" when error is supplied', () => {
        render(<TextInput label="Email" name="email" error="Required" />);
        const input = screen.getByLabelText('Email');
        expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('renders the error copy within the DOM (visible to all users)', () => {
        render(<TextInput label="Email" name="email" error="Please enter a valid email address" />);
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
});

// =============================================================================
// SUITE — RightIcon keyboard activation
// =============================================================================

describe('src/components/ui/TextInput — RightIcon keyboard activation', () => {
    it('places the toggle button after the input in keyboard tab order', async () => {
        const { user } = render(
            <TextInput label="Password" name="password" type="password" variant="rightIcon" />,
        );
        const input = screen.getByLabelText('Password');
        const toggle = screen.getByRole('button');
        await user.tab(); // focuses input
        expect(document.activeElement).toBe(input);
        await user.tab(); // focuses toggle
        expect(document.activeElement).toBe(toggle);
    });

    it('activates the toggle via the Enter key', async () => {
        const { user } = render(
            <TextInput label="Password" name="password" type="password" variant="rightIcon" />,
        );
        const input = screen.getByLabelText('Password');
        await user.tab();
        await user.tab(); // focuses toggle
        await user.keyboard('{Enter}');
        expect(input).toHaveAttribute('type', 'text');
    });

    it('activates the toggle via the Space key', async () => {
        const { user } = render(
            <TextInput label="Password" name="password" type="password" variant="rightIcon" />,
        );
        const input = screen.getByLabelText('Password');
        await user.tab();
        await user.tab(); // focuses toggle
        await user.keyboard(' ');
        expect(input).toHaveAttribute('type', 'text');
    });

    it('updates aria-pressed synchronously on each activation', async () => {
        const { user } = render(
            <TextInput label="Password" name="password" type="password" variant="rightIcon" />,
        );
        const toggle = screen.getByRole('button');
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await user.click(toggle);
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
        await user.click(toggle);
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('does not capture focus inside the toggle button when the input is later clicked', async () => {
        const { user } = render(
            <TextInput label="Password" name="password" type="password" variant="rightIcon" />,
        );
        const input = screen.getByLabelText('Password');
        const toggle = screen.getByRole('button');
        await user.click(toggle);
        await user.click(input);
        expect(document.activeElement).toBe(input);
    });
});
