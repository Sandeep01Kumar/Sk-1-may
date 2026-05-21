/**
 * User sample fixtures: account identities, email patterns, federated profiles.
 *
 * This file is the SUPERSET of `tests/setup/global.ts.TEST_USERS`. The four
 * canonical accounts (standard, federated, invalid, newUser) are duplicated
 * here EXACTLY so tests that import from either location see identical data.
 *
 * Imported by:
 *   - tests/unit/utils/validation.test.ts (validateEmail boundary samples)
 *   - tests/integration/**\/*.test.tsx (full sign-in/sign-up flows)
 *   - tests/component/sso/**\/*.test.tsx (form prefill, validation)
 *   - tests/e2e/sso/**\/*.spec.ts (E2E credential injection)
 *   - tests/mocks/handlers/auth.ts (response payloads)
 *   - tests/mocks/handlers/link.ts (response payloads)
 *
 * Per folder-level spec rule 3: every value is a STATIC string. No randomness
 * at module load (no `Date.now`, no `crypto.randomUUID`, no `Math.random`).
 *
 * Per AAP Section 0.10.4: all account-side emails use the IANA-reserved
 * `.test` TLD under `@blitzy.test`. Federated-identity emails use real-looking
 * provider domains (`@outlook.com`, `@gmail.com`) because the IdP-reported
 * email is part of the test contract — those values are still placeholders,
 * never real PII.
 *
 * Authority:
 *   - AAP Section 0.3.1 (target function validateEmail).
 *   - AAP Section 0.4.4 (fixture table — User samples row).
 *   - AAP Section 0.5.1 (file row — CREATE, no source/depends).
 *   - AAP Section 0.10.2 (typed exports only, stable values, no factories).
 *   - AAP Section 0.10.4 (placeholder @blitzy.test domain).
 *   - tests/setup/global.ts.TEST_USERS — this file is the SUPERSET.
 *
 * Strict-mode compliance:
 *   - `exactOptionalPropertyTypes: true` — optional fields are OMITTED on
 *     samples that don't have them, never set to `undefined`.
 *   - Every constant is explicitly typed.
 *   - Every array literal uses `readonly` typing; collection literals carry
 *     `as const` where deep literal narrowing is desired.
 *   - No `any`, no module-level side effects, NO imports.
 */

// =============================================================================
// PHASE 2 — IDENTITY TYPES
// =============================================================================

/**
 * Supported federated OAuth provider identifiers.
 *
 * Mirrors `OAuthProviderId` in `tests/fixtures/oauth.ts` but is duplicated
 * here so this fixture has zero internal imports (folder-level spec rule).
 * If the type set evolves, both files must update.
 */
export type UserProvider =
    | 'microsoft'
    | 'google'
    | 'apple'
    | 'github'
    | 'gitlab'
    | 'okta'
    | 'other';

/**
 * Account-existence classification used by MSW handlers and integration
 * tests to decide which response branch to take.
 *
 *   - `existing`: the MSW backend has a record of this email.
 *   - `new`:      registration is accepted; sign-in by password is rejected.
 *   - `unknown`:  reserved for tests that exercise the "email not found" path.
 */
export type UserExistence = 'existing' | 'new' | 'unknown';

/**
 * Federated-identity sample — the shape of a single IdP-linked identity
 * attached to a user. A user may have zero, one, or many federated
 * identities (see `MULTI_PROVIDER_USER`).
 */
export interface FederatedIdentity {
    /** OAuth provider identifier. */
    readonly provider: UserProvider;
    /** Provider's stable subject identifier (the OIDC `sub` claim). */
    readonly providerSub: string;
    /**
     * Email reported by the IdP.
     *
     * MAY differ from the Blitzy account email — the LinkAccountsModal flow
     * exists precisely to bind an existing Blitzy account to an IdP whose
     * `email` claim differs.
     */
    readonly email: string;
    /** Display name reported by the IdP (`name` claim). */
    readonly displayName: string;
    /**
     * Whether the IdP marked the email as verified (`email_verified` claim).
     *
     * Drives the path where Blitzy must re-prompt for email confirmation
     * when the IdP returned `email_verified: false`.
     */
    readonly emailVerified: boolean;
}

/**
 * Canonical user sample shape.
 *
 * Used by every component test, integration test, and MSW handler that
 * needs to assert against a known account identity.
 */
