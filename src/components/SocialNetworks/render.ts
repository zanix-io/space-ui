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
 *
 * The rendered `<ul>` carries `data-space-ui="social-networks"` — a stable, semver-protected
 * identity hook an *optional* stylesheet (this package's own scaffolded template, or a consumer's
 * own CSS) can select against, without resorting to a bare `ul` element selector that would also
 * match unrelated markup elsewhere on the page. Inert on its own: no CSS ships with this package,
 * and nothing here reads or reacts to this attribute. Not part of this component's documented prop
 * API — `className` remains the primarily supported styling path. Scoped to the list only, same as
 * `className` already is — the individual `<li>`/`<a>` per link get no hook of their own in this
 * first version.
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
      { className, 'data-space-ui': 'social-networks' },
      ...links.map((link) => {
        const mark = isLogo(link.icon)
          ? h('img', {
            src: link.icon.img,
            alt: link.icon.alt ?? `${link.name} logo`,
            loading: link.icon.loading,
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
              rel: link.rel ?? 'noopener noreferrer',
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
