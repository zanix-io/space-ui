import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createIFrame } from './render.ts'
import type { IFrameProps } from './types.ts'

/**
 * A real, standalone `<iframe>` primitive — see `index.ts`'s own doc for the full description.
 * Preact binding, same props, same rendered markup; import from `@zanix/space-ui` (no subpath)
 * for the React one.
 */
// Same overload-set mismatch as `Icon/index.preact.ts`'s own cast, same reasoning.
export const IFrame: (props: IFrameProps) => VNode = createIFrame(
  h as unknown as CreateElement<VNode>,
)
