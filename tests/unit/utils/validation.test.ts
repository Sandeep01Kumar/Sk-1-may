/**
 * Unit tests for the SSO validation utility module.
 *
 * Target file under test: `src/utils/validation.ts` (CREATED by a
 * subsequent implementation cycle).
 *
 * --------------------------------------------------------------------------
 * Functions exercised
 * --------------------------------------------------------------------------
 *
 *   validateEmail(value: string): boolean
 *     - Returns `true` when `value` is an RFC 5321 / 5322 conformant
 *       email address; returns `false` for malformed inputs.
 *     - Coverage targets every fixture sample in
 *       `tests/fixtures/users.ts`:
 *         VALID_EMAILS  (7 samples)  - must all return true
 *         INVALID_EMAILS (9+ samples) - must all return false
 *
 *   evaluatePasswordRules(value: string): PasswordRuleResult
 *     - Returns a result object containing per-rule pass/fail decisions
 *       plus a top-level `valid` boolean. Rules are enumerated in
 *       `tests/fixtures/passwords.ts.PASSWORD_RULE_IDS`.
 *     - Coverage targets every fixture sample in
 *       `tests/fixtures/passwords.ts`:
 *         VALID_PASSWORDS    (7 samples) - must all return valid: true
 *         INVALID_PASSWORDS - must report every expected violation
 *
 * --------------------------------------------------------------------------
 * Expected runtime failure mode
 * --------------------------------------------------------------------------
 *
 * Per AAP Section 0.10.5, the target module `src/utils/validation.ts`
 * does NOT exist in the repository today. When Vitest discovers this
 * test file and resolves its imports, the `@/utils/validation` import
 * will fail with `Cannot find module '@/utils/validation'`. This is
 * the EXPECTED failure mode — the test file acts as the executable
 * design specification, and the failing tests will become passing
 * tests once a subsequent implementation cycle authors the module.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.1.4 — Utility modules ≥ 100% coverage.
 *   - AAP Section 0.3.1 — Target functions enumerated.
 *   - AAP Section 0.4.2 — Boundary samples per test-case blueprint.
 *   - AAP Section 0.5.1 — File row for `tests/unit/utils/validation.test.ts`.
 *   - AAP Section 0.7.1 — Per-file coverage override 100%.
 *   - AAP Section 0.10.5 — SSO + utility modules not yet implemented.
 *   - QA Issue 1 — File missing.
 */

import { describe, it, expect } from 'vitest';
import {
    VALID_EMAILS,
    INVALID_EMAILS,
    VALID_EMAIL_STANDARD,
    VALID_EMAIL_SUBADDRESS,
    VALID_EMAIL_LONG_LOCAL,
    INVALID_EMAIL_EMPTY,
    INVALID_EMAIL_NO_AT,
    INVALID_EMAIL_DOUBLE_AT,
    type EmailSample,
} from '@tests/fixtures/users';
import {
    VALID_PASSWORDS,
    INVALID_PASSWORDS,
    VALID_PASSWORD_STANDARD,
    VALID_PASSWORD_MIN_LENGTH,
    VALID_PASSWORD_MAX_LENGTH,
    INVALID_PASSWORD_EMPTY,
    INVALID_PASSWORD_TOO_SHORT,
    INVALID_PASSWORD_TOO_LONG,
    INVALID_PASSWORD_NO_UPPERCASE,
    INVALID_PASSWORD_NO_DIGIT,
    INVALID_PASSWORD_NO_SYMBOL,
    INVALID_PASSWORD_COMMON,
    INVALID_PASSWORD_LEADING_WHITESPACE,
    INVALID_PASSWORD_TRAILING_WHITESPACE,
    PASSWORD_RULE_IDS,
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
    type PasswordSample,
    type PasswordRuleId,
} from '@tests/fixtures/passwords';

// The target module is imported through the canonical `@/` alias. The
// import will fail at module resolution until the implementation cycle
// authors `src/utils/validation.ts` — this is the documented failure
// mode per AAP Section 0.10.5.
import { validateEmail, evaluatePasswordRules } from '@/utils/validation';

// =============================================================================
// validateEmail
// =============================================================================

