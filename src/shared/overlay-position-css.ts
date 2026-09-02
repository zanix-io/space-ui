/**
 * Builds a static CSS string for a fixed-position overlay's own markup — `Modal`, `Drawer`,
 * `Toast`, `Tooltip`, `Popover` all use this to turn their existing enum-keyed style-object
 * constants (`MODAL_POSITION_STYLE`/`DRAWER_SIDE_STYLE`/…) into CSS text they inject via a
 * `<style nonce={nonce}>` element instead of an inline `style` attribute.
 *
 * Why this exists at all: applying an inline `style="..."` attribute is a real, confirmed-in-browser
 * violation of `@zanix/space`'s own zero-config default CSP (`style-src 'self' 'nonce-<per-request>'`)
 * — a CSP nonce never applies to a `style="..."` attribute, only to a `<style>` element/
 * `<link rel=stylesheet>`, and browsers block `element.style.setProperty(...)`/`.style.cssText = ...`
 * under the same `style-src` rule too, so mutating the CSSOM after mount doesn't sidestep it either.
 * Moving this into an external stylesheet the consumer must import would fix CSP but silently break
 * every consumer who doesn't import it (an unpositioned, broken overlay instead of a working one) —
 * see `docs/styling.md`'s own "headless means `Modal`/`Drawer` stack correctly even with zero CSS
 * ever imported" reasoning, still true, just implemented via a component-rendered `<style>` element
 * now instead of a `style` attribute.
 *
 * Only ever used for values that are FIXED, non-dynamic constants — never a per-render, runtime-
 * measured value (`Tooltip`/`Popover`'s own `transform: translate(x, y)`, computed fresh from
 * `usePosition`'s real floating-point measurement, is the concrete counter-example: it changes on
 * every scroll/resize and can't be expressed as a static rule keyed off a fixed enum the way
 * `placement`/`side`/`position` can). Those genuinely dynamic values don't use this function at all —
 * see {@linkcode getOrInsertDynamicRule}/{@linkcode removeDynamicRule} below for how `Tooltip`/
 * `Popover` apply them instead, fully off the inline `style` attribute too.
 *
 * A real, honest trade-off worth knowing about: unlike an inline `style` attribute (which always wins
 * the cascade over any stylesheet rule, short of `!important`), a rule injected via this helper is an
 * ordinary CSS rule with ordinary specificity — a consumer's own same-specificity rule loaded LATER in
 * the DOM could in principle override it. In practice this is not a real risk for the common case (a
 * `<link>`/`<style>` in `<head>` parses before a component's own `<style>` element renders later in
 * `<body>`, so equal-specificity conflicts resolve in the component's favor by source order) — but it
 * is no longer the absolute guarantee inline `style` used to provide.
 */
export function buildOverlayCss(
  dataSpaceUi: string,
  base: Record<string, string | number>,
  variant?: { attr: string; values: Record<string, Record<string, string | number>> },
): string {
  const rootSelector = `[data-space-ui='${dataSpaceUi}']`
  const rules = [`${rootSelector}{${declarationsToCss(base)}}`]

  if (variant) {
    for (const [name, declarations] of Object.entries(variant.values)) {
      rules.push(
        `${rootSelector}[${variant.attr}='${name}']{${declarationsToCss(declarations)}}`,
      )
    }
  }

  return rules.join('\n')
}

function declarationsToCss(declarations: Record<string, string | number>): string {
  return Object.entries(declarations)
    .map(([property, value]) => `${toKebabCase(property)}:${value}`)
    .join(';')
}

