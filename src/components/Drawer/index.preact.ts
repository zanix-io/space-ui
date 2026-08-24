import { Fragment, h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.preact.ts'
import { useFocusScope } from 'shared/focus-scope.preact.ts'
import { createDrawer } from './render.ts'
import type { DrawerAccessibleName, DrawerBaseProps } from './types.ts'

/** {@linkcode DrawerBaseProps} plus an accessible name and the panel's own content. */
export type DrawerProps = DrawerBaseProps & DrawerAccessibleName & { children: ComponentChildren }

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (why this shares `Modal`'s own
 * overlay stack, why `side` has no default, everything else identical to `Modal`'s own contract) —
 * not repeated here. Same contract, same rendered behavior, real implementation shared with the
 * React binding via `render.ts`'s own `createDrawer` (hook injection — see that file's own doc for
 * why that's sound) — never `preact/compat`.
 */
export const Drawer: (props: DrawerProps) => VNode | null = createDrawer<VNode, ComponentChildren>(
  h as unknown as CreateElement<VNode>,
  { useEffect, useRef, useFocusScope, useCloseOnOutside },
  Fragment,
)
