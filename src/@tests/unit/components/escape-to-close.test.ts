import { assertEquals } from '@std/assert'
import { createEscapeToCloseHandler } from 'shared/escape-to-close.ts'

function fakeEvent(key: string) {
  let stopped = false
  return {
    event: { key, stopPropagation: () => (stopped = true) },
    wasStopped: () => stopped,
  }
}

Deno.test('createEscapeToCloseHandler: Escape while active closes and refocuses', () => {
  let closed = false
  const target = { focus: () => {} }
  const focusedTargets: unknown[] = []
  target.focus = () => focusedTargets.push(target)

  const handler = createEscapeToCloseHandler(
    true,
    () => (closed = true),
    () => target as unknown as HTMLElement,
  )

  const { event, wasStopped } = fakeEvent('Escape')
  handler(event)

  assertEquals(closed, true)
  assertEquals(wasStopped(), true)
  assertEquals(focusedTargets, [target])
})

Deno.test(
  'createEscapeToCloseHandler: inactive — Escape is a no-op, even though the key matches',
  () => {
    // The `!active` short-circuit of the `||` guard, never previously exercised: every existing
    // real call site only ever installs this handler while genuinely active.
    let closed = false
    let focusCalled = false

    const handler = createEscapeToCloseHandler(
      false,
      () => (closed = true),
      () => ({ focus: () => (focusCalled = true) }) as unknown as HTMLElement,
    )

    const { event, wasStopped } = fakeEvent('Escape')
    handler(event)

    assertEquals(closed, false)
    assertEquals(focusCalled, false)
    assertEquals(wasStopped(), false)
  },
)

Deno.test('createEscapeToCloseHandler: active but a different key — no-op', () => {
  let closed = false
  const handler = createEscapeToCloseHandler(
    true,
    () => (closed = true),
    () => null,
  )

  const { event, wasStopped } = fakeEvent('Enter')
  handler(event)

  assertEquals(closed, false)
  assertEquals(wasStopped(), false)
})

Deno.test(
  'createEscapeToCloseHandler: getRefocusTarget resolving to null/undefined is safe',
  () => {
    let closed = false
    const handler = createEscapeToCloseHandler(
      true,
      () => (closed = true),
      () => null,
    )

    const { event } = fakeEvent('Escape')
    handler(event) // must not throw when there's nothing to focus

    assertEquals(closed, true)
  },
)
