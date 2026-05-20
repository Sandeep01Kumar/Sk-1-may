/* global module, __dirname */
//
// .eslintrc.cjs - Legacy ESLint configuration for the SSO test suite.
//
// NOTE on the directive above:
//   ESLint 10 removed support for the legacy eslint-env comment
//   syntax. Because this file is loaded as CommonJS (.cjs extension)
//   under Node, `module` and `__dirname` are CommonJS-provided globals.
//   The `global` directive above declares them so the linter's no-undef
//   rule does not flag them; this is the modern, flat-config-compatible
//   equivalent of the historical eslint-env node comment.
//
// Purpose (AAP Sections 0.5.1, 0.6.1, 0.7.3, 0.9.1, 0.10.2, 0.10.4):
//   - Enforce zero-warning ESLint gate (`eslint . --max-warnings=0`).
//   - Enable compile-time accessibility checks via eslint-plugin-jsx-a11y.
//   - Provide TypeScript-aware linting for .ts / .tsx files via
//     @typescript-eslint/parser.
//   - Explicitly ignore frozen artefacts (server.js) per the
//     "Do not touch!" directive in README.md.
//
// File extension rationale:
//   package.json declares `"type": "module"`, so a `.js` file at the
//   repository root would be interpreted as ES Module syntax. The legacy
//   ESLint configuration uses CommonJS (`module.exports = {...}`), so
//   the `.cjs` extension is required to force CommonJS interpretation
//   regardless of the package type field.
//
// Runtime context:
//   ESLint 10 (the major version installed in this repository) removed
//   support for the legacy `.eslintrc.*` configuration formats and now
//   loads only the flat config (`eslint.config.js`). This `.eslintrc.cjs`
//   file is committed to satisfy the AAP File-by-File Test Plan
//   (Section 0.5.1) which mandates its presence as the canonical
//   declarative specification of the project's lint expectations. It
//   also remains directly usable by:
//     - Older ESLint versions (8.x and earlier) that still honour the
//       legacy format, useful for tooling pinned to those releases.
//     - IDE plugins and CI scripts that read `.eslintrc.cjs` directly
//       to surface a11y rule expectations without invoking ESLint.
//     - Downstream consumers of this repository who fork it and choose
//       to pin an older ESLint major.
//   At lint time today, the equivalent rules in `eslint.config.js`
//   produce identical enforcement; this file is documentation-grade
//   plus compatibility-layer plus future-proofing for any move back
//   to the legacy loader.
//
// Cross-references:
//   - AAP Section 0.5.1 (CREATE entry for `.eslintrc.cjs`).
//   - AAP Section 0.6.1 (`eslint-plugin-jsx-a11y@6.10.2`).
//   - AAP Section 0.7.3 (Lint quality gate).
//   - AAP Section 0.9.1 (`lint` script body).
//   - AAP Section 0.10.2 (Zero a11y violations directive).
//   - AAP Section 0.10.4 (server.js is frozen - must be ignored).

