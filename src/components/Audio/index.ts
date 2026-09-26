import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createAudio } from './render.ts'
import type { AudioProps } from './types.ts'

/**
 * A real, native `<audio>` — headless, no custom-styled chrome, no source-format detection (a caller
 * always supplies a real playable `src`). See {@linkcode AudioProps}'s own doc for the full contract,
 * and `render.ts`'s own doc for exactly what's deliberately not built in (pretty controls, `poster`/
 * `playsInline`/`tracks`, source detection) and why.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * ## Comet-safe, root barrel — a relative file/source path is NOT auto-resolved here
 *
 * This binding calls `createAudio(h)` with no resolver injected: zero `@zanix/space/assets-manifest`
 * reachability. Works exactly as expected for any already-absolute `src`/`sources[].src` — a CDN URL,
 * or a `blob:` Object URL from an authenticated fetch already resolved into memory (the common case
 * for a Comet author, e.g. a chat app's own voice-message playback). A relative local file path is
 * left exactly as given, never resolved against a manifest. Import from
 * `@zanix/space-ui/runtime/audio` (a `/preact` variant alongside) instead for the byte-for-byte
 * identical component that DOES auto-resolve a relative path via `@zanix/space`'s own
 * `resolveAssetHref` — SSR-only, not comet-safe.
 *
 * @example
 * ```tsx
 * <Audio src="https://cdn.example.com/voice-message.webm" controls preload="metadata" />
 * <Audio src={objectUrl} controls autoPlay />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const Audio: (props: AudioProps) => ReactElement = createAudio(
  createElement as unknown as CreateElement<ReactElement>,
)
