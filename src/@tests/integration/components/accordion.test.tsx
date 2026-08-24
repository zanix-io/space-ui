import '../../unit/components/dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { assertEquals } from '@std/assert'
import { Accordion } from 'components/Accordion/index.ts'
import type { AccordionItem } from 'components/Accordion/index.ts'

/**
 * Real cross-component composition: `Accordion` (`components/Accordion/index.ts`) composes
 * `Disclosure` directly, one real instance per item — moved here from
 * `unit/components/accordion.test.tsx` (test-tier placement audit, 2026-08-21) because what's
 * under test is the coordination BETWEEN multiple real `Disclosure` instances (opening one closes
 * another), not `Accordion`'s or `Disclosure`'s own internals in isolation. `Accordion`'s other
 * tests (basic open/close, controlled/uncontrolled, item-identity, SSR markup) stay in
 * `unit/components/accordion.test.tsx` — they exercise a single item/instance, no real
 * cross-instance interaction.
 */

const items: AccordionItem[] = [
  { id: 'a', trigger: 'Question A', children: 'Answer A' },
  { id: 'b', trigger: 'Question B', children: 'Answer B' },
  { id: 'c', trigger: 'Question C', children: 'Answer C' },
]

function mount(element: ReturnType<typeof Accordion>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    unmount: () => act(() => root.unmount()),
  }
}

function buttons(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
}

Deno.test('Accordion: single-open — opening one item closes any other open one, real DOM', () => {
  const { container, unmount } = mount(<Accordion items={items} defaultOpenItems={['a']} />)
  const [buttonA, buttonB] = buttons(container)

  assertEquals(buttonA.getAttribute('aria-expanded'), 'true')
  assertEquals(buttonB.getAttribute('aria-expanded'), 'false')

  act(() => buttonB.click())

  assertEquals(buttonA.getAttribute('aria-expanded'), 'false')
  assertEquals(buttonB.getAttribute('aria-expanded'), 'true')

  unmount()
})
