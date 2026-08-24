import { createElement, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createTable } from './render.ts'
import type { TableBaseProps, TableColumnBase } from './types.ts'

export type { TableSort, TableSortDirection } from './types.ts'

/** One column definition — {@linkcode TableColumnBase} plus its header/cell content. Same
 * "content of the element this component renders, never a pre-built element" contract
 * `Disclosure.trigger`/`Accordion.trigger` already establish for `header`; `cell` is always an
 * explicit function with no implicit `row[key]` stringification fallback — the same "the caller
 * decides the shape entirely" contract `Pagination.getPageHref` already established, applied here
 * to cell content instead of a URL. */
export type TableColumn<Row> = TableColumnBase & {
  header: ReactNode
  cell: (row: Row, rowIndex: number) => ReactNode
}

/** {@linkcode TableBaseProps} with the React-specific node types layered on top. Structurally
 * identical to `render.ts`'s own internal `TableRenderProps<Row, ReactNode>` — kept as its own,
 * self-contained public type here (rather than a direct alias to that internal one) so this
 * package's public API surface never names an unexported type, the same "public type never
 * references a private one" constraint `deno doc --lint` enforces for every other component here. */
export type TableProps<Row> = TableBaseProps<Row> & {
  columns: TableColumn<Row>[]
  caption?: ReactNode
  emptyState?: ReactNode
}

/**
 * A `<table>` of caller-resolved `columns`/`rows` — headless, generic over the caller's own row
 * shape (`Row`), the same "presents data, never owns it" seam every component in this package
 * keeps (no fetch, no router calls, no form state — `Table` receives already-resolved rows and
 * renders them, nothing more). Real implementation shared with the Preact binding via
 * `render.ts`'s own `createTable` (see that file's own doc for how — hook injection, not just
 * `h`); import from `@zanix/space-ui/preact` instead for the Preact one, same contract, same
 * rendered behavior. No legacy equivalent — new.
 *
 * ## Controlled sort, mirroring `Pagination`'s own `page`/`onPageChange` shape exactly
 *
 * `sort`/`onSortChange` follow the identical controlled/uncontrolled contract `Pagination.page`
 * already established: this component never sorts `rows` itself — a sortable header's `Button`
 * click only computes the NEXT `TableSort` (`get-next-table-sort.ts`) and hands it back; applying
 * it to `rows` stays entirely the caller's own job, same as `Pagination` never constructing a URL
 * itself.
 *
 * ## `getRowHref`, mirroring `Pagination`'s own `getPageHref`
 *
 * When given, each row's first column renders its cell content wrapped in a real `Link` instead
 * of plain content — this component never constructs a URL itself. Unlike `Pagination`, there's
 * no "`Button` otherwise" fallback: a `<tr>` has no native interactive-control equivalent the way
 * a page item does, so a table with no `getRowHref` is simply a plain, non-navigable table.
 *
 * ## `aria-sort`, not a hand-rolled sort indicator
 *
 * A sortable column's `<th>` carries the real `aria-sort` attribute (`'ascending'`/`'descending'`/
 * `'none'`) — the WAI-ARIA-recommended technique for a sortable table header (seam 5: prefer
 * native/ARIA mechanisms over hand-rolled state). The header's own clickable control composes a
 * real `Button` (inherits `data-space-ui="button"`, no redundant hook — same composed-markup rule
 * `Pagination`'s own page-item `Button`/`Link` already follow).
 */
// Same overload-set mismatch as `Icon/index.ts`'s own cast, same reasoning — see that file's doc.
// `createTable`'s own `Row`/`Node` type parameters can't be inferred from `h`/`hooks` alone
// (neither depends on them) and are fully erased at runtime regardless — bound once here as
// `unknown`/`ReactNode`, then the bound value's TYPE (never its runtime behavior, which is already
// correct for every `Row`: the shared body only ever reads `Row` through caller-supplied functions
// — `rowKey`/`cell`/`getRowHref`/`onRowClick` — never assumes a concrete shape of its own) is
// widened back to the real generic signature `Table<Row>` documents and every call site needs.
// `TableProps<Row>` (this file's own, public) is structurally identical to `render.ts`'s internal
// `TableRenderProps<Row, ReactNode>` the factory actually returned a function for — the cast is
// exactly this widening, nothing more.
export const Table = createTable<ReactElement, unknown, ReactNode>(
  createElement as unknown as CreateElement<ReactElement>,
  { useState },
) as <Row>(props: TableProps<Row>) => ReactElement | null