export interface UserSample {
    /** Email address (always `@blitzy.test` for the account-side email). */
    readonly email: string;
    /**
     * Password — passwords intentionally duplicate values from
     * `tests/fixtures/passwords.ts`. The relationship is by VALUE not by
     * reference (this fixture has no imports). If a password value changes,
     * both files must update.
     */
    readonly password: string;
    /** Given name. */
    readonly firstName: string;
    /** Surname. */
    readonly lastName: string;
    /** Company name. */
    readonly company: string;
    /**
     * Optional list of federated identities linked to this account.
     *
     * OMITTED (not `undefined`) when the user is email/password only —
     * required by `exactOptionalPropertyTypes: true`.
     */
    readonly federatedIdentities?: readonly FederatedIdentity[];
    /**
     * Whether the email/password is expected to authenticate successfully
     * against the MSW backend.
     */
    readonly existsInBackend: UserExistence;
    /** Whether the email passes `validateEmail`. */
    readonly emailIsValid: boolean;
    /**
     * Optional Blitzy-side roles.
     *
     * OMITTED (not `undefined`) when not applicable — required by
     * `exactOptionalPropertyTypes: true`.
     */
    readonly roles?: readonly string[];
}

// =============================================================================
// PHASE 3 — CANONICAL ACCOUNT SAMPLES (must match `tests/setup/global.ts`)
// =============================================================================

/**
 * STANDARD USER — the canonical email+password account used by happy-path
 * sign-in tests.
 *
 * Identity matches `tests/setup/global.ts.TEST_USERS.standard` EXACTLY for
 * email/password/firstName/lastName/company. This is the SUPERSET contract
 * documented in the agent prompt.
 */
export const STANDARD_USER: UserSample = {
    email: 'standard.user@blitzy.test',
    password: 'StandardP@ssw0rd!',
    firstName: 'Standard',
    lastName: 'User',
    company: 'Blitzy Test Co.',
    existsInBackend: 'existing',
    emailIsValid: true,
    roles: ['user'],
};

/**
 * FEDERATED USER — account that uses Microsoft OAuth.
 *
 * Identity matches `tests/setup/global.ts.TEST_USERS.federated` EXACTLY,
 * augmented with a Microsoft `FederatedIdentity` entry.
 *
 * The federated email (`@outlook.com`) deliberately differs from the
 * Blitzy account email (`@blitzy.test`) — this asymmetry exercises the
 * email-binding logic in the Link Accounts flow.
 */
export const FEDERATED_USER: UserSample = {
    email: 'federated.user@blitzy.test',
    password: 'FederatedP@ssw0rd!',
    firstName: 'Federated',
    lastName: 'User',
    company: 'Blitzy SSO Co.',
    federatedIdentities: [
        {
            provider: 'microsoft',
            providerSub: 'ms-sub-federated-001',
            email: 'federated.user@outlook.com',
            displayName: 'Federated User',
            emailVerified: true,
        },
    ],
    existsInBackend: 'existing',
    emailIsValid: true,
    roles: ['user'],
};

/**
 * INVALID USER — drives invalid-credentials test paths.
 *
 * Identity matches `tests/setup/global.ts.TEST_USERS.invalid` EXACTLY.
 *
 * The email is well-formed (`emailIsValid: true`) but the MSW auth handler
 * returns AUTH_ERROR_INVALID_CREDENTIALS when this email is presented at
 * the sign-in endpoint.
 *
 * Optional fields (`federatedIdentities`, `roles`) are OMITTED — never set
 * to `undefined`, per `exactOptionalPropertyTypes: true`.
 */
export const INVALID_USER: UserSample = {
    email: 'invalid.user@blitzy.test',
    password: 'WrongP@ssw0rd!',
    firstName: 'Invalid',
    lastName: 'User',
    company: 'Blitzy Bad Co.',
    existsInBackend: 'existing',
    emailIsValid: true,
};

/**
 * NEW USER — drives registration completion tests.
 *
 * Identity matches `tests/setup/global.ts.TEST_USERS.newUser` EXACTLY.
 *
 * `existsInBackend: 'new'` means the MSW handler will accept this email at
 * the /register/complete endpoint but reject it at /signin (the user has
 * not completed registration yet).
 *
 * Optional fields (`federatedIdentities`, `roles`) are OMITTED — never set
 * to `undefined`, per `exactOptionalPropertyTypes: true`.
 */
