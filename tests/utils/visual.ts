/**
 * Pixelmatch + pngjs wrappers for offline visual regression diffing.
 *
 * Used by visual specs under `tests/visual/**` as a deterministic fallback
 * when Playwright's `expect(page).toHaveScreenshot(...)` is unavailable or
 * when post-hoc diff inspection of baseline PNGs is required.
 *
 * Responsibilities:
 *   - Read a PNG file from disk and return a parsed `PNG` object.
 *   - Write a PNG object to disk (creating intermediate directories).
 *   - Compare two PNG objects pixel-by-pixel and return mismatch statistics
 *     plus a diff PNG with offending pixels highlighted.
 *   - Convenience file-based comparison + Vitest-friendly assertion wrapper.
 *   - Crop a rectangular region from a PNG via `PNG.bitblt`.
 *
 * Authority (Agent Action Plan):
 *   - Section 0.5.1 — file row for `tests/utils/visual.ts`.
 *   - Section 0.6.1 — pins `pixelmatch@7.2.0` + `pngjs@7.0.0`.
 *   - Section 0.7.3 — visual regression gate: ≤ 0.1% pixel mismatch
 *                      with anti-alias tolerance.
 *   - Section 0.10.2 — visual diff thresholds account for font-hinting
 *                       differences between operating systems.
 *   - Section 0.4.5 — visual baselines under `tests/visual/baselines/**`
 *                      are dimension-canonical and must not be silently
 *                      scaled.
 *   - Section 0.10.5 — honest limitation disclosure: SSO components do
 *                       not exist yet; tablet/mobile baselines are
 *                       generated on first run; cross-OS hinting may
 *                       still produce intermittent failures.
 *
 * NOTE: These helpers run in the Node test environment (Vitest). They are
 * NOT intended for use inside Playwright spec bodies — Playwright provides
 * its own `toHaveScreenshot` API that hooks into the browser-side capture
 * pipeline and stores baselines alongside the spec.
 *
 * No top-level side effects (no I/O, no `console.log`, no `await`).
 */

// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------

// `fs.promises` exposes the async filesystem API. `fs.readFile` is used to
// load PNG baselines; `fs.writeFile` + `fs.mkdir({ recursive: true })` is used
// to persist diff PNGs (which may live under a not-yet-created directory).
import { promises as fs } from 'node:fs';

// `dirname` is the only path utility this module needs — it derives the
// parent directory of a target file path so that `mkdir -p` can create the
// intermediate directory tree before the file is written.
import { dirname } from 'node:path';

// `PNG` from `pngjs@7.0.0` is both a class (`new PNG({ width, height })`) and
// a namespace exposing the static `sync.read`, `sync.write`, and `bitblt`
// helpers. `PNGWithMetadata` is the type returned by `PNG.sync.read` — it is
// `PNG & Metadata`, exposing dimensional information plus PNG chunk metadata.
import { PNG } from 'pngjs';

// `pixelmatch@7.2.0` exposes a single default-exported function that compares
// two equally-sized RGBA pixel buffers and writes a diff image in-place.
// The function returns the count of mismatched pixels (a non-negative number).
import pixelmatch from 'pixelmatch';

// -----------------------------------------------------------------------------
// Re-exports
// -----------------------------------------------------------------------------

/**
 * Re-export `PNG` so consumers don't need to import `pngjs` themselves.
 * This keeps `tests/visual/**\/*.spec.ts` imports tidy:
 *
 *   import { PNG, readPng, compareImages } from '@tests/utils/visual';
 *
 * Members exposed per the file schema: `sync.read`, `sync.write`, `bitblt`,
 * `data`, `width`, `height`.
 */
export { PNG };

/**
 * Re-export `PNGWithMetadata` (a TYPE-only export) so spec files that need
 * to annotate the result of `PNG.sync.read(...)` can do so without importing
 * `pngjs` directly.
 *
 * `PNGWithMetadata` is structurally equivalent to `PNG & Metadata` per the
 * `@types/pngjs@6.0.5` declarations bundled in this repository.
 */
export type { PNGWithMetadata } from 'pngjs';

