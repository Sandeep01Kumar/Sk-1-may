/**
 * Link-accounts payload fixtures.
 *
 * Provides static, typed payload samples for the `POST /auth/link-accounts`
 * endpoint mocked by MSW. Covers the three response variants required by
 * AAP Section 0.4.4: success, conflict, and invalid-password (plus a
 * generic validation-error variant for field-level error mapping tests).
 *
 * Consumed by:
 *   - tests/component/sso/LinkAccountsModal.test.tsx (modal copy + variant assertions)
 *   - tests/integration/link-accounts.test.tsx (full link-flow request/response data)
 *   - tests/mocks/handlers/link.ts (canned MSW response payloads)
 *
 * Per folder-level spec rule 3, every value is a STATIC literal — no
 * `Date.now()`, `crypto.randomUUID()`, or other non-deterministic values
 * at module load. The `linkedAt` timestamp on success responses is anchored
 * at the project-wide canonical epoch `2024-01-01T00:00:00.000Z` (matching
 * `tests/fixtures/sessions.ts`) so snapshot tests never flake.
 *
 * Per folder-level spec rule 4, this fixture contains NO factory functions
 * and NO module-level side effects — only static constants. Tests that need
 * a customised variant must spread inline:
 *
 *   const customResponse = {
 *       ...LINK_ACCOUNTS_MICROSOFT_SUCCESS,
 *       linkedAt: '2025-06-15T10:30:00.000Z',
 *   };
 *
 * Per AAP Section 0.10.4 ("Do not introduce a real backend OAuth
 * implementation"), the `providerState` values below are PLACEHOLDER tokens
 * that the MSW handlers accept — they are deterministic, never the output
 * of `crypto.randomUUID()`, and never reach a real IdP. Account-side emails
 * use the IANA-reserved `.test` TLD under `@blitzy.test` per AAP Section
 * 0.10.4 to ensure no real user can ever be implied by a fixture value.
 *
 * Authority:
 *   - AAP Section 0.3.1 (mocked dependencies — `POST /auth/link-accounts`).
 *   - AAP Section 0.4.2 (Link Accounts Modal test case blueprint).
 *   - AAP Section 0.4.4 (fixture table — Account-link payloads row).
 *   - AAP Section 0.5.1 (file row — CREATE, no source, no depends_on_files).
 *   - AAP Section 0.10.2 (typed exports only, stable values, no factories).
 *   - AAP Section 0.10.4 (no real backend OAuth implementation).
 *   - AAP Section 0.10.5 (Honest limitation — SSO components not implemented yet).
 *   - Folder-level spec (rules 1-4: design tokens via separate file, typed
 *     exports, stable values, no factories).
 *
 * Strict-mode compliance (per `tsconfig.test.json`):
 *   - `strict: true` — every exported constant has an explicit type annotation.
 *   - `exactOptionalPropertyTypes: true` — interfaces declare NO optional
 *     fields; every field is required, eliminating any need to write
 *     `T | undefined` anywhere in this file.
 *   - `noUncheckedIndexedAccess: true` — the provider-indexed maps are
 *     typed as `Record<LinkAccountsProvider, V>` so `map[provider]` returns
 *     `V` (not `V | undefined`) when the key is the literal union type.
 *   - `noImplicitAny: true` — every parameter and field is typed.
 *   - `readonly` on every interface field prevents accidental fixture mutation.
 *   - `as const` is applied to the copy fixture and the convenience bundle
 *     so nested string literals narrow to their exact types — tests that
 *     drift from this file fail at compile time rather than at runtime.
 *   - No `import` statements (this fixture has zero project-internal deps,
 *     per folder-level spec: "fixtures are foundational and import from
 *     nothing").
 */

// =============================================================================
// PHASE 2 — REQUEST PAYLOAD TYPES
// =============================================================================

/**
 * The OAuth provider being linked to an existing local Blitzy account.
 *
 * Per the Figma Link Accounts Modal frames:
 *   - Microsoft variant (16383:42232) → `'microsoft'`.
 *   - Generic variant   (16383:42287) → `'other'`.
 *
 * `'google'` is included because Sign-in B and Sign-in C surface Google as a
 * provider, and the link-accounts flow may be invoked after a Google OAuth
 * dance just as it can after a Microsoft one. The string literal union
 * matches the discriminator on `LinkAccountsRequest.provider` and on every
 * response variant's `provider` field so callers can switch on it safely.
 */
