/**
 * Computed-style assertion helpers for design tokens.
 *
 * This module is the bridge between the Figma-authoritative token table
 * (`tests/fixtures/design-tokens.ts`) and the DOM-level assertions in
 * component tests. Every helper reads from `getComputedStyle(element)`
 * and compares the result to the matching token value with semantic
 * (not byte-equal) comparison so the same assertion works across
 * Chromium, Firefox, and WebKit despite their differing computed-style
 * normalisation rules.
 *
 * --------------------------------------------------------------------------
 * Token-key types covered
 * --------------------------------------------------------------------------
 *
 * Per the QA Issue 3 contract this file must provide an assertion helper
 * for each of the nine mandatory token-key types exported by
 * `tests/fixtures/design-tokens.ts`:
 *
 *   - ColorTokenKey         → `expectColorToken`
 *   - GradientTokenKey      → `expectGradientToken`
 *   - FontSizeTokenKey      → `expectFontSizeToken`
 *   - FontWeightTokenKey    → `expectFontWeightToken`
 *   - LineHeightTokenKey    → `expectLineHeightToken`
 *   - LetterSpacingTokenKey → `expectLetterSpacingToken`
 *   - SpacingTokenKey       → `expectSpacingToken`
 *   - RadiusTokenKey        → `expectRadiusToken`
 *   - ShadowTokenKey        → `expectShadowToken`
 *
 * Plus utility helpers `expectFontFamily` (no key-type because there is
 * only one canonical family) and a generic `getComputedTokenValue` that
 * surfaces the raw computed value of a CSS property so specs can do
 * one-off assertions when the token-key helpers do not fit.
 *
 * --------------------------------------------------------------------------
 * Browser computed-style quirks (the reason every helper exists)
 * --------------------------------------------------------------------------
 *
 *   - Color: `getComputedStyle` returns `rgb(R, G, B)` or `rgba(R, G, B, A)`
 *     even when the source was a hex `#RRGGBB`. The helper normalises both
 *     sides to a canonical `r,g,b,a` tuple before comparison.
 *
 *   - Gradient: Chrome returns `linear-gradient(270deg, rgb(65, 1, 219) 14%, ...)`
 *     (drops the explicit `rgba(...)` alpha-1) while Firefox sometimes
 *     adds extra spaces around commas. The helper normalises whitespace
 *     and converts every color stop to `r,g,b,a` tuples before comparing.
 *
 *   - Font-weight: returned as a string like `"600"`. The helper compares
 *     `Number(computed)` to the numeric token.
 *
 *   - Line-height: returned in px even when authored as a percentage.
 *     The helper normalises both sides to numbers-of-px.
 *
 *   - Letter-spacing: returned in px. Comparison tolerates rounding
 *     errors within ±0.05 px because Figma exports fractional px values
 *     (e.g., -0.30px) that browsers may snap to display pixels.
 *
 *   - Box-shadow: Chrome returns `rgba(16, 24, 40, 0.04) 0px 8px 8px -4px,
 *     rgba(16, 24, 40, 0.1) 0px 20px 24px -4px` — the color appears BEFORE
 *     the offset/blur/spread (the reverse of the authored order). The
 *     helper normalises by parsing each shadow layer and comparing the
 *     unordered set of layers.
 *
 * --------------------------------------------------------------------------
 * Authority
 * --------------------------------------------------------------------------
 *   - AAP Section 0.4.2 — Test case blueprints (computed-style assertions).
 *   - AAP Section 0.5.1 — File row for `tests/utils/tokens.ts`.
 *   - AAP Section 0.10.2 — Visual parity with Figma.
 *   - QA Issue 3 — File missing.
 *   - Design tokens contract on `tests/fixtures/design-tokens.ts` line 578.
 */

