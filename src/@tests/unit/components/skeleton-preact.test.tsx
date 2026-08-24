import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { Skeleton } from 'components/Skeleton/index.preact.ts'

// Same behavior as `skeleton.test.tsx` (the React binding), verified independently against the
// Preact one. Called as a plain function, not via JSX — see `icon-preact.test.tsx`'s own doc for
// why.

Deno.test('Skeleton (preact): decorative by default — aria-hidden, no role', () => {
  const html = render(Skeleton({}))

  assertStringIncludes(html, 'aria-hidden="true"')
  assertEquals(html.includes('role='), false)
})

Deno.test('Skeleton (preact): a label switches it to an accessible role="status"', () => {
  const html = render(Skeleton({ label: 'Loading' }))

  assertStringIncludes(html, 'role="status"')
  assertStringIncludes(html, 'aria-label="Loading"')
  assertEquals(html.includes('aria-hidden'), false)
})

Deno.test('Skeleton (preact): carries data-space-ui="skeleton"', () => {
  const html = render(Skeleton({}))

  assertStringIncludes(html, 'data-space-ui="skeleton"')
})

Deno.test('Skeleton (preact): id/className are forwarded, no inline style of its own', () => {
  const html = render(Skeleton({ id: 'avatar-skeleton', className: 'skeleton-circle' }))

  assertStringIncludes(html, 'id="avatar-skeleton"')
  assertStringIncludes(html, 'class="skeleton-circle"')
  assertEquals(html.includes('style='), false)
})

Deno.test('Skeleton (preact): renders no children — a childless placeholder', () => {
  const html = render(Skeleton({}))

  assertEquals(html, '<div aria-hidden="true" data-space-ui="skeleton"></div>')
})
