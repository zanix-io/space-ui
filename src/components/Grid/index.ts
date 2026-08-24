import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createGrid, createGridItem } from './render.ts'
import type { GridItemProps, GridProps } from './types.ts'

/**
 * A real CSS Grid container — headless, `display: grid` is the one styling this component sets
 * itself (the functional mechanism its own `templateColumns`/`templateRows`/`gap` depend on, not
 * a visual opinion). Children are expected to be {@linkcode GridItem} elements, a type-level
 * contract only — see {@linkcode GridProps}'s own doc for the full contract, and `render.ts`'s
 * own doc for the full set of design decisions behind this component, including a real fix to an
 * inconsistent `columnEnd`/`rowEnd` offset.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <Grid templateColumns={3} gap="1rem">
 *   <GridItem>1</GridItem>
 *   <GridItem columnStart={2} columnEnd={3}>2 (spans column 2)</GridItem>
 *   <GridItem>3</GridItem>
 * </Grid>
 * ```
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
export const Grid: (props: GridProps) => ReactElement = createGrid(
  createElement as unknown as CreateElement<ReactElement>,
)

/** A single cell inside {@linkcode Grid} — see {@linkcode GridItemProps}'s own doc for the full
 * contract, and `Grid/render.ts`'s own doc for exactly how `columnStart`/`columnEnd`/`rowStart`/
 * `rowEnd` map onto real CSS grid line properties.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one. */
export const GridItem: (props: GridItemProps) => ReactElement = createGridItem(
  createElement as unknown as CreateElement<ReactElement>,
)
