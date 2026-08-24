import { must } from '../../unit/components/dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { assertEquals } from '@std/assert'
import { Table } from 'components/Table/index.ts'
import type { TableColumn } from 'components/Table/index.ts'

/**
 * Real cross-component coordination: `Table`'s own `sort` state coordinates ALL of its sortable
 * `<th>` headers at once — clicking column A's real `Button` changes `aria-sort` on a DIFFERENT
 * `<th>` (column B, previously the active sort), structurally identical to `Pagination`'s own
 * confirmed "clicking page N changes `aria-current` on a different page's `Button`" case (see
 * `pagination.test.tsx`'s own doc) and `Menu`/`Accordion`'s confirmed sibling-coordination cases.
 *
 * `Table`'s other tests (structure, `aria-sort` on a SINGLE header, `getRowHref`/`onRowClick`,
 * empty state, controlled/uncontrolled) stay in `unit/components/table.test.tsx` — they exercise
 * one control/instance, no real cross-instance interaction.
 */

type Row = { id: string; name: string; age: number }

const rows: Row[] = [{ id: 'a', name: 'Ada', age: 30 }]

const columns: TableColumn<Row>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name, sortable: true },
  { key: 'age', header: 'Age', cell: (row) => String(row.age), sortable: true },
]

function mount(element: ReturnType<typeof Table<Row>>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return { container, unmount: () => act(() => root.unmount()) }
}

function thWithText(container: HTMLElement, text: string) {
  return must(
    Array.from(container.querySelectorAll('th')).find((th) => th.textContent === text),
  )
}

Deno.test('Table: clicking a different sortable header deactivates the prior one', () => {
  const { container, unmount } = mount(
    <Table columns={columns} rows={rows} defaultSort={{ column: 'name', direction: 'asc' }} />,
  )
  const nameHeader = thWithText(container, 'Name')
  const ageHeader = thWithText(container, 'Age')
  assertEquals(nameHeader.getAttribute('aria-sort'), 'ascending')
  assertEquals(ageHeader.getAttribute('aria-sort'), 'none')

  const ageButton = must(ageHeader.querySelector('button'))
  act(() => ageButton.click())

  assertEquals(ageHeader.getAttribute('aria-sort'), 'ascending')
  assertEquals(nameHeader.getAttribute('aria-sort'), 'none')

  unmount()
})
