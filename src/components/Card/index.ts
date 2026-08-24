import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createCard } from './render.ts'
import type { CardProps } from './types.ts'

/**
 * A title/subtitle/content/footer/image composition built entirely on `Grid`, `Image`, and `Link`
 * — no duplicated layout, asset-resolution, or link-rendering logic. The stacked (mobile) vs.
 * side-by-side (desktop, ≥721px) layout is resolved entirely by CSS
 * (`src/templates/shared/card.css`, optional) — this component runs no viewport detection, ships
 * with no JavaScript fallback for it, and is fully valid, correctly ordered markup with or
 * without that CSS loaded. See {@linkcode CardProps}'s own doc for the full contract, and
 * `render.ts`'s own doc for exactly how the responsive layout is expressed.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <Card
 *   title="A mountain retreat"
 *   content="Description of the property goes here."
 *   image={{ src: '/images/cabin.jpg', alt: 'A cabin in the mountains', align: 'left' }}
 *   footer={[{ href: '/listings/cabin', children: 'View listing' }]}
 * />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const Card: (props: CardProps) => ReactElement = createCard(
  createElement as unknown as CreateElement<ReactElement>,
)
