import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/*
 * Vite dev-server, bundler, and module-resolution configuration.
 *
 * Consumed by:
 *   - The Playwright `webServer` block in `playwright.config.ts`, which
 *     launches `npx vite --host 127.0.0.1 --port 5173 --strictPort` and
 *     waits for `http://127.0.0.1:5173` to respond before running specs.
 *   - Local developers running `npm run dev` (when authored) for visual
 *     and end-to-end test development against a hot-reloading server.
 *   - Vitest, which inherits the `plugins` and `resolve.alias` graph
 *     from this file via `vitest.config.ts` (Vitest applies the same
 *     React JSX/TSX transform and path-alias resolution as Vite).
 *
 * Authority anchors (Agent Action Plan):
 *   - Section 0.5.1 (File-by-File Test Plan) — defines this file's role.
 *   - Section 0.5.5 (Cross-File Test Dependencies) — path aliases must
 *     align with the `tsconfig.json` / `tsconfig.test.json` `paths` map.
 *   - Section 0.6.1 (Testing Dependencies) — pins vite@8.0.13 and
 *     @vitejs/plugin-react@6.0.2.
 *   - Section 0.4.4 (Test Data and Fixtures Design) — `MOCK_API=true`
 *     is the bridge between Playwright and the MSW browser worker.
 *   - Section 0.10.5 (Honest Limitation Disclosure) — SSO components,
 *     `index.html`, `src/main.tsx`, and `src/App.tsx` are forward-looking
 *     and will be authored by a subsequent implementation cycle. Vite's
 *     `server.warmup.clientFiles` gracefully ignores missing files so
 *     the dev server still starts without them.
 */

// ESM-safe equivalent of CommonJS `__dirname`. `import.meta.url` is a
// `file://` URL; `fileURLToPath` converts it to a platform-native path
// (handling Windows drive letters and POSIX paths uniformly) and
// `dirname` strips the trailing filename to yield the repo root.
const __dirname = dirname(fileURLToPath(import.meta.url));

