/**
 * Session fixtures: JWT tokens, refresh tokens, and session-state objects.
 *
 * These are STATIC, deterministic samples used by:
 *   - tests/mocks/handlers/auth.ts (returned in successful OAuth callbacks)
 *   - tests/integration/**\/*.test.tsx (verifying post-auth state)
 *   - tests/component/sso/** (rare — state-injection scenarios)
 *
 * SECURITY NOTE: The JWT tokens below are SAMPLE STRINGS, not cryptographically
 * signed JWTs. They use the canonical JWT three-segment format
 * (header.payload.signature) but the signature is a placeholder
 * (`bW9jay1zaWduYXR1cmU` = base64url-encoded `mock-signature`). NEVER use
 * these tokens against a real backend — they exist only to satisfy parsing
 * logic in the SUT and MSW handlers.
 *
 * The header segment (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`) decodes to
 * `{"alg":"HS256","typ":"JWT"}` — a standard JWT header. The payload segments
 * are valid base64url encodings of the decoded JwtPayload / RefreshTokenPayload
 * objects whose `iat`, `exp`, `sub`, `email`, etc. exactly match the
 * `*_PAYLOAD` constants below, so tests that decode-and-compare will succeed
 * for every claim except the signature itself (which is deliberately fake).
 *
 * NOTE: The encoded `exp` claim for non-expired tokens is the far-future
 * 2050-01-01T01:00:00.000Z (access) / 2050-01-31T00:00:00.000Z (refresh) so
 * tests that perform real expiration arithmetic against the decoded payload
 * see these tokens as semantically valid for any realistic test execution
 * window. The advertised `expiresIn` field in `AuthSuccessResponse` continues
 * to use the canonical `ACCESS_TOKEN_LIFETIME_SECONDS` (3600 s) as the OAuth
 * convention dictates — these two values are intentionally decoupled.
 *
 * Per folder-level spec rule 3: NO Date.now() or crypto.randomUUID() at
 * module load. All canonical timestamps are static literal values:
 *   - Issued-at (`iat`) anchor: 2024-01-01T00:00:00.000Z (1704067200 epoch).
 *     Represents the conceptual moment each token was issued; always in the
 *     past from any realistic test execution.
 *   - Valid-token expiration (`exp`) anchor: 2050-01-01T01:00:00.000Z (access,
 *     2524611600 epoch) / 2050-01-31T00:00:00.000Z (refresh, 2527200000 epoch).
 *     Far-future timestamps ensuring `STANDARD_SESSION`, `FEDERATED_SESSION`,
 *     and `NEW_USER_SESSION` are semantically "currently valid" for any
 *     reasonable test execution window through 2049. This decouples token
 *     expiration from the canonical `ACCESS_TOKEN_LIFETIME_SECONDS` /
 *     `REFRESH_TOKEN_LIFETIME_SECONDS` constants (which still describe the
 *     advertised `expiresIn` field in the auth response shape).
 *   - Expired-token expiration (`exp`): 2020-01-01T00:00:00.000Z (1577836800)
 *     — explicitly past so token-validation tests can verify rejection.
 *   - Far-future reference (`FAR_FUTURE_EXP`): 2099-01-01T00:00:00.000Z
 *     (4070908800) — distinct marker for tests that require a clearly
 *     "never expires" timestamp.
 *
 * Identity values for the standard, federated, and new-user accounts mirror
 * the canonical `TEST_USERS` table defined in `tests/setup/global.ts` so
 * tests importing from either location see identical email/sub/jti samples.
 *
 * Authority:
 *   - AAP Section 0.4.4 (fixture table — Sessions row).
 *   - AAP Section 0.5.1 (file row — CREATE, no source, no depends_on_files).
 *   - AAP Section 0.3.1 (mocked dependencies — Microsoft/Google OAuth callbacks).
 *   - AAP Section 0.10.2 (typed exports only, stable values, no factories).
 *   - AAP Section 0.10.5 (Honest limitation — no real IdP contact).
 *
 * Strict-mode compliance:
 *   - `strict: true` — every exported constant has an explicit type annotation.
 *   - `exactOptionalPropertyTypes: true` — `provider?:` is OMITTED on
 *     non-federated payloads, never set to `undefined`.
 *   - `noImplicitAny: true` — every field is typed.
 *   - `readonly` modifiers on every interface field prevent mutation.
 *   - `as const` on string-literal samples narrows them to literal types.
 *   - No `import` statements (this fixture has zero project-internal deps).
 */

// =============================================================================
// PHASE 2 — JWT PAYLOAD AND SESSION INTERFACES
// =============================================================================

/**
 * Decoded JWT payload shape used in tests.
 *
 * Mirrors the standard claims defined by RFC 7519 (`sub`, `iat`, `exp`, `aud`,
 * `iss`, `jti`) plus Blitzy-specific claims (`email`, `roles`, `provider`)
 * that the SSO components may read from the access token.
 *
 * NOTE: Times are UNIX EPOCH SECONDS (not milliseconds), per RFC 7519 §4.1.4.
 */
