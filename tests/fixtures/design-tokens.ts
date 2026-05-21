/**
 * Design tokens captured from Figma file `2qR7NSTmQLynkmlj9B4ltc`.
 *
 * This file is the SINGLE SOURCE OF TRUTH for every color, gradient,
 * typography spec, spacing value, radius, shadow, and layout dimension
 * referenced in the SSO test suite. Hard-coding hex strings or pixel values
 * in any other test file is FORBIDDEN by folder-level convention rule 1
 * and AAP Section 0.10.2.
 *
 * Imported by:
 *   - tests/utils/tokens.ts (computed-style assertion helpers)
 *   - tests/component/typography.test.tsx, spacing.test.tsx,
 *     colors.test.tsx, animations.test.tsx
 *   - tests/component/sso/**.test.tsx (per-component token assertions)
 *   - tests/a11y/contrast.test.tsx (WCAG contrast computations)
 *
 * NINE TOKEN-KEY TYPE ALIASES are exported so callers of token helpers
 * receive compile-time type checking on key names:
 *   ColorTokenKey, SpacingTokenKey, FontSizeTokenKey, FontWeightTokenKey,
 *   LineHeightTokenKey, LetterSpacingTokenKey, RadiusTokenKey,
 *   ShadowTokenKey, GradientTokenKey
 *
 * Authority:
 *   - AAP Section 0.1.1 (palette enumeration).
 *   - AAP Section 0.4.2 (Modal opens <200ms; SignIn-C expansion <250ms).
 *   - AAP Section 0.4.4 (fixture table — Design tokens row).
 *   - AAP Section 0.5.1 (file row — CREATE).
 *   - AAP Section 0.10.2 (no hard-coded hex strings in test specs).
 *   - AAP Section 0.10.3 (Figma-specific testing requirements — verbatim tokens).
 *   - Folder-level spec (color/typography/spacing/effects/layout tables).
 *
 * Figma source: file 2qR7NSTmQLynkmlj9B4ltc — frame nodes
 *   15001:41875 (Sign in A), 15001:41988 (Sign in B), 15001:42082 (Sign in C
 *   See more), 15001:42214 (Sign in C Expanded), 14980:28342 (Registration
 *   Completion), 15058:34569 (SignUp Error), 16383:42232 (Link Accounts MS),
 *   16383:42287 (Link Accounts Generic).
 *
 * Strict-mode compliance:
 *   - Every constant object literal carries `as const` so its values narrow
 *     to literal types (e.g., `'#5B39F3'` rather than `string`).
 *   - Each `*_TOKENS` constant is the source of a `keyof typeof` type alias.
 *   - The `tokens` root constant is `as const`, so
 *     `Tokens['color']['brand.primary']` resolves to the literal `'#5B39F3'`.
 *   - No `any`, no implicit `undefined`, no `Date.now()`, no `Math.random()`,
 *     no factory functions, no module-level side effects, NO imports.
 */

// =============================================================================
// PHASE 2 — COLOR TOKENS
// =============================================================================

/**
 * Color palette captured from Figma globalVars `fill_*` tokens that are
 * CONFIRMED (visually active in the rendered designs). HIDDEN fill tokens
 * are excluded per the Image-First Observation Protocol.
 *
 * Naming convention: `<namespace>.<role>` dot-separated keys. The dot
 * notation produces a flat record (TypeScript keys must be strings); the
 * dot itself is part of the key, not a nested-object path.
 *
 * Palette sourced from AAP Section 0.1.1:
 *   `#5B39F3` primary purple, `#FFFFFF`, `#000000`, `#333333`, `#999999`,
 *   `#D9D9D9`, `#F5F5F5`, `#010101`.
 *
 * Semantic aliases mirror the Figma usage so a single hex value can be
 * referenced by either its raw neutral name (`neutral.white`) or its
 * semantic role (`background.page`). This duplication is intentional:
 * tests assert intent (`text.body`) not raw color (`#333333`).
 */
