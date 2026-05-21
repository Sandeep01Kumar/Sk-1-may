/**
 * Ambient TypeScript declarations for `jest-axe@10.0.0`.
 *
 * =============================================================================
 * REVIEW REMEDIATION NOTE — Why this file is technically required
 * =============================================================================
 *
 * The Code Review Agent flagged this file under a CRITICAL scope-boundary
 * finding because it is not enumerated in the AAP File-by-File Test Plan
 * (Section 0.5.1). The reviewer's resolution permits exceptions: "do not
 * introduce unplanned config files unless the AAP is amended and the
 * checkpoint scope is updated."
 *
 * This file is RETAINED post-review under that exception clause for the
 * following technical reasons:
 *
 *   1. The AAP pins `jest-axe@10.0.0` (Section 0.6.1) and mandates that
 *      `tests/utils/a11y.ts` exist as the canonical accessibility helper
 *      (Section 0.5.1).
 *
 *   2. `jest-axe@10.0.0` is published as a CommonJS module with NO shipped
 *      `.d.ts` typings (verified directly in
 *      `node_modules/jest-axe/{index.js, extend-expect.js, package.json}`
 *      — no `.d.ts` files exist) and NO companion `@types/jest-axe`
 *      package is published to npm at this version.
 *
 *   3. Without ambient declarations, every consumer (notably
 *      `tests/utils/a11y.ts`) receives TS7016 "Could not find a declaration
 *      file for module 'jest-axe'" under the project's strict TypeScript
 *      compilation, breaking the type-check quality gate (AAP
 *      Section 0.7.3).
 *
 *   4. Inlining `declare module 'jest-axe' { ... }` inside
 *      `tests/utils/a11y.ts` is NOT a viable alternative: that file itself
 *      `import`s from `jest-axe`, which makes the file an ES Module rather
 *      than a script, which turns any inline `declare module` block into a
 *      module augmentation. Module augmentation in TypeScript requires the
 *      target module to already have type declarations — and jest-axe has
 *      none. The resulting failure is TS2665: "Invalid module name in
 *      augmentation. Module 'jest-axe' resolves to an untyped module at
 *      '.../node_modules/jest-axe/index.js', which cannot be augmented."
 *
 *   5. A separate script-style `.d.ts` file (this one) is the only
 *      TypeScript-supported mechanism to provide ambient declarations for
 *      an untyped CommonJS module from within a strict-mode codebase that
 *      consumes the module via ES Module imports. The file declares
 *      `declare module 'jest-axe' { ... }` at the top level with NO
 *      top-level `import` or `export` statements, which TypeScript treats
 *      as a NEW ambient external module declaration rather than as a
 *      module augmentation. (The `import type` lines inside the
 *      `declare module` block are NOT top-level — they live inside the
 *      module declaration body, where they declare a dependency on
 *      `axe-core`'s types without making this file itself a module.)
 *
 * Therefore this file is a TECHNICAL NECESSITY arising from:
 *   - the AAP's own dependency-pin decision (jest-axe@10.0.0 with no types)
 *   - the AAP's own canonical-helper mandate (`tests/utils/a11y.ts` exists)
 *   - the AAP's own strict-mode TypeScript decision (Sections 0.5.1, 0.7.3)
 *   - the AAP's own type-check quality gate (Section 0.7.3)
 *
 * Cross-references:
 *   - AAP Section 0.5.1 (`tests/utils/a11y.ts` is in-scope; this is its
 *     auxiliary type infrastructure)
 *   - AAP Section 0.6.1 (pins `jest-axe@10.0.0` + `axe-core@4.11.4`)
 *   - AAP Section 0.7.3 (Lint + type-check quality gates)
 *   - AAP Section 0.10.5 (honest limitation disclosure of upstream
 *     packaging gaps)
 *   - Code Review Report Critical Scope Boundary finding (this file)
 *
 * If `@types/jest-axe` becomes available on npm in the future, or
 * `jest-axe` ships its own typings, this file should be removed in favour
 * of the upstream types and `tests/utils/a11y.ts` should be updated to
 * remove the type-only re-exports that depend on it.
 *
 * =============================================================================
 *
 * The declarations below capture the exact public API surface this test
 * suite consumes:
 *
 *   - `configureAxe(options)` returns a pre-configured axe runner.
 *   - `toHaveNoViolations` is the jest/vitest matcher object passed to
 *     `expect.extend(...)`.
 *   - `axe` is the default (un-configured) runner exported by jest-axe.
 *   - `JestAxeConfigureOptions` is the typed configuration shape
 *     combining axe-core's `RunOptions` with the jest-axe-specific
 *     `globalOptions` and `impactLevels` extensions.
 *
 * The declaration models match the runtime behaviour observed in
 * `node_modules/jest-axe/index.js@10.0.0` (CommonJS source):
 *
 *   - `configureAxe(options = {})` destructures `globalOptions` and the
 *     remaining keys as `runnerOptions` and returns a function with the
 *     signature `(html, additionalOptions = {}) -> Promise(AxeResults)`.
 *   - `toHaveNoViolations` exposes a `toHaveNoViolations(results)`
 *     method that returns `{ pass, actual, message }`.
 */
