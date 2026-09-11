/**
 * The `data-*` attribute marking every visually-hidden-but-announced element this package renders
 * via {@linkcode liveRegionProps}/`VisuallyHidden` (paired with {@linkcode VISUALLY_HIDDEN_CSS}
 * below), instead of an inline `style="..."` attribute — a real, confirmed CSP violation under a
 * nonce-based `style-src` (`@zanix/space`'s own zero-config default is exactly this shape), same
 * cause as `overlay-position-css.ts`'s own {@linkcode DISPLAY_CONTENTS_WRAPPER_ATTR} already
 * documents in full. Unlike that one, this rule needs no per-instance CSSOM scoping at all — the
 * clip-and-collapse declarations below never vary by instance, so a single, globally-shared
 * attribute selector is correct for every consumer at once.
 */
export const VISUALLY_HIDDEN_ATTR = 'data-space-ui-visually-hidden'

/**
 * The single static CSS rule backing every visually-hidden element this package renders. Every
 * real consumer (`VisuallyHidden`, `MultiSelect`'s own selection-count description,
 * `Slider`/`Countdown`'s own `liveRegionProps`-built announcement region) renders this same text
 * verbatim inside its own self-rendered `<style nonce={nonce}>` element — harmless, duplicate-safe
 * repetition across instances/components, the same tolerance `DISPLAY_CONTENTS_WRAPPER_CSS`
 * already establishes for an identical reason.
 */
export const VISUALLY_HIDDEN_CSS =
  `[${VISUALLY_HIDDEN_ATTR}]{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}`

/** How assistive technology should announce changes to a live region — see `aria-live`'s own
 * values. `'off'` is a real, deliberate value, not merely "no announcement"; see
 * {@linkcode liveRegionProps}'s own doc. */
export type LiveRegionPoliteness = 'polite' | 'assertive' | 'off'

/**
 * Props for a visually-hidden `aria-live` element — visible to assistive technology, invisible on
 * screen. `politeness: 'off'` is a real, deliberate value (not merely "no announcement"): `Slider`
 * uses it specifically to silence an in-progress autoplay tick without removing the region
 * entirely, so the NEXT real (non-autoplay) change still gets announced correctly.
 *
 * The returned {@linkcode VISUALLY_HIDDEN_ATTR} marker relies on the caller ALSO rendering
 * {@linkcode VISUALLY_HIDDEN_CSS} somewhere in its own tree via a nonce'd `<style>` element — never
 * an inline `style` attribute, which this function used to return directly (a real, confirmed CSP
 * violation under a nonce-based `style-src`; see this module's own top-of-file doc).
 */
export function liveRegionProps(politeness: LiveRegionPoliteness): Record<string, unknown> {
  return { [VISUALLY_HIDDEN_ATTR]: '', 'aria-live': politeness }
}
