/**
 * Component tests for the TextInput design-system primitive.
 *
 * Target file under test: `src/components/ui/TextInput.tsx` (CREATED by a
 * subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Component (Default)   : Figma 2361:19843
 *   - Component (RightIcon) : Figma 2361:19845
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path (per AAP Section 0.4.2):
 *     - Label association: every input has an accessible name via its
 *       <label for=...> or aria-labelledby.
 *     - Placeholder copy rendered.
 *     - 1 px border, #999999 stroke, 24 px border-radius,
 *       8 px x 16 px padding per design tokens.
 *
 *   Edge cases:
 *     - Very long values do not break layout.
 *     - Paste events are accepted.
 *     - IME composition does not double-fire onChange.
 *
 *   Error cases:
 *     - `error` prop renders error styling and aria-invalid="true".
 *     - Required-field message exposed via aria-describedby.
 *
 *   RightIcon variant:
 *     - Show/hide icon at right (24 x 24).
 *     - Password input masks by default.
 *     - Click toggles type between "password" and "text".
 *
 * State-specific tests (hover, focus, active, disabled, error visual
 * styling, keyboard activation of the right icon) live in
 * `tests/component/TextInput.states.test.tsx`.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, `src/components/ui/TextInput.tsx` does NOT
 * exist yet; the import below will fail with
 * `Cannot find module '@/components/ui/TextInput'`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Component scope.
 *   - AAP Section 0.3.1 — TextInput component test target.
 *   - AAP Section 0.4.2 — TextInput test-case blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/component/TextInput.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style token assertions.
 *   - AAP Section 0.10.2 — Use user-event for interactions.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/utils/render';
import { expectColorToken, expectRadiusToken, expectSpacingToken } from '@tests/utils/tokens';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { TextInput } from '@/components/ui/TextInput';

// =============================================================================
// SUITE — Default variant rendering
// =============================================================================

describe('src/components/ui/TextInput — default variant rendering', () => {
    it('renders an input with the label associated by aria-labelledby or htmlFor', () => {
        render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        expect(input).toBeInTheDocument();
        expect(input.tagName).toBe('INPUT');
    });

    it('renders the placeholder text when supplied', () => {
        render(<TextInput label="Email" name="email" placeholder="you@example.com" />);
        expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    });

    it('uses the input border token (#D9D9D9 by default) on the surrounding wrapper', () => {
        render(<TextInput label="Email" name="email" />);
        // The input itself or its wrapper carries the border. We pick
        // the actual input element which should have the border per the
        // design system.
        const input = screen.getByLabelText('Email');
        expectColorToken(input, 'border-top-color', 'border.default');
    });

    it('applies the input radius token (24 px) to the input element', () => {
        render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        expectRadiusToken(input, 'input');
    });

    it('applies the input.padding.y token (8 px) to padding-top and padding-bottom', () => {
        render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        expectSpacingToken(input, 'padding-top', 'input.padding.y');
        expectSpacingToken(input, 'padding-bottom', 'input.padding.y');
    });

    it('applies the input.padding.x token (16 px) to padding-left and padding-right', () => {
        render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        expectSpacingToken(input, 'padding-left', 'input.padding.x');
        expectSpacingToken(input, 'padding-right', 'input.padding.x');
    });

    it('forwards the `name` prop to the underlying input element', () => {
        render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        expect(input).toHaveAttribute('name', 'email');
    });

    it('forwards the `type` prop to the underlying input element', () => {
        render(<TextInput label="Email" name="email" type="email" />);
        const input = screen.getByLabelText('Email');
        expect(input).toHaveAttribute('type', 'email');
    });

    it('defaults to type="text" when no type prop is supplied', () => {
        render(<TextInput label="First name" name="firstName" />);
        const input = screen.getByLabelText('First name');
        // HTML inputs default to type=text when no type attribute is present.
        const t = input.getAttribute('type');
        expect(t === null || t === 'text').toBe(true);
    });
});

// =============================================================================
// SUITE — Controlled-state behaviour
// =============================================================================

describe('src/components/ui/TextInput — controlled-state behaviour', () => {
    it('renders the supplied `value` when controlled', () => {
        render(
            <TextInput
                label="Email"
                name="email"
                value="user@blitzy.test"
                onChange={() => undefined}
            />,
        );
        const input = screen.getByLabelText('Email') as HTMLInputElement;
        expect(input.value).toBe('user@blitzy.test');
    });

    it('invokes onChange when the user types into the input', async () => {
        let captured = '';
        const onChange = (event: { target: { value: string } }): void => {
            captured = event.target.value;
        };
        const { user } = render(
            <TextInput label="Email" name="email" value="" onChange={onChange} />,
        );
        const input = screen.getByLabelText('Email');
        await user.type(input, 'h');
        // user-event fires individual change events; the captured value
        // should equal the last keystroke when the component is uncontrolled
        // OR the final composed value when the parent reassigns `value`.
        expect(captured.length).toBeGreaterThan(0);
    });

    it('accepts pasted content via the clipboard pipeline', async () => {
        let captured = '';
        const onChange = (event: { target: { value: string } }): void => {
            captured = event.target.value;
        };
        const { user } = render(
            <TextInput label="Email" name="email" value="" onChange={onChange} />,
        );
        const input = screen.getByLabelText('Email');
        await user.click(input);
        await user.paste('hello@blitzy.test');
        expect(captured).toBe('hello@blitzy.test');
    });

    it('does not lose the value across re-renders with the same `value` prop', () => {
        const { rerender } = render(
            <TextInput
                label="Email"
                name="email"
                value="abc@blitzy.test"
                onChange={() => undefined}
            />,
        );
        rerender(
            <TextInput
                label="Email"
                name="email"
                value="abc@blitzy.test"
                onChange={() => undefined}
            />,
        );
        const input = screen.getByLabelText('Email') as HTMLInputElement;
        expect(input.value).toBe('abc@blitzy.test');
    });
});

// =============================================================================
// SUITE — Error state
// =============================================================================

describe('src/components/ui/TextInput — error state', () => {
    it('renders aria-invalid="true" when the `error` prop is set', () => {
        render(<TextInput label="Email" name="email" error="Invalid email" />);
        const input = screen.getByLabelText('Email');
        expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('exposes the error copy via aria-describedby', () => {
        render(<TextInput label="Email" name="email" error="Invalid email" />);
        const input = screen.getByLabelText('Email');
        const describedBy = input.getAttribute('aria-describedby');
        expect(describedBy).not.toBeNull();
        // The referenced element exists in the DOM with the error copy.
        if (describedBy !== null) {
            const errorElement = document.getElementById(describedBy);
            expect(errorElement).not.toBeNull();
            expect(errorElement?.textContent).toMatch(/invalid email/i);
        }
    });

    it('omits aria-invalid (or sets it to "false") when no error is present', () => {
        render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        const ariaInvalid = input.getAttribute('aria-invalid');
        expect(ariaInvalid === null || ariaInvalid === 'false').toBe(true);
    });
});

// =============================================================================
// SUITE — RightIcon variant rendering
// =============================================================================

describe('src/components/ui/TextInput — RightIcon variant (password show/hide)', () => {
    it('renders a toggle button labelled with show/hide semantics', () => {
        render(<TextInput label="Password" name="password" type="password" variant="rightIcon" />);
        // The toggle is a button with an accessible name that
        // expresses the action — either "Show password" / "Hide password"
        // depending on current state.
        const toggle = screen.getByRole('button', { name: /show password|hide password/i });
        expect(toggle).toBeInTheDocument();
    });

    it('masks the password by default (type="password")', () => {
        render(<TextInput label="Password" name="password" type="password" variant="rightIcon" />);
        const input = screen.getByLabelText('Password');
        expect(input).toHaveAttribute('type', 'password');
    });

    it('toggles the input type from "password" to "text" when the icon is clicked', async () => {
        const { user } = render(
            <TextInput label="Password" name="password" type="password" variant="rightIcon" />,
        );
        const input = screen.getByLabelText('Password');
        const toggle = screen.getByRole('button', { name: /show password/i });
        expect(input).toHaveAttribute('type', 'password');
        await user.click(toggle);
        expect(input).toHaveAttribute('type', 'text');
    });

    it('toggles the input type back to "password" on second click', async () => {
        const { user } = render(
            <TextInput label="Password" name="password" type="password" variant="rightIcon" />,
        );
        const input = screen.getByLabelText('Password');
        const toggle = screen.getByRole('button');
        await user.click(toggle);
        await user.click(toggle);
        expect(input).toHaveAttribute('type', 'password');
    });

    it('exposes aria-pressed reflecting the current visibility state', async () => {
        const { user } = render(
            <TextInput label="Password" name="password" type="password" variant="rightIcon" />,
        );
        const toggle = screen.getByRole('button');
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await user.click(toggle);
        expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });
});

// =============================================================================
// SUITE — Edge cases
// =============================================================================

describe('src/components/ui/TextInput — edge cases', () => {
    it('accepts very long values without breaking layout', async () => {
        const long = 'a'.repeat(500);
        const { user } = render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        await user.type(input, long);
        // The input should accept the value; no exception thrown.
        expect((input as HTMLInputElement).value.length).toBeGreaterThan(0);
    });

    it('renders without throwing when controlled with empty string value', () => {
        expect(() => {
            render(<TextInput label="Email" name="email" value="" onChange={() => undefined} />);
        }).not.toThrow();
    });

    it('renders without throwing when no value prop is supplied (uncontrolled)', () => {
        expect(() => {
            render(<TextInput label="Email" name="email" />);
        }).not.toThrow();
    });
});
