/** Props {@linkcode Counter} accepts. See `index.ts`'s own doc for the full behavioral contract —
 * this only documents the fields themselves. */
export type CounterProps = {
  /** The value the animation counts up to. Never truncated at the end: the last frame always
   * shows `target` exactly, decimals included — intermediate frames may floor it, the final one
   * never does. */
  target: number
  /** Total animation time in milliseconds, measured from the moment `Counter` becomes visible —
   * not from when it mounts (it may sit off-screen, not yet visible, for an arbitrary time
   * first). */
  duration: number
  /** Plain text prepended to every formatted value — both the animating visible text and the
   * fixed accessible name. Defaults to `''`. */
  prefix?: string
  /**
   * Formats a raw numeric value (an intermediate frame, or the final `target`) into display text.
   * Defaults to `String` — a plain, deterministic conversion with no thousands separator, no
   * locale awareness of any kind. `Counter` never reads an ambient locale (`toLocaleString()`
   * with no explicit locale resolves differently depending on the server/browser it happens to
   * run on) — pass this to apply separators, fixed decimals, a currency symbol, or anything else,
   * explicitly.
   */
  format?: (value: number) => string
  id?: string
  className?: string
}
