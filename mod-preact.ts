/**
 * `@zanix/space-ui`'s Preact-bound components — same props, same rendered markup as the default
 * (React) entrypoint. Import from here instead of `.` when your `@zanix/space` app uses
 * `--renderer=preact`. See the default entrypoint's own `@module` doc for the package's overall
 * design principle.
 *
 * @module
 */

export { Icon } from 'components/Icon/index.preact.ts'
export type { IconProps } from 'components/Icon/types.ts'

export { Button } from 'components/Button/index.preact.ts'
export type { BaseButtonProps, ButtonProps, CheckedButtonRole } from 'components/Button/types.ts'

export { Link } from 'components/Link/index.preact.ts'
export type { LinkProps } from 'components/Link/types.ts'

export { SocialNetworks } from 'components/SocialNetworks/index.preact.ts'
export type {
  SocialNetworkIcon,
  SocialNetworkLink,
  SocialNetworkLogo,
  SocialNetworksProps,
} from 'components/SocialNetworks/types.ts'

// See the default entrypoint's own comment on `StructuredData` for why this subpath, and the
// Preact `VNode` return type every binding here has, are accepted slow-types exceptions.
export { StructuredData } from 'components/StructuredData/index.preact.ts'
export type { StructuredDataProps } from 'components/StructuredData/types.ts'
// Renderer-agnostic — same export as the default entrypoint, not a Preact-specific binding.
export { resolveStructuredData } from 'components/StructuredData/resolve.ts'

export { createFormatter, IntlProvider, useIntl } from 'intl/index.preact.ts'
export type {
  FormatMessageValues,
  Formatter,
  IntlProviderProps,
  Messages as IntlMessages,
} from 'intl/index.preact.ts'
