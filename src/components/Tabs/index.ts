import { createElement, Fragment, useId, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createTabs } from './render.ts'
import type { TabItemBase, TabsBaseProps } from './types.ts'

/** One tab: {@linkcode TabItemBase} plus its `Button` label and panel content. */
export type TabItem = TabItemBase & {
  /** Content of this tab's own `Button` — same "content, not a pre-built element" contract every
   * other `trigger`/`label`-shaped prop in this package's new component family already has. */
  label: ReactNode
  /** This tab's panel content — rendered only while this tab is the active one. */
  children: ReactNode
}

/** {@linkcode TabsBaseProps} plus the list of tabs. */
export type TabsProps = TabsBaseProps & {
  items: TabItem[]
}

/**
 * The WAI-ARIA Tabs pattern: `role="tablist"` wrapping `role="tab"` items, roving tabindex (same
 * "arrow keys move AND select" automatic-activation behavior `RadioGroup` already establishes —
 * this package doesn't offer the WAI-ARIA APG's alternative "manual activation" mode, no evidence
 * has asked for it), and exactly one `role="tabpanel"` rendered at a time. Real implementation
 * shared with the Preact binding via `render.ts`'s own `createTabs` (see that file's own doc for
 * how — hook injection); import from `@zanix/space-ui/preact` instead for the Preact one, same
 * contract, same rendered behavior. No legacy equivalent — new; second real consumer of
 * `shared/roving-focus.ts`'s `createRovingKeyDownHandler`, alongside `RadioGroup`.
 *
 * ## Ids: one `useId()`, derived per item — never one call per item
 *
 * A tab's panel needs `aria-labelledby` pointing back at that specific tab's own `id` — a real
 * cross-reference `RadioGroup`'s own roving-tabindex lookup never needed (it queries by `role`
 * alone, never one specific item by id). Calling `useId()` inside `items.map(...)` would violate
 * the rules of hooks (a variable number of hook calls depending on `items.length`) — instead, ONE
 * `useId()` call at the top level, combined with each item's own `value` (always unique per the
 * data contract) produces a stable, unique, SSR-safe id per tab/panel pair without that problem.
 *
 * ## Defaults to the first item, unlike `RadioGroup`
 *
 * `RadioGroup` treats nothing-selected as a real, valid state. A tablist doesn't have that luxury
 * — nothing selected means no panel renders at all, a broken UI rather than a legitimate empty
 * one — so this defaults to `items[0]`'s own `value` when neither `value` nor `defaultValue` is
 * given, rather than leaving selection genuinely absent.
 */
export const Tabs: (props: TabsProps) => ReactElement = createTabs<ReactElement, ReactNode>(
  createElement as unknown as CreateElement<ReactElement>,
  { useId, useRef, useState },
  Fragment,
)
