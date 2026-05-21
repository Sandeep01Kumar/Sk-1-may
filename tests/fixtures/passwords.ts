/**
 * Password fixtures: valid, invalid, and edge-case password samples.
 *
 * These are STATIC samples used by:
 *   - tests/unit/utils/validation.test.ts (rule-engine boundary coverage)
 *   - tests/integration/password-toggle.test.tsx (show/hide flow)
 *   - tests/integration/registration.test.tsx (registration completion)
 *   - tests/component/sso/RegistrationCompletion.test.tsx (field validation)
 *   - tests/component/sso/LinkAccountsModal.test.tsx (link confirmation)
 *
 * Rule taxonomy targeted by these samples (the `evaluatePasswordRules`
 * implementation is the source of truth; if its rule set evolves, update
 * this fixture in lock-step):
 *
 *   • minLength       — at least 12 characters
 *   • maxLength       — no more than 128 characters
 *   • uppercase       — at least one A-Z
 *   • lowercase       — at least one a-z
 *   • digit           — at least one 0-9
 *   • symbol          — at least one of !@#$%^&*()_+-=[]{};':"\|,.<>/?~`
 *   • notCommon       — not in a deny-list of obvious passwords
 *   • noWhitespace    — no leading/trailing whitespace
 *
 * Per folder-level spec rule 3: every value here is a STATIC string literal.
 * No randomness at module load (no `Date.now`, no `crypto.randomUUID`,
 * no `Math.random`).
 *
 * Cross-file value contract:
 *   The "valid" sample values intentionally duplicate the `password` field
 *   of `tests/fixtures/users.ts` (`StandardP@ssw0rd!`, `FederatedP@ssw0rd!`,
 *   `NewUserP@ssw0rd!`). The relationship is by VALUE not by reference —
 *   this fixture has zero internal imports (folder-level rule). If a
 *   password value changes, both files must update.
 *
 * Authority:
 *   - AAP Section 0.3.1 (target function evaluatePasswordRules).
 *   - AAP Section 0.4.4 (fixture table — Password rules row).
 *   - AAP Section 0.5.1 (file row).
 *   - AAP Section 0.10.2 (typed exports only, stable values, no factories).
 *
 * Strict-mode compliance:
 *   - Every constant is explicitly typed (`PasswordSample`,
 *     `readonly PasswordSample[]`).
 *   - All array literals carry `as const` for literal-type narrowing.
 *   - `violations` is `readonly PasswordRuleId[]` — the union type
 *     narrows the field at the call site.
 *   - No `any`, no implicit `undefined`, no factory functions, NO imports.
 */

// =============================================================================
// PHASE 2 — RULE IDENTIFIER TYPE AND BOUNDARY CONSTANTS
// =============================================================================

/**
 * Canonical list of rule identifiers — kept in lock-step with the
 * `PasswordRuleResult.rule` field of `evaluatePasswordRules`.
 *
 * Adding or removing a rule here MUST be mirrored in:
 *   - src/utils/validation.ts (rule engine implementation)
 *   - tests/unit/utils/validation.test.ts (rule-engine assertions)
 */
export type PasswordRuleId =
    | 'minLength'
    | 'maxLength'
    | 'uppercase'
    | 'lowercase'
    | 'digit'
    | 'symbol'
    | 'notCommon'
    | 'noWhitespace';

/**
 * The full ordered list of rule identifiers exported for iteration.
 *
 * Order is deterministic so parameterised tests produce stable test names.
 */
export const PASSWORD_RULE_IDS: readonly PasswordRuleId[] = [
    'minLength',
    'maxLength',
    'uppercase',
    'lowercase',
    'digit',
    'symbol',
    'notCommon',
    'noWhitespace',
] as const;

/**
 * Minimum allowed password length (in UTF-16 code units / `String.length`).
 *
 * Must match the implementation in src/utils/validation.ts. The literal
 * type `12` is preserved via `as const` so `passwords.rules.minLength`
 * narrows to a literal.
 */
export const PASSWORD_MIN_LENGTH = 12 as const;

