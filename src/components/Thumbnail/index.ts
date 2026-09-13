import { createElement, useRef } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { useImageLoadState } from 'shared/use-image-load-state.ts'
import { createThumbnail } from './render.ts'
import type { ThumbnailBaseProps } from './types.ts'

export type { ThumbnailBaseProps } from './types.ts'

/** {@linkcode ThumbnailBaseProps} plus `fallback`. Written out explicitly (rather than a direct
 * alias to `ThumbnailRenderProps<ReactNode>`) so this package's public API surface never names an
 * unexported type, the same `deno doc --lint` constraint `Menu`'s own `MenuProps` doc already
 * documents. */
export type ThumbnailProps = ThumbnailBaseProps & {
  /** Render-prop slot for the caller-owned fallback content — see `render.ts`'s own
   * `ThumbnailRenderProps.fallback` doc for the full contract. */
  fallback: () => ReactNode
}

/**
 * A non-person image (a product photo, a video thumbnail, ...) with a caller-supplied fallback and
 * a real, confirmed pending/loaded/failed state exposed as `data-loaded`/`data-pending` — `Avatar`'s
 * closest sibling, but for content with no derivable stand-in the way a person's own initials are.
 * See {@linkcode ThumbnailProps}'s own doc for the full contract, and `render.ts`'s own doc for the
 * complete design record (composed `Image`/`Skeleton`, the shared `useImageLoadState` mechanism,
 * the accessible-name split between the image and fallback branches).
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <Thumbnail
 *   src={product.imageUrl}
 *   alt={product.name}
 *   fallback={() => <Icon name="image" />}
 * />
 * ```
 */
// Same widening cast `Card/index.ts`'s own doc explains in full — `createThumbnail`'s shared body
// types `fallback` as `() => E` (here, `() => ReactElement`), while this component's own public
// `ThumbnailProps.fallback` is deliberately the wider `() => ReactNode` (so a caller can return a
// string/`null`/fragment, not just a single `ReactElement`). The cast is this widening, nothing
// more: `fallback()`'s result is only ever handed straight to `h` as a child, which accepts the
// full `ReactNode` range regardless of this binding's own internal type parameter.
export const Thumbnail: (props: ThumbnailProps) => ReactElement = createThumbnail(
  createElement as unknown as CreateElement<ReactElement>,
  { useRef, useImageLoadState },
) as (props: ThumbnailProps) => ReactElement
