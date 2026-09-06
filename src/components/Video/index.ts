import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createVideo } from './render.ts'
import type { VideoProps } from './types.ts'

/**
 * YouTube, Vimeo, a generic embeddable URL, or a local/CDN video file — one component, classified
 * by `@zanix/space`'s `detectVideoSource` (a real, unconditional dependency — see `render.ts`'s own
 * module doc for why this one stays static even in this comet-safe binding). Renders `IFrame` for
 * the first three, a real native `<video>` for the last, and `null` for anything
 * undetectable/unsupported (e.g. an `.m3u8` HLS manifest — `@zanix/space` doesn't support HLS).
 * Headless: native `controls` only, no custom-styled chrome; `loading="lazy"` is the only
 * lazy-loading story, browser-native. See {@linkcode VideoProps}'s own doc for the full contract,
 * and `render.ts`'s own doc for exactly what's kept/changed/dropped from the legacy
 * `zjs-react-components` `Video`.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * ## Comet-safe, root barrel — relative file/poster/track paths are NOT auto-resolved here
 *
 * This binding calls `createVideo(h)` with no resolver injected — zero `@zanix/space/assets-
 * manifest` reachability (the one real `'server-only'`-flagged dependency; `video-source`'s
 * classification stays static and is itself safe for a Comet, see `render.ts`'s own doc). Works
 * exactly as expected for YouTube/Vimeo/generic-iframe embeds and any already-absolute local/CDN
 * file `src`/`sources[].src`/`poster`/each `track.src` — the common case for a Comet author. A
 * relative local file/poster/track path is left exactly as given, never resolved against a
 * manifest. Import from `@zanix/space-ui/runtime/video` (a `/preact` variant alongside) instead for
 * the byte-for-byte identical component that DOES auto-resolve a relative path via `@zanix/space`'s
 * own `resolveAssetHref` — SSR-only, not comet-safe, unchanged from this component's own prior
 * behavior.
 *
 * @example
 * ```tsx
 * <Video src="https://youtu.be/dQw4w9WgXcQ" title="Song title" autoPlay muted loop controls />
 * <Video src="https://cdn.example.com/hero.mp4" title="Product demo" poster="https://cdn.example.com/hero-poster.jpg" controls />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const Video: (props: VideoProps) => ReactElement | null = createVideo(
  createElement as unknown as CreateElement<ReactElement>,
)
