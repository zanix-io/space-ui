import './dom-test-setup.ts'
import { installResizeObserverMock } from './showcase-test-utils.ts'
import { act, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { assertEquals } from '@std/assert'
import { usePosition } from 'shared/use-position.ts'
import type { ComputePositionResult } from 'shared/positioning.ts'

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

  return (
    <>
      <button type='button' ref={referenceRef}>Trigger</button>
      <div ref={floatingRef}>Floating</div>
    </>
  )
}

function mount(active: boolean, onResult: (result: ComputePositionResult | null) => void) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<Harness active={active} onResult={onResult} />))

  const reference = container.querySelector('button')
  const floating = container.querySelector('div')
  if (reference && floating) {
    stubRect(reference, { x: 100, y: 100, width: 50, height: 20 })
    stubRect(floating, { x: 0, y: 0, width: 80, height: 40 })
  }

  return {
    container,
    rerender: (nextActive: boolean) =>
      act(() => root.render(<Harness active={nextActive} onResult={onResult} />)),
    unmount: () => act(() => root.unmount()),
  }
}

Deno.test('usePosition: inactive — always returns null, never measures', () => {
  let result: ComputePositionResult | null = null
  const { unmount } = mount(false, (value) => (result = value))

  assertEquals(result, null)

  unmount()
})

Deno.test('usePosition: active — measures once refs exist, returns a real result', () => {
  let result: ComputePositionResult | null = null
  // Mounted inactive first — `mount`'s own rect-stubbing runs post-mount, before this test
  // activates it — then flipped active, so the measuring effect runs against already-stubbed
  // rects and already-populated refs, avoiding any "did the stub land before the effect" race.
  const { rerender, unmount } = mount(false, (value) => (result = value))

  rerender(true)

  assertEquals(result !== null, true)
  assertEquals(typeof (result as unknown as ComputePositionResult).x, 'number')
  assertEquals(typeof (result as unknown as ComputePositionResult).y, 'number')

  unmount()
})

Deno.test('usePosition: becoming inactive resets the result to null', () => {
  let result: ComputePositionResult | null = null
  const { rerender, unmount } = mount(true, (value) => (result = value))

  assertEquals(result !== null, true)

  rerender(false)

  assertEquals(result, null)

  unmount()
})

Deno.test('usePosition: tracks a ResizeObserver entry while active, real re-measurement', () => {
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