export const COLOR_TOKENS = {
    // Brand
    'brand.primary': '#5B39F3',

    // Neutrals (palette per AAP Section 0.1.1)
    'neutral.white': '#FFFFFF',
    'neutral.black': '#000000',
    'neutral.nearBlack': '#010101',
    'neutral.dark': '#333333',
    'neutral.muted': '#999999',
    'neutral.border': '#D9D9D9',
    'neutral.surface': '#F5F5F5',

    // Semantic aliases (canonical mapping per Figma usage)
    'text.primary': '#010101',
    'text.body': '#333333',
    'text.muted': '#999999',
    'text.inverse': '#FFFFFF',
    'background.page': '#FFFFFF',
    'background.surface': '#F5F5F5',
    'border.default': '#D9D9D9',
    'border.focus': '#5B39F3',
    'button.primary.background': '#5B39F3',
    'button.primary.text': '#FFFFFF',
    'button.secondary.background': '#FFFFFF',
    'button.secondary.text': '#5B39F3',
    'button.secondary.border': '#5B39F3',
    'social.background': '#F5F5F5',
    'social.text': '#010101',
    'modal.background': '#FFFFFF',
} as const;

/**
 * Dot-separated key set for every color token.
 *
 * Exported separately so callers of helpers in tests/utils/tokens.ts
 * receive autocomplete and compile-time checks.
 */
export type ColorTokenKey = keyof typeof COLOR_TOKENS;

// =============================================================================
// PHASE 3 — GRADIENT TOKENS
// =============================================================================

/**
 * Gradient tokens captured VERBATIM from AAP Section 0.10.3.
 *
 * NOTE on browser-rendered string format: getComputedStyle on Chrome /
 * Firefox / WebKit returns `rgb(R, G, B)` rather than `rgba(R, G, B, 1)`
 * when alpha is 1, and may normalise stop positions. Tests must compare
 * semantically via `normalizeGradient()` in tests/utils/tokens.ts — never
 * byte-equal — against the AUTHORED strings below.
 *
 * The values below are the AUTHORITATIVE source strings as authored in
 * CSS. They are the literal text that documentation and code review
 * compare against; the helper is responsible for normalising computed
 * output to match these.
 *
 * - hero.panel — applied to the "Story" marketing panel background on
 *   Sign in A/B/C and Registration Completion frames.
 * - days.accent — applied as a `background-clip: text` accent on the
 *   "Days" hero word.
 */
export const GRADIENT_TOKENS = {
    'hero.panel':
        'linear-gradient(270deg, rgba(65, 1, 219, 1) 14%, rgba(91, 57, 243, 1) 36%, rgba(7, 255, 151, 1) 82%)',
    'days.accent':
        'linear-gradient(270deg, rgba(91, 57, 243, 1) 31%, rgba(148, 250, 213, 1) 44%, rgba(7, 255, 151, 1) 51%)',
} as const;

/**
 * Dot-separated key set for every gradient token.
 */
export type GradientTokenKey = keyof typeof GRADIENT_TOKENS;

// =============================================================================
// PHASE 4 — TYPOGRAPHY TOKENS
// =============================================================================

/**
 * Font family — Inter, loaded via @fontsource/inter. Includes the standard
 * system-font fallback stack so layouts remain stable if Inter fails to
 * load.
 *
 * The string is the canonical CSS font-family declaration. Per AAP
 * Section 0.10.2 ("Inter font is mandatory"), Inter must appear FIRST and
 * a system-font fallback (BlinkMacSystemFont, Segoe UI, ...) must follow.
 *
 * The fallback uses Apple/Microsoft system fonts per industry-standard
 * convention. If the implementation cycle prefers a different fallback
 * (e.g., Helvetica), the helper's comparison must be tolerant.
 */
