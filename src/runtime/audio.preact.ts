/**
 * `Audio`'s Preact binding — same props, same rendered markup as `./runtime/audio` (React). See
 * `./runtime/audio`'s own `@module` doc for why this package's real `@zanix/space`-dependent
 * components each get their own single-component subpath.
 *
 * @module
 */

import { h } from 'preact'
import type { VNode } from 'preact'
import { resolveAssetHref } from '@zanix/space/assets-manifest'
import type { CreateElement } from 'typings/renderer.ts'
import { createAudio } from 'components/Audio/render.ts'
import type { AudioProps } from 'components/Audio/types.ts'

export type {
  /** See `components/Audio/types.ts`'s own `AudioProps` for the full doc. */
  AudioProps,
  /** See `components/Audio/types.ts`'s own `AudioSourceProps` for the full doc. */
  AudioSourceProps,
} from 'components/Audio/types.ts'

export const Audio: (props: AudioProps) => VNode = createAudio(
  h as unknown as CreateElement<VNode>,
  resolveAssetHref,
)