export interface JwtPayload {
    /** Subject — the user identifier (typically email or stable user id). */
    readonly sub: string;
    /** Issued-at time in epoch seconds. */
    readonly iat: number;
    /** Expiration time in epoch seconds. */
    readonly exp: number;
    /** Audience — typically the application identifier (`blitzy-sso`). */
    readonly aud: string;
    /** Issuer — typically the Blitzy auth service URL. */
    readonly iss: string;
    /** JWT ID — unique identifier for this token. */
    readonly jti: string;
    /** Email associated with this session. */
    readonly email: string;
    /** Free-form roles array. Empty array is permitted. */
    readonly roles: readonly string[];
    /**
     * Federated provider id if this session came from OAuth, else omitted.
     *
     * NOTE: Per `exactOptionalPropertyTypes: true`, omit this field entirely
     * for non-federated sessions — do NOT set it to `undefined`. The
     * `'other'` value covers future generic OAuth providers (per the
     * Generic Link Accounts Modal variant in Figma 16383:42287).
     */
    readonly provider?: 'microsoft' | 'google' | 'other';
}

/**
 * Decoded refresh-token payload shape.
 *
 * Refresh tokens carry a narrower claim set than access tokens — only the
 * `sub`, `iat`, `exp`, `jti`, and `email` are needed to identify and revoke
 * the token at the auth service.
 */
export interface RefreshTokenPayload {
    /** Subject — the user identifier. */
    readonly sub: string;
    /** Issued-at time in epoch seconds. */
    readonly iat: number;
    /** Expiration time in epoch seconds. */
    readonly exp: number;
    /** Refresh-token identifier so the backend can invalidate it. */
    readonly jti: string;
    /** Email associated with this refresh token. */
    readonly email: string;
}

/**
 * A complete session object combining the encoded access + refresh tokens
 * with the decoded payloads that produced them, plus ISO-8601 expiration
 * timestamps for human readability.
 *
 * Consumed by integration tests verifying full post-authentication state
 * after a sign-in flow completes.
 */
export interface Session {
    /** Encoded access-token JWT string (header.payload.signature). */
    readonly accessToken: string;
    /** Encoded refresh-token JWT string. */
    readonly refreshToken: string;
    /** Decoded access-token payload. */
    readonly accessTokenPayload: JwtPayload;
    /** Decoded refresh-token payload. */
    readonly refreshTokenPayload: RefreshTokenPayload;
    /** ISO-8601 expiration timestamp of the access token (for human readability). */
    readonly accessTokenExpiresAt: string;
    /** ISO-8601 expiration timestamp of the refresh token. */
    readonly refreshTokenExpiresAt: string;
}

// =============================================================================
// PHASE 3 — STATIC TIME CONSTANTS
// =============================================================================

/**
 * Canonical reference time used as the "issued at" anchor for every
 * non-expired static session fixture: 2024-01-01T00:00:00.000Z.
 *
 * As epoch seconds: 1704067200.
 *
 * Per folder spec rule 3 — using a fixed value avoids non-determinism that
 * `Date.now()` would introduce at module load.
 */
export const SESSION_REFERENCE_IAT = 1704067200 as const;

/**
 * Canonical reference time as ISO-8601 string (`2024-01-01T00:00:00.000Z`).
 *
 * Use when tests need the ISO form for assertions or display.
 */
export const SESSION_REFERENCE_IAT_ISO = '2024-01-01T00:00:00.000Z' as const;

/**
 * One hour in seconds — the canonical access-token lifetime advertised by
 * the auth backend.
 *
 * This value is REPORTED in the `expiresIn` field of `AuthSuccessResponse`
 * to match the OAuth 2.0 convention (RFC 6749 §5.1). It is intentionally
 * DECOUPLED from `VALID_ACCESS_TOKEN_EXP` below — the embedded JWT `exp`
 * uses a far-future value so static fixtures remain semantically valid for
 * any realistic test execution window, while the response shape continues
 * to advertise the canonical one-hour lifetime that real backends use.
 */
export const ACCESS_TOKEN_LIFETIME_SECONDS = 3600 as const;

/**
 * Thirty days in seconds — the canonical refresh-token lifetime advertised
 * by the auth backend.
 *
 * Equals 30 × 24 × 60 × 60 = 2,592,000. Written as a literal so the
 * `as const` assertion applies (TypeScript rejects `as const` on
 * arithmetic expressions). Decoupled from `VALID_REFRESH_TOKEN_EXP` for the
 * same reason as the access-token lifetime above.
 */
export const REFRESH_TOKEN_LIFETIME_SECONDS = 2_592_000 as const;

/**
 * Far-future access-token expiration for "currently valid" session fixtures.
 *
 * As epoch seconds: 2524611600 (= 2050-01-01T01:00:00.000Z).
 *
 * This timestamp is INTENTIONALLY far in the future — and INTENTIONALLY
 * decoupled from `SESSION_REFERENCE_IAT + ACCESS_TOKEN_LIFETIME_SECONDS` —
 * so any test that performs real JWT expiration arithmetic against the
 * `STANDARD_SESSION`, `FEDERATED_SESSION`, or `NEW_USER_SESSION` fixtures
 * sees them as semantically valid through 2049. The `iat` claim remains
 * in the past (2024-01-01), which mirrors how a real backend would issue
 * tokens (issued recently, expiring in the future).
 *
 * Tests that need an EXPLICIT far-future timestamp distinct from any session
 * fixture should use `FAR_FUTURE_EXP` (2099-01-01) instead. Tests that need
 * an EXPLICITLY EXPIRED timestamp should use `EXPIRED_TOKEN_EXP` (2020-01-01)
 * or one of the `EXPIRED_*` token fixtures.
 */
