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
}

/** One entry in {@linkcode SocialNetworksProps}'s `links`. */
export type SocialNetworkLink = {
  /** Network id (e.g. `'facebook'`, `'x'`, `'instagram'`) — used as the React/Preact list `key`
   * and to build the default accessible label (`Go to ${name}`) and tooltip
   * (`` `${name} logo` ``). */
  name: string
  /** Destination URL. Always opened as an external link (`target="_blank"`,
   * `rel="noopener noreferrer"`). */
  url: string
  icon: SocialNetworkIcon | SocialNetworkLogo
  /** Accessible label override. Defaults to `` `Go to ${name}` ``. */
  label?: string
  /** `title` attribute override. Defaults to `` `${name} logo` ``. */
  tooltip?: string
}

/** Props for {@linkcode SocialNetworks}. */
export type SocialNetworksProps = {
  links: SocialNetworkLink[]
  className?: string
}