function toKebabCase(property: string): string {
  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

/**
 * Gets (inserting if needed) a `CSSStyleRule` scoped to one component instance, living inside a
 * `<style>` element already authorized by a CSP nonce — the technique `Tooltip`/`Popover` use to
 * apply their own genuinely dynamic `transform`/`visibility`/`pointerEvents` (recomputed on every
 * render from a real `usePosition` measurement, not a fixed enum-keyed constant `buildOverlayCss`
 * could turn into a static rule ahead of time) without ever touching an inline `style` attribute.
 *
 * **Why this isn't blocked by `style-src` the way an inline attribute is**: a CSP nonce authorizes
 * the `<style>` ELEMENT itself once, at parse time. Mutating a `CSSStyleRule` that already lives
 * inside that authorized element — via `CSSStyleRule.style.setProperty(...)`, reached through
 * `sheet.cssRules[i]` — never touches `HTMLElement.style` (the attribute-backed inline style
 * object), which is the one thing `style-src-attr` actually covers. This is the same technique
 * CSP-compatible CSS-in-JS runtimes (styled-components "speedy" mode, Emotion) rely on: insert a
 * rule once via `sheet.insertRule(...)`, then mutate that same rule's own `.style` on every
 * subsequent update — never `element.style` directly, and never delete-and-reinsert the rule on
 * every update either (that would defeat the point of holding a stable reference to it at all).
 *
 * Caller owns the `ruleRef` (a plain `{ current }` object, typically a `useRef`) across renders —
 * this function only inserts a rule the FIRST time it's called for a given `ruleRef` (idempotent on
 * every call after that, just returning the same rule for the caller to mutate). Returns `null`,
 * never throwing, when `styleEl.sheet` isn't available yet (SSR, or the element not yet connected)
 * — the same ref-gated, not environment-gated, SSR-safety discipline `use-position.ts`'s own doc
 * establishes.
 *
 * **Must only ever be called from a `useLayoutEffect` (never a plain `useEffect`)** — applying this
 * after paint would flash/jump visibly on every `autoUpdate` scroll-driven position update, since
 * that fires continuously while open, not just once at mount.
 */
export function getOrInsertDynamicRule(
  styleEl: HTMLStyleElement,
  ruleRef: { current: CSSStyleRule | null },
  selector: string,
): CSSStyleRule | null {
  const sheet = styleEl.sheet
  if (!sheet) return null
  if (!ruleRef.current) {
    const index = sheet.insertRule(`${selector}{}`, sheet.cssRules.length)
    ruleRef.current = sheet.cssRules[index] as CSSStyleRule
  }
  return ruleRef.current
}

/**
 * The other half of {@linkcode getOrInsertDynamicRule} — removes the rule it inserted and clears
 * `ruleRef`, so a later re-open/remount starts clean instead of leaking a duplicate. `styleEl` must
 * be the SAME element the rule was originally inserted into, captured by the caller's own effect
 * closure at insertion time rather than re-read from a ref — by the time an unmount/close cleanup
 * runs, a ref pointing at a conditionally-rendered `<style>` element (`Popover`'s own, unmounted
 * whenever it closes) may already have been detached.
 *
 * **`ruleRef.current` is always reset to `null`, even when `styleEl`/its `.sheet` is already gone**
 * — a real, confirmed bug caught by a "repeated open/close cycles never accumulate duplicate rules"
 * test while building this: `HTMLStyleElement.sheet` legitimately returns `null` once the element is
 * disconnected from the document (spec behavior, not a happy-dom quirk), which by cleanup time is
 * often already true for a conditionally-rendered `<style>` element. An earlier version returned
 * early in that case WITHOUT clearing `ruleRef`, so the stale reference survived into the next
 * `getOrInsertDynamicRule` call, whose `if (!ruleRef.current)` check then wrongly treated a rule as
 * "already inserted" and skipped inserting a fresh one into the NEW element's own new stylesheet —
 * silently leaving that reopened instance with no dynamic rule at all (never a duplicate, but just
 * as real a correctness bug). Deleting from a still-live sheet is best-effort on top of that, not
 * the actual point — a disconnected/orphaned sheet's own rules don't apply to anything regardless of
 * whether this function explicitly removes them.
 */
export function removeDynamicRule(
  styleEl: HTMLStyleElement | null,
  ruleRef: { current: CSSStyleRule | null },
): void {
  const rule = ruleRef.current
  ruleRef.current = null
  if (!styleEl || !rule) return
  const sheet = styleEl.sheet
  if (!sheet) return
  // `CSSRuleList` is array-LIKE, not a real array — no `.indexOf` of its own.
  const index = Array.prototype.indexOf.call(sheet.cssRules, rule)
  if (index !== -1) sheet.deleteRule(index)
}
