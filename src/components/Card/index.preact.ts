import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createCard } from './render.ts'
import type { CardBaseProps } from './types.ts'

export type { CardBaseProps } from './types.ts'

/** See `index.ts`'s own `CardProps` doc — same type, with `ComponentChildren` in place of
 * `ReactNode`. */
export type CardProps = CardBaseProps & {
  /** See `index.ts`'s own `CardProps.visual` doc — same render-prop slot, returning
   * `ComponentChildren` instead of `ReactNode`. */
  visual?: () => ComponentChildren
}

/**
 * A title/subtitle/content/footer/visual composition — see `index.ts`'s own doc for the full
 * description, including "Comet-safe with `image` composed, by construction". Preact binding, same
 * props, same rendered markup; import from `@zanix/space-ui` (no subpath) for the React one.
 */
// Same widening cast `index.ts`'s own doc explains, applied to `ComponentChildren` here instead of
// `ReactNode`.
export const Card: (props: CardProps) => VNode = createCard(
  h as unknown as CreateElement<VNode>,
) as (props: CardProps) => VNode