// -----------------------------------------------------------------------------
// Constants and defaults
// -----------------------------------------------------------------------------

/**
 * Default per-pixel match threshold passed to pixelmatch.
 *
 * Pixelmatch's `threshold` parameter is a per-pixel YIQ distance threshold
 * in the closed interval [0, 1] — NOT an overall mismatch ratio. The value
 * 0.1 is the pixelmatch-recommended default that tolerates anti-aliasing
 * without losing sensitivity to real visual differences.
 *
 * Per AAP Section 0.10.2 (font-hinting tolerance) values up to ~0.2 are
 * acceptable for cross-OS comparisons; 0.1 is the conservative default.
 *
 * The `as const` annotation locks the literal type `0.1` so consumers can
 * tell at compile time which threshold was applied without consulting the
 * implementation.
 */
export const DEFAULT_PER_PIXEL_THRESHOLD = 0.1 as const;

/**
 * Default maximum overall mismatch ratio, expressed as a fraction of all
 * pixels in the canonical (width × height) image.
 *
 * Matches `playwright.config.ts`'s `expect.toHaveScreenshot.maxDiffPixelRatio`
 * per AAP Section 0.7.3 (`≤ 0.1% pixel mismatch with anti-alias tolerance`).
 * Keeping this value identical to Playwright's gate ensures offline
 * comparisons via `compareImages` agree with Playwright's `toHaveScreenshot`
 * verdict for the same pair of PNG buffers.
 */
export const DEFAULT_MAX_MISMATCH_RATIO = 0.001 as const;

/**
 * Default pixelmatch options applied to every `compareImages` call.
 *
 * Field-by-field rationale:
 *
 *   - `threshold`  — per-pixel YIQ tolerance; see `DEFAULT_PER_PIXEL_THRESHOLD`.
 *   - `includeAA`  — `false` → anti-aliased pixels are NOT counted as
 *                    differences. Per AAP Section 0.10.2 (font hinting
 *                    differs across operating systems and graphics
 *                    backends), excluding anti-aliasing prevents
 *                    cosmetic noise from triggering false positives.
 *   - `alpha`      — `0.1` → diff overlay opacity. Lower values produce
 *                    a more visible diff while still letting the
 *                    original image show through faintly for context.
 *   - `aaColor`    — `[255, 255, 0]` (yellow) → anti-aliased pixels
 *                    rendered in yellow in the diff PNG so they can be
 *                    visually distinguished from real differences.
 *   - `diffColor`  — `[255, 0, 0]` (red) → differing pixels rendered in
 *                    red in the diff PNG.
 *
 * `Object.freeze` provides shallow runtime immutability so an accidental
 * write to a field (in a misbehaving caller) fails loudly under strict
 * mode rather than silently mutating the shared defaults.
 *
 * NOT exported because the public override surface is the `CompareOptions`
 * interface; this constant is an implementation detail.
 */
interface PixelmatchDefaults {
    readonly threshold: number;
    readonly includeAA: boolean;
    readonly alpha: number;
    /**
     * RGB triple. Declared as a mutable `[r, g, b]` tuple so the value
     * can be passed directly to pixelmatch's options object without a
     * `readonly` → mutable cast (pixelmatch's `aaColor` parameter type
     * is `[number, number, number]`, not `readonly [...]`).
     *
     * The enclosing constant is `Object.freeze`-d so mutation attempts
     * fail at runtime in strict mode, providing the same protection
     * as a `readonly` annotation without the type incompatibility.
     */
    readonly aaColor: [number, number, number];
    readonly diffColor: [number, number, number];
}

const DEFAULT_PIXELMATCH_OPTIONS: PixelmatchDefaults = Object.freeze({
    threshold: DEFAULT_PER_PIXEL_THRESHOLD,
    includeAA: false,
    alpha: 0.1,
    // Tuple annotations on each literal are required because bare array
    // literals default to `number[]` and TypeScript will not auto-narrow
    // them to a tuple inside an `Object.freeze` call (which has type
    // signature `<T>(o: T): Readonly<T>` and infers `T` from the literal).
    aaColor: [255, 255, 0] satisfies [number, number, number],
    diffColor: [255, 0, 0] satisfies [number, number, number],
});