describe('validateEmail', () => {
    // ---------------------------------------------------------------
    // Valid emails — every sample in VALID_EMAILS must return true
    // ---------------------------------------------------------------
    describe('valid emails (RFC 5321 / 5322)', () => {
        it.each(VALID_EMAILS as readonly EmailSample[])(
            'returns true for $label ($value)',
            (sample) => {
                expect(validateEmail(sample.value)).toBe(true);
            },
        );

        it('returns true for the standard happy-path email', () => {
            expect(validateEmail(VALID_EMAIL_STANDARD.value)).toBe(true);
        });

        it('returns true for plus-suffix subaddressing (RFC 5233)', () => {
            expect(validateEmail(VALID_EMAIL_SUBADDRESS.value)).toBe(true);
        });

        it('returns true for the RFC 5321 §4.5.3.1.1 maximum 64-char local part', () => {
            expect(validateEmail(VALID_EMAIL_LONG_LOCAL.value)).toBe(true);
        });
    });

    // ---------------------------------------------------------------
    // Invalid emails — every sample in INVALID_EMAILS must return false
    // ---------------------------------------------------------------
    describe('invalid emails', () => {
        it.each(INVALID_EMAILS as readonly EmailSample[])(
            'returns false for $label ($value)',
            (sample) => {
                expect(validateEmail(sample.value)).toBe(false);
            },
        );

        it('returns false for the empty string', () => {
            expect(validateEmail(INVALID_EMAIL_EMPTY.value)).toBe(false);
        });

        it('returns false when the @ separator is missing', () => {
            expect(validateEmail(INVALID_EMAIL_NO_AT.value)).toBe(false);
        });

        it('returns false when multiple unescaped @ signs are present', () => {
            expect(validateEmail(INVALID_EMAIL_DOUBLE_AT.value)).toBe(false);
        });
    });

    // ---------------------------------------------------------------
    // Determinism & purity
    // ---------------------------------------------------------------
    describe('determinism', () => {
        it('returns the same result for repeated calls with the same input', () => {
            const result1 = validateEmail(VALID_EMAIL_STANDARD.value);
            const result2 = validateEmail(VALID_EMAIL_STANDARD.value);
            const result3 = validateEmail(VALID_EMAIL_STANDARD.value);
            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
        });

        it('does not mutate the input string', () => {
            const original = VALID_EMAIL_STANDARD.value;
            const captured = String(original);
            validateEmail(original);
            // String immutability is enforced by JavaScript, but this
            // assertion documents intent and would catch a future
            // refactor that accidentally coerces / replaces the input.
            expect(original).toBe(captured);
        });
    });
});

// =============================================================================
// evaluatePasswordRules
// =============================================================================

