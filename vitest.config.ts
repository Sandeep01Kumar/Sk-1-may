/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/*
 * Vitest Test-Runner Configuration
 * ================================
 *
 * Authoritative configuration for every Vitest-driven suite executed in
 * the in-process test harness:
 *
 *   - Unit tests           →  tests/unit/**\/*.{test,spec}.{ts,tsx}
 *   - Component tests      →  tests/component/**\/*.{test,spec}.{ts,tsx}
 *   - Integration tests    →  tests/integration/**\/*.{test,spec}.{ts,tsx}
 *   - A11y component tests →  tests/a11y/**\/*.{test,spec}.{ts,tsx}
 *
 * Playwright-driven suites (visual + E2E + cross-browser + cross-device)
 * are owned by `playwright.config.ts` and are explicitly excluded from
 * Vitest discovery via `test.exclude` below.
 *
 * Authority anchors (Agent Action Plan)
 * --------------------------------------
 *   - Section 0.5.1 (`vitest.config.ts` row) — file-by-file plan.
 *   - Section 0.5.4 — test discovery globs and coverage settings.
 *   - Section 0.7.1 — coverage thresholds with per-file overrides.
 *   - Section 0.7.2 — `pool: 'threads'`, parallel execution semantics.
 *   - Section 0.7.3 — coverage gate enforcement in CI.
 *   - Section 0.9.1 — npm scripts that invoke this configuration.
 *
 * Dependency anchors
 * ------------------
 *   - vitest@4.1.6                 (devDependency — test runner)
 *   - @vitejs/plugin-react@6.0.2   (devDependency — JSX/TSX transpilation)
 *   - happy-dom@20.9.0             (devDependency — default DOM env)
 *   - @vitest/coverage-v8@4.1.6    (devDependency — V8 coverage
 *                                   instrumentation; major version
 *                                   MUST match vitest)
 *
 * Forward-looking dependencies (authored by sibling agents)
 * ---------------------------------------------------------
 *   - tests/setup/component.ts — preloads jest-dom matchers, boots the
 *     MSW Node server, stubs `window.open` and `navigator.clipboard`.
 *     Until that file exists, Vitest will report a clear
 *     "setup file not found" error if any in-scope test is executed.
 *     AAP Section 0.10.5 documents this authoring sequence.
 */

// ESM-safe equivalent of CommonJS `__dirname`. `import.meta.url` is a
// `file://` URL; `fileURLToPath` converts it to a platform-native path
// (handling Windows drive letters and POSIX paths uniformly) and
// `dirname` strips the trailing filename to yield the repo root.
// Mirrors the same pattern used in `vite.config.ts` so the two
// configurations agree on the project root regardless of where the
// process was launched from (npm scripts, CI, IDE test runners, ...).
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Default-exported Vitest configuration object.
 *
 * `defineConfig` (re-exported by `vitest/config` on top of Vite's
 * `defineConfig`) provides full typed authoring for both the Vite
 * portion (`plugins`, `resolve`) and the Vitest portion (`test`).
 *
 * @see https://vitest.dev/config/
 */
