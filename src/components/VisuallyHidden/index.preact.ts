import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createVisuallyHidden } from './render.ts'
import type { VisuallyHiddenProps } from './types.ts'

/**
 * Hides content visually while keeping it announced to assistive technology — see `index.ts`'s own
 * doc for the full description. Preact binding, same props, same rendered markup; import from
 * `@zanix/space-ui` (no subpath) for the React one.
 */
// Same overload-set cast `Icon/index.preact.ts` already needs and explains in full.
export const VisuallyHidden: (props: VisuallyHiddenProps) => VNode = createVisuallyHidden(
  h as unknown as CreateElement<VNode>,
)
