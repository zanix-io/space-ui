import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createLink } from './render.ts'
import type { LinkProps } from './types.ts'

/**
 * A plain `<a>` with sensible external-link attributes — see `index.ts`'s own doc for the full
 * description. Preact binding, same props, same rendered markup; import from `@zanix/space-ui`
 * (no subpath) for the React one.
 */
// Same overload-set mismatch as `Icon/index.preact.ts`'s own cast, same reasoning.
export const Link: (props: LinkProps) => VNode = createLink(
  h as unknown as CreateElement<VNode>,
)
