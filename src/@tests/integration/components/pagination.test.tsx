import { must } from '../../unit/components/dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { assertEquals } from '@std/assert'
import { Pagination } from 'components/Pagination/index.ts'

/**
 * Real cross-component composition: `Pagination` (`components/Pagination/index.ts`) composes
 * real `Button` instances, one per page number — moved here from
 * `unit/components/pagination.test.tsx` (test-tier placement audit, 2026-08-21).
 *
 * Not part of the audit's original three confirmed findings, but the same shape on inspection: no
 * `shared/roving-focus.ts` involved (unlike `Tabs`/`RadioGroup`, see that decision recorded in
 * `radio-group.test.tsx`'s own doc) — clicking one real `Button` (page "2", or "Next") changes
 * `aria-current` on a DIFFERENT real `Button` instance ("2", or "3"), which is `Pagination`'s own
 * state coordinating multiple sibling `Button`s directly, structurally identical to `Menu`'s
 * confirmed "opening one submenu never closes a sibling" case and `Accordion`'s confirmed
 * "single-open" case above.
 *
 * `Pagination`'s other tests (structure, ellipsis/windowing, controlled/uncontrolled, Previous/
 * Next omission, plain-button vs. real-`<a>` rendering) stay in
 * `unit/components/pagination.test.tsx` — they exercise a single control/instance, no real
 * cross-instance interaction.
 */

function mount(element: ReturnType<typeof Pagination>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    unmount: () => act(() => root.unmount()),
  }
}

function buttonWithText(container: HTMLElement, text: string) {
  return must(
    Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text),
  )
}

Deno.test('Pagination: clicking a page number changes the active page — real DOM', () => {
  const { container, unmount } = mount(<Pagination totalPages={5} />)
  const pageTwo = buttonWithText(container, '2')

  act(() => pageTwo.click())

  assertEquals(pageTwo.getAttribute('aria-current'), 'page')

  unmount()
})

Deno.test('Pagination: clicking Next advances the page — real DOM', () => {
  const { container, unmount } = mount(<Pagination totalPages={5} defaultPage={2} />)
  const next = buttonWithText(container, 'Next')

  act(() => next.click())

  const pageThree = buttonWithText(container, '3')
  assertEquals(pageThree.getAttribute('aria-current'), 'page')

  unmount()
})
