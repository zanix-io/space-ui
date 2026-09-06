'use comet'
import { Fragment, h } from 'preact'
import type { VNode } from 'preact'
import { useEffect, useId, useRef, useState } from 'preact/hooks'
import { defineComet } from '@zanix/space/comet'
import type { CometBoundaryComponent, CometProps } from '@zanix/space/comet'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.preact.ts'
import { useFocusScope } from 'shared/focus-scope.preact.ts'
import { createNavDrawer } from './render.ts'
import type { NavDrawerItem, NavDrawerProps } from './types.ts'

export type { NavDrawerItem, NavDrawerProps }

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (toggle+`Drawer`+`Menu`
 * composition, zero `@zanix/space` dependency through `Menu`, always uncontrolled, closes on real
 * navigation, composed-markup hooks) — not repeated here. Same contract, same rendered behavior,
 * real implementation shared with the React binding via `render.ts`'s own `createNavDrawer` — never
 * `preact/compat`.
 */
export const NavDrawer: (props: NavDrawerProps) => VNode = createNavDrawer<VNode>(
  h as unknown as CreateElement<VNode>,
  { useId, useRef, useState, useEffect, useCloseOnOutside, useFocusScope },
  Fragment,
)

/**
 * {@linkcode NavDrawer}, wrapped as a real Comet boundary — see `index.ts`'s own default-export doc
 * for the full reasoning (identical here, Preact binding).
 */
export default defineComet(NavDrawer, import.meta.url) as CometBoundaryComponent<
  NavDrawerProps & CometProps
>