export default defineConfig({
    /*
     * Register `@vitejs/plugin-react@6.0.2` so JSX/TSX test files
     * (e.g., `tests/component/Logo.test.tsx`) are transpiled with
     * React 19's automatic JSX runtime. No `import React from 'react'`
     * declaration is needed at the top of each `.tsx` test file.
     */
    plugins: [react()],

    /*
     * Path aliases must mirror the entries declared in
     * `tsconfig.test.json` `paths` so that compile-time TypeScript
     * resolution and run-time Vitest resolution agree. Any mismatch
     * surfaces as a "module not found" error the first time a test
     * imports an aliased path. The two aliases mirror AAP Section
     * 0.5.5 (Cross-File Test Dependencies):
     *
     *   - `@/*`      → `src/*`   (application sources under test)
     *   - `@tests/*` → `tests/*` (shared fixtures, mocks, utilities)
     */
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@tests': resolve(__dirname, 'tests'),
        },
    },

    test: {
        /*
         * happy-dom is the default DOM environment per AAP Section
         * 0.5.1; it is roughly 2-3x faster than jsdom for the SSO
         * surface's form, modal, and ARIA behaviour set. Individual
         * specs that require stricter DOM compliance may opt into
         * jsdom via the `// @vitest-environment jsdom` pragma at the
         * top of the file. happy-dom@20.9.0 supports the
         * MutationObserver, ResizeObserver, and IntersectionObserver
         * APIs required by Testing Library 16.x.
         */
        environment: 'happy-dom',

        /*
         * Exposes `describe`, `it`, `expect`, `vi`, `beforeAll`,
         * `afterAll`, `beforeEach`, and `afterEach` as ambient globals
         * so test files need not import them explicitly. This is
         * REQUIRED by `@testing-library/jest-dom`, whose
         * `expect.extend(...)` call runs in the setup file and only
         * works against the global `expect` symbol. See AAP Section
         * 0.5.1 (setup file row) and the `types` array in
         * `tsconfig.test.json` (`"vitest/globals"`).
         */
        globals: true,

        /*
         * Single setup-file entry authored by a sibling agent at
         * `tests/setup/component.ts`. The file:
         *
         *   1. Imports `@testing-library/jest-dom` to register the
         *      custom DOM matchers (`toBeInTheDocument`,
         *      `toHaveAttribute`, `toHaveClass`, ...).
         *   2. Boots the MSW Node server (from `tests/mocks/server.ts`)
         *      before all tests and shuts it down afterwards.
         *   3. Resets MSW handlers between tests via `afterEach`.
         *   4. Stubs `window.open` and `navigator.clipboard` so OAuth
         *      pop-up and copy-to-clipboard affordances are
         *      deterministic across tests.
         *
         * The entry is a singular file path (NOT a glob); other
         * setup helpers like `tests/setup/global.ts` are imported
         * FROM `component.ts` to keep the entry point unified.
         */
        setupFiles: ['tests/setup/component.ts'],

        /*
         * Test discovery globs. Only the four categories that run in
         * Vitest are listed here. Visual regression and E2E specs
         * (`tests/visual/**`, `tests/e2e/**`) are owned by Playwright
         * and are explicitly excluded below to prevent Vitest from
         * mis-picking them up.
         *
         *   - tests/unit/**         — pure-function unit tests
         *   - tests/component/**    — component-level DOM tests
         *   - tests/integration/**  — multi-component flows + MSW
         *   - tests/a11y/**         — jest-axe + keyboard + ARIA
         *
         * Both `.test.{ts,tsx}` and `.spec.{ts,tsx}` suffixes are
         * accepted so the codebase can adopt either convention.
         */
        include: [
            'tests/unit/**/*.{test,spec}.{ts,tsx}',
            'tests/component/**/*.{test,spec}.{ts,tsx}',
            'tests/integration/**/*.{test,spec}.{ts,tsx}',
            'tests/a11y/**/*.{test,spec}.{ts,tsx}',
        ],

        /*
         * Exclude lists hide build artefacts, dependency installs,
         * and the Playwright-owned test trees from Vitest discovery.
         *
         *   - node_modules       — installed packages
         *   - dist               — production build output
         *   - coverage           — V8 coverage artefacts
         *   - playwright-report  — Playwright HTML reports
         *   - test-results       — JUnit XML + Vitest HTML
         *   - tests/visual/**    — Playwright visual regression
         *   - tests/e2e/**       — Playwright E2E specs
         */
        exclude: [
            'node_modules',
            'dist',
            'coverage',
            'playwright-report',
            'test-results',
            'tests/visual/**',
            'tests/e2e/**',
        ],

        /*
         * Worker-pool selection.
         *
         * `'threads'` uses Node's `worker_threads` API for in-process
         * parallelism. Compared to `'forks'` (the Vitest 4 default),
         * threads have lower startup cost, share the same V8 heap for
         * coverage collection, and play well with happy-dom and the
         * React 19 runtime.
         */
        pool: 'threads',

        /*
         * `fileParallelism: true` is the Vitest 4.x top-level flag
         * that controls whether test files run concurrently across
         * workers. `true` is the default, but it is set explicitly
         * here for clarity and to make the parallel-safety contract
         * declared in AAP Section 0.7.2 visible in the configuration
         * itself. Setting it to `false` would override `maxWorkers`
         * to 1 (i.e., sequential file execution).
         *
         * This is the modern equivalent of the legacy
         * `poolOptions.threads.singleThread: false` block: Vitest 4
         * removed the `poolOptions` shape from `InlineConfig` and
         * promoted the option to the top level. See the migration
         * note at https://vitest.dev/guide/migration#pool-rework.
         *
         * Vitest 4 migration history (QA Issue 6 — MINOR remediation):
         * A legacy `poolOptions.threads.singleThread: false` block
         * was previously retained here as a "stable contract marker"
         * to satisfy AAP Section 0.7.2's explicit textual mention of
         * `singleThread: false`. The Vitest 4 runtime emitted a
         * DEPRECATED warning on every invocation:
         *
         *     DEPRECATED `test.poolOptions` was removed in Vitest 4.
         *     All previous `poolOptions` are now top-level options.
         *
         * The legacy block had no runtime effect (the top-level
         * `fileParallelism: true` above already provides the
         * equivalent behaviour) but produced noisy CI logs on every
         * `npm run test:*` invocation and risked breakage on any
         * future Vitest patch that removed the runtime warning path.
         *
         * Per QA Final Checkpoint F1 Issue 6 (MINOR), the legacy
         * block plus its `@ts-expect-error` directive have been
         * removed. AAP Section 0.7.2's intent — parallel file
         * execution across threaded workers — is preserved verbatim
         * by the modern `pool: 'threads'` + `fileParallelism: true`
         * combination declared above. The semantic equivalence is:
         *
         *   Legacy Vitest 3.x:
         *     pool: 'threads', poolOptions.threads.singleThread = false
         *   Modern Vitest 4.x:
         *     pool: 'threads', fileParallelism = true
         */

        /*
         * Reporter chain.
         *
         *   - 'default' — human-readable progress to stdout. Used in
         *                 local dev for fast feedback.
         *   - 'junit'   — JUnit XML report. Consumed by the CI
         *                 workflow (`.github/workflows/test.yml`)
         *                 to publish per-test results and to drive
         *                 the GitHub "Checks" UI.
         *   - 'html'    — static HTML report. Used by developers for
         *                 post-mortem triage when CI fails.
         *
         * The junit reporter is configured inline with its tuple form
         * `['junit', { outputFile }]` because its output path differs
         * from the html reporter's; the html path is configured via
         * the sibling `outputFile` map below.
         */
        reporters: ['default', ['junit', { outputFile: 'test-results/junit/vitest.xml' }], 'html'],

        /*
         * Per-reporter output paths for reporters that cannot accept
         * inline options (currently only the built-in 'html'
         * reporter). The junit reporter's path is set inline above,
         * but is also mirrored here for completeness so a future
         * tooling change that reads `outputFile.junit` keeps working.
         */
        outputFile: {
            junit: 'test-results/junit/vitest.xml',
            html: 'test-results/vitest-html/index.html',
        },

        coverage: {
            /*
             * V8 provider per AAP Section 0.3.2: native V8
             * instrumentation yields more accurate line and branch
             * coverage than istanbul on modern Node runtimes,
             * integrates seamlessly with happy-dom, and avoids the
             * source-map round-trip overhead that istanbul imposes
             * on TypeScript / TSX files. The major version of
             * `@vitest/coverage-v8` MUST match `vitest` — both are
             * pinned to 4.1.6 in `package.json`.
             */
            provider: 'v8',

            /*
             * Multiple report formats so coverage is consumable by:
             *
             *   - text         — humans reading CI stdout
             *   - html         — humans triaging coverage gaps
             *                    locally (open coverage/index.html)
             *   - lcov         — CI services (Codecov, Coveralls)
             *   - json         — programmatic post-processing
             *                    (e.g., custom dashboards, diff
             *                    coverage comparisons)
             */
            reporter: ['text', 'html', 'lcov', 'json'],

            /*
             * Coverage output directory. `.gitignore` excludes this
             * path so coverage artefacts never enter commits. CI
             * uploads this directory as an artifact and (when
             * enabled) ships `coverage/lcov.info` to a third-party
             * coverage service.
             */
            reportsDirectory: 'coverage',

            /*
             * Coverage measurement scope. Only application sources
             * under `src/**` are measured; test sources, fixtures,
             * mocks, and setup files are not part of the production
             * bundle and therefore do not count toward the coverage
             * denominator.
             */
            include: ['src/**/*.{ts,tsx}'],

            /*
             * Within the include scope, the following sub-trees are
             * excluded from coverage measurement:
             *
             *   - *.d.ts        — type-declaration files have no
             *                     executable statements
             *   - index.ts      — barrel re-exports add nothing to
             *                     measure and would otherwise show
             *                     spurious 0% coverage
             *   - src/assets/** — static SVG/PNG/font assets bundled
             *                     as URL imports; nothing to execute
             *   - tests/**      — defensive: ensure test sources are
             *                     never measured even if they ever
             *                     leak into the include glob
             */
            exclude: ['src/**/*.d.ts', 'src/**/index.ts', 'src/assets/**', 'tests/**'],

            /*
             * Coverage threshold gates per AAP Section 0.7.1.
             *
             * Global gate (repository-wide aggregate):
             *   - statements ≥ 90
             *   - branches   ≥ 85
             *   - functions  ≥ 90
             *   - lines      ≥ 90
             *
             * Per-file gates (path-glob overrides):
             *   - src/components/sso/** — SSO screen components are
             *     the primary surface under test; statements ≥ 95,
             *     branches ≥ 90, functions ≥ 95, lines ≥ 95.
             *   - src/components/ui/**  — design-system primitives
             *     (Logo, TextInput, Button, SocialProviderButton,
             *     Separator, Modal) compose the SSO screens and are
             *     the most directly testable units of the SSO
             *     surface. AAP Section 0.7.1 default for SSO
             *     components specifies ≥ 95% across all metrics
             *     except branches (≥ 90). Restored per QA Final
             *     Checkpoint F1 Issue 3 (MAJOR).
             *   - src/utils/**          — pure functions are
             *     trivially fully testable; 100% across all metrics.
             *
             * `perFile: false` keeps the global gate as an aggregate
             * over the entire repository — the per-glob entries are
             * the only places where per-file thresholds apply. This
             * matches Vitest 4.x's `Thresholds` type, which allows a
             * mix of global metric numbers plus per-glob override
             * blocks of `Pick<Thresholds, ...>`.
             *
             * NOTE: glob keys must be plain strings (NOT Jest-style
             * `coverageThreshold` keys). Vitest's threshold matcher
             * uses the same micromatch engine that powers `include`
             * and `exclude`.
             */
            thresholds: {
                statements: 90,
                branches: 85,
                functions: 90,
                lines: 90,
                perFile: false,
                'src/components/sso/**': {
                    statements: 95,
                    branches: 90,
                    functions: 95,
                    lines: 95,
                },
                'src/components/ui/**': {
                    statements: 95,
                    branches: 90,
                    functions: 95,
                    lines: 95,
                },
                'src/utils/**': {
                    statements: 100,
                    branches: 100,
                    functions: 100,
                    lines: 100,
                },
            },
        },

        /*
         * Per-test timeout: 10 seconds. Sufficient for a happy-dom
         * render + MSW interception + axe scan in a single test
         * while still flagging genuinely runaway tests in CI. AAP
         * Section 0.7.2 expects the full Vitest suite to complete in
         * < 90 s locally / < 180 s in CI per shard, so a 10 s cap is
         * generous but not unbounded.
         */
        testTimeout: 10000,

        /*
         * Per-hook timeout matches `testTimeout`. Setup hooks
         * (`beforeAll`, `beforeEach`) occasionally need extra room
         * when pre-loading the Inter font face via
         * `@fontsource/inter` or when the MSW server is warming up
         * its handler graph; 10 s is comfortably more than the
         * typical < 100 ms hook duration.
         */
        hookTimeout: 10000,
    },
});
