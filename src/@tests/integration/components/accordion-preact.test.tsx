import '../../unit/components/dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { assertEquals } from '@std/assert'
import { Accordion } from 'components/Accordion/index.preact.ts'
import type { AccordionItem, AccordionProps } from 'components/Accordion/index.preact.ts'

// See `accordion.test.tsx`'s own doc (same directory) for why this lives in `integration/` rather
// than `unit/`. Preact binding — same contract, same rendered behavior as the React version.

const items: AccordionItem[] = [
  { id: 'a', trigger: 'Question A', children: 'Answer A' },
  { id: 'b', trigger: 'Question B', children: 'Answer B' },
  { id: 'c', trigger: 'Question C', children: 'Answer C' },
]

function element(props: AccordionProps): VNode {
  return h(Accordion, props) as VNode
}

function mount(props: AccordionProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function buttons(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
}

Deno.test('Accordion (preact): single-open — opening one item closes any other, real DOM', () => {
  const { container, unmount } = mount({ items, defaultOpenItems: ['a'] })
  const [buttonA, buttonB] = buttons(container)

  assertEquals(buttonA.getAttribute('aria-expanded'), 'true')
  assertEquals(buttonB.getAttribute('aria-expanded'), 'false')

  act(() => buttonB.click())

  assertEquals(buttonA.getAttribute('aria-expanded'), 'false')
  assertEquals(buttonB.getAttribute('aria-expanded'), 'true')

  unmount()
})
