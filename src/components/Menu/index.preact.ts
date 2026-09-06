import { Fragment, h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useId, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.preact.ts'
import { createMenu } from './render.ts'
import type { MenuBaseProps, MenuItemFields } from './types.ts'

export type { MenuItemFields, MenuOpenMode } from './types.ts'

/** One `Menu` entry, recursively — see `index.ts`'s own `MenuItem` doc for the full contract (this
 * is the same type, with `ComponentChildren` in place of `ReactNode`). */
export type MenuItem = MenuItemFields & {
  /** See `index.ts`'s own `MenuItem.visual` doc — same render-prop slot, returning
   * `ComponentChildren` instead of `ReactNode`. */
  visual?: () => ComponentChildren
  submenu?: MenuItem[]
}

/** {@linkcode MenuBaseProps} plus `items`. See `index.ts`'s own `MenuProps` doc for the full
 * reasoning. */
export type MenuProps = MenuBaseProps & { items: MenuItem[] }

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (structure, `toggle`, per-item
 * control shape, `openMode`, closing, and "Zero `@zanix/space` dependency, by construction") — not
 * repeated here. Same contract, same rendered behavior, real implementation shared with the React
 * binding via `render.ts`'s own `createMenu` (hook injection, plus the
 * `Fragment`-applied-unconditionally resolution — see that file's own doc) — never `preact/compat`.
 */
// Same widening cast `index.ts`'s own doc explains, applied to `ComponentChildren` here instead of
// `ReactNode`.
export const Menu: (props: MenuProps) => VNode = createMenu<VNode>(
  h as unknown as CreateElement<VNode>,
  { useId, useRef, useState, useCloseOnOutside },
  Fragment,
) as (props: MenuProps) => VNode
