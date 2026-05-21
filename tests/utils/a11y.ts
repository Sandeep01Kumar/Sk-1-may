/**
 * Accessibility (axe-core) helpers for the SSO test suite.
 *
 * Provides the canonical accessibility scanning helper used by every
 * component-layer accessibility test under `tests/component`,
 * `tests/a11y`, and any in-spec axe scan elsewhere.
 *
 * Responsibilities:
 *   - Configure jest-axe with the WCAG 2.2 AA rule set (and predecessor
 *     WCAG versions).
 *   - Expose `expectNoA11yViolations(container)` which runs axe and
 *     throws (with rich diagnostic output) when violations are present.
 *   - Expose the pre-configured `axe` runner for tests that need to
 *     inspect the full `AxeResults` (passes, incomplete, inapplicable,
 *     violations).
 *   - Expose `runA11yScan(container, additionalOptions?)` as an escape
 *     hatch for tests that need per-call configuration overrides.
 *   - Expose `formatViolations(violations)` as a diagnostic aid for
 *     callers that want to log violations before failing.
 *
 * Authority:
 *   - AAP Section 0.5.1 (file row for `tests/utils/a11y.ts`).
 *   - AAP Section 0.2.2 (`disableOtherRules: false` keeps WCAG 2.2 AA
 *     coverage broad).
 *   - AAP Section 0.4.1 (strategy: jest-axe at the component layer).
 *   - AAP Section 0.6.1 (pins jest-axe@10.0.0 + axe-core@4.11.4 +
 *     vitest@4.1.6).
 *   - AAP Section 0.7.3 (zero-violation quality gate at WCAG 2.2 AA).
 *   - AAP Section 0.10.2 (no exceptions, including for color-contrast).
 *   - AAP Section 0.10.5 (honest limitation disclosure — SSO components
 *     do not exist yet; color-contrast may report `incomplete` under
 *     happy-dom; the canonical color-contrast gate lives in the E2E
 *     layer via `@axe-core/playwright`).
 *
 * Companion file: `tests/utils/jest-axe.d.ts` provides the ambient
 * TypeScript declarations for jest-axe (which ships no `.d.ts`).
 */

import { configureAxe, toHaveNoViolations, type JestAxeConfigureOptions } from 'jest-axe';
import { expect } from 'vitest';
import type { AxeResults, Result as AxeResult } from 'axe-core';

// =============================================================================
// Vitest matcher augmentation
// =============================================================================

/**
 * Augment Vitest's `Assertion` and `AsymmetricMatchersContaining`
 * interfaces with the `toHaveNoViolations()` matcher contributed by
 * jest-axe at run time via `expect.extend(toHaveNoViolations)` below.
 *
 * The augmentation MUST use `T = any` to match Vitest's own
 * `interface Assertion<T = any>` declaration in
 * `@vitest/expect/dist/index.d.ts` — TypeScript's TS2428 rule requires
 * identical type parameters across all merging declarations of an
 * interface. The eslint disable on the next line is therefore
 * non-negotiable; `any` is the only correct choice.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'vitest' {
    interface Assertion<T = any> {
        /**
         * Assert that an axe-core `AxeResults` object contains no
         * violations.
         *
         * Throws (with the violation IDs, descriptions, failing DOM
         * nodes, and remediation URLs) when one or more violations are
         * present. Suppression of individual rules requires documenting
         * the WCAG rationale alongside the test per AAP Section 0.10.2.
         *
         * Registered via `expect.extend(toHaveNoViolations)` at the
         * bottom of this module.
         */
        toHaveNoViolations(): T;
    }

    interface AsymmetricMatchersContaining {
        /**
         * Asymmetric variant of `toHaveNoViolations` for nested matcher
         * compositions such as
         * `expect(obj).toEqual({ scan: expect.toHaveNoViolations() })`.
         */
        toHaveNoViolations(): unknown;
    }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// =============================================================================
// Matcher registration
// =============================================================================

/**
 * Register the `toHaveNoViolations` matcher with Vitest's `expect`.
 *
 * This call is idempotent (calling `expect.extend` more than once is
 * safe per Vitest's documented behaviour). The same registration also
 * happens in `tests/setup/component.ts`; we duplicate it here so this
 * module is standalone — any spec that imports from
 * `@tests/utils/a11y` can use the matcher even if the global setup
 * file was not loaded (e.g., when invoked from a Node REPL or a
 * debugger session).
 */
expect.extend(toHaveNoViolations);

// =============================================================================
// WCAG 2.2 AA rule tags
// =============================================================================

/**
 * WCAG conformance tags applied to every axe scan.
 *
 * Per AAP Section 0.7.3 the suite gates on WCAG 2.2 AA. Because WCAG is
 * incrementally additive (WCAG 2.2 includes 2.1, which includes 2.0),
 * we include every predecessor `wcag*` tag so older-version rules are
 * also enforced. Skipping the predecessor tags would silently drop
 * coverage of rules that did not survive into the latest revision.
 *
 * The `best-practice` tag is intentionally OMITTED from this set
 * because it can flag issues that are NOT WCAG-mandated and would
 * therefore noise the zero-violation gate (AAP Section 0.7.3). Tests
 * that want to opt in to best-practice rules can call
 * `runA11yScan(container, { runOnly: { type: 'tag', values: ['best-practice'] } })`.
 */
