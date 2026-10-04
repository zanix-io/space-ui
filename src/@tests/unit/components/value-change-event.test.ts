import { assertEquals } from '@std/assert'
import { emitValueChange } from 'shared/value-change-event.ts'

Deno.test('emitValueChange: a missing element is a no-op', () => {
  emitValueChange(null)
  emitValueChange(undefined)
})

Deno.test('emitValueChange: fires one bubbling change event on the element', () => {
  const seen: Array<{ type: string; bubbles: boolean }> = []
  const element = {
    dispatchEvent: (event: Event) => {
      seen.push({ type: event.type, bubbles: event.bubbles })
      return true
    },
  } as unknown as Element

  emitValueChange(element)

  assertEquals(seen, [{ type: 'change', bubbles: true }])
})
