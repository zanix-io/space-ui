import type { CreateElement } from 'typings/renderer.ts'
import type { SkeletonProps } from './types.ts'

/**
 * The real implementation of `Skeleton`, shared identically between the React and Preact bindings
 * — same stateless factory pattern `Icon`/`VisuallyHidden`/`Alert` already establish.
 *
 * A pending/loading placeholder — deliberately no width/height/shape (circle/text-line/rectangle) props, no
 * animation of its own: those are purely visual concerns with zero ARIA backing, fully achievable
 * via `className` alone, same "no unrequested styling opinions" discipline `Alert`'s own `variant`
 * rejection already established. Childless by design — a skeleton stands in for content that
 * hasn't loaded yet, it never wraps real content of its own.
 *
 * Carries `data-space-ui="skeleton"` — same inert, semver-protected identity-hook convention every
 * other component here has.
 */
export function createSkeleton<E>(h: CreateElement<E>): (props: SkeletonProps) => E {
  return function Skeleton({ label, id, className }: SkeletonProps): E {
    return h('div', {
      id,
      className,
      role: label ? 'status' : undefined,
      'aria-hidden': label ? undefined : 'true',
      'aria-label': label,
      'data-space-ui': 'skeleton',
    })
  }
}
