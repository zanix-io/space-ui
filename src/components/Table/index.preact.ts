import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createTable } from './render.ts'
import type { TableBaseProps, TableColumnBase } from './types.ts'

export type { TableSort, TableSortDirection } from './types.ts'

/** See `index.ts`'s own doc for the full contract on `header`/`cell` — not repeated here. */
export type TableColumn<Row> = TableColumnBase & {
  header: ComponentChildren
  cell: (row: Row, rowIndex: number) => ComponentChildren
}

/** {@linkcode TableBaseProps} with the Preact-specific node types layered on top. Structurally
 * identical to `render.ts`'s own internal `TableRenderProps<Row, ComponentChildren>` — kept as its
 * own, self-contained public type here, same reasoning as `index.ts`'s own `TableProps` doc. */
export type TableProps<Row> = TableBaseProps<Row> & {
  columns: TableColumn<Row>[]
  caption?: ComponentChildren
  emptyState?: ComponentChildren
}

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (`sort`/`onSortChange`
 * controlled shape mirroring `Pagination.page`, `getRowHref` mirroring `Pagination.getPageHref`,
 * why `aria-sort` and not a hand-rolled indicator) — not repeated here. Same contract, same
 * rendered behavior, real implementation shared with the React binding via `render.ts`'s own
 * `createTable` (hook injection, not just `h` — see that file's own doc for why that's sound) —
 * never `preact/compat`.
 */
// Same widening cast `index.ts`'s own `Table` binding needs, same reasoning — see that file's doc.
export const Table = createTable<VNode, unknown, ComponentChildren>(
  h as unknown as CreateElement<VNode>,
  { useState },
) as <Row>(props: TableProps<Row>) => VNode | null
