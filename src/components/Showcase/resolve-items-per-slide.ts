import type { ItemsPerSlide } from './types.ts'

/**
 * Resolves {@linkcode ItemsPerSlide} against a container width — pure, renderer-agnostic, no DOM
 * access of its own, directly unit-testable.
 *
 * `containerWidth: null` means "no real measurement exists yet" — SSR, or the very first paint on
 * the client before `ResizeObserver`'s own first callback has run (see `index.ts`'s own doc for
 * why that first paint must match SSR exactly). It resolves to the SAME value a genuinely narrow
 * container would: the smallest threshold's own value — never `0`/`NaN`, and never a value that
 * later has to be "corrected away" for a narrow container specifically, only ever refined upward
 * once a real, wider measurement arrives.
 *
 * A plain `number` (not the `Record` form) always wins outright — there's no container width to
 * resolve against, fixed is fixed.
 *
 * Threshold ordering: `Object.keys()` on a `Record<number, number>` returns STRINGS — `['2', '10',
 * '100']` sorts lexicographically to `['10', '100', '2']` under the default string comparator,
 * the wrong order for a numeric mobile-first cascade. Every key is parsed back to a real `number`
 * via `Number(...)` and sorted with an explicit numeric comparator (`a - b`) before anything reads
 * from it — this function never relies on whatever order `Object.keys()`/`Object.entries()`
 * happens to iterate in.
 */
export function resolveItemsPerSlide(
  itemsPerSlide: ItemsPerSlide | undefined,
  containerWidth: number | null,
): number {
  if (itemsPerSlide === undefined) return 1
  if (typeof itemsPerSlide === 'number') return itemsPerSlide

  const thresholds = Object.keys(itemsPerSlide).map(Number).sort((a, b) => a - b)
  if (thresholds.length === 0) return 1

  const smallest = thresholds[0]
  if (containerWidth === null) return itemsPerSlide[smallest]

  // Mobile-first: the largest threshold that still fits within the measured width wins. Scanning
  // ascending and remembering the last threshold that qualified (rather than, say, scanning
  // descending and taking the first match) reads the same either way for a well-formed map — the
  // ascending walk is chosen only because `thresholds` is already sorted that way for the `NaN`/
  // duplicate-key edge cases below, not for a performance reason.
  let selected = smallest
  for (const threshold of thresholds) {
    if (threshold <= containerWidth) selected = threshold
    else break
  }

  return itemsPerSlide[selected]
}

/** Clamps a resolved `itemsPerSlide` value against how many items there actually are — asking for
 * more per slide than exist is never useful, and (for `chunkItems` below) a group size that's
 * `<= 0` would either loop forever or produce a nonsensical single empty group. */
export function clampItemsPerSlide(itemsPerSlide: number, itemCount: number): number {
  if (itemCount <= 0) return 0
  return Math.max(1, Math.min(itemsPerSlide, itemCount))
}

/** Chunks a flat list into non-overlapping, same-order groups of (at most) `groupSize` — the last
 * group may be smaller. `groupSize <= 0` or an empty `items` both safely produce no groups at all,
 * rather than looping. */
export function chunkItems<T>(items: T[], groupSize: number): T[][] {
  if (items.length === 0 || groupSize <= 0) return []

  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += groupSize) {
    chunks.push(items.slice(i, i + groupSize))
  }
  return chunks
}
