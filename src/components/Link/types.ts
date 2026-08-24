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
  /** Native `title` attribute — a plain passthrough, shown as a browser tooltip on hover. No
   * tooltip logic of any kind lives in this component; the browser owns the entire behavior
   * (timing, positioning, dismissal) the same way it already does for every other native
   * attribute here. Not a substitute for {@linkcode label} — an accessible name needs to be
   * available without hovering, `title` is a supplementary hint only. */
  title?: string
  className?: string
  children?: unknown
  /**
   * Plain native ARIA passthrough for a link that's one of a set representing the current
   * selection — a nav item pointing at the page you're already on, a paginated step, a breadcrumb.
   * Same "plain attribute passthrough" contract as `title` above, and identical to `Button`'s own
   * `aria-current` (`Button/types.ts`) — forwarded verbatim as the literal `aria-current` attribute,
   * never computed here. This component never reads the current URL/route/history to decide this
   * itself: no `active`/`isActive` prop, no router/location awareness of any kind — the caller
   * (which knows what "current" means for its own navigation) always supplies the value directly,
   * the same way `@zanix/space`'s Orbit navigation is already consumed as plain anchors, never a
   * routing-aware `Link` component. Accepts the full token set the ARIA spec defines for
   * `aria-current` (a bare `true`/`false` is also valid per spec, distinct from the enumerated
   * tokens); most callers only ever need `true`/`'page'`.
   */
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
}