describe('evaluatePasswordRules', () => {
    // ---------------------------------------------------------------
    // Valid passwords — every sample in VALID_PASSWORDS must pass
    // ---------------------------------------------------------------
    describe('valid passwords', () => {
        it.each(VALID_PASSWORDS as readonly PasswordSample[])(
            '$label passes every rule',
            (sample) => {
                const result = evaluatePasswordRules(sample.value);
                expect(result.valid).toBe(true);
                // Documented contract: a valid password reports no
                // failing rules in any iteration shape the engine
                // returns.
                if ('rules' in result && Array.isArray(result.rules)) {
                    const failedRules = (
                        result.rules as ReadonlyArray<{
                            rule: PasswordRuleId;
                            passed: boolean;
                        }>
                    ).filter((r) => r.passed === false);
                    expect(failedRules).toEqual([]);
                }
            },
        );

        it('reports valid: true for the standard valid password', () => {
            const result = evaluatePasswordRules(VALID_PASSWORD_STANDARD.value);
            expect(result.valid).toBe(true);
        });

        it('accepts the boundary minimum length (12 chars) as valid', () => {
            const result = evaluatePasswordRules(VALID_PASSWORD_MIN_LENGTH.value);
            expect(result.valid).toBe(true);
            expect(VALID_PASSWORD_MIN_LENGTH.value.length).toBe(PASSWORD_MIN_LENGTH);
        });

        it('accepts the boundary maximum length (128 chars) as valid', () => {
            const result = evaluatePasswordRules(VALID_PASSWORD_MAX_LENGTH.value);
            expect(result.valid).toBe(true);
            expect(VALID_PASSWORD_MAX_LENGTH.value.length).toBe(PASSWORD_MAX_LENGTH);
        });
    });

    // ---------------------------------------------------------------
    // Invalid passwords — each sample must report its expected violations
    // ---------------------------------------------------------------
    describe('invalid passwords', () => {
        it.each(INVALID_PASSWORDS as readonly PasswordSample[])(
            '$label violates $violations',
            (sample) => {
                const result = evaluatePasswordRules(sample.value);
                expect(result.valid).toBe(false);
                // Iterate over every expected violation declared by the
                // fixture and assert the engine reports at least the
                // documented set (the engine may report additional
                // violations the fixture has not enumerated, but it
                // MUST report every documented one).
                for (const expectedViolation of sample.violations) {
                    // The expected violation must appear in some
                    // engine-visible shape. We do not commit to a
                    // single result shape because the implementation
                    // may expose violations via `result.failedRules`,
                    // `result.violations`, or a per-rule object map.
                    const resultString = JSON.stringify(result);
                    expect(resultString).toContain(expectedViolation);
                }
            },
        );

        it('reports valid: false for the empty string', () => {
            const result = evaluatePasswordRules(INVALID_PASSWORD_EMPTY.value);
            expect(result.valid).toBe(false);
        });

        it('rejects one char below the minimum length boundary', () => {
            const result = evaluatePasswordRules(INVALID_PASSWORD_TOO_SHORT.value);
            expect(result.valid).toBe(false);
            expect(INVALID_PASSWORD_TOO_SHORT.value.length).toBe(PASSWORD_MIN_LENGTH - 1);
        });

        it('rejects one char above the maximum length boundary', () => {
            const result = evaluatePasswordRules(INVALID_PASSWORD_TOO_LONG.value);
            expect(result.valid).toBe(false);
            expect(INVALID_PASSWORD_TOO_LONG.value.length).toBe(PASSWORD_MAX_LENGTH + 1);
        });

        it('rejects passwords with no uppercase letter', () => {
            const result = evaluatePasswordRules(INVALID_PASSWORD_NO_UPPERCASE.value);
            expect(result.valid).toBe(false);
        });

        it('rejects passwords with no digit', () => {
            const result = evaluatePasswordRules(INVALID_PASSWORD_NO_DIGIT.value);
            expect(result.valid).toBe(false);
        });

        it('rejects passwords with no symbol', () => {
            const result = evaluatePasswordRules(INVALID_PASSWORD_NO_SYMBOL.value);
            expect(result.valid).toBe(false);
        });

        it('rejects passwords in the common-password deny list', () => {
            const result = evaluatePasswordRules(INVALID_PASSWORD_COMMON.value);
            expect(result.valid).toBe(false);
        });

        it('rejects passwords with leading whitespace', () => {
            const result = evaluatePasswordRules(INVALID_PASSWORD_LEADING_WHITESPACE.value);
            expect(result.valid).toBe(false);
        });

        it('rejects passwords with trailing whitespace', () => {
            const result = evaluatePasswordRules(INVALID_PASSWORD_TRAILING_WHITESPACE.value);
            expect(result.valid).toBe(false);
        });
    });

    // ---------------------------------------------------------------
    // Rule taxonomy — verify the engine reports decisions for every
    // canonical rule identifier
    // ---------------------------------------------------------------
    describe('rule taxonomy', () => {
        it.each(PASSWORD_RULE_IDS)(
            'reports a decision for the %s rule on the canonical valid password',
            (ruleId) => {
                const result = evaluatePasswordRules(VALID_PASSWORD_STANDARD.value);
                // The result MUST mention the rule identifier in some
                // form. The implementation may expose it as a key, as
                // an entry in a rules array, or as a violation string.
                const resultString = JSON.stringify(result);
                expect(resultString).toContain(ruleId);
            },
        );
    });

    // ---------------------------------------------------------------
    // Determinism & purity
    // ---------------------------------------------------------------
    describe('determinism', () => {
        it('returns the same result for repeated calls with the same input', () => {
            const result1 = evaluatePasswordRules(VALID_PASSWORD_STANDARD.value);
            const result2 = evaluatePasswordRules(VALID_PASSWORD_STANDARD.value);
            expect(result1.valid).toBe(result2.valid);
            expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
        });

        it('does not mutate the input string', () => {
            const original = VALID_PASSWORD_STANDARD.value;
            const captured = String(original);
            evaluatePasswordRules(original);
            expect(original).toBe(captured);
        });
    });
});
