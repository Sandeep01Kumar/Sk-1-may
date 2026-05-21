# Test Suite Documentation

This documentation lives in `docs/testing/README.md` (not the root `README.md`) per AAP Section 0.10.4 — the root README is frozen by the project's "Do not touch!" directive. Any testing-related guidance, runbook entry, CI note, or contributor instruction that would historically belong in a project's root README **MUST** be placed here instead.

These tests validate the Single Sign-On (SSO) user interface against Figma file `2qR7NSTmQLynkmlj9B4ltc`, frame "Frame 0" (title "SSO"), per AAP Section 0.1.1. The full Figma URL is `https://www.figma.com/design/2qR7NSTmQLynkmlj9B4ltc/Blitzy-Platform-1.0?node-id=14980-28341`.

The suite covers exactly eight Figma frames (the canonical surface area for this test plan):

1. Sign in - A (Microsoft only) — Figma node `15001:41875`
2. Sign in - B (Microsoft + Google) — Figma node `15001:41988`
3. Sign in - C (See more) — Figma node `15001:42082`
4. Sign in - C (Expanded providers) — Figma node `15001:42214`
5. Registration Completion Form — Figma node `14980:28342`
6. SignUp Error (Create account) — Figma node `15058:34569`
7. Link Accounts Modal (Microsoft) — Figma node `16383:42232`
8. Link Accounts Modal (Generic) — Figma node `16383:42287`

> **Frozen artifacts (critical).** `server.js`, the root `README.md`, the existing identity fields of `package.json` (`name`, `version`, `description`, `main`, `author`, `license`), and the existing entries of `package-lock.json` are **FROZEN** by the "Do not touch!" directive (AAP Section 0.10.4). Detailed callouts appear in Section 17.

## Test Pyramid Overview

Per AAP Section 0.3.3, every test in this repository falls into exactly one of six categories. Each category targets a distinct dimension of the user's comprehensiveness requirement and is executed by a single canonical runner so that violations surface consistently.

| Category | Scope | Runner | Location |
|---|---|---|---|
| Unit | Pure functions in `src/utils/**` (email validators, password rule evaluators, OAuth helpers) | Vitest + happy-dom (jsdom fallback) | `tests/unit/**/*.test.ts` |
| Component | Isolated rendering of each design-system primitive and SSO screen; structural, ARIA, controlled-state, and computed-style assertions | Vitest + happy-dom (jsdom fallback) | `tests/component/**/*.test.tsx` |
| Integration | Container components wired to MSW-mocked OAuth providers, account-link backend, and password-reset endpoints | Vitest + happy-dom (jsdom fallback) | `tests/integration/**/*.test.tsx` |
| Visual | Playwright screenshots compared against Figma-derived PNG baselines under `tests/visual/baselines/**` | Playwright + pixelmatch | `tests/visual/**/*.spec.ts` |
| Accessibility (A11y) | Component-layer scans via jest-axe; E2E-layer scans via `@axe-core/playwright`; explicit keyboard / focus-trap / screen-reader / contrast tests | jest-axe (component) + @axe-core/playwright (E2E) | `tests/a11y/**/*.test.tsx` (component) + E2E fixture |
| E2E + Cross-browser + Cross-device | End-to-end user flows for every Figma frame, executed across the full browser × viewport matrix | Playwright (Chromium × Firefox × WebKit) × (desktop × tablet × mobile) = 9 projects | `tests/e2e/sso/**/*.spec.ts` |

The Vitest layer (Unit, Component, Integration, A11y component scans) runs in-process under happy-dom for speed; tests that demand strict DOM compliance fall back to jsdom. The Playwright layer (Visual, A11y E2E, E2E) launches real browsers and exercises the application through the Vite dev server. Both layers share the same axe-core rule engine version family (component layer 4.11.4, E2E layer 4.11.3) so WCAG 2.2 AA violations cannot escape between layers.

## Installation / Setup

Prerequisites (per AAP Section 0.9.1):

- **Node.js v22.22.2+** (Node 22 LTS).
- **npm v11.1.0+** (ships with Node 22 LTS).

Run the two setup commands exactly once after cloning, and re-run them whenever `package.json` or browser binaries change:

```bash
npm install
npx playwright install --with-deps
```

`npm install` regenerates `package-lock.json` integrity hashes and installs all dev/runtime dependencies declared in `package.json`. The second command downloads ~350 MB of browser binaries (Chromium, Firefox, WebKit) plus their system dependencies. Both commands are idempotent — re-running them with no upstream changes is a no-op.

