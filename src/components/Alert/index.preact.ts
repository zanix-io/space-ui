import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createAlert } from './render.ts'
import type { AlertProps } from './types.ts'

/**
 * A persistent, visible inline message banner — see `index.ts`'s own doc for the full description.
 * Preact binding, same props, same rendered markup; import from `@zanix/space-ui` (no subpath) for
 * the React one.
 */
// Same overload-set cast `Icon/index.preact.ts` already needs and explains in full.
export const Alert: (props: AlertProps) => VNode = createAlert(
  h as unknown as CreateElement<VNode>,
)