export type LinkAccountsProvider = 'microsoft' | 'google' | 'other';

/**
 * Shape of the JSON request body posted by the Link Accounts Modal when the
 * user submits the form.
 *
 * Per AAP Section 0.4.2, the modal collects only the existing account's
 * password (the email is pre-filled from the IdP-returned profile) and the
 * OAuth state token that correlates this confirmation with the provider's
 * earlier `authorize` response.
 *
 * Every field is `readonly` so consumers cannot mutate a shared fixture
 * between tests — aligns with AAP Section 0.7.2 "Test isolation: no shared
 * mutable state between tests".
 */
export interface LinkAccountsRequest {
    /** The email of the existing local Blitzy account being linked to. */
    readonly email: string;
    /** The password the user typed to confirm ownership of the local account. */
    readonly password: string;
    /** The OAuth provider whose identity is being linked. */
    readonly provider: LinkAccountsProvider;
    /**
     * OAuth state/code-equivalent received from the provider redirect step.
     *
     * Used by the backend to correlate this confirmation with the provider's
     * earlier authorisation response. Tests treat this as an opaque
     * deterministic string; the MSW handlers under
     * `tests/mocks/handlers/link.ts` accept any non-empty value.
     */
    readonly providerState: string;
}

// =============================================================================
// PHASE 3 — RESPONSE PAYLOAD TYPES (DISCRIMINATED UNION)
// =============================================================================

/**
 * Successful link response — returned when the password matches and the
 * provider identity is not already linked to another local account.
 *
 * The `linked: true` literal serves as the success discriminator on the
 * `LinkAccountsResponse` union: callers can narrow with
 *
 *   if ('linked' in response) {
 *       // response is LinkAccountsSuccessResponse — `linkedAt`, etc. are typed.
 *   }
 *
 * The `linkedAt` timestamp is a STATIC ISO-8601 string per folder-spec rule
 * 3. Tests requiring a different timestamp must spread-and-override inline.
 */
export interface LinkAccountsSuccessResponse {
    /** Discriminator: `true` indicates the link was created successfully. */
    readonly linked: true;
    /** The OAuth provider that was just linked. Echoed for client confirmation. */
    readonly provider: LinkAccountsProvider;
    /** The local account's email after linking (echoed for client confirmation). */
    readonly email: string;
    /** Human-readable confirmation message; the modal may display this. */
    readonly message: string;
    /**
     * ISO-8601 timestamp the link was created.
     *
     * STATIC value (`2024-01-01T00:00:00.000Z`) per folder-spec rule 3.
     * Matches the canonical epoch used by `tests/fixtures/sessions.ts` so
     * tests that cross-reference both fixtures see a consistent moment.
     */
    readonly linkedAt: string;
}

/**
 * Conflict response — returned when the OAuth identity is already linked to
 * a DIFFERENT local Blitzy account.
 *
 * Per AAP Section 0.4.2 ("Error cases: wrong password returns error message;
 * account-link endpoint returns conflict"), the modal must surface this as
 * a user-visible error so the user understands why linking failed.
 *
 * `error: 'account_conflict'` is the failure discriminator that narrows
 * away from `LinkAccountsSuccessResponse` on the union type.
 */
export interface LinkAccountsConflictResponse {
    /** Discriminator: the OAuth identity is already linked elsewhere. */
    readonly error: 'account_conflict';
    /** Human-readable explanation surfaced in the modal's error banner. */
    readonly message: string;
    /**
     * The email of the OTHER account already linked to this provider identity.
     *
     * The modal MAY render this so the user can recognise which other
     * account they should sign in to instead. Treat as PII placeholder —
     * the email always ends in `.test`.
     */
    readonly conflictingEmail: string;
    /** The provider that returned the conflict. Echoed for client confirmation. */
    readonly provider: LinkAccountsProvider;
}

/**
 * Invalid-password response — returned when the password the user typed
 * does not match the local account's stored credential.
 *
 * The `field: 'password'` discriminator lets the modal map the error to a
 * specific input via the existing `aria-invalid` + error-message rendering
 * (the same mechanism `TextInput.states.test.tsx` exercises).
 */
