import type { CreateElement } from 'typings/renderer.ts'
import type { LinkProps } from './types.ts'

/**
 * The real implementation of `Link`, shared identically between the React and Preact bindings —
 * same pattern as `Icon/render.ts`. Deliberately just an `<a>` with conditional external-link
 * attributes; no internal-vs-external routing branch, because `@zanix/space`'s own Orbit
 * navigation already works against plain anchors (see {@linkcode LinkProps.external}'s own doc).
 *
 * Carries `data-space-ui="link"` — a stable, semver-protected identity hook for consumer-side
 * theming. Inert on its own: no CSS ships with this package, and nothing here reads or reacts to
 * this attribute — it exists only so a consumer's own stylesheet has something of `space-ui`'s to
 * target without resorting to a bare `a` element selector. Not part of this component's
 * documented prop API — `className` remains the primarily supported styling path.
 */
export function createLink<E>(h: CreateElement<E>): (props: LinkProps) => E {
  return function Link(
    {
      href,
      external,
      rel,
      onClick,
      label,
      title,
      className,
      children,
      'aria-current': ariaCurrent,
    }: LinkProps,
  ): E {
    return h('a', {
      href,
      className,
      'data-space-ui': 'link',
      onClick,
      target: external ? '_blank' : undefined,
      rel: rel ?? (external ? 'noopener noreferrer' : undefined),
      'aria-label': label,
      'aria-current': ariaCurrent,
      title,
    }, children)
  }
}
