/** A real page number, or a non-interactive gap in the sequence — e.g. `[1, 'ellipsis', 4, 5, 6,
 * 'ellipsis', 10]`. */
export type PaginationItem = number | 'ellipsis'

/**
 * Windows a page sequence down to a bounded set around the current page — pure, renderer-agnostic,
 * directly unit-testable, same "extract the arithmetic, test it exhaustively" discipline
 * `Showcase`'s own `resolveItemsPerSlide` already established.
 *
 * Always includes page `1` and `totalPages` (the boundaries), plus up to `siblingCount` pages on
 * each side of `page`, replacing any gap larger than one page with a single `'ellipsis'` entry —
 * the plain windowing algorithm, not the "extend the window to keep a constant visible count near
 * an edge" variant some pagination UIs use; that's a real, separate design choice this doesn't make
 * for you.
 *
 * `page`/`totalPages` are trusted as already valid (`1 <= page <= totalPages`, `totalPages >= 0`) —
 * this function doesn't clamp or validate them, same "pure function, no defensive rewriting of its
 * own inputs" contract `shared/positioning.ts`'s own `computePosition` already has.
 */
export function getPaginationItems(
  page: number,
  totalPages: number,
  siblingCount: number,
): PaginationItem[] {
  if (totalPages <= 0) return []
  if (totalPages === 1) return [1]

  const leftSibling = Math.max(page - siblingCount, 1)
  const rightSibling = Math.min(page + siblingCount, totalPages)

  // Only collapse a gap into an ellipsis when it hides at least 2 pages — hiding exactly ONE page
  // behind "…" saves no space and reads oddly, so that one page is shown directly instead. This is
  // why the threshold is `> 3`/`< totalPages - 2`, not the more naive `> 2`/`< totalPages - 1` a
  // gap-size-1 case would need: `leftSibling - 2` counts the pages strictly between the `1`
  // boundary and `leftSibling` — that must be at least 2 for an ellipsis to be worth it, i.e.
  // `leftSibling > 3` (symmetric reasoning gives the right side its own `totalPages - 2` bound).
  const showLeftEllipsis = leftSibling > 3
  const showRightEllipsis = rightSibling < totalPages - 2

  // The actual displayed range widens to fill all the way to the boundary on whichever side isn't
  // showing an ellipsis — otherwise a single hidden page (the case the ellipsis thresholds above
  // deliberately don't collapse) would vanish from the output instead of being shown.
  const rangeStart = showLeftEllipsis ? leftSibling : 2
  const rangeEnd = showRightEllipsis ? rightSibling : totalPages - 1

  const items: PaginationItem[] = [1]
  if (showLeftEllipsis) items.push('ellipsis')
  for (let i = rangeStart; i <= rangeEnd; i++) items.push(i)
  if (showRightEllipsis) items.push('ellipsis')
  items.push(totalPages)

  return items
}
