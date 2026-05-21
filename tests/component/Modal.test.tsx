/**
 * Component tests for the Modal design-system primitive.
 *
 * Target file under test: `src/components/ui/Modal.tsx` (CREATED by a
 * subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Link Accounts Modal (Microsoft) : Figma 16383:42232
 *   - Link Accounts Modal (Generic)   : Figma 16383:42287
 *   - Width 512 px (LAYOUT_TOKENS.modal.width)
 *   - Radius 24 px (RADIUS_TOKENS.modal)
 *   - Shadow: SHADOW_TOKENS['modal.xl'] (Figma Shadow / xl effect verbatim)
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path:
 *     - Renders 512 px wide centred container.
 *     - 24 px border-radius.
 *     - shadow-xl token applied via box-shadow.
 *     - role="dialog" + aria-modal="true".
 *     - aria-labelledby resolves to the heading element.
 *
 *   Edge cases:
 *     - Very tall content scrolls inside the modal, not the page.
 *     - Escape closes the modal.
 *     - Click overlay closes the modal when configured (closeOnOverlayClick=true).
 *     - Click overlay does NOT close when closeOnOverlayClick=false.
 *
 *   Error cases:
 *     - Focus is trapped inside the modal — Tab cycles only through
 *       modal-internal interactive elements.
 *
 *   Performance:
 *     - Opens in less than 200 ms.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT module does NOT exist yet; the import
 * will fail with `Cannot find module '@/components/ui/Modal'`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Modal component (Figma 16383:42232).
 *   - AAP Section 0.3.1 — Modal component test target.
 *   - AAP Section 0.4.2 — Modal test-case blueprint (focus trap,
 *     aria-modal, opens <200ms).
 *   - AAP Section 0.5.1 — File row for `tests/component/Modal.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style assertions.
 *   - AAP Section 0.10.2 — user-event mandate.
 *   - AAP Section 0.10.3 — Modal shadow token verbatim.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/utils/render';
import { expectRadiusToken, expectShadowToken } from '@tests/utils/tokens';
import { LAYOUT_TOKENS } from '@tests/fixtures/design-tokens';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { Modal } from '@/components/ui/Modal';

// =============================================================================
// SUITE — Modal rendering and structure
// =============================================================================

describe('src/components/ui/Modal — rendering and structure', () => {
    it('renders nothing when isOpen=false', () => {
        render(
            <Modal isOpen={false} onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders a dialog when isOpen=true', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('exposes aria-modal="true" on the dialog', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('exposes aria-labelledby referencing the heading element', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        const labelledBy = dialog.getAttribute('aria-labelledby');
        expect(labelledBy).not.toBeNull();
        if (labelledBy !== null) {
            const heading = document.getElementById(labelledBy);
            expect(heading).not.toBeNull();
            expect(heading?.textContent).toMatch(/link your accounts/i);
        }
    });

    it('renders the body content', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Please confirm your password to continue.</p>
            </Modal>,
        );
        expect(screen.getByText(/please confirm your password to continue/i)).toBeInTheDocument();
    });
});

// =============================================================================
// SUITE — Visual tokens
// =============================================================================

describe('src/components/ui/Modal — visual tokens', () => {
    it('applies the 512 px width per layout token', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        const styles = getComputedStyle(dialog);
        expect(styles.width).toBe(LAYOUT_TOKENS.modal.width);
    });

    it('applies the 24 px border-radius per radius token', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        expectRadiusToken(dialog, 'modal');
    });

    it('applies the modal.xl box-shadow token verbatim', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        expectShadowToken(dialog, 'modal.xl');
    });
});

// =============================================================================
// SUITE — Dismissal
// =============================================================================

describe('src/components/ui/Modal — dismissal', () => {
    it('invokes onClose when Escape is pressed', async () => {
        let closes = 0;
        const { user } = render(
            <Modal
                isOpen
                onClose={() => {
                    closes += 1;
                }}
                title="Link your accounts"
            >
                <p>Body</p>
            </Modal>,
        );
        await user.keyboard('{Escape}');
        expect(closes).toBe(1);
    });

    it('invokes onClose when the overlay is clicked (closeOnOverlayClick=true)', async () => {
        let closes = 0;
        const { user, container } = render(
            <Modal
                isOpen
                closeOnOverlayClick
                onClose={() => {
                    closes += 1;
                }}
                title="Link your accounts"
            >
                <p>Body</p>
            </Modal>,
        );
        // The overlay is the element with role="presentation" outside the
        // dialog or explicitly carrying data-overlay="true". We use a
        // best-effort selector.
        const overlay = container.querySelector('[data-overlay="true"], [role="presentation"]');
        expect(overlay).not.toBeNull();
        if (overlay !== null) {
            await user.click(overlay);
            expect(closes).toBe(1);
        }
    });

    it('does NOT invoke onClose when the overlay is clicked and closeOnOverlayClick=false', async () => {
        let closes = 0;
        const { user, container } = render(
            <Modal
                isOpen
                closeOnOverlayClick={false}
                onClose={() => {
                    closes += 1;
                }}
                title="Link your accounts"
            >
                <p>Body</p>
            </Modal>,
        );
        const overlay = container.querySelector('[data-overlay="true"], [role="presentation"]');
        if (overlay !== null) {
            await user.click(overlay);
        }
        expect(closes).toBe(0);
    });
});

// =============================================================================
// SUITE — Focus management
// =============================================================================

describe('src/components/ui/Modal — focus management', () => {
    it('focuses the first interactive element on open', () => {
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <button type="button">First</button>
                <button type="button">Second</button>
            </Modal>,
        );
        // The dialog itself (with tabIndex=-1) OR the first interactive
        // element should hold focus. Both are valid per WAI-ARIA dialog
        // pattern.
        const first = screen.getByRole('button', { name: 'First' });
        const dialog = screen.getByRole('dialog');
        expect(document.activeElement === first || document.activeElement === dialog).toBe(true);
    });

    it('traps Tab navigation inside the modal', async () => {
        const { user } = render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <button type="button">First</button>
                <button type="button">Last</button>
            </Modal>,
        );
        const first = screen.getByRole('button', { name: 'First' });
        const last = screen.getByRole('button', { name: 'Last' });
        // Focus the last interactive element then tab forward — focus
        // must cycle back to the first interactive element in the modal.
        last.focus();
        await user.tab();
        expect(document.activeElement).toBe(first);
    });

    it('traps Shift+Tab navigation inside the modal', async () => {
        const { user } = render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <button type="button">First</button>
                <button type="button">Last</button>
            </Modal>,
        );
        const first = screen.getByRole('button', { name: 'First' });
        const last = screen.getByRole('button', { name: 'Last' });
        first.focus();
        await user.tab({ shift: true });
        expect(document.activeElement).toBe(last);
    });
});

// =============================================================================
// SUITE — Edge cases
// =============================================================================

describe('src/components/ui/Modal — edge cases', () => {
    it('renders very tall content with overflow scrolling inside the dialog', () => {
        const tallContent = Array.from({ length: 100 }, (_, i) => <p key={i}>Line {i}</p>);
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                {tallContent}
            </Modal>,
        );
        const dialog = screen.getByRole('dialog');
        // Inside the modal SOMETHING must have overflow-y: auto/scroll
        // so the modal contains its own scroll context. We look for any
        // descendant element with that overflow setting.
        const candidates = Array.from(dialog.querySelectorAll('*')).concat([dialog]);
        const hasInternalScroll = candidates.some((el) => {
            const overflow = getComputedStyle(el).overflowY;
            return overflow === 'auto' || overflow === 'scroll';
        });
        expect(hasInternalScroll).toBe(true);
    });
});

// =============================================================================
// SUITE — Performance budget
// =============================================================================

describe('src/components/ui/Modal — performance budget', () => {
    it('mounts in under 200 ms in the test environment', () => {
        const start = performance.now();
        render(
            <Modal isOpen onClose={() => undefined} title="Link your accounts">
                <p>Body</p>
            </Modal>,
        );
        const elapsed = performance.now() - start;
        // Per AAP Section 0.4.2: modal opens in less than 200 ms. Even
        // in a slow CI worker, the React render itself completes in a
        // few ms — 200 ms is a generous ceiling that captures regressions
        // in expensive renderprep without flaking on busy machines.
        expect(elapsed).toBeLessThan(200);
    });
});