import { expect } from 'vitest';
import {
    COLOR_TOKENS,
    type ColorTokenKey,
    FONT_FAMILY_TOKENS,
    FONT_SIZE_TOKENS,
    type FontSizeTokenKey,
    FONT_WEIGHT_TOKENS,
    type FontWeightTokenKey,
    GRADIENT_TOKENS,
    type GradientTokenKey,
    LETTER_SPACING_TOKENS,
    type LetterSpacingTokenKey,
    LINE_HEIGHT_TOKENS,
    type LineHeightTokenKey,
    RADIUS_TOKENS,
    type RadiusTokenKey,
    SHADOW_TOKENS,
    type ShadowTokenKey,
    SPACING_TOKENS,
    type SpacingTokenKey,
} from '@tests/fixtures/design-tokens';

// =============================================================================
// LOW-LEVEL COMPUTED-STYLE ACCESS
// =============================================================================

/**
 * Tolerance for floating-point comparisons of px values.
 *
 * Browsers snap fractional px to display pixels so a value authored as
 * -0.30px may be reported back as -0.3px or -0.296875px depending on
 * the rendering engine. 0.05px is the smallest tolerance that absorbs
 * those rounding artifacts without permitting visually-meaningful drift.
 */
const PX_EPSILON = 0.05;

/**
 * Read a single CSS property from the element's computed style.
 *
 * Exposed publicly so test specs can perform one-off comparisons when
 * none of the token-key helpers fit (e.g., a property that is not yet
 * in the token table).
 *
 * @param element  The DOM element to inspect.
 * @param property The CSS property name (kebab-case, e.g., `'background-color'`).
 * @returns The computed value as a string (empty string if the element
 *          is detached or the property is unset).
 */
export function getComputedTokenValue(element: Element, property: string): string {
    return getComputedStyle(element).getPropertyValue(property).trim();
}

// =============================================================================
// COLOR NORMALISATION
// =============================================================================

/**
 * Internal RGBA tuple — the canonical form into which both the token
 * value and the computed-style value are normalised before comparison.
 *
 * Alpha defaults to 1 when the source did not specify one.
 */
interface RgbaTuple {
    r: number;
    g: number;
    b: number;
    a: number;
}

/**
 * Parse an arbitrary CSS color string into an `RgbaTuple`.
 *
 * Accepts:
 *   - `#RGB`     (e.g., `#5B3` → `r=85, g=51, b=51`)
 *   - `#RRGGBB`  (e.g., `#5B39F3`)
 *   - `#RGBA`    (rare; alpha as a single hex digit)
 *   - `#RRGGBBAA`
 *   - `rgb(R, G, B)` / `rgb(R G B)`
 *   - `rgba(R, G, B, A)` / `rgba(R G B / A)`
 *
 * Throws if the input does not match a recognised format — callers in
 * this file always feed it well-formed CSS so any throw indicates a
 * bug in this module or an unexpected computed-style output.
 *
 * @param raw The CSS color string to parse.
 * @returns The parsed `RgbaTuple`.
 */
