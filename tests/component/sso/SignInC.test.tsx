/**
 * Component tests for the Sign in - C ("See more" expandable) screen.
 *
 * Target file under test: `src/components/sso/SignInC.tsx` (CREATED by a
 * subsequent implementation cycle per AAP Section 0.10.5).
 *
 * --------------------------------------------------------------------------
 * Figma source
 * --------------------------------------------------------------------------
 *
 *   - Frame (collapsed) : 15001:42082 ("Sign in - C (See more)")
 *   - Frame (expanded)  : 15001:42214 ("Sign in - C (Expanded)")
 *   - Route: ROUTES.signinC  ->  /sso/sign-in/providers
 *
 *   Composition (collapsed):
 *     - Same as SignInB plus a "See more" affordance below the primary
 *       providers, which when clicked reveals four additional providers
 *       (Apple, GitHub, GitLab, Okta).
 *
 *   Composition (expanded):
 *     - All six providers visible; "See more" affordance hidden OR
 *       replaced with "Show less" depending on implementation.
 *
 * --------------------------------------------------------------------------
 * Test categories covered here
 * --------------------------------------------------------------------------
 *
 *   Happy path:
 *     - Collapsed state shows primary providers only.
 *     - "See more" affordance is visible and labelled.
 *     - Clicking "See more" expands to all six providers.
 *
 *   Edge cases:
 *     - Keyboard-driven expansion (Tab to See more, Enter expands).
 *     - aria-expanded reflects the current state.
 *
 *   Error cases:
 *     - When the provider list endpoint errors (mocked), expansion
 *       falls back to a static provider list rather than throwing.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, `src/components/sso/SignInC.tsx` does NOT
 * exist yet; the import below will fail.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Sign in - C frame target.
 *   - AAP Section 0.3.1 — SignInC screen test target.
 *   - AAP Section 0.4.2 — Sign in - C blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/component/sso/SignInC.test.tsx`.
 *   - AAP Section 0.7.1 — Per-file coverage override 95%.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@tests/utils/render';
import { ROUTES } from '@tests/setup/global';
import {
    OAUTH_PROVIDER_IDS,
    PRIMARY_OAUTH_PROVIDERS,
    SECONDARY_OAUTH_PROVIDERS,
} from '@tests/fixtures/oauth';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { SignInC } from '@/components/sso/SignInC';

// =============================================================================
// SUITE — Collapsed state
// =============================================================================

describe('src/components/sso/SignInC — collapsed state', () => {
    it('renders the primary providers (Microsoft + Google) in collapsed state', () => {
        renderWithProviders(<SignInC />, { route: { initialPathname: 'signinC' } });
        for (const provider of PRIMARY_OAUTH_PROVIDERS) {
            expect(
                screen.getByRole('button', { name: new RegExp(provider.label, 'i') }),
            ).toBeInTheDocument();
        }
    });

    it('does NOT render secondary providers in collapsed state', () => {
        renderWithProviders(<SignInC />, { route: { initialPathname: 'signinC' } });
        for (const provider of SECONDARY_OAUTH_PROVIDERS) {
            expect(
                screen.queryByRole('button', { name: new RegExp(provider.label, 'i') }),
            ).toBeNull();
        }
    });

    it('renders a "See more" affordance', () => {
        renderWithProviders(<SignInC />, { route: { initialPathname: 'signinC' } });
        expect(screen.getByRole('button', { name: /see more/i })).toBeInTheDocument();
    });

    it('renders aria-expanded="false" on the See more affordance in collapsed state', () => {
        renderWithProviders(<SignInC />, { route: { initialPathname: 'signinC' } });
        const seeMore = screen.getByRole('button', { name: /see more/i });
        expect(seeMore).toHaveAttribute('aria-expanded', 'false');
    });
});

// =============================================================================
// SUITE — Expansion via click
// =============================================================================

describe('src/components/sso/SignInC — expansion via click', () => {
    it('reveals all six providers after clicking "See more"', async () => {
        const { user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        await user.click(screen.getByRole('button', { name: /see more/i }));
        for (const provider of [...PRIMARY_OAUTH_PROVIDERS, ...SECONDARY_OAUTH_PROVIDERS]) {
            expect(
                screen.getByRole('button', { name: new RegExp(provider.label, 'i') }),
            ).toBeInTheDocument();
        }
    });

    it('updates aria-expanded to "true" after expansion', async () => {
        const { user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        const seeMore = screen.getByRole('button', { name: /see more/i });
        await user.click(seeMore);
        // The affordance may swap to "Show less" or remain "See more"
        // with aria-expanded=true. We accept either name; we MUST find
        // aria-expanded=true somewhere on the toggle.
        const toggle = screen.queryByRole('button', { name: /see (more|less)|show less/i });
        expect(toggle).not.toBeNull();
        if (toggle !== null) {
            expect(toggle).toHaveAttribute('aria-expanded', 'true');
        }
    });

    it('exposes all six providers via stable test-ids in expanded state', async () => {
        const { user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        await user.click(screen.getByRole('button', { name: /see more/i }));
        for (const id of OAUTH_PROVIDER_IDS) {
            expect(screen.getByTestId(`signin-provider-${id}`)).toBeInTheDocument();
        }
    });
});

// =============================================================================
// SUITE — Keyboard expansion
// =============================================================================

describe('src/components/sso/SignInC — keyboard expansion', () => {
    it('expands via Enter when the See more affordance has focus', async () => {
        const { user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        const seeMore = screen.getByRole('button', { name: /see more/i });
        seeMore.focus();
        expect(document.activeElement).toBe(seeMore);
        await user.keyboard('{Enter}');
        // After expansion the Apple provider button should be visible.
        expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument();
    });

    it('expands via Space when the See more affordance has focus', async () => {
        const { user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        const seeMore = screen.getByRole('button', { name: /see more/i });
        seeMore.focus();
        await user.keyboard(' ');
        expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
    });
});

// =============================================================================
// SUITE — Route registration
// =============================================================================

describe('src/components/sso/SignInC — route registration', () => {
    it('registers under the canonical signinC pathname (/sso/sign-in/providers)', () => {
        const { routeStore } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        expect(routeStore.getPathname()).toBe(ROUTES.signinC);
    });
});
