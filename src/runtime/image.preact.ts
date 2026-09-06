import { h } from 'preact'
import type { VNode } from 'preact'
import { resolveAssetHref } from '@zanix/space/assets-manifest'
import type { CreateElement } from 'typings/renderer.ts'
import { createImage } from 'components/Image/render.ts'
import type { ImageProps } from 'components/Image/types.ts'

export type {
  /** See `components/Image/types.ts`'s own `ImageProps` for the full doc. */
  ImageProps,
  /** See `components/Image/types.ts`'s own `ImageSourceProps` for the full doc. */
  ImageSourceProps,
} from 'components/Image/types.ts'

/**
 * `Image`'s Preact binding — same props, same rendered markup as `./runtime/image` (React). See
 * `./runtime/image`'s own `@module` doc for why this file constructs `Image` directly (with
 * `resolveAssetHref` injected) rather than re-exporting `components/Image/index.preact.ts`, which
 * is now the separate, comet-safe root-barrel binding instead.
 *
 * @module
 */

export const Image: (props: ImageProps) => VNode = createImage(
  h as unknown as CreateElement<VNode>,
  resolveAssetHref,
)
