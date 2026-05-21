/**
 * Ambient TypeScript declarations for `jest-axe@10.0.0`.
 *
 * `jest-axe` is published as a CommonJS module with no shipped `.d.ts`
 * declarations and no companion `@types/jest-axe` package on the npm
 * registry at the AAP-locked version (10.0.0). Without these ambient
 * declarations, every consumer (notably `tests/utils/a11y.ts`) would
 * receive TS7016 "Could not find a declaration file for module 'jest-axe'".
 *
 * This file is intentionally written as a SCRIPT (no top-level
 * `import` or `export`) so the `declare module 'jest-axe' { ... }`
 * block below is treated by TypeScript as a NEW ambient external
 * module declaration rather than as a module augmentation. Module
 * augmentations can only target modules that already have type
 * declarations; jest-axe has none, so the script-style form is
 * required.
 *
 * The declarations below capture the exact public API surface this
 * test suite consumes:
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
 *
 * Authority:
 *   - AAP Section 0.6.1 pins `jest-axe@10.0.0` + `axe-core@4.11.4`.
 *   - AAP Section 0.10.5 documents the peer-dep risk between
 *     jest-axe-vendored axe-core@4.10.x and root axe-core@4.11.x; these
 *     declarations defensively model only the stable subset of the API
 *     that both versions share so type-safety is preserved regardless
 *     of which axe-core variant the runtime resolves.
 *   - AAP Section 0.8.1 declares the `tests/utils` directory in scope;
 *     this file is auxiliary type infrastructure required to make
 *     `tests/utils/a11y.ts` compile under strict TypeScript.
 *
 * Companion file: `tests/utils/a11y.ts` is the sole consumer of these
 * declarations. If `@types/jest-axe` becomes available on npm in the
 * future, or jest-axe ships its own typings, this file should be
 * removed in favour of the upstream types.
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