export const WCAG_22_AA_RULES: readonly string[] = [
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
] as const;

// =============================================================================
// Axe configuration
// =============================================================================

/**
 * Axe configuration applied to every scan performed via the exported
 * `axe` runner and via `expectNoA11yViolations` / `runA11yScan`.
 *
 * Configuration anchors:
 *
 *   - `reporter: 'v2'` selects the modern axe `Result` shape (preferred
 *     over the legacy 'no-passes' reporter; the v1 reporter is
 *     deprecated and is not guaranteed to work with axe-core 4.11.x).
 *
 *   - `runOnly: { type: 'tag', values: [...WCAG_22_AA_RULES] }`
 *     restricts axe to the WCAG-tagged rules, eliminating the
 *     `experimental` and `best-practice` families which are not in the
 *     AAP-mandated gate (Sections 0.7.3 + 0.10.2).
 *
 *   - `rules: {}` declares NO rule overrides. This is non-negotiable
 *     per AAP Section 0.10.2: every WCAG 2.2 AA rule (including
 *     `color-contrast`) is left at its default enabled state. If a
 *     future change needs to suppress a rule, the WCAG rationale MUST
 *     be documented BEFORE any override is added here.
 *
 * `disableOtherRules` is left at its default value of `false` per AAP
 * Section 0.2.2 — we do NOT pass it explicitly because the default IS
 * the desired behaviour and invoking it explicitly with `true` would
 * silently weaken coverage.
 *
 * Caveats (AAP Section 0.10.5):
 *
 *   - jest-axe@10.0.0 internally disables every `cat.color` rule
 *     (including `color-contrast`) when running in a jsdom / happy-dom
 *     environment because those engines do not fully cascade CSS;
 *     reports would otherwise be `incomplete` rather than a clean
 *     pass. This means the component-layer scans CANNOT serve as the
 *     authoritative color-contrast gate — the E2E layer via
 *     `@axe-core/playwright` is that authority. The configuration here
 *     remains correct: we ask axe-core to evaluate every rule, and
 *     jest-axe's internal handling of color rules in headless DOM is
 *     an implementation detail of the test environment, not a
 *     suppression we are introducing.
 */
const AXE_CONFIG: JestAxeConfigureOptions = {
    reporter: 'v2',
    runOnly: {
        type: 'tag',
        values: [...WCAG_22_AA_RULES],
    },
    /*
     * Intentionally empty: NO rule overrides per AAP Section 0.10.2.
     * Do NOT add `color-contrast: { enabled: false }` or any other
     * rule disable here. Documenting WCAG rationale is required for
     * any future suppression and would need explicit AAP variance.
     */
    rules: {},
};

/**
 * Pre-configured axe runner. The canonical axe entry point for the
 * test suite — tests MUST NOT instantiate their own `configureAxe(...)`
 * call. Tests that need bespoke configuration should pass overrides
 * to `runA11yScan(container, overrides)` instead.
 *
 * The runner accepts an `Element` (or HTML string) and returns a
 * Promise resolving to the full `AxeResults` structure containing
 * `violations`, `passes`, `incomplete`, and `inapplicable` rule
 * results.
 *
 * @example
 *   import { axe } from '@tests/utils/a11y';
 *   const { container } = render(<MyComponent />);
 *   const results = await axe(container);
 *   // inspect results.violations, results.incomplete, ...
 */
export const axe: ReturnType<typeof configureAxe> = configureAxe(AXE_CONFIG);

// =============================================================================
// expectNoA11yViolations — primary helper
// =============================================================================

/**
 * Run axe against the given container and assert zero violations.
 *
 * This is the PRIMARY helper consumed by:
 *   - `tests/a11y/component.a11y.test.tsx` (cross-component axe scans)
 *   - `tests/component` test files (per-component in-spec scans)
 *   - Any other component or integration spec that wants a single-call
 *     accessibility gate.
 *
 * On failure, jest-axe's matcher produces an error message containing
 * the violation IDs, descriptions, the failing DOM nodes (rendered as
 * CSS selectors and HTML snippets), the per-node `failureSummary`, and
 * the remediation `helpUrl`. This is sufficient to debug without
 * additional logging — callers should NOT pre-format violations via
 * `formatViolations` before invoking this helper.
 *
 * Per AAP Section 0.10.2: zero violations is mandatory — no
 * exceptions, no `xit`/`it.skip` skipping, no `--allow-warnings`.
 * Suppression of rules requires documenting the WCAG rationale in the
 * spec file alongside the test (and is forbidden at the configuration
 * layer above).
 *
 * @param container - The HTMLElement to scan. Typically the `container`
 *                    returned by `const { container } = render(<Component />);`.
 *                    Must NOT be null — render results always have a
 *                    container.
 */
