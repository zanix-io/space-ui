import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createImage } from './render.ts'
import type { ImageProps } from './types.ts'

/**
 * A real `<img>` (or a `<picture>` with art-direction `<source>`s, when {@linkcode ImageProps.sources}
 * is given) — headless, no visual defaults of its own (including no forced `object-fit`). Native
 * `loading`/`fetchPriority`/`decoding` only, no custom lazy-loading machinery; `placeholder` shows
 * a fallback image with zero JavaScript of its own. See {@linkcode ImageProps}'s own doc for the
 * full contract, and `render.ts`'s own doc for the full set of design decisions behind this
 * component.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * ## Comet-safe, root barrel — relative asset paths are NOT auto-resolved here
 *
 * This binding calls `createImage(h)` with no resolver injected (see `render.ts`'s own module doc)
 * — zero `@zanix/space` reachability, safe inside a `'use comet'` file. `src`/`sources[].src`/
 * `placeholder` all pass through UNTOUCHED: an already-absolute URL (a CDN image, the common case
 * for a Comet author) works exactly as expected; a relative local asset path is left exactly as
 * given, never resolved against a manifest. Import from `@zanix/space-ui/runtime/image` (a
 * `/preact` variant alongside) instead for the byte-for-byte identical component that DOES
 * auto-resolve a relative path via `@zanix/space`'s own `resolveAssetHref` — SSR-only, not
 * comet-safe, unchanged from this component's own prior behavior.
 *
 * @example
 * ```tsx
 * <Image src="https://cdn.example.com/hero.jpg" alt="A mountain at sunrise" width={1200} height={630} />
 * <Image
 *   src="https://cdn.example.com/hero-desktop.jpg"
 *   alt="A mountain at sunrise"
 *   placeholder="https://cdn.example.com/hero-thumb.jpg"
 *   sources={[{ media: '(max-width: 599px)', src: 'https://cdn.example.com/hero-mobile.jpg' }]}
 * />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const Image: (props: ImageProps) => ReactElement = createImage(
  createElement as unknown as CreateElement<ReactElement>,
)
