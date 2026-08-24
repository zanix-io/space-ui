import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createImgButton } from './render.ts'
import type { ImgButtonProps } from './types.ts'

/**
 * A composition of `Button`/`Link` + `Icon`/`Image` — see `index.ts`'s own doc for the full
 * description. Preact binding, same props, same rendered markup; import from `@zanix/space-ui`
 * (no subpath) for the React one.
 */
// Same overload-set mismatch as `Icon/index.preact.ts`'s own cast, same reasoning.
export const ImgButton: (props: ImgButtonProps) => VNode = createImgButton(
  h as unknown as CreateElement<VNode>,
)
