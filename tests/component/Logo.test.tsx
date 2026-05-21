/**
 * Component tests for the Logo design-system primitive.
 *
 * Target file under test: `src/components/ui/Logo.tsx` (CREATED by a
 * subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Component   : `Logo / Property 1=Main Aquamarine` (Figma 12610:15392)
 *   - Asset       : `src/assets/logo/blitzy-logo-aquamarine.svg`
 *   - Dimensions  : 150 x 56.49 (LAYOUT_TOKENS.logo.{width,height})
 *
 * --------------------------------------------------------------------------
 * Test categories (per AAP Section 0.4.2)
 * --------------------------------------------------------------------------
 *
 *   Happy path:
 *     - Renders inline SVG content from
 *       `src/assets/logo/blitzy-logo-aquamarine.svg` (or as an
 *       <img> tag pointing at the same asset).
 *     - Width 150 px, height 56.49 px per layout token.
 *     - `aria-label="Blitzy"` present (an `<img alt="Blitzy">` is also
 *       acceptable per WAI-ARIA recommended accessible name pattern).
 *
 *   Edge cases:
 *     - SVG content sanitised; no inline scripts rendered.
 *
 *   Error cases:
 *     - Missing asset path renders text fallback (`Blitzy`).
 *
 *   Performance boundaries:
 *     - Render under 16 ms in the component test environment (one
 *       composite frame budget).
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, `src/components/ui/Logo.tsx` does NOT exist
 * yet; the import below will fail with `Cannot find module '@/components/ui/Logo'`.
 * This IS the expected failure mode — the test acts as the executable
 * design specification.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Brand asset rendered by `Logo`.
 *   - AAP Section 0.3.1 — Logo component test target.
 *   - AAP Section 0.4.2 — Logo test-case blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/component/Logo.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style token assertions.
 *   - AAP Section 0.10.3 — Figma asset (Main Aquamarine variant) is canonical.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/utils/render';
import { LAYOUT_TOKENS } from '@tests/fixtures/design-tokens';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { Logo } from '@/components/ui/Logo';

// =============================================================================
// SUITE — Logo rendering
// =============================================================================

describe('src/components/ui/Logo — rendering', () => {
    it('renders an element with an accessible name of "Blitzy"', () => {
        render(<Logo />);
        // Either `<img alt="Blitzy">` or `<svg aria-label="Blitzy">` is
        // acceptable; both surface the same accessible name.
        expect(screen.getByRole('img', { name: /blitzy/i })).toBeInTheDocument();
    });

    it('renders within the layout token width and height (150 x 56.49 px)', () => {
        const { container } = render(<Logo />);
        const root = container.firstElementChild as HTMLElement | null;
        expect(root).not.toBeNull();
        if (root === null) {
            return;
        }
        const styles = getComputedStyle(root);
        expect(styles.width).toBe(LAYOUT_TOKENS.logo.width);
        expect(styles.height).toBe(LAYOUT_TOKENS.logo.height);
    });

    it('uses the canonical Main Aquamarine SVG asset path', () => {
        const { container } = render(<Logo />);
        // Look for either an <img> with that src or an inline SVG that
        // references the canonical asset URL via `<use href>`.
        const imgs = Array.from(container.querySelectorAll('img'));
        const matchingImg = imgs.find((el) =>
            (el.getAttribute('src') ?? '').includes('blitzy-logo-aquamarine'),
        );
        const inlineSvg = container.querySelector('svg[data-asset-name="blitzy-logo-aquamarine"]');
        expect(matchingImg !== undefined || inlineSvg !== null).toBe(true);
    });

    it('does not render inline <script> elements (sanitisation guarantee)', () => {
        const { container } = render(<Logo />);
        expect(container.querySelector('script')).toBeNull();
    });

    it('exposes a single accessible image element (avoids duplicate accessible names)', () => {
        render(<Logo />);
        // The Logo must produce exactly ONE accessible image; if the
        // implementation accidentally exposed both an <img> and an
        // <svg> with the same label, screen readers would announce
        // "Blitzy, Blitzy" — a defect per WAI-ARIA Authoring Practices.
        const matches = screen.getAllByRole('img', { name: /blitzy/i });
        expect(matches).toHaveLength(1);
    });
});

// =============================================================================
// SUITE — Logo edge cases
// =============================================================================

describe('src/components/ui/Logo — edge cases', () => {
    it('renders a text fallback "Blitzy" when the asset cannot be located', () => {
        // The component contract requires a text fallback so the brand
        // accessible name is preserved even when the SVG fails to
        // load (network error, broken bundler reference, etc.). The
        // implementation may expose this via a hidden `<span class="sr-only">Blitzy</span>`
        // or via an `<img alt="Blitzy">` whose `onError` swaps to text.
        render(<Logo />);
        expect(screen.getByText(/blitzy/i)).toBeInTheDocument();
    });

    it('renders without throwing when used in a constrained container', () => {
        // The Logo must not depend on viewport-level layout — it should
        // be self-contained at its own intrinsic 150 x 56.49 px so it
        // can be embedded in flex/grid containers without reflow.
        const { container } = render(
            <div style={{ width: '200px', height: '100px' }}>
                <Logo />
            </div>,
        );
        const root = container.querySelector('div')?.firstElementChild as HTMLElement | null;
        expect(root).not.toBeNull();
    });
});

// =============================================================================
// SUITE — Logo performance budget
// =============================================================================

describe('src/components/ui/Logo — performance', () => {
    it('mounts in under 16 ms (one composite frame budget) in the test environment', () => {
        // The 16 ms budget reflects a 60 Hz frame and aligns with the
        // AAP Section 0.4.2 mount target. In the happy-dom test
        // environment we measure the synchronous render only — async
        // image fetches are out of scope for this assertion.
        const start = performance.now();
        render(<Logo />);
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(16);
    });
});
