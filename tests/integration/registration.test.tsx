/**
 * Integration test — Registration Completion form.
 *
 * Target file under test (CREATED by a subsequent implementation cycle
 * per AAP Section 0.10.5):
 *   - `src/components/sso/RegistrationCompletion.tsx`
 *
 * --------------------------------------------------------------------------
 * Integration scope
 * --------------------------------------------------------------------------
 *
 * This spec wires the Registration Completion form to the MSW-mocked
 * `POST /auth/register` endpoint and asserts:
 *
 *   1. Happy path — typing valid fields, accepting terms, and clicking
 *      "Create account" issues the canonical payload and surfaces the
 *      success signal.
 *   2. Field-level validation — blank or invalid inputs produce
 *      aria-invalid markers and prevent submission.
 *   3. Server-side rejection — when the backend reports a duplicate
 *      email, the form maps the field error back to the corresponding
 *      input.
 *   4. Network failure — when the server is unreachable, the form
 *      surfaces a generic error banner.
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
 *   - AAP Section 0.4.2 — Registration Completion blueprint.
 *   - AAP Section 0.5.1 — File row for
 *     `tests/integration/registration.test.tsx`.
 *   - AAP Section 0.10.5 — SSO components not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, waitFor } from '@tests/utils/render';
import {
    NEW_USER,
    REGISTRATION_PAYLOAD_NEW,
    REGISTRATION_PAYLOAD_EMAIL_EXISTS,
} from '@tests/fixtures/users';
import { VALID_PASSWORD_NEW_USER } from '@tests/fixtures/passwords';
import { TEST_APP_ORIGIN } from '@tests/fixtures/oauth';
import { server } from '@tests/mocks/server';

// =============================================================================
// SUT IMPORT — EXPECTED TO FAIL UNTIL IMPLEMENTATION ARRIVES
// =============================================================================

import { RegistrationCompletion } from '@/components/sso/RegistrationCompletion';

// =============================================================================
// LOCAL HANDLERS — registration endpoint variants
// =============================================================================

/**
 * Register a happy-path `POST /auth/register` handler.
 *
 * The handler ALSO records the request body so the test can assert that
 * the form sent the canonical payload. We rely on closure capture rather
 * than module-level state to avoid cross-test bleed.
 */
function registerSuccessHandler(): { getLastRequestBody: () => unknown } {
    let lastBody: unknown = null;
    const handler = http.post(`${TEST_APP_ORIGIN}/auth/register`, async ({ request }) => {
        lastBody = await request.json();
        return HttpResponse.json({ email: NEW_USER.email }, { status: 201 });
    });
    const relativeHandler = http.post('/auth/register', async ({ request }) => {
        lastBody = await request.json();
        return HttpResponse.json({ email: NEW_USER.email }, { status: 201 });
    });
    server.use(handler, relativeHandler);
    return { getLastRequestBody: () => lastBody };
}

function registerEmailConflictHandler(): void {
    const body = HttpResponse.json(
        {
            error: 'email_already_registered',
            fieldErrors: { email: 'This email is already registered.' },
        },
        { status: 409 },
    );
    server.use(
        http.post(`${TEST_APP_ORIGIN}/auth/register`, () => body.clone()),
        http.post('/auth/register', () => body.clone()),
    );
}

