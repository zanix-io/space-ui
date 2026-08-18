import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from './render.ts'
import type { ButtonProps } from './types.ts'

/**
 * A real `<button>` — see `index.ts`'s own doc for the full description. Preact binding, same
 * props, same rendered markup; import from `@zanix/space-ui` (no subpath) for the React one.
 */
// Same overload-set mismatch as `Icon/index.preact.ts`'s own cast, same reasoning.
export const Button: (props: ButtonProps) => VNode = createButton(
  h as unknown as CreateElement<VNode>,
)
