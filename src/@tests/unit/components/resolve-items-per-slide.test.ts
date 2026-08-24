import { assertEquals } from '@std/assert'
import {
  chunkItems,
  clampItemsPerSlide,
  resolveItemsPerSlide,
} from 'components/Showcase/resolve-items-per-slide.ts'

// --- resolveItemsPerSlide --------------------------------------------------------------------

Deno.test('resolveItemsPerSlide: undefined config defaults to 1', () => {
  assertEquals(resolveItemsPerSlide(undefined, null), 1)
  assertEquals(resolveItemsPerSlide(undefined, 2000), 1)
})

Deno.test('resolveItemsPerSlide: a plain number always wins, regardless of width', () => {
  assertEquals(resolveItemsPerSlide(4, null), 4)
  assertEquals(resolveItemsPerSlide(4, 0), 4)
  assertEquals(resolveItemsPerSlide(4, 5000), 4)
})

Deno.test('resolveItemsPerSlide: no measurement yet resolves to the smallest threshold', () => {
  assertEquals(resolveItemsPerSlide({ 0: 1, 768: 3 }, null), 1)
  assertEquals(resolveItemsPerSlide({ 480: 2, 1024: 4 }, null), 2)
})

Deno.test('resolveItemsPerSlide: below every threshold falls back to the smallest one', () => {
  assertEquals(resolveItemsPerSlide({ 480: 2, 1024: 4 }, 100), 2)
})

Deno.test('resolveItemsPerSlide: a threshold match is inclusive at the exact width', () => {
  assertEquals(resolveItemsPerSlide({ 0: 1, 768: 3 }, 768), 3)
})

Deno.test('resolveItemsPerSlide: mobile-first — the largest qualifying threshold wins', () => {
  const config = { 0: 1, 480: 2, 768: 3, 1024: 4 }
  assertEquals(resolveItemsPerSlide(config, 500), 2)
  assertEquals(resolveItemsPerSlide(config, 900), 3)
  assertEquals(resolveItemsPerSlide(config, 5000), 4)
})

Deno.test('resolveItemsPerSlide: an empty threshold map defaults to 1', () => {
  assertEquals(resolveItemsPerSlide({}, 500), 1)
})

Deno.test(
  'resolveItemsPerSlide: threshold ordering is always numeric, never Object.keys() iteration order',
  () => {
    // `Object.keys()` on this object returns `['2', '10', '100']` — lexicographic ('10' < '2')
    // rather than numeric (2 < 10 < 100). Insertion order here is deliberately NOT sorted either
    // way, and mixes digit lengths specifically to catch a regression to a plain `.sort()` (which
    // defaults to string comparison) or to relying on `Object.keys()`'s own iteration order.
    const config = { 100: 4, 10: 2, 2: 1 }

    // Numerically correct: thresholds sorted [2, 10, 100]. At width 50, 2 and 10 both qualify
    // (10 is the larger of the two), 100 does not — the mobile-first winner is 10 => value 2.
    assertEquals(resolveItemsPerSlide(config, 50), 2)
    // Below every threshold: the smallest (2) applies, value 1 — not `config['100']`'s value just
    // because '100' sorts first as a string.
    assertEquals(resolveItemsPerSlide(config, 1), 1)
    // At/above the largest: 100's own value.
    assertEquals(resolveItemsPerSlide(config, 1000), 4)
  },
)

// --- clampItemsPerSlide -----------------------------------------------------------------------

Deno.test('clampItemsPerSlide: passes a value through unchanged when it already fits', () => {
  assertEquals(clampItemsPerSlide(4, 10), 4)
})

Deno.test('clampItemsPerSlide: clamps down to the actual item count', () => {
  assertEquals(clampItemsPerSlide(10, 4), 4)
})

Deno.test('clampItemsPerSlide: zero items resolves to zero, not a minimum of 1', () => {
  assertEquals(clampItemsPerSlide(4, 0), 0)
})

Deno.test('clampItemsPerSlide: never resolves below 1 when items actually exist', () => {
  assertEquals(clampItemsPerSlide(0, 5), 1)
})

// --- chunkItems --------------------------------------------------------------------------------

Deno.test('chunkItems: groups a flat list in order, last chunk possibly smaller', () => {
  assertEquals(chunkItems(['a', 'b', 'c', 'd', 'e'], 2), [['a', 'b'], ['c', 'd'], ['e']])
})

Deno.test('chunkItems: a group size that already covers everything produces one chunk', () => {
  assertEquals(chunkItems(['a', 'b', 'c'], 10), [['a', 'b', 'c']])
})

Deno.test('chunkItems: an empty list produces no chunks', () => {
  assertEquals(chunkItems([], 3), [])
})

Deno.test('chunkItems: a group size of 0 or less produces no chunks (never loops)', () => {
  assertEquals(chunkItems(['a', 'b'], 0), [])
  assertEquals(chunkItems(['a', 'b'], -1), [])
})
