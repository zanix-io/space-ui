import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createSkeleton } from './render.ts'
import type { SkeletonProps } from './types.ts'

/**
 * A pending/loading placeholder — see `render.ts`'s own doc for the full contract. React binding —
 * import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <Skeleton className="skeleton-avatar" />
 * ```
 */
// Same `createElement`/`h` overload-set cast `Icon/index.ts` already needs and explains in full.
export const Skeleton: (props: SkeletonProps) => ReactElement = createSkeleton(
  createElement as unknown as CreateElement<ReactElement>,
)