/**
 * Maximum allowed password length (in UTF-16 code units / `String.length`).
 *
 * Must match the implementation in src/utils/validation.ts. The literal
 * type `128` is preserved via `as const` so `passwords.rules.maxLength`
 * narrows to a literal.
 */
export const PASSWORD_MAX_LENGTH = 128 as const;

/**
 * Set of symbol characters accepted by the symbol rule.
 *
 * Documented here so tests can iterate over each symbol; the implementation
 * uses a regex character class but this string is the canonical reference.
 *
 * Contents (32 characters):
 *   ! @ # $ % ^ & * ( ) _ + - = [ ] { } ;
 *   ' : " \ | , . < > / ? ~ `
 */
export const PASSWORD_SYMBOL_CHARS = '!@#$%^&*()_+-=[]{};\':"\\|,.<>/?~`' as const;

/**
 * A small deny-list used to verify the `notCommon` rule. The implementation
 * may use a larger list; these are the samples explicitly exercised by tests.
 *
 * Selection rationale: each entry represents a distinct anti-pattern that
 * a permissive rule engine might still accept (capitalisation, leetspeak,
 * symbol substitution, vendor-default-style "Welcome1!" / "Admin@1234").
 */
export const COMMON_PASSWORD_DENY_LIST: readonly string[] = [
    'password',
    'Password1!',
    'P@ssword123',
    'P@ssw0rd!',
    'Welcome1!',
    'Qwerty123!',
    'Admin@1234',
    'Letmein123!',
] as const;

// =============================================================================
// PHASE 3 — SAMPLE TYPE
// =============================================================================

/**
 * A password sample annotated with the expected result of evaluating it
 * against every rule.
 *
 * Used by parameterised tests:
 *   it.each(VALID_PASSWORDS)('$label passes every rule', (sample) => { ... });
 *   it.each(INVALID_PASSWORDS)('$label violates $violations', (sample) => { ... });
 */
export interface PasswordSample {
    /** Human-readable label used as the `it()` test name. */
    readonly label: string;
    /** The literal password string. */
    readonly value: string;
    /** True if this password is expected to PASS every rule. */
    readonly valid: boolean;
    /** Rule identifiers this sample is expected to violate (empty if valid). */
    readonly violations: readonly PasswordRuleId[];
}

// =============================================================================
// PHASE 4 — VALID PASSWORD SAMPLES
//
// Each sample below MUST pass every rule in PASSWORD_RULE_IDS. The
// `violations` array is empty by construction.
// =============================================================================

/**
 * STANDARD valid password — matches `STANDARD_USER.password` in
 * `tests/fixtures/users.ts` so sign-in happy-path tests see one canonical
 * value regardless of which fixture they import from.
 *
 * Characters: 'S','t','a','n','d','a','r','d','P','@','s','s','w','0','r','d','!'
 * Length:     17
 * Uppercase:  S, P
 * Lowercase:  t, a, n, d, r, s, w
 * Digit:      0
 * Symbol:     @, !
 */
export const VALID_PASSWORD_STANDARD: PasswordSample = {
    label: 'standard valid password',
    value: 'StandardP@ssw0rd!',
    valid: true,
    violations: [],
};

/**
 * FEDERATED user valid password — matches `FEDERATED_USER.password` in
 * `tests/fixtures/users.ts`.
 *
 * Length:     18
 * Uppercase:  F, P
 * Lowercase:  e, d, r, a, t, s, w
 * Digit:      0
 * Symbol:     @, !
 */
export const VALID_PASSWORD_FEDERATED: PasswordSample = {
    label: 'federated user valid password',
    value: 'FederatedP@ssw0rd!',
    valid: true,
    violations: [],
};

/**
 * NEW USER valid password — matches `NEW_USER.password` in
 * `tests/fixtures/users.ts` so the registration completion happy path
 * uses one canonical value.
 *
 * Length:     16
 * Uppercase:  N, U, P
 * Lowercase:  e, w, s, r, d
 * Digit:      0
 * Symbol:     @, !
 */
export const VALID_PASSWORD_NEW_USER: PasswordSample = {
    label: 'new user valid password',
    value: 'NewUserP@ssw0rd!',
    valid: true,
    violations: [],
};