export interface LinkAccountsInvalidPasswordResponse {
    /** Discriminator: the typed password is incorrect. */
    readonly error: 'invalid_credentials';
    /** Human-readable explanation surfaced under the password input. */
    readonly message: string;
    /** Field-level error target — always `'password'` for this variant. */
    readonly field: 'password';
}

/**
 * Generic validation-error response — returned for any other validation
 * failure (e.g., missing fields, malformed email, password too short).
 *
 * Included per AAP Section 0.4.4 "validation-error payloads". Integration
 * tests use this to assert that the form correctly maps a per-field error
 * map onto individual inputs.
 */
export interface LinkAccountsValidationErrorResponse {
    /** Discriminator: generic validation failure with field-level details. */
    readonly error: 'validation_failed';
    /** Human-readable summary surfaced at the top of the form. */
    readonly message: string;
    /**
     * Map of field name → validation error message.
     *
     * Field names match the property names in `LinkAccountsRequest`
     * (e.g., `'password'`, `'email'`) so consumers can use the keys to
     * look up which input to highlight. `Readonly<Record<string, string>>`
     * prevents downstream mutation of the shared fixture.
     */
    readonly fieldErrors: Readonly<Record<string, string>>;
}

/**
 * Discriminated union of every link-accounts response variant.
 *
 * Switch on the discriminator field to narrow the type:
 *
 *   function handle(response: LinkAccountsResponse) {
 *       if ('linked' in response) {
 *           // narrowed to LinkAccountsSuccessResponse
 *       } else if (response.error === 'account_conflict') {
 *           // narrowed to LinkAccountsConflictResponse
 *       } else if (response.error === 'invalid_credentials') {
 *           // narrowed to LinkAccountsInvalidPasswordResponse
 *       } else {
 *           // narrowed to LinkAccountsValidationErrorResponse
 *       }
 *   }
 */
export type LinkAccountsResponse =
    | LinkAccountsSuccessResponse
    | LinkAccountsConflictResponse
    | LinkAccountsInvalidPasswordResponse
    | LinkAccountsValidationErrorResponse;

// =============================================================================
// PHASE 4 — REQUEST SAMPLE FIXTURES
// =============================================================================

/**
 * Canonical Microsoft-variant request body.
 *
 * Matches the Figma Microsoft variant of the Link Accounts Modal (node id
 * 16383:42232) — the user has typed their existing-account password to
 * confirm linking to the Microsoft identity they just authenticated with.
 *
 * The `password` value mirrors the canonical "existing account" credential
 * used across the test suite; tests that need an explicitly-incorrect value
 * should reach for `LINK_ACCOUNTS_INVALID_PASSWORD_REQUEST` below instead.
 */
export const LINK_ACCOUNTS_MICROSOFT_REQUEST: LinkAccountsRequest = {
    email: 'existing.user@blitzy.test',
    password: 'ExistingP@ssw0rd!',
    provider: 'microsoft',
    providerState: 'mock-microsoft-state-abc123',
};

/**
 * Canonical Google-variant request body.
 *
 * For Sign-in B and Sign-in C variants that surface Google as a provider,
 * the link flow uses this shape if the OAuth callback determines that
 * account-link confirmation is required (i.e., the Google identity is new
 * but the email already maps to an existing Blitzy local account).
 */
export const LINK_ACCOUNTS_GOOGLE_REQUEST: LinkAccountsRequest = {
    email: 'existing.user@blitzy.test',
    password: 'ExistingP@ssw0rd!',
    provider: 'google',
    providerState: 'mock-google-state-xyz789',
};

/**
 * Canonical generic-variant request body.
 *
 * Matches the Figma Generic variant of the Link Accounts Modal (node id
 * 16383:42287) — used when the provider is something other than Microsoft
 * or Google (e.g., GitHub, Okta, or GitLab when revealed via Sign-in C's
 * "See more" expansion). The `provider: 'other'` discriminator drives the
 * generic modal copy ("Continue with your provider" rather than provider-
 * specific phrasing).
 */
