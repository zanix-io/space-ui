import { assertEquals } from '@std/assert'
import { createRovingKeyDownHandler, getNextRovingIndex } from 'shared/roving-focus.ts'

// --- getNextRovingIndex ------------------------------------------------------------------------

Deno.test('getNextRovingIndex: horizontal — ArrowRight/ArrowLeft move, wrap at both ends', () => {
  assertEquals(getNextRovingIndex(0, 'ArrowRight', 3, 'horizontal'), 1)
  assertEquals(getNextRovingIndex(1, 'ArrowRight', 3, 'horizontal'), 2)
  assertEquals(getNextRovingIndex(2, 'ArrowRight', 3, 'horizontal'), 0) // wraps
  assertEquals(getNextRovingIndex(1, 'ArrowLeft', 3, 'horizontal'), 0)
  assertEquals(getNextRovingIndex(0, 'ArrowLeft', 3, 'horizontal'), 2) // wraps
})

Deno.test('getNextRovingIndex: horizontal ignores ArrowUp/ArrowDown', () => {
  assertEquals(getNextRovingIndex(0, 'ArrowUp', 3, 'horizontal'), null)
  assertEquals(getNextRovingIndex(0, 'ArrowDown', 3, 'horizontal'), null)
})

Deno.test('getNextRovingIndex: vertical — ArrowDown/ArrowUp move, wrap at both ends', () => {
  assertEquals(getNextRovingIndex(0, 'ArrowDown', 3, 'vertical'), 1)
  assertEquals(getNextRovingIndex(2, 'ArrowDown', 3, 'vertical'), 0) // wraps
  assertEquals(getNextRovingIndex(0, 'ArrowUp', 3, 'vertical'), 2) // wraps
})

Deno.test('getNextRovingIndex: vertical ignores ArrowLeft/ArrowRight', () => {
  assertEquals(getNextRovingIndex(0, 'ArrowLeft', 3, 'vertical'), null)
  assertEquals(getNextRovingIndex(0, 'ArrowRight', 3, 'vertical'), null)
})

Deno.test('getNextRovingIndex: "both" accepts all four arrow keys', () => {
  assertEquals(getNextRovingIndex(0, 'ArrowRight', 3, 'both'), 1)
  assertEquals(getNextRovingIndex(0, 'ArrowDown', 3, 'both'), 1)
  assertEquals(getNextRovingIndex(0, 'ArrowLeft', 3, 'both'), 2)
  assertEquals(getNextRovingIndex(0, 'ArrowUp', 3, 'both'), 2)
})

Deno.test('getNextRovingIndex: Home/End jump to first/last regardless of orientation', () => {
  assertEquals(getNextRovingIndex(1, 'Home', 5, 'horizontal'), 0)
  assertEquals(getNextRovingIndex(1, 'End', 5, 'horizontal'), 4)
  assertEquals(getNextRovingIndex(1, 'Home', 5, 'vertical'), 0)
  assertEquals(getNextRovingIndex(1, 'End', 5, 'vertical'), 4)
})

Deno.test('getNextRovingIndex: an unrelated key returns null, not "stayed put"', () => {
  assertEquals(getNextRovingIndex(0, 'Enter', 3, 'horizontal'), null)
  assertEquals(getNextRovingIndex(0, 'a', 3, 'horizontal'), null)
  assertEquals(getNextRovingIndex(0, 'Escape', 3, 'horizontal'), null)
})

Deno.test('getNextRovingIndex: zero items always returns null', () => {
  assertEquals(getNextRovingIndex(0, 'ArrowRight', 0, 'horizontal'), null)
  assertEquals(getNextRovingIndex(0, 'Home', 0, 'horizontal'), null)
})

Deno.test('getNextRovingIndex: a single item wraps to itself, not out of range', () => {
  assertEquals(getNextRovingIndex(0, 'ArrowRight', 1, 'horizontal'), 0)
  assertEquals(getNextRovingIndex(0, 'ArrowLeft', 1, 'horizontal'), 0)
})

// --- createRovingKeyDownHandler ------------------------------------------------------------

function fakeEvent(key: string) {
  let prevented = false
  return {
    event: { key, preventDefault: () => (prevented = true) },
    wasPrevented: () => prevented,
  }
}

Deno.test('createRovingKeyDownHandler: a navigation key moves the index and focuses it', () => {
  const focusedIndices: number[] = []
  let activeIndex = 0
  const items = [0, 1, 2].map((i) => ({
    focus: () => focusedIndices.push(i),
  })) as unknown as HTMLElement[]

  const handler = createRovingKeyDownHandler(
    activeIndex,
    3,
    (next) => (activeIndex = next),
    (i) => items[i],
  )

  const { event, wasPrevented } = fakeEvent('ArrowRight')
  handler(event)

  assertEquals(activeIndex, 1)
  assertEquals(focusedIndices, [1])
  assertEquals(wasPrevented(), true)
})

Deno.test('createRovingKeyDownHandler: an unrelated key is a no-op', () => {
  let setActiveIndexCalled = false
  let focusCalled = false
  const handler = createRovingKeyDownHandler(
    0,
    3,
    () => (setActiveIndexCalled = true),
    () => ({ focus: () => (focusCalled = true) }) as unknown as HTMLElement,
  )

  const { event, wasPrevented } = fakeEvent('Enter')
  handler(event)

  assertEquals(setActiveIndexCalled, false)
  assertEquals(focusCalled, false)
  assertEquals(wasPrevented(), false)
})

Deno.test('createRovingKeyDownHandler: a single item is a no-op', () => {
  let setActiveIndexCalled = false
  let focusCalled = false
  const handler = createRovingKeyDownHandler(
    0,
    1,
    () => (setActiveIndexCalled = true),
    () => ({ focus: () => (focusCalled = true) }) as unknown as HTMLElement,
  )

  const { event, wasPrevented } = fakeEvent('ArrowRight')
  handler(event)

  assertEquals(setActiveIndexCalled, false)
  assertEquals(focusCalled, false)
  assertEquals(wasPrevented(), false)
})

Deno.test('createRovingKeyDownHandler: the item element is looked up fresh, not cached', () => {
  const lookups: number[] = []
  let activeIndex = 0
  const handler = createRovingKeyDownHandler(
    activeIndex,
    3,
    (next) => (activeIndex = next),
    (i) => {
      lookups.push(i)
      return { focus: () => {} } as unknown as HTMLElement
    },
  )

  handler(fakeEvent('ArrowRight').event)

  assertEquals(lookups, [1]) // looked up the NEW index, not the old one
})

Deno.test('createRovingKeyDownHandler: respects orientation like getNextRovingIndex does', () => {
  let activeIndex = 0
  const handler = createRovingKeyDownHandler(
    activeIndex,
    3,
    (next) => (activeIndex = next),
    () => ({ focus: () => {} }) as unknown as HTMLElement,
    'vertical',
  )

  const { event, wasPrevented } = fakeEvent('ArrowRight') // wrong axis for vertical
  handler(event)

  assertEquals(activeIndex, 0) // unchanged
  assertEquals(wasPrevented(), false)
})