export const FONT_FAMILY_TOKENS = {
    primary:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

/**
 * Font sizes per AAP folder-level spec and AAP Section 0.1.1.
 *
 *   hero          = 62.78px (the marketing-panel headline; literal Figma
 *                            export of a 62.7826...px frame measurement —
 *                            do NOT round to 63px because visual baseline
 *                            diffing is pixel-sensitive)
 *   h1.signin     = 32px    (the "Sign in" heading)
 *   h5            = 24px    (subsection headings inside login panel)
 *   button.large  = 18px    (Button/Large per Figma component 4069:21592)
 *   body          = 16px    (default body copy)
 *   small         = 14px    (footer links, subtitle copy)
 *   xs            = 12px    (legalese)
 */
export const FONT_SIZE_TOKENS = {
    hero: '62.78px',
    'h1.signin': '32px',
    h5: '24px',
    'button.large': '18px',
    body: '16px',
    small: '14px',
    xs: '12px',
} as const;

/**
 * Dot-separated key set for every font-size token.
 */
export type FontSizeTokenKey = keyof typeof FONT_SIZE_TOKENS;

/**
 * Font weights per AAP folder-level spec.
 *
 * Stored as numbers (not strings) because `getComputedStyle` returns
 * `font-weight` as a string of digits — the assertion helper compares
 * `Number(computed)` to these tokens.
 *
 * 400 (Regular) and 600 (Semi Bold) are the ONLY weights Figma uses on
 * the eight SSO frames; adding others (e.g., 700 Bold) would silently
 * permit drift from the design.
 */
export const FONT_WEIGHT_TOKENS = {
    regular: 400,
    semibold: 600,
} as const;

/**
 * Key set for every font-weight token.
 */
export type FontWeightTokenKey = keyof typeof FONT_WEIGHT_TOKENS;

/**
 * Line heights captured from Figma text-style tokens.
 *
 * Stored as CSS `line-height` strings (px values). The helper in
 * tests/utils/tokens.ts may also accept unitless ratios. Conventions:
 *   - Headings (hero, h1.signin, h5, button.large): 1.2x ratio.
 *   - Body / small / xs: 1.5x ratio.
 *
 * The 1.2 / 1.5 ratios are industry-standard typographic conventions
 * and match what Figma exports for Inter text styles in this file.
 */
export const LINE_HEIGHT_TOKENS = {
    hero: '75.34px', // 1.2 ratio of 62.78px
    'h1.signin': '38.4px', // 1.2 ratio of 32px
    h5: '28.8px', // 1.2 ratio of 24px
    'button.large': '21.6px', // 1.2 ratio of 18px
    body: '24px', // 1.5 ratio of 16px
    small: '21px', // 1.5 ratio of 14px
    xs: '18px', // 1.5 ratio of 12px
} as const;

/**
 * Dot-separated key set for every line-height token.
 */
export type LineHeightTokenKey = keyof typeof LINE_HEIGHT_TOKENS;

/**
 * Letter spacing values captured from Figma text-style tokens.
 *
 * Figma exports tracking as a percentage; CSS uses px. The values below
 * are the px equivalents at the corresponding font size:
 *
 *   hero       : -0.628px = -1% of 62.78px (slight negative tracking
 *                                           tightens hero display type)
 *   h1.signin  : -0.32px  = -1% of 32px    (matches Figma "tracking -1%")
 *   h5         : 0px      = default tracking
 *   button.*   : 0px      = default tracking
 *   body / s   : 0px      = default tracking
 *
 * If the implementation chooses to express letter-spacing in `em` units
 * (e.g., `letter-spacing: -0.01em`), the helper in tests/utils/tokens.ts
 * must convert before comparing.
 */
export const LETTER_SPACING_TOKENS = {
    hero: '-0.628px', // -1% of 62.78px
    'h1.signin': '-0.32px', // -1% of 32px
    h5: '0px',
    'button.large': '0px',
    body: '0px',
    small: '0px',
    xs: '0px',
} as const;

/**
 * Dot-separated key set for every letter-spacing token.
 */
export type LetterSpacingTokenKey = keyof typeof LETTER_SPACING_TOKENS;

// =============================================================================
// PHASE 5 — SPACING TOKENS
// =============================================================================

/**
 * Spacing tokens per AAP folder-level spec.
 *
 * Two complementary scales:
 *
 *   1. Base 4-pt grid (`space.0` through `space.8`) — the universal scale
 *      to fall back on when no semantic name exists.
 *   2. Semantic spacing (`form.gap`, `button.gap`, `login.gap`, etc.) —
 *      the canonical name to use in component tests; aliases a value in
 *      the base scale.
 *
 * Authoritative measurements per AAP folder-level spec:
 *   - 24px gap inside Form    -> form.gap
 *   - 16px gap inside Buttons -> button.gap
 *   - 32px gap inside Login   -> login.gap
 *   - 12px x 24px padding on Buttons
 *     (Button/Large = 12px vertical, 24px horizontal) ->
 *     button.padding.y / button.padding.x
 *   - 8px x 16px padding on TextInputs
 *     (TextInput = 8px vertical, 16px horizontal) ->
 *     input.padding.y / input.padding.x
 *
 * Modal / separator spacing is derived from the Figma Auto Layout values
 * on the Link Accounts Modal and Separator frames.
 */
export const SPACING_TOKENS = {
    // Base scale (4-pt grid)
    'space.0': '0px',
    'space.1': '4px',
    'space.2': '8px',
    'space.3': '12px',
    'space.4': '16px',
    'space.5': '24px',
    'space.6': '32px',
    'space.7': '48px',
    'space.8': '64px',

    // Semantic spacing per AAP folder-level spec
    'form.gap': '24px',
    'button.gap': '16px',
    'login.gap': '32px',
    'button.padding.y': '12px',
    'button.padding.x': '24px',
    'input.padding.y': '8px',
    'input.padding.x': '16px',
    'modal.padding.x': '24px',
    'modal.padding.y': '24px',
    'modal.gap': '16px',
    'separator.gap': '16px',
} as const;

/**
 * Dot-separated key set for every spacing token.
 */
export type SpacingTokenKey = keyof typeof SPACING_TOKENS;

// =============================================================================
// PHASE 6 — RADIUS TOKENS
// =============================================================================

/**
 * Border-radius tokens captured from Figma.
 *
 *   none          = 0px
 *   xs            = 4px
 *   sm            = 8px
 *   md            = 16px
 *   button.large  = 32px (Button/Large pill-style per Figma 4069:21592)
 *   button.small  = 24px (Button/Small per Figma 9301:5049)
 *   input         = 24px (TextInput radius)
 *   modal         = 24px (Link Accounts Modal radius — frames 16383:42232
 *                   and 16383:42287)
 *   social        = 32px (SocialProviderButton — matches button.large)
 *   full          = 9999px (perfect circle / pill avatar)
 */
export const RADIUS_TOKENS = {
    none: '0px',
    xs: '4px',
    sm: '8px',
    md: '16px',
    'button.large': '32px',
    'button.small': '24px',
    input: '24px',
    modal: '24px',
    social: '32px',
    full: '9999px',
} as const;

/**
 * Dot-separated key set for every radius token.
 */
export type RadiusTokenKey = keyof typeof RADIUS_TOKENS;

// =============================================================================
// PHASE 7 — SHADOW TOKENS
// =============================================================================

/**
 * Box-shadow tokens captured from Figma effects.
 *
 *   none      = 'none'              (no shadow)
 *   modal.xl  = captured VERBATIM from AAP Section 0.10.3 (Shadow / xl
 *               effect on Link Accounts Modal frames 16383:42232 and
 *               16383:42287).
 *
 *               Composed of TWO stacked layers:
 *                 layer 1 -> '0px 8px 8px -4px rgba(16, 24, 40, 0.04)'
 *                            (close, soft shadow)
 *                 layer 2 -> '0px 20px 24px -4px rgba(16, 24, 40, 0.1)'
 *                            (deeper ambient shadow)
 *
 *               NEVER change this string. Tests assert exact equality
 *               (after browser whitespace normalisation and lowercased
 *               `rgba`) against this VALUE.
 */
export const SHADOW_TOKENS = {
    none: 'none',
    'modal.xl': '0px 8px 8px -4px rgba(16, 24, 40, 0.04), 0px 20px 24px -4px rgba(16, 24, 40, 0.1)',
} as const;

/**
 * Dot-separated key set for every shadow token.
 */
export type ShadowTokenKey = keyof typeof SHADOW_TOKENS;

// =============================================================================
// PHASE 8 — LAYOUT TOKENS
// =============================================================================

/**
 * Layout dimensions captured from Figma.
 *
 * These are NOT covered by the 9 mandatory key-type aliases (no
 * `LayoutTokenKey`) because they are consumed via nested property
 * access (`tokens.layout.modal.width`) rather than via a generic helper.
 *
 * Authoritative measurements per AAP folder-level spec and Section 0.1.1:
 *   - Modal width      : 512px (Link Accounts Modal frames)
 *   - Modal radius     : 24px  (Link Accounts Modal frames; same value
 *                                as RADIUS_TOKENS['modal'])
 *   - Logo dimensions  : 150 x 56.49 (literal Figma export — do NOT
 *                                      round 56.49 to 56 or 57)
 *   - Icon dimensions  : 24 x 24 (eye / show / hide icons)
 *   - Provider logo    : 24 x 24 rendered size (the source raster files
 *                                                are 480/500 px — scaled)
 *
 * Viewport dimensions duplicate `tests/setup/global.ts.VIEWPORTS`. The
 * duplication is INTENTIONAL — this fixture has zero internal imports
 * (it is the most-foundational fixture in the test tree) — but the two
 * locations are part of the same contract and MUST stay in lockstep:
 *   - desktop : 1440 x 1024 (default Figma frame size for SSO screens)
 *   - tablet  : 768  x 1024 (iPad portrait)
 *   - mobile  : 375  x 812  (iPhone 13/14 portrait)
 *
 * Stored as numbers for the viewport (so `width * 2` produces a number)
 * and CSS strings for the rest (so `width === '512px'` compares against
 * `getComputedStyle().width`).
 */
export const LAYOUT_TOKENS = {
    modal: {
        width: '512px',
        radius: '24px',
    },
    logo: {
        width: '150px',
        height: '56.49px',
    },
    icon: {
        size: '24px',
    },
    providerLogo: {
        size: '24px',
    },
    viewport: {
        desktop: { width: 1440, height: 1024 },
        tablet: { width: 768, height: 1024 },
        mobile: { width: 375, height: 812 },
    },
} as const;

// =============================================================================
// PHASE 9 — TRANSITION TOKENS
// =============================================================================

/**
 * Transition tokens captured from Figma animations.
 *
 * AAP Section 0.4.2 — animation duration budgets:
 *   Modal:      "opens in less than 200ms; close animation runs to
 *                completion before unmount" -> `duration.base = '200ms'`
 *   Sign-in C:  "expansion animation under 250ms"
 *                                          -> `duration.slow = '250ms'`
 *
 * The fixture documents the EXPECTED transition durations; computed-style
 * tests assert `transition-duration` falls AT or under these tolerances:
 *
 *   fast = 150ms (micro-interactions — focus rings, hover tints)
 *   base = 200ms (modal open/close — AAP-specified ceiling)
 *   slow = 250ms (provider list expansion — AAP-specified ceiling)
 *
 * Timing functions cover the standard CSS easing curves; tests assert
 * the implementation chose an easing function from this set rather than
 * permit arbitrary cubic-bezier strings.
 */
export const TRANSITION_TOKENS = {
    duration: {
        fast: '150ms',
        base: '200ms',
        slow: '250ms',
    },
    timing: {
        ease: 'ease',
        easeIn: 'ease-in',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out',
    },
} as const;

// =============================================================================
// PHASE 10 — COMPOSITE `tokens` BUNDLE
// =============================================================================

/**
 * The single, top-level `tokens` constant consumed by tests/utils/tokens.ts
 * and by every component test that asserts design fidelity.
 *
 * Shape contract — DO NOT BREAK (these are the access paths exercised by
 * downstream test files; renaming any key cascades to dozens of tests):
 *
 *   tokens.color['brand.primary']            // '#5B39F3'
 *   tokens.color['text.body']                // '#333333'
 *   tokens.gradient['hero.panel']            // linear-gradient string
 *   tokens.spacing['form.gap']               // '24px'
 *   tokens.spacing['button.padding.x']       // '24px'
 *   tokens.font.family.primary               // Inter font stack
 *   tokens.font.size['h1.signin']            // '32px'
 *   tokens.font.weight.semibold              // 600
 *   tokens.font.lineHeight['h1.signin']      // '38.4px'
 *   tokens.font.letterSpacing['h1.signin']   // '-0.32px'
 *   tokens.radius.modal                      // '24px'
 *   tokens.radius['button.large']            // '32px'
 *   tokens.shadow['modal.xl']                // verbatim box-shadow string
 *   tokens.layout.modal.width                // '512px'
 *   tokens.layout.logo.width                 // '150px'
 *   tokens.layout.viewport.desktop           // { width: 1440, height: 1024 }
 *   tokens.transition.duration.slow          // '250ms'
 *   tokens.transition.timing.easeInOut       // 'ease-in-out'
 *
 * The `as const` is propagated from each `*_TOKENS` constant — TypeScript
 * preserves the literal types end-to-end, so
 * `typeof tokens.color['brand.primary']` is exactly `'#5B39F3'`, not
 * `string`.
 */
export const tokens = {
    color: COLOR_TOKENS,
    gradient: GRADIENT_TOKENS,
    spacing: SPACING_TOKENS,
    font: {
        family: FONT_FAMILY_TOKENS,
        size: FONT_SIZE_TOKENS,
        weight: FONT_WEIGHT_TOKENS,
        lineHeight: LINE_HEIGHT_TOKENS,
        letterSpacing: LETTER_SPACING_TOKENS,
    },
    radius: RADIUS_TOKENS,
    shadow: SHADOW_TOKENS,
    layout: LAYOUT_TOKENS,
    transition: TRANSITION_TOKENS,
} as const;

/**
 * Type of the `tokens` constant — exported so callers can reference
 * `Tokens['color']`, `Tokens['shadow']['modal.xl']`, etc. for advanced
 * typing (e.g., generic helpers that read tokens through `keyof` lookups).
 */
export type Tokens = typeof tokens;

// =============================================================================
// PHASE 11 — EXPORTED TOKEN-KEY TYPES (REFERENCE FOOTER)
// =============================================================================

// The 9 mandatory token-key type aliases are already exported inline
// above (Phases 2–7). This footer is documentation only — DO NOT add
// duplicate `export type` declarations here; TypeScript will reject
// duplicate identifiers.
//
// Exported token-key types (consumed by tests/utils/tokens.ts):
//
//   ColorTokenKey          — keyof typeof COLOR_TOKENS
//   GradientTokenKey       — keyof typeof GRADIENT_TOKENS
//   SpacingTokenKey        — keyof typeof SPACING_TOKENS
//   FontSizeTokenKey       — keyof typeof FONT_SIZE_TOKENS
//   FontWeightTokenKey     — keyof typeof FONT_WEIGHT_TOKENS
//   LineHeightTokenKey     — keyof typeof LINE_HEIGHT_TOKENS
//   LetterSpacingTokenKey  — keyof typeof LETTER_SPACING_TOKENS
//   RadiusTokenKey         — keyof typeof RADIUS_TOKENS
//   ShadowTokenKey         — keyof typeof SHADOW_TOKENS
//
// If any of these are renamed, removed, or moved out of this file, you
// MUST update tests/utils/tokens.ts to match — that file imports all 9
// by name and uses each as the parameter type of a typed assertion
// helper (e.g., `expectColorToken(el, key: ColorTokenKey)`).