/**
 * Boundary case — EXACTLY the minimum length (12 chars).
 *
 * Constructed as the 4-char block 'Aa1!' repeated 3 times so every
 * character class is satisfied with minimal waste.
 *
 * Length:     12 (== PASSWORD_MIN_LENGTH)
 * Uppercase:  A (x3)
 * Lowercase:  a (x3)
 * Digit:      1 (x3)
 * Symbol:     ! (x3)
 *
 * Pairs with INVALID_PASSWORD_TOO_SHORT (11 chars) to straddle the boundary.
 */
export const VALID_PASSWORD_MIN_LENGTH: PasswordSample = {
    label: 'exactly minimum length (12 chars)',
    value: 'Aa1!Aa1!Aa1!',
    valid: true,
    violations: [],
};

/**
 * Boundary case — EXACTLY the maximum length (128 chars).
 *
 * Constructed as the 4-char block 'Aa1!' repeated 32 times. The literal
 * is written as two 64-char string lines concatenated so it remains
 * readable in source while still resolving to a single static string.
 *
 * Length:     128 (== PASSWORD_MAX_LENGTH)
 * Uppercase:  A (x32)
 * Lowercase:  a (x32)
 * Digit:      1 (x32)
 * Symbol:     ! (x32)
 *
 * Pairs with INVALID_PASSWORD_TOO_LONG (129 chars) to straddle the boundary.
 */
export const VALID_PASSWORD_MAX_LENGTH: PasswordSample = {
    label: 'exactly maximum length (128 chars)',
    value:
        'Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!' +
        'Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!',
    valid: true,
    violations: [],
};

/**
 * High-entropy passphrase — long, mixed case, contains digits and symbols.
 *
 * This is the canonical "best-practice" sample (long words separated by
 * hyphens with a numeric suffix and trailing symbol). Tests that exercise
 * "strong password" UX affordances should use this value.
 *
 * Length:     32
 * Uppercase:  C, H, B, S
 * Lowercase:  o, r, e, c, t, etc.
 * Digit:      9 (x2)
 * Symbol:     -, !
 */
export const VALID_PASSWORD_PASSPHRASE: PasswordSample = {
    label: 'high-entropy passphrase',
    value: 'Correct-Horse-Battery-Staple-99!',
    valid: true,
    violations: [],
};

/**
 * Unicode-friendly valid password — includes a U+00E9 LATIN SMALL LETTER E
 * WITH ACUTE in addition to ASCII to ensure the rule engine treats letters
 * outside A-Z/a-z gracefully.
 *
 * NOTE: If `evaluatePasswordRules` defines "uppercase"/"lowercase" strictly
 * as A-Z/a-z (not Unicode-aware), this sample MUST still contain enough
 * plain ASCII to satisfy those rules. It does:
 *   - Uppercase ASCII: 'S', 'P'
 *   - Lowercase ASCII: 'c', 'r', 'e', 't', 'a', 's', 'p', 'o', 'r', 't'
 *   - Digit:           '7'
 *   - Symbol:          '-', '!'
 *
 * Length:     18 (UTF-16 code units; 'é' is one BMP code unit U+00E9)
 */
export const VALID_PASSWORD_UNICODE: PasswordSample = {
    label: 'unicode-friendly valid password',
    value: 'Sécret-Passport-7!',
    valid: true,
    violations: [],
};

/**
 * All valid password samples — useful for iteration in parameterised
 * unit tests:
 *
 *   it.each(VALID_PASSWORDS)('$label passes every rule', (sample) => {
 *     expect(evaluatePasswordRules(sample.value).valid).toBe(true);
 *   });
 *
 * Order is deterministic for repeatable test runs.
 */
export const VALID_PASSWORDS: readonly PasswordSample[] = [
    VALID_PASSWORD_STANDARD,
    VALID_PASSWORD_FEDERATED,
    VALID_PASSWORD_NEW_USER,
    VALID_PASSWORD_MIN_LENGTH,
    VALID_PASSWORD_MAX_LENGTH,
    VALID_PASSWORD_PASSPHRASE,
    VALID_PASSWORD_UNICODE,
] as const;