export const VALID_ACCESS_TOKEN_EXP = 2524611600 as const;

/**
 * Far-future refresh-token expiration for "currently valid" session fixtures.
 *
 * As epoch seconds: 2527200000 (= 2050-01-31T00:00:00.000Z).
 *
 * Decoupled from `SESSION_REFERENCE_IAT + REFRESH_TOKEN_LIFETIME_SECONDS`
 * for the same reason as `VALID_ACCESS_TOKEN_EXP` above. The 30-day gap
 * between this value and `VALID_ACCESS_TOKEN_EXP` preserves the canonical
 * "refresh outlives access" relationship that real backends maintain.
 */
export const VALID_REFRESH_TOKEN_EXP = 2527200000 as const;

/**
 * Expired-token epoch — explicitly in the past so tests can verify rejection.
 *
 * Represents 2020-01-01T00:00:00.000Z (1577836800 epoch seconds). A fixed
 * past date that can never become valid through clock skew, leap seconds,
 * or arithmetic drift.
 */
export const EXPIRED_TOKEN_EXP = 1577836800 as const;

/**
 * Far-future epoch — used by long-lived session fixtures (e.g. tests that
 * must NEVER trigger the token-refresh path during their lifetime).
 *
 * Represents 2099-01-01T00:00:00.000Z (4070908800 epoch seconds).
 */
export const FAR_FUTURE_EXP = 4070908800 as const;

// =============================================================================
// PHASE 4 — STATIC JWT TOKEN STRINGS
// =============================================================================

/**
 * STATIC JWT access token sample for the "standard" user (email+password
 * sign-in).
 *
 * Format: `header.payload.signature`, all base64url-encoded.
 *
 *   - Header decodes to: `{"alg":"HS256","typ":"JWT"}`
 *   - Payload decodes to a JSON object EXACTLY matching
 *     `STANDARD_USER_ACCESS_TOKEN_PAYLOAD` below
 *     (sub, iat=1704067200, exp=2524611600, aud=blitzy-sso, iss=https://auth.blitzy.test,
 *      jti=jti-standard-001, email=standard.user@blitzy.test, roles=["user"]).
 *   - Signature: `bW9jay1zaWduYXR1cmU` = base64url(`mock-signature`).
 *
 * Per folder spec rule 3, the value is STATIC. NEVER use against a real backend.
 */
export const STANDARD_USER_ACCESS_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.' +
    'eyJzdWIiOiJzdGFuZGFyZC51c2VyQGJsaXR6eS50ZXN0IiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjI1MjQ2MTE2MDAsImF1ZCI6ImJsaXR6eS1zc28iLCJpc3MiOiJodHRwczovL2F1dGguYmxpdHp5LnRlc3QiLCJqdGkiOiJqdGktc3RhbmRhcmQtMDAxIiwiZW1haWwiOiJzdGFuZGFyZC51c2VyQGJsaXR6eS50ZXN0Iiwicm9sZXMiOlsidXNlciJdfQ' +
    '.' +
    ('bW9jay1zaWduYXR1cmU' as const);

/**
 * STATIC JWT refresh token sample for the "standard" user.
 *
 * Payload decodes to a JSON object EXACTLY matching
 * `STANDARD_USER_REFRESH_TOKEN_PAYLOAD` below
 * (sub, iat=1704067200, exp=2527200000, jti=jti-standard-refresh-001,
 *  email=standard.user@blitzy.test).
 *
 * Signature: `bW9jay1yZWZyZXNoLXNpZ25hdHVyZQ` = base64url(`mock-refresh-signature`).
 */
export const STANDARD_USER_REFRESH_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.' +
    'eyJzdWIiOiJzdGFuZGFyZC51c2VyQGJsaXR6eS50ZXN0IiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjI1MjcyMDAwMDAsImp0aSI6Imp0aS1zdGFuZGFyZC1yZWZyZXNoLTAwMSIsImVtYWlsIjoic3RhbmRhcmQudXNlckBibGl0enkudGVzdCJ9' +
    '.' +
    ('bW9jay1yZWZyZXNoLXNpZ25hdHVyZQ' as const);

/**
 * STATIC JWT access token sample for the "federated" user (Microsoft OAuth
 * sign-in).
 *
 * Payload decodes to a JSON object EXACTLY matching
 * `FEDERATED_USER_ACCESS_TOKEN_PAYLOAD` below — note the `provider:"microsoft"`
 * claim that distinguishes federated sessions from email/password sessions.
 */
export const FEDERATED_USER_ACCESS_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.' +
    'eyJzdWIiOiJmZWRlcmF0ZWQudXNlckBibGl0enkudGVzdCIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjoyNTI0NjExNjAwLCJhdWQiOiJibGl0enktc3NvIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmJsaXR6eS50ZXN0IiwianRpIjoianRpLWZlZGVyYXRlZC0wMDEiLCJlbWFpbCI6ImZlZGVyYXRlZC51c2VyQGJsaXR6eS50ZXN0Iiwicm9sZXMiOlsidXNlciJdLCJwcm92aWRlciI6Im1pY3Jvc29mdCJ9' +
    '.' +
    ('bW9jay1zaWduYXR1cmU' as const);