After setup completes, verify the toolchain is wired up:

```bash
node --version       # expects v22.x
npm --version        # expects 11.x or newer
npx vitest --version # expects 4.1.6
npx playwright --version
```

## Test Execution Commands

The 15 scripts below — declared verbatim in `package.json` `scripts` per AAP Section 0.9.1 — are the only sanctioned entry points for running the suite. Each is mapped to a specific test category, debug mode, or quality gate so that CI runs identical commands to a developer's local workstation.

| Script | Command Body | Purpose / When to Use |
|---|---|---|
| `npm test` | `npm run test:unit && npm run test:component && npm run test:integration && npm run test:a11y` | Aggregate runner for all Vitest-based suites (non-watch, CI-friendly). |
| `npm run test:unit` | `vitest run --dir tests/unit` | Unit tests for utility modules. |
| `npm run test:component` | `vitest run --dir tests/component` | Component-level DOM tests. |
| `npm run test:integration` | `vitest run --dir tests/integration` | Container/integration tests with MSW. |
| `npm run test:a11y` | `vitest run --dir tests/a11y` | jest-axe component scans + keyboard/screen-reader/contrast tests. |
| `npm run test:e2e` | `playwright test --config=playwright.config.ts` | E2E + cross-browser + cross-device tests. |
| `npm run test:visual` | `playwright test --config=playwright.config.ts --grep @visual` | Visual regression specs (subset tagged `@visual`). |
| `npm run test:e2e:headed` | `playwright test --headed` | Local debug mode only — **NEVER** in CI. |
| `npm run test:e2e:debug` | `PWDEBUG=1 playwright test` | Step-through debug mode (local only). |
| `npm run test:watch` | `vitest --watch` | Local development only — **NEVER** in CI. |
| `npm run test:e2e:ui` | `playwright test --ui` | Playwright UI mode (local only). |
| `npm run coverage` | `vitest run --coverage` | Vitest suite with V8 coverage; fails build if thresholds unmet. |
| `npm run lint` | `eslint . --max-warnings=0` | ESLint check (zero warnings tolerated). |
| `npm run format` | `prettier --write .` | Format all files Prettier handles. |
| `npm run type-check` | `tsc --noEmit -p tsconfig.test.json` | TypeScript strict-mode check over tests + components. |

Watch-mode and UI-mode entries are local-developer affordances only; CI uses the headless, single-run variants exclusively (see AAP Section 0.10.4).

## Single-Test Execution Patterns

Three canonical patterns cover the common debugging needs (per AAP Section 0.9.1):

**Vitest by file** — run a single component test file:

```bash
npx vitest run tests/component/sso/SignInA.test.tsx
```

**Vitest by test name** — run only the test(s) whose name matches a substring (e.g., focusing on a single behaviour while iterating):

```bash
npx vitest run -t "renders Microsoft button"
```

**Playwright by file + project** — run a single E2E spec on one project shard (one browser × one viewport):

```bash
npx playwright test tests/e2e/sso/signin-a.spec.ts --project=chromium-desktop
```

Substitute any of the 9 project tags from Section 9 to pin a different browser/viewport combination.

## Debug-Mode Execution

Use the patterns below to step through a failing test interactively. Debug mode is for local development only and should **NEVER** be used in CI (per AAP Section 0.9.1).

**Vitest debug** — attach a Node debugger before tests start; useful when stepping through component-render logic or MSW handler interactions:

```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run --no-file-parallelism tests/component/sso/SignInA.test.tsx
```

The `--no-file-parallelism` flag ensures the debugger is not racing parallel workers. Attach Chrome DevTools or VS Code to the inspector port that prints to the console.

**Playwright debug** — enables the Playwright Inspector which pauses on each action and exposes the live DOM:

```bash
PWDEBUG=1 npx playwright test tests/e2e/sso/signin-a.spec.ts
```

Both commands open external debugger UI; CI runners have no display, so these scripts will hang there. The dedicated `test:e2e:debug` script wraps `PWDEBUG=1` for convenience but is otherwise identical.

## Coverage Thresholds

Coverage targets reflect the user's "comprehensive testing coverage" directive plus the per-file tightenings recorded in AAP Section 0.7.1. Per-file overrides recognise that SSO components are the explicit subject of the test plan (≥ 95%) and that utility modules are pure functions amenable to 100% coverage.