export const NEW_USER: UserSample = {
    email: 'new.user@blitzy.test',
    password: 'NewUserP@ssw0rd!',
    firstName: 'New',
    lastName: 'User',
    company: 'Blitzy Newcomers Inc.',
    existsInBackend: 'new',
    emailIsValid: true,
};

// =============================================================================
// PHASE 4 — ADDITIONAL FEDERATED IDENTITY SAMPLES
// =============================================================================

/**
 * GOOGLE FEDERATED USER — account using Google OAuth.
 *
 * Exercises the Sign-in B (Microsoft + Google) and Sign-in C (Expanded
 * providers) flows where the user authenticates through Google rather
 * than Microsoft.
 */
export const GOOGLE_FEDERATED_USER: UserSample = {
    email: 'google.user@blitzy.test',
    password: 'GoogleSso@P4ssw0rd!',
    firstName: 'Google',
    lastName: 'User',
    company: 'Blitzy Google Co.',
    federatedIdentities: [
        {
            provider: 'google',
            providerSub: 'google-sub-001',
            email: 'google.user@gmail.com',
            displayName: 'Google User',
            emailVerified: true,
        },
    ],
    existsInBackend: 'existing',
    emailIsValid: true,
    roles: ['user'],
};

/**
 * MULTI-PROVIDER USER — account linked to BOTH Microsoft and Google.
 *
 * Exercises the "account already linked to multiple providers" branch of
 * the Link Accounts flow. The integration test for SignInB asserts that
 * either provider successfully authenticates this account.
 */
export const MULTI_PROVIDER_USER: UserSample = {
    email: 'multi.provider@blitzy.test',
    password: 'MultiP4ssw0rd@!',
    firstName: 'Multi',
    lastName: 'Provider',
    company: 'Blitzy Multi Co.',
    federatedIdentities: [
        {
            provider: 'microsoft',
            providerSub: 'ms-sub-multi-001',
            email: 'multi.provider@outlook.com',
            displayName: 'Multi Provider',
            emailVerified: true,
        },
        {
            provider: 'google',
            providerSub: 'google-sub-multi-001',
            email: 'multi.provider@gmail.com',
            displayName: 'Multi Provider',
            emailVerified: true,
        },
    ],
    existsInBackend: 'existing',
    emailIsValid: true,
    roles: ['user'],
};

/**
 * UNVERIFIED FEDERATED USER — IdP returned a non-verified email.
 *
 * Drives the path where Blitzy must re-prompt for email confirmation
 * because the IdP set `email_verified: false`. The MSW handler responds
 * with AUTH_ERROR_EMAIL_NOT_VERIFIED for this account.
 *
 * Optional `roles` is OMITTED — never set to `undefined`, per
 * `exactOptionalPropertyTypes: true`.
 */
export const UNVERIFIED_FEDERATED_USER: UserSample = {
    email: 'unverified.federated@blitzy.test',
    password: 'UnverifiedP@ss1!',
    firstName: 'Unverified',
    lastName: 'Federated',
    company: 'Blitzy Unverified Co.',
    federatedIdentities: [
        {
            provider: 'microsoft',
            providerSub: 'ms-sub-unverified-001',
            email: 'unverified.federated@outlook.com',
            displayName: 'Unverified Federated',
            emailVerified: false,
        },
    ],
    existsInBackend: 'existing',
    emailIsValid: true,
};

// =============================================================================
// PHASE 5 — EMAIL VALIDATION BOUNDARY SAMPLES
// =============================================================================

/**
 * Email-validation sample shape.
 *
 * Powers parameterised tests in `tests/unit/utils/validation.test.ts` against
 * `validateEmail(value: string): boolean` (target function per AAP Section
 * 0.3.1).
 */
export interface EmailSample {
    /** Human-readable label used as the `it()` test name. */
    readonly label: string;
    /** The email string under test. */
    readonly value: string;
    /** Expected `validateEmail` outcome. */
    readonly valid: boolean;
    /**
     * Optional reason for invalid emails — purely documentation, never
     * asserted against.
     *
     * OMITTED on valid samples — never `undefined`, per
     * `exactOptionalPropertyTypes: true`.
     */
    readonly reason?: string;
}

// -----------------------------------------------------------------------------
// Valid emails (must pass `validateEmail`)
// -----------------------------------------------------------------------------

