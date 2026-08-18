/** Props for {@linkcode Icon}. */
export type IconProps = {
  /** The `<symbol id="...">` inside the sprite `href` points to. */
  name: string
  /**
   * Resolved URL of the SVG sprite containing the symbol — e.g. `/assets/icons/sprite.svg`,
   * served by a consumer's own asset pipeline (`@zanix/space`'s `assetsDir`, a CDN, a bundler
   * import). `Icon` never resolves this itself; it only ever renders `href#name` as-is.
   */
  href: string
  /**
   * The target symbol's own `viewBox` (e.g. `'0 0 24 24'`), stated explicitly rather than
   * discovered by fetching and parsing the sprite in the browser — that keeps this component
   * SSR-safe with no client-side flash while the real box loads in.
   */
  viewBox: string
  /** Icon width/height in pixels. Both sides are equal — icons are always square. */
  size?: number
  /**
   * Accessible label. Omit it for a purely decorative icon (next to text that already says the
   * same thing) — the icon is then hidden from assistive technology (`aria-hidden`) instead of
   * announcing nothing useful.
   */
  label?: string
  className?: string
  /** DOM `id` for the `<svg>` itself — e.g. to target it from `aria-describedby` elsewhere, or in
   * a test/CSS selector. Never used internally by `Icon`. */
  id?: string
}