| Metric | Global threshold | SSO components (per-file) | Utility modules (per-file) |
|---|---|---|---|
| Statements | ≥ 90% | ≥ 95% | 100% |
| Branches | ≥ 85% | ≥ 90% | 100% |
| Functions | ≥ 90% | ≥ 95% | 100% |
| Lines | ≥ 90% | ≥ 95% | 100% |

Thresholds are enforced in `vitest.config.ts` under `coverage.thresholds` via `provider: 'v8'`. Per-file overrides are declared inside `thresholds.perFile` for `src/components/sso/**` and `src/utils/**`.

```ts
coverage: {
  provider: 'v8',
  thresholds: {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90,
    // per-file overrides for src/components/sso/** and src/utils/**
  }
}
```

The `npm run coverage` script writes `coverage/lcov.info` for downstream tooling (Codecov, SonarQube) and `coverage/index.html` for human review. Failing any threshold fails the build.

## Quality Gates

Ten gates are evaluated on every CI run per AAP Section 0.7.3. A failure of any gate fails the build; there are no soft warnings.

| Gate | Threshold | Where enforced |
|---|---|---|
| Vitest coverage (global) | Statements 90 / Branches 85 / Functions 90 / Lines 90 | `vitest.config.ts` + CI |
| Vitest coverage (SSO components) | ≥ 95% statements/functions/lines, ≥ 90% branches | `vitest.config.ts` per-file thresholds |
| Vitest coverage (utility modules) | 100% all metrics | `vitest.config.ts` per-file thresholds |
| Visual regression | ≤ 0.1% pixel mismatch with anti-alias tolerance | `playwright.config.ts` `expect.toHaveScreenshot` defaults |
| Accessibility (component) | Zero jest-axe violations at WCAG 2.2 AA | `tests/a11y/component.a11y.test.tsx` |
| Accessibility (E2E) | Zero `@axe-core/playwright` violations at WCAG 2.2 AA | `tests/setup/playwright.ts` `axeBuilder` fixture |
| Cross-browser parity | All E2E + visual specs pass on Chromium/Firefox/WebKit | `playwright.config.ts` projects |
| Cross-device parity | All E2E + visual specs pass on desktop/tablet/mobile viewports | `playwright.config.ts` projects |
| Lint | Zero ESLint errors; zero `eslint-plugin-jsx-a11y` warnings | `.eslintrc.cjs` + CI `npm run lint` |
| Type-check | Zero TypeScript errors in strict mode | `tsconfig.json` + CI `npm run type-check` |

## Browser × Device Matrix

Per AAP Section 0.7.2, every E2E and visual spec runs across the full browser × viewport matrix so that no engine- or breakpoint-specific regression can hide.

- **Browsers:** Chromium, Firefox, WebKit (all bundled with `@playwright/test`).
- **Viewports:** desktop 1440×1024, tablet 768×1024, mobile 375×812.
- **Total:** 9 Playwright projects (3 browsers × 3 viewports).

| Browser | Desktop (1440×1024) | Tablet (768×1024) | Mobile (375×812) |
|---|---|---|---|
| Chromium | `chromium-desktop` | `chromium-tablet` | `chromium-mobile` |
| Firefox | `firefox-desktop` | `firefox-tablet` | `firefox-mobile` |
| WebKit | `webkit-desktop` | `webkit-tablet` | `webkit-mobile` |

A failure on any single engine or viewport fails the build. There are no per-engine skips; if an issue is browser-specific, the test must account for it explicitly (e.g., feature-detect rather than skip).

### Performance budgets

- Vitest suite (unit + component + integration + a11y): **< 90 seconds locally**; **< 180 seconds in CI per matrix shard**.
- Playwright E2E + visual suite: **< 12 minutes total** across the 9-project matrix using 2 parallel workers.

Budgets are advisory but tracked — any sustained drift above the budget triggers a review of test setup overhead (typically dev-server warmup or fixture preparation).

## Visual Baseline Regeneration Workflow

Per AAP Section 0.4.5, eight desktop baselines are committed under `tests/visual/baselines/desktop/`. Each PNG was rendered from Figma file `2qR7NSTmQLynkmlj9B4ltc` during context-gathering and serves as the authoritative reference for the visual gate. Regenerate **ONLY** after designer sign-off.

The eight committed desktop baselines:

