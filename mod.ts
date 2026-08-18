/**
 * `@zanix/space-ui` — a small, framework-agnostic-where-possible component library for apps built
 * on `@zanix/space`. Each component takes already-resolved data (URLs, labels, viewBox) as props —
 * it never resolves assets, translates strings, or reaches into Space's own conventions itself.
 * That split keeps this package usable on its own terms, versioned independently from the
 * rendering engine it's meant to sit on top of.
 *
 * @module
 */

export { Icon } from 'components/Icon/index.ts'
export type { IconProps } from 'components/Icon/types.ts'

export { Button } from 'components/Button/index.ts'
export type { BaseButtonProps, ButtonProps, CheckedButtonRole } from 'components/Button/types.ts'

export { Link } from 'components/Link/index.ts'
export type { LinkProps } from 'components/Link/types.ts'

export { SocialNetworks } from 'components/SocialNetworks/index.ts'
export type {
  SocialNetworkIcon,
  SocialNetworkLink,
  SocialNetworkLogo,
  SocialNetworksProps,
} from 'components/SocialNetworks/types.ts'

// `StructuredData`/`StructuredDataProps`/`resolveStructuredData` reference `schema-dts`'s own
// `Thing`/`WithContext` in their public signature (and `Icon`/`SocialNetworks`/`StructuredData`'s
// Preact bindings reference Preact's own `VNode`) — JSR's slow-types checker wants every type
// reachable from a public export
// to itself be re-exported, but `Thing` alone cascades into 13 more schema.org vendor types, and
// `VNode` cascades similarly into Preact's own internals. Re-exporting that whole vendor type graph
// into this package's own public surface would bloat it with types this package doesn't own or
// version, working against its own "small and focused" design principle — accepted as a known,
// deliberate trade-off (this package still publishes and works correctly; only JSR's fast
// pre-computed type inference for these specific signatures is unavailable, full inference
// still works for any consumer).
export { StructuredData } from 'components/StructuredData/index.ts'
export type { StructuredDataProps } from 'components/StructuredData/types.ts'
// Renderer-agnostic — no `h`/`createElement` involved — so this is the same export in both
// entrypoints, not one per renderer like the components above.
export { resolveStructuredData } from 'components/StructuredData/resolve.ts'

export { createFormatter, IntlProvider, useIntl } from 'intl/index.ts'
export type {
  FormatMessageValues,
  Formatter,
  IntlProviderProps,
  Messages as IntlMessages,
} from 'intl/index.ts'