// =============================================================================
// PHASE 5 — INVALID PASSWORD SAMPLES
//
// Each sample below MUST violate at least one rule in PASSWORD_RULE_IDS.
// The `violations` array enumerates EVERY expected violation — these
// samples verify the rule engine reports ALL failures, not just the first.
// =============================================================================

/**
 * Empty string — minimum-length, character-class, and symbol violations.
 *
 * `noWhitespace` is NOT a violation because the string contains no
 * whitespace at all. `maxLength` is NOT violated (0 < 128). `notCommon`
 * is NOT violated because the empty string is not in the deny list (the
 * empty string is not "common" — it is empty).
 *
 * Length:     0
 * Violations: minLength, uppercase, lowercase, digit, symbol  (5 rules)
 */
export const INVALID_PASSWORD_EMPTY: PasswordSample = {
    label: 'empty password',
    value: '',
    valid: false,
    violations: ['minLength', 'uppercase', 'lowercase', 'digit', 'symbol'],
};

/**
 * Boundary case — ONE char below the minimum length (11 chars).
 *
 * Constructed as 'Aa1!' x2 plus 'Aa1' so every character class except
 * length is satisfied. This isolates the minLength rule for assertion.
 *
 * Length:     11 (== PASSWORD_MIN_LENGTH - 1)
 * Violations: minLength
 *
 * Pairs with VALID_PASSWORD_MIN_LENGTH (12 chars) to straddle the boundary.
 */
export const INVALID_PASSWORD_TOO_SHORT: PasswordSample = {
    label: 'one char below minimum length',
    value: 'Aa1!Aa1!Aa1',
    valid: false,
    violations: ['minLength'],
};

/**
 * Boundary case — ONE char above the maximum length (129 chars).
 *
 * Constructed as the 128-char max-length sample plus one trailing 'X'.
 * This isolates the maxLength rule for assertion.
 *
 * Length:     129 (== PASSWORD_MAX_LENGTH + 1)
 * Violations: maxLength
 *
 * Pairs with VALID_PASSWORD_MAX_LENGTH (128 chars) to straddle the boundary.
 */
export const INVALID_PASSWORD_TOO_LONG: PasswordSample = {
    label: 'one char above maximum length',
    value:
        'Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!' +
        'Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!' +
        'X',
    valid: false,
    violations: ['maxLength'],
};

/**
 * Only lowercase letters — fails uppercase, digit, symbol.
 *
 * Length is sufficient (13 chars) to isolate the character-class
 * violations from minLength.
 *
 * Length:     13
 * Violations: uppercase, digit, symbol
 */
export const INVALID_PASSWORD_NO_UPPERCASE: PasswordSample = {
    label: 'no uppercase letters',
    value: 'lowercaseonly',
    valid: false,
    violations: ['uppercase', 'digit', 'symbol'],
};

/**
 * Only uppercase letters — fails lowercase, digit, symbol.
 *
 * Length is sufficient (13 chars) to isolate the character-class
 * violations from minLength.
 *
 * Length:     13
 * Violations: lowercase, digit, symbol
 */
export const INVALID_PASSWORD_NO_LOWERCASE: PasswordSample = {
    label: 'no lowercase letters',
    value: 'UPPERCASEONLY',
    valid: false,
    violations: ['lowercase', 'digit', 'symbol'],
};

/**
 * Has uppercase, lowercase, symbol, length ok — but NO digit.
 *
 * This isolates the `digit` rule from every other rule for assertion.
 *
 * Length:     15
 * Uppercase:  N, D, H
 * Lowercase:  o, i, g, t, s, e, r
 * Symbol:     !, @, #
 * Digit:      none
 * Violations: digit
 */
export const INVALID_PASSWORD_NO_DIGIT: PasswordSample = {
    label: 'no digit',
    value: 'NoDigitsHere!@#',
    valid: false,
    violations: ['digit'],
};

/**
 * Has uppercase, lowercase, digit, length ok — but NO symbol.
 *
 * This isolates the `symbol` rule from every other rule for assertion.
 *
 * Length:     14
 * Uppercase:  N, S, H
 * Lowercase:  o, y, m, b, o, l, e, r, e
 * Digit:      9 (x2)
 * Symbol:     none
 * Violations: symbol
 */
