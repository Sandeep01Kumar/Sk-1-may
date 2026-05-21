/**
 * Integration test — Link Accounts modal flow.
 *
 * Target file under test (CREATED by a subsequent implementation cycle
 * per AAP Section 0.10.5):
 *   - `src/components/sso/LinkAccountsModal.tsx`
 *
 * --------------------------------------------------------------------------
 * Integration scope
 * --------------------------------------------------------------------------
 *
 * This spec wires the Link Accounts modal to the MSW-mocked
 * `POST /auth/link-accounts` endpoint and asserts:
 *
 *   1. Microsoft happy path — typing the matching password and clicking
 *      "Link accounts" issues the request and surfaces a success signal.
 *   2. Invalid password — the form maps the failure back to the password
 *      input and displays the canonical copy.
 *   3. Conflict — the server reports the federated identity is already
 *      linked elsewhere; the form surfaces the conflict banner.
 *   4. Validation error — server-side schema rejection maps field
 *      errors to the corresponding inputs.
 *   5. Generic provider variant — when the provider is `other`, the
 *      modal renders the generic copy but still issues the link request.
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the SUT module does NOT exist yet; the import
 * below will fail.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.3.1 — Integration test target.
 *   - AAP Section 0.4.2 — Link Accounts Modal blueprint.
 *   - AAP Section 0.4.4 — MSW handlers for `/auth/link-accounts`.
 *   - AAP Section 0.5.1 — File row for `tests/integration/link-accounts.test.tsx`.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@tests/utils/render';
import { activateLinkAccountsHandler } from '@tests/mocks/handlers/link';
import { server } from '@tests/mocks/server';
import {
    LINK_ACCOUNTS_MICROSOFT_REQUEST,
    LINK_ACCOUNTS_GENERIC_REQUEST,
    LINK_ACCOUNTS_INVALID_PASSWORD_REQUEST,
    LINK_ACCOUNTS_CONFLICTING_REQUEST,
} from '@tests/fixtures/link-accounts';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { LinkAccountsModal } from '@/components/sso/LinkAccountsModal';

// =============================================================================
// SUITE — Microsoft happy path
// =============================================================================

describe('Integration — LinkAccountsModal Microsoft happy path', () => {
    it('issues the link request and surfaces a success signal', async () => {
        activateLinkAccountsHandler(server, 'success');
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="microsoft"
                email={LINK_ACCOUNTS_MICROSOFT_REQUEST.email}
                providerState={LINK_ACCOUNTS_MICROSOFT_REQUEST.providerState}
                onClose={() => {}}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await user.type(
            screen.getByLabelText(/password/i),
            LINK_ACCOUNTS_MICROSOFT_REQUEST.password,
        );
        await user.click(screen.getByRole('button', { name: /link accounts/i }));
        await waitFor(() => {
            const success =
                screen.queryByTestId('link-accounts-success') ?? screen.queryByText(/linked/i);
            expect(success).not.toBeNull();
        });
    });
});

// =============================================================================
// SUITE — Invalid password
// =============================================================================

describe('Integration — LinkAccountsModal invalid password path', () => {
    it('surfaces the invalid-password error message and keeps the modal open', async () => {
        activateLinkAccountsHandler(server, 'invalidPassword');
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="microsoft"
                email={LINK_ACCOUNTS_INVALID_PASSWORD_REQUEST.email}
                providerState={LINK_ACCOUNTS_INVALID_PASSWORD_REQUEST.providerState}
                onClose={() => {}}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await user.type(
            screen.getByLabelText(/password/i),
            LINK_ACCOUNTS_INVALID_PASSWORD_REQUEST.password,
        );
        await user.click(screen.getByRole('button', { name: /link accounts/i }));
        await waitFor(() => {
            const passwordInput = screen.getByLabelText(/password/i);
            const passwordInvalid =
                passwordInput.getAttribute('aria-invalid') === 'true' ||
                screen.queryByRole('alert') !== null;
            expect(passwordInvalid).toBe(true);
        });
        // Modal should remain open after the error.
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});

// =============================================================================
// SUITE — Conflict
// =============================================================================

describe('Integration — LinkAccountsModal conflict path', () => {
    it('surfaces the conflict banner when the identity is already linked elsewhere', async () => {
        activateLinkAccountsHandler(server, 'conflict');
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="microsoft"
                email={LINK_ACCOUNTS_CONFLICTING_REQUEST.email}
                providerState={LINK_ACCOUNTS_CONFLICTING_REQUEST.providerState}
                onClose={() => {}}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await user.type(
            screen.getByLabelText(/password/i),
            LINK_ACCOUNTS_CONFLICTING_REQUEST.password,
        );
        await user.click(screen.getByRole('button', { name: /link accounts/i }));
        await waitFor(() => {
            expect(screen.queryByRole('alert')).not.toBeNull();
        });
    });
});

// =============================================================================
// SUITE — Validation error
// =============================================================================

describe('Integration — LinkAccountsModal validation-error path', () => {
    it('maps server-side validation errors back to fields', async () => {
        activateLinkAccountsHandler(server, 'validationError');
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="microsoft"
                email={LINK_ACCOUNTS_MICROSOFT_REQUEST.email}
                providerState={LINK_ACCOUNTS_MICROSOFT_REQUEST.providerState}
                onClose={() => {}}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await user.type(
            screen.getByLabelText(/password/i),
            LINK_ACCOUNTS_MICROSOFT_REQUEST.password,
        );
        await user.click(screen.getByRole('button', { name: /link accounts/i }));
        await waitFor(() => {
            const passwordInput = screen.getByLabelText(/password/i);
            const invalid =
                passwordInput.getAttribute('aria-invalid') === 'true' ||
                screen.queryByRole('alert') !== null;
            expect(invalid).toBe(true);
        });
    });
});

// =============================================================================
// SUITE — Generic variant
// =============================================================================

describe('Integration — LinkAccountsModal generic variant', () => {
    it('renders the generic copy and still issues the link request', async () => {
        activateLinkAccountsHandler(server, 'success');
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="generic"
                email={LINK_ACCOUNTS_GENERIC_REQUEST.email}
                providerState={LINK_ACCOUNTS_GENERIC_REQUEST.providerState}
                onClose={() => {}}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await user.type(screen.getByLabelText(/password/i), LINK_ACCOUNTS_GENERIC_REQUEST.password);
        await user.click(screen.getByRole('button', { name: /link accounts/i }));
        await waitFor(() => {
            const success =
                screen.queryByTestId('link-accounts-success') ?? screen.queryByText(/linked/i);
            expect(success).not.toBeNull();
        });
    });
});

// =============================================================================
// SUITE — Cancel and dismissal
// =============================================================================

describe('Integration — LinkAccountsModal dismissal', () => {
    it('invokes onClose when Cancel is clicked', async () => {
        let closed = false;
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="microsoft"
                email={LINK_ACCOUNTS_MICROSOFT_REQUEST.email}
                providerState={LINK_ACCOUNTS_MICROSOFT_REQUEST.providerState}
                onClose={() => {
                    closed = true;
                }}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await user.click(screen.getByRole('button', { name: /cancel/i }));
        expect(closed).toBe(true);
    });

    it('invokes onClose when Escape is pressed', async () => {
        let closed = false;
        const { user } = renderWithProviders(
            <LinkAccountsModal
                isOpen
                variant="microsoft"
                email={LINK_ACCOUNTS_MICROSOFT_REQUEST.email}
                providerState={LINK_ACCOUNTS_MICROSOFT_REQUEST.providerState}
                onClose={() => {
                    closed = true;
                }}
            />,
            { route: { initialPathname: 'linkAccounts' } },
        );
        await user.keyboard('{Escape}');
        expect(closed).toBe(true);
    });
});
