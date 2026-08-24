import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Table } from 'components/Table/index.ts'
import type { TableColumn, TableSort } from 'components/Table/index.ts'

type Row = { id: string; name: string; age: number }

const rows: Row[] = [
  { id: 'a', name: 'Ada', age: 30 },
  { id: 'b', name: 'Bo', age: 25 },
]

const columns: TableColumn<Row>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'age', header: 'Age', cell: (row) => String(row.age), sortable: true },
]

function mount(element: ReturnType<typeof Table<Row>>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Table<Row>>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

function thWithText(container: HTMLElement, text: string) {
  return must(
    Array.from(container.querySelectorAll('th')).find((th) => th.textContent === text),
  )
}

// --- structure -----------------------------------------------------------------------------

Deno.test('Table: no columns renders nothing at all', () => {
  assertEquals(renderToStaticMarkup(<Table columns={[]} rows={rows} />), '')
})

Deno.test('Table: role/structure — a real <table> with data-space-ui, thead/tbody', () => {
  const html = renderToStaticMarkup(<Table columns={columns} rows={rows} />)

  assertStringIncludes(html, '<table')
  assertStringIncludes(html, 'data-space-ui="table"')
  assertStringIncludes(html, '<thead')
  assertStringIncludes(html, '<tbody')
})

Deno.test('Table: rowKey, when given, derives each row key instead of the row index', () => {
  const calls: Array<[Row, number]> = []
  const html = renderToStaticMarkup(
    <Table
      columns={columns}
      rows={rows}
      rowKey={(row, index) => {
        calls.push([row, index])
        return row.id
      }}
    />,
  )

  assertEquals(calls, [[rows[0], 0], [rows[1], 1]])
  // Still renders every row's own data — `rowKey` only affects reconciliation, never content.
  assertStringIncludes(html, 'Ada')
  assertStringIncludes(html, 'Bo')
})

Deno.test('Table: id/className land on the <table>', () => {
  const html = renderToStaticMarkup(
    <Table columns={columns} rows={rows} id='users-table' className='grid' />,
  )

  assertStringIncludes(html, 'id="users-table"')
  assertStringIncludes(html, 'class="grid"')
})

Deno.test('Table: caption renders as a real <caption>', () => {
  const html = renderToStaticMarkup(<Table columns={columns} rows={rows} caption='Users' />)

  assertStringIncludes(html, '<caption>Users</caption>')
})

Deno.test('Table: no caption given renders no <caption> at all', () => {
  const html = renderToStaticMarkup(<Table columns={columns} rows={rows} />)

  assertEquals(html.includes('<caption'), false)
})

Deno.test('Table: each cell renders via its own column.cell(row)', () => {
  const html = renderToStaticMarkup(<Table columns={columns} rows={rows} />)

  assertStringIncludes(html, '<td>Ada</td>')
  assertStringIncludes(html, '<td>30</td>')
  assertStringIncludes(html, '<td>Bo</td>')
  assertStringIncludes(html, '<td>25</td>')
})

// --- empty state ------------------------------------------------------------------------------

Deno.test('Table: no rows, with emptyState — one row spanning every column', () => {
  const html = renderToStaticMarkup(
    <Table columns={columns} rows={[]} emptyState='Nothing here' />,
  )

  assertStringIncludes(html, 'colSpan="2"')
  assertStringIncludes(html, 'Nothing here')
})

Deno.test('Table: no rows, no emptyState — an empty <tbody>, header row still renders', () => {
  const html = renderToStaticMarkup(<Table columns={columns} rows={[]} />)

  assertStringIncludes(html, '<thead')
  assertStringIncludes(html, '<tbody></tbody>')
})

// --- sortable headers / aria-sort -------------------------------------------------------------

Deno.test('Table: a non-sortable column header carries no aria-sort and no <button>', () => {
  const html = renderToStaticMarkup(<Table columns={columns} rows={rows} />)
  const nameHeaderMatch = must(html.match(/<th[^>]*>Name<\/th>/))

  assertEquals(nameHeaderMatch[0].includes('aria-sort'), false)
  assertEquals(nameHeaderMatch[0].includes('<button'), false)
})

Deno.test('Table: a sortable header carries aria-sort="none" by default, wraps a <button>', () => {
  const html = renderToStaticMarkup(<Table columns={columns} rows={rows} />)

  assertStringIncludes(html, 'aria-sort="none"')
  assertStringIncludes(html, '<button')
})

Deno.test('Table: sort prop matching a column sets aria-sort to ascending/descending', () => {
  const asc = renderToStaticMarkup(
    <Table columns={columns} rows={rows} sort={{ column: 'age', direction: 'asc' }} />,
  )
  const desc = renderToStaticMarkup(
    <Table columns={columns} rows={rows} sort={{ column: 'age', direction: 'desc' }} />,
  )

  assertStringIncludes(asc, 'aria-sort="ascending"')
  assertStringIncludes(desc, 'aria-sort="descending"')
})

// --- getRowHref (Link vs plain content) ---------------------------------------------------------

Deno.test('Table: without getRowHref, no cell renders as a link', () => {
  const html = renderToStaticMarkup(<Table columns={columns} rows={rows} />)

  assertEquals(html.includes('<a '), false)
})

Deno.test('Table: with getRowHref, only the FIRST column of a row renders as a real <a>', () => {
  const html = renderToStaticMarkup(
    <Table columns={columns} rows={rows} getRowHref={(row) => `/users/${row.id}`} />,
  )

  assertStringIncludes(html, 'href="/users/a"')
  assertStringIncludes(html, 'href="/users/b"')
  assertEquals((html.match(/<a /g) ?? []).length, 2)
})

// --- sort precedence, real DOM click interactions ------------------------------------------------

Deno.test('Table: sort takes precedence over defaultSort when both are given', () => {
  const html = renderToStaticMarkup(
    <Table
      columns={columns}
      rows={rows}
      sort={{ column: 'age', direction: 'desc' }}
      defaultSort={{ column: 'age', direction: 'asc' }}
    />,
  )

  assertStringIncludes(html, 'aria-sort="descending"')
})

Deno.test('Table: uncontrolled — clicking a header toggles asc → desc, notifies', () => {
  const calls: TableSort[] = []
  const { container, unmount } = mount(
    <Table columns={columns} rows={rows} onSortChange={(next) => calls.push(next)} />,
  )
  const ageHeader = thWithText(container, 'Age')
  const button = must(ageHeader.querySelector('button'))

  act(() => button.click())
  assertEquals(calls, [{ column: 'age', direction: 'asc' }])
  assertEquals(ageHeader.getAttribute('aria-sort'), 'ascending')

  act(() => button.click())
  assertEquals(calls, [{ column: 'age', direction: 'asc' }, { column: 'age', direction: 'desc' }])
  assertEquals(ageHeader.getAttribute('aria-sort'), 'descending')

  unmount()
})

Deno.test('Table: controlled — a click notifies onSortChange but never self-advances', () => {
  const calls: TableSort[] = []
  const { container, unmount } = mount(
    <Table
      columns={columns}
      rows={rows}
      sort={null}
      onSortChange={(next) => calls.push(next)}
    />,
  )
  const ageHeader = thWithText(container, 'Age')
  const button = must(ageHeader.querySelector('button'))

  act(() => button.click())

  assertEquals(calls, [{ column: 'age', direction: 'asc' }])
  assertEquals(ageHeader.getAttribute('aria-sort'), 'none')

  unmount()
})

Deno.test('Table: controlled — updating sort from outside re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount(
    <Table columns={columns} rows={rows} sort={null} />,
  )

  rerender(<Table columns={columns} rows={rows} sort={{ column: 'age', direction: 'desc' }} />)

  assertEquals(thWithText(container, 'Age').getAttribute('aria-sort'), 'descending')

  unmount()
})

Deno.test('Table: clicking a row Link (getRowHref given) fires onRowClick', () => {
  const calls: Array<[Row, number]> = []
  const { container, unmount } = mount(
    <Table
      columns={columns}
      rows={rows}
      getRowHref={(row) => `/users/${row.id}`}
      onRowClick={(row, index) => calls.push([row, index])}
    />,
  )
  const link = must(container.querySelector<HTMLAnchorElement>('a[href="/users/b"]'))

  act(() => link.click())

  assertEquals(calls, [[rows[1], 1]])

  unmount()
})

Deno.test('Table: no getRowHref — nothing for onRowClick to attach to, no <a> at all', () => {
  const calls: unknown[] = []
  const { container, unmount } = mount(
    <Table columns={columns} rows={rows} onRowClick={() => calls.push(true)} />,
  )

  assertEquals(container.querySelectorAll('a').length, 0)

  unmount()
})
