/**
 * Extracted from `Slider`'s own "Slide N of Total" announcement (`Slider/types.ts`'s original
 * `VISUALLY_HIDDEN_STYLE`) once a second real consumer needed the identical shape — same "extract
 * once a real second consumer exists" reasoning `close-on-outside.ts`/`escape-to-close.ts` already
 * follow.
 *
 * Deliberately data, not a component or a hook: no `h`/`createElement` indirection needed since
 * every real consumer here already imports its own renderer's `createElement`/`h` directly (this
 * is only ever consumed by full per-renderer implementations, never a shared `render.ts` factory)
 * — pass the returned props straight into your own element call
 * (`createElement('span', liveRegionProps('polite'), message)`). Genuinely one file for both
 * renderers: plain data has no renderer to diverge on.
 */
export const VISUALLY_HIDDEN_STYLE = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
} as const

/** How assistive technology should announce changes to a live region — see `aria-live`'s own
 * values. `'off'` is a real, deliberate value, not merely "no announcement"; see
 * {@linkcode liveRegionProps}'s own doc. */
export type LiveRegionPoliteness = 'polite' | 'assertive' | 'off'

/**
 * Props for a visually-hidden `aria-live` element — visible to assistive technology, invisible on
 * screen. `politeness: 'off'` is a real, deliberate value (not merely "no announcement"): `Slider`
 * uses it specifically to silence an in-progress autoplay tick without removing the region
 * entirely, so the NEXT real (non-autoplay) change still gets announced correctly.
 */
export function liveRegionProps(politeness: LiveRegionPoliteness): {
  style: typeof VISUALLY_HIDDEN_STYLE
  'aria-live': LiveRegionPoliteness
} {
  return { style: VISUALLY_HIDDEN_STYLE, 'aria-live': politeness }
}