/**
 * STATIC JWT refresh token sample for the "federated" user.
 *
 * Refresh tokens do NOT carry the `provider` claim — only access tokens do.
 */
export const FEDERATED_USER_REFRESH_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.' +
    'eyJzdWIiOiJmZWRlcmF0ZWQudXNlckBibGl0enkudGVzdCIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjoyNTI3MjAwMDAwLCJqdGkiOiJqdGktZmVkZXJhdGVkLXJlZnJlc2gtMDAxIiwiZW1haWwiOiJmZWRlcmF0ZWQudXNlckBibGl0enkudGVzdCJ9' +
    '.' +
    ('bW9jay1yZWZyZXNoLXNpZ25hdHVyZQ' as const);

/**
 * STATIC JWT access token sample for the "new" user (post-registration).
 *
 * Used by Registration Completion flow integration tests.
 */
export const NEW_USER_ACCESS_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.' +
    'eyJzdWIiOiJuZXcudXNlckBibGl0enkudGVzdCIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjoyNTI0NjExNjAwLCJhdWQiOiJibGl0enktc3NvIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmJsaXR6eS50ZXN0IiwianRpIjoianRpLW5ldy0wMDEiLCJlbWFpbCI6Im5ldy51c2VyQGJsaXR6eS50ZXN0Iiwicm9sZXMiOlsidXNlciJdfQ' +
    '.' +
    ('bW9jay1zaWduYXR1cmU' as const);

/**
 * STATIC JWT refresh token sample for the "new" user (post-registration).
 */
export const NEW_USER_REFRESH_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.' +
    'eyJzdWIiOiJuZXcudXNlckBibGl0enkudGVzdCIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjoyNTI3MjAwMDAwLCJqdGkiOiJqdGktbmV3LXJlZnJlc2gtMDAxIiwiZW1haWwiOiJuZXcudXNlckBibGl0enkudGVzdCJ9' +
    '.' +
    ('bW9jay1yZWZyZXNoLXNpZ25hdHVyZQ' as const);

/**
 * STATIC JWT access token sample that is already EXPIRED.
 *
 * The `exp` claim is 2020-01-01T00:00:00.000Z (epoch 1577836800), far in the
 * past — so token-validation tests can verify the SUT rejects this token and
 * triggers a refresh-then-retry path.
 *
 * The `iat` claim is 2019-12-31T23:00:00.000Z (epoch 1577833200), exactly one
 * hour before `exp`, so the token's stated lifetime is the same one-hour
 * window as a non-expired access token; only the absolute date is in the past.
 *
 * Signature: `bW9jay1leHBpcmVkLXNpZ25hdHVyZQ` = base64url(`mock-expired-signature`).
 */
export const EXPIRED_ACCESS_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.' +
    'eyJzdWIiOiJzdGFuZGFyZC51c2VyQGJsaXR6eS50ZXN0IiwiaWF0IjoxNTc3ODMzMjAwLCJleHAiOjE1Nzc4MzY4MDAsImF1ZCI6ImJsaXR6eS1zc28iLCJpc3MiOiJodHRwczovL2F1dGguYmxpdHp5LnRlc3QiLCJqdGkiOiJqdGktZXhwaXJlZC0wMDEiLCJlbWFpbCI6InN0YW5kYXJkLnVzZXJAYmxpdHp5LnRlc3QiLCJyb2xlcyI6WyJ1c2VyIl19' +
    '.' +
    ('bW9jay1leHBpcmVkLXNpZ25hdHVyZQ' as const);

/**
 * STATIC JWT refresh token sample that is already EXPIRED.
 *
 * Refresh-token `exp` is 1577919600 (= 2020-01-01T23:00:00.000Z) — also in
 * the past. When BOTH the access and the refresh tokens are expired, the
 * SUT must redirect to the sign-in screen rather than attempting a refresh.
 */
export const EXPIRED_REFRESH_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.' +
    'eyJzdWIiOiJzdGFuZGFyZC51c2VyQGJsaXR6eS50ZXN0IiwiaWF0IjoxNTc3ODMzMjAwLCJleHAiOjE1Nzc5MTk2MDAsImp0aSI6Imp0aS1leHBpcmVkLXJlZnJlc2gtMDAxIiwiZW1haWwiOiJzdGFuZGFyZC51c2VyQGJsaXR6eS50ZXN0In0' +
    '.' +
    ('bW9jay1leHBpcmVkLXNpZ25hdHVyZQ' as const);

/**
 * STATIC malformed JWT — only TWO segments instead of three. Used to test
 * the SUT's handling of corrupt tokens (e.g. truncated cookies, attacker-
 * supplied garbage values, copy-paste errors in dev tools).
 */
export const MALFORMED_TOKEN = 'this.is-not-a-valid-jwt' as const;