/** Canonical happy-path email. */
export const VALID_EMAIL_STANDARD: EmailSample = {
    label: 'standard email',
    value: 'standard.user@blitzy.test',
    valid: true,
};

/** Plus-suffix subaddressing (RFC 5233). */
export const VALID_EMAIL_SUBADDRESS: EmailSample = {
    label: 'email with plus-suffix subaddressing',
    value: 'standard.user+tag@blitzy.test',
    valid: true,
};

/** Hyphenated domain label (RFC 1035 §2.3.1 allows interior hyphens). */
export const VALID_EMAIL_HYPHEN_DOMAIN: EmailSample = {
    label: 'email with hyphen in domain',
    value: 'user@my-domain.blitzy.test',
    valid: true,
};

/** All-digit local part — permitted by RFC 5321 §4.1.2. */
export const VALID_EMAIL_NUMERIC_LOCAL: EmailSample = {
    label: 'email with numeric local part',
    value: '12345@blitzy.test',
    valid: true,
};

/**
 * Local part exactly 64 octets — RFC 5321 §4.5.3.1.1 maximum.
 *
 * Together with `INVALID_EMAIL_TOO_LONG_LOCAL` this straddles the RFC 5321
 * boundary so the validator's boundary handling is verified.
 */
export const VALID_EMAIL_LONG_LOCAL: EmailSample = {
    label: 'email with 64-char local part (RFC 5321 max)',
    value: 'a'.repeat(64) + '@blitzy.test',
    valid: true,
};

/**
 * Internationalised domain name (Punycode-encoded — `xn--mnchen-3ya` is
 * the ACE form of `münchen`).
 *
 * The IDN sample uses Punycode rather than literal Unicode because the
 * `validateEmail` implementation may require ACE-encoded domains.
 */
export const VALID_EMAIL_IDN: EmailSample = {
    label: 'internationalised domain name (Punycode-ready)',
    value: 'user@xn--mnchen-3ya.blitzy.test',
    valid: true,
};

/** All valid samples — iterated by parameterised tests. */
export const VALID_EMAILS: readonly EmailSample[] = [
    VALID_EMAIL_STANDARD,
    VALID_EMAIL_SUBADDRESS,
    VALID_EMAIL_HYPHEN_DOMAIN,
    VALID_EMAIL_NUMERIC_LOCAL,
    VALID_EMAIL_LONG_LOCAL,
    VALID_EMAIL_IDN,
] as const;

// -----------------------------------------------------------------------------
// Invalid emails (must fail `validateEmail`)
// -----------------------------------------------------------------------------

/** Empty string. */
export const INVALID_EMAIL_EMPTY: EmailSample = {
    label: 'empty string',
    value: '',
    valid: false,
    reason: 'empty',
};

/** No `@` separator. */
export const INVALID_EMAIL_NO_AT: EmailSample = {
    label: 'no @ sign',
    value: 'standard.user.blitzy.test',
    valid: false,
    reason: 'missing @',
};

/** `@` present but local part empty. */
export const INVALID_EMAIL_NO_LOCAL: EmailSample = {
    label: 'no local part',
    value: '@blitzy.test',
    valid: false,
    reason: 'empty local part',
};

/** `@` present but domain empty. */
export const INVALID_EMAIL_NO_DOMAIN: EmailSample = {
    label: 'no domain',
    value: 'standard.user@',
    valid: false,
    reason: 'empty domain',
};

/** Multiple unescaped `@` signs. */
export const INVALID_EMAIL_DOUBLE_AT: EmailSample = {
    label: 'double @ sign',
    value: 'standard@user@blitzy.test',
    valid: false,
    reason: 'multiple @',
};

/** Domain without a TLD label. */
export const INVALID_EMAIL_NO_TLD: EmailSample = {
    label: 'no top-level domain',
    value: 'standard.user@blitzy',
    valid: false,
    reason: 'no TLD',
};

/** Leading dot in local part — RFC 5322 §3.4.1 prohibits leading dot. */
export const INVALID_EMAIL_LEADING_DOT: EmailSample = {
    label: 'leading dot in local part',
    value: '.standard.user@blitzy.test',
    valid: false,
    reason: 'leading dot',
};

