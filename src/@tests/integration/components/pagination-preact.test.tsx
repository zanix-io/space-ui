import { must } from '../../unit/components/dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import { act } from 'preact/test-utils'
import { assertEquals } from '@std/assert'
import { Pagination } from 'components/Pagination/index.preact.ts'
import type { PaginationProps } from 'components/Pagination/index.preact.ts'

// See `pagination.test.tsx`'s own doc (same directory) for why these live in `integration/`
// rather than `unit/`. Preact binding — same contract, same rendered behavior as the React
// version.

function mount(props: PaginationProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(h(Pagination, props), container))
  return {
    container,
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function buttonWithText(container: HTMLElement, text: string) {
  return must(
    Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text),
  )
}

Deno.test('Pagination (preact): clicking a page number changes the active page', () => {
  const { container, unmount } = mount({ totalPages: 5 })
  const pageTwo = buttonWithText(container, '2')

  act(() => pageTwo.click())

  assertEquals(pageTwo.getAttribute('aria-current'), 'page')

  unmount()
})

Deno.test('Pagination (preact): clicking Next advances the page', () => {
  const { container, unmount } = mount({ totalPages: 5, defaultPage: 2 })
  const next = buttonWithText(container, 'Next')

  act(() => next.click())

  assertEquals(buttonWithText(container, '3').getAttribute('aria-current'), 'page')

  unmount()
})
