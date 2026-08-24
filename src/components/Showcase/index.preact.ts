import { h, toChildArray } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import type { SliderProps } from 'components/Slider/index.preact.ts'
import { createShowcase } from './render.ts'
import type { ShowcaseBaseProps } from './types.ts'

/** {@linkcode ShowcaseBaseProps} plus the `Slider` props it forwards. */
export type ShowcaseProps = ShowcaseBaseProps & {
  /** Every other `Slider` prop — `id`/`className` land on this component's own top-level props
   * instead (never here too), so there's exactly one way to set either, not two possibly-
   * conflicting ones. */
  slider?: Omit<SliderProps, 'children' | 'id' | 'className'>
  children: ComponentChildren
}

/**
 * `children` grouped into pages of `itemsPerSlide`, each page one {@linkcode Slider} slide —
 * Preact binding, see `index.ts`'s own doc for the full contract (grouping-only scope, container-
 * width-vs-viewport-width rationale, the private measurement wrapper, the group wrapper's own
 * `display: flex`, SSR/hydration strategy, why `ResizeObserver` stays private, the `Slider` fix
 * this exposed) — not repeated here. Same contract, same rendered behavior, real implementation
 * shared with the React binding via `render.ts`'s own `createShowcase` (hook injection — see that
 * file's own doc for why that's sound) — never `preact/compat`. `toChildArray` (Preact's own core
 * equivalent of React's `Children.toArray`, no `preact/compat` needed) is injected in place of it,
 * the same way `Fragment` already is for other components.
 */
export const Showcase: (props: ShowcaseProps) => VNode = createShowcase<VNode, ComponentChildren>(
  h as unknown as CreateElement<VNode>,
  { useEffect, useRef, useState },
  toChildArray,
)
