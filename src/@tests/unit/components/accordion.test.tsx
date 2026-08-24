import './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Accordion } from 'components/Accordion/index.ts'
import type { AccordionItem } from 'components/Accordion/index.ts'

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
    rerender: (next: ReturnType<typeof Accordion>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

function buttons(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
}

// --- structure -----------------------------------------------------------------------------

Deno.test('Accordion: renders one Disclosure per item, all closed by default', () => {
  const html = renderToStaticMarkup(<Accordion items={items} />)

  assertStringIncludes(html, 'data-space-ui="accordion"')
  assertStringIncludes(html, 'Question A')
  assertStringIncludes(html, 'Question B')
  assertStringIncludes(html, 'Question C')
  assertEquals((html.match(/aria-expanded="false"/g) ?? []).length, 3)
})

Deno.test('Accordion: id/className land on the wrapper, not any individual Disclosure', () => {
  const html = renderToStaticMarkup(<Accordion items={items} id='faq' className='faq-list' />)

  const wrapperMatch = html.match(/<div id="faq" class="faq-list"[^>]*>/)
  assertEquals(wrapperMatch !== null, true)
})

// --- single-open (default) --------------------------------------------------------------------

// The "opening one item closes any other open one" cross-item coordination test moved to
// `integration/components/accordion.test.tsx` (test-tier placement audit, 2026-08-21) — it tests
// real interaction BETWEEN two `Disclosure` instances, not one item's own internals.

Deno.test('Accordion: single-open — clicking the already-open item closes it', () => {
  const { container, unmount } = mount(<Accordion items={items} defaultOpenItems={['a']} />)
  const [buttonA] = buttons(container)

  act(() => buttonA.click())

  assertEquals(buttonA.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Accordion: defaultOpenItems is truncated to one id when multiple is false', () => {
  const html = renderToStaticMarkup(<Accordion items={items} defaultOpenItems={['a', 'b']} />)

  assertEquals((html.match(/aria-expanded="true"/g) ?? []).length, 1)
})

// --- multiple ----------------------------------------------------------------------------------

Deno.test('Accordion: multiple — opening a second item never closes the first', () => {
  const { container, unmount } = mount(
    <Accordion items={items} multiple defaultOpenItems={['a']} />,
  )
  const [buttonA, buttonB] = buttons(container)

  act(() => buttonB.click())

  assertEquals(buttonA.getAttribute('aria-expanded'), 'true')
  assertEquals(buttonB.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test('Accordion: multiple — closing one item leaves the others open', () => {
  const { container, unmount } = mount(
    <Accordion items={items} multiple defaultOpenItems={['a', 'b']} />,
  )
  const [buttonA, buttonB] = buttons(container)

  act(() => buttonA.click())

  assertEquals(buttonA.getAttribute('aria-expanded'), 'false')
  assertEquals(buttonB.getAttribute('aria-expanded'), 'true')

  unmount()
})

// --- controlled ----------------------------------------------------------------------------

Deno.test('Accordion: controlled — a click notifies onOpenItemsChange but never self-opens', () => {
  const calls: string[][] = []
  const { container, unmount } = mount(
    <Accordion items={items} openItems={[]} onOpenItemsChange={(next) => calls.push(next)} />,
  )
  const [buttonA] = buttons(container)

  act(() => buttonA.click())

  assertEquals(calls, [['a']])
  assertEquals(buttonA.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Accordion: controlled — updating openItems re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount(<Accordion items={items} openItems={[]} />)
  const [buttonA] = buttons(container)

  assertEquals(buttonA.getAttribute('aria-expanded'), 'false')

  rerender(<Accordion items={items} openItems={['a']} />)

  assertEquals(buttons(container)[0].getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test('Accordion: openItems takes precedence over defaultOpenItems when both are given', () => {
  const html = renderToStaticMarkup(
    <Accordion items={items} openItems={['b']} defaultOpenItems={['a']} />,
  )

  const [expandedA, expandedB] = html.match(/aria-expanded="(true|false)"/g) ?? []
  assertEquals(expandedA, 'aria-expanded="false"')
  assertEquals(expandedB, 'aria-expanded="true"')
})

// --- item identity ---------------------------------------------------------------------------

Deno.test('Accordion: an item without an explicit id falls back to its own index', () => {
  const itemsWithoutIds: AccordionItem[] = [
    { trigger: 'Q1', children: 'A1' },
    { trigger: 'Q2', children: 'A2' },
  ]
  const { container, unmount } = mount(
    <Accordion items={itemsWithoutIds} defaultOpenItems={['1']} />,
  )
  const [button0, button1] = buttons(container)

  assertEquals(button0.getAttribute('aria-expanded'), 'false')
  assertEquals(button1.getAttribute('aria-expanded'), 'true')

  unmount()
})

// --- composes Disclosure unchanged ------------------------------------------------------------

Deno.test('Accordion: each section is a real Disclosure — hidden, not unmounted', () => {
  const { container, unmount } = mount(<Accordion items={items} />)

  const regions = Array.from(container.querySelectorAll('[aria-labelledby]'))
  assertEquals(regions.length, 3)
  assertEquals(regions.every((region) => region.hasAttribute('hidden')), true)
  assertEquals(regions[0].textContent, 'Answer A')

  unmount()
})
