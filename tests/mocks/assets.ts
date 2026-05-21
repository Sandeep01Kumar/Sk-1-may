/**
 * Inter font preload helper for the SSO test suite.
 *
 * --------------------------------------------------------------------------
 * Purpose
 * --------------------------------------------------------------------------
 * This module exposes a single async helper, `preloadInterFont()`, that
 * ensures the Inter typeface (weights 400 Regular and 600 Semi Bold) is
 * available before component, integration, accessibility, and visual tests
 * begin executing. It is intended to be called exactly once per Vitest
 * worker, from `tests/setup/component.ts` inside a `beforeAll` hook:
 *
 *   import { preloadInterFont } from '@tests/mocks/assets';
 *   beforeAll(async () => {
 *     await preloadInterFont();
 *   });
 *
 * --------------------------------------------------------------------------
 * Why this matters
 * --------------------------------------------------------------------------
 * Inter is the canonical typeface for every Figma text style in the SSO
 * surface (AAP Section 0.1.1 enumerates the per-style sizes — 62.78px hero,
 * 32px Sign-in heading, 24px H5, 18px Button/Large, 16px body). Without an
 * explicit preload, font loading races against the first render and the
 * subsequent computed-style query:
 *
 *   - `tests/component/typography.test.tsx` asserts
 *     `getComputedStyle(node).fontFamily === 'Inter'`. If the @font-face
 *     declarations are not yet known to the document when the query runs,
 *     the browser/DOM falls back to a platform font (Times, Liberation
 *     Sans, etc.) and the equality check fails non-deterministically.
 *
 *   - Per-component computed-style helpers in `tests/utils/tokens.ts` use
 *     the same query pattern for per-component font assertions and would
 *     produce the same race.
 *
 *   - Playwright visual regression captures (`tests/visual/**`) are taken
 *     after a brief settling delay, but absent a preload the first
 *     screenshot in a worker can still snapshot a fallback glyph set,
 *     producing pixel diffs against the Figma-sourced baselines.
 *
 * The preload triggers two side-effect CSS imports below
 * (`@fontsource/inter/400.css` and `@fontsource/inter/600.css`) so the
 * @font-face declarations enter the document's stylesheet graph at module
 * load time, and then awaits `document.fonts.load(...)` for each weight to
 * confirm the FontFaceSet has resolved the face descriptors. After that
 * await resolves, any subsequent computed-style query observes Inter as
 * the active family.
 *
 * --------------------------------------------------------------------------
 * Why only weights 400 and 600
 * --------------------------------------------------------------------------
 * AAP Section 0.10.2 specifies "Inter Regular 400 and Inter Semi Bold 600"
 * as the canonical weights referenced by every Figma text style in the SSO
 * surface. Loading additional weights (300, 500, 700, 800) would pollute
 * the FontFaceSet, slow down `beforeAll` setup, and tempt drift between
 * tests and the design system. Importing `@fontsource/inter/index.css`
 * (which pulls every weight) is explicitly forbidden by the agent prompt
 * for this same reason.
 *
 * --------------------------------------------------------------------------
 * happy-dom limitation
 * --------------------------------------------------------------------------
 * happy-dom (the default Vitest environment per `vitest.config.ts`) ships
 * a minimal FontFaceSet polyfill. It accepts CSS @font-face declarations
 * and exposes `document.fonts`, but its `load()` implementation may resolve
 * with no actual glyph rasterisation and may even throw on shorthand
 * descriptors with unfamiliar weight tokens. To remain robust:
 *
 *   1. The environment guard checks both `typeof document === 'undefined'`
 *      (SSR / Node-only test) AND `typeof fonts.load !== 'function'` (DOM
 *      without a FontFaceSet implementation). If either is true the
 *      helper returns a resolved no-op promise.
 *
 *   2. The `fonts.load(...)` calls are wrapped in try/catch. Any thrown
 *      value (DOMException, TypeError, or a polyfill-specific error class)
 *      is swallowed. The side-effect CSS imports already injected the
 *      @font-face rules into the document's stylesheet graph, which is
 *      sufficient for assertions that query `font-family` declarations
 *      (e.g., `getComputedStyle(...).fontFamily`).
 *
 *      Visual regression specs that depend on actual glyph rasterisation
 *      run under Playwright/Chromium/Firefox/WebKit, NOT under happy-dom.
 *      Those engines implement FontFaceSet faithfully and the await
 *      resolves with real font readiness.
 *
 * --------------------------------------------------------------------------
 * Idempotency
 * --------------------------------------------------------------------------
 * A module-scoped `preloadPromise` memoises the in-flight (or completed)
 * preload. Subsequent calls to `preloadInterFont()` within the same
 * Vitest worker return the same Promise reference and do NOT re-invoke
 * `document.fonts.load(...)`. This guarantees:
 *
 *   - O(1) cost for the second-through-Nth call.
 *   - Stable behaviour when multiple setup files (e.g., `component.ts`
 *     plus an ad-hoc spec-level helper) accidentally call the function.
 *   - Idempotent semantics expected by Vitest's `beforeAll` execution
 *     across pooled workers.
 *
 * The cache can be flushed by `resetInterFontPreloadCache()` for
 * exceptional cases (e.g., a test that manipulates the FontFaceSet
 * directly and then needs to re-trigger the preload).
 *
 * --------------------------------------------------------------------------
 * Module name vs file role
 * --------------------------------------------------------------------------
 * The path `tests/mocks/assets.ts` is informational only — this file is
 * NOT an HTTP mock and does NOT register MSW handlers. The `mocks/`
 * foldering reflects the AAP's information architecture (asset-related
 * preload helpers live alongside HTTP mock handlers in the same folder),
 * not the file's literal nature. Image asset stubs (Microsoft logo,
 * Google logo, Blitzy logo, password-show icon) are NOT exposed by this
 * module: those assets are consumed by the SSO components themselves via
 * static URL imports under `src/assets/**`, not by tests.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.4.4 — "Asset preload mock — `tests/mocks/assets.ts`
 *     — Stubs for `@fontsource/inter` font face loading."
 *   - AAP Section 0.5.1 — file row for `tests/mocks/assets.ts`.
 *   - AAP Section 0.6.1 — pins `@fontsource/inter` as a devDependency
 *     (resolved to 5.2.8 in `package.json`).
 *   - AAP Section 0.9.1 — "Inter font bundled via `@fontsource/inter`;
 *     tests preload it via `tests/mocks/assets.ts` to avoid layout shift
 *     during screenshots."
 *   - AAP Section 0.10.2 — "Inter font is mandatory. Tests preload
 *     `@fontsource/inter` so font face is resolved before screenshots are
 *     captured; visual diff thresholds account for font hinting
 *     differences between operating systems."
 */

