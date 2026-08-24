import './dom-test-setup.ts'
import { installResizeObserverMock } from './showcase-test-utils.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { useRef } from 'preact/hooks'
import { act } from 'preact/test-utils'
import { assertEquals } from '@std/assert'
import { usePosition } from 'shared/use-position.preact.ts'
import type { ComputePositionResult } from 'shared/positioning.ts'

// Unlike every hookless Preact component in this package, `usePosition` is a real hook — built
// with `h(Harness, props)` and rendered through Preact's own pipeline. See
// `counter-preact.test.tsx`'s own doc for the same reasoning.

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

function Harness(
  { active, onResult }: {
    active: boolean
    onResult: (result: ComputePositionResult | null) => void
  },
) {
  const referenceRef = useRef<HTMLButtonElement>(null)
  const floatingRef = useRef<HTMLDivElement>(null)
  const result = usePosition(referenceRef, floatingRef, active)
  onResult(result)

  return h(
    'div',
    {},
    h('button', { ref: referenceRef }, 'Trigger'),
    h('div', { ref: floatingRef }, 'Floating'),
  ) as VNode
}

function mount(active: boolean, onResult: (result: ComputePositionResult | null) => void) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(h(Harness, { active, onResult }), container))

  const reference = container.querySelector('button')
  // `Harness`'s own root is a `<div>` too — the floating one is the SECOND `div` in document
  // order (the root wrapper is the first).
  const floating = container.querySelectorAll('div')[1]
  if (reference && floating) {
    stubRect(reference, { x: 100, y: 100, width: 50, height: 20 })
    stubRect(floating, { x: 0, y: 0, width: 80, height: 40 })
  }

  return {
    container,
    rerender: (nextActive: boolean) =>
      act(() => renderDOM(h(Harness, { active: nextActive, onResult }), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('usePosition (preact): inactive — always returns null', () => {
  let result: ComputePositionResult | null = null
  const { unmount } = mount(false, (value) => (result = value))

  assertEquals(result, null)

  unmount()
})

Deno.test('usePosition (preact): active — measures once refs exist', () => {
  let result: ComputePositionResult | null = null
  const { rerender, unmount } = mount(false, (value) => (result = value))

  rerender(true)

  assertEquals(result !== null, true)
  assertEquals(typeof (result as unknown as ComputePositionResult).x, 'number')
  assertEquals(typeof (result as unknown as ComputePositionResult).y, 'number')

  unmount()
})

Deno.test('usePosition (preact): becoming inactive resets the result to null', () => {
  let result: ComputePositionResult | null = null
  const { rerender, unmount } = mount(true, (value) => (result = value))

  assertEquals(result !== null, true)

  rerender(false)

  assertEquals(result, null)

  unmount()
})

Deno.test('usePosition (preact): tracks a ResizeObserver entry while active', () => {
  const ro = installResizeObserverMock()
  let result: ComputePositionResult | null = null
  const { container, unmount } = mount(true, (value) => (result = value))

  const reference = container.querySelector('button')
  const firstX = (result as unknown as ComputePositionResult)?.x

  if (reference) {
    stubRect(reference, { x: 200, y: 100, width: 50, height: 20 })
    act(() => ro.resize(reference, 50))
  }

  assertEquals((result as unknown as ComputePositionResult)?.x !== firstX, true)

  ro.restore()
  unmount()
})