export async function expectNoA11yViolations(container: HTMLElement): Promise<void> {
    const results: AxeResults = await axe(container);
    expect(results).toHaveNoViolations();
}

// =============================================================================
// runA11yScan — diagnostic / overrides escape hatch
// =============================================================================

/**
 * Run axe against the given container and return the full `AxeResults`.
 *
 * Use this when a test needs to inspect specific rule outcomes
 * (passes, incomplete, inapplicable, violations) rather than just
 * gating on zero violations. The returned object is exactly what
 * jest-axe's `toHaveNoViolations` matcher consumes internally.
 *
 * When `additionalOptions` is omitted, the call delegates to the
 * canonical pre-configured `axe` runner. When `additionalOptions` is
 * provided, a one-off runner is created that merges the overrides onto
 * `AXE_CONFIG`:
 *
 *   - Top-level keys (`reporter`, `runOnly`, `resultTypes`, ...) are
 *     overridden by spread, so a caller can swap `runOnly.values` to
 *     opt in to other tags such as `best-practice`.
 *
 *   - `rules` is merged key-by-key so per-rule overrides accumulate on
 *     top of `AXE_CONFIG.rules` (currently empty). A caller can ENABLE
 *     a rule the WCAG-tag filter would otherwise have excluded; a
 *     caller MUST NOT disable a WCAG 2.2 AA rule per AAP Section
 *     0.10.2.
 *
 * Overrides weaken the canonical AAP-mandated configuration; use this
 * helper sparingly and document the rationale in the consuming spec.
 *
 * @param container          The HTMLElement to scan.
 * @param additionalOptions  Optional axe overrides merged onto
 *                           `AXE_CONFIG`. Omit (or pass `undefined`)
 *                           to use the canonical configuration.
 */
export async function runA11yScan(
    container: HTMLElement,
    additionalOptions?: JestAxeConfigureOptions,
): Promise<AxeResults> {
    if (additionalOptions === undefined) {
        return axe(container);
    }
    const merged: JestAxeConfigureOptions = {
        ...AXE_CONFIG,
        ...additionalOptions,
        rules: {
            ...(AXE_CONFIG.rules ?? {}),
            ...(additionalOptions.rules ?? {}),
        },
    };
    const oneOff = configureAxe(merged);
    return oneOff(container);
}

// =============================================================================
// formatViolations — diagnostic aid
// =============================================================================

/**
 * Format an array of axe `Result` violations into a human-readable
 * multiline string for debugging.
 *
 * This helper is NOT used by `expectNoA11yViolations` — jest-axe's
 * built-in matcher produces a superior error message. Callers may use
 * `formatViolations` from their own assertion code if they want to log
 * violations to the test output BEFORE failing, or to attach a
 * pre-rendered violations summary to a custom assertion error.
 *
 * Output format (per violation, separated by blank lines):
 *
 *   [<impact>] <ruleId>: <description>
 *     help: <short remediation summary>
 *     helpUrl: <full remediation URL>
 *       - <target1 > target2>: <failureSummary>
 *       - <target1 > target2>: <failureSummary>
 *
 * Returns the literal string `"No violations."` for empty input so
 * callers can safely log the result without conditional branching.
 *
 * @param violations  The `violations` array from an `AxeResults`
 *                    object (or any other array of axe `Result`
 *                    records — `passes`, `incomplete`, and
 *                    `inapplicable` share the same shape).
 */
export function formatViolations(violations: readonly AxeResult[]): string {
    if (violations.length === 0) {
        return 'No violations.';
    }
    return violations
        .map((v) => {
            const nodes = v.nodes
                .map((node) => {
                    const selector = node.target.join(' > ');
                    const summary = node.failureSummary ?? '(no summary)';
                    return `    - ${selector}: ${summary}`;
                })
                .join('\n');
            const impact = v.impact ?? 'unknown';
            return (
                `[${impact}] ${v.id}: ${v.description}\n` +
                `  help: ${v.help}\n` +
                `  helpUrl: ${v.helpUrl}\n` +
                `${nodes}`
            );
        })
        .join('\n\n');
}

// =============================================================================
// Module re-exports
// =============================================================================

/**
 * Re-export the jest-axe matcher so tests that import only from this
 * module can still call `expect(results).toHaveNoViolations()` after
 * extending `expect`.
 *
 * (Vitest's `expect` has already been extended at the top of this file;
 * the re-export is provided for ergonomic single-import access from
 * consuming specs.)
 */
export { toHaveNoViolations };

/**
 * Re-export the axe-core `Result` types for ergonomic consumer
 * imports. Consumers can write:
 *
 *   import type { AxeResults, AxeResult } from '@tests/utils/a11y';
 *
 * — which avoids a second `import type ... from 'axe-core'` line in
 * every spec.
 *
 * The `Result` interface is re-exported under the alias `AxeResult`
 * to disambiguate from generic "result" types in the rest of the
 * codebase.
 */
export type { AxeResults, AxeResult };