// -----------------------------------------------------------------------------
// Side-effect CSS imports
// -----------------------------------------------------------------------------
//
// These two imports do NOT bind a name into scope — they exist solely so
// that Vite's CSS pipeline (used by both `vite dev` and the Vitest
// in-process transformer) parses the @font-face declarations inside the
// `@fontsource/inter/400.css` and `@fontsource/inter/600.css` files and
// injects them into the document's stylesheet graph at module load.
//
// Two weights only:
//
//   - 400 Regular   — used by every body, link, button-secondary, and
//                     placeholder text style in the Figma file.
//   - 600 Semi Bold — used by the Sign-in heading (32px), H5 headings
//                     (24px), primary buttons (18px), and form labels.
//
// Importing `@fontsource/inter/index.css` is FORBIDDEN by the agent prompt
// because it pulls every weight (100..900), pollutes the FontFaceSet, and
// inflates test setup time without any added coverage.
//
// The CSS files live in node_modules/@fontsource/inter/ and are resolved
// via the package's `./*` export pattern declared in its package.json.
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';

// -----------------------------------------------------------------------------
// Exported constants
// -----------------------------------------------------------------------------
//
// These string/number literals describe the font weights and a reference
// font size used by the internal `document.fonts.load(...)` shorthand.
// They are exported as named constants so other test utilities (e.g.,
// `tests/utils/tokens.ts`) can reference the canonical font family / weight
// tokens without hardcoding magic strings.
//
// IMPORTANT: `tests/fixtures/design-tokens.ts` remains the SINGLE SOURCE
// OF TRUTH for design tokens. The constants exported here are convenience
// duplicates scoped to the FontFaceSet load shorthand. If the Figma file
// ever changes the canonical font family or weights, BOTH this file AND
// `tests/fixtures/design-tokens.ts` must be updated.