// -----------------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------------

/**
 * Result of comparing two PNG images.
 *
 * Every field is `readonly` because the structure represents a finalised
 * computation — callers that need to derive subsequent results should
 * construct a new object rather than mutating in-place.
 */
export interface CompareResult {
    /** Width of both images (asserted to match in `compareImages`). */
    readonly width: number;
    /** Height of both images (asserted to match in `compareImages`). */
    readonly height: number;
    /** Count of pixels that differ between `actual` and `expected`. */
    readonly mismatchedPixels: number;
    /**
     * Ratio of mismatched pixels to total pixels, in [0, 1]. Computed as
     * `mismatchedPixels / (width × height)`. Returns `0` when both
     * dimensions are zero (degenerate empty image), avoiding a division
     * by zero NaN.
     */
    readonly mismatchRatio: number;
    /**
     * Diff PNG with differing pixels highlighted in red (`diffColor`) and
     * anti-aliased pixels in yellow (`aaColor`, only present when
     * `includeAA: false`). Suitable for writing to disk via `writePng`
     * for visual triage.
     */
    readonly diff: PNG;
    /**
     * `true` iff `mismatchRatio <= maxDiffRatio`. The threshold is
     * captured at comparison time so the flag is stable across later
     * mutations to defaults or configuration.
     */
    readonly passed: boolean;
}

/**
 * Tunable options for `compareImages` / `compareImageFiles` /
 * `assertVisualMatch`. Every field is optional; omitting a field falls
 * back to the documented default constants above.
 *
 * The interface uses `readonly` everywhere because the options object
 * should be treated as configuration data, never as mutable state.
 *
 * Members exposed per the file schema: `perPixelThreshold`, `maxDiffRatio`,
 * `includeAA`.
 */
export interface CompareOptions {
    /**
     * Per-pixel YIQ tolerance forwarded to pixelmatch's `threshold` option.
     * Values close to 0 are strict (sub-pixel anti-aliasing counts as a
     * difference); values close to 1 are lenient (only macroscopic
     * differences register).
     *
     * Defaults to `DEFAULT_PER_PIXEL_THRESHOLD` (0.1) — the
     * pixelmatch-recommended sweet spot for AA-tolerant comparisons.
     */
    readonly perPixelThreshold?: number;
    /**
     * Maximum overall mismatch ratio in [0, 1]. The `passed` flag on the
     * returned `CompareResult` is `true` when `mismatchRatio` is at or
     * below this value.
     *
     * Defaults to `DEFAULT_MAX_MISMATCH_RATIO` (0.001 → 0.1%), matching
     * the Playwright `toHaveScreenshot` gate per AAP Section 0.7.3.
     */
    readonly maxDiffRatio?: number;
    /**
     * If `true`, anti-aliased pixels are counted as differences. Defaults
     * to `false` so font-hinting and sub-pixel anti-aliasing differences
     * across operating systems do NOT generate noise (AAP Section 0.10.2).
     *
     * Tests that need stricter behaviour (e.g., verifying that an icon
     * stroke pattern matches exactly) can opt in by setting this to
     * `true` and accepting the cross-OS volatility that follows.
     */
    readonly includeAA?: boolean;
}

// -----------------------------------------------------------------------------
// File I/O — `readPng` and `writePng`
// -----------------------------------------------------------------------------

/**
 * Read a PNG file from disk asynchronously and return its parsed `PNG`
 * object (with metadata such as `width`, `height`, `data` populated by
 * the pngjs codec).
 *
 * Implementation note: `PNG.sync.read` is itself synchronous, but the
 * surrounding I/O (`fs.readFile`) is async. This function presents an
 * async-shaped API so callers don't need to mix sync and async
 * patterns — and so the function can be awaited inside Vitest's async
 * test bodies without blocking the event loop on disk I/O.
 *
 * @param filePath - Absolute or repository-relative path to a PNG file.
 * @returns The parsed PNG object. The return type is widened to `PNG`
 *          (rather than `PNGWithMetadata`) because the file schema's
 *          `readPng` export does not commit consumers to the additional
 *          metadata fields; consumers that need them can assert via
 *          `PNGWithMetadata` from the re-export above.
 *
 * @throws Error  — propagates `fs.readFile` errors (`ENOENT` for a
 *                  missing file, `EACCES` for a permission denial, etc.)
 *                  and `PNG.sync.read` errors for malformed PNG data.
 */
