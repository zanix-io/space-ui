import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createImgButton } from './render.ts'
import type { ImgButtonBaseProps } from './types.ts'

export type { ImgButtonBaseProps } from './types.ts'

/** See `index.ts`'s own `ImgButtonProps` doc — same type, with `ComponentChildren` in place of
 * `ReactNode`. */
export type ImgButtonProps = ImgButtonBaseProps & {
  /** See `index.ts`'s own `ImgButtonProps.visual` doc — same render-prop slot, returning
   * `ComponentChildren` instead of `ReactNode`. */
  visual?: () => ComponentChildren
}

/**
 * A composition of `Button`/`Link` + `Icon`/`Image` — see `index.ts`'s own doc for the full
 * description, including "Comet-safe with `image` composed, by construction". Preact binding, same
 * props, same rendered markup; import from `@zanix/space-ui` (no subpath) for the React one.
 */
// Same widening cast `index.ts`'s own doc explains, applied to `ComponentChildren` here instead of
// `ReactNode`.
export const ImgButton: (props: ImgButtonProps) => VNode = createImgButton(
  h as unknown as CreateElement<VNode>,
) as (props: ImgButtonProps) => VNode
