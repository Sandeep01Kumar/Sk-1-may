/**
 * Component-layer accessibility scans.
 *
 * --------------------------------------------------------------------------
 * Scope
 * --------------------------------------------------------------------------
 *
 * Runs jest-axe across every design-system primitive and every SSO
 * composite screen, gating each on ZERO violations at WCAG 2.2 AA per
 * AAP Section 0.7.3. The canonical `expectNoA11yViolations(container)`
 * helper from `@tests/utils/a11y` is used for every assertion so the
 * configuration (`AXE_CONFIG` with `WCAG_22_AA_TAGS`) cannot drift
 * between specs.
 *
 * --------------------------------------------------------------------------
 * Component coverage
 * --------------------------------------------------------------------------
 *
 *   Design-system primitives:
 *     - Logo
 *     - TextInput (default + RightIcon)
 *     - Button (Primary-Large, Primary-Small, Secondary-Small)
 *     - SocialProviderButton
 *     - Separator
 *     - Modal
 *
 *   SSO composites:
 *     - SignInA, SignInB, SignInC (collapsed + expanded)
 *     - RegistrationCompletion
 *     - SignUpError
 *     - LinkAccountsModal (Microsoft + Generic)
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT modules do NOT exist yet; imports
 * below will fail until the SSO implementation cycle authors the
 * components.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.1 — Accessibility WCAG 2.2 AA via jest-axe.
 *   - AAP Section 0.7.3 — Accessibility (component) zero-violation gate.
 *   - AAP Section 0.5.1 — File row for `tests/a11y/component.a11y.test.tsx`.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it } from 'vitest';
import { renderWithProviders, render } from '@tests/utils/render';
import { expectNoA11yViolations } from '@tests/utils/a11y';
import { MICROSOFT_PROVIDER, GOOGLE_PROVIDER, APPLE_PROVIDER } from '@tests/fixtures/oauth';
import { LINK_ACCOUNTS_MICROSOFT_REQUEST } from '@tests/fixtures/link-accounts';

// =============================================================================
// SUT IMPORTS — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { Logo } from '@/components/ui/Logo';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { SocialProviderButton } from '@/components/ui/SocialProviderButton';
import { Separator } from '@/components/ui/Separator';
import { Modal } from '@/components/ui/Modal';
import { SignInA } from '@/components/sso/SignInA';
import { SignInB } from '@/components/sso/SignInB';
import { SignInC } from '@/components/sso/SignInC';
import { RegistrationCompletion } from '@/components/sso/RegistrationCompletion';
import { SignUpError } from '@/components/sso/SignUpError';
import { LinkAccountsModal } from '@/components/sso/LinkAccountsModal';

// =============================================================================
// SUITE — Design-system primitives
// =============================================================================

describe('A11y — Design system primitives have zero WCAG 2.2 AA violations', () => {
    it('Logo passes a11y scan', async () => {
        const { container } = render(<Logo />);
        await expectNoA11yViolations(container);
    });

    it('TextInput (default, with label) passes a11y scan', async () => {
        const { container } = render(
            <TextInput id="email" label="Email" name="email" type="email" />,
        );
        await expectNoA11yViolations(container);
    });

    it('TextInput (RightIcon password) passes a11y scan', async () => {
        const { container } = render(
            <TextInput
                id="password"
                label="Password"
                name="password"
                type="password"
                rightIcon="show-hide"
            />,
        );
        await expectNoA11yViolations(container);
    });

    it('TextInput (error state) passes a11y scan', async () => {
        const { container } = render(
            <TextInput id="email-err" label="Email" name="email" type="email" error="Required" />,
        );
        await expectNoA11yViolations(container);
    });

    it('Button (Primary, Large) passes a11y scan', async () => {
        const { container } = render(
            <Button variant="primary" size="large">
                Sign in
            </Button>,
        );
        await expectNoA11yViolations(container);
    });

    it('Button (Primary, Small) passes a11y scan', async () => {
        const { container } = render(
            <Button variant="primary" size="small">
                Continue
            </Button>,
        );
        await expectNoA11yViolations(container);
    });

    it('Button (Secondary, Small) passes a11y scan', async () => {
        const { container } = render(
            <Button variant="secondary" size="small">
                Cancel
            </Button>,
        );
        await expectNoA11yViolations(container);
    });

    it('Button (disabled) passes a11y scan', async () => {
        const { container } = render(
            <Button variant="primary" size="large" disabled>
                Sign in
            </Button>,
        );
        await expectNoA11yViolations(container);
    });

    it('SocialProviderButton (Microsoft) passes a11y scan', async () => {
        const { container } = render(<SocialProviderButton provider={MICROSOFT_PROVIDER} />);
        await expectNoA11yViolations(container);
    });

    it('SocialProviderButton (Google) passes a11y scan', async () => {
        const { container } = render(<SocialProviderButton provider={GOOGLE_PROVIDER} />);
        await expectNoA11yViolations(container);
    });

    it('SocialProviderButton (Apple) passes a11y scan', async () => {
        const { container } = render(<SocialProviderButton provider={APPLE_PROVIDER} />);
        await expectNoA11yViolations(container);
    });

    it('Separator (without label) passes a11y scan', async () => {
        const { container } = render(<Separator />);
        await expectNoA11yViolations(container);
    });

    it('Separator (with label) passes a11y scan', async () => {
        const { container } = render(<Separator label="or" />);
        await expectNoA11yViolations(container);
    });

    it('Modal (open) passes a11y scan', async () => {
        const { container } = render(
            <Modal isOpen onClose={() => {}} ariaLabelledBy="modal-heading">
                <h2 id="modal-heading">Modal heading</h2>
                <p>Modal body content.</p>
                <button type="button">OK</button>
            </Modal>,
        );
        await expectNoA11yViolations(container);
    });
});

// =============================================================================
// SUITE — SSO composite screens
// =============================================================================

describe('A11y — SSO composite screens have zero WCAG 2.2 AA violations', () => {
    it('SignInA passes a11y scan', async () => {
        const { container } = renderWithProviders(<SignInA />, {
            route: { initialPathname: 'signinA' },
        });
        await expectNoA11yViolations(container);
    });

    it('SignInB passes a11y scan', async () => {
        const { container } = renderWithProviders(<SignInB />, {
            route: { initialPathname: 'signinB' },
        });
        await expectNoA11yViolations(container);
    });

    it('SignInC (collapsed) passes a11y scan', async () => {
        const { container } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        await expectNoA11yViolations(container);
    });

    it('SignInC (expanded) passes a11y scan', async () => {
        const { container, user } = renderWithProviders(<SignInC />, {
            route: { initialPathname: 'signinC' },
        });
        // Click "See more" to expand the provider list, then re-scan.
        const seeMore = container.querySelector('[data-testid="signin-c-see-more"]');
        if (seeMore !== null) {
            await user.click(seeMore as HTMLElement);
        }
        await expectNoA11yViolations(container);
    });

    it('RegistrationCompletion passes a11y scan', async () => {
        const { container } = renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        await expectNoA11yViolations(container);
    });

    it('SignUpError passes a11y scan', async () => {
        const { container } = renderWithProviders(<SignUpError />, {
            route: { initialPathname: 'signupError' },
        });
        await expectNoA11yViolations(container);
    });

    it('LinkAccountsModal (Microsoft) passes a11y scan', async () => {
        const { container } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="microsoft"
                email={LINK_ACCOUNTS_MICROSOFT_REQUEST.email}
                providerState={LINK_ACCOUNTS_MICROSOFT_REQUEST.providerState}
                onClose={() => {}}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await expectNoA11yViolations(container);
    });

    it('LinkAccountsModal (Generic) passes a11y scan', async () => {
        const { container } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="generic"
                email={LINK_ACCOUNTS_MICROSOFT_REQUEST.email}
                providerState={LINK_ACCOUNTS_MICROSOFT_REQUEST.providerState}
                onClose={() => {}}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await expectNoA11yViolations(container);
    });
});

// =============================================================================
// SUITE — Error-state composite scans
// =============================================================================

describe('A11y — SSO error states have zero WCAG 2.2 AA violations', () => {
    it('TextInput with error remains accessible', async () => {
        const { container } = render(
            <TextInput
                id="password-err"
                label="Password"
                name="password"
                type="password"
                error="Password is required"
            />,
        );
        await expectNoA11yViolations(container);
    });

    it('Button in loading state remains accessible', async () => {
        const { container } = render(
            <Button variant="primary" size="large" loading>
                Signing in…
            </Button>,
        );
        await expectNoA11yViolations(container);
    });
});