export const LINK_ACCOUNTS_GENERIC_REQUEST: LinkAccountsRequest = {
    email: 'existing.user@blitzy.test',
    password: 'ExistingP@ssw0rd!',
    provider: 'other',
    providerState: 'mock-other-state-def456',
};

/**
 * Request with an INVALID (deliberately wrong) password.
 *
 * Used to drive the `LINK_ACCOUNTS_INVALID_PASSWORD` response from MSW.
 * The provider is `'microsoft'` because the invalid-password path is most
 * commonly tested against the Microsoft variant; tests that need to assert
 * the invalid-password path for Google/other should spread-and-override
 * `provider` and `providerState` inline.
 */
export const LINK_ACCOUNTS_INVALID_PASSWORD_REQUEST: LinkAccountsRequest = {
    email: 'existing.user@blitzy.test',
    password: 'WrongPassword123!',
    provider: 'microsoft',
    providerState: 'mock-microsoft-state-abc123',
};

/**
 * Request that triggers the conflict path.
 *
 * The password is correct (matches `existing.user@blitzy.test`), but the
 * OAuth identity referenced by `providerState` is already linked to a
 * DIFFERENT local account in the MSW backend. Drives the
 * `LINK_ACCOUNTS_CONFLICT` response.
 */
export const LINK_ACCOUNTS_CONFLICTING_REQUEST: LinkAccountsRequest = {
    email: 'existing.user@blitzy.test',
    password: 'ExistingP@ssw0rd!',
    provider: 'microsoft',
    providerState: 'mock-conflicting-state-789',
};

// =============================================================================
// PHASE 5 — RESPONSE SAMPLE FIXTURES
// =============================================================================

/**
 * Canonical success response for the Microsoft variant.
 *
 * The `linkedAt` timestamp is STATIC (`2024-01-01T00:00:00.000Z`) per
 * folder-spec rule 3 — matches the project-wide canonical epoch used in
 * `tests/fixtures/sessions.ts`. Tests that need a different timestamp must
 * spread-and-override inline rather than mutating the fixture:
 *
 *   const customResponse = {
 *       ...LINK_ACCOUNTS_MICROSOFT_SUCCESS,
 *       linkedAt: '2025-06-15T10:30:00.000Z',
 *   };
 */
