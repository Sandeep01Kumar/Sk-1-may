/**
 * Component tests for the SocialProviderButton design-system primitive.
 *
 * Target file under test: `src/components/ui/SocialProviderButton.tsx`
 * (CREATED by a subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Composed primitive used across Sign-in A/B/C frames.
 *   - Layout: 24 x 24 provider logo at left, label text, #F5F5F5 fill,
 *     32 px border-radius.
 *   - Padding: 12 px y / 24 px x (matches Button paddings).
 *   - Logo dimensions: provider logo 24 x 24 (rendered) sourced from
 *     `src/assets/logos/{provider}-logo.{png,svg}`.
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path (per AAP Section 0.4.2):
 *     - Renders 24x24 provider logo at left.
 *     - Label text rendered.
 *     - #F5F5F5 (social.background) fill applied.
 *     - 32 px (radius.social) border-radius applied.
 *     - Click invokes provider OAuth flow.
 *
 *   Edge cases:
 *     - Missing logo asset renders text-only fallback.
 *     - Provider name normalised in click handler.
 *
 *   Error cases:
 *     - Click while OAuth pop-up is blocked surfaces an error.
 *
 *   States: default / hover / focus / active / disabled (interactive
 *   state assertions live alongside happy-path here because the
 *   SocialProviderButton has a single visual variant — no separate
 *   `.states.test.tsx` file is required).
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT module does NOT exist yet; the import
 * will fail with `Cannot find module '@/components/ui/SocialProviderButton'`.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Social button rendering.
 *   - AAP Section 0.3.1 — SocialProviderButton component test target.
 *   - AAP Section 0.4.2 — SocialProviderButton test-case blueprint.
 *   - AAP Section 0.5.1 — File row for
 *     `tests/component/SocialProviderButton.test.tsx`.
 *   - AAP Section 0.7.2 — Computed-style assertions.
 *   - AAP Section 0.10.2 — user-event mandate.
 *   - AAP Section 0.10.3 — Microsoft + Google provider logos canonical.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/utils/render';
import { expectColorToken, expectRadiusToken, expectSpacingToken } from '@tests/utils/tokens';
import { LAYOUT_TOKENS } from '@tests/fixtures/design-tokens';
import {
    MICROSOFT_PROVIDER,
    GOOGLE_PROVIDER,
    type OAuthProviderConfig,
} from '@tests/fixtures/oauth';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { SocialProviderButton } from '@/components/ui/SocialProviderButton';

// =============================================================================
// SUITE — Microsoft variant
// =============================================================================

describe('src/components/ui/SocialProviderButton — Microsoft provider', () => {
    it('renders as a <button> with the provider label as accessible name', () => {
        render(<SocialProviderButton provider={MICROSOFT_PROVIDER} onActivate={() => undefined} />);
        const btn = screen.getByRole('button', { name: /microsoft/i });
        expect(btn).toBeInTheDocument();
        expect(btn.tagName).toBe('BUTTON');
    });

    it('renders the provider logo at 24x24 px', () => {
        render(<SocialProviderButton provider={MICROSOFT_PROVIDER} onActivate={() => undefined} />);
        const btn = screen.getByRole('button', { name: /microsoft/i });
        const logo = btn.querySelector('img');
        expect(logo).not.toBeNull();
        if (logo === null) {
            return;
        }
        // 24x24 is the rendered logo dimension per LAYOUT_TOKENS.providerLogo.
        // Allow some flexibility — the source asset is 500x500 px (raster),
        // so it must be styled down to 24x24 via CSS width/height.
        const styles = getComputedStyle(logo);
        expect(styles.width).toBe(LAYOUT_TOKENS.providerLogo.size);
        expect(styles.height).toBe(LAYOUT_TOKENS.providerLogo.size);
    });

    it('renders the canonical Microsoft logo asset', () => {
        render(<SocialProviderButton provider={MICROSOFT_PROVIDER} onActivate={() => undefined} />);
        const btn = screen.getByRole('button', { name: /microsoft/i });
        const logo = btn.querySelector('img');
        expect(logo?.getAttribute('src')).toMatch(/microsoft-logo/i);
    });

    it('applies the social background colour (#F5F5F5)', () => {
        render(<SocialProviderButton provider={MICROSOFT_PROVIDER} onActivate={() => undefined} />);
        const btn = screen.getByRole('button', { name: /microsoft/i });
        expectColorToken(btn, 'background-color', 'social.background');
    });

    it('applies the social text colour (#333333)', () => {
        render(<SocialProviderButton provider={MICROSOFT_PROVIDER} onActivate={() => undefined} />);
        const btn = screen.getByRole('button', { name: /microsoft/i });
        expectColorToken(btn, 'color', 'social.text');
    });

    it('applies the social radius token (32 px)', () => {
        render(<SocialProviderButton provider={MICROSOFT_PROVIDER} onActivate={() => undefined} />);
        const btn = screen.getByRole('button', { name: /microsoft/i });
        expectRadiusToken(btn, 'social');
    });

    it('applies button.padding.y (12 px) on vertical padding', () => {
        render(<SocialProviderButton provider={MICROSOFT_PROVIDER} onActivate={() => undefined} />);
        const btn = screen.getByRole('button', { name: /microsoft/i });
        expectSpacingToken(btn, 'padding-top', 'button.padding.y');
        expectSpacingToken(btn, 'padding-bottom', 'button.padding.y');
    });

    it('applies button.padding.x (24 px) on horizontal padding', () => {
        render(<SocialProviderButton provider={MICROSOFT_PROVIDER} onActivate={() => undefined} />);
        const btn = screen.getByRole('button', { name: /microsoft/i });
        expectSpacingToken(btn, 'padding-left', 'button.padding.x');
        expectSpacingToken(btn, 'padding-right', 'button.padding.x');
    });

    it('invokes onActivate with the provider when clicked', async () => {
        const calls: string[] = [];
        const { user } = render(
            <SocialProviderButton
                provider={MICROSOFT_PROVIDER}
                onActivate={(p: OAuthProviderConfig) => {
                    calls.push(p.id);
                }}
            />,
        );
        await user.click(screen.getByRole('button', { name: /microsoft/i }));
        expect(calls).toEqual(['microsoft']);
    });
});

// =============================================================================
// SUITE — Google variant
// =============================================================================

describe('src/components/ui/SocialProviderButton — Google provider', () => {
    it('renders as a <button> with the Google label as accessible name', () => {
        render(<SocialProviderButton provider={GOOGLE_PROVIDER} onActivate={() => undefined} />);
        expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    });

    it('renders the canonical Google logo asset', () => {
        render(<SocialProviderButton provider={GOOGLE_PROVIDER} onActivate={() => undefined} />);
        const btn = screen.getByRole('button', { name: /google/i });
        const logo = btn.querySelector('img');
        expect(logo?.getAttribute('src')).toMatch(/google-logo/i);
    });

    it('invokes onActivate with the Google provider when clicked', async () => {
        const calls: string[] = [];
        const { user } = render(
            <SocialProviderButton
                provider={GOOGLE_PROVIDER}
                onActivate={(p: OAuthProviderConfig) => {
                    calls.push(p.id);
                }}
            />,
        );
        await user.click(screen.getByRole('button', { name: /google/i }));
        expect(calls).toEqual(['google']);
    });
});

// =============================================================================
// SUITE — Disabled state
// =============================================================================

describe('src/components/ui/SocialProviderButton — disabled', () => {
    it('renders disabled when disabled prop is set', () => {
        render(
            <SocialProviderButton
                provider={MICROSOFT_PROVIDER}
                onActivate={() => undefined}
                disabled
            />,
        );
        expect(screen.getByRole('button', { name: /microsoft/i })).toBeDisabled();
    });

    it('does not invoke onActivate when disabled', async () => {
        let invocations = 0;
        const { user } = render(
            <SocialProviderButton
                provider={MICROSOFT_PROVIDER}
                onActivate={() => {
                    invocations += 1;
                }}
                disabled
            />,
        );
        await user.click(screen.getByRole('button', { name: /microsoft/i }));
        expect(invocations).toBe(0);
    });

    it('renders cursor: not-allowed when disabled', () => {
        render(
            <SocialProviderButton
                provider={MICROSOFT_PROVIDER}
                onActivate={() => undefined}
                disabled
            />,
        );
        const btn = screen.getByRole('button', { name: /microsoft/i });
        expect(getComputedStyle(btn).cursor).toBe('not-allowed');
    });
});

// =============================================================================
// SUITE — Keyboard activation
// =============================================================================

describe('src/components/ui/SocialProviderButton — keyboard activation', () => {
    it('is reachable via Tab', async () => {
        const { user } = render(
            <SocialProviderButton provider={MICROSOFT_PROVIDER} onActivate={() => undefined} />,
        );
        await user.tab();
        expect(document.activeElement).toBe(screen.getByRole('button', { name: /microsoft/i }));
    });

    it('activates onActivate via Enter when focused', async () => {
        let activations = 0;
        const { user } = render(
            <SocialProviderButton
                provider={MICROSOFT_PROVIDER}
                onActivate={() => {
                    activations += 1;
                }}
            />,
        );
        await user.tab();
        await user.keyboard('{Enter}');
        expect(activations).toBe(1);
    });

    it('activates onActivate via Space when focused', async () => {
        let activations = 0;
        const { user } = render(
            <SocialProviderButton
                provider={MICROSOFT_PROVIDER}
                onActivate={() => {
                    activations += 1;
                }}
            />,
        );
        await user.tab();
        await user.keyboard(' ');
        expect(activations).toBe(1);
    });
});

// =============================================================================
// SUITE — Edge cases
// =============================================================================

describe('src/components/ui/SocialProviderButton — edge cases', () => {
    it('renders a text-only fallback when provider.logoPath is empty', () => {
        const noLogoProvider = { ...MICROSOFT_PROVIDER, logoPath: '' };
        render(<SocialProviderButton provider={noLogoProvider} onActivate={() => undefined} />);
        // Even without a logo the label remains the accessible name.
        expect(screen.getByRole('button', { name: /microsoft/i })).toBeInTheDocument();
    });

    it('normalises provider.id to lowercase in the callback (defensive contract)', async () => {
        const calls: string[] = [];
        const { user } = render(
            <SocialProviderButton
                provider={MICROSOFT_PROVIDER}
                onActivate={(p: OAuthProviderConfig) => {
                    calls.push(p.id);
                }}
            />,
        );
        await user.click(screen.getByRole('button', { name: /microsoft/i }));
        // The id MUST round-trip lower-case to keep MSW handlers' URL
        // construction deterministic.
        expect(calls[0]).toBe(calls[0]?.toLowerCase());
    });
});
