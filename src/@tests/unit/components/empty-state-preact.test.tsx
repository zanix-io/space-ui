import { h } from 'preact'
import type { VNode } from 'preact'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { EmptyState } from 'components/EmptyState/index.preact.ts'
import type { EmptyStateProps } from 'components/EmptyState/index.preact.ts'

function element(props: EmptyStateProps): VNode {
  return h(EmptyState, props) as VNode
}

Deno.test('EmptyState (preact): heading only — real h3 by default', () => {
  const html = renderToString(element({ heading: 'No results found' }))
  assertStringIncludes(html, 'data-space-ui="empty-state"')
  assertStringIncludes(html, '<h3')
  assertStringIncludes(html, 'No results found')
})

Deno.test('EmptyState (preact): icon/description/action all render together', () => {
  const html = renderToString(
    element({
      heading: 'Nothing yet',
      description: 'Come back later.',
      icon: () => h('svg', null),
      action: () => h('button', { type: 'button' }, 'Refresh'),
    }),
  )
  assertStringIncludes(html, 'data-space-ui="empty-state-icon"')
  assertStringIncludes(html, 'data-space-ui="empty-state-description"')
  assertStringIncludes(html, 'data-space-ui="empty-state-action"')
  assertStringIncludes(html, 'Refresh')
})

Deno.test('EmptyState (preact): type="section" changes the root element', () => {
  const html = renderToString(element({ heading: 'Nothing yet', type: 'section' }))
  assertStringIncludes(html, '<section')
  assertEquals(html.includes('<div data-space-ui="empty-state"'), false)
})