/** Trailing dot in local part — RFC 5322 §3.4.1 prohibits trailing dot. */
export const INVALID_EMAIL_TRAILING_DOT: EmailSample = {
    label: 'trailing dot in local part',
    value: 'standard.user.@blitzy.test',
    valid: false,
    reason: 'trailing dot in local',
};

/** Consecutive dots — RFC 5322 §3.2.4 prohibits two adjacent dot atoms. */
export const INVALID_EMAIL_CONSECUTIVE_DOTS: EmailSample = {
    label: 'consecutive dots in local part',
    value: 'standard..user@blitzy.test',
    valid: false,
    reason: 'consecutive dots',
};

/** Embedded whitespace in unquoted local part. */
export const INVALID_EMAIL_WHITESPACE: EmailSample = {
    label: 'embedded whitespace',
    value: 'standard user@blitzy.test',
    valid: false,
    reason: 'whitespace',
};

/** Leading whitespace — should be rejected, not silently trimmed. */
export const INVALID_EMAIL_LEADING_WHITESPACE: EmailSample = {
    label: 'leading whitespace',
    value: ' standard.user@blitzy.test',
    valid: false,
    reason: 'leading whitespace',
};

/** Trailing whitespace — should be rejected, not silently trimmed. */
export const INVALID_EMAIL_TRAILING_WHITESPACE: EmailSample = {
    label: 'trailing whitespace',
    value: 'standard.user@blitzy.test ',
    valid: false,
    reason: 'trailing whitespace',
};

/**
 * Local part 65 octets — exceeds RFC 5321 §4.5.3.1.1 limit by one.
 *
 * Together with `VALID_EMAIL_LONG_LOCAL` this straddles the 64-octet
 * boundary so the validator's boundary handling is verified.
 */
export const INVALID_EMAIL_TOO_LONG_LOCAL: EmailSample = {
    label: 'local part exceeds RFC 5321 (65 chars)',
    value: 'a'.repeat(65) + '@blitzy.test',
    valid: false,
    reason: 'local > 64',
};

/**
 * Local part contains characters outside the RFC 5322 atext set.
 *
 * Doubles as an XSS-resilience smoke test — the literal `<script>` payload
 * must be rejected as input long before it could be rendered as output.
 */
export const INVALID_EMAIL_INVALID_CHAR: EmailSample = {
    label: 'invalid character in local part',
    value: 'user<script>@blitzy.test',
    valid: false,
    reason: 'illegal char',
};

/** Domain label may not start with a hyphen (RFC 1035 §2.3.1). */
export const INVALID_EMAIL_DOMAIN_STARTS_HYPHEN: EmailSample = {
    label: 'domain starts with hyphen',
    value: 'user@-blitzy.test',
    valid: false,
    reason: 'domain starts with hyphen',
};

/** All invalid samples — iterated by parameterised tests. */
export const INVALID_EMAILS: readonly EmailSample[] = [
    INVALID_EMAIL_EMPTY,
    INVALID_EMAIL_NO_AT,
    INVALID_EMAIL_NO_LOCAL,
    INVALID_EMAIL_NO_DOMAIN,
    INVALID_EMAIL_DOUBLE_AT,
    INVALID_EMAIL_NO_TLD,
    INVALID_EMAIL_LEADING_DOT,
    INVALID_EMAIL_TRAILING_DOT,
    INVALID_EMAIL_CONSECUTIVE_DOTS,
    INVALID_EMAIL_WHITESPACE,
    INVALID_EMAIL_LEADING_WHITESPACE,
    INVALID_EMAIL_TRAILING_WHITESPACE,
    INVALID_EMAIL_TOO_LONG_LOCAL,
    INVALID_EMAIL_INVALID_CHAR,
    INVALID_EMAIL_DOMAIN_STARTS_HYPHEN,
] as const;

// =============================================================================
// PHASE 6 — EXISTING EMAIL LISTS
// =============================================================================

/**
 * Set of emails the MSW backend considers "existing" — drives the sign-in
 * happy path and the "account requires SSO" branch.
 *
 * The MSW handler in `tests/mocks/handlers/auth.ts` checks this list (via
 * `USERS_BY_EMAIL` for O(1) lookup) before deciding the response branch.
 */
export const EXISTING_USER_EMAILS: readonly string[] = [
    STANDARD_USER.email,
    FEDERATED_USER.email,
    GOOGLE_FEDERATED_USER.email,
    MULTI_PROVIDER_USER.email,
    UNVERIFIED_FEDERATED_USER.email,
    INVALID_USER.email,
] as const;