export function normalizeColor(raw: string): RgbaTuple {
    const trimmed = raw.trim().toLowerCase();

    // -------------------------------------------------------------------------
    // Hex forms
    // -------------------------------------------------------------------------
    if (trimmed.startsWith('#')) {
        const hex = trimmed.slice(1);
        if (hex.length === 3 || hex.length === 4) {
            // Short-form: expand each digit to two by repeating it.
            const r = Number.parseInt(hex.charAt(0) + hex.charAt(0), 16);
            const g = Number.parseInt(hex.charAt(1) + hex.charAt(1), 16);
            const b = Number.parseInt(hex.charAt(2) + hex.charAt(2), 16);
            const a = hex.length === 4 ? Number.parseInt(hex.charAt(3) + hex.charAt(3), 16) / 255 : 1;
            return { r, g, b, a };
        }
        if (hex.length === 6 || hex.length === 8) {
            const r = Number.parseInt(hex.slice(0, 2), 16);
            const g = Number.parseInt(hex.slice(2, 4), 16);
            const b = Number.parseInt(hex.slice(4, 6), 16);
            const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
            return { r, g, b, a };
        }
        throw new Error(`Unrecognised hex color: ${raw}`);
    }

    // -------------------------------------------------------------------------
    // rgb()/rgba() forms — accept comma or whitespace as channel separator,
    // and either comma or `/` as the alpha separator (the CSS Color Level 4
    // syntax).
    // -------------------------------------------------------------------------
    const fnMatch = /^rgba?\(([^)]+)\)$/.exec(trimmed);
    if (fnMatch !== null) {
        // Replace `/` with `,` so we can split uniformly.
        const inside = fnMatch[1]?.replace(/\//g, ',') ?? '';
        const parts = inside.split(/[\s,]+/).filter((s) => s.length > 0);
        if (parts.length === 3 || parts.length === 4) {
            const r = Number.parseFloat(parts[0] ?? '0');
            const g = Number.parseFloat(parts[1] ?? '0');
            const b = Number.parseFloat(parts[2] ?? '0');
            // Alpha may be `0`-`1` (decimal) or `0%`-`100%` (percent).
            let a = 1;
            if (parts.length === 4) {
                const alphaToken = parts[3] ?? '1';
                a = alphaToken.endsWith('%')
                    ? Number.parseFloat(alphaToken.slice(0, -1)) / 100
                    : Number.parseFloat(alphaToken);
            }
            return { r, g, b, a };
        }
        throw new Error(`Unrecognised rgb/rgba color: ${raw}`);
    }

    // -------------------------------------------------------------------------
    // Named keyword `transparent` / `none` — only `transparent` is meaningful
    // here; `none` is handled by callers that recognise the absence of a
    // value.
    // -------------------------------------------------------------------------
    if (trimmed === 'transparent') {
        return { r: 0, g: 0, b: 0, a: 0 };
    }

    throw new Error(`Unrecognised color format: ${raw}`);
}

/**
 * Compare two RGBA tuples for visual equality.
 *
 * Channel values are integers (0-255) on both sides so byte-equality is
 * used for r/g/b. Alpha is a float so a small epsilon is applied.
 */
function rgbaEquals(a: RgbaTuple, b: RgbaTuple): boolean {
    return a.r === b.r && a.g === b.g && a.b === b.b && Math.abs(a.a - b.a) < 0.001;
}

// =============================================================================
// COLOR HELPERS
// =============================================================================

/**
 * Assert that the computed value of a CSS property on the given element
 * matches the named color token.
 *
 * Comparison is semantic (RGBA tuple) so token authoring style
 * (`#5B39F3`) and browser computed style (`rgb(91, 57, 243)`) are
 * treated as equivalent.
 *
 * @param element  The DOM element to inspect.
 * @param property The CSS property name (kebab-case).
 * @param key      The color-token key.
 *
 * @example
 *   expectColorToken(button, 'background-color', 'brand.primary');
 *   expectColorToken(input, 'border-color', 'border.default');
 */
export function expectColorToken(
    element: Element,
    property: string,
    key: ColorTokenKey,
): void {
    const expectedRaw = COLOR_TOKENS[key];
    const expected = normalizeColor(expectedRaw);
    const actualRaw = getComputedTokenValue(element, property);
    const actual = normalizeColor(actualRaw);
    expect(
        rgbaEquals(expected, actual),
        `Expected ${property} to match token "${key}" (${expectedRaw}) but received "${actualRaw}"`,
    ).toBe(true);
}

// =============================================================================
// GRADIENT HELPERS
// =============================================================================

/**
 * Parse the color stops out of a `linear-gradient(...)` string into a
 * normalised stop array.
 *
 * The returned array preserves stop order because a gradient with the
 * same colors in a different order is visually different. Each color
 * stop is normalised to `r,g,b,a` so authored `rgba(91, 57, 243, 1)`
 * compares equal to browser-emitted `rgb(91, 57, 243)`.
 *
 * Stop positions are kept as authored strings (`'14%'`, `'36%'`) because
 * Chrome and Firefox emit them verbatim without normalisation.
 */
interface GradientStop {
    color: RgbaTuple;
    position: string;
}

interface ParsedGradient {
    /** The angle declaration as authored, e.g., `'270deg'`. */
    angle: string;
    stops: GradientStop[];
}