export async function readPng(filePath: string): Promise<PNG> {
    const buffer = await fs.readFile(filePath);
    // `PNG.sync.read` mutates a fresh PNG instance with the decoded pixel
    // buffer and chunk metadata, then returns it. The returned object's
    // `data` is a Node `Buffer` of length width × height × 4 (RGBA).
    return PNG.sync.read(buffer);
}

/**
 * Write a PNG object to disk, creating intermediate directories as
 * needed. Mirrors `mkdir -p` + `cp` semantics so callers never have to
 * pre-create the target directory tree.
 *
 * Implementation note: `fs.mkdir(..., { recursive: true })` is a no-op
 * when the directory already exists, so calling it unconditionally is
 * safe and cheaper than a pre-check.
 *
 * @param filePath - Target path for the PNG. The parent directory is
 *                   created recursively if it does not exist.
 * @param png      - The PNG instance to encode and write.
 *
 * @throws Error  — propagates `fs.mkdir` errors (e.g., `EACCES` on a
 *                  read-only filesystem) and `fs.writeFile` errors
 *                  (e.g., `ENOSPC` when the disk is full).
 */
export async function writePng(filePath: string, png: PNG): Promise<void> {
    // Ensure the parent directory exists before attempting the write.
    // `dirname('/tmp/foo/bar.png')` → '/tmp/foo'. On Windows the same
    // call returns 'C:\\tmp\\foo' (path separators preserved).
    await fs.mkdir(dirname(filePath), { recursive: true });

    // Encode the PNG synchronously to a Buffer, then commit the buffer to
    // disk asynchronously. The two-step pattern avoids holding a stream
    // open across the async boundary, simplifying error handling.
    const buffer = PNG.sync.write(png);
    await fs.writeFile(filePath, buffer);
}

// -----------------------------------------------------------------------------
// In-memory comparison — `compareImages`
// -----------------------------------------------------------------------------

/**
 * Compare two PNG objects pixel-by-pixel and return statistics plus a
 * diff PNG with offending pixels highlighted.
 *
 * Behaviour:
 *
 *   1. Throws if `actual` and `expected` have different dimensions —
 *      dimension mismatches are never acceptable per AAP Section 0.7.3
 *      because baselines are stored at canonical viewport sizes (AAP
 *      Section 0.4.5). Silently scaling images would mask real
 *      regressions.
 *   2. Constructs a zero-initialised diff PNG of the same dimensions.
 *   3. Invokes `pixelmatch` to populate the diff buffer and return the
 *      mismatched-pixel count.
 *   4. Computes the mismatch ratio (mismatched / total) with a guard
 *      against division by zero for degenerate `(0, 0)` images.
 *   5. Returns the full `CompareResult` including the `passed` verdict
 *      against the configured `maxDiffRatio`.
 *
 * @param actual   - The PNG produced by the current run (typically the
 *                   output of a Playwright screenshot or rendered DOM
 *                   capture).
 * @param expected - The PNG baseline loaded from
 *                   `tests/visual/baselines/**`.
 * @param options  - Optional comparison tuning.
 *
 * @returns A `CompareResult` describing the comparison.
 *
 * @throws Error  — when image dimensions disagree.
 */
