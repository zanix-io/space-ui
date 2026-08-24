import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { VisuallyHidden } from 'components/VisuallyHidden/index.ts'

Deno.test('VisuallyHidden: renders the given content inside a <span>', () => {
  const html = renderToStaticMarkup(<VisuallyHidden>Close dialog</VisuallyHidden>)

  assertStringIncludes(html, '<span')
  assertStringIncludes(html, 'Close dialog</span>')
})

Deno.test('VisuallyHidden: carries data-space-ui="visually-hidden"', () => {
  const html = renderToStaticMarkup(<VisuallyHidden>text</VisuallyHidden>)

  assertStringIncludes(html, 'data-space-ui="visually-hidden"')
})

Deno.test('VisuallyHidden: applies the clip-and-collapse style inline, not via a class', () => {
  const html = renderToStaticMarkup(<VisuallyHidden>text</VisuallyHidden>)

  assertStringIncludes(html, 'position:absolute')
  assertStringIncludes(html, 'clip:rect(0, 0, 0, 0)')
})

Deno.test('VisuallyHidden: id/className land on the same <span> as the inline style', () => {
  const html = renderToStaticMarkup(
    <VisuallyHidden id='close-label' className='sr-only'>
      Close dialog
    </VisuallyHidden>,
  )

  assertStringIncludes(html, 'id="close-label"')
  assertStringIncludes(html, 'class="sr-only"')
  assertStringIncludes(html, 'style=')
})

Deno.test('VisuallyHidden: without id/className, neither attribute is rendered', () => {
  const html = renderToStaticMarkup(<VisuallyHidden>text</VisuallyHidden>)

  assertEquals(html.includes(' id='), false)
  assertEquals(html.includes(' class='), false)
})
