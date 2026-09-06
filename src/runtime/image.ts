import { createElement } from 'react'
import type { ReactElement } from 'react'
import { resolveAssetHref } from '@zanix/space/assets-manifest'
import type { CreateElement } from 'typings/renderer.ts'
import { createImage } from 'components/Image/render.ts'
import type { ImageProps } from 'components/Image/types.ts'

export type { ImageProps, ImageSourceProps } from 'components/Image/types.ts'

/**
 * `Image` — see `./runtime/video`'s own `@module` doc for why this package's real
 * `@zanix/space`-dependent components each get their own single-component subpath (never a shared
 * combined `./runtime` barrel, removed as of this change). Unlike every other file here, this one
 * doesn't merely re-export `components/Image/index.ts` — that file is now the SEPARATE, comet-safe
 * root-barrel binding (`createImage(h)`, no resolver — see its own doc). This file is the OTHER
 * binding `Image/render.ts`'s own now-resolver-agnostic factory makes possible: `createImage(h,
 * resolveAssetHref)`, injecting `@zanix/space/assets-manifest`'s own `resolveAssetHref` — the ONLY
 * place in this package's own `Image`-related files that imports it — so `src`/`sources[].src`/
 * `placeholder` all auto-resolve a relative local asset path exactly as this component always has.
 * Byte-for-byte identical behavior to every prior version of this component; SSR-only, never
 * comet-safe.
 *
 * @module
 */

export const Image: (props: ImageProps) => ReactElement = createImage(
  createElement as unknown as CreateElement<ReactElement>,
  resolveAssetHref,
)
