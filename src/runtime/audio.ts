import { createElement } from 'react'
import type { ReactElement } from 'react'
import { resolveAssetHref } from '@zanix/space/assets-manifest'
import type { CreateElement } from 'typings/renderer.ts'
import { createAudio } from 'components/Audio/render.ts'
import type { AudioProps } from 'components/Audio/types.ts'

export type { AudioProps, AudioSourceProps } from 'components/Audio/types.ts'

/**
 * `Audio` — one of `@zanix/space-ui`'s components with a REAL runtime dependency on `@zanix/space`
 * (`resolveAssetHref`, from `@zanix/space/assets-manifest`, injected directly into
 * `Audio/render.ts`'s own `createAudio`) — its own, single-component subpath, never the default (`.`)
 * barrel, and never sharing another component's `./runtime/*` file — see `./runtime/video.ts`'s own
 * `@module` doc for the full "why a per-component subpath, not one shared `./runtime` barrel"
 * reasoning, not repeated here.
 *
 * Two real bindings of the same component name, additive, the identical shape `Video`'s/`Image`'s own
 * module docs document for their own split: `components/Audio/index.ts`/`index.preact.ts` (the
 * default `.`/`./preact` barrel) call `createAudio(h)` with NO resolver — comet-safe, correct for an
 * already-absolute `src`/`sources[].src` (a CDN URL, a `blob:` Object URL) a caller supplies itself.
 * This file injects `resolveAssetHref` instead, auto-resolving a relative `src`/`sources[].src` to
 * its real, possibly content-hashed build URL — SSR-only, never comet-safe, `@zanix/space`-dependent
 * by design.
 *
 * @module
 */

export const Audio: (props: AudioProps) => ReactElement = createAudio(
  createElement as unknown as CreateElement<ReactElement>,
  resolveAssetHref,
)