/**
 * Parse a `linear-gradient(...)` string into a `ParsedGradient`.
 *
 * Only `linear-gradient` is supported — every gradient in the SSO token
 * table is linear. Radial / conic gradients would require additional
 * parsing logic that this module deliberately defers until needed.
 *
 * @param raw The CSS gradient string.
 * @returns The parsed structure.
 */
export function normalizeGradient(raw: string): ParsedGradient {
    const trimmed = raw.trim();
    const fnMatch = /^linear-gradient\(([^]*)\)$/.exec(trimmed);
    if (fnMatch === null) {
        throw new Error(`Unrecognised gradient format: ${raw}`);
    }
    const inside = fnMatch[1] ?? '';

    // Split top-level commas only — colors like `rgba(91, 57, 243, 1)`
    // contain inner commas that must NOT be treated as stop separators.
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of inside) {
        if (ch === '(') depth += 1;
        else if (ch === ')') depth -= 1;
        if (ch === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim().length > 0) {
        parts.push(current.trim());
    }

    if (parts.length < 2) {
        throw new Error(`Gradient has fewer than 2 parts: ${raw}`);
    }

    const angle = parts[0] ?? '0deg';
    const stops: GradientStop[] = [];
    for (let i = 1; i < parts.length; i += 1) {
        const stopRaw = parts[i] ?? '';
        // Find where the color expression ends — a color may be `rgba(...)` or
        // `rgb(...)` (with closing paren) or a hex `#...`. After the color,
        // any remaining text is the position.
        let colorEnd: number;
        if (stopRaw.startsWith('rgb')) {
            // Locate the closing paren of the rgb/rgba function.
            const closeIdx = stopRaw.indexOf(')');
            if (closeIdx === -1) {
                throw new Error(`Unterminated rgb stop: ${stopRaw}`);
            }
            colorEnd = closeIdx + 1;
        } else if (stopRaw.startsWith('#')) {
            // Hex color — extends until the first whitespace.
            const wsIdx = stopRaw.search(/\s/);
            colorEnd = wsIdx === -1 ? stopRaw.length : wsIdx;
        } else {
            throw new Error(`Unrecognised gradient stop color: ${stopRaw}`);
        }
        const colorStr = stopRaw.slice(0, colorEnd).trim();
        const positionStr = stopRaw.slice(colorEnd).trim();
        stops.push({ color: normalizeColor(colorStr), position: positionStr });
    }

    return { angle, stops };
}

/**
 * Compare two parsed gradients for visual equality.
 *
 * Order-sensitive on stops (same colors in different positions render
 * differently) but uses RGBA tuple equality so color authoring style
 * does not matter.
 */
function gradientEquals(a: ParsedGradient, b: ParsedGradient): boolean {
    if (a.angle !== b.angle) return false;
    if (a.stops.length !== b.stops.length) return false;
    for (let i = 0; i < a.stops.length; i += 1) {
        const sa = a.stops[i];
        const sb = b.stops[i];
        if (sa === undefined || sb === undefined) return false;
        if (!rgbaEquals(sa.color, sb.color)) return false;
        if (sa.position !== sb.position) return false;
    }
    return true;
}

/**
 * Assert that the computed value of a CSS property on the given element
 * matches the named gradient token.
 *
 * The property is typically `background-image` (the canonical home of
 * gradient backgrounds in CSS).
 *
 * @param element  The DOM element to inspect.
 * @param property The CSS property name.
 * @param key      The gradient-token key.
 *
 * @example
 *   expectGradientToken(panel, 'background-image', 'hero.panel');
 */
export function expectGradientToken(
    element: Element,
    property: string,
    key: GradientTokenKey,
): void {
    const expectedRaw = GRADIENT_TOKENS[key];
    const expected = normalizeGradient(expectedRaw);
    const actualRaw = getComputedTokenValue(element, property);
    const actual = normalizeGradient(actualRaw);
    expect(
        gradientEquals(expected, actual),
        `Expected ${property} to match gradient token "${key}" but received "${actualRaw}"`,
    ).toBe(true);
}