- `signin-a-microsoft-only.png` (sourced from `screen-signin-a-microsoft-only.png`)
- `signin-b-microsoft-google.png` (sourced from `screen-signin-b-microsoft-google.png`)
- `signin-c-see-more.png` (sourced from `screen-signin-c-see-more.png`)
- `signin-c-expanded.png` (sourced from `screen-signin-c-expanded.png`)
- `registration-completion.png` (sourced from `screen-registration-completion.png`)
- `signup-error.png` (sourced from `screen-signup-error.png`)
- `link-accounts-microsoft.png` (sourced from `screen-link-accounts-microsoft.png`)
- `link-accounts-generic.png` (sourced from `screen-link-accounts-generic.png`)

**Tablet (768×1024) and mobile (375×812) baselines** are *not* delivered by this plan — the Figma file provides only desktop renderings. First-run authors **MUST**:

- Capture tablet and mobile screenshots from the freshly-implemented SSO components.
- Submit them for design review.
- Commit them under `tests/visual/baselines/tablet/` and `tests/visual/baselines/mobile/` **ONLY** after design review approves them as authoritative.

Regeneration command (after sign-off):

```bash
npx playwright test --update-snapshots
```

Diff threshold: **0.1% pixel mismatch with anti-alias tolerance** (per AAP Section 0.7.3, enforced by `playwright.config.ts` `expect.toHaveScreenshot` defaults).

Workflow:

1. Run the baseline-update command above.
2. Visually compare new baselines against Figma file `2qR7NSTmQLynkmlj9B4ltc`.
3. Get designer sign-off.
4. Commit baselines to the repository.

## CI Integration

The canonical workflow file is `.github/workflows/test.yml` (per AAP Section 0.9.2).

**Triggers:** push to `main`, pull_request targeting `main`.

**Jobs:**

- `lint-type`: checkout → `actions/setup-node@v4` (Node 22) → `npm ci` → `npm run lint` → `npm run type-check`.
- `vitest`: depends on `lint-type` → checkout → `actions/setup-node@v4` → `npm ci` → `npm run coverage` → upload `coverage/` artifact.
- `playwright`: depends on `lint-type` → 9-project matrix shard → checkout → `actions/setup-node@v4` → `npm ci` → `npx playwright install --with-deps ${{ matrix.project }}` → `npx playwright test --project=${{ matrix.project }}` → upload `playwright-report/` artifact (`if: always()`).

**Matrix projects (9 shards):** `chromium-desktop`, `chromium-tablet`, `chromium-mobile`, `firefox-desktop`, `firefox-tablet`, `firefox-mobile`, `webkit-desktop`, `webkit-tablet`, `webkit-mobile`.

**Artifacts uploaded:** `coverage/` (lcov.info + HTML report), `playwright-report/` (HTML reports + traces on failure), JUnit XML for CI tooling.

**Concurrency:** each Playwright project runs as a separate matrix shard for parallelism; Vitest runs once.

Illustrative YAML (the canonical file is `.github/workflows/test.yml`):

```yaml
name: test
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  lint-type:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
  vitest:
    runs-on: ubuntu-latest
    needs: lint-type
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
  playwright:
    runs-on: ubuntu-latest
    needs: lint-type
    strategy:
      fail-fast: false
      matrix:
        project:
          - chromium-desktop
          - chromium-tablet
          - chromium-mobile
          - firefox-desktop
          - firefox-tablet
          - firefox-mobile
          - webkit-desktop
          - webkit-tablet
          - webkit-mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --project=${{ matrix.project }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.project }}
          path: playwright-report/
```

The illustrative YAML above is for documentation; the canonical file is `.github/workflows/test.yml`.

## Accessibility Expectations

Per AAP Section 0.10.2, the suite enforces a **zero-violation gate**: zero WCAG 2.2 AA violations across every component spec and E2E route — no exceptions, including `color-contrast`.

Two rule-engine layers run the same axe-core version family so violations cannot escape between layers:

- **Component layer:** jest-axe (axe-core 4.11.4 rule engine).
- **E2E layer:** `@axe-core/playwright` (axe-core 4.11.3, same rule engine version family).

Explicit checks required by every spec author:

- **Keyboard navigation** — Tab order, focus visible, focus trap on modals.
- **Focus order and tab sequence** — assert focus location at each step using `user-event.keyboard`.
- **Focus trap on `Modal`** — focus must not escape until the modal closes.
- **ARIA labelling** — presence and correct values of `aria-label`, `aria-labelledby`, `aria-modal`, `aria-pressed`, `aria-invalid`.
- **Password-toggle `aria-pressed`** — state-transition tests when toggled by click or by keyboard (Space/Enter); focus must return to the input after toggle.
- **Contrast ratios at WCAG 2.2 AA thresholds** — computed from token combinations; failures gate the build.

