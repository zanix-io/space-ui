import { assertEquals } from '@std/assert'
import { escapeJsonLd } from 'components/StructuredData/render.ts'

Deno.test('escapeJsonLd: data with no "<" at all serializes identically to JSON.stringify', () => {
  const data = { '@type': 'Organization', name: 'Zanix' }

  assertEquals(escapeJsonLd(data), JSON.stringify(data))
})

Deno.test('escapeJsonLd: a literal </script> is escaped, never left intact', () => {
  const data = { description: '</script><script>window.pwned = true</script>' }

  const escaped = escapeJsonLd(data)

  assertEquals(escaped.includes('</script>'), false)
  assertEquals(escaped.includes('<script>'), false)
})

Deno.test('escapeJsonLd: the escaped payload round-trips to the exact original value', () => {
  const data = { description: 'A team.</script><script>alert(1)</script> — and <b>bold</b> too' }

  const escaped = escapeJsonLd(data)

  assertEquals(JSON.parse(escaped), data)
})

Deno.test('escapeJsonLd: also neutralizes an HTML comment opener (<!--) in a string value', () => {
  // Not a <script> breakout, but the same class of "raw HTML parser sees this before JSON.parse
  // ever runs" issue — a literal "<!--" inside the payload could hide the rest of the script's own
  // content from a browser extension/validator that naively scans raw HTML instead of parsing it.
  const data = { note: '<!-- hidden' }

  const escaped = escapeJsonLd(data)

  assertEquals(escaped.includes('<!--'), false)
  assertEquals(JSON.parse(escaped), data)
})
