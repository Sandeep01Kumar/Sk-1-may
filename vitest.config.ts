import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Vitest configuration for the SSO test suite.
//
// - Environment: happy-dom (fast DOM environment that supports the SSO
//   form/modal behaviour set; per-file overrides to jsdom may be applied
//   via `// @vitest-environment jsdom` pragmas inside individual specs
//   when strict DOM compliance is required).
// - Setup files: imports custom DOM matchers, starts the MSW Node server,
//   and stubs window-level globals. The setup file lives at
//   `tests/setup/component.ts` and is authored by the implementation
//   cycle that follows this setup; until then Vitest gracefully reports
//   that no setup files were found.
// - Coverage: V8 provider with thresholds aligned to AAP Section 0.7.1.
//   Per-file overrides tighten the thresholds for SSO components
//   (>=95%) and utility modules (100%).
//
// See AAP Section 0.10.5 (Honest Limitation Disclosure) for the
// authoring sequence between setup and implementation agents.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['tests/setup/component.ts'],
    include: [
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
      'tests/component/**/*.{test,spec}.{ts,tsx}',
      'tests/integration/**/*.{test,spec}.{ts,tsx}',
      'tests/a11y/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'tests/visual/**',
      'tests/e2e/**',
    ],
    css: true,
    pool: 'threads',
    reporters: ['default'],
    outputFile: {
      junit: 'test-results/vitest-junit.xml',
      html: 'test-results/vitest.html',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/assets/**',
        'src/main.{ts,tsx}',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
        perFile: false,
        'src/components/sso/**/*.{ts,tsx}': {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        'src/utils/**/*.{ts,tsx}': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
});
