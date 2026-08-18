import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createIcon } from './render.ts'
import type { IconProps } from './types.ts'

/**
 * An SVG sprite icon — see `index.ts`'s own doc for the full description. Preact binding, same
 * props, same rendered markup; import from `@zanix/space-ui` (no subpath) for the React one.
 */
// Same overload-set mismatch as `index.ts`'s own cast, same reasoning — see that file's doc for
// the full explanation. `h` is overloaded per-tag the same way `React.createElement` is.
export const Icon: (props: IconProps) => VNode = createIcon(
  h as unknown as CreateElement<VNode>,
)
