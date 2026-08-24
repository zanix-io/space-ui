import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { VisuallyHidden } from 'components/VisuallyHidden/index.preact.ts'

// Same behavior as `visually-hidden.test.tsx` (the React binding), verified independently against
// the Preact one — this pair is what actually proves `createVisuallyHidden`'s shared logic
// (`render.ts`) behaves identically regardless of which renderer it's bound to. Called as a plain
// function, not via JSX — see `icon-preact.test.tsx`'s own doc for why.

Deno.test('VisuallyHidden (preact): renders the given content inside a <span>', () => {
  const html = render(VisuallyHidden({ children: 'Close dialog' }))

  assertStringIncludes(html, '<span')
  assertStringIncludes(html, 'Close dialog</span>')
})

Deno.test('VisuallyHidden (preact): carries data-space-ui="visually-hidden"', () => {
  const html = render(VisuallyHidden({ children: 'text' }))

  assertStringIncludes(html, 'data-space-ui="visually-hidden"')
})

Deno.test('VisuallyHidden (preact): applies the clip-and-collapse style inline', () => {
  const html = render(VisuallyHidden({ children: 'text' }))

  assertStringIncludes(html, 'position:absolute')
  assertStringIncludes(html, 'clip:rect(0, 0, 0, 0)')
})

Deno.test('VisuallyHidden (preact): id/className land on the same <span>', () => {
  const html = render(
    VisuallyHidden({ id: 'close-label', className: 'sr-only', children: 'Close' }),
  )

  assertStringIncludes(html, 'id="close-label"')
  assertStringIncludes(html, 'class="sr-only"')
  assertStringIncludes(html, 'style=')
})

Deno.test('VisuallyHidden (preact): without id/className, neither attribute is rendered', () => {
  const html = render(VisuallyHidden({ children: 'text' }))

  assertEquals(html.includes(' id='), false)
  assertEquals(html.includes(' class='), false)
})
