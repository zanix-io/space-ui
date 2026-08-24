/** The sprite reference for a link's icon — same shape `Icon` itself takes (minus `label`, which
 * {@linkcode SocialNetworkLink} supplies instead). */
export type SocialNetworkIcon = {
  href: string
  name: string
  viewBox: string
}

/** A raster/vector logo image, for a network whose mark isn't in the sprite (e.g. a brand logo
 * only available as its own file). Alternative to {@linkcode SocialNetworkIcon} — a link uses one
 * or the other, never both. */
export type SocialNetworkLogo = {
  img: string
  /** Defaults to `` `${name} logo` `` when omitted. */
  alt?: string
  /** Native `loading` attribute on the `<img>` itself. Unset by default (native `'eager'`
   * behavior) — a social-links list is commonly below the fold (a page footer), where `'lazy'` is
   * a real, measurable Core Web Vitals win, but not universally (a prominent header placement
   * would only get worse LCP from deferring it) — so this is the caller's own layout call, never
   * assumed by the component. */
  loading?: 'lazy' | 'eager'
}

/** One entry in {@linkcode SocialNetworksProps}'s `links`. */
export type SocialNetworkLink = {
  /** Network id (e.g. `'facebook'`, `'x'`, `'instagram'`) — used as the React/Preact list `key`
   * and to build the default accessible label (`Go to ${name}`) and tooltip
   * (`` `${name} logo` ``). */
  name: string
  /** Destination URL. Always opened as an external link (`target="_blank"`,
   * `rel="noopener noreferrer"` unless overridden by {@linkcode SocialNetworkLink.rel}). */
  url: string
  icon: SocialNetworkIcon | SocialNetworkLogo
  /** Accessible label override. Defaults to `` `Go to ${name}` ``. */
  label?: string
  /** `title` attribute override. Defaults to `` `${name} logo` ``. */
  tooltip?: string
  /**
   * Overrides the default `rel="noopener noreferrer"` — same escape hatch `Link.rel` already
   * offers, for the same real, standards-based case that default doesn't cover on its own:
   * `rel="me"` (IndieWeb/Mastodon identity verification — the destination profile links back with
   * its own `rel="me"`, and the pair proves ownership) needs the safe `noopener noreferrer` tokens
   * kept alongside it, not replaced — e.g. `rel="me noopener noreferrer"`. An explicit `rel` always
   * wins entirely; nothing here is merged with the default.
   */
  rel?: string
}

/** Props for {@linkcode SocialNetworks}. */
export type SocialNetworksProps = {
  links: SocialNetworkLink[]
  className?: string
}