/**
 * Emails the MSW backend treats as "new" — can register at
 * `/register/complete` but is rejected at `/signin` with
 * AUTH_ERROR_INVALID_CREDENTIALS.
 */
export const NEW_USER_EMAILS: readonly string[] = [NEW_USER.email] as const;

/**
 * Emails the MSW backend treats as "requires SSO" — password sign-in is
 * rejected with AUTH_ERROR_REQUIRES_SSO and the UI is expected to surface
 * the LinkAccountsModal flow.
 *
 * Drives the `SIGN_IN_PAYLOAD_REQUIRES_SSO` test path.
 */
export const SSO_ONLY_EMAILS: readonly string[] = [
    FEDERATED_USER.email,
    GOOGLE_FEDERATED_USER.email,
    UNVERIFIED_FEDERATED_USER.email,
] as const;

// =============================================================================
// PHASE 7 — FORM-SUBMISSION PAYLOAD SAMPLES
// =============================================================================

/**
 * Shape of a sign-in form submission.
 *
 * Mirrors the request body sent by `SignInA`/`SignInB`/`SignInC` components
 * to the `/signin` endpoint intercepted by MSW.
 */
export interface SignInPayload {
    /** Email address typed into the email input. */
    readonly email: string;
    /** Password typed into the password input. */
    readonly password: string;
    /**
     * Optional "remember me" flag.
     *
     * OMITTED (not `undefined`) when the form did not surface the
     * "remember me" affordance — per `exactOptionalPropertyTypes: true`.
     */
    readonly rememberMe?: boolean;
}

/**
 * Shape of a registration completion form submission.
 *
 * Mirrors the request body sent by `RegistrationCompletion` to the
 * `/register/complete` endpoint intercepted by MSW.
 */
export interface RegistrationPayload {
    /** Email address typed into the email input. */
    readonly email: string;
    /** Password typed into the password input. */
    readonly password: string;
    /** Given name typed into the first name input. */
    readonly firstName: string;
    /** Surname typed into the last name input. */
    readonly lastName: string;
    /** Company name typed into the company input. */
    readonly company: string;
    /** Whether the terms-of-service checkbox is checked. */
    readonly acceptTerms: boolean;
}

/**
 * Canonical happy-path sign-in payload using the standard user.
 *
 * MSW responds to this payload with a successful sign-in (200 OK + JWT).
 */
export const SIGN_IN_PAYLOAD_STANDARD: SignInPayload = {
    email: STANDARD_USER.email,
    password: STANDARD_USER.password,
    rememberMe: false,
};

/**
 * Sign-in payload that should be rejected — wrong credentials.
 *
 * MSW responds with 401 AUTH_ERROR_INVALID_CREDENTIALS so the UI is
 * expected to surface the SignUpError frame.
 */
export const SIGN_IN_PAYLOAD_INVALID: SignInPayload = {
    email: INVALID_USER.email,
    password: INVALID_USER.password,
    rememberMe: false,
};

/**
 * Sign-in payload that triggers the "requires SSO" branch.
 *
 * MSW responds with AUTH_ERROR_REQUIRES_SSO so the UI is expected to
 * surface the LinkAccountsModal flow. The user's password is technically
 * known but is rejected by policy because the account is provisioned
 * through Microsoft OAuth.
 */
export const SIGN_IN_PAYLOAD_REQUIRES_SSO: SignInPayload = {
    email: FEDERATED_USER.email,
    password: FEDERATED_USER.password,
    rememberMe: false,
};

/**
 * Canonical registration completion payload using the new user.
 *
 * MSW responds with 201 Created and the user is moved from
 * `existsInBackend: 'new'` to `'existing'` (state transition is scoped
 * per-test by MSW handler reset).
 */
export const REGISTRATION_PAYLOAD_NEW: RegistrationPayload = {
    email: NEW_USER.email,
    password: NEW_USER.password,
    firstName: NEW_USER.firstName,
    lastName: NEW_USER.lastName,
    company: NEW_USER.company,
    acceptTerms: true,
};

/**
 * Registration payload that should be rejected — terms not accepted.
 *
 * MSW responds with 400 REGISTRATION_ERROR_TERMS_NOT_ACCEPTED. The UI is
 * expected to keep the user on the registration form with the
 * accept-terms checkbox highlighted as required.
 */