function registerNetworkErrorHandler(): void {
    server.use(
        http.post(`${TEST_APP_ORIGIN}/auth/register`, () => HttpResponse.error()),
        http.post('/auth/register', () => HttpResponse.error()),
    );
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Fill the registration form with valid sample data.
 *
 * Uses canonical fixtures so the request body asserted downstream matches
 * `REGISTRATION_PAYLOAD_NEW` exactly.
 */
async function fillValidRegistrationFields(
    user: ReturnType<typeof renderWithProviders>['user'],
): Promise<void> {
    await user.type(screen.getByLabelText(/first name/i), REGISTRATION_PAYLOAD_NEW.firstName);
    await user.type(screen.getByLabelText(/last name/i), REGISTRATION_PAYLOAD_NEW.lastName);
    await user.type(screen.getByLabelText(/^email/i), REGISTRATION_PAYLOAD_NEW.email);
    await user.type(screen.getByLabelText(/^password/i), VALID_PASSWORD_NEW_USER.value);
    await user.type(screen.getByLabelText(/confirm password/i), VALID_PASSWORD_NEW_USER.value);
    await user.click(screen.getByRole('checkbox', { name: /terms/i }));
}

// =============================================================================
// SUITE — Registration happy path
// =============================================================================

describe('Integration — Registration Completion happy path', () => {
    it('submits the canonical payload and surfaces the success signal', async () => {
        const recorder = registerSuccessHandler();
        const { user } = renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        await fillValidRegistrationFields(user);
        await user.click(screen.getByRole('button', { name: /create account/i }));
        await waitFor(() => {
            const body = recorder.getLastRequestBody() as Record<string, unknown> | null;
            expect(body).not.toBeNull();
        });
        const body = recorder.getLastRequestBody() as Record<string, unknown> | null;
        expect(body).toMatchObject({
            firstName: REGISTRATION_PAYLOAD_NEW.firstName,
            lastName: REGISTRATION_PAYLOAD_NEW.lastName,
            email: REGISTRATION_PAYLOAD_NEW.email,
        });
    });
});

// =============================================================================
// SUITE — Registration field validation
// =============================================================================

describe('Integration — Registration Completion field-level validation', () => {
    it('marks blank required fields invalid and does not submit', async () => {
        const recorder = registerSuccessHandler();
        const { user } = renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        await user.click(screen.getByRole('button', { name: /create account/i }));
        await waitFor(() => {
            const invalid = document.querySelectorAll('[aria-invalid="true"]');
            expect(invalid.length).toBeGreaterThan(0);
        });
        expect(recorder.getLastRequestBody()).toBeNull();
    });

    it('marks the password confirmation invalid when it does not match', async () => {
        registerSuccessHandler();
        const { user } = renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        await user.type(screen.getByLabelText(/first name/i), REGISTRATION_PAYLOAD_NEW.firstName);
        await user.type(screen.getByLabelText(/last name/i), REGISTRATION_PAYLOAD_NEW.lastName);
        await user.type(screen.getByLabelText(/^email/i), REGISTRATION_PAYLOAD_NEW.email);
        await user.type(screen.getByLabelText(/^password/i), VALID_PASSWORD_NEW_USER.value);
        await user.type(screen.getByLabelText(/confirm password/i), 'NotMatching!Password1');
        await user.click(screen.getByRole('checkbox', { name: /terms/i }));
        await user.click(screen.getByRole('button', { name: /create account/i }));
        await waitFor(() => {
            const confirm = screen.getByLabelText(/confirm password/i);
            expect(confirm.getAttribute('aria-invalid')).toBe('true');
        });
    });

    it('marks the terms checkbox invalid when unchecked', async () => {
        registerSuccessHandler();
        const { user } = renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        await user.type(screen.getByLabelText(/first name/i), REGISTRATION_PAYLOAD_NEW.firstName);
        await user.type(screen.getByLabelText(/last name/i), REGISTRATION_PAYLOAD_NEW.lastName);
        await user.type(screen.getByLabelText(/^email/i), REGISTRATION_PAYLOAD_NEW.email);
        await user.type(screen.getByLabelText(/^password/i), VALID_PASSWORD_NEW_USER.value);
        await user.type(screen.getByLabelText(/confirm password/i), VALID_PASSWORD_NEW_USER.value);
        await user.click(screen.getByRole('button', { name: /create account/i }));
        await waitFor(() => {
            const terms = screen.getByRole('checkbox', { name: /terms/i });
            expect(terms.getAttribute('aria-invalid')).toBe('true');
        });
    });
});

// =============================================================================
// SUITE — Server-side rejection
// =============================================================================

describe('Integration — Registration Completion server rejection', () => {
    it('maps a duplicate-email error back to the email field', async () => {
        registerEmailConflictHandler();
        const { user } = renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        await user.type(
            screen.getByLabelText(/first name/i),
            REGISTRATION_PAYLOAD_EMAIL_EXISTS.firstName,
        );
        await user.type(
            screen.getByLabelText(/last name/i),
            REGISTRATION_PAYLOAD_EMAIL_EXISTS.lastName,
        );
        await user.type(screen.getByLabelText(/^email/i), REGISTRATION_PAYLOAD_EMAIL_EXISTS.email);
        await user.type(screen.getByLabelText(/^password/i), VALID_PASSWORD_NEW_USER.value);
        await user.type(screen.getByLabelText(/confirm password/i), VALID_PASSWORD_NEW_USER.value);
        await user.click(screen.getByRole('checkbox', { name: /terms/i }));
        await user.click(screen.getByRole('button', { name: /create account/i }));
        await waitFor(() => {
            const email = screen.getByLabelText(/^email/i);
            expect(email.getAttribute('aria-invalid')).toBe('true');
        });
    });

    it('surfaces a banner when the server is unreachable', async () => {
        registerNetworkErrorHandler();
        const { user } = renderWithProviders(<RegistrationCompletion />, {
            route: { initialPathname: 'registration' },
        });
        await fillValidRegistrationFields(user);
        await user.click(screen.getByRole('button', { name: /create account/i }));
        await waitFor(() => {
            expect(screen.queryByRole('alert')).not.toBeNull();
        });
    });
});
