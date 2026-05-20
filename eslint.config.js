// ESLint flat configuration for the SSO test suite.
//
// ESLint 10 removed support for the legacy `.eslintrc.*` formats. The
// flat config below is the canonical equivalent and is loaded by ESLint
// automatically as `eslint.config.js` at the repository root.
//
// Linting scope:
//   - Test sources under `tests/**/*.{ts,tsx,js,jsx}`
//   - Component sources under `src/**/*.{ts,tsx}` (when authored by the
//     subsequent implementation cycle; gracefully no-ops until then)
//   - Configuration sources under the repository root (this file,
//     vite.config.ts, vitest.config.ts, playwright.config.ts)
//
// Explicitly NOT linted:
//   - `server.js` — frozen per the "Do not touch!" directive in README.md
//   - Generated artifacts (node_modules, dist, coverage,
//     playwright-report, test-results)
//   - Test result JSON outputs and Vitest snapshots.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  {
    // Global ignores
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.vite/**',
      // Frozen artifacts per AAP and README "Do not touch!" directive.
      'server.js',
      // Lockfile and similar generated content.
      'package-lock.json',
    ],
  },

  // Base recommended rules from @eslint/js for plain JavaScript.
  js.configs.recommended,

  // TypeScript recommended rules from typescript-eslint.
  ...tseslint.configs.recommended,

  // Test + component sources (TypeScript + JSX).
  {
    files: ['tests/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // jsx-a11y recommended rules (manually replicated since the plugin
      // does not yet ship a `flatConfigs.recommended` export that lists
      // ESLint 10 in peerDependencies; we configure the canonical rule
      // set explicitly so the lint gate stays meaningful).
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
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/lang': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-tabindex': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
      // Project-wide tightenings.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Configuration files (root-level TS configs and JS configs).
  {
    files: ['*.config.{js,ts,mjs,cjs}', '*.config.*.{js,ts,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
