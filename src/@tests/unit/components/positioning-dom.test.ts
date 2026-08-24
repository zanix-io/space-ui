import { dispatchWindowEvent } from './dom-test-setup.ts'
import { installResizeObserverMock } from './showcase-test-utils.ts'
import { assertEquals } from '@std/assert'
import { autoUpdate, getViewportRect, measurePosition } from 'shared/positioning-dom.ts'

/** jsdom never computes real layout — `getBoundingClientRect()` is always a zeroed rect unless
 * stubbed. Every test here that needs a specific geometry overrides it directly, the same
 * "controlled, deterministic, no real layout" approach `showcase-test-utils.ts`'s own
 * `ResizeObserver` mock already takes for measurement in this test suite. */
function stubRect(el: Element, rect: { x: number; y: number; width: number; height: number }) {
  el.getBoundingClientRect = () => ({
    ...rect,
    top: rect.y,
    left: rect.x,
    right: 0,
    bottom: 0,
    toJSON() {},
  })
}

Deno.test('getViewportRect: reflects the current window size', () => {
  const rect = getViewportRect()
  assertEquals(rect, { x: 0, y: 0, width: globalThis.innerWidth, height: globalThis.innerHeight })
})

Deno.test('measurePosition: reads real element rects, defaults boundary to the viewport', () => {
  const reference = document.createElement('button')
  const floating = document.createElement('div')
  document.body.append(reference, floating)

  stubRect(reference, { x: 100, y: 100, width: 50, height: 20 })
  stubRect(floating, { x: 0, y: 0, width: 80, height: 40 })

  const result = measurePosition(reference, floating)

  assertEquals(result, { x: 85, y: 120, placement: 'bottom' })

  reference.remove()
  floating.remove()
})

Deno.test('measurePosition: an explicit boundary overrides the viewport default', () => {
  const reference = document.createElement('button')
  const floating = document.createElement('div')
  document.body.append(reference, floating)

  stubRect(reference, { x: 100, y: 100, width: 50, height: 20 })
  stubRect(floating, { x: 0, y: 0, width: 80, height: 40 })

  // Too short a boundary for `bottom` to fit — forces a flip to `top`, proving the passed
  // boundary (not the real viewport) is what's actually used.
  const result = measurePosition(reference, floating, {
    boundary: { x: 0, y: 0, width: 800, height: 130 },
  })

  assertEquals(result.placement, 'top')

  reference.remove()
  floating.remove()
})

// --- autoUpdate --------------------------------------------------------------------------------

Deno.test('autoUpdate: fires on a ResizeObserver entry for either element', () => {
  const ro = installResizeObserverMock()
  const reference = document.createElement('button')
  const floating = document.createElement('div')
  document.body.append(reference, floating)

  let calls = 0
  const cleanup = autoUpdate(reference, floating, () => calls++)

  ro.resize(reference, 100)
  assertEquals(calls, 1)
  ro.resize(floating, 50)
  assertEquals(calls, 2)

  cleanup()
  reference.remove()
  floating.remove()
  ro.restore()
})

Deno.test('autoUpdate: fires when a scrollable ancestor of either element scrolls', () => {
  const ro = installResizeObserverMock()
  const scrollableAncestor = document.createElement('div')
  scrollableAncestor.style.overflow = 'auto'
  const reference = document.createElement('button')
  scrollableAncestor.append(reference)
  const floating = document.createElement('div')
  document.body.append(scrollableAncestor, floating)

  let calls = 0
  const cleanup = autoUpdate(reference, floating, () => calls++)

  scrollableAncestor.dispatchEvent(new Event('scroll'))
  assertEquals(calls, 1)

  cleanup()
  scrollableAncestor.remove()
  floating.remove()
  ro.restore()
})

Deno.test('autoUpdate: a plain non-scrollable ancestor never triggers an update', () => {
  const ro = installResizeObserverMock()
  const plainAncestor = document.createElement('div') // no overflow style at all
  const reference = document.createElement('button')
  plainAncestor.append(reference)
  const floating = document.createElement('div')
  document.body.append(plainAncestor, floating)

  let calls = 0
  const cleanup = autoUpdate(reference, floating, () => calls++)

  plainAncestor.dispatchEvent(new Event('scroll'))
  assertEquals(calls, 0)

  cleanup()
  plainAncestor.remove()
  floating.remove()
  ro.restore()
})

Deno.test('autoUpdate: fires on window scroll/resize too', () => {
  const ro = installResizeObserverMock()
  const reference = document.createElement('button')
  const floating = document.createElement('div')
  document.body.append(reference, floating)

  let calls = 0
  const cleanup = autoUpdate(reference, floating, () => calls++)

  dispatchWindowEvent(new Event('scroll'))
  assertEquals(calls, 1)
  dispatchWindowEvent(new Event('resize'))
  assertEquals(calls, 2)

  cleanup()
  reference.remove()
  floating.remove()
  ro.restore()
})

Deno.test('autoUpdate: cleanup removes every listener — no further calls after it runs', () => {
  const ro = installResizeObserverMock()
  const scrollableAncestor = document.createElement('div')
  scrollableAncestor.style.overflow = 'scroll'
  const reference = document.createElement('button')
  scrollableAncestor.append(reference)
  const floating = document.createElement('div')
  document.body.append(scrollableAncestor, floating)

  let calls = 0
  const cleanup = autoUpdate(reference, floating, () => calls++)
  cleanup()

  ro.resize(reference, 100)
  scrollableAncestor.dispatchEvent(new Event('scroll'))
  dispatchWindowEvent(new Event('scroll'))
  dispatchWindowEvent(new Event('resize'))

  assertEquals(calls, 0)
  assertEquals(ro.isObserved(reference), false)

  scrollableAncestor.remove()
  floating.remove()
  ro.restore()
})

Deno.test('autoUpdate: without ResizeObserver, scroll/resize listeners still work', () => {
  // jsdom (confirmed empirically elsewhere in this suite — see `showcase-test-utils.ts`'s own
  // doc) implements no `ResizeObserver` at all by default — this is already the real baseline
  // here, nothing to delete/restore.
  assertEquals(typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver, 'undefined')

  const reference = document.createElement('button')
  const floating = document.createElement('div')
  document.body.append(reference, floating)

  let calls = 0
  const cleanup = autoUpdate(reference, floating, () => calls++)
  dispatchWindowEvent(new Event('resize'))
  assertEquals(calls, 1)

  cleanup()
  reference.remove()
  floating.remove()
})