Tokens explicitly tested for AA contrast (4.5:1 for normal text, 3:1 for large text and graphical components):

- `#5B39F3` on white
- `#999999` on white
- `#333333` on white

## Testing Conventions

The following rules are non-negotiable. They are documented here (per AAP Section 0.10.2) because no prior conventions existed in the repository; these become canonical and are enforced by ESLint + TypeScript + reviewers.

- **MUST** use `@testing-library/user-event` for interactions — **NEVER** `fireEvent` directly. Realistic event sequences for clicks, focus, IME, and keyboard.
- **MUST** use MSW for OAuth provider mocking — **NEVER** `vi.mock('fetch', ...)` or `nock`. MSW provides a single source of truth across Node tests and browser dev runs.
- **MUST** source all design tokens from `tests/fixtures/design-tokens.ts` — **NEVER** hard-code hex strings like `'#5B39F3'` directly in spec files. Reference as `tokens.color.brand.primary`.
- **MUST** name tests starting with present-tense verbs (e.g., "renders Microsoft button", "submits form", "opens modal on click").
- **MUST NOT** use dynamic test names that vary between runs.
- **MUST NOT** hard-code URLs, ports, or credentials — all configurable via `tests/setup/global.ts` constants.
- **MUST** preserve test isolation: MSW handlers reset in `afterEach`; Playwright `storageState` scoped per-spec.
- **MUST** run tests in parallel: Vitest `pool: 'threads'`; Playwright `fullyParallel: true`.

## Figma-Specific Testing Requirements

Per AAP Section 0.10.3, the eight Figma frames listed in Section 1 are the canonical surface area; do **not** extend coverage outside them without an AAP update.

Visual baselines come from the Figma renderings committed under `tests/visual/baselines/desktop/`; do not regenerate them without designer sign-off (see Section 10 for the regeneration workflow).

**Brand assets — committed once, never substituted at runtime:**

- **Microsoft logo:** `microsoft-logo.png`, imageRef `5f6c2ee4d3e2fdb8e07e3a7170e08d7deb519f89`. Committed asset; never substituted, recoloured, or recropped at runtime. Displayed at 24×24 inside the `SocialProviderButton`.
- **Google logo:** `google-logo.png`, imageRef `0ebadeab0135cd2b6336c55ab458370f6f54c9d2`. Committed asset; never substituted, recoloured, or recropped at runtime. Displayed at 24×24 inside the `SocialProviderButton`.
- **Blitzy logo:** `blitzy-logo-aquamarine.svg`, derived from IMAGE-SVG node `15001:41888` backed by component `12610:15392`. Canonical "Main Aquamarine" variant; other `Property 1=*` logo variants are not used by the SSO surface.
- **Password-show eye icon:** `icon-show.svg`, derived from IMAGE-SVG instance `I15001:41909;2018:100356` backed by component `14962:27813`. Committed asset; rendered inside the `TextInput (RightIcon)` variant.
- **Hide-icon variant** (components `14962:27815` and `12610:16099`): **NOT committed** — no Figma frame renders the hide state. Tests for password toggling import the hide icon from the live design library path the implementation chooses.

**Gradient assertions** — the following gradient declarations must be asserted byte-for-byte from `getComputedStyle`:

- **Story panel gradient** (background of the hero/story panel on Sign-in screens): `linear-gradient(270deg, rgba(65, 1, 219, 1) 14%, rgba(91, 57, 243, 1) 36%, rgba(7, 255, 151, 1) 82%)`.
- **"Days" accent gradient** (text fill on the "Days" word in the story panel): `linear-gradient(270deg, rgba(91, 57, 243, 1) 31%, rgba(148, 250, 213, 1) 44%, rgba(7, 255, 151, 1) 51%)`.

**Modal shadow token** — captured from the Figma `Shadow / xl` effect on the Link Accounts Modal frames. The `Modal` component test **MUST** assert this exact `box-shadow` value:

`0px 8px 8px -4px rgba(16, 24, 40, 0.04), 0px 20px 24px -4px rgba(16, 24, 40, 0.1)`

## Troubleshooting

Common pitfalls and their fixes (informed by the web-search research in AAP Section 0.2.2):