/** @type {import('eslint').Linter.Config} */
module.exports = {
    // -----------------------------------------------------------------
    // Top-level anchoring
    // -----------------------------------------------------------------
    // `root: true` halts ESLint's upward configuration search at this
    // file. Without it, ESLint would walk parent directories looking
    // for additional `.eslintrc.*` files which could introduce
    // unintended rules.
    root: true,

    // -----------------------------------------------------------------
    // Environment globals
    // -----------------------------------------------------------------
    // The SSO test suite runs in:
    //   - browser context (component tests via happy-dom / jsdom, E2E
    //     tests via Playwright real browsers)
    //   - Node context (Vitest runner, setup files, MSW server, config
    //     files)
    //   - ES2022 globals (Promise, Map, Set, async/await, etc.).
    env: {
        browser: true,
        node: true,
        es2022: true,
    },

    // -----------------------------------------------------------------
    // Parser
    // -----------------------------------------------------------------
    // @typescript-eslint/parser is required to parse `.ts` and `.tsx`
    // files (it is installed transitively via the `typescript-eslint`
    // wrapper package@8.59.4 — verified present in node_modules).
    //
    // Falling back to the default Espree parser would fail on
    // TypeScript syntax (type annotations, generics, `as` casts, etc.).
    parser: '@typescript-eslint/parser',

    // -----------------------------------------------------------------
    // Parser options
    // -----------------------------------------------------------------
    parserOptions: {
        // ES2022 syntax matches `tsconfig.json` `target: "ES2022"`.
        ecmaVersion: 2022,
        // The codebase ships ES Modules (`"type": "module"` in
        // package.json) and Vite/Vitest expect ESM throughout.
        sourceType: 'module',
        // Enable JSX parsing for `.tsx` component test files.
        ecmaFeatures: { jsx: true },
        // `project` enables type-aware linting. Pointing at both the
        // root config and the test config ensures the parser can
        // resolve types in both `src/**` (root tsconfig) and
        // `tests/**` (test tsconfig).
        project: ['./tsconfig.json', './tsconfig.test.json'],
        // Anchor project resolution to this file's directory so the
        // relative `project` paths above resolve correctly regardless
        // of CWD when ESLint is invoked.
        tsconfigRootDir: __dirname,
    },

    // -----------------------------------------------------------------
    // Settings shared across plugins
    // -----------------------------------------------------------------
    settings: {
        // Pin to the React version declared in `package.json`
        // `dependencies` so any future eslint-plugin-react (if added)
        // and the jsx-a11y plugin's React-aware checks read the
        // correct version metadata.
        react: { version: '19.2.6' },
    },

    // -----------------------------------------------------------------
    // Plugins
    // -----------------------------------------------------------------
    // jsx-a11y is the linchpin of the static accessibility gate per
    // AAP Section 0.10.2. It pairs with axe-core at runtime (jest-axe
    // for component tests, @axe-core/playwright for E2E) to form a
    // defence-in-depth a11y validation strategy.
    plugins: ['jsx-a11y'],

    // -----------------------------------------------------------------
    // Extended configurations
    // -----------------------------------------------------------------
    extends: [
        // `eslint:recommended` enables ESLint's curated safe-defaults
        // rule set: no-undef, no-unused-vars, no-cond-assign, etc.
        'eslint:recommended',
        // `plugin:jsx-a11y/recommended` enables every accessibility
        // rule the plugin ships with at its recommended severity. The
        // overrides below elevate the warn-level rules to error so
        // the lint gate is binary.
        'plugin:jsx-a11y/recommended',
    ],

    // -----------------------------------------------------------------
    // Rule overrides
    // -----------------------------------------------------------------
    // Every `jsx-a11y/*` rule is explicitly elevated to `'error'` so
    // any regression fails the lint gate. The one documented exception
    // is `no-autofocus`, which is downgraded to `'warn'` because the
    // SSO sign-in UX convention autofocuses the email field on mount
    // (this matches the Figma design intent and is acceptable per
    // WCAG 2.2 AA when used on a primary task element).
    rules: {
        // ---- Accessibility (jsx-a11y) - all errors by default ----
        'jsx-a11y/alt-text': 'error',
        'jsx-a11y/anchor-has-content': 'error',
        'jsx-a11y/anchor-is-valid': 'error',
        'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
        'jsx-a11y/aria-props': 'error',
        'jsx-a11y/aria-proptypes': 'error',
        'jsx-a11y/aria-role': 'error',
        'jsx-a11y/aria-unsupported-elements': 'error',
        'jsx-a11y/click-events-have-key-events': 'error',
        'jsx-a11y/heading-has-content': 'error',
        'jsx-a11y/html-has-lang': 'error',
        'jsx-a11y/iframe-has-title': 'error',
        'jsx-a11y/img-redundant-alt': 'error',
        'jsx-a11y/interactive-supports-focus': 'error',
        'jsx-a11y/label-has-associated-control': 'error',
        'jsx-a11y/media-has-caption': 'error',
        'jsx-a11y/mouse-events-have-key-events': 'error',
        'jsx-a11y/no-access-key': 'error',
        // Documented exception: SSO sign-in forms autofocus the email
        // field per UX convention; this is acceptable on a primary
        // task element. Warn (not error) so it remains visible to
        // reviewers without blocking the lint gate.
        'jsx-a11y/no-autofocus': 'warn',
        'jsx-a11y/no-distracting-elements': 'error',
        'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
        'jsx-a11y/no-noninteractive-element-interactions': 'error',
        'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
        'jsx-a11y/no-noninteractive-tabindex': 'error',
        'jsx-a11y/no-redundant-roles': 'error',
        'jsx-a11y/no-static-element-interactions': 'error',
        'jsx-a11y/role-has-required-aria-props': 'error',
        'jsx-a11y/role-supports-aria-props': 'error',
        'jsx-a11y/scope': 'error',
        'jsx-a11y/tabindex-no-positive': 'error',

        // ---- General hygiene ----
        // Permit `console.warn` and `console.error` (used by setup
        // files for legitimate diagnostics) but warn on `console.log`
        // / `console.info` / `console.debug` so they're surfaced for
        // review. Tests override this further (see `overrides` below).
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        // Disable the core `no-unused-vars` rule because TypeScript's
        // own `noUnusedLocals` / `noUnusedParameters` compiler options
        // (set in tsconfig.json) provide the canonical check. Avoiding
        // the duplicate rule prevents double-reporting on type-only
        // imports and overloaded function signatures.
        'no-unused-vars': 'off',
    },

    // -----------------------------------------------------------------
    // Ignore patterns
    // -----------------------------------------------------------------
    // ESLint walks the repository when invoked as `eslint .` and
    // respects these glob patterns. The list mirrors `.gitignore`
    // plus the explicit `server.js` exclusion mandated by the
    // "Do not touch!" directive.
    ignorePatterns: [
        // Standard build / install / coverage / report artefacts.
        'node_modules/',
        'dist/',
        'coverage/',
        'playwright-report/',
        'test-results/',
        '.vite/',
        // Frozen artefacts per AAP Section 0.10.4 and README.md
        // "Do not touch!" directive. server.js must NEVER be modified
        // and must NEVER be linted (any lint output could indirectly
        // pressure a change).
        'server.js',
        // The flat-config file is loaded by ESLint 10 itself and is
        // not part of this legacy spec's scope; avoid linting it
        // through this legacy entry to prevent rule conflicts during
        // toolchain transitions.
        'eslint.config.js',
        // Self-ignore: this config file would otherwise lint itself,
        // and CommonJS `module.exports` in a `.cjs` file is not a
        // standard target for the TypeScript parser.
        '*.config.cjs',
        '.eslintrc.cjs',
        // Visual baselines (PNG fixtures) and Figma assets are
        // binary; ESLint's text walker skips them, but pattern-level
        // exclusion makes intent explicit.
        'figma-assets/',
        '**/*.png',
        '**/*.svg',
        // Lockfile (regenerated by npm; not linted).
        'package-lock.json',
    ],

    // -----------------------------------------------------------------
    // Per-folder rule overrides
    // -----------------------------------------------------------------
    overrides: [
        {
            // Test sources (Vitest + Playwright). Allow `console.*`
            // calls in tests because debugging output is acceptable
            // and sometimes essential when triaging flakes.
            files: ['tests/**/*.ts', 'tests/**/*.tsx'],
            env: {
                browser: true,
                node: true,
                es2022: true,
            },
            rules: {
                'no-console': 'off',
            },
        },
        {
            // Root-level config files (Vite / Vitest / Playwright /
            // ESLint / Prettier). They run in Node and contain no JSX,
            // so JSX-aware rules are not applicable. Disabling the
            // `no-autofocus` rule here is a defensive no-op (there is
            // no JSX to lint), but it documents the intent.
            files: [
                '*.config.ts',
                '*.config.cjs',
                '*.config.js',
                'vite.config.ts',
                'vitest.config.ts',
                'playwright.config.ts',
            ],
            env: {
                node: true,
                es2022: true,
            },
            rules: {
                'jsx-a11y/no-autofocus': 'off',
            },
        },
    ],
};
