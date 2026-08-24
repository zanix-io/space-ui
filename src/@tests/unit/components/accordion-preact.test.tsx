import './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Accordion } from 'components/Accordion/index.preact.ts'
import type { AccordionItem, AccordionProps } from 'components/Accordion/index.preact.ts'

// Unlike every hookless Preact component in this package, `Accordion` uses real hooks — built
// with `h(Accordion, props)` and rendered through Preact's own pipeline, not called as a plain
// function. See `counter-preact.test.tsx`'s own doc for the same reasoning.

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
    rerender: (next: AccordionProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function buttons(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
}

// --- structure -----------------------------------------------------------------------------

Deno.test('Accordion (preact): renders one Disclosure per item, all closed by default', () => {
  const html = renderToString(element({ items }))

  assertStringIncludes(html, 'data-space-ui="accordion"')
  assertStringIncludes(html, 'Question A')
  assertStringIncludes(html, 'Question B')
  assertStringIncludes(html, 'Question C')
  assertEquals((html.match(/aria-expanded="false"/g) ?? []).length, 3)
})

Deno.test('Accordion (preact): id/className land on the wrapper, not any Disclosure', () => {
  const html = renderToString(element({ items, id: 'faq', className: 'faq-list' }))

  const wrapperMatch = html.match(/<div id="faq" class="faq-list"[^>]*>/)
  assertEquals(wrapperMatch !== null, true)
})

// --- single-open (default) --------------------------------------------------------------------

// Moved to `integration/components/accordion-preact.test.tsx` — see `unit/components/
// accordion.test.tsx`'s own note (test-tier placement audit, 2026-08-21).

Deno.test('Accordion (preact): single-open — clicking the open item closes it', () => {
  const { container, unmount } = mount({ items, defaultOpenItems: ['a'] })
  const [buttonA] = buttons(container)

  act(() => buttonA.click())

  assertEquals(buttonA.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Accordion (preact): defaultOpenItems truncated to one id when multiple is false', () => {
  const html = renderToString(element({ items, defaultOpenItems: ['a', 'b'] }))

  assertEquals((html.match(/aria-expanded="true"/g) ?? []).length, 1)
})

// --- multiple ----------------------------------------------------------------------------------

Deno.test('Accordion (preact): multiple — opening a second item never closes the first', () => {
  const { container, unmount } = mount({ items, multiple: true, defaultOpenItems: ['a'] })
  const [buttonA, buttonB] = buttons(container)

  act(() => buttonB.click())

  assertEquals(buttonA.getAttribute('aria-expanded'), 'true')
  assertEquals(buttonB.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test('Accordion (preact): multiple — closing one item leaves the others open', () => {
  const { container, unmount } = mount({ items, multiple: true, defaultOpenItems: ['a', 'b'] })
  const [buttonA, buttonB] = buttons(container)

  act(() => buttonA.click())

  assertEquals(buttonA.getAttribute('aria-expanded'), 'false')
  assertEquals(buttonB.getAttribute('aria-expanded'), 'true')

  unmount()
})

// --- controlled ----------------------------------------------------------------------------

Deno.test('Accordion (preact): controlled — a click notifies but never self-opens', () => {
  const calls: string[][] = []
  const { container, unmount } = mount({
    items,
    openItems: [],
    onOpenItemsChange: (next) => calls.push(next),
  })
  const [buttonA] = buttons(container)

  act(() => buttonA.click())

  assertEquals(calls, [['a']])
  assertEquals(buttonA.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Accordion (preact): controlled — updating openItems re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount({ items, openItems: [] })
  const [buttonA] = buttons(container)

  assertEquals(buttonA.getAttribute('aria-expanded'), 'false')

  rerender({ items, openItems: ['a'] })

  assertEquals(buttons(container)[0].getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test('Accordion (preact): openItems takes precedence over defaultOpenItems', () => {
  const html = renderToString(element({ items, openItems: ['b'], defaultOpenItems: ['a'] }))

  const [expandedA, expandedB] = html.match(/aria-expanded="(true|false)"/g) ?? []
  assertEquals(expandedA, 'aria-expanded="false"')
  assertEquals(expandedB, 'aria-expanded="true"')
})

// --- item identity ---------------------------------------------------------------------------

Deno.test('Accordion (preact): an item without an explicit id falls back to its own index', () => {
  const itemsWithoutIds: AccordionItem[] = [
    { trigger: 'Q1', children: 'A1' },
    { trigger: 'Q2', children: 'A2' },
  ]
  const { container, unmount } = mount({ items: itemsWithoutIds, defaultOpenItems: ['1'] })
  const [button0, button1] = buttons(container)

  assertEquals(button0.getAttribute('aria-expanded'), 'false')
  assertEquals(button1.getAttribute('aria-expanded'), 'true')

  unmount()
})

// --- composes Disclosure unchanged ------------------------------------------------------------

Deno.test('Accordion (preact): each section is a real Disclosure — hidden, not unmounted', () => {
  const { container, unmount } = mount({ items })

  const regions = Array.from(container.querySelectorAll('[aria-labelledby]'))
  assertEquals(regions.length, 3)
  assertEquals(regions.every((region) => region.hasAttribute('hidden')), true)
  assertEquals(regions[0].textContent, 'Answer A')

  unmount()
})