// =============================================================================
// TYPOGRAPHY HELPERS
// =============================================================================

/**
 * Parse a CSS px-suffixed length into a number.
 *
 * Tolerates whitespace and missing `px` suffix (the latter for unitless
 * line-heights, which are valid CSS).
 *
 * @param raw The CSS length string.
 * @returns The number of px (or the unitless multiplier).
 */
function parsePxValue(raw: string): number {
    const trimmed = raw.trim();
    if (trimmed.endsWith('px')) {
        return Number.parseFloat(trimmed.slice(0, -2));
    }
    return Number.parseFloat(trimmed);
}

/**
 * Assert two px-suffixed values are equal within `PX_EPSILON`.
 */
function expectPxEqual(actualRaw: string, expectedRaw: string, label: string): void {
    const actual = parsePxValue(actualRaw);
    const expected = parsePxValue(expectedRaw);
    expect(
        Math.abs(actual - expected) < PX_EPSILON,
        `Expected ${label} to be "${expectedRaw}" (${expected}px) but received "${actualRaw}" (${actual}px)`,
    ).toBe(true);
}

/**
 * Assert the computed `font-size` matches the named font-size token.
 *
 * @example
 *   expectFontSizeToken(heading, 'h1.signin');
 */
export function expectFontSizeToken(element: Element, key: FontSizeTokenKey): void {
    const expectedRaw = FONT_SIZE_TOKENS[key];
    const actualRaw = getComputedTokenValue(element, 'font-size');
    expectPxEqual(actualRaw, expectedRaw, `font-size for token "${key}"`);
}

/**
 * Assert the computed `font-weight` matches the named font-weight token.
 *
 * @example
 *   expectFontWeightToken(label, 'semibold');
 */
export function expectFontWeightToken(element: Element, key: FontWeightTokenKey): void {
    const expected = FONT_WEIGHT_TOKENS[key];
    const actualRaw = getComputedTokenValue(element, 'font-weight');
    const actual = Number(actualRaw);
    expect(
        actual === expected,
        `Expected font-weight to match token "${key}" (${expected}) but received "${actualRaw}"`,
    ).toBe(true);
}

/**
 * Assert the computed `line-height` matches the named line-height token.
 *
 * Browsers return `line-height` as a px value even when authored as a
 * percentage; both sides are normalised to px.
 *
 * @example
 *   expectLineHeightToken(heading, 'h1.signin');
 */
export function expectLineHeightToken(element: Element, key: LineHeightTokenKey): void {
    const expectedRaw = LINE_HEIGHT_TOKENS[key];
    const actualRaw = getComputedTokenValue(element, 'line-height');
    expectPxEqual(actualRaw, expectedRaw, `line-height for token "${key}"`);
}

/**
 * Assert the computed `letter-spacing` matches the named letter-spacing
 * token.
 *
 * Browsers return `letter-spacing: normal` when the authored value is
 * `0px`; the helper normalises `normal` to 0 before comparison so the
 * `'h5'` and `'button.large'` tokens (both `0px`) pass against either
 * computed form.
 *
 * @example
 *   expectLetterSpacingToken(heading, 'hero');
 */
export function expectLetterSpacingToken(
    element: Element,
    key: LetterSpacingTokenKey,
): void {
    const expectedRaw = LETTER_SPACING_TOKENS[key];
    const rawComputed = getComputedTokenValue(element, 'letter-spacing');
    // CSS spec: `letter-spacing: normal` is equivalent to `0px`.
    const actualRaw = rawComputed === 'normal' ? '0px' : rawComputed;
    expectPxEqual(actualRaw, expectedRaw, `letter-spacing for token "${key}"`);
}

/**
 * Assert the computed `font-family` contains the primary token family.
 *
 * The helper checks that the FIRST font family in the computed stack
 * is `Inter` (case-insensitive, quotes stripped), per the AAP § 0.10.2
 * mandate that Inter must appear first. The full fallback stack is not
 * compared because computed style may reorder fallback fonts.
 *
 * @example
 *   expectFontFamily(heading);
 */
