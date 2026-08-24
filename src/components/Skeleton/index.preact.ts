import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createSkeleton } from './render.ts'
import type { SkeletonProps } from './types.ts'

/**
 * A pending/loading placeholder — see `index.ts`'s own doc for the full description. Preact
 * binding, same props, same rendered markup; import from `@zanix/space-ui` (no subpath) for the
 * React one.
 */
// Same overload-set cast `Icon/index.preact.ts` already needs and explains in full.
export const Skeleton: (props: SkeletonProps) => VNode = createSkeleton(
  h as unknown as CreateElement<VNode>,
)