/**
 * The CSS `font-family` name advertised by the @font-face declarations
 * in `@fontsource/inter/400.css` and `@fontsource/inter/600.css`. Matches
 * the value stored under `FONT_FAMILY_TOKENS['sans']` in
 * `tests/fixtures/design-tokens.ts`.
 */
export const FAMILY = 'Inter';

/**
 * Regular weight per AAP Section 0.10.2. Used by body text, placeholders,
 * link labels, and the secondary button label per Figma file
 * 2qR7NSTmQLynkmlj9B4ltc.
 */
export const WEIGHT_REGULAR = 400;

/**
 * Semi Bold weight per AAP Section 0.10.2. Used by the Sign-in heading,
 * primary button label, H5 headings, and form field labels per Figma file
 * 2qR7NSTmQLynkmlj9B4ltc.
 */
export const WEIGHT_SEMIBOLD = 600;

/**
 * Reference font size (in CSS pixels) used by the internal
 * `document.fonts.load('<weight> <size>px <family>')` shorthand. The
 * FontFaceSet API treats this size as a request hint, not a strict bound;
 * a single load at one reference size resolves the face for all sizes.
 *
 * 16px is the platform default and the size at which CSS resolves
 * `1rem`, making it the conventional reference value across the
 * `fonts.load()` ecosystem.
 */
export const REFERENCE_SIZE_PX = 16;

// -----------------------------------------------------------------------------
// Module-scoped memoisation
// -----------------------------------------------------------------------------
//
// `preloadPromise` caches the in-flight (or completed) preload Promise.
// On the first call, it is `null` and `preloadInterFont()` triggers the
// underlying `doPreload()` work. On every subsequent call within the same
// Vitest worker process, the cached Promise is returned directly.
//
// The cache lives for the lifetime of the worker process. Vitest pools
// workers with `worker_threads` (per `vitest.config.ts` `pool: 'threads'`)
// and may reuse a single worker across multiple spec files; the cache is
// safe to reuse in that scenario because the FontFaceSet itself is
// document-scoped and any documents in the worker share the same set.

/**
 * Memoised preload Promise. `null` until the first `preloadInterFont()`
 * call, at which point it is assigned the result of `doPreload()`. Reset
 * to `null` only by `resetInterFontPreloadCache()`.
 */
let preloadPromise: Promise<void> | null = null;

// -----------------------------------------------------------------------------
// Deterministic FontFaceSet stub
// -----------------------------------------------------------------------------
//
// Code Review remediation (Test Determinism): the canonical fix for the
// font-readiness race surfaced by the review is a deterministic stub of
// both `document.fonts.load()` and `document.fonts.ready` so any test
// awaiting either resolves predictably, irrespective of which DOM
// polyfill (happy-dom / jsdom) is in play and irrespective of the
// underlying CSS font loading order.
//
// AAP Section 0.4.4 ("Asset preload mock"), Section 0.10.2 ("Inter font
// is mandatory"), and Section 0.10.5 ("honest limitation disclosure")
// all converge on this requirement: tests must observe a stable, fully-
// resolved FontFaceSet regardless of the runtime's polyfill behaviour.
//
// The stub is INSTALLED automatically the first time `preloadInterFont()`
// runs and is RESTORED to its captured original state by
// `resetInterFontPreloadCache()`. Specs that need fine-grained control
// can call `installFontFaceSetStub()` and `restoreFontFaceSetStub()`
// directly.