/**
 * STATIC JWT with valid three-segment structure but a signature that is
 * OBVIOUSLY wrong (not even valid base64url).
 *
 * Used to verify the SUT's signature-verification path rejects this token
 * with a "signature invalid" error rather than treating it as a parse error.
 * The payload's `exp` is far-future (2050-01-01T01:00:00.000Z) so the SUT
 * cannot mistake an expiration failure for a signature failure — this
 * fixture forces the signature-verification code path specifically.
 */
export const INVALID_SIGNATURE_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.' +
    'eyJzdWIiOiJzdGFuZGFyZC51c2VyQGJsaXR6eS50ZXN0IiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjI1MjQ2MTE2MDAsImF1ZCI6ImJsaXR6eS1zc28iLCJpc3MiOiJodHRwczovL2F1dGguYmxpdHp5LnRlc3QiLCJqdGkiOiJqdGktaW52YWxpZC0wMDEiLCJlbWFpbCI6InN0YW5kYXJkLnVzZXJAYmxpdHp5LnRlc3QiLCJyb2xlcyI6WyJ1c2VyIl19' +
    '.' +
    ('tampered_signature_will_not_verify' as const);

// =============================================================================
// PHASE 5 — DECODED JWT PAYLOAD CONSTANTS
// =============================================================================
//
// These constants represent the JSON shapes that the SUT would compute after
// successfully decoding the corresponding token strings above. They are
// declared as STATIC objects so tests can assert against them without invoking
// a real JWT library — and so the test harness has a single source of truth
// for "what is inside the standard user's access token".
//
// The base64-decoded bytes of the token strings above match these objects
// EXACTLY for every claim (sub, iat, exp, aud, iss, jti, email, roles, provider).
// =============================================================================

/**
 * Decoded payload of `STANDARD_USER_ACCESS_TOKEN`.
 *
 * `provider` is OMITTED per `exactOptionalPropertyTypes: true` — never
 * set to `undefined`.
 */
export const STANDARD_USER_ACCESS_TOKEN_PAYLOAD: JwtPayload = {
    sub: 'standard.user@blitzy.test',
    iat: SESSION_REFERENCE_IAT,
    exp: VALID_ACCESS_TOKEN_EXP,
    aud: 'blitzy-sso',
    iss: 'https://auth.blitzy.test',
    jti: 'jti-standard-001',
    email: 'standard.user@blitzy.test',
    roles: ['user'],
};

/**
 * Decoded payload of `STANDARD_USER_REFRESH_TOKEN`.
 */
export const STANDARD_USER_REFRESH_TOKEN_PAYLOAD: RefreshTokenPayload = {
    sub: 'standard.user@blitzy.test',
    iat: SESSION_REFERENCE_IAT,
    exp: VALID_REFRESH_TOKEN_EXP,
    jti: 'jti-standard-refresh-001',
    email: 'standard.user@blitzy.test',
};

/**
 * Decoded payload of `FEDERATED_USER_ACCESS_TOKEN` — Microsoft OAuth.
 *
 * `provider: 'microsoft'` is the distinguishing claim.
 */
export const FEDERATED_USER_ACCESS_TOKEN_PAYLOAD: JwtPayload = {
    sub: 'federated.user@blitzy.test',
    iat: SESSION_REFERENCE_IAT,
    exp: VALID_ACCESS_TOKEN_EXP,
    aud: 'blitzy-sso',
    iss: 'https://auth.blitzy.test',
    jti: 'jti-federated-001',
    email: 'federated.user@blitzy.test',
    roles: ['user'],
    provider: 'microsoft',
};

/**
 * Decoded payload of `FEDERATED_USER_REFRESH_TOKEN`.
 *
 * Refresh tokens do NOT carry the `provider` claim.
 */
export const FEDERATED_USER_REFRESH_TOKEN_PAYLOAD: RefreshTokenPayload = {
    sub: 'federated.user@blitzy.test',
    iat: SESSION_REFERENCE_IAT,
    exp: VALID_REFRESH_TOKEN_EXP,
    jti: 'jti-federated-refresh-001',
    email: 'federated.user@blitzy.test',
};

/**
 * Decoded payload of `NEW_USER_ACCESS_TOKEN`.
 */
export const NEW_USER_ACCESS_TOKEN_PAYLOAD: JwtPayload = {
    sub: 'new.user@blitzy.test',
    iat: SESSION_REFERENCE_IAT,
    exp: VALID_ACCESS_TOKEN_EXP,
    aud: 'blitzy-sso',
    iss: 'https://auth.blitzy.test',
    jti: 'jti-new-001',
    email: 'new.user@blitzy.test',
    roles: ['user'],
};

/**
 * Decoded payload of `NEW_USER_REFRESH_TOKEN`.
 */
export const NEW_USER_REFRESH_TOKEN_PAYLOAD: RefreshTokenPayload = {
    sub: 'new.user@blitzy.test',
    iat: SESSION_REFERENCE_IAT,
    exp: VALID_REFRESH_TOKEN_EXP,
    jti: 'jti-new-refresh-001',
    email: 'new.user@blitzy.test',
};

/**
 * Decoded payload of `EXPIRED_ACCESS_TOKEN`.
 *
 * `iat = 1577833200` (= 2019-12-31T23:00:00.000Z) — exactly one hour before
 * `exp` so the token's stated lifetime is normal but the absolute window is
 * in the past.
 *
 * `provider` is OMITTED (this is an expired email/password session, not a
 * federated one) per `exactOptionalPropertyTypes: true`.
 */
