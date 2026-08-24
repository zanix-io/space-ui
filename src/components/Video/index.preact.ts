import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createVideo } from './render.ts'
import type { VideoProps } from './types.ts'

/**
 * YouTube, Vimeo, a generic embeddable URL, or a local/CDN video file — see `index.ts`'s own doc
 * for the full description. Preact binding, same props, same rendered markup; import from
 * `@zanix/space-ui` (no subpath) for the React one.
 */
// Same overload-set mismatch as `Icon/index.preact.ts`'s own cast, same reasoning.
export const Video: (props: VideoProps) => VNode | null = createVideo(
  h as unknown as CreateElement<VNode>,
)
