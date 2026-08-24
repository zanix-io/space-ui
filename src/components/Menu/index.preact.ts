import { Fragment, h } from 'preact'
import type { VNode } from 'preact'
import { useId, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.preact.ts'
import { createMenu } from './render.ts'
import type { MenuProps } from './types.ts'

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (structure, `toggle`, per-item
 * control shape, `ImgButton` vs. direct composition, `openMode`, closing) — not repeated here. Same
 * contract, same rendered behavior, real implementation shared with the React binding via
 * `render.ts`'s own `createMenu` (hook injection, plus the `Fragment`-applied-unconditionally
 * resolution — see that file's own doc) — never `preact/compat`.
 */
export const Menu: (props: MenuProps) => VNode = createMenu<VNode>(
  h as unknown as CreateElement<VNode>,
  { useId, useRef, useState, useCloseOnOutside },
  Fragment,
)