// Default export: a function that returns a Vite `UserConfig`. The
// function form is used so that `loadEnv` can be evaluated against the
// active mode (`development`, `production`, `test`, ...) before the
// configuration object is constructed.
export default defineConfig(({ mode }) => {
  // Load every environment variable from `.env*` files in the current
  // working directory regardless of prefix. The empty-string prefix is
  // intentional — Vite defaults to `VITE_` which would hide the
  // `MOCK_API` flag set by `playwright.config.ts` via `webServer.env`.
  const env = loadEnv(mode, process.cwd(), '');

  // Coerce the MSW activation flag to a strict boolean. The MSW browser
  // worker is registered by client code only when this evaluates to
  // `true`. Any non-`'true'` value (including unset) keeps real network
  // calls flowing in development.
  const enableMockApi = env.MOCK_API === 'true';

  return {
    // Anchor Vite to the repository root. `index.html` (when authored)
    // is resolved relative to this directory. Using the absolute path
    // derived from `import.meta.url` avoids subtle cwd-related issues
    // when Vite is launched from CI or via Playwright's `webServer`.
    root: __dirname,

    // Default static-asset directory. Files placed under `public/` are
    // served at the root URL without transformation. The AAP does not
    // create `public/` today; this declaration is forward-looking so
    // future static assets (favicons, robots.txt) are picked up
    // automatically when authored.
    publicDir: 'public',

    // Register the React plugin. `@vitejs/plugin-react@6.0.2` provides
    // JSX/TSX transpilation, Fast Refresh for component-level HMR, and
    // the automatic JSX runtime required by React 19 (no React import
    // needed in JSX files). See AAP Section 0.6.1 for the version pin.
    plugins: [react()],

    resolve: {
      // Path aliases mirror `tsconfig.json` / `tsconfig.test.json`
      // `paths`. Keeping the two configurations in sync is mandatory
      // because TypeScript only checks compile-time resolution while
      // Vite performs the runtime resolution; a mismatch surfaces as
      // "module not found" at dev-server load time.
      alias: {
        // `@/*` → `src/*` (AAP Section 0.5.5).
        '@': resolve(__dirname, 'src'),
        // `@tests/*` → `tests/*` — used when component or integration
        // sources import shared test utilities (rare but supported).
        '@tests': resolve(__dirname, 'tests'),
        // `@assets` → `src/assets` — convenience alias for Figma
        // brand assets and icons (AAP Section 0.4.5).
        '@assets': resolve(__dirname, 'src/assets'),
      },
    },

    server: {
      // Bind to the loopback interface only. Matches the `baseURL`
      // hardcoded in `playwright.config.ts` (`http://127.0.0.1:5173`)
      // and the `webServer.command` argument list. Using `127.0.0.1`
      // (not `localhost`) avoids DNS-resolver edge cases on Windows
      // hosts where `localhost` may resolve to `::1` first.
      host: '127.0.0.1',

      // The canonical SSO dev-server port. `playwright.config.ts` hard-
      // codes this value in three places (`baseURL`, `webServer.url`,
      // and `webServer.command` `--port` flag).
      port: 5173,

      // Fail fast if port 5173 is already in use rather than silently
      // falling back to a higher port. Deterministic port assignment
      // is essential for CI: a silent fallback would leave Playwright
      // pointing at the wrong URL and tests would time out instead of
      // failing with a clear error.
      strictPort: true,

      // Do not auto-open a browser tab on dev-server start. Playwright
      // launches its own browsers; opening the default system browser
      // would be both wasteful (in local dev) and impossible (in CI).
      open: false,

      // Pre-bundle frequently requested client entry points on dev-
      // server cold start. This keeps Playwright's `webServer.timeout`
      // of 120 seconds well clear of cold-start jitter once SSO
      // components are implemented. Vite skips missing files silently
      // so this declaration is safe today even though the listed
      // entries do not yet exist (AAP Section 0.10.5).
      warmup: {
        clientFiles: ['./src/main.tsx', './src/App.tsx'],
      },
    },

    preview: {
      // `vite preview` serves the production build at the same address
      // as the dev server so any future production-build smoke test
      // can reuse `playwright.config.ts` without changes.
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },

    build: {
      // Match `tsconfig.json` `target: "ES2022"`. ES2022 is the lowest
      // baseline that supports class fields, `at()`, top-level await,
      // and the error `.cause` property used by modern test runners.
      target: 'es2022',

      // Production-build output directory. Cleared automatically by
      // `emptyOutDir`. The directory is git-ignored via `.gitignore`.
      outDir: 'dist',

      // Wipe `dist/` before each production build so stale chunks
      // from a previous build never leak into the new one.
      emptyOutDir: true,

      // Emit source maps for the production build. Required so
      // Playwright traces and accessibility-violation snapshots can
      // be mapped back to TypeScript sources during failure triage.
      sourcemap: true,

      // Suppress Rollup's "chunk size" warnings for chunks under 1 MB.
      // The React 19 runtime alone is close to the default 500 kB
      // threshold; raising the limit keeps the build output clean
      // while still surfacing genuinely oversized chunks.
      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          // Split the React runtime into a dedicated cacheable chunk
          // so that repeat visits do not re-download it when only
          // application code changes. Forward-looking — has no effect
          // until SSO components import React.
          //
          // Vite 8 uses Rolldown under the hood, whose `manualChunks`
          // option only accepts the function form (the legacy Rollup
          // record form `{ react: ['react', 'react-dom'] }` is no
          // longer accepted by the type definitions). The function
          // below is the canonical Rolldown-compatible equivalent: it
          // returns the chunk name `'react'` for any module resolved
          // out of the `react` or `react-dom` packages, and `null`
          // otherwise to let Rolldown perform its default chunking.
          manualChunks: (moduleId: string): string | null => {
            // Normalise path separators so the check works on Windows
            // (`\node_modules\react\...`) and POSIX hosts
            // (`/node_modules/react/...`).
            const normalised = moduleId.replace(/\\/g, '/');
            if (
              normalised.includes('/node_modules/react/') ||
              normalised.includes('/node_modules/react-dom/')
            ) {
              return 'react';
            }
            return null;
          },
        },
      },
    },

    // Compile-time string replacements. Vite performs verbatim text
    // substitution of these keys in source files at build time.
    // Surfacing the MSW activation flag via `import.meta.env.MOCK_API`
    // keeps client code free of `process.env` references (which would
    // not survive Vite's ESM bundling).
    define: {
      'import.meta.env.MOCK_API': JSON.stringify(enableMockApi),
    },

    optimizeDeps: {
      // Prevent esbuild from pre-bundling `msw/browser`. MSW's browser
      // build registers a Service Worker at module evaluation time;
      // pre-bundling breaks the registration handshake because the
      // pre-bundle copy and the original copy disagree on the worker
      // scope. The exclusion is only meaningful when `MOCK_API=true`,
      // so it is conditionally applied to keep cold-start dependency
      // optimisation as fast as possible when mocking is disabled.
      exclude: enableMockApi ? ['msw/browser'] : [],
    },
  };
});
