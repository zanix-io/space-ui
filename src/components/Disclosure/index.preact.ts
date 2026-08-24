import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useId, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createDisclosure } from './render.ts'
import type { DisclosureBaseProps } from './types.ts'

/** {@linkcode DisclosureBaseProps} plus the trigger and the collapsible content. */
export type DisclosureProps = DisclosureBaseProps & {
  trigger: ComponentChildren
  children: ComponentChildren
}

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (why `trigger` is content not an
 * element, why `hidden` not unmounting, why not `<details>`, why no `role="region"` by default, the
 * `useId()`/SSR note, the deliberately-hydrated, `id`/`className`-on-the-wrapper decisions) — not
 * repeated here. Same contract, same rendered behavior, real implementation shared with the React
 * binding via `render.ts`'s own `createDisclosure` (hook injection — see that file's own doc for
 * why that's sound) — never `preact/compat`.
 */
export const Disclosure: (props: DisclosureProps) => VNode = createDisclosure<
  VNode,
  ComponentChildren
>(
  h as unknown as CreateElement<VNode>,
  { useId, useState },
)
