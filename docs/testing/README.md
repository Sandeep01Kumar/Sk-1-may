# SSO Test Suite — Operator Guide

This document describes how to run the SSO test suite locally and how the
suite is organised. It complements the high-level Agent Action Plan
(AAP) for the SSO testing initiative — Sections 0.1 (Intent
Clarification), 0.5 (File Transformation Map), and 0.7 (Coverage and
Quality Targets) define the scope; this document is the day-to-day
runbook for engineers.

> **Note on artefact freeze.** `server.js` and `README.md` are frozen
> per the explicit "Do not touch!" directive at the repository root.
> This file lives under `docs/testing/` so the freeze stays intact.

## 1. Prerequisites

| Tool | Version | Notes |
| ---- | ------- | ----- |
| Node.js | `>= 20.20.2` | Pinned by Tool & Framework Restriction I3. The container ships Node 20.20.2 by default. |
| npm     | `>= 10.x`    | Bundled with Node 20 LTS. |
| Playwright browsers | Auto-installed | Run `npx playwright install --with-deps` after `npm install`. Downloads Chromium, Firefox, WebKit + system deps. |

The suite has no real-network dependencies. OAuth provider behaviour
(Microsoft, Google) is mocked exclusively via MSW (`tests/mocks/**`).

## 2. Install

```bash
npm install
npx playwright install --with-deps
```

`npm install` regenerates `package-lock.json` and pulls every declared
dependency including the test runtimes (Vitest, Playwright,
Testing Library, axe-core, MSW, etc.). The second command downloads
about 350 MB of browser binaries and their OS dependencies.

## 3. Run the suite

Every npm script is non-interactive and CI-safe. Watch modes are
isolated under `:watch` / `:ui` suffixes; the base `test` scripts always
run once and exit.

| Script | Purpose |
| ------ | ------- |
| `npm test`              | Runs unit + component + integration + a11y suites sequentially. |
| `npm run test:unit`     | Vitest unit tests under `tests/unit/**`. |
| `npm run test:component`| Vitest component tests under `tests/component/**`. |
| `npm run test:integration` | Vitest integration tests under `tests/integration/**`. |
| `npm run test:a11y`     | Vitest accessibility tests under `tests/a11y/**` (jest-axe, keyboard, screen reader, contrast). |
| `npm run coverage`      | Vitest run with V8 coverage and AAP threshold enforcement. |
| `npm run test:e2e`      | Playwright E2E + cross-browser + cross-device matrix. |
| `npm run test:visual`   | Playwright visual specs (`@visual` tag). |
| `npm run lint`          | ESLint across `tests/**`, `src/**`, and root-level config files. |
| `npm run type-check`    | TypeScript strict compile (`tsc --noEmit -p tsconfig.test.json`). |
| `npm run format`        | Prettier write across the repository. |

Local debugging:

```bash
npm run test:watch          # Vitest watch mode
npm run test:e2e:ui         # Playwright UI mode
npm run test:e2e:headed     # Playwright with visible browsers
npm run test:e2e:debug      # PWDEBUG=1 stepwise debugger
```

## 4. Project layout (forward-looking)

```
src/
  assets/
    logo/                Blitzy logo SVG (committed from Figma)
    icons/               Password show eye icon SVG (committed from Figma)
    logos/               Microsoft + Google brand logos (committed from Figma)
  components/
    sso/                 SSO screens (SignInA, SignInB, SignInC, RegistrationCompletion, SignUpError, LinkAccountsModal)
    ui/                  Design-system primitives (Logo, TextInput, Button, SocialProviderButton, Separator, Modal)
  utils/                 validation.ts, oauth.ts
tests/
  fixtures/              Typed constants (users, passwords, OAuth, sessions, tokens, link payloads)
  mocks/
    handlers/            MSW request handlers (auth, link, password)
    server.ts            MSW Node server entry (Vitest)
    browser.ts           MSW Service Worker entry (Playwright dev runs)
    window.ts            window.open + clipboard stubs
    assets.ts            font preload stubs
  setup/
    component.ts         Vitest setup file
    global.ts            Cross-file constants/helpers
    playwright.ts        Custom Playwright fixtures (axeBuilder, page objects)
  utils/                 render.tsx, a11y.ts, visual.ts, tokens.ts, oauth-stub.ts
  unit/utils/            validation.test.ts, oauth.test.ts
  component/             Logo, TextInput, Button, SocialProviderButton, Separator, Modal, typography, spacing, colors, animations
  component/sso/         SignInA, SignInB, SignInC, RegistrationCompletion, SignUpError, LinkAccountsModal
  integration/           signin-microsoft, signin-multi-provider, registration, link-accounts, password-toggle, forgot-password
  a11y/                  component.a11y, keyboard-navigation, screen-reader, contrast
  visual/                signin-a, signin-b, signin-c-see-more, signin-c-expanded, registration, signup-error, link-accounts-microsoft, link-accounts-generic
  visual/baselines/desktop, tablet, mobile (per-viewport PNGs)
  e2e/sso/               signin-a, signin-b, signin-c, registration, signup-error, link-accounts, edge-cases, animations, keyboard-flow
docs/
  testing/README.md      This file
eslint.config.js         ESLint 10 flat config (jsx-a11y + typescript-eslint)
playwright.config.ts     Playwright projects matrix
tsconfig.json            Root TypeScript config (strict)
tsconfig.test.json       Test-only TypeScript config
vite.config.ts           Vite dev server + alias config
vitest.config.ts         Vitest test config + coverage thresholds
.prettierrc.json         Prettier 3 conventions
.prettierignore          Frozen artefacts and generated output
.gitignore               node_modules, coverage, playwright-report, test-results, .vite/
```

