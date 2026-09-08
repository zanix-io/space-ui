/** The networks {@linkcode detectSocialNetwork} recognizes by hostname, plus the generic
 * `'website'` fallback for anything else that still parses as a URL. Distinct from
 * `SocialNetworks`' own `SocialNetworkLink.name` (a free-text label the caller supplies directly)
 * — this is a closed set this component derives itself, purely from a URL's own hostname. */
export type SocialNetworkName =
  | 'instagram'
  | 'x'
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'whatsapp'
  | 'telegram'
  | 'website'

/** Ordered hostname → {@linkcode SocialNetworkName} table — order matters only in that every entry
 * here is checked before the `'website'` fallback, never against each other (no hostname matches
 * two entries). A bare `www.` prefix is stripped before matching; both the exact domain and any of
 * its subdomains match (`business.facebook.com` matches `facebook.com`). */
const NETWORK_HOSTS: readonly [SocialNetworkName, readonly string[]][] = [
  ['instagram', ['instagram.com']],
  ['x', ['x.com', 'twitter.com']],
  ['facebook', ['facebook.com', 'fb.com']],
  ['linkedin', ['linkedin.com']],
  ['tiktok', ['tiktok.com']],
  ['youtube', ['youtube.com', 'youtu.be']],
  ['whatsapp', ['wa.me', 'whatsapp.com']],
  ['telegram', ['t.me', 'telegram.me']],
]

function matchesHost(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

/**
 * Derives a {@linkcode SocialNetworkName} from `url`'s own hostname — pure, renderer-agnostic,
 * directly unit-testable, the same "extract the arithmetic, test it exhaustively" discipline
 * `Pagination`'s own `getPaginationItems` already establishes for this package's other pure
 * algorithms.
 *
 * `url` doesn't need a leading scheme (`instagram.com/zanix` works, not just
 * `https://instagram.com/zanix`) — a bare `new URL(url)` call rejects anything without one, so this
 * retries once with `https://` prepended before giving up. This is shape-level parsing only, never
 * a reachability check: a syntactically valid but dead URL still resolves to a real
 * {@linkcode SocialNetworkName} (or `'website'`), and a malformed one (empty string, plain text with
 * no dot) returns `null` either way.
 *
 * @returns The matched network, `'website'` for anything else that still parses as a URL, or `null`
 * for an empty or unparseable `url`.
 */
export function detectSocialNetwork(url: string): SocialNetworkName | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  const parsed = parseUrl(trimmed)
  if (!parsed) return null

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')

  for (const [network, domains] of NETWORK_HOSTS) {
    if (domains.some((domain) => matchesHost(hostname, domain))) return network
  }

  return 'website'
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    // No scheme (a bare `instagram.com/zanix`) — a real, common shape for this component's own
    // input, retried once with `https://` prepended rather than rejected outright.
    try {
      return new URL(`https://${value}`)
    } catch {
      return null
    }
  }
}
