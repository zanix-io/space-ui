import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Table } from 'components/Table/index.preact.ts'
import type { TableColumn, TableProps, TableSort } from 'components/Table/index.preact.ts'

// Unlike every hookless Preact component in this package, `Table` uses real hooks — built with
// `h(Table, props)` and rendered through Preact's own pipeline, not called as a plain function.
// See `pagination-preact.test.tsx`'s own doc for the same reasoning.

type Row = { id: string; name: string; age: number }

const rows: Row[] = [
  { id: 'a', name: 'Ada', age: 30 },
  { id: 'b', name: 'Bo', age: 25 },
]

const columns: TableColumn<Row>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'age', header: 'Age', cell: (row) => String(row.age), sortable: true },
]

// `Table` is generic over `Row` — Preact's own `h<P>` overload can't infer a concrete `P` from a
// generic function component's type alone, so this narrows it to the one concrete `Row` this test
// file uses before calling `h`, the same shape a caller of a generic component always needs.
const TableForRow = Table as (props: TableProps<Row>) => VNode | null

function element(props: TableProps<Row>): VNode {
  return h(TableForRow, props) as VNode
}

function mount(props: TableProps<Row>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: TableProps<Row>) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function thWithText(container: HTMLElement, text: string) {
  return must(
    Array.from(container.querySelectorAll('th')).find((th) => th.textContent === text),
  )
}

// --- structure -----------------------------------------------------------------------------

Deno.test('Table (preact): no columns renders nothing at all', () => {
  assertEquals(renderToString(element({ columns: [], rows })), '')
})

Deno.test('Table (preact): role/structure — a real <table>, data-space-ui, thead/tbody', () => {
  const html = renderToString(element({ columns, rows }))

  assertStringIncludes(html, '<table')
  assertStringIncludes(html, 'data-space-ui="table"')
  assertStringIncludes(html, '<thead')
  assertStringIncludes(html, '<tbody')
})

Deno.test('Table (preact): id/className land on the <table>', () => {
  const html = renderToString(element({ columns, rows, id: 'users-table', className: 'grid' }))

  assertStringIncludes(html, 'id="users-table"')
  assertStringIncludes(html, 'class="grid"')
})

Deno.test('Table (preact): caption renders as a real <caption>', () => {
  const html = renderToString(element({ columns, rows, caption: 'Users' }))

  assertStringIncludes(html, '<caption>Users</caption>')
})

Deno.test('Table (preact): each cell renders via its own column.cell(row)', () => {
  const html = renderToString(element({ columns, rows }))

  assertStringIncludes(html, '<td>Ada</td>')
  assertStringIncludes(html, '<td>30</td>')
})

// --- empty state ------------------------------------------------------------------------------

Deno.test('Table (preact): no rows, with emptyState — one row spanning every column', () => {
  const html = renderToString(element({ columns, rows: [], emptyState: 'Nothing here' }))

  assertStringIncludes(html, 'colspan="2"')
  assertStringIncludes(html, 'Nothing here')
})

Deno.test('Table (preact): no rows, no emptyState — an empty <tbody>', () => {
  const html = renderToString(element({ columns, rows: [] }))

  assertStringIncludes(html, '<tbody></tbody>')
})

// --- sortable headers / aria-sort -------------------------------------------------------------

Deno.test('Table (preact): a sortable header carries aria-sort="none" by default', () => {
  const html = renderToString(element({ columns, rows }))

  assertStringIncludes(html, 'aria-sort="none"')
  assertStringIncludes(html, '<button')
})

Deno.test('Table (preact): sort prop matching a column sets aria-sort to ascending/desc', () => {
  const asc = renderToString(element({ columns, rows, sort: { column: 'age', direction: 'asc' } }))
  const desc = renderToString(
    element({ columns, rows, sort: { column: 'age', direction: 'desc' } }),
  )

  assertStringIncludes(asc, 'aria-sort="ascending"')
  assertStringIncludes(desc, 'aria-sort="descending"')
})

// --- getRowHref (Link vs plain content) ---------------------------------------------------------

Deno.test('Table (preact): with getRowHref, only the FIRST column renders as a real <a>', () => {
  const html = renderToString(element({ columns, rows, getRowHref: (row) => `/users/${row.id}` }))

  assertStringIncludes(html, 'href="/users/a"')
  assertEquals((html.match(/<a /g) ?? []).length, 2)
})

// --- real DOM click interactions ----------------------------------------------------------------

Deno.test('Table (preact): uncontrolled — clicking a header toggles asc → desc', () => {
  const calls: TableSort[] = []
  const { container, unmount } = mount({
    columns,
    rows,
    onSortChange: (next) => calls.push(next),
  })
  const ageHeader = thWithText(container, 'Age')
  const button = must(ageHeader.querySelector('button'))

  act(() => button.click())
  assertEquals(calls, [{ column: 'age', direction: 'asc' }])
  assertEquals(ageHeader.getAttribute('aria-sort'), 'ascending')

  act(() => button.click())
  assertEquals(ageHeader.getAttribute('aria-sort'), 'descending')

  unmount()
})

Deno.test('Table (preact): controlled — a click notifies but never self-advances', () => {
  const calls: TableSort[] = []
  const { container, unmount } = mount({
    columns,
    rows,
    sort: null,
    onSortChange: (next) => calls.push(next),
  })
  const ageHeader = thWithText(container, 'Age')
  const button = must(ageHeader.querySelector('button'))

  act(() => button.click())

  assertEquals(calls, [{ column: 'age', direction: 'asc' }])
  assertEquals(ageHeader.getAttribute('aria-sort'), 'none')

  unmount()
})

Deno.test('Table (preact): controlled — updating sort re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount({ columns, rows, sort: null })

  rerender({ columns, rows, sort: { column: 'age', direction: 'desc' } })

  assertEquals(thWithText(container, 'Age').getAttribute('aria-sort'), 'descending')

  unmount()
})

Deno.test('Table (preact): clicking a row Link (getRowHref given) fires onRowClick', () => {
  const calls: Array<[Row, number]> = []
  const { container, unmount } = mount({
    columns,
    rows,
    getRowHref: (row) => `/users/${row.id}`,
    onRowClick: (row, index) => calls.push([row, index]),
  })
  const link = must(container.querySelector<HTMLAnchorElement>('a[href="/users/b"]'))

  act(() => link.click())

  assertEquals(calls, [[rows[1], 1]])

  unmount()
})
