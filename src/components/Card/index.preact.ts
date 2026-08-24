import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createCard } from './render.ts'
import type { CardProps } from './types.ts'

/**
 * A title/subtitle/content/footer/image composition — see `index.ts`'s own doc for the full
 * description. Preact binding, same props, same rendered markup; import from `@zanix/space-ui`
 * (no subpath) for the React one.
 */
// Same overload-set mismatch as `Icon/index.preact.ts`'s own cast, same reasoning.
export const Card: (props: CardProps) => VNode = createCard(
  h as unknown as CreateElement<VNode>,
)