export function compareImages(
    actual: PNG,
    expected: PNG,
    options: CompareOptions = {},
): CompareResult {
    // Dimension parity is a hard precondition. The error message echoes
    // both sets of dimensions so the developer can immediately see which
    // side drifted (commonly the baseline was captured at a different
    // device pixel ratio or viewport size).
    if (actual.width !== expected.width || actual.height !== expected.height) {
        throw new Error(
            `Image dimensions mismatch: actual ${actual.width}x${actual.height} ` +
                `vs expected ${expected.width}x${expected.height}. ` +
                `Visual baselines must match the canonical viewport (AAP Section 0.7.3).`,
        );
    }

    // Capture dimensions in locals so subsequent reads are stable even
    // if `actual` is later mutated (defensive — pngjs does not mutate
    // width/height after construction but the local-binding pattern is
    // a cheap insurance policy).
    const width = actual.width;
    const height = actual.height;

    // Allocate the diff PNG. `new PNG({ width, height })` zero-fills the
    // `data` buffer to length `width × height × 4` (RGBA). pixelmatch
    // mutates this buffer in place with the diff visualisation.
    const diff = new PNG({ width, height });

    // Resolve effective options, falling back to the documented defaults
    // when a field is `undefined`. The `??` operator (not `||`) is used
    // so the literal `0` and `false` are preserved when callers
    // intentionally opt into them.
    const perPixelThreshold = options.perPixelThreshold ?? DEFAULT_PIXELMATCH_OPTIONS.threshold;
    const includeAA = options.includeAA ?? DEFAULT_PIXELMATCH_OPTIONS.includeAA;
    const maxDiffRatio = options.maxDiffRatio ?? DEFAULT_MAX_MISMATCH_RATIO;

    const totalPixels = width * height;

    // Short-circuit zero-area images BEFORE invoking pixelmatch. pixelmatch
    // rejects empty / non-Buffer pixel arrays (`Image data: Uint8Array,
    // Uint8ClampedArray or Buffer expected`), and an empty image is a
    // degenerate but valid input — two empty PNGs are trivially equal.
    // Returning early here avoids that runtime rejection and produces a
    // sensible `passed: true, mismatchedPixels: 0` result.
    if (totalPixels === 0) {
        return {
            width,
            height,
            mismatchedPixels: 0,
            mismatchRatio: 0,
            diff,
            passed: 0 <= maxDiffRatio,
        };
    }

    // Invoke pixelmatch. The three buffers (`actual.data`, `expected.data`,
    // `diff.data`) are `Buffer` instances from pngjs; `Buffer` extends
    // `Uint8Array` in Node's type declarations, so they satisfy
    // pixelmatch's `Uint8Array | Uint8ClampedArray` parameter type.
    //
    // The diff buffer is mutated in place and the return value is the
    // count of mismatched pixels (a non-negative integer ≤ width × height).
    const mismatchedPixels = pixelmatch(actual.data, expected.data, diff.data, width, height, {
        threshold: perPixelThreshold,
        includeAA,
        alpha: DEFAULT_PIXELMATCH_OPTIONS.alpha,
        aaColor: DEFAULT_PIXELMATCH_OPTIONS.aaColor,
        diffColor: DEFAULT_PIXELMATCH_OPTIONS.diffColor,
    });

    const mismatchRatio = mismatchedPixels / totalPixels;
    const passed = mismatchRatio <= maxDiffRatio;

    return {
        width,
        height,
        mismatchedPixels,
        mismatchRatio,
        diff,
        passed,
    };
}

// -----------------------------------------------------------------------------
// File-based comparison — `compareImageFiles`
// -----------------------------------------------------------------------------

/**
 * Convenience wrapper around `compareImages` that:
 *
 *   1. Reads both PNGs from disk concurrently via `Promise.all`.
 *   2. Delegates to `compareImages` for the comparison itself.
 *   3. Optionally writes the diff PNG to a configurable path.
 *
 * Diff-PNG-write behaviour:
 *   - When `diffPath` is provided, the diff PNG is written
 *     UNCONDITIONALLY (both on pass and on fail). This is intentional —
 *     callers can inspect the diff for "near-miss" passes (mismatch
 *     ratios just under the threshold) and post-hoc audit reasons for
 *     a pass.
 *   - When `diffPath` is omitted, no disk write occurs; the diff PNG
 *     is still available in memory on the returned `CompareResult`.
 *
 * The concurrent read via `Promise.all` overlaps the two disk reads;
 * for large baselines (e.g., 2880×2048 @ ~16 MB unpacked) this halves
 * wall-clock time compared to sequential reads.
 *
 * @param actualPath   - Path to the actual PNG (produced by current run).
 * @param expectedPath - Path to the expected baseline PNG.
 * @param diffPath     - Optional path to write the diff PNG to.
 * @param options      - Optional comparison tuning passed through to
 *                       `compareImages`.
 *
 * @returns A `CompareResult` from `compareImages` (the result is
 *          unaffected by whether the diff was persisted).
 *
 * @throws Error — propagates `readPng` errors (missing file, permission,
 *                 malformed PNG), `compareImages` errors (dimension
 *                 mismatch), and `writePng` errors (e.g., write failure
 *                 when `diffPath` is supplied).
 */