export const INVALID_PASSWORD_NO_SYMBOL: PasswordSample = {
    label: 'no symbol',
    value: 'NoSymbolHere99',
    valid: false,
    violations: ['symbol'],
};

/**
 * In the common-password deny list — fails notCommon plus multiple
 * other rules because 'password' is also too short, has no uppercase,
 * no digit, and no symbol.
 *
 * Length:     8 (< PASSWORD_MIN_LENGTH)
 * Violations: minLength, uppercase, digit, symbol, notCommon  (5 rules)
 *
 * This sample doubles as a "multiple violations including notCommon"
 * check — the rule engine must report ALL of them, not stop at the first.
 */
export const INVALID_PASSWORD_COMMON: PasswordSample = {
    label: 'common password from deny list',
    value: 'password',
    valid: false,
    violations: ['minLength', 'uppercase', 'digit', 'symbol', 'notCommon'],
};

/**
 * In the deny list AND structurally complete in every dimension except
 * length: has uppercase (P), lowercase (s/w/r/d), digit (0), symbol (@/!).
 * Only minLength and notCommon are violated.
 *
 * This isolates the `notCommon` rule from the character-class rules so
 * unit tests can assert "deny-list match" without distraction.
 *
 * Length:     9 (< PASSWORD_MIN_LENGTH)
 * Violations: minLength, notCommon
 */
export const INVALID_PASSWORD_COMMON_STRUCTURE: PasswordSample = {
    label: 'common but structurally complete password',
    value: 'P@ssw0rd!',
    valid: false,
    violations: ['minLength', 'notCommon'],
};

/**
 * Leading whitespace — every character class is satisfied (within the
 * 12-char tail 'Aa1!Aa1!Aa1!'), but a leading space triggers noWhitespace.
 *
 * Length:     13 (1 leading space + 12 chars)
 * Violations: noWhitespace
 *
 * This sample isolates the noWhitespace rule for assertion.
 */
export const INVALID_PASSWORD_LEADING_WHITESPACE: PasswordSample = {
    label: 'leading whitespace',
    value: ' Aa1!Aa1!Aa1!',
    valid: false,
    violations: ['noWhitespace'],
};

/**
 * Trailing whitespace — every character class is satisfied (within the
 * 12-char head 'Aa1!Aa1!Aa1!'), but a trailing space triggers noWhitespace.
 *
 * Length:     13 (12 chars + 1 trailing space)
 * Violations: noWhitespace
 *
 * This sample isolates the noWhitespace rule for assertion.
 */
export const INVALID_PASSWORD_TRAILING_WHITESPACE: PasswordSample = {
    label: 'trailing whitespace',
    value: 'Aa1!Aa1!Aa1! ',
    valid: false,
    violations: ['noWhitespace'],
};

/**
 * Whitespace-only — 12 ASCII spaces.
 *
 * Length is exactly at the minimum boundary (12 == PASSWORD_MIN_LENGTH),
 * so minLength is NOT violated. Every character class is missing, and
 * the leading/trailing whitespace check fires.
 *
 * Length:     12 (12 spaces, == PASSWORD_MIN_LENGTH)
 * Violations: uppercase, lowercase, digit, symbol, noWhitespace  (5 rules)
 */
export const INVALID_PASSWORD_WHITESPACE_ONLY: PasswordSample = {
    label: 'whitespace-only',
    value: '            ',
    valid: false,
    violations: ['uppercase', 'lowercase', 'digit', 'symbol', 'noWhitespace'],
};

/**
 * All invalid password samples — useful for iteration in parameterised
 * unit tests:
 *
 *   it.each(INVALID_PASSWORDS)('$label fails $violations', (sample) => {
 *     const result = evaluatePasswordRules(sample.value);
 *     expect(result.valid).toBe(false);
 *     expect(new Set(result.violations)).toEqual(new Set(sample.violations));
 *   });
 *
 * Order is deterministic for repeatable test runs.
 */
