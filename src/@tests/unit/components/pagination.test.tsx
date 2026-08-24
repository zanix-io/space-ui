import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Pagination } from 'components/Pagination/index.ts'

function mount(element: ReturnType<typeof Pagination>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Pagination>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

function buttonWithText(container: HTMLElement, text: string) {
  return must(
    Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text),
  )
}

// --- structure -----------------------------------------------------------------------------

Deno.test('Pagination: totalPages <= 1 renders nothing at all', () => {
  assertEquals(renderToStaticMarkup(<Pagination totalPages={1} />), '')
  assertEquals(renderToStaticMarkup(<Pagination totalPages={0} />), '')
})

Deno.test('Pagination: role/structure — nav + aria-label, list of page controls', () => {
  const html = renderToStaticMarkup(<Pagination totalPages={5} />)

  assertStringIncludes(html, '<nav')
  assertStringIncludes(html, 'aria-label="Pagination"')
  assertStringIncludes(html, 'data-space-ui="pagination"')
  assertStringIncludes(html, 'data-space-ui="pagination-list"')
})

Deno.test('Pagination: a custom label overrides the default', () => {
  const html = renderToStaticMarkup(<Pagination totalPages={5} label='Search results' />)

  assertStringIncludes(html, 'aria-label="Search results"')
})

Deno.test('Pagination: id/className land on the <nav>', () => {
  const html = renderToStaticMarkup(
    <Pagination totalPages={5} id='results-nav' className='pager' />,
  )

  assertStringIncludes(html, 'id="results-nav"')
  assertStringIncludes(html, 'class="pager"')
})

Deno.test('Pagination: the current page carries aria-current="page", others do not', () => {
  const html = renderToStaticMarkup(<Pagination totalPages={5} defaultPage={3} />)

  assertEquals((html.match(/aria-current="page"/g) ?? []).length, 1)
})

Deno.test('Pagination: ellipsis renders as decorative, aria-hidden text', () => {
  const html = renderToStaticMarkup(<Pagination totalPages={20} defaultPage={10} />)

  assertStringIncludes(html, '<span aria-hidden="true">…</span>')
})

// --- Previous/Next boundaries ------------------------------------------------------------------

Deno.test('Pagination: Previous is omitted entirely on page 1', () => {
  const html = renderToStaticMarkup(<Pagination totalPages={5} defaultPage={1} />)

  assertEquals(html.includes('>Previous<'), false)
  assertStringIncludes(html, '>Next<')
})

Deno.test('Pagination: Next is omitted entirely on the last page', () => {
  const html = renderToStaticMarkup(<Pagination totalPages={5} defaultPage={5} />)

  assertEquals(html.includes('>Next<'), false)
  assertStringIncludes(html, '>Previous<')
})

Deno.test('Pagination: both Previous and Next render on a middle page', () => {
  const html = renderToStaticMarkup(<Pagination totalPages={5} defaultPage={3} />)

  assertStringIncludes(html, '>Previous<')
  assertStringIncludes(html, '>Next<')
})

// --- Button vs Link (getPageHref) ---------------------------------------------------------------

Deno.test('Pagination: without getPageHref, page items are plain <button>s', () => {
  const html = renderToStaticMarkup(<Pagination totalPages={5} />)

  assertEquals(html.includes('<a '), false)
  assertStringIncludes(html, '<button')
})

Deno.test('Pagination: with getPageHref, page items are real <a href> links', () => {
  const html = renderToStaticMarkup(
    <Pagination totalPages={5} getPageHref={(page) => `/results?page=${page}`} />,
  )

  assertStringIncludes(html, 'href="/results?page=1"')
  assertStringIncludes(html, 'href="/results?page=2"')
})

Deno.test('Pagination: Previous/Next carry rel="prev"/"next" when rendered as links', () => {
  const html = renderToStaticMarkup(
    <Pagination
      totalPages={5}
      defaultPage={3}
      getPageHref={(page) => `/results?page=${page}`}
    />,
  )

  assertStringIncludes(html, 'rel="prev"')
  assertStringIncludes(html, 'rel="next"')
})

// --- click navigation, real DOM ----------------------------------------------------------------

// Both click-navigation tests ("clicking a page number changes the active page", "clicking Next
// advances the page") moved to `integration/components/pagination.test.tsx` (test-tier placement
// audit, 2026-08-21) — real cross-instance coordination between two `Button`s, not one control in
// isolation. See that file's own doc for why this qualifies the same way `Menu`/`Accordion`'s
// confirmed cases do, despite not being one of the audit's original three findings.

// --- controlled / uncontrolled / onPageChange ---------------------------------------------------

Deno.test('Pagination: uncontrolled — onPageChange fires, still changes on its own', () => {
  const calls: number[] = []
  const { container, unmount } = mount(
    <Pagination totalPages={5} onPageChange={(next) => calls.push(next)} />,
  )
  const pageTwo = buttonWithText(container, '2')

  act(() => pageTwo.click())

  assertEquals(calls, [2])
  assertEquals(pageTwo.getAttribute('aria-current'), 'page')

  unmount()
})

Deno.test('Pagination: with getPageHref, clicking a page link still fires onPageChange', () => {
  const calls: number[] = []
  const { container, unmount } = mount(
    <Pagination
      totalPages={5}
      getPageHref={(page) => `/results?page=${page}`}
      onPageChange={(next) => calls.push(next)}
    />,
  )
  const pageTwo = must(
    Array.from(container.querySelectorAll('a')).find((a) => a.textContent === '2'),
  )

  act(() => pageTwo.click())

  assertEquals(calls, [2])
  assertEquals(pageTwo.getAttribute('aria-current'), 'page')

  unmount()
})

Deno.test('Pagination: controlled — a click notifies onPageChange but never self-advances', () => {
  const calls: number[] = []
  const { container, unmount } = mount(
    <Pagination totalPages={5} page={1} onPageChange={(next) => calls.push(next)} />,
  )
  const pageTwo = buttonWithText(container, '2')

  act(() => pageTwo.click())

  assertEquals(calls, [2])
  assertEquals(pageTwo.getAttribute('aria-current'), null)

  unmount()
})

Deno.test('Pagination: controlled — updating page from outside re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount(<Pagination totalPages={5} page={1} />)

  rerender(<Pagination totalPages={5} page={4} />)

  const pageFour = buttonWithText(container, '4')
  assertEquals(pageFour.getAttribute('aria-current'), 'page')

  unmount()
})

Deno.test('Pagination: page takes precedence over defaultPage when both are given', () => {
  const html = renderToStaticMarkup(<Pagination totalPages={5} page={4} defaultPage={1} />)

  const buttons = html.match(/<button[^>]*>\d<\/button>/g) ?? []
  const currentButtons = buttons.filter((button) => button.includes('aria-current="page"'))

  assertEquals(currentButtons.length, 1)
  assertStringIncludes(currentButtons[0], '>4</button>')
})