export const LINK_ACCOUNTS_MICROSOFT_SUCCESS: LinkAccountsSuccessResponse = {
    linked: true,
    provider: 'microsoft',
    email: 'existing.user@blitzy.test',
    message: 'Accounts linked successfully',
    linkedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * Canonical success response for the Google variant.
 *
 * Mirrors `LINK_ACCOUNTS_MICROSOFT_SUCCESS` but with `provider: 'google'`.
 * Used by Sign-in B/C tests that exercise the Google-OAuth-then-link path.
 */
export const LINK_ACCOUNTS_GOOGLE_SUCCESS: LinkAccountsSuccessResponse = {
    linked: true,
    provider: 'google',
    email: 'existing.user@blitzy.test',
    message: 'Accounts linked successfully',
    linkedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * Canonical success response for the generic variant.
 *
 * Mirrors `LINK_ACCOUNTS_MICROSOFT_SUCCESS` but with `provider: 'other'`.
 * Used by Sign-in C "See more" tests that exercise non-headline providers
 * (GitHub, Okta, GitLab, Apple) via the generic modal variant.
 */
export const LINK_ACCOUNTS_GENERIC_SUCCESS: LinkAccountsSuccessResponse = {
    linked: true,
    provider: 'other',
    email: 'existing.user@blitzy.test',
    message: 'Accounts linked successfully',
    linkedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * Conflict response — the Microsoft identity is already linked to a
 * DIFFERENT local account (`conflicting.user@blitzy.test`).
 *
 * Per AAP Section 0.4.2, the modal must surface this as a user-visible
 * error message so the user understands why linking failed. The
 * `conflictingEmail` field exists so the UI can render a hint about which
 * other account is involved (e.g., "Sign in to conflicting.user@blitzy.test
 * instead, or contact support to merge accounts").
 */
export const LINK_ACCOUNTS_CONFLICT: LinkAccountsConflictResponse = {
    error: 'account_conflict',
    message:
        'This Microsoft account is already linked to another Blitzy account. Sign in to that account instead, or contact support to merge accounts.',
    conflictingEmail: 'conflicting.user@blitzy.test',
    provider: 'microsoft',
};

/**
 * Invalid-password response — the user typed the wrong password.
 *
 * The `field: 'password'` discriminator lets the modal highlight the
 * password input via the existing `aria-invalid` + error-message rendering
 * — the same mechanism exercised by `tests/component/TextInput.states.test.tsx`.
 * Per AAP Section 0.4.2 "Error cases: wrong password returns error message".
 */
export const LINK_ACCOUNTS_INVALID_PASSWORD: LinkAccountsInvalidPasswordResponse = {
    error: 'invalid_credentials',
    message: 'The password you entered is incorrect. Please try again.',
    field: 'password',
};

/**
 * Validation-error response — generic case where multiple fields failed
 * validation simultaneously.
 *
 * Used by integration tests asserting that the form correctly maps a
 * field-error map onto individual inputs (so the password input shows
 * "Password is required" inline while the email input shows "Email is not
 * in a valid format" inline). The two field errors below are intentionally
 * present together so tests can verify multi-field highlighting.
 */
export const LINK_ACCOUNTS_VALIDATION_ERROR: LinkAccountsValidationErrorResponse = {
    error: 'validation_failed',
    message: 'Please correct the highlighted fields and try again',
    fieldErrors: {
        password: 'Password is required',
        email: 'Email is not in a valid format',
    },
};

// =============================================================================
// PHASE 6 — PROVIDER-INDEXED FIXTURE MAPS
// =============================================================================

/**
 * Map from provider id to its canonical request body.
 *
 * Useful for tests that loop over providers without writing switch
 * statements:
 *
 *   for (const provider of ['microsoft', 'google', 'other'] as const) {
 *       const request = REQUESTS_BY_PROVIDER[provider];
 *       // ... exercise the modal with `request` ...
 *   }
 *
 * Typed as `Readonly<Record<LinkAccountsProvider, LinkAccountsRequest>>`
 * so under `noUncheckedIndexedAccess: true` the indexed access returns
 * `LinkAccountsRequest` (not `LinkAccountsRequest | undefined`) — a
 * `Record<K, V>` with a finite literal-union key type does not produce the
 * unchecked-indexed-access pessimism.
 */
export const REQUESTS_BY_PROVIDER: Readonly<Record<LinkAccountsProvider, LinkAccountsRequest>> = {
    microsoft: LINK_ACCOUNTS_MICROSOFT_REQUEST,
    google: LINK_ACCOUNTS_GOOGLE_REQUEST,
    other: LINK_ACCOUNTS_GENERIC_REQUEST,
};

/**
 * Map from provider id to its canonical success response.
 *
 * Pairs with `REQUESTS_BY_PROVIDER` so a single parametric test can run
 * one request and assert one matching response per provider variant.
 */
export const SUCCESS_BY_PROVIDER: Readonly<
    Record<LinkAccountsProvider, LinkAccountsSuccessResponse>
> = {
    microsoft: LINK_ACCOUNTS_MICROSOFT_SUCCESS,
    google: LINK_ACCOUNTS_GOOGLE_SUCCESS,
    other: LINK_ACCOUNTS_GENERIC_SUCCESS,
};

// =============================================================================
// PHASE 7 — MODAL COPY FIXTURES
// =============================================================================

/**
 * Exact copy strings rendered by the Link Accounts Modal variants.
 *
 * Per AAP Section 0.4.2, the modal heading reads "Link your accounts" and
 * the supporting text contains a bold rendering of the user's email.
 * Tests assert these EXACT strings (no fuzzy regex) so that any copy drift
 * triggers a precise, easy-to-diagnose failure: the test author updates
 * this fixture (single source of truth) and the suite goes green again.
 *
 * Marked `as const` so each property narrows to its exact string literal
 * — e.g., `LINK_ACCOUNTS_COPY.heading` has type `'Link your accounts'`,
 * not `string`. Tests that drift surface as type errors at compile time.
 */
export const LINK_ACCOUNTS_COPY = {
    /** Modal heading — verbatim from AAP Section 0.4.2 happy-path blueprint. */
    heading: 'Link your accounts',
    /**
     * Supporting-text template rendered below the heading.
     *
     * The substring `{email}` is replaced at render-time with the user's
     * email; tests should assert that the resolved string is rendered and
     * that the email portion is wrapped in `<strong>` (or equivalent
     * `font-weight: 600` element) per the Figma "bold email" treatment.
     */
    supportingTextTemplate:
        'Enter your password for {email} to confirm linking this account to your existing Blitzy account.',
    /** Label rendered inside the secondary (Cancel) button. */
    cancelButtonLabel: 'Cancel',
    /**
     * Label rendered inside the primary (Confirm) button.
     *
     * Verbatim from AAP Section 0.4.2: "Cancel + Link accounts buttons".
     */
    confirmButtonLabel: 'Link accounts',
    /**
     * Label of the "Forgot your password?" link below the password input.
     *
     * Per AAP Section 0.4.2 "Forgot password link routes correctly".
     */
    forgotPasswordLinkLabel: 'Forgot your password?',
    /**
     * The `aria-label` applied to the close (X) icon button in the modal's
     * top-right corner.
     *
     * Per AAP Section 0.4.2 focus-trap and Escape-close requirements, the
     * close icon must be reachable by screen readers via a descriptive
     * label — a bare `×` glyph is not sufficient for WCAG 2.2 AA.
     */
    closeButtonAriaLabel: 'Close link accounts modal',
} as const;

/**
 * Type-level enumeration of every key in `LINK_ACCOUNTS_COPY`.
 *
 * Useful for tests that iterate over copy keys without hardcoding the
 * list — e.g., a test that asserts every copy string is present in the
 * DOM after rendering the modal.
 */
export type LinkAccountsCopyKey = keyof typeof LINK_ACCOUNTS_COPY;

// =============================================================================
// PHASE 8 — CONVENIENCE BUNDLE
// =============================================================================

/**
 * Convenience bundle — every fixture in this file re-exported as a single
 * namespaced object, so specs that prefer a single-import surface can use:
 *
 *   import { linkAccounts } from '@tests/fixtures/link-accounts';
 *
 *   linkAccounts.requests.microsoft         // LinkAccountsRequest
 *   linkAccounts.requests.byProvider.google // LinkAccountsRequest
 *   linkAccounts.responses.microsoftSuccess // LinkAccountsSuccessResponse
 *   linkAccounts.responses.conflict         // LinkAccountsConflictResponse
 *   linkAccounts.responses.invalidPassword  // LinkAccountsInvalidPasswordResponse
 *   linkAccounts.copy.heading               // 'Link your accounts'
 *
 * Marked `as const` so the bundle's nested object literals narrow to their
 * exact types — `linkAccounts.copy.heading` is typed as the literal
 * `'Link your accounts'` (not `string`), so accidental drift between this
 * fixture and tests surfaces as a compile-time error rather than a runtime
 * failure during a slow Playwright pass.
 *
 * The `as const` is applied at the END of the bundle so each fixture
 * referenced inside it retains its already-narrowed type without being
 * widened by the surrounding object literal.
 */
export const linkAccounts = {
    requests: {
        microsoft: LINK_ACCOUNTS_MICROSOFT_REQUEST,
        google: LINK_ACCOUNTS_GOOGLE_REQUEST,
        generic: LINK_ACCOUNTS_GENERIC_REQUEST,
        invalidPassword: LINK_ACCOUNTS_INVALID_PASSWORD_REQUEST,
        conflicting: LINK_ACCOUNTS_CONFLICTING_REQUEST,
        byProvider: REQUESTS_BY_PROVIDER,
    },
    responses: {
        microsoftSuccess: LINK_ACCOUNTS_MICROSOFT_SUCCESS,
        googleSuccess: LINK_ACCOUNTS_GOOGLE_SUCCESS,
        genericSuccess: LINK_ACCOUNTS_GENERIC_SUCCESS,
        conflict: LINK_ACCOUNTS_CONFLICT,
        invalidPassword: LINK_ACCOUNTS_INVALID_PASSWORD,
        validationError: LINK_ACCOUNTS_VALIDATION_ERROR,
        successByProvider: SUCCESS_BY_PROVIDER,
    },
    copy: LINK_ACCOUNTS_COPY,
} as const;
