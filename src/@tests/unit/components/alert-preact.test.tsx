import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { Alert } from 'components/Alert/index.preact.ts'

// Same behavior as `alert.test.tsx` (the React binding), verified independently against the
// Preact one — this pair is what actually proves `createAlert`'s shared logic (`render.ts`)
// behaves identically regardless of which renderer it's bound to. Called as a plain function, not
// via JSX — see `icon-preact.test.tsx`'s own doc for why.

Deno.test('Alert (preact): default politeness is "assertive" — role="alert"', () => {
  const html = render(Alert({ children: 'Something went wrong.' }))

  assertStringIncludes(html, 'role="alert"')
  assertStringIncludes(html, 'Something went wrong.')
  assertEquals(html.includes('role="status"'), false)
})

Deno.test('Alert (preact): politeness="polite" renders role="status" instead', () => {
  const html = render(Alert({ politeness: 'polite', children: 'Saved successfully.' }))

  assertStringIncludes(html, 'role="status"')
  assertEquals(html.includes('role="alert"'), false)
})

Deno.test('Alert (preact): no explicit aria-live attribute', () => {
  const html = render(Alert({ children: 'Message' }))

  assertEquals(html.includes('aria-live'), false)
})

Deno.test('Alert (preact): carries data-space-ui="alert" regardless of politeness', () => {
  const assertiveHtml = render(Alert({ children: 'Message' }))
  const politeHtml = render(Alert({ politeness: 'polite', children: 'Message' }))

  assertStringIncludes(assertiveHtml, 'data-space-ui="alert"')
  assertStringIncludes(politeHtml, 'data-space-ui="alert"')
})

Deno.test('Alert (preact): id/className are forwarded to the same element', () => {
  const html = render(
    Alert({ id: 'form-error', className: 'banner-error', children: 'Message' }),
  )

  assertStringIncludes(html, 'id="form-error"')
  assertStringIncludes(html, 'class="banner-error"')
})

Deno.test('Alert (preact): renders no inline style of its own', () => {
  const html = render(Alert({ children: 'Message' }))

  assertEquals(html.includes('style='), false)
})
