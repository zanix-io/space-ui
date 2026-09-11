import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Chip } from 'components/Chip/index.preact.ts'
import type { ChipProps } from 'components/Chip/index.preact.ts'

function element(props: ChipProps): VNode {
  return h(Chip, props) as VNode
}

Deno.test('Chip (preact): static (no onRemove) — no button rendered at all', () => {
  const html = renderToString(element({ label: 'Vegetarian' }))
  assertStringIncludes(html, 'data-space-ui="chip"')
  assertEquals(html.includes('<button'), false)
})

Deno.test('Chip (preact): removable — a real button, default "Remove {label}" label', () => {
  const html = renderToString(element({ label: 'Board games', onRemove: () => {} }))
  assertStringIncludes(html, '<button')
  assertStringIncludes(html, 'aria-label="Remove Board games"')
})

Deno.test('Chip (preact): clicking remove calls onRemove exactly once', () => {
  let calls = 0
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element({ label: 'Board games', onRemove: () => calls++ }), container))
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click())

  assertEquals(calls, 1)
  act(() => renderDOM(null, container))
})
