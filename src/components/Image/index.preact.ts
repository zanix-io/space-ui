import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createImage } from './render.ts'
import type { ImageProps } from './types.ts'

/**
 * A real `<img>` (or a `<picture>` with art-direction `<source>`s) — see `index.ts`'s own doc for
 * the full description. Preact binding, same props, same rendered markup; import from
 * `@zanix/space-ui` (no subpath) for the React one.
 */
// Same overload-set mismatch as `Icon/index.preact.ts`'s own cast, same reasoning.
export const Image: (props: ImageProps) => VNode = createImage(
  h as unknown as CreateElement<VNode>,
)
