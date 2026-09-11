import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createEmptyState } from './render.ts'
import type { EmptyStateBaseProps } from './types.ts'

export type { EmptyStateBaseProps, EmptyStateHeadingLevel, EmptyStateRootType } from './types.ts'

/** See `index.ts`'s own `EmptyStateProps` doc — same type, with `ComponentChildren` in place of
 * `ReactNode`. */
export type EmptyStateProps = EmptyStateBaseProps & {
  /** See `index.ts`'s own `EmptyStateProps.icon` doc — same render-prop slot, returning
   * `ComponentChildren` instead of `ReactNode`. */
  icon?: () => ComponentChildren
  /** See `index.ts`'s own `EmptyStateProps.action` doc. */
  action?: () => ComponentChildren
}

/**
 * A generic "nothing here yet" block — see `index.ts`'s own doc for the full contract, not repeated
 * here. Preact binding, same props, same rendered markup; import from `@zanix/space-ui` (no
 * subpath) for the React one.
 */
// Same widening cast `index.ts`'s own doc explains, applied to `ComponentChildren` here instead of
// `ReactNode`.
export const EmptyState: (props: EmptyStateProps) => VNode = createEmptyState(
  h as unknown as CreateElement<VNode>,
) as (props: EmptyStateProps) => VNode
