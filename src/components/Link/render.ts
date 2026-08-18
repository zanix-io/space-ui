import type { CreateElement } from 'typings/renderer.ts'
import type { LinkProps } from './types.ts'

/**
 * The real implementation of `Link`, shared identically between the React and Preact bindings —
 * same pattern as `Icon/render.ts`. Deliberately just an `<a>` with conditional external-link
 * attributes; no internal-vs-external routing branch, because `@zanix/space`'s own Orbit
 * navigation already works against plain anchors (see {@linkcode LinkProps.external}'s own doc).
 */
export function createLink<E>(h: CreateElement<E>): (props: LinkProps) => E {
  return function Link(
    { href, external, rel, onClick, label, className, children }: LinkProps,
  ): E {
    return h('a', {
      href,
      className,
      onClick,
      target: external ? '_blank' : undefined,
      rel: rel ?? (external ? 'noopener noreferrer' : undefined),
      'aria-label': label,
    }, children)
  }
}