export const EXPIRED_ACCESS_TOKEN_PAYLOAD: JwtPayload = {
    sub: 'standard.user@blitzy.test',
    iat: 1577833200,
    exp: EXPIRED_TOKEN_EXP,
    aud: 'blitzy-sso',
    iss: 'https://auth.blitzy.test',
    jti: 'jti-expired-001',
    email: 'standard.user@blitzy.test',
    roles: ['user'],
};

// =============================================================================
// PHASE 6 — COMPLETE SESSION FIXTURES
// =============================================================================
//
// Bundle access token + refresh token + their decoded payloads + ISO
// expiration timestamps into single `Session` objects, one per user variant.
// Integration tests can pass a whole `Session` to a session-provider in a
// single statement instead of wiring up individual tokens.
// =============================================================================

/**
 * Canonical session for the "standard" user (email+password sign-in).
 *
 * Issued at `SESSION_REFERENCE_IAT_ISO` (2024-01-01T00:00:00.000Z), expires
 * 2050-01-01T01:00:00.000Z (access) and 2050-01-31T00:00:00.000Z (refresh).
 * The far-future expiration ensures this session is semantically valid for
 * any reasonable test execution date — see the `VALID_ACCESS_TOKEN_EXP` and
 * `VALID_REFRESH_TOKEN_EXP` documentation for the rationale on decoupling
 * expiration from `iat + lifetime` arithmetic.
 */
export const STANDARD_SESSION: Session = {
    accessToken: STANDARD_USER_ACCESS_TOKEN,
    refreshToken: STANDARD_USER_REFRESH_TOKEN,
    accessTokenPayload: STANDARD_USER_ACCESS_TOKEN_PAYLOAD,
    refreshTokenPayload: STANDARD_USER_REFRESH_TOKEN_PAYLOAD,
    accessTokenExpiresAt: '2050-01-01T01:00:00.000Z',
    refreshTokenExpiresAt: '2050-01-31T00:00:00.000Z',
};

/**
 * Canonical session for the "federated" user (Microsoft OAuth sign-in).
 *
 * Identical timing to `STANDARD_SESSION` (far-future expirations); the
 * distinguishing feature is the `provider: 'microsoft'` claim in
 * `accessTokenPayload`.
 */
export const FEDERATED_SESSION: Session = {
    accessToken: FEDERATED_USER_ACCESS_TOKEN,
    refreshToken: FEDERATED_USER_REFRESH_TOKEN,
    accessTokenPayload: FEDERATED_USER_ACCESS_TOKEN_PAYLOAD,
    refreshTokenPayload: FEDERATED_USER_REFRESH_TOKEN_PAYLOAD,
    accessTokenExpiresAt: '2050-01-01T01:00:00.000Z',
    refreshTokenExpiresAt: '2050-01-31T00:00:00.000Z',
};

/**
 * Canonical session for the "new" user (immediately after completing the
 * Registration Completion flow). Same far-future expirations as
 * `STANDARD_SESSION` and `FEDERATED_SESSION`.
 */
export const NEW_USER_SESSION: Session = {
    accessToken: NEW_USER_ACCESS_TOKEN,
    refreshToken: NEW_USER_REFRESH_TOKEN,
    accessTokenPayload: NEW_USER_ACCESS_TOKEN_PAYLOAD,
    refreshTokenPayload: NEW_USER_REFRESH_TOKEN_PAYLOAD,
    accessTokenExpiresAt: '2050-01-01T01:00:00.000Z',
    refreshTokenExpiresAt: '2050-01-31T00:00:00.000Z',
};

/**
 * Expired session — both access and refresh tokens have already passed
 * their `exp`. Used by MSW auth handlers to drive expired-session recovery
 * paths (specifically the redirect-to-sign-in path that triggers when refresh
 * itself fails).
 *
 * The inline `refreshTokenPayload` uses a slightly different `exp` than the
 * top-level `EXPIRED_TOKEN_EXP` because the refresh token has a longer
 * stated lifetime than the access token, but both timestamps are well in
 * the past so the semantic is unchanged: this session is dead.
 */
export const EXPIRED_SESSION: Session = {
    accessToken: EXPIRED_ACCESS_TOKEN,
    refreshToken: EXPIRED_REFRESH_TOKEN,
    accessTokenPayload: EXPIRED_ACCESS_TOKEN_PAYLOAD,
    refreshTokenPayload: {
        sub: 'standard.user@blitzy.test',
        iat: 1577833200,
        exp: 1577919600,
        jti: 'jti-expired-refresh-001',
        email: 'standard.user@blitzy.test',
    },
    accessTokenExpiresAt: '2020-01-01T01:00:00.000Z',
    refreshTokenExpiresAt: '2020-01-02T00:00:00.000Z',
};

// =============================================================================
// PHASE 7 — AUTH SUCCESS RESPONSE TYPE AND CONSTANTS
// =============================================================================
//
// `AuthSuccessResponse` is the shape returned by the backend on a successful
// sign-in (email+password) or OAuth callback. MSW handlers in
// `tests/mocks/handlers/auth.ts` return one of the constants below as the
// JSON body of a 200 response.
//
// The shape differs from `Session` in that it adds `tokenType` (OAuth 2.0
// `Bearer`), `expiresIn` (seconds), and a nested `user` profile object —
// matching the contract a typical OAuth-style auth API exposes.
// =============================================================================

