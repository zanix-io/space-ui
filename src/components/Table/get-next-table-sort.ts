import type { TableSort } from './types.ts'

/**
 * Computes the next `TableSort` once a sortable column header is activated — pure,
 * renderer-agnostic, directly unit-testable, same "extract the arithmetic, test it exhaustively"
 * discipline `Pagination`'s own `get-pagination-items.ts` already established.
 *
 * Activating the already-active sorted column's header toggles its direction (`'asc'` ↔
 * `'desc'`); activating a different column's header always starts it at `'asc'` — there's no
 * third "unsorted" state reachable through interaction alone (only a controlling caller can set
 * `sort` back to `null` from outside). The plain two-direction toggle, not a three-state
 * asc→desc→none cycle some table UIs use — that's a real, separate design choice this doesn't
 * make for you, the same way `getPaginationItems`'s own doc names the "plain windowing" choice it
 * makes over the "extend the window" alternative.
 */
export function getNextTableSort(current: TableSort | null | undefined, column: string): TableSort {
  if (current?.column === column) {
    return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  }
  return { column, direction: 'asc' }
}
