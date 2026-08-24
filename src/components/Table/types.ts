/** Which way a sorted column is currently ordered. */
export type TableSortDirection = 'asc' | 'desc'

/** The controlled sort state `Table` renders `aria-sort` from and hands back, unchanged, to
 * `onSortChange` — see `TableBaseProps.sort`'s own doc for the full controlled/uncontrolled
 * contract. `Table` never sorts `rows` itself (seam 7 — presents data, never owns it); this is
 * only ever a description of what the caller already sorted `rows` by. */
export type TableSort = {
  /** The sorted column's own `TableColumn.key` (defined per-renderer — see `index.ts`'s own
   * doc). */
  column: string
  direction: TableSortDirection
}

/**
 * The renderer-agnostic part of a column definition — `header`/`cell` (genuinely renderer-
 * specific caller-owned content, same reason `trigger`/`children` aren't declared on
 * `DisclosureBaseProps` either) are layered on top by each renderer's own `TableColumn<Row>`.
 */
export type TableColumnBase = {
  /** Identifies this column — the DOM key for its own `<th>`/each row's `<td>`, and the value
   * this column's `sort.column` carries once its header becomes the active sort. Must be unique
   * across a given `columns` array; not rendered anywhere on its own. */
  key: string
  /** Marks this column's header as a real sort control participating in `sort`/`onSortChange` —
   * rendered as a `Button` inside the header cell, with `aria-sort` on the `<th>` itself (the
   * WAI-ARIA-recommended sortable-column-header technique). Plain, non-interactive header content
   * otherwise.
   * @default false */
  sortable?: boolean
}

/** Props shared by both the React and Preact `Table` bindings. `columns`/`caption`/`emptyState`
 * are genuinely renderer-specific (their content is caller-owned markup) — each renderer's own
 * `index.ts`/`index.preact.ts` layers those on top with its own node type, same split
 * `DisclosureBaseProps` already establishes for `trigger`/`children`. `Row` is the caller's own
 * row shape — `Table` never inspects it beyond handing it to `cell`/`rowKey`/`getRowHref`/
 * `onRowClick`, the same "presents data, never owns it" contract every component here keeps. */
export type TableBaseProps<Row> = {
  /** The rows to render, already resolved by the caller — `Table` never fetches, filters, or
   * sorts this itself (seam 7). */
  rows: Row[]
  /** Derives a stable React/Preact key for a row. Falls back to the row's own index (as a string)
   * when omitted — same "optional, index-fallback" convention `Menu.items`/`Accordion`'s own `id`
   * already establish. Only worth giving explicitly when rows can reorder/be added/removed. */
  rowKey?: (row: Row, index: number) => string
  /**
   * Controlled current sort — when given, this component's own internal state is never the
   * source of truth; the caller must update this prop (typically from `onSortChange`) for
   * `aria-sort` to actually change. Omit for the uncontrolled default, where `defaultSort` seeds
   * the first render and this component tracks the rest itself. Always wins over `defaultSort`
   * when both are given — ignored, not invalid, same contract `Pagination.page`/`.defaultPage`
   * already established. `null` (as opposed to `undefined`) is a real, controlled "no column
   * sorted" state, distinct from "uncontrolled."
   */
  sort?: TableSort | null
  /** Initial sort — seeds the first render only, ignored once `sort` is given.
   * @default null */
  defaultSort?: TableSort | null
  /**
   * Called whenever a sortable column header is activated, regardless of whether `sort` is
   * controlled — fires even in the uncontrolled case (same "always notify" contract
   * `Pagination.onPageChange` already has). Clicking the already-active sorted column's header
   * toggles its direction (`'asc'` ↔ `'desc'`); clicking a different sortable column's header
   * activates it at `'asc'`. `Table` computes this next value itself and hands it back — it never
   * applies it to `rows`, which stays entirely the caller's own job.
   */
  onSortChange?: (sort: TableSort) => void
  /**
   * When given, each row's FIRST column cell content renders wrapped in a real, navigable `Link`
   * (`href={getRowHref(row, index)}`) instead of plain cell content — the same "the caller
   * decides the shape entirely, this component never constructs a URL itself" contract
   * `Pagination.getPageHref` already established, applied per-row instead of per-page. Omit
   * entirely for a plain, non-navigable table — there's no "Button" fallback the way `Pagination`
   * has for its own page items, since a `<tr>` has no native interactive-control equivalent and
   * this package doesn't invent click-anywhere-in-the-row chrome without a real target to navigate
   * to.
   */
  getRowHref?: (row: Row, index: number) => string
  /** Called when a row's `Link` (rendered because `getRowHref` is given) is activated — fires
   * alongside real navigation, the same "navigation plus an optional side effect" contract
   * `Link.onClick`/`Pagination`'s own `Link` composition already have. Has no effect when
   * `getRowHref` is omitted, since no clickable element exists to attach it to. */
  onRowClick?: (row: Row, index: number) => void
  id?: string
  className?: string
}
