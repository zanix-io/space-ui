import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Pagination } from 'components/Pagination/index.preact.ts'
import type { PaginationProps } from 'components/Pagination/index.preact.ts'

// Unlike every hookless Preact component in this package, `Pagination` uses real hooks — built
// with `h(Pagination, props)` and rendered through Preact's own pipeline, not called as a plain
// function. See `counter-preact.test.tsx`'s own doc for the same reasoning.

function element(props: PaginationProps): VNode {
  return h(Pagination, props) as VNode
}

function mount(props: PaginationProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: PaginationProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function buttonWithText(container: HTMLElement, text: string) {
  return must(
    Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text),
  )
}

// --- structure -----------------------------------------------------------------------------

Deno.test('Pagination (preact): totalPages <= 1 renders nothing at all', () => {
  assertEquals(renderToString(element({ totalPages: 1 })), '')
  assertEquals(renderToString(element({ totalPages: 0 })), '')
})

Deno.test('Pagination (preact): role/structure — nav + aria-label, list of page controls', () => {
  const html = renderToString(element({ totalPages: 5 }))

  assertStringIncludes(html, '<nav')
  assertStringIncludes(html, 'aria-label="Pagination"')
  assertStringIncludes(html, 'data-space-ui="pagination"')
  assertStringIncludes(html, 'data-space-ui="pagination-list"')
})

Deno.test('Pagination (preact): a custom label overrides the default', () => {
  const html = renderToString(element({ totalPages: 5, label: 'Search results' }))

  assertStringIncludes(html, 'aria-label="Search results"')
})

Deno.test('Pagination (preact): id/className land on the <nav>', () => {
  const html = renderToString(element({ totalPages: 5, id: 'results-nav', className: 'pager' }))

  assertStringIncludes(html, 'id="results-nav"')
  assertStringIncludes(html, 'class="pager"')
})

Deno.test('Pagination (preact): the current page carries aria-current="page"', () => {
  const html = renderToString(element({ totalPages: 5, defaultPage: 3 }))

  assertEquals((html.match(/aria-current="page"/g) ?? []).length, 1)
})

Deno.test('Pagination (preact): ellipsis renders as decorative, aria-hidden text', () => {
  const html = renderToString(element({ totalPages: 20, defaultPage: 10 }))

  assertStringIncludes(html, '<span aria-hidden="true">…</span>')
})

// --- Previous/Next boundaries ------------------------------------------------------------------

Deno.test('Pagination (preact): Previous is omitted entirely on page 1', () => {
  const html = renderToString(element({ totalPages: 5, defaultPage: 1 }))

  assertEquals(html.includes('>Previous<'), false)
  assertStringIncludes(html, '>Next<')
})

Deno.test('Pagination (preact): Next is omitted entirely on the last page', () => {
  const html = renderToString(element({ totalPages: 5, defaultPage: 5 }))

  assertEquals(html.includes('>Next<'), false)
  assertStringIncludes(html, '>Previous<')
})

// --- Button vs Link (getPageHref) ---------------------------------------------------------------

Deno.test('Pagination (preact): without getPageHref, page items are plain <button>s', () => {
  const html = renderToString(element({ totalPages: 5 }))

  assertEquals(html.includes('<a '), false)
  assertStringIncludes(html, '<button')
})

Deno.test('Pagination (preact): with getPageHref, page items are real <a href> links', () => {
  const html = renderToString(
    element({ totalPages: 5, getPageHref: (page) => `/results?page=${page}` }),
  )

  assertStringIncludes(html, 'href="/results?page=1"')
  assertStringIncludes(html, 'href="/results?page=2"')
})

Deno.test('Pagination (preact): Previous/Next carry rel="prev"/"next" when links', () => {
  const html = renderToString(
    element({
      totalPages: 5,
      defaultPage: 3,
      getPageHref: (page) => `/results?page=${page}`,
    }),
  )

  assertStringIncludes(html, 'rel="prev"')
  assertStringIncludes(html, 'rel="next"')
})

// --- click navigation, real DOM ----------------------------------------------------------------

// Both click-navigation tests moved to `integration/components/pagination-preact.test.tsx` — see
// `unit/components/pagination.test.tsx`'s own doc.

// --- controlled / uncontrolled / onPageChange ---------------------------------------------------

Deno.test('Pagination (preact): uncontrolled — onPageChange fires, still changes itself', () => {
  const calls: number[] = []
  const { container, unmount } = mount({
    totalPages: 5,
    onPageChange: (next) => calls.push(next),
  })
  const pageTwo = buttonWithText(container, '2')

  act(() => pageTwo.click())

  assertEquals(calls, [2])
  assertEquals(pageTwo.getAttribute('aria-current'), 'page')

  unmount()
})

Deno.test('Pagination (preact): controlled — a click notifies but never self-advances', () => {
  const calls: number[] = []
  const { container, unmount } = mount({
    totalPages: 5,
    page: 1,
    onPageChange: (next) => calls.push(next),
  })
  const pageTwo = buttonWithText(container, '2')

  act(() => pageTwo.click())

  assertEquals(calls, [2])
  assertEquals(pageTwo.getAttribute('aria-current'), null)

  unmount()
})

Deno.test('Pagination (preact): controlled — updating page re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount({ totalPages: 5, page: 1 })

  rerender({ totalPages: 5, page: 4 })

  assertEquals(buttonWithText(container, '4').getAttribute('aria-current'), 'page')

  unmount()
})

Deno.test('Pagination (preact): page takes precedence over defaultPage', () => {
  const html = renderToString(element({ totalPages: 5, page: 4, defaultPage: 1 }))

  const buttons = html.match(/<button[^>]*>\d<\/button>/g) ?? []
  const currentButtons = buttons.filter((button) => button.includes('aria-current="page"'))

  assertEquals(currentButtons.length, 1)
  assertStringIncludes(currentButtons[0], '>4</button>')
})
