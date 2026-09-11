import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { EmptyState } from 'components/EmptyState/index.ts'

function mount(element: ReturnType<typeof EmptyState>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return { container, unmount: () => act(() => root.unmount()) }
}

Deno.test('EmptyState: heading only — real h3 by default, no icon/description/action markup', () => {
  const html = renderToStaticMarkup(<EmptyState heading='No results found' />)
  assertStringIncludes(html, 'data-space-ui="empty-state"')
  assertStringIncludes(html, '<h3')
  assertStringIncludes(html, 'No results found')
  assertEquals(html.includes('empty-state-icon'), false)
  assertEquals(html.includes('empty-state-description'), false)
  assertEquals(html.includes('empty-state-action'), false)
})

Deno.test('EmptyState: description renders as a real <p>', () => {
  const html = renderToStaticMarkup(
    <EmptyState heading='No results found' description='Try a different search term.' />,
  )
  assertStringIncludes(html, '<p')
  assertStringIncludes(html, 'Try a different search term.')
})

Deno.test('EmptyState: headingLevel overrides the default h3', () => {
  const html = renderToStaticMarkup(<EmptyState heading='Nothing yet' headingLevel='h2' />)
  assertStringIncludes(html, '<h2')
  assertEquals(html.includes('<h3'), false)
})

Deno.test('EmptyState: type="section" changes the root element', () => {
  const html = renderToStaticMarkup(<EmptyState heading='Nothing yet' type='section' />)
  assertStringIncludes(html, '<section')
})

Deno.test('EmptyState: icon render-prop is rendered aria-hidden', () => {
  const html = renderToStaticMarkup(
    <EmptyState heading='Nothing yet' icon={() => <svg data-testid='glyph' />} />,
  )
  assertStringIncludes(html, 'data-space-ui="empty-state-icon"')
  assertStringIncludes(html, 'aria-hidden="true"')
  assertStringIncludes(html, 'data-testid="glyph"')
})

Deno.test('EmptyState: action render-prop composes a real, caller-owned interactive element', () => {
  const { container, unmount } = mount(
    <EmptyState
      heading='Nothing yet'
      action={() => <button type='button' onClick={() => {}}>Create one</button>}
    />,
  )
  const button = must(container.querySelector('button'))
  assertEquals(button.textContent, 'Create one')

  unmount()
})

Deno.test('EmptyState: id/className land on the root element', () => {
  const html = renderToStaticMarkup(
    <EmptyState heading='Nothing yet' id='empty-events' className='big' />,
  )
  assertStringIncludes(html, 'id="empty-events"')
  assertStringIncludes(html, 'class="big"')
})