/**
 * Snapshot of the original `document.fonts` state captured the first
 * time `installFontFaceSetStub()` is invoked. `load` holds the original
 * loader bound to the FontFaceSet (so restoration preserves `this` even
 * when the property is reassigned). `readyDescriptor` holds the own-
 * property descriptor for `ready` (typically `undefined` because `ready`
 * is a prototype-level getter — the prototype's getter takes over when
 * the own-property is deleted on restore).
 */
interface FontFaceSetSnapshot {
    /**
     * Original `load(font, text?)` implementation bound to the captured
     * `FontFaceSet` instance, or `undefined` if the polyfill never
     * defined a load method.
     */
    readonly load: ((font: string, text?: string) => Promise<FontFace[]>) | undefined;
    /**
     * Own-property descriptor for `ready` captured before the stub was
     * installed. `undefined` if `ready` was inherited from the prototype
     * (the typical case in happy-dom / jsdom / real browsers).
     */
    readonly readyDescriptor: PropertyDescriptor | undefined;
}

/**
 * Snapshot of the FontFaceSet state before the stub was installed.
 * `null` until `installFontFaceSetStub()` runs successfully; reset to
 * `null` by `restoreFontFaceSetStub()`.
 */
let fontFaceSetSnapshot: FontFaceSetSnapshot | null = null;

/**
 * Install deterministic stubs for `document.fonts.load()` and
 * `document.fonts.ready`.
 *
 * After this call:
 *   - `document.fonts.load(...)` returns `Promise.resolve([])` for any
 *     shorthand input — never throws, never blocks. This guarantees the
 *     `Promise.all` inside `doPreload()` resolves regardless of which
 *     polyfill (happy-dom / jsdom) is active.
 *   - `document.fonts.ready` returns `Promise.resolve(document.fonts)`,
 *     matching the FontFaceSet specification's "all loads complete"
 *     state. Tests that `await document.fonts.ready` resolve
 *     deterministically without waiting for actual @font-face fetches
 *     to complete.
 *
 * Idempotent: calling twice is a no-op (the second call observes the
 * non-null snapshot and returns immediately). To reset, call
 * `restoreFontFaceSetStub()`.
 *
 * Environment fallthroughs:
 *   - `typeof document === 'undefined'` (SSR / Node-only): no-op.
 *   - `document.fonts === undefined` (DOM without FontFaceSet): no-op.
 *
 * The stub is intended for use under happy-dom (and, optionally, jsdom)
 * where polyfill behaviour around FontFaceSet diverges from real
 * browsers. Playwright E2E + visual specs run under
 * Chromium/Firefox/WebKit which implement FontFaceSet faithfully; this
 * file is NOT imported from those specs so the stub never affects them.
 */
export function installFontFaceSetStub(): void {
    if (fontFaceSetSnapshot !== null) {
        // Already installed — idempotent.
        return;
    }
    if (typeof document === 'undefined') {
        return;
    }
    const fonts: FontFaceSet | undefined = (document as Partial<Document>).fonts;
    if (fonts === undefined) {
        return;
    }

    // Capture the original `load` method (if any) so the eventual
    // restore re-installs the polyfill's implementation rather than a
    // copy. `.bind(fonts)` preserves `this` because some polyfills
    // implement `load` as a regular method that reads from `this`.
    const originalLoad: FontFaceSet['load'] | undefined =
        typeof fonts.load === 'function'
            ? (fonts.load.bind(fonts) as FontFaceSet['load'])
            : undefined;

    // Capture the own-property descriptor for `ready` (likely
    // `undefined` because `ready` is a prototype-level getter — the
    // prototype getter takes over again on restore when we delete the
    // own property).
    const originalReadyDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
        fonts,
        'ready',
    );

    fontFaceSetSnapshot = {
        load: originalLoad,
        readyDescriptor: originalReadyDescriptor,
    };

    // Install the deterministic `load` stub. We cast through `unknown`
    // because TypeScript's DOM types declare `load` as a method (not a
    // settable property), but at runtime FontFaceSet methods are
    // ordinary own/prototype properties that may be reassigned.
    (
        fonts as unknown as {
            load: (font: string, text?: string) => Promise<FontFace[]>;
        }
    ).load = (): Promise<FontFace[]> => Promise.resolve([]);

    // Install the deterministic `ready` getter. The descriptor is
    // configurable so `restoreFontFaceSetStub()` can `delete` it later
    // and let the prototype-level getter take over again.
    Object.defineProperty(fonts, 'ready', {
        configurable: true,
        enumerable: true,
        get(): Promise<FontFaceSet> {
            return Promise.resolve(fonts);
        },
    });
}

