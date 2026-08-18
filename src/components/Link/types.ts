/** Props for {@linkcode Link}. */
export type LinkProps = {
  href: string
  /**
   * `true` for a destination outside this app's own origin — adds `target="_blank"` and a safe
   * default `rel` (`noopener noreferrer`), the same convention `SocialNetworks` already uses.
   * Internal navigation needs no special handling here: `@zanix/space`'s own client-side
   * navigation (Orbit) intercepts plain `<a>` clicks without requiring an opt-in `Link`-style
   * component the way `react-router`'s does — this component only ever adds attributes, never
   * routing logic.
   */
  external?: boolean
  /**
   * Overrides the `rel` this component would otherwise compute from `external` — for real,
   * standards-based cases the safe `external` default doesn't cover: `'nofollow'`/`'sponsored'`/
   * `'ugc'` for SEO-sensitive links, `'next'`/`'prev'` for pagination. An explicit `rel` always
   * wins; `external`'s own default only applies when this is omitted.
   */
  rel?: string
  /**
   * Optional — most navigational links need nothing beyond `href`. For the real cases that do
   * (analytics before navigating away, a confirm-before-leaving flow), this never replaces
   * navigation itself; it fires alongside it. Typed against the generic DOM `Event`, not a
   * renderer-specific synthetic event type — this file never imports React or Preact.
   */
  onClick?: (event: Event) => void
  /** Accessible label override — supplements or replaces the visible `children` for assistive
   * technology. Omit it when the visible content already describes the destination. */
  label?: string
  className?: string
  children?: unknown
}
