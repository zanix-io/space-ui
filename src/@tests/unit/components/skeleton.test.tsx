import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { Skeleton } from 'components/Skeleton/index.ts'

Deno.test('Skeleton: decorative by default — aria-hidden, no role', () => {
  const html = renderToStaticMarkup(<Skeleton />)

  assertStringIncludes(html, 'aria-hidden="true"')
  assertEquals(html.includes('role='), false)
})

Deno.test('Skeleton: a label switches it to an accessible role="status"', () => {
  const html = renderToStaticMarkup(<Skeleton label='Loading' />)

  assertStringIncludes(html, 'role="status"')
  assertStringIncludes(html, 'aria-label="Loading"')
  assertEquals(html.includes('aria-hidden'), false)
})

Deno.test('Skeleton: carries data-space-ui="skeleton"', () => {
  const html = renderToStaticMarkup(<Skeleton />)

  assertStringIncludes(html, 'data-space-ui="skeleton"')
})

Deno.test('Skeleton: id/className are forwarded, no inline style/dimension of its own', () => {
  const html = renderToStaticMarkup(<Skeleton id='avatar-skeleton' className='skeleton-circle' />)

  assertStringIncludes(html, 'id="avatar-skeleton"')
  assertStringIncludes(html, 'class="skeleton-circle"')
  assertEquals(html.includes('style='), false)
})

Deno.test('Skeleton: renders no children — a childless placeholder', () => {
  const html = renderToStaticMarkup(<Skeleton />)

  assertEquals(html, '<div aria-hidden="true" data-space-ui="skeleton"></div>')
})
