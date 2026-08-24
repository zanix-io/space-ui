import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { Alert } from 'components/Alert/index.ts'

Deno.test('Alert: default politeness is "assertive" — role="alert"', () => {
  const html = renderToStaticMarkup(<Alert>Something went wrong.</Alert>)

  assertStringIncludes(html, 'role="alert"')
  assertStringIncludes(html, 'Something went wrong.')
  assertEquals(html.includes('role="status"'), false)
})

Deno.test('Alert: politeness="polite" renders role="status" instead', () => {
  const html = renderToStaticMarkup(<Alert politeness='polite'>Saved successfully.</Alert>)

  assertStringIncludes(html, 'role="status"')
  assertEquals(html.includes('role="alert"'), false)
})

Deno.test('Alert: no explicit aria-live attribute — role alone implies it', () => {
  const html = renderToStaticMarkup(<Alert>Message</Alert>)

  assertEquals(html.includes('aria-live'), false)
})

Deno.test('Alert: carries data-space-ui="alert" regardless of politeness', () => {
  const assertiveHtml = renderToStaticMarkup(<Alert>Message</Alert>)
  const politeHtml = renderToStaticMarkup(<Alert politeness='polite'>Message</Alert>)

  assertStringIncludes(assertiveHtml, 'data-space-ui="alert"')
  assertStringIncludes(politeHtml, 'data-space-ui="alert"')
})

Deno.test('Alert: id/className are forwarded to the same element', () => {
  const html = renderToStaticMarkup(
    <Alert id='form-error' className='banner-error'>
      Message
    </Alert>,
  )

  assertStringIncludes(html, 'id="form-error"')
  assertStringIncludes(html, 'class="banner-error"')
})

Deno.test('Alert: renders no inline style of its own — fully unstyled, headless', () => {
  const html = renderToStaticMarkup(<Alert>Message</Alert>)

  assertEquals(html.includes('style='), false)
})
