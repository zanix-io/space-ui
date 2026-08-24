import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createGrid, createGridItem } from './render.ts'
import type { GridItemProps, GridProps } from './types.ts'

/**
 * A real CSS Grid container — see `index.ts`'s own doc for the full description. Preact binding,
 * same props, same rendered markup; import from `@zanix/space-ui` (no subpath) for the React one.
 */
// Same overload-set mismatch as `Icon/index.preact.ts`'s own cast, same reasoning.
export const Grid: (props: GridProps) => VNode = createGrid(
  h as unknown as CreateElement<VNode>,
)

/** A single cell inside {@linkcode Grid} — Preact binding, see `index.ts`'s own doc. */
export const GridItem: (props: GridItemProps) => VNode = createGridItem(
  h as unknown as CreateElement<VNode>,
)
