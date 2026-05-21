/**
 * Cross-component color assertions.
 *
 * Target files under test (CREATED by a subsequent implementation cycle
 * per AAP Section 0.10.5):
 *   - `src/components/ui/Button.tsx`
 *   - `src/components/ui/TextInput.tsx`
 *   - `src/components/ui/SocialProviderButton.tsx`
 *   - `src/components/ui/Modal.tsx`
 *   - `src/components/sso/SignInA.tsx`
 *
 * --------------------------------------------------------------------------
 * Test scope
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.1.1 the palette is:
 *   #5B39F3 primary purple, #FFFFFF, #000000, #333333, #999999,
 *   #D9D9D9, #F5F5F5, #010101.
 *
 * Plus two gradients per AAP Section 0.10.3:
 *   - hero.panel  : the "Story" marketing panel background gradient.
 *   - days.accent : the "Days" hero word text accent gradient.
 *
 * This file asserts every visible computed color and gradient
 * declaration against the design tokens.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT modules do NOT exist yet; imports
 * below will fail with `Cannot find module ...`. This IS the expected
 * failure mode.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Colors palette enumerated.
 *   - AAP Section 0.4.2 — Colors per-component blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/component/colors.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style assertions.
 *   - AAP Section 0.10.2 — Tokens are the source of truth.
 *   - AAP Section 0.10.3 — Gradient declarations canonical.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/utils/render';
import { expectColorToken, expectGradientToken } from '@tests/utils/tokens';
import { MICROSOFT_PROVIDER } from '@tests/fixtures/oauth';

// =============================================================================
// SUT IMPORTS — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { SocialProviderButton } from '@/components/ui/SocialProviderButton';
import { Modal } from '@/components/ui/Modal';
import { SignInA } from '@/components/sso/SignInA';

// =============================================================================
// SUITE — Brand primary (#5B39F3)
// =============================================================================

describe('Colors — brand primary (#5B39F3) applied per design tokens', () => {
    it('Button (Primary/Large) background uses brand primary', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        expectColorToken(
            screen.getByRole('button', { name: 'Sign in' }),
            'background-color',
            'button.primary.background',
        );
    });

    it('Button (Secondary/Small) text colour uses brand primary', () => {
        render(
            <Button variant="secondary" size="small">
                Cancel
            </Button>,
        );
        expectColorToken(
            screen.getByRole('button', { name: 'Cancel' }),
            'color',
            'button.secondary.text',
        );
    });

    it('Button (Secondary/Small) border uses brand primary', () => {
        render(
            <Button variant="secondary" size="small">
                Cancel
            </Button>,
        );
        expectColorToken(
            screen.getByRole('button', { name: 'Cancel' }),
            'border-top-color',
            'button.secondary.border',
        );
    });
});

// =============================================================================
// SUITE — Inverse text (white) on primary surfaces
// =============================================================================

describe('Colors — inverse text (#FFFFFF) on primary surfaces', () => {
    it('Button (Primary/Large) text colour is white', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        expectColorToken(
            screen.getByRole('button', { name: 'Sign in' }),
            'color',
            'button.primary.text',
        );
    });
});

// =============================================================================
// SUITE — Body text colour (#333333)
// =============================================================================

describe('Colors — body text (#333333) on text content', () => {
    it('TextInput rendered text uses the body text colour', () => {
        render(<TextInput label="Email" name="email" />);
        expectColorToken(screen.getByLabelText('Email'), 'color', 'text.body');
    });
});

// =============================================================================
// SUITE — Surface fills
// =============================================================================

describe('Colors — surface fills (#F5F5F5 / #FFFFFF)', () => {
    it('SocialProviderButton background uses social.background (#F5F5F5)', () => {
        render(<SocialProviderButton provider={MICROSOFT_PROVIDER} onActivate={() => undefined} />);
        expectColorToken(
            screen.getByRole('button', { name: /microsoft/i }),
            'background-color',
            'social.background',
        );
    });

    it('Modal background uses modal.background (#FFFFFF)', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        expectColorToken(screen.getByRole('dialog'), 'background-color', 'modal.background');
    });
});

// =============================================================================
// SUITE — Borders
// =============================================================================

describe('Colors — border colours (#D9D9D9 default)', () => {
    it('TextInput default border colour is #D9D9D9 (border.default)', () => {
        render(<TextInput label="Email" name="email" />);
        expectColorToken(screen.getByLabelText('Email'), 'border-top-color', 'border.default');
    });
});

// =============================================================================
// SUITE — Gradient backgrounds
// =============================================================================

describe('Colors — gradient backgrounds (hero panel + Days accent)', () => {
    it('SignInA hero panel renders the hero.panel linear gradient', () => {
        render(<SignInA />);
        const heroPanel = document.querySelector('[data-section="hero"]');
        expect(heroPanel).not.toBeNull();
        if (heroPanel === null) {
            return;
        }
        expectGradientToken(heroPanel as Element, 'background-image', 'hero.panel');
    });

    it('SignInA "Days" hero word renders the days.accent gradient', () => {
        render(<SignInA />);
        // The "Days" accent is applied via background-clip: text on a
        // span inside the hero panel.
        const daysSpan = document.querySelector('[data-accent="days"]');
        expect(daysSpan).not.toBeNull();
        if (daysSpan === null) {
            return;
        }
        // The gradient is on background-image for clip:text accents.
        expectGradientToken(daysSpan as Element, 'background-image', 'days.accent');
    });
});

// =============================================================================
// SUITE — Social provider button text colour
// =============================================================================

describe('Colors — social.text (#333333) on provider buttons', () => {
    it('SocialProviderButton text uses social.text', () => {
        render(<SocialProviderButton provider={MICROSOFT_PROVIDER} onActivate={() => undefined} />);
        expectColorToken(
            screen.getByRole('button', { name: /microsoft/i }),
            'color',
            'social.text',
        );
    });
});