## 5. Authoring sequence (setup -> implementation)

Per AAP Section 0.10.5 (Honest Limitation Disclosure), the SSO UI
components do not yet exist in the repository. The current setup
delivers:

1. **Dependency manifest** — every test runtime declared in
   `package.json` and locked in `package-lock.json`.
2. **Configuration files** — Vite, Vitest, Playwright, TypeScript,
   ESLint, Prettier, .gitignore.

The next implementation cycle will deliver:

3. **Source assets** — `src/assets/{logo,icons,logos}/**` from the
   Figma file `2qR7NSTmQLynkmlj9B4ltc`.
4. **Test scaffolding** — `tests/setup/**`, `tests/mocks/**`,
   `tests/fixtures/**`, `tests/utils/**`.
5. **Component sources + tests** — `src/components/{sso,ui}/**` and
   their colocated specs under `tests/{unit,component,integration,a11y,visual,e2e}/**`.
6. **Visual baselines** — `tests/visual/baselines/desktop/**` from the
   Figma renderings; tablet and mobile baselines captured on first
   run after designer review.
7. **CI workflow** — `.github/workflows/test.yml`.

Until step 5 is complete, `npm test` reports "no test files found" for
the Vitest suites and Playwright reports zero specs. That is the
expected baseline for this setup checkpoint.

## 6. Quality gates

Enforced by `vitest.config.ts` and `playwright.config.ts`:

| Gate | Threshold | Where |
| ---- | --------- | ----- |
| Vitest statement coverage | `>= 90%` (global), `>= 95%` (`src/components/sso/**`), `100%` (`src/utils/**`) | `vitest.config.ts` |
| Vitest branch coverage    | `>= 85%` (global), `>= 90%` (SSO), `100%` (utils) | `vitest.config.ts` |
| Vitest function coverage  | `>= 90%` (global), `>= 95%` (SSO), `100%` (utils) | `vitest.config.ts` |
| Vitest line coverage      | `>= 90%` (global), `>= 95%` (SSO), `100%` (utils) | `vitest.config.ts` |
| Visual regression         | `<= 0.1%` pixel mismatch                                            | `playwright.config.ts` (`expect.toHaveScreenshot`) |
| Accessibility (component) | Zero jest-axe violations at WCAG 2.2 AA                               | `tests/a11y/component.a11y.test.tsx` |
| Accessibility (E2E)       | Zero `@axe-core/playwright` violations at WCAG 2.2 AA                 | `tests/setup/playwright.ts` (`axeBuilder`) |
| Cross-browser parity      | All E2E + visual specs pass on Chromium/Firefox/WebKit                | `playwright.config.ts` projects |
| Cross-device parity       | All E2E + visual specs pass on desktop / tablet / mobile viewports    | `playwright.config.ts` projects |
| Lint                      | Zero ESLint errors, zero warnings                                     | `eslint.config.js` + `npm run lint` |
| Type-check                | Zero TypeScript errors in strict mode                                 | `tsconfig.test.json` + `npm run type-check` |

## 7. Visual baseline workflow

1. Desktop baselines were committed as part of the AAP from the Figma
   PNG renderings. Do not regenerate without designer sign-off.
2. Tablet (768x1024) and mobile (375x812) baselines are captured on
   first run from the freshly-implemented components and committed
   after design review.
3. Local regeneration after design change:
   ```bash
   npm run test:visual -- --update-snapshots
   git add tests/visual/baselines
   ```

## 8. Mocking conventions

- Use **MSW** for all HTTP interception. Direct `vi.mock('fetch', ...)`
  and `nock` are explicitly rejected per AAP Section 0.10.2.
- Reset handlers in `afterEach`. The Vitest setup file
  (`tests/setup/component.ts`) is responsible for `server.resetHandlers()`.
- Stub `window.open` per-spec via `tests/utils/oauth-stub.ts`.

## 9. Interaction conventions

- Use `@testing-library/user-event` for all simulated user input. Never
  call `fireEvent` directly — `user-event` produces a realistic event
  sequence that better mirrors browser behaviour for clicks, focus,
  IME, and keyboard.

## 10. Known limitations at this checkpoint

These are recorded honestly so consumers of this guide are not
surprised:

- The SSO UI components are not yet authored. Test specifications
  reference paths under `src/components/sso/**` and
  `src/components/ui/**` that the implementation cycle will create.
  Until then, the assertion bodies cannot run end-to-end.
- The four Figma source assets (Blitzy logo, password-show eye icon,
  Microsoft logo, Google logo) are not yet committed to `src/assets/**`.
  The implementation cycle pulls them in.
- Tablet and mobile visual baselines do not yet exist. The Figma file
  only provides desktop-resolution renderings; the implementation cycle
  captures the remaining baselines.
- `.github/workflows/test.yml` does not yet exist. The implementation
  cycle adds it.
- `typescript-eslint` peer-dep constraints accept TypeScript up to
  6.1.0; we pin TypeScript 6.0.3 per the AAP, so the constraint holds.
- `eslint-plugin-jsx-a11y@6.10.2` does not yet list ESLint 10 in its
  peer-dep range. Installation uses `--legacy-peer-deps` to bypass the
  formal peer mismatch; the plugin's rule set runs fine against
  ESLint 10 at runtime.
