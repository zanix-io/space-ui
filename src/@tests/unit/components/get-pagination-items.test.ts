import { assertEquals } from '@std/assert'
import { getPaginationItems } from 'components/Pagination/get-pagination-items.ts'

Deno.test('getPaginationItems: totalPages 0 → empty', () => {
  assertEquals(getPaginationItems(1, 0, 1), [])
})

Deno.test('getPaginationItems: totalPages 1 → just [1], no ellipsis', () => {
  assertEquals(getPaginationItems(1, 1, 1), [1])
})

Deno.test('getPaginationItems: small totalPages never needs an ellipsis', () => {
  assertEquals(getPaginationItems(2, 3, 1), [1, 2, 3])
  assertEquals(getPaginationItems(1, 5, 2), [1, 2, 3, 4, 5])
})

Deno.test('getPaginationItems: page 1 of 10 — right ellipsis only', () => {
  assertEquals(getPaginationItems(1, 10, 1), [1, 2, 'ellipsis', 10])
})

Deno.test('getPaginationItems: last page of 10 — left ellipsis only', () => {
  assertEquals(getPaginationItems(10, 10, 1), [1, 'ellipsis', 9, 10])
})

Deno.test('getPaginationItems: middle page — both ellipses', () => {
  assertEquals(getPaginationItems(5, 10, 1), [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
})

Deno.test('getPaginationItems: siblingCount 2 widens the window on both sides', () => {
  // leftSibling here is 3 — only ONE page (2) would be hidden by a left ellipsis, so it's shown
  // directly instead (see the function's own doc on the `> 3`/`< totalPages - 2` thresholds).
  assertEquals(getPaginationItems(5, 10, 2), [1, 2, 3, 4, 5, 6, 7, 'ellipsis', 10])
})

Deno.test('getPaginationItems: a gap of exactly one page is shown directly, not ellipsized', () => {
  assertEquals(getPaginationItems(4, 10, 1), [1, 2, 3, 4, 5, 'ellipsis', 10])
  assertEquals(getPaginationItems(7, 10, 1), [1, 'ellipsis', 6, 7, 8, 9, 10])
})

Deno.test('getPaginationItems: siblingCount 0 shows only current page between boundaries', () => {
  assertEquals(getPaginationItems(5, 10, 0), [1, 'ellipsis', 5, 'ellipsis', 10])
})

Deno.test('getPaginationItems: window touching a boundary collapses that ellipsis', () => {
  // page 3, siblingCount 1 → leftSibling=2, which is NOT > 2, so no left ellipsis at all.
  assertEquals(getPaginationItems(3, 10, 1), [1, 2, 3, 4, 'ellipsis', 10])
  // page 8, siblingCount 1 → rightSibling=9, NOT < totalPages-1(9), so no right ellipsis.
  assertEquals(getPaginationItems(8, 10, 1), [1, 'ellipsis', 7, 8, 9, 10])
})

Deno.test('getPaginationItems: a huge totalPages still returns a small, bounded set', () => {
  const items = getPaginationItems(500, 1000, 1)
  assertEquals(items, [1, 'ellipsis', 499, 500, 501, 'ellipsis', 1000])
  assertEquals(items.length, 7)
})