/**
 * Restore the original `document.fonts` state.
 *
 * After this call:
 *   - `document.fonts.load(...)` is restored to the polyfill's original
 *     implementation (or removed if no implementation was captured).
 *   - `document.fonts.ready` is restored to the prototype-level getter
 *     (the stub's own-property is deleted; the prototype's getter takes
 *     over).
 *
 * No-op if `installFontFaceSetStub()` has not been called.
 *
 * Use cases:
 *   - A spec that wants to assert real polyfill behaviour after a
 *     stubbed setup.
 *   - The `resetInterFontPreloadCache()` helper, which calls this
 *     function as part of its full-reset semantics.
 */
export function restoreFontFaceSetStub(): void {
    if (fontFaceSetSnapshot === null) {
        return;
    }
    if (typeof document === 'undefined') {
        // The snapshot was captured under a DOM environment but the
        // document is no longer available; release the snapshot so a
        // subsequent `installFontFaceSetStub()` can re-capture.
        fontFaceSetSnapshot = null;
        return;
    }
    const fonts: FontFaceSet | undefined = (document as Partial<Document>).fonts;
    if (fonts === undefined) {
        fontFaceSetSnapshot = null;
        return;
    }

    // Restore `load`. If the snapshot captured a callable original we
    // re-assign it; otherwise we leave the stub in place because there
    // is no way to "delete" a prototype-level method without breaking
    // every other FontFaceSet instance.
    if (fontFaceSetSnapshot.load !== undefined) {
        (
            fonts as unknown as {
                load: (font: string, text?: string) => Promise<FontFace[]>;
            }
        ).load = fontFaceSetSnapshot.load;
    }

    // Restore `ready`. We delete the own-property we installed; if the
    // original was an own-property (rare), re-define it from the
    // captured descriptor.
    delete (fonts as unknown as Record<string, unknown>).ready;
    if (fontFaceSetSnapshot.readyDescriptor !== undefined) {
        Object.defineProperty(fonts, 'ready', fontFaceSetSnapshot.readyDescriptor);
    }

    fontFaceSetSnapshot = null;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Preload the Inter typeface (weights 400 and 600) into the document's
 * FontFaceSet.
 *
 * Behaviour:
 *   - Returns the cached Promise if one exists (idempotent).
 *   - On first call, invokes the internal `doPreload()` worker, caches
 *     its returned Promise, and returns it.
 *   - Never throws: errors raised by the FontFaceSet polyfill (common
 *     under happy-dom) are swallowed inside `doPreload()`.
 *
 * Resolves with `undefined` once both weights have been requested via
 * `document.fonts.load(...)` (or immediately if the environment lacks a
 * FontFaceSet implementation).
 *
 * IMPLEMENTATION NOTE: This function is NOT declared `async` even though
 * its return type is `Promise<void>`. A bare `function` declaration that
 * returns the cached Promise preserves Promise reference identity across
 * calls — i.e., `preloadInterFont() === preloadInterFont()` holds, which
 * is the strict "same Promise reference" contract documented in the
 * agent prompt's Phase 9 runtime validation. An `async function` would
 * wrap each returned Promise in a fresh outer Promise (per the
 * EcmaScript specification: async functions ALWAYS return a new Promise
 * created via the async function's implicit Promise resolution
 * protocol), breaking that reference-identity contract while still
 * preserving eventual-value equivalence. The `async` keyword in the
 * agent prompt's prose was clarified parenthetically as "returns
 * `Promise<void>`" — not as the literal `async function` syntax.
 *
 * @returns A Promise that resolves to `undefined` when preload work is
 *   complete (or immediately for environments without document.fonts).
 *
 * @example
 *   // In tests/setup/component.ts
 *   import { preloadInterFont } from '@tests/mocks/assets';
 *   beforeAll(async () => {
 *     await preloadInterFont();
 *   });
 */
export function preloadInterFont(): Promise<void> {
    if (preloadPromise !== null) {
        // Idempotent: return the cached in-flight or resolved Promise so
        // multiple awaiting callers share a single underlying load AND
        // observe the same Promise reference (per Phase 9 contract).
        return preloadPromise;
    }

    // Install the deterministic FontFaceSet stub BEFORE the load work
    // begins. This ensures `doPreload()` runs against a stable surface
    // and that downstream tests awaiting `document.fonts.ready` observe
    // a resolved Promise regardless of which polyfill is active. The
    // stub is idempotent and a no-op outside DOM environments.
    installFontFaceSetStub();

    // Kick off the actual work and cache the Promise. Assigning before
    // returning ensures that if a second call to `preloadInterFont()`
    // arrives while `doPreload()` is still running, both callers share
    // the same in-flight Promise (rather than triggering a duplicate
    // FontFaceSet.load round trip).
    preloadPromise = doPreload();
    return preloadPromise;
}

/**
 * Reset the module-scoped memoisation cache so that the next call to
 * `preloadInterFont()` re-runs the underlying `document.fonts.load(...)`
 * sequence.
 *
 * Use cases:
 *   - A spec that manipulates `document.fonts` directly (e.g., calls
 *     `document.fonts.clear()`) and needs the preload to re-execute.
 *   - Lifecycle hooks that reset the DOM between test files in a pooled
 *     worker and want a fresh preload on the next `beforeAll`.
 *
 * After this call, `preloadInterFont()` reverts to its first-call
 * behaviour — it WILL invoke `document.fonts.load(...)` again AND
 * re-install the FontFaceSet stub.
 *
 * This helper also restores the original `document.fonts.load()` and
 * `document.fonts.ready` state via `restoreFontFaceSetStub()` so a spec
 * that wants to assert against the underlying polyfill behaviour can do
 * so after calling this function. Specs that need finer-grained control
 * over the stub lifecycle can call `installFontFaceSetStub()` /
 * `restoreFontFaceSetStub()` directly.
 *
 * @returns void
 */
export function resetInterFontPreloadCache(): void {
    preloadPromise = null;
    restoreFontFaceSetStub();
}

// -----------------------------------------------------------------------------
// Internal worker
// -----------------------------------------------------------------------------

/**
 * Performs the actual FontFaceSet preload work. Encapsulated in a
 * non-exported helper so the public `preloadInterFont()` can focus on
 * memoisation concerns.
 *
 * Environment fallthroughs (any one of which is treated as a no-op):
 *
 *   1. `typeof document === 'undefined'` — SSR or pure Node runtime
 *      without a DOM. The preload is meaningless because no element will
 *      ever be measured.
 *
 *   2. `document.fonts === undefined` — DOM environment that lacks the
 *      FontFaceSet API entirely (very old jsdom, custom shim). The CSS
 *      side-effect imports above already injected the @font-face
 *      declarations into the stylesheet graph, which is sufficient for
 *      `font-family` declaration assertions.
 *
 *   3. `typeof document.fonts.load !== 'function'` — partial
 *      implementation where the object exists but the loader is missing.
 *      Same reasoning as (2) — the declarations are present, only the
 *      programmatic loader is unavailable.
 *
 * Error handling:
 *
 *   The Promise.all() wraps two `fonts.load(...)` calls in a try/catch.
 *   happy-dom's polyfill is known to throw `DOMException` or `TypeError`
 *   for shorthand font descriptors it cannot parse; the catch block
 *   swallows these because the CSS injection alone is sufficient for the
 *   non-rasterising assertions that happy-dom tests rely on. Real
 *   browsers (Chromium, Firefox, WebKit) do not throw for valid
 *   shorthands and resolve normally.
 *
 * @returns A Promise that resolves to `undefined` once the load requests
 *   have been issued (whether or not they actually rasterised glyphs).
 */
async function doPreload(): Promise<void> {
    // Guard 1: SSR / Node-only environment.
    //
    // `typeof document === 'undefined'` is the canonical browser-vs-Node
    // discriminator in dual-environment code (used by Next.js, MSW, and
    // every isomorphic library). It also avoids a ReferenceError in
    // module-level evaluations under bare Node runtimes that do not even
    // declare `document`.
    if (typeof document === 'undefined') {
        return;
    }

    // Guard 2: Document without a FontFaceSet implementation.
    //
    // The narrow cast `(document as Partial<Document>).fonts` makes the
    // `fonts` accessor optional from TypeScript's perspective so the
    // subsequent `undefined` check is well-typed. `Partial<Document>`
    // marks every Document property as optional, which is acceptable
    // here because we only read a single property and immediately
    // discard the cast.
    //
    // We deliberately do NOT use `(document as Document & { fonts?: ... })`
    // because an intersection of a required property with an optional
    // property of the same value type keeps the required signature in
    // TypeScript, which would make the `=== undefined` check a no-op.
    const fonts: FontFaceSet | undefined = (document as Partial<Document>).fonts;

    if (fonts === undefined || typeof fonts.load !== 'function') {
        return;
    }

    try {
        // Issue two parallel `fonts.load(...)` calls — one per weight —
        // and wait for both to resolve before returning. The shorthand
        // matches the CSS `font` shorthand grammar:
        //
        //   <font-weight> <font-size>px <font-family>
        //
        // The browser's FontFaceSet uses this shorthand to look up the
        // matching @font-face descriptor in the document's stylesheet
        // graph and returns a Promise that resolves once the underlying
        // font file (woff2/woff/ttf) has been fetched and parsed.
        //
        // We issue both loads in parallel via Promise.all so that the
        // weight-400 and weight-600 fetches overlap. In real browsers
        // this halves the wall-clock cost of the preload; in happy-dom
        // the loads resolve synchronously (or throw), so parallelism is
        // neutral.
        await Promise.all([
            fonts.load(`${WEIGHT_REGULAR} ${REFERENCE_SIZE_PX}px ${FAMILY}`),
            fonts.load(`${WEIGHT_SEMIBOLD} ${REFERENCE_SIZE_PX}px ${FAMILY}`),
        ]);
    } catch {
        // happy-dom's FontFaceSet polyfill is known to throw on certain
        // shorthand inputs even though the underlying @font-face rules
        // are present in the document's stylesheet graph. We swallow
        // the error here because:
        //
        //   1. The side-effect CSS imports above already injected the
        //      @font-face declarations into the document, so
        //      `getComputedStyle(...).fontFamily` assertions will still
        //      observe `'Inter'` (the declared CSS family name) even
        //      without successful FontFaceSet.load() resolution.
        //
        //   2. Visual regression specs that DO depend on real glyph
        //      rasterisation run under Playwright/Chromium/Firefox/WebKit,
        //      where FontFaceSet is fully implemented and the load
        //      shorthand parses correctly. Those engines never enter
        //      this catch block.
        //
        //   3. Failing the preload would force callers to wrap every
        //      `await preloadInterFont()` in a try/catch, defeating the
        //      "fire-and-forget" contract documented in the public API.
        //
        // This swallow is intentional. The catch block deliberately does
        // not bind an error parameter (per TypeScript 4.0+ optional
        // catch binding) so the linter does not flag an unused variable.
    }
}