export const INVALID_PASSWORDS: readonly PasswordSample[] = [
    INVALID_PASSWORD_EMPTY,
    INVALID_PASSWORD_TOO_SHORT,
    INVALID_PASSWORD_TOO_LONG,
    INVALID_PASSWORD_NO_UPPERCASE,
    INVALID_PASSWORD_NO_LOWERCASE,
    INVALID_PASSWORD_NO_DIGIT,
    INVALID_PASSWORD_NO_SYMBOL,
    INVALID_PASSWORD_COMMON,
    INVALID_PASSWORD_COMMON_STRUCTURE,
    INVALID_PASSWORD_LEADING_WHITESPACE,
    INVALID_PASSWORD_TRAILING_WHITESPACE,
    INVALID_PASSWORD_WHITESPACE_ONLY,
] as const;

// =============================================================================
// PHASE 6 — EDGE-CASE / INTEGRATION SCENARIO SAMPLES
//
// These samples are NOT directly classified by `evaluatePasswordRules`;
// they exist to drive integration and component tests against MSW handlers.
// Every scenario sample is STRUCTURALLY VALID (no rule violations) — the
// "wrong" outcomes are triggered by the backend mock, not by the password
// validator.
// =============================================================================

/**
 * Password used by the TextInput show/hide toggle integration test.
 *
 * The integration spec types this value character-by-character into the
 * password input to verify that:
 *   1. Each typed character is masked when the toggle is OFF.
 *   2. After clicking the toggle ON, the full string is revealed.
 *   3. Clicking the toggle OFF re-masks the string.
 *
 * Length:     15
 * Structurally valid (no violations).
 */
export const PASSWORD_FOR_TOGGLE_TEST: PasswordSample = {
    label: 'password used by show/hide toggle integration test',
    value: 'ToggleP@ssw0rd!',
    valid: true,
    violations: [],
};

/**
 * Password used by the Link Accounts Modal confirm-password field — MATCHES
 * the standard user's password so the success path passes.
 *
 * Value duplicates VALID_PASSWORD_STANDARD.value by design. The integration
 * test asserts that submitting this value against the link-accounts endpoint
 * succeeds for STANDARD_USER.email.
 *
 * Length:     17
 * Structurally valid (no violations).
 */
export const PASSWORD_FOR_LINK_ACCOUNTS_MATCH: PasswordSample = {
    label: 'password matching standard user (for link-accounts success)',
    value: 'StandardP@ssw0rd!',
    valid: true,
    violations: [],
};

/**
 * Password used by the Link Accounts Modal confirm-password field — does
 * NOT match the standard user's password. Drives the invalid-credentials
 * error path so the modal renders its error message.
 *
 * The value itself is structurally valid; the failure is generated by the
 * MSW handler comparing it against the canonical user record.
 *
 * Length:     19
 * Structurally valid (no violations).
 */
export const PASSWORD_FOR_LINK_ACCOUNTS_WRONG: PasswordSample = {
    label: 'wrong password for link-accounts invalid-credentials test',
    value: 'WrongLinkP@ssw0rd!',
    valid: true,
    violations: [],
};

/**
 * Password typed by the user but intercepted by the "requires_sso" error
 * path. The password is structurally valid; the error is generated by the
 * MSW handler because the account is provisioned through Microsoft OAuth
 * and rejects password-based sign-in by policy.
 *
 * Value duplicates VALID_PASSWORD_FEDERATED.value by design (the user's
 * actual password). The integration test asserts that the UI reacts to
 * AUTH_ERROR_REQUIRES_SSO by surfacing the LinkAccountsModal flow.
 *
 * Length:     18
 * Structurally valid (no violations).
 */
export const PASSWORD_FOR_REQUIRES_SSO: PasswordSample = {
    label: 'password whose account requires_sso (intercepted by MSW)',
    value: 'FederatedP@ssw0rd!',
    valid: true,
    violations: [],
};

/**
 * Password typed by the user but intercepted by the "account_locked"
 * error path. The password is structurally valid; the error is generated
 * by the MSW handler after N failed attempts.
 *
 * The integration test asserts that the UI surfaces the SignUpError frame
 * with the "account locked" copy and disables the submit button.
 *
 * Length:     15
 * Structurally valid (no violations).
 */
