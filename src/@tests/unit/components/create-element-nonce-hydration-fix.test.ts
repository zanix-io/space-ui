import { assertEquals, assertStrictEquals } from '@std/assert'
import { createElementWithNonceHydrationFix } from 'shared/create-element-nonce-hydration-fix.ts'
import type { ReactElement } from 'react'

function props(el: ReactElement): Record<string, unknown> {
  return el.props as Record<string, unknown>
}

Deno.test(
  'createElementWithNonceHydrationFix: a <style> element carrying a nonce key gets suppressHydrationWarning',
  () => {
    const el = createElementWithNonceHydrationFix('style', { nonce: 'abc123' }, 'body{}')

    assertEquals(el.type, 'style')
    assertEquals(props(el).nonce, 'abc123')
    assertStrictEquals(props(el).suppressHydrationWarning, true)
  },
)

Deno.test(
  'createElementWithNonceHydrationFix: still applies when nonce is present but undefined (no strict CSP)',
  () => {
    const el = createElementWithNonceHydrationFix('style', { nonce: undefined }, 'body{}')

    assertStrictEquals(props(el).suppressHydrationWarning, true)
  },
)

Deno.test(
  'createElementWithNonceHydrationFix: a <style> element with no nonce key at all is untouched',
  () => {
    const el = createElementWithNonceHydrationFix('style', { key: 'x' }, 'body{}')

    assertEquals('suppressHydrationWarning' in props(el), false)
  },
)

Deno.test(
  'createElementWithNonceHydrationFix: any other tag is untouched, even one carrying a nonce key',
  () => {
    const el = createElementWithNonceHydrationFix('div', { nonce: 'abc123' }, 'x')

    assertEquals('suppressHydrationWarning' in props(el), false)
  },
)

Deno.test(
  'createElementWithNonceHydrationFix: null props (no props object at all) never throws',
  () => {
    const el = createElementWithNonceHydrationFix('div', null)

    assertEquals(el.type, 'div')
  },
)

Deno.test(
  'createElementWithNonceHydrationFix: children pass through unchanged',
  () => {
    const el = createElementWithNonceHydrationFix('style', { nonce: 'abc123' }, 'a', 'b')

    assertEquals(props(el).children, ['a', 'b'])
  },
)
