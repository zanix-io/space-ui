import { Fragment, h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useId, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createTabs } from './render.ts'
import type { TabItemBase, TabsBaseProps } from './types.ts'

/** One tab: {@linkcode TabItemBase} plus its `Button` label and panel content. */
export type TabItem = TabItemBase & {
  label: ComponentChildren
  children: ComponentChildren
}

/** {@linkcode TabsBaseProps} plus the list of tabs. */
export type TabsProps = TabsBaseProps & {
  items: TabItem[]
}

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (the tablist/tabpanel pattern,
 * the single-`useId()`-derived-per-item id scheme, why this defaults to the first item unlike
 * `RadioGroup`) — not repeated here. Same contract, same rendered behavior, real implementation
 * shared with the React binding via `render.ts`'s own `createTabs` (hook injection — see that
 * file's own doc for why that's sound) — never `preact/compat`.
 */
export const Tabs: (props: TabsProps) => VNode = createTabs<VNode, ComponentChildren>(
  h as unknown as CreateElement<VNode>,
  { useId, useRef, useState },
  Fragment,
)
