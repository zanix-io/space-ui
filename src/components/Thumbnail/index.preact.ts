import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useRef } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { useImageLoadState } from 'shared/use-image-load-state.preact.ts'
import { createThumbnail } from './render.ts'
import type { ThumbnailBaseProps } from './types.ts'

export type { ThumbnailBaseProps } from './types.ts'

/** {@linkcode ThumbnailBaseProps} plus `fallback` — see `index.ts`'s own `ThumbnailProps` doc for
 * why this is written out explicitly rather than aliased. */
export type ThumbnailProps = ThumbnailBaseProps & {
  /** Render-prop slot for the caller-owned fallback content — see `render.ts`'s own
   * `ThumbnailRenderProps.fallback` doc for the full contract. */
  fallback: () => ComponentChildren
}

/**
 * A non-person image with a caller-supplied fallback and a real, confirmed pending/loaded/failed
 * state — see `index.ts`'s own doc for the full contract, not repeated here. Preact binding, same
 * props, same rendered markup; import from `@zanix/space-ui` (no subpath) for the React one.
 */
// Same widening cast `index.ts`'s own doc explains in full — `fallback` is `() => ComponentChildren`
// here (the wider Preact equivalent of React's `ReactNode`), while `createThumbnail`'s shared body
// types it as `() => E` (`VNode`) internally.
export const Thumbnail: (props: ThumbnailProps) => VNode = createThumbnail(
  h as unknown as CreateElement<VNode>,
  { useRef, useImageLoadState },
) as (props: ThumbnailProps) => VNode