export const PASSWORD_FOR_ACCOUNT_LOCKED: PasswordSample = {
    label: 'password whose account is locked (intercepted by MSW)',
    value: 'LockedP@ssw0rd!',
    valid: true,
    violations: [],
};

/**
 * Password used to drive rate-limited responses (HTTP 429).
 *
 * The MSW handler returns 429 with a Retry-After header. The integration
 * test asserts the UI displays the rate-limit message and disables the
 * submit button for the indicated duration.
 *
 * Length:     17
 * Structurally valid (no violations).
 */
export const PASSWORD_FOR_RATE_LIMITED: PasswordSample = {
    label: 'password whose request is rate-limited (intercepted by MSW)',
    value: 'RateLimitedP@ss1!',
    valid: true,
    violations: [],
};

// =============================================================================
// PHASE 7 — CONVENIENCE BUNDLE
//
// A single object aggregating every individual export for ergonomic
// single-import access:
//
//   import { passwords } from '@tests/fixtures/passwords';
//   passwords.valid.standard.value           // 'StandardP@ssw0rd!'
//   passwords.invalid.empty.violations       // ['minLength', ...]
//   passwords.scenarios.toggle.value         // 'ToggleP@ssw0rd!'
//   passwords.rules.minLength                // 12
//   passwords.rules.ids                      // readonly PasswordRuleId[]
//
// The `as const` assertion preserves literal types deeply so consumers
// see narrow literal types (e.g. `12`, `'StandardP@ssw0rd!'`) rather than
// widened `number`/`string` types.
// =============================================================================

/**
 * Convenience bundle exposing every password fixture under a single
 * namespaced object. Prefer this when a test needs more than two samples
 * from this file; prefer individual named exports otherwise.
 */
export const passwords = {
    valid: {
        standard: VALID_PASSWORD_STANDARD,
        federated: VALID_PASSWORD_FEDERATED,
        newUser: VALID_PASSWORD_NEW_USER,
        minLength: VALID_PASSWORD_MIN_LENGTH,
        maxLength: VALID_PASSWORD_MAX_LENGTH,
        passphrase: VALID_PASSWORD_PASSPHRASE,
        unicode: VALID_PASSWORD_UNICODE,
        all: VALID_PASSWORDS,
    },
    invalid: {
        empty: INVALID_PASSWORD_EMPTY,
        tooShort: INVALID_PASSWORD_TOO_SHORT,
        tooLong: INVALID_PASSWORD_TOO_LONG,
        noUppercase: INVALID_PASSWORD_NO_UPPERCASE,
        noLowercase: INVALID_PASSWORD_NO_LOWERCASE,
        noDigit: INVALID_PASSWORD_NO_DIGIT,
        noSymbol: INVALID_PASSWORD_NO_SYMBOL,
        common: INVALID_PASSWORD_COMMON,
        commonStructure: INVALID_PASSWORD_COMMON_STRUCTURE,
        leadingWhitespace: INVALID_PASSWORD_LEADING_WHITESPACE,
        trailingWhitespace: INVALID_PASSWORD_TRAILING_WHITESPACE,
        whitespaceOnly: INVALID_PASSWORD_WHITESPACE_ONLY,
        all: INVALID_PASSWORDS,
    },
    scenarios: {
        toggle: PASSWORD_FOR_TOGGLE_TEST,
        linkAccountsMatch: PASSWORD_FOR_LINK_ACCOUNTS_MATCH,
        linkAccountsWrong: PASSWORD_FOR_LINK_ACCOUNTS_WRONG,
        requiresSso: PASSWORD_FOR_REQUIRES_SSO,
        accountLocked: PASSWORD_FOR_ACCOUNT_LOCKED,
        rateLimited: PASSWORD_FOR_RATE_LIMITED,
    },
    rules: {
        ids: PASSWORD_RULE_IDS,
        minLength: PASSWORD_MIN_LENGTH,
        maxLength: PASSWORD_MAX_LENGTH,
        symbolChars: PASSWORD_SYMBOL_CHARS,
        commonDenyList: COMMON_PASSWORD_DENY_LIST,
    },
} as const;
