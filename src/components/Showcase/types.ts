/**
 * How many items go in one slide:
 * - `number` — a fixed count, the same at every container width.
 * - `Record<number, number>` — mobile-first, container-width thresholds (in px) mapped to a count.
 *   Keys are the CONTAINER's own measured width (via `ResizeObserver`), never the viewport — see
 *   `index.ts`'s own doc for why. The largest key `<= ` the current container width wins; below
 *   every key, the SMALLEST key's own value applies (also the value used before any real
 *   measurement exists at all — SSR, and the very first paint on the client — see `index.ts`).
 *
 * Omitted entirely → `1` (a fixed, non-responsive single item per slide).
 */
export type ItemsPerSlide = number | Record<number, number>

/** Props shared by both the React and Preact `Showcase` bindings. */
export type ShowcaseBaseProps = {
  itemsPerSlide?: ItemsPerSlide
  id?: string
  className?: string
  /** This component's own per-slide group wrapper (`display: flex`) lives in a self-rendered
   * `<style nonce={nonce}>` element, never an inline `style` attribute — required only when the
   * consuming page runs a nonce-based `style-src` CSP (`@zanix/space`'s own zero-config default is
   * exactly this shape); without a matching nonce, a strict CSP blocks that `<style>` element,
   * leaving each group's own items stacked vertically (a real fallback, never a crash) until a
   * matching nonce is supplied. Independent of `slider.nonce` — this component forwards nothing
   * from `slider` to its own group styling or vice versa, so a caller running such a CSP sets both
   * explicitly. Omit `nonce` entirely when no such CSP is in effect — nothing here changes. */
  nonce?: string
}
