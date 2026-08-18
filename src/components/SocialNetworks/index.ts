import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createSocialNetworks } from './render.ts'
import type { SocialNetworksProps } from './types.ts'

/**
 * A list of external social-network links, each rendered as an accessible `<a>` wrapping either
 * an `Icon` (sprite reference) or an image logo. Every link is already-resolved data — this
 * component never looks up an icon by network name or resolves anything itself. Renders `null`
 * for an empty `links` list, rather than an empty, landmark-less `<ul>`.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <SocialNetworks
 *   links={[
 *     { name: 'x', url: 'https://x.com/zanix', icon: { href: '/assets/icons/sprite.svg', name: 'x', viewBox: '0 0 24 24' } },
 *   ]}
 * />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const SocialNetworks: (props: SocialNetworksProps) => ReactElement | null =
  createSocialNetworks(
    createElement as unknown as CreateElement<ReactElement>,
  )
