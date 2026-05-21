/**
 * Cross-component animation assertions.
 *
 * Target files under test (CREATED by a subsequent implementation cycle
 * per AAP Section 0.10.5):
 *   - `src/components/ui/Button.tsx`
 *   - `src/components/ui/TextInput.tsx`
 *   - `src/components/ui/Modal.tsx`
 *   - `src/components/sso/SignInC.tsx`
 *
 * --------------------------------------------------------------------------
 * Test scope
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.4.2 the SSO surface enforces transition budgets:
 *   - Modal opens in less than 200 ms  -> `duration.base`
 *   - Sign-in C provider list expansion under 250 ms
 *                                       -> `duration.slow`
 *   - Micro-interactions (button hover, focus ring fade-in) at the
 *     150 ms mark                       -> `duration.fast`
 *
 * Per AAP Section 0.10.2 timing functions must be drawn from the
 * canonical CSS easing set (ease / ease-in / ease-out / ease-in-out)
 * documented in TRANSITION_TOKENS.timing.
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
 *   - AAP Section 0.1.1 — Animation assertions scope.
 *   - AAP Section 0.4.2 — Animation duration budgets.
 *   - AAP Section 0.5.1 — File row for `tests/component/animations.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style assertions.
 *   - AAP Section 0.10.2 — Tokens are the source of truth.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/utils/render';
import { TRANSITION_TOKENS } from '@tests/fixtures/design-tokens';

// =============================================================================
// SUT IMPORTS — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Modal } from '@/components/ui/Modal';
import { SignInC } from '@/components/sso/SignInC';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Parse a transition-duration string ("200ms" or "0.2s") into milliseconds.
 *
 * Returns 0 when the value is the empty string (no transition declared).
 */
function durationToMs(raw: string): number {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === '0' || trimmed === '0s' || trimmed === '0ms') {
        return 0;
    }
    if (trimmed.endsWith('ms')) {
        return Number.parseFloat(trimmed);
    }
    if (trimmed.endsWith('s')) {
        return Number.parseFloat(trimmed) * 1000;
    }
    return Number.parseFloat(trimmed);
}

/**
 * The acceptable set of CSS timing-function values per design tokens.
 */
const ACCEPTABLE_TIMING_FUNCTIONS: readonly string[] = Object.values(TRANSITION_TOKENS.timing);

// =============================================================================
// SUITE — Modal animation budget
// =============================================================================

describe('Animations — Modal open transition budget (200 ms ceiling)', () => {
    it('Modal declares a transition-duration at or below 200 ms', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        const declaredDuration = getComputedStyle(dialog).transitionDuration;
        const ms = durationToMs(declaredDuration);
        // 0 ms is acceptable (no animation); the budget enforces the
        // upper ceiling.
        expect(ms).toBeLessThanOrEqual(durationToMs(TRANSITION_TOKENS.duration.base));
    });

    it('Modal declares a recognised timing function (ease/ease-in/ease-out/ease-in-out)', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        const declared = getComputedStyle(dialog).transitionTimingFunction;
        if (declared === '' || declared === 'all') {
            // No declared timing function — acceptable when there is
            // also no declared duration.
            return;
        }
        const declaredList = declared.split(',').map((s) => s.trim());
        for (const tf of declaredList) {
            // Each timing function in the list must be a recognised
            // CSS easing keyword. We accept the keyword form ("ease",
            // "ease-in", ...) and also cubic-bezier(...) forms when the
            // implementation chooses a custom curve. Any string that
            // does NOT belong in either set fails the assertion.
            const isKeyword = ACCEPTABLE_TIMING_FUNCTIONS.includes(tf);
            const isCubicBezier = tf.startsWith('cubic-bezier');
            const isLinear = tf === 'linear' || tf === 'step-start' || tf === 'step-end';
            expect(isKeyword || isCubicBezier || isLinear).toBe(true);
        }
    });
});

// =============================================================================
// SUITE — Sign-in C expansion budget
// =============================================================================

describe('Animations — Sign-in C provider-list expansion budget (250 ms ceiling)', () => {
    it('SignInC expansion container declares transition-duration <= 250 ms', () => {
        render(<SignInC />);
        // The provider-list expansion container is marked via a stable
        // data attribute so the test does not depend on internal class
        // names.
        const list = document.querySelector('[data-section="provider-list"]');
        expect(list).not.toBeNull();
        if (list === null) {
            return;
        }
        const declaredDuration = getComputedStyle(list).transitionDuration;
        const ms = durationToMs(declaredDuration);
        expect(ms).toBeLessThanOrEqual(durationToMs(TRANSITION_TOKENS.duration.slow));
    });
});

// =============================================================================
// SUITE — Button micro-interaction budget
// =============================================================================

describe('Animations — Button micro-interaction budget (150 ms ceiling)', () => {
    it('Button declares transition-duration <= 150 ms for hover/focus transitions', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        const declaredDuration = getComputedStyle(btn).transitionDuration;
        const ms = durationToMs(declaredDuration);
        expect(ms).toBeLessThanOrEqual(durationToMs(TRANSITION_TOKENS.duration.fast));
    });

    it('TextInput declares transition-duration <= 150 ms for focus border-colour transition', () => {
        render(<TextInput label="Email" name="email" />);
        const input = screen.getByLabelText('Email');
        const declaredDuration = getComputedStyle(input).transitionDuration;
        const ms = durationToMs(declaredDuration);
        expect(ms).toBeLessThanOrEqual(durationToMs(TRANSITION_TOKENS.duration.fast));
    });
});

// =============================================================================
// SUITE — Timing-function tokens
// =============================================================================

describe('Animations — timing-function tokens', () => {
    it('Button timing-function is drawn from the canonical CSS easing set or cubic-bezier', () => {
        render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Sign in' });
        const declared = getComputedStyle(btn).transitionTimingFunction;
        if (declared === '' || declared === 'all') {
            return;
        }
        const list = declared.split(',').map((s) => s.trim());
        for (const tf of list) {
            const isKeyword = ACCEPTABLE_TIMING_FUNCTIONS.includes(tf);
            const isCubicBezier = tf.startsWith('cubic-bezier');
            const isLinear = tf === 'linear' || tf === 'step-start' || tf === 'step-end';
            expect(isKeyword || isCubicBezier || isLinear).toBe(true);
        }
    });
});

// =============================================================================
// SUITE — prefers-reduced-motion contract (documentation-only at component layer)
// =============================================================================

describe('Animations — prefers-reduced-motion safety', () => {
    it('Modal renders without throwing when prefers-reduced-motion is active', () => {
        // The component test layer cannot programmatically alter the
        // prefers-reduced-motion media query inside happy-dom; this
        // test enforces only that the component renders without
        // throwing — the actual reduced-motion behaviour is exercised
        // at the E2E layer via Playwright `emulate({ reducedMotion: 'reduce' })`.
        expect(() =>
            render(
                <Modal isOpen onClose={() => undefined} title="Link your accounts">
                    <p>Body</p>
                </Modal>,
            ),
        ).not.toThrow();
    });
});
