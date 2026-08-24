import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createImgButton } from './render.ts'
import type { ImgButtonProps } from './types.ts'

/**
 * A composition of `Button`/`Link` + `Icon`/`Image` — an icon or image, an optional caption, and
 * one interactive control around them. `href` present composes `Link` (navigation); absent
 * composes `Button` (an action) — never a single always-`<a>` shape. See {@linkcode ImgButtonProps}'s
 * own doc for the full contract, and `render.ts`'s own doc for exactly how `Icon`/`Image` are
 * composed and why the accessible name lives only on the interactive element.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <ImgButton href="/cart" label="View cart" icon={{ href: '/sprite.svg', name: 'cart', viewBox: '0 0 24 24' }} />
 * <ImgButton onClick={() => save()} label="Save" icon={{ href: '/sprite.svg', name: 'save', viewBox: '0 0 24 24' }} />
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const ImgButton: (props: ImgButtonProps) => ReactElement = createImgButton(
  createElement as unknown as CreateElement<ReactElement>,
)
