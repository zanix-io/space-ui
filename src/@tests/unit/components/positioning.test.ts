import { assertEquals } from '@std/assert'
import { computePosition } from 'shared/positioning.ts'

const reference = { x: 100, y: 100, width: 50, height: 20 }
const floating = { width: 80, height: 40 }

// --- the 4 sides, centered (default) alignment, no offset, no boundary ----------------------

Deno.test('computePosition: bottom (default) sits below, horizontally centered', () => {
  const result = computePosition(reference, floating)
  assertEquals(result, { x: 85, y: 120, placement: 'bottom' })
})

Deno.test('computePosition: top sits above, horizontally centered', () => {
  const result = computePosition(reference, floating, { placement: 'top' })
  assertEquals(result, { x: 85, y: 60, placement: 'top' })
})

Deno.test('computePosition: left sits to the left, vertically centered', () => {
  const result = computePosition(reference, floating, { placement: 'left' })
  assertEquals(result, { x: 20, y: 90, placement: 'left' })
})

Deno.test('computePosition: right sits to the right, vertically centered', () => {
  const result = computePosition(reference, floating, { placement: 'right' })
  assertEquals(result, { x: 150, y: 90, placement: 'right' })
})

// --- alignment (start/end) --------------------------------------------------------------------

Deno.test('computePosition: bottom-start aligns flush with the reference own left edge', () => {
  const result = computePosition(reference, floating, { placement: 'bottom-start' })
  assertEquals(result, { x: 100, y: 120, placement: 'bottom-start' })
})

Deno.test('computePosition: bottom-end aligns flush with the reference own right edge', () => {
  const result = computePosition(reference, floating, { placement: 'bottom-end' })
  assertEquals(result, { x: 70, y: 120, placement: 'bottom-end' })
})

Deno.test('computePosition: left-start/left-end align the cross (vertical) axis', () => {
  assertEquals(
    computePosition(reference, floating, { placement: 'left-start' }),
    { x: 20, y: 100, placement: 'left-start' },
  )
  assertEquals(
    computePosition(reference, floating, { placement: 'left-end' }),
    { x: 20, y: 80, placement: 'left-end' },
  )
})

// --- offset --------------------------------------------------------------------------------

Deno.test('computePosition: offset adds a gap along the main axis, for every side', () => {
  assertEquals(
    computePosition(reference, floating, { placement: 'bottom', offset: 10 }),
    { x: 85, y: 130, placement: 'bottom' },
  )
  assertEquals(
    computePosition(reference, floating, { placement: 'top', offset: 10 }),
    { x: 85, y: 50, placement: 'top' },
  )
  assertEquals(
    computePosition(reference, floating, { placement: 'left', offset: 10 }),
    { x: 10, y: 90, placement: 'left' },
  )
  assertEquals(
    computePosition(reference, floating, { placement: 'right', offset: 10 }),
    { x: 160, y: 90, placement: 'right' },
  )
})

// --- flip ------------------------------------------------------------------------------------

Deno.test('computePosition: flips to the opposite side when the preferred one overflows', () => {
  // Bottom placement would put the floating element from y=120 to y=160 — this boundary is only
  // 130px tall, so it overflows; the top placement (y=60 to y=100) fits inside it.
  const boundary = { x: 0, y: 0, width: 800, height: 130 }
  const result = computePosition(reference, floating, { placement: 'bottom', boundary })

  assertEquals(result, { x: 85, y: 60, placement: 'top' })
})

Deno.test('computePosition: flip preserves alignment — bottom-start flips to top-start', () => {
  const boundary = { x: 0, y: 0, width: 800, height: 130 }
  const result = computePosition(reference, floating, { placement: 'bottom-start', boundary })

  assertEquals(result.placement, 'top-start')
})

Deno.test('computePosition: never flips into a placement that overflows just as badly', () => {
  // Both top (y=60, overflows above y=100) and bottom (y=120..160, overflows below y=120) fail
  // against this boundary — flip must keep the original rather than trade one overflow for
  // another.
  const boundary = { x: 0, y: 100, width: 800, height: 20 }
  const result = computePosition(reference, floating, { placement: 'bottom', boundary })

  assertEquals(result.placement, 'bottom')
  assertEquals(result.y, 120)
})

Deno.test('computePosition: flip: false keeps the requested placement even if it overflows', () => {
  const boundary = { x: 0, y: 0, width: 800, height: 130 }
  const result = computePosition(reference, floating, {
    placement: 'bottom',
    boundary,
    flip: false,
  })

  assertEquals(result.placement, 'bottom')
  assertEquals(result.y, 120)
})

// --- shift -----------------------------------------------------------------------------------

Deno.test('computePosition: shifts along the cross axis to stay inside the boundary', () => {
  const nearLeftEdge = { x: 5, y: 100, width: 50, height: 20 }
  const wideFloating = { width: 100, height: 40 }
  const boundary = { x: 0, y: 0, width: 800, height: 800 }

  // Centered x would be 5 + (50-100)/2 = -20, off the left edge — shift clamps it to 0.
  const result = computePosition(nearLeftEdge, wideFloating, { placement: 'bottom', boundary })

  assertEquals(result, { x: 0, y: 120, placement: 'bottom' })
})

Deno.test('computePosition: shift: false leaves an out-of-bounds position uncorrected', () => {
  const nearLeftEdge = { x: 5, y: 100, width: 50, height: 20 }
  const wideFloating = { width: 100, height: 40 }
  const boundary = { x: 0, y: 0, width: 800, height: 800 }

  const result = computePosition(nearLeftEdge, wideFloating, {
    placement: 'bottom',
    boundary,
    shift: false,
  })

  assertEquals(result.x, -20)
})

Deno.test('computePosition: without a boundary, flip/shift are unconditional no-ops', () => {
  // No boundary given — defaults to an effectively infinite one, so nothing ever "overflows".
  const nearLeftEdge = { x: 5, y: 100, width: 50, height: 20 }
  const wideFloating = { width: 100, height: 40 }

  const result = computePosition(nearLeftEdge, wideFloating, { placement: 'bottom' })

  assertEquals(result, { x: -20, y: 120, placement: 'bottom' })
})
