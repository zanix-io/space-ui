/**
 * `Video`'s Preact binding — same props, same rendered markup as `./runtime/video` (React). See
 * `./runtime/video`'s own `@module` doc for why this package's real `@zanix/space`-dependent
 * components each get their own single-component subpath (never a shared combined `./runtime`
 * barrel, removed as of this change), and for "Two bindings, same name, additive" — why this file
 * constructs `Video` directly (with `resolveAssetHref` injected) rather than re-exporting
 * `components/Video/index.preact.ts`, which is now the separate, comet-safe root-barrel binding
 * instead.
 *
 * @module
 */

import { h } from 'preact'
import type { VNode } from 'preact'
import { resolveAssetHref } from '@zanix/space/assets-manifest'
import type { CreateElement } from 'typings/renderer.ts'
import { createVideo } from 'components/Video/render.ts'
import type { VideoProps } from 'components/Video/types.ts'

export type {
  /** See `components/Video/types.ts`'s own `VideoProps` for the full doc. */
  VideoProps,
  /** See `components/Video/types.ts`'s own `VideoSourceProps` for the full doc. */
  VideoSourceProps,
  /** See `components/Video/types.ts`'s own `VideoTrackProps` for the full doc. */
  VideoTrackProps,
} from 'components/Video/types.ts'

export const Video: (props: VideoProps) => VNode | null = createVideo(
  h as unknown as CreateElement<VNode>,
  resolveAssetHref,
)