/**
 * Shape of a successful authentication response sent by the backend
 * (mocked by MSW handlers in `tests/mocks/handlers/auth.ts`).
 *
 * The SSO components consume this shape after the OAuth callback completes
 * or after a successful email+password sign-in.
 */
export interface AuthSuccessResponse {
    /** Bearer access token. */
    readonly accessToken: string;
    /** Refresh token. */
    readonly refreshToken: string;
    /** OAuth 2.0 token type — always `Bearer` for the Blitzy SSO surface. */
    readonly tokenType: 'Bearer';
    /** Access-token lifetime in seconds (typically `ACCESS_TOKEN_LIFETIME_SECONDS`). */
    readonly expiresIn: number;
    /** The authenticated user profile. */
    readonly user: {
        readonly email: string;
        readonly firstName: string;
        readonly lastName: string;
        readonly roles: readonly string[];
        /**
         * Federated provider id if this session came from OAuth, else omitted.
         *
         * Per `exactOptionalPropertyTypes: true`, omit the field entirely on
         * non-federated responses — do NOT set it to `undefined`.
         */
        readonly provider?: 'microsoft' | 'google' | 'other';
    };
}

/**
 * Canonical auth success response for the "standard" user.
 *
 * `provider` is OMITTED from `user` (this is an email/password account).
 */
export const STANDARD_AUTH_SUCCESS: AuthSuccessResponse = {
    accessToken: STANDARD_USER_ACCESS_TOKEN,
    refreshToken: STANDARD_USER_REFRESH_TOKEN,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_LIFETIME_SECONDS,
    user: {
        email: 'standard.user@blitzy.test',
        firstName: 'Standard',
        lastName: 'User',
        roles: ['user'],
    },
};

/**
 * Canonical auth success response for the "federated" (Microsoft OAuth) user.
 *
 * `provider: 'microsoft'` is included in `user`.
 */
export const FEDERATED_AUTH_SUCCESS: AuthSuccessResponse = {
    accessToken: FEDERATED_USER_ACCESS_TOKEN,
    refreshToken: FEDERATED_USER_REFRESH_TOKEN,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_LIFETIME_SECONDS,
    user: {
        email: 'federated.user@blitzy.test',
        firstName: 'Federated',
        lastName: 'User',
        roles: ['user'],
        provider: 'microsoft',
    },
};

/**
 * Canonical auth success response for the newly-registered user (returned
 * immediately after the Registration Completion form is submitted).
 */
export const NEW_USER_AUTH_SUCCESS: AuthSuccessResponse = {
    accessToken: NEW_USER_ACCESS_TOKEN,
    refreshToken: NEW_USER_REFRESH_TOKEN,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_LIFETIME_SECONDS,
    user: {
        email: 'new.user@blitzy.test',
        firstName: 'New',
        lastName: 'User',
        roles: ['user'],
    },
};

// =============================================================================
// PHASE 8 — AUTH ERROR RESPONSE TYPE AND CONSTANTS
// =============================================================================
//
// `AuthErrorResponse` is the shape returned by the backend on an unsuccessful
// sign-in. MSW handlers return one of these constants as the JSON body of a
// 4xx or 5xx response. The `status` field encodes the HTTP status code so
// handlers can map fixture → response status in a single line:
//
//   return HttpResponse.json(AUTH_ERROR_INVALID_CREDENTIALS, {
//       status: AUTH_ERROR_INVALID_CREDENTIALS.status,
//   });
// =============================================================================

/**
 * Shape of an authentication error response.
 *
 * The OAuth 2.0 RFC 6749 §5.2 dictates the `error` and `error_description`
 * fields; `status` is a Blitzy-specific addition that mirrors the HTTP
 * status code for handler convenience.
 */
export interface AuthErrorResponse {
    /** Machine-readable error code (snake_case). */
    readonly error: string;
    /** Human-readable error description (rendered in toasts, banners). */
    readonly error_description: string;
    /** HTTP status code (401, 403, 423, 429, 500). */
    readonly status: number;
}

/**
 * Invalid-credentials error — returned by `POST /auth/sign-in` when the
 * supplied email exists but the password is wrong, OR the email does not
 * exist (the two cases are deliberately not distinguished to avoid email
 * enumeration).
 *
 * HTTP 401 Unauthorized.
 */
export const AUTH_ERROR_INVALID_CREDENTIALS: AuthErrorResponse = {
    error: 'invalid_credentials',
    error_description: 'The email or password you entered is incorrect',
    status: 401,
};

/**
 * Account-locked error — returned after repeated failed sign-in attempts.
 *
 * HTTP 423 Locked. The SUT renders a "Forgot your password?" CTA in
 * response.
 */
export const AUTH_ERROR_ACCOUNT_LOCKED: AuthErrorResponse = {
    error: 'account_locked',
    error_description:
        'This account has been temporarily locked due to repeated failed sign-in attempts',
    status: 423,
};

/**
 * Account-requires-SSO error — returned when a user tries email+password
 * sign-in but the account is federated-only. Drives the Link Accounts flow.
 *
 * HTTP 403 Forbidden.
 */
