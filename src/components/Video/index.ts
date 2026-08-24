import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createVideo } from './render.ts'
import type { VideoProps } from './types.ts'

/**
 * YouTube, Vimeo, a generic embeddable URL, or a local/CDN video file — one component, classified
 * by `@zanix/space`'s `detectVideoSource`. Renders `IFrame` for the first three, a real native
 * `<video>` for the last, and `null` for anything undetectable/unsupported (e.g. an `.m3u8` HLS
 * manifest — `@zanix/space` doesn't support HLS). Headless: native `controls` only, no
 * custom-styled chrome; `loading="lazy"` is the only lazy-loading story, browser-native. See
 * {@linkcode VideoProps}'s own doc for the full contract, and `render.ts`'s own doc for exactly
 * what's kept/changed/dropped from the legacy `zjs-react-components` `Video`.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <Video src="https://youtu.be/dQw4w9WgXcQ" title="Song title" autoPlay muted loop controls />
 * <Video src="/videos/hero.mp4" title="Product demo" poster="/images/hero-poster.jpg" controls />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const Video: (props: VideoProps) => ReactElement | null = createVideo(
  createElement as unknown as CreateElement<ReactElement>,
)
