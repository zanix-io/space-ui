import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createImage } from './render.ts'
import type { ImageProps } from './types.ts'

/**
 * A real `<img>` (or a `<picture>` with art-direction `<source>`s, when {@linkcode ImageProps.sources}
 * is given) — headless, no visual defaults of its own (including no forced `object-fit`). `src`
 * (and the optional {@linkcode ImageProps.placeholder}) resolve through `@zanix/space`'s
 * `resolveAssetHref`, the same mechanism `Video.src`/`Video.poster` already use — any generated
 * image file (e.g. a video thumbnail) registered as a normal asset is just an ordinary `src` or
 * `placeholder` here. Native `loading`/`fetchPriority`/`decoding` only, no custom lazy-loading
 * machinery; `placeholder` shows a fallback image with zero JavaScript of its own. See
 * {@linkcode ImageProps}'s own doc for the full contract, and `render.ts`'s own doc for the full
 * set of design decisions behind this component.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <Image src="/images/hero.jpg" alt="A mountain at sunrise" width={1200} height={630} />
 * <Image
 *   src="/images/hero-desktop.jpg"
 *   alt="A mountain at sunrise"
 *   placeholder="/images/hero-thumb.jpg"
 *   sources={[{ media: '(max-width: 599px)', src: '/images/hero-mobile.jpg' }]}
 * />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const Image: (props: ImageProps) => ReactElement = createImage(
  createElement as unknown as CreateElement<ReactElement>,
)