export function expectFontFamily(element: Element): void {
    const computed = getComputedTokenValue(element, 'font-family');
    // First family — strip quotes, normalise case.
    const firstFamily = (computed.split(',')[0] ?? '').replace(/["']/g, '').trim().toLowerCase();
    const expectedFirst = (FONT_FAMILY_TOKENS.primary.split(',')[0] ?? '')
        .replace(/["']/g, '')
        .trim()
        .toLowerCase();
    expect(
        firstFamily === expectedFirst,
        `Expected first font-family to be "${expectedFirst}" but received "${firstFamily}" (full: "${computed}")`,
    ).toBe(true);
}

// =============================================================================
// SPACING HELPERS
// =============================================================================

/**
 * Assert that the named CSS spacing property matches the named spacing token.
 *
 * Common properties include `gap`, `padding`, `padding-top`,
 * `padding-bottom`, `padding-left`, `padding-right`, `margin*`, etc.
 *
 * @example
 *   expectSpacingToken(form, 'gap', 'form.gap');
 *   expectSpacingToken(button, 'padding-top', 'button.padding.y');
 */
export function expectSpacingToken(
    element: Element,
    property: string,
    key: SpacingTokenKey,
): void {
    const expectedRaw = SPACING_TOKENS[key];
    const actualRaw = getComputedTokenValue(element, property);
    expectPxEqual(actualRaw, expectedRaw, `${property} for token "${key}"`);
}

// =============================================================================
// RADIUS HELPERS
// =============================================================================

/**
 * Assert that the computed `border-radius` matches the named radius token.
 *
 * For uniform radii (every corner the same) the helper compares the
 * shorthand. For non-uniform radii (e.g., only top corners rounded) the
 * helper accepts a per-corner property name.
 *
 * @param element  The DOM element to inspect.
 * @param key      The radius-token key.
 * @param property Optional override for the property name; defaults to `'border-radius'`.
 *
 * @example
 *   expectRadiusToken(modal, 'modal');
 *   expectRadiusToken(button, 'button.large', 'border-top-left-radius');
 */
export function expectRadiusToken(
    element: Element,
    key: RadiusTokenKey,
    property: string = 'border-radius',
): void {
    const expectedRaw = RADIUS_TOKENS[key];
    const actualRaw = getComputedTokenValue(element, property);
    expectPxEqual(actualRaw, expectedRaw, `${property} for token "${key}"`);
}

// =============================================================================
// SHADOW HELPERS
// =============================================================================

/**
 * One parsed box-shadow layer.
 *
 * A computed box-shadow may have multiple layers; the helper compares
 * the unordered SET of layers because Chrome and Firefox emit them in
 * different orders.
 */
interface ShadowLayer {
    color: RgbaTuple;
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    inset: boolean;
}

/**
 * Parse a single box-shadow layer string into a `ShadowLayer`.
 *
 * Browsers emit layers in the form
 *   `rgba(R, G, B, A) Xpx Ypx Bpx Spx [inset]`
 * while authored CSS typically uses
 *   `Xpx Ypx Bpx Spx rgba(R, G, B, A) [inset]`
 *
 * This parser tolerates both orderings.
 *
 * @param raw The box-shadow layer string (single layer, no commas).
 * @returns The parsed `ShadowLayer`.
 */
function parseShadowLayer(raw: string): ShadowLayer {
    const trimmed = raw.trim();
    const isInset = /(^|\s)inset(\s|$)/.test(trimmed);
    const withoutInset = trimmed.replace(/(^|\s)inset(\s|$)/, ' ').trim();

    // Extract the color first — it is the only token that contains parens or
    // starts with `#`.
    let colorStr: string;
    let withoutColor: string;
    const rgbMatch = /(rgba?\([^)]*\))/.exec(withoutInset);
    const hexMatch = /(#[0-9a-fA-F]{3,8})/.exec(withoutInset);
    if (rgbMatch !== null) {
        colorStr = rgbMatch[1] ?? '';
        withoutColor = withoutInset.replace(rgbMatch[1] ?? '', '').trim();
    } else if (hexMatch !== null) {
        colorStr = hexMatch[1] ?? '';
        withoutColor = withoutInset.replace(hexMatch[1] ?? '', '').trim();
    } else {
        throw new Error(`Shadow layer missing color: ${raw}`);
    }

    const offsets = withoutColor
        .split(/\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    if (offsets.length < 2) {
        throw new Error(`Shadow layer needs at least offsetX and offsetY: ${raw}`);
    }
    const offsetX = parsePxValue(offsets[0] ?? '0');
    const offsetY = parsePxValue(offsets[1] ?? '0');
    const blur = offsets.length >= 3 ? parsePxValue(offsets[2] ?? '0') : 0;
    const spread = offsets.length >= 4 ? parsePxValue(offsets[3] ?? '0') : 0;
    return {
        color: normalizeColor(colorStr),
        offsetX,
        offsetY,
        blur,
        spread,
        inset: isInset,
    };
}

/**
 * Parse a complete box-shadow string into a list of layers.
 *
 * Splits on top-level commas only — colors like `rgba(16, 24, 40, 0.04)`
 * contain inner commas that must NOT be treated as layer separators.
 *
 * @param raw The complete box-shadow CSS value.
 * @returns The list of parsed layers (or empty list when raw is `'none'`).
 */
function parseShadow(raw: string): ShadowLayer[] {
    const trimmed = raw.trim();
    if (trimmed === 'none' || trimmed === '') {
        return [];
    }
    const layers: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of trimmed) {
        if (ch === '(') depth += 1;
        else if (ch === ')') depth -= 1;
        if (ch === ',' && depth === 0) {
            layers.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim().length > 0) {
        layers.push(current.trim());
    }
    return layers.map(parseShadowLayer);
}

/**
 * Compare two shadow-layer arrays for visual equality.
 *
 * Unordered comparison: a layer matches if there exists an unmatched
 * layer in the other set with the same color (RGBA), offsets, blur,
 * spread, and inset flag. Two distinct layers with identical values
 * are NOT collapsed — each requires its own match.
 */
function shadowEquals(a: ShadowLayer[], b: ShadowLayer[]): boolean {
    if (a.length !== b.length) return false;
    const taken = new Array<boolean>(b.length).fill(false);
    for (const layerA of a) {
        let matchedIdx = -1;
        for (let j = 0; j < b.length; j += 1) {
            if (taken[j]) continue;
            const layerB = b[j];
            if (layerB === undefined) continue;
            if (
                rgbaEquals(layerA.color, layerB.color) &&
                Math.abs(layerA.offsetX - layerB.offsetX) < PX_EPSILON &&
                Math.abs(layerA.offsetY - layerB.offsetY) < PX_EPSILON &&
                Math.abs(layerA.blur - layerB.blur) < PX_EPSILON &&
                Math.abs(layerA.spread - layerB.spread) < PX_EPSILON &&
                layerA.inset === layerB.inset
            ) {
                matchedIdx = j;
                break;
            }
        }
        if (matchedIdx === -1) return false;
        taken[matchedIdx] = true;
    }
    return true;
}

/**
 * Assert that the computed `box-shadow` matches the named shadow token.
 *
 * Unordered layer comparison — Chrome and Firefox emit the layers in
 * different orders so a strict-string comparison would be flaky.
 *
 * @example
 *   expectShadowToken(modal, 'modal.xl');
 */
export function expectShadowToken(element: Element, key: ShadowTokenKey): void {
    const expectedRaw = SHADOW_TOKENS[key];
    const expected = parseShadow(expectedRaw);
    const actualRaw = getComputedTokenValue(element, 'box-shadow');
    const actual = parseShadow(actualRaw);
    expect(
        shadowEquals(expected, actual),
        `Expected box-shadow to match token "${key}" but received "${actualRaw}" (parsed ${actual.length} layers, expected ${expected.length})`,
    ).toBe(true);
}
