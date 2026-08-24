import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createLink } from '../Link/render.ts'
import { getNextTableSort } from './get-next-table-sort.ts'
import type { TableBaseProps, TableColumnBase, TableSort } from './types.ts'

/**
 * The subset of `useState` this component's shared body needs, injected alongside `h` — the same
 * `render.ts`-factory technique `Icon`/`Button`/`Link`/`CatalogIcon` already use for markup-only
 * sharing, extended to also inject the hook itself.
 *
 * This is a genuinely narrower case than `Counter`'s own doc (and this package's CHANGELOG) name
 * as the reason "a component with real per-renderer hook usage needs a full second implementation
 * instead": `Table` only ever calls `useState`, with no `useEffect`/`useRef` pair whose
 * cleanup/ref-identity semantics could plausibly differ between React and Preact. React's and
 * Preact's hooks dispatchers both key a hook's state on ITS OWN COMPONENT INSTANCE's call order
 * across renders, never on how the function that calls it was constructed — a `useState` call
 * reached through `hooks.useState(...)` inside a factory-returned closure is call-order-identical,
 * every render, to one written as a bare `useState(...)` directly in a hand-written function body.
 * Verified empirically before this file existed (not assumed): a throwaway prototype reimplementing
 * `Counter` — the harder case, real `useEffect`/`useRef`, mounted through both `react-dom`'s
 * `createRoot` and `preact`'s real `render()`, driven by this package's own deterministic
 * `IntersectionObserver`/`requestAnimationFrame` fake-clock mocks — confirmed state updates
 * re-render correctly, effect cleanup actually fires on both an unmount and a mid-animation prop
 * change, and neither renderer raised an "invalid hook call" or dispatcher error. `Table` itself
 * has no effect/ref to share and therefore needs even less than that already-confirmed case.
 *
 * A component whose body genuinely diverges between renderers (not just "which hook module it
 * imports from," but real different BEHAVIOR — e.g. `Combobox`'s own `onChange` vs `onInput` split,
 * a real, confirmed React/Preact event-semantics divergence) still needs a genuine second
 * implementation, or at minimum an isolated per-renderer branch — this technique only removes
 * duplication that was never anything but incidental (which module a hook is imported from) in the
 * first place.
 */
export type TableHooks = {
  useState: <T>(initial: T) => [T, (value: T) => void]
}

/** A column definition generic over both the caller's own row shape and the renderer's own node
 * type — `index.ts`/`index.preact.ts` each instantiate this with `ReactNode`/`ComponentChildren`
 * (their own `TableColumn<Row>`), same split {@linkcode TableColumnBase}'s own doc already
 * establishes for `header`/`cell`. */
export type TableRenderColumn<Row, Node> = TableColumnBase & {
  header: Node
  cell: (row: Row, rowIndex: number) => Node
}

/** {@linkcode TableBaseProps} with the renderer's own node type layered onto `columns`/`caption`/
 * `emptyState` — `index.ts`/`index.preact.ts` each instantiate this as their own `TableProps<Row>`. */
export type TableRenderProps<Row, Node> = TableBaseProps<Row> & {
  columns: TableRenderColumn<Row, Node>[]
  caption?: Node
  emptyState?: Node
}

/**
 * The real implementation of `Table`, shared identically between the React and Preact bindings —
 * same pattern as `Icon/render.ts`, extended with hook injection (see {@linkcode TableHooks}'s own
 * doc for why that's sound here). Composes the real `Button`/`Link` (via their own `render.ts`
 * factories, bound to the same `h`) — inherits their `data-space-ui="button"`/`"link"` hooks on the
 * elements they render, never a redundant one of its own; the `<table>` root itself carries
 * `data-space-ui="table"`.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (controlled `sort`, mirroring
 * `Pagination.page`; `getRowHref`, mirroring `Pagination.getPageHref`; why a real `aria-sort`
 * instead of a hand-rolled indicator) — not repeated here.
 */
export function createTable<E, Row, Node>(
  h: CreateElement<E>,
  hooks: TableHooks,
): (props: TableRenderProps<Row, Node>) => E | null {
  const Button = createButton(h)
  const Link = createLink(h)

  return function Table(props: TableRenderProps<Row, Node>): E | null {
    const {
      columns,
      rows,
      rowKey,
      sort: controlledSort,
      defaultSort = null,
      onSortChange,
      getRowHref,
      onRowClick,
      caption,
      emptyState,
      id,
      className,
    } = props
    const isSortControlled = controlledSort !== undefined
    const [internalSort, setInternalSort] = hooks.useState<TableSort | null>(defaultSort)
    const sort = isSortControlled ? controlledSort : internalSort

    const handleSort = (columnKey: string) => {
      const next = getNextTableSort(sort, columnKey)
      if (!isSortControlled) setInternalSort(next)
      onSortChange?.(next)
    }

    if (columns.length === 0) return null

    const headerCell = (column: TableRenderColumn<Row, Node>) => {
      if (!column.sortable) {
        return h('th', { key: column.key }, column.header)
      }
      const ariaSort = sort?.column === column.key
        ? (sort.direction === 'asc' ? 'ascending' : 'descending')
        : 'none'
      return h(
        'th',
        { key: column.key, 'aria-sort': ariaSort },
        Button({ onClick: () => handleSort(column.key), children: column.header }),
      )
    }

    const bodyCell = (
      column: TableRenderColumn<Row, Node>,
      row: Row,
      rowIndex: number,
      isFirst: boolean,
    ) => {
      const content = column.cell(row, rowIndex)
      return h(
        'td',
        { key: column.key },
        isFirst && getRowHref
          ? Link({
            href: getRowHref(row, rowIndex),
            onClick: () => onRowClick?.(row, rowIndex),
            children: content,
          })
          : content,
      )
    }

    return h(
      'table',
      { id, className, 'data-space-ui': 'table' },
      caption ? h('caption', null, caption) : null,
      h('thead', null, h('tr', null, columns.map(headerCell))),
      h(
        'tbody',
        null,
        rows.length === 0
          ? (emptyState !== null && emptyState !== undefined
            ? h('tr', null, h('td', { colSpan: columns.length }, emptyState))
            : null)
          : rows.map((row, rowIndex) =>
            h(
              'tr',
              { key: rowKey ? rowKey(row, rowIndex) : String(rowIndex) },
              columns.map((column, columnIndex) =>
                bodyCell(column, row, rowIndex, columnIndex === 0)
              ),
            )
          ),
      ),
    )
  }
}
