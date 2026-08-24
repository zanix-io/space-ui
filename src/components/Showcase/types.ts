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
}