export const AUTH_ERROR_REQUIRES_SSO: AuthErrorResponse = {
    error: 'requires_sso',
    error_description: 'This account uses single sign-on. Please sign in with your provider.',
    status: 403,
};

/**
 * Rate-limited error — returned when the per-IP or per-account sign-in
 * attempt budget is exhausted.
 *
 * HTTP 429 Too Many Requests.
 */
export const AUTH_ERROR_RATE_LIMITED: AuthErrorResponse = {
    error: 'too_many_requests',
    error_description: 'Too many sign-in attempts. Please try again in a few minutes.',
    status: 429,
};

/**
 * Generic server error — returned for unexpected backend failures.
 *
 * HTTP 500 Internal Server Error. The SUT renders a non-actionable error
 * banner and may surface a "try again" CTA.
 */
export const AUTH_ERROR_SERVER: AuthErrorResponse = {
    error: 'internal_server_error',
    error_description: 'An unexpected error occurred. Please try again.',
    status: 500,
};

// =============================================================================
// PHASE 9 — CONVENIENCE BUNDLE
// =============================================================================
//
// Ergonomic single-import access for tests that want everything via one
// symbol:
//
//   import { sessions } from '@tests/fixtures/sessions';
//   sessions.standard.accessToken
//   sessions.tokens.expiredAccess
//   sessions.payloads.federatedAccess
//   sessions.responses.standardSuccess
//   sessions.errors.invalidCredentials
//   sessions.constants.accessTokenLifetimeSeconds
//
// The named exports above are also retained for tree-shaking-friendly
// granular imports (`ts-prune` can detect unused individual symbols).
// =============================================================================

/**
 * Convenience bundle that nests every export of this module under a single
 * `sessions` object.
 *
 * The deep `as const` narrows every leaf to its literal type where possible,
 * so consumers calling `sessions.responses.standardSuccess.tokenType` get
 * the literal `'Bearer'` type instead of `string`.
 */
export const sessions = {
    /** Complete session objects, one per user variant. */
    standard: STANDARD_SESSION,
    federated: FEDERATED_SESSION,
    newUser: NEW_USER_SESSION,
    expired: EXPIRED_SESSION,
    /** Raw JWT token strings. */
    tokens: {
        standardAccess: STANDARD_USER_ACCESS_TOKEN,
        standardRefresh: STANDARD_USER_REFRESH_TOKEN,
        federatedAccess: FEDERATED_USER_ACCESS_TOKEN,
        federatedRefresh: FEDERATED_USER_REFRESH_TOKEN,
        newUserAccess: NEW_USER_ACCESS_TOKEN,
        newUserRefresh: NEW_USER_REFRESH_TOKEN,
        expiredAccess: EXPIRED_ACCESS_TOKEN,
        expiredRefresh: EXPIRED_REFRESH_TOKEN,
        malformed: MALFORMED_TOKEN,
        invalidSignature: INVALID_SIGNATURE_TOKEN,
    },
    /** Decoded JWT payload objects. */
    payloads: {
        standardAccess: STANDARD_USER_ACCESS_TOKEN_PAYLOAD,
        standardRefresh: STANDARD_USER_REFRESH_TOKEN_PAYLOAD,
        federatedAccess: FEDERATED_USER_ACCESS_TOKEN_PAYLOAD,
        federatedRefresh: FEDERATED_USER_REFRESH_TOKEN_PAYLOAD,
        newUserAccess: NEW_USER_ACCESS_TOKEN_PAYLOAD,
        newUserRefresh: NEW_USER_REFRESH_TOKEN_PAYLOAD,
        expiredAccess: EXPIRED_ACCESS_TOKEN_PAYLOAD,
    },
    /** Auth success response shapes (returned by MSW on 200). */
    responses: {
        standardSuccess: STANDARD_AUTH_SUCCESS,
        federatedSuccess: FEDERATED_AUTH_SUCCESS,
        newUserSuccess: NEW_USER_AUTH_SUCCESS,
    },
    /** Auth error response shapes (returned by MSW on 4xx/5xx). */
    errors: {
        invalidCredentials: AUTH_ERROR_INVALID_CREDENTIALS,
        accountLocked: AUTH_ERROR_ACCOUNT_LOCKED,
        requiresSso: AUTH_ERROR_REQUIRES_SSO,
        rateLimited: AUTH_ERROR_RATE_LIMITED,
        server: AUTH_ERROR_SERVER,
    },
    /** Static time constants used to derive every other timestamp. */
    constants: {
        referenceIat: SESSION_REFERENCE_IAT,
        referenceIatIso: SESSION_REFERENCE_IAT_ISO,
        accessTokenLifetimeSeconds: ACCESS_TOKEN_LIFETIME_SECONDS,
        refreshTokenLifetimeSeconds: REFRESH_TOKEN_LIFETIME_SECONDS,
        validAccessTokenExp: VALID_ACCESS_TOKEN_EXP,
        validRefreshTokenExp: VALID_REFRESH_TOKEN_EXP,
        expiredTokenExp: EXPIRED_TOKEN_EXP,
        farFutureExp: FAR_FUTURE_EXP,
    },
} as const;