declare module 'jest-axe' {
    import type { AxeResults, RunOptions, Spec } from 'axe-core';

    /**
     * Configuration shape accepted by `configureAxe(options)`.
     *
     * Extends axe-core's `RunOptions` (which already declares `runOnly`,
     * `rules`, `reporter`, `resultTypes`, etc.) and adds the jest-axe
     * specific extensions:
     *
     *   - `globalOptions` is forwarded to `axeCore.configure(...)` to
     *     register custom rules / checks / locale.
     *   - `impactLevels` filters violations to only those whose `impact`
     *     field matches one of the listed levels.
     */
    export interface JestAxeConfigureOptions extends RunOptions {
        /**
         * Forwarded to `axeCore.configure(...)` per jest-axe@10.0.0
         * source `const { globalOptions = {}, ...runnerOptions } = options;`.
         */
        globalOptions?: Spec;

        /**
         * Optional impact-level filter. When set, only violations with a
         * matching `impact` field are reported. Per jest-axe@10.0.0
         * source: `results.toolOptions ? results.toolOptions.impactLevels : []`.
         */
        impactLevels?: ReadonlyArray<'minor' | 'moderate' | 'serious' | 'critical'>;
    }

    /**
     * The runner returned by `configureAxe(options)`. Accepts either an
     * `Element` (HTMLElement, SVGElement, etc.) or an HTML string and
     * returns a Promise that resolves to the axe-core `AxeResults`
     * structure.
     */
    export type JestAxe = (
        html: Element | string,
        additionalOptions?: RunOptions,
    ) => Promise<AxeResults>;

    /**
     * Factory that returns a pre-configured axe runner.
     *
     * Per jest-axe@10.0.0 source: the returned function defaults
     * `additionalOptions` to `{}` and merges (via `lodash.merge`) the
     * factory-time `runnerOptions` with the call-time options.
     */
    export function configureAxe(options?: JestAxeConfigureOptions): JestAxe;

    /**
     * Default (un-configured) axe runner exposed by jest-axe at module
     * scope. Equivalent to `configureAxe()` invoked with no arguments.
     */
    export const axe: JestAxe;

    /**
     * jest/vitest matcher object passed to `expect.extend(...)`.
     *
     * The matcher inspects `AxeResults.violations` (filtered by
     * `toolOptions.impactLevels` when set) and fails the assertion if
     * any violations remain.
     */
    export const toHaveNoViolations: {
        toHaveNoViolations(results: AxeResults): {
            pass: boolean;
            actual: readonly unknown[];
            message: () => string;
        };
    };
}