- **Vitest watch hangs CI** → use `vitest run` not `vitest --watch`. Verify all `package.json` `scripts.test:*` entries use `run`. Watch mode is for local dev only.
- **Playwright runs headed in CI** → use the default headless mode. The `test:e2e:headed` script exists solely for local debugging and must never be invoked from a workflow file.
- **Visual diffs fail due to font hinting** → adjust `expect.toHaveScreenshot.maxDiffPixelRatio` in `playwright.config.ts`; ensure `@fontsource/inter` is preloaded via `tests/mocks/assets.ts` so the font face is resolved before screenshots are captured.
- **MSW handlers not intercepting** → verify `tests/setup/component.ts` starts the server via `server.listen({ onUnhandledRequest: 'error' })` and that `tests/mocks/server.ts` is imported (otherwise the handler graph is empty and requests fall through).
- **jest-axe `disableOtherRules: false`** → keep this flag `false` to maintain broad WCAG 2.2 AA coverage. Setting it to `true` silently narrows the rule set and lets violations through.
- **`@vitest/coverage-v8` version mismatch** → its major version **MUST** match `vitest`'s major version (both pinned at `4.1.6`). A mismatch produces opaque coverage-collection errors.
- **Tests fail to find SSO component files** → the SSO components do not exist yet (see "Honest Limitations"). Tests will compile (TypeScript path-alias resolves to non-existent files at type-check time only after `paths` are wired), but runtime assertions will fail until components are authored under `src/components/sso/**` and `src/components/ui/**`. This is by design — the tests are the executable design specification waiting for implementation.

## Honest Limitations

The AAP (Section 0.10.5) requires that these limitations be disclosed transparently so engineers do not expect everything to "just pass" after running `npm test`:

- **The SSO UI components do not exist in the repository today.** Tests authored by this plan reference component paths under `src/components/sso/**` and `src/components/ui/**` that will be created by a subsequent implementation cycle. Until those components exist, runtime assertions cannot all pass — the tests act as the executable design specification waiting for implementation.
- **Tablet and mobile visual baselines are not delivered by this plan.** The Figma file provides only desktop-resolution renderings; the AAP records this gap and instructs first-run authors to capture tablet/mobile screenshots from the freshly-implemented components and commit them as authoritative baselines after design review approves them.
- **The Hide eye icon, AI icon, and chevron-right icon** are referenced in the Figma component library but are not instantiated in any of the eight SSO frames; this plan does not commit them. Tests for the password-hide toggle import the icon from the design library path the implementation chooses; tests for AI and chevron-right are not in scope.
- **Performance metrics for the SSO surface** (Time-To-Interactive, First Contentful Paint, Cumulative Layout Shift) are **NOT** gated by this plan because no implementation exists to measure. Section 7 establishes test-suite performance budgets only, not application performance budgets.
- **External OAuth provider behaviour** is mocked exclusively via MSW. No real Microsoft or Google IdP is contacted at any point. End-to-end validation against real providers is a future activity outside this plan's scope.

## Frozen Artifact Reminders

Per AAP Section 0.10.4, the following artifacts are FROZEN. Repeating the callouts from Section 1 because contributors who skip the overview must still see the freeze rules when reading the closing reminders.

- **`server.js` is FROZEN** — DO NOT modify. No `module.exports` may be added. The handler is structurally unimportable per AAP Section 6.6, which is intentional.
- **`README.md` (root) is FROZEN** — DO NOT modify. All testing documentation lives in THIS file (`docs/testing/README.md`).
- **Existing fields of `package.json`** (`name`, `version`, `description`, `main`, `author`, `license`) are FROZEN — only additive changes (new fields, new scripts) are permitted.
- **Existing entries of `package-lock.json`** are FROZEN outside mechanical regeneration by `npm install`.

## Cross-References

AAP sections cited throughout this document: **0.1.1**, **0.2.2**, **0.3.3**, **0.4.5**, **0.5.1**, **0.7.1**, **0.7.2**, **0.7.3**, **0.8.1**, **0.9.1**, **0.9.2**, **0.10.2**, **0.10.3**, **0.10.4**, **0.10.5**.

Related test-suite conventions live in:

- `tests/setup/component.ts` — Vitest setup (MSW server start, jest-dom matchers, window stubs).
- `tests/setup/playwright.ts` — Custom Playwright fixtures (`axeBuilder`, `loginPage`, `signupPage`, `modalPage`).
- `tests/fixtures/design-tokens.ts` — Canonical token table (colors, gradients, type styles, layout values) consumed by computed-style assertions.

CI workflow source: `.github/workflows/test.yml`.

Repository configuration files referenced by this documentation:

- `vitest.config.ts`
- `playwright.config.ts`
- `tsconfig.json`
- `tsconfig.test.json`
- `vite.config.ts`
- `.eslintrc.cjs`
- `.prettierrc.json`
- `.gitignore`
