import type { CreateElement } from 'typings/renderer.ts'
import { createIcon } from '../Icon/render.ts'
import type { SocialNetworkLogo, SocialNetworksProps } from './types.ts'

function isLogo(icon: SocialNetworksProps['links'][number]['icon']): icon is SocialNetworkLogo {
  return 'img' in icon
}

/**
 * The real implementation of `SocialNetworks`, shared identically between the React and Preact
 * bindings — same pattern as `Icon/render.ts` (parametrized by `h`, never branches on which
 * renderer is active). Composes `Icon`'s own shared factory directly (`createIcon(h)`) rather than
 * going through a bound `Icon` export, so this stays a single, self-contained renderer-agnostic
 * unit — no dependency on which entrypoint (`.`/`./preact`) happened to already bind `Icon`.
 */
export function createSocialNetworks<E>(
  h: CreateElement<E>,
): (props: SocialNetworksProps) => E | null {
  const Icon = createIcon(h)

  return function SocialNetworks({ links, className }: SocialNetworksProps): E | null {
    // Nothing to render, and nothing meaningful to wrap in an empty (landmark-less, but still
    // present) list either — mirrors the legacy component's own "no active state" behavior.
    if (links.length === 0) return null

    return h(
      'ul',
      { className },
      ...links.map((link) => {
        const mark = isLogo(link.icon)
          ? h('img', {
            src: link.icon.img,
            alt: link.icon.alt ?? `${link.name} logo`,
          })
          : Icon({ href: link.icon.href, name: link.icon.name, viewBox: link.icon.viewBox })

        return h(
          'li',
          { key: link.name },
          h(
            'a',
            {
              href: link.url,
              target: '_blank',
              rel: 'noopener noreferrer',
              title: link.tooltip ?? `${link.name} logo`,
              'aria-label': link.label ?? `Go to ${link.name}`,
            },
            mark,
          ),
        )
      }),
    )
  }
}