export async function compareImageFiles(
    actualPath: string,
    expectedPath: string,
    diffPath?: string,
    options?: CompareOptions,
): Promise<CompareResult> {
    // Concurrent read. If either read fails, `Promise.all` rejects with
    // the first error encountered, which is then surfaced to the caller.
    const [actual, expected] = await Promise.all([readPng(actualPath), readPng(expectedPath)]);

    // `options` may be `undefined`; `compareImages` accepts an optional
    // `options` parameter with a default of `{}` so we forward it
    // verbatim. `exactOptionalPropertyTypes: true` in tsconfig.json means
    // we MUST forward the argument explicitly rather than spreading
    // `undefined`.
    const result =
        options === undefined
            ? compareImages(actual, expected)
            : compareImages(actual, expected, options);

    // Persist the diff PNG when a path was supplied. The write is
    // unconditional (pass or fail) per the function's documented
    // behaviour — callers can clean up if they only care about
    // diff-on-failure.
    if (diffPath !== undefined) {
        await writePng(diffPath, result.diff);
    }

    return result;
}

// -----------------------------------------------------------------------------
// Vitest-friendly assertion — `assertVisualMatch`
// -----------------------------------------------------------------------------

/**
 * Assert that two PNG files match within the configured threshold. The
 * test-author-facing primitive for visual regression checks performed
 * from inside a Vitest test body.
 *
 * Failure mode:
 *   - Throws an `Error` with a descriptive message that includes the
 *     mismatched-pixel count, the mismatch ratio (as a percentage to
 *     four decimal places), the configured threshold (also as a
 *     percentage), and the actual + expected file paths. Vitest's
 *     reporter captures the error and surfaces it as a test failure.
 *
 *   - When `diffPath` was supplied, the message also includes the path
 *     where the diff PNG was written so the developer can `open` it
 *     immediately from the terminal.
 *
 * Success mode:
 *   - Returns `void` silently. The diff PNG (if `diffPath` was
 *     supplied) was written prior to the success path being taken;
 *     callers that only care about diff-on-failure should omit
 *     `diffPath` and call `compareImageFiles` directly with a
 *     post-failure write.
 *
 * @example
 *   await assertVisualMatch(
 *       'test-results/actual/signin-a.png',
 *       'tests/visual/baselines/desktop/signin-a-microsoft-only.png',
 *       'test-results/diff/signin-a.png',
 *   );
 *
 * @param actualPath   - Path to the actual PNG.
 * @param expectedPath - Path to the expected baseline PNG.
 * @param diffPath     - Optional path to write the diff PNG to (on both
 *                       pass and fail; see `compareImageFiles`).
 * @param options      - Optional comparison tuning.
 *
 * @throws Error — when `result.passed === false`, OR propagated from
 *                 `compareImageFiles` (file I/O or dimension mismatch).
 */
