/** Shorthand for a CSS grid track list (`grid-template-columns`/`grid-template-rows`):
 * - `number` — `n` equal-width tracks: `repeat(n, 1fr)`.
 * - `string[]` — explicit, individually-sized tracks: `['100px', '200px', '1fr']` becomes
 *   `'100px 200px 1fr'`.
 * - `string` — any valid CSS grid track-list value, passed through untouched (`'auto'`,
 *   `'minmax(100px, 1fr) 2fr'`, …).
 *
 * See `render.ts`'s own doc for the default applied when omitted. */
export type TemplateArea = number | string[] | string

/** Props for {@linkcode GridItem} — a single cell inside a {@linkcode Grid}. `columnStart`/
 * `columnEnd`/`rowStart`/`rowEnd` map straight onto the real CSS `grid-column-start`/
 * `grid-column-end`/`grid-row-start`/`grid-row-end` properties, with no offset or transformation
 * of any kind — a value here is the exact CSS grid line number, on both axes identically. See
 * `render.ts`'s own doc for why this differs from the component it rescues. */
export type GridItemProps = {
  columnStart?: number
  columnEnd?: number
  rowStart?: number
  rowEnd?: number
  id?: string
  className?: string
  children?: unknown
}

/** Props for {@linkcode Grid}. `children` are expected to be {@linkcode GridItem} elements — see
 * `render.ts`'s own doc for why this is a type-level contract only, not a runtime-enforced one. */
export type GridProps = {
  /** Column track list — see {@linkcode TemplateArea}. Defaults to
   * `'repeat(auto-fit, minmax(100px, 1fr))'` when omitted, same as the component this rescues. */
  templateColumns?: TemplateArea
  /** Row track list — see {@linkcode TemplateArea}. Same default as {@linkcode templateColumns}. */
  templateRows?: TemplateArea
  /** Any valid CSS `gap` value. Defaults to `'1rem'`. */
  gap?: string
  /** A bare number is treated as pixels (`400` → `'400px'`); a string is used verbatim as any
   * valid CSS length (`'50vh'`, `'100%'`, …). Omit to leave the container's height to the normal
   * CSS box model (`height: auto` unless a consumer's own `className` says otherwise) — no default
   * height behavior is imposed. */
  height?: string | number
  id?: string
  className?: string
  children?: unknown
}
