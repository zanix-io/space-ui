import { assertEquals, assertNotEquals } from '@std/assert'
import { generateEntryId } from 'components/SocialLinksInput/generate-entry-id.ts'

Deno.test('generateEntryId: returns a non-empty string', () => {
  const id = generateEntryId()
  assertEquals(typeof id, 'string')
  assertEquals(id.length > 0, true)
})

Deno.test('generateEntryId: two calls never collide', () => {
  assertNotEquals(generateEntryId(), generateEntryId())
})

Deno.test('generateEntryId: falls back to a counter-based id when crypto.randomUUID is unavailable', () => {
  const original = crypto.randomUUID
  Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
  try {
    const first = generateEntryId()
    const second = generateEntryId()
    assertEquals(first.startsWith('social-link-'), true)
    assertNotEquals(first, second)
  } finally {
    Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
  }
})