export async function assertVisualMatch(
    actualPath: string,
    expectedPath: string,
    diffPath?: string,
    options?: CompareOptions,
): Promise<void> {
    // Delegate the comparison + diff-write to `compareImageFiles`. The
    // explicit `if/else` here is necessary because `compareImageFiles`
    // has `(actualPath, expectedPath, diffPath?, options?)` arity and
    // we must avoid passing `undefined` for trailing optional arguments
    // under `exactOptionalPropertyTypes: true`.
    let result: CompareResult;
    if (diffPath === undefined && options === undefined) {
        result = await compareImageFiles(actualPath, expectedPath);
    } else if (options === undefined) {
        result = await compareImageFiles(actualPath, expectedPath, diffPath);
    } else if (diffPath === undefined) {
        // Forward an `undefined` placeholder for `diffPath` is forbidden
        // under exactOptionalPropertyTypes, so we route through a path
        // that omits the trailing positional argument entirely.
        result = await compareImageFiles(actualPath, expectedPath, undefined, options);
    } else {
        result = await compareImageFiles(actualPath, expectedPath, diffPath, options);
    }

    if (!result.passed) {
        // Format the mismatch ratio as a percentage with four decimal
        // places. `toFixed(4)` is precise enough to distinguish a
        // near-miss (e.g., 0.0011 ≈ "0.1100%") from a clear failure
        // (e.g., 0.5 → "50.0000%").
        const ratioPercent = (result.mismatchRatio * 100).toFixed(4);

        // Resolve the effective threshold from options so the error
        // message reflects the actual gate that failed (not the
        // module-level default, which may differ if the caller passed
        // a custom `maxDiffRatio`).
        const threshold = options?.maxDiffRatio ?? DEFAULT_MAX_MISMATCH_RATIO;
        const thresholdPercent = (threshold * 100).toFixed(4);

        // Conditionally include the diff-PNG path in the message — only
        // useful when one was actually written.
        const diffNote = diffPath === undefined ? '' : `\n  diff PNG written to: ${diffPath}`;

        throw new Error(
            `Visual regression failure: ${result.mismatchedPixels} mismatched pixels ` +
                `(${ratioPercent}%) exceeds threshold ${thresholdPercent}%.\n` +
                `  actual:   ${actualPath}\n` +
                `  expected: ${expectedPath}` +
                diffNote,
        );
    }
}

// -----------------------------------------------------------------------------
// Region cropping — `cropPng`
// -----------------------------------------------------------------------------

/**
 * Crop a rectangular region from a PNG, returning a new PNG containing
 * only the cropped pixels. The source PNG is NOT mutated.
 *
 * Coordinate semantics: inclusive on the top-left, exclusive on the
 * bottom-right (matching DOM `DOMRect` and CSS pixel conventions). A
 * region at `(0, 0, width, height)` therefore returns a full-image copy.
 *
 * Implementation: uses `PNG.bitblt` — the only zero-overhead static
 * blit operation in the pngjs API. Avoids the temporary allocation that
 * a manual row-by-row buffer copy would incur. The destination PNG is
 * pre-allocated with `new PNG({ width, height })` so its `data` buffer
 * is zero-initialised before the blit overwrites the relevant region.
 *
 * Typical use case: comparing only a sub-region of a screenshot against
 * a region-specific baseline (e.g., asserting that a tooltip's bounding
 * box rendered correctly without recomputing the entire screenshot
 * diff).
 *
 * @param source - The source PNG. NOT mutated by this function.
 * @param x      - Left edge of the crop region in pixels (inclusive).
 * @param y      - Top edge of the crop region in pixels (inclusive).
 * @param width  - Width of the crop region in pixels.
 * @param height - Height of the crop region in pixels.
 *
 * @returns A new PNG containing the cropped pixels.
 *
 * @throws Error — when the region exceeds the source image bounds (any
 *                 of `x < 0`, `y < 0`, `x + width > source.width`,
 *                 `y + height > source.height`).
 */
export function cropPng(source: PNG, x: number, y: number, width: number, height: number): PNG {
    // Bounds check — fails fast with a precise error message so callers
    // can correlate the crop region with their expectation. Negative
    // coordinates and overflowing widths/heights are both caught here.
    if (x < 0 || y < 0 || x + width > source.width || y + height > source.height) {
        throw new Error(
            `Crop region (x=${x}, y=${y}, w=${width}, h=${height}) exceeds source ` +
                `bounds (${source.width}x${source.height}).`,
        );
    }

    // Allocate the destination PNG with zero-initialised pixel data,
    // then blit the source region into the top-left corner of the
    // destination. The static `PNG.bitblt` signature is:
    //   PNG.bitblt(src, dst, srcX, srcY, width, height, dstX, dstY).
    const cropped = new PNG({ width, height });
    PNG.bitblt(source, cropped, x, y, width, height, 0, 0);
    return cropped;
}