export const REGISTRATION_PAYLOAD_NO_TERMS: RegistrationPayload = {
    email: NEW_USER.email,
    password: NEW_USER.password,
    firstName: NEW_USER.firstName,
    lastName: NEW_USER.lastName,
    company: NEW_USER.company,
    acceptTerms: false,
};

/**
 * Registration payload that should be rejected — email already exists.
 *
 * The `STANDARD_USER.email` is in `EXISTING_USER_EMAILS`. MSW responds
 * with 409 REGISTRATION_ERROR_EMAIL_EXISTS so the UI is expected to
 * surface an inline email-field error.
 */
export const REGISTRATION_PAYLOAD_EMAIL_EXISTS: RegistrationPayload = {
    email: STANDARD_USER.email,
    password: 'AnotherP@ssw0rd1!',
    firstName: 'Duplicate',
    lastName: 'User',
    company: 'Blitzy Duplicate Co.',
    acceptTerms: true,
};

// =============================================================================
// PHASE 8 — USER AGGREGATE AND CONVENIENCE BUNDLE
// =============================================================================

/**
 * All user samples — useful for iteration in MSW handlers and for tests
 * that need to assert "every user has X" properties.
 *
 * Order is deterministic for repeatable test runs.
 */
export const ALL_USERS: readonly UserSample[] = [
    STANDARD_USER,
    FEDERATED_USER,
    GOOGLE_FEDERATED_USER,
    MULTI_PROVIDER_USER,
    UNVERIFIED_FEDERATED_USER,
    INVALID_USER,
    NEW_USER,
] as const;

/**
 * Map of email → user sample for O(1) lookup in MSW handlers.
 *
 * Without this map, handlers would have to filter `ALL_USERS` linearly on
 * every request. The map is built at module-load time from static values
 * so there is no runtime performance penalty (and no `Date.now`/
 * `Math.random` — folder-spec rule 3 compliance).
 */
export const USERS_BY_EMAIL: Readonly<Record<string, UserSample>> = {
    [STANDARD_USER.email]: STANDARD_USER,
    [FEDERATED_USER.email]: FEDERATED_USER,
    [GOOGLE_FEDERATED_USER.email]: GOOGLE_FEDERATED_USER,
    [MULTI_PROVIDER_USER.email]: MULTI_PROVIDER_USER,
    [UNVERIFIED_FEDERATED_USER.email]: UNVERIFIED_FEDERATED_USER,
    [INVALID_USER.email]: INVALID_USER,
    [NEW_USER.email]: NEW_USER,
};

/**
 * Convenience bundle for ergonomic single-import access.
 *
 *   import { users } from '@tests/fixtures/users';
 *
 *   users.standard.email                 // 'standard.user@blitzy.test'
 *   users.emails.valid[0].value          // 'standard.user@blitzy.test'
 *   users.payloads.signIn.standard       // { email, password, rememberMe }
 *
 * Marked `as const` so the bundle's nested literals narrow to their exact
 * types — `users.standard.email` has type `'standard.user@blitzy.test'`,
 * not `string`, so accidental drift between this fixture and tests would
 * surface as a compile error.
 */
export const users = {
    standard: STANDARD_USER,
    federated: FEDERATED_USER,
    google: GOOGLE_FEDERATED_USER,
    multiProvider: MULTI_PROVIDER_USER,
    unverifiedFederated: UNVERIFIED_FEDERATED_USER,
    invalid: INVALID_USER,
    newUser: NEW_USER,
    all: ALL_USERS,
    byEmail: USERS_BY_EMAIL,
    emails: {
        valid: VALID_EMAILS,
        invalid: INVALID_EMAILS,
        existing: EXISTING_USER_EMAILS,
        new: NEW_USER_EMAILS,
        ssoOnly: SSO_ONLY_EMAILS,
    },
    payloads: {
        signIn: {
            standard: SIGN_IN_PAYLOAD_STANDARD,
            invalid: SIGN_IN_PAYLOAD_INVALID,
            requiresSso: SIGN_IN_PAYLOAD_REQUIRES_SSO,
        },
        registration: {
            new: REGISTRATION_PAYLOAD_NEW,
            noTerms: REGISTRATION_PAYLOAD_NO_TERMS,
            emailExists: REGISTRATION_PAYLOAD_EMAIL_EXISTS,
        },
    },
} as const;
