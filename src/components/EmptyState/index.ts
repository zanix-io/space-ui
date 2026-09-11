import { createElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createEmptyState } from './render.ts'
import type { EmptyStateBaseProps } from './types.ts'

export type { EmptyStateBaseProps, EmptyStateHeadingLevel, EmptyStateRootType } from './types.ts'

/** {@linkcode EmptyStateBaseProps} plus `icon`/`action`. Written out explicitly (rather than a
 * direct alias to `EmptyStateRenderProps<ReactNode>`) so this package's public API surface never
 * names an unexported type, the same `deno doc --lint` constraint `Card`'s own `CardProps` doc
 * already documents. */
export type EmptyStateProps = EmptyStateBaseProps & {
  /** See `render.ts`'s own `EmptyStateRenderProps.icon` doc — same render-prop slot, returning
   * `ReactNode`. */
  icon?: () => ReactNode
  /** See `render.ts`'s own `EmptyStateRenderProps.action` doc. */
  action?: () => ReactNode
}

/**
 * A generic "nothing here yet" block: an optional decorative icon slot, a required heading, an
 * optional description, and an optional call-to-action slot. Real implementation shared with the
 * Preact binding via `render.ts`'s own `createEmptyState` (see that file's own doc for the full
 * contract, including why `action` stays a plain render-prop rather than a bundled `Button`/`Link`
 * dependency); import from `@zanix/space-ui/preact` instead for the Preact one, same contract, same
 * rendered behavior.
 *
 * Usable both as a standalone page-level state and nested inside a `Card`/section —
 * `headingLevel` (default `'h3'`) is the lever for fitting either context; see
 * {@linkcode EmptyStateHeadingLevel}'s own doc.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={() => <CatalogIcon name="search" href="/sprite.svg" />}
 *   heading="No results found"
 *   description="Try a different search term."
 *   action={() => <Button onClick={clearFilters}>Clear filters</Button>}
 * />
 * ```
 */
// Same widening cast `Card/index.ts`'s own doc explains in full — `createEmptyState`'s shared body
// types `icon`/`action` as `() => E` (here, `() => ReactElement`), while this component's own
// public props are deliberately the wider `() => ReactNode`.
export const EmptyState: (props: EmptyStateProps) => ReactElement = createEmptyState(
  createElement as unknown as CreateElement<ReactElement>,
) as (props: EmptyStateProps) => ReactElement
