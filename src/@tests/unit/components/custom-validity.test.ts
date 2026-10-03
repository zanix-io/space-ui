import { assertEquals } from '@std/assert'
import { applyCustomValidity, useCustomValidity } from 'shared/custom-validity.ts'

function fakeControl() {
  const calls: string[] = []
  return { calls, setCustomValidity: (message: string) => void calls.push(message) }
}

Deno.test('applyCustomValidity: a message is passed to setCustomValidity unchanged', () => {
  const control = fakeControl()
  applyCustomValidity(control, 'Pick a city from the list')
  assertEquals(control.calls, ['Pick a city from the list'])
})

Deno.test('applyCustomValidity: undefined clears the error with an empty string', () => {
  const control = fakeControl()
  applyCustomValidity(control, undefined)
  assertEquals(control.calls, [''])
})

Deno.test('applyCustomValidity: an empty message clears the error too', () => {
  const control = fakeControl()
  applyCustomValidity(control, '')
  assertEquals(control.calls, [''])
})

Deno.test('applyCustomValidity: no element, or one without setCustomValidity, is a no-op', () => {
  applyCustomValidity(null, 'message')
  applyCustomValidity(undefined, 'message')
  applyCustomValidity({}, 'message')
})

// --- useCustomValidity ---------------------------------------------------------------------

function fakeEffectHost() {
  // A minimal stand-in for a renderer's `useEffect`: runs the effect when its deps change and keeps
  // the cleanup, so the hook's own contract (apply on change, clear before the next one and on
  // unmount, capture the element when the effect runs) is checked without any renderer.
  let lastDeps: readonly unknown[] | undefined
  let cleanup: void | (() => void) = undefined
  const useEffect = (effect: () => void | (() => void), deps?: readonly unknown[]) => {
    const changed = !lastDeps || !deps || deps.some((value, index) => value !== lastDeps?.[index])
    if (!changed) return
    if (typeof cleanup === 'function') cleanup()
    lastDeps = deps
    cleanup = effect()
  }
  const unmount = () => {
    if (typeof cleanup === 'function') cleanup()
    cleanup = undefined
  }
  return { useEffect, unmount }
}

Deno.test('useCustomValidity: applies the message, replaces it on change, clears it on unmount', () => {
  const control = fakeControl()
  const host = fakeEffectHost()
  const ref = { current: control }

  useCustomValidity(host.useEffect, ref, 'First')
  useCustomValidity(host.useEffect, ref, 'First')
  useCustomValidity(host.useEffect, ref, 'Second')
  host.unmount()

  // First applied; Second's change clears the first one before applying itself; unmount clears.
  assertEquals(control.calls, ['First', '', 'Second', ''])
})

Deno.test('useCustomValidity: the cleanup uses the element captured when the effect ran', () => {
  const control = fakeControl()
  const host = fakeEffectHost()
  const ref: { current: ReturnType<typeof fakeControl> | null } = { current: control }

  useCustomValidity(host.useEffect, ref, 'Not valid')
  // React nulls the ref before an unmount cleanup runs; the error must still be cleared.
  ref.current = null
  host.unmount()

  assertEquals(control.calls, ['Not valid', ''])
})

Deno.test('useCustomValidity: no element yet is a no-op', () => {
  const host = fakeEffectHost()
  useCustomValidity(host.useEffect, { current: null }, 'Not valid')
  host.unmount()
})
