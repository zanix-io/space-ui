import { must } from '../../unit/components/dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { assertEquals } from '@std/assert'
import { Table } from 'components/Table/index.preact.ts'
import type { TableColumn, TableProps } from 'components/Table/index.preact.ts'

/** Preact mirror of `integration/components/table.test.tsx` — see that file's own doc for why
 * this real cross-header coordination belongs here, not `unit/`. */

type Row = { id: string; name: string; age: number }

const rows: Row[] = [{ id: 'a', name: 'Ada', age: 30 }]

const columns: TableColumn<Row>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name, sortable: true },
  { key: 'age', header: 'Age', cell: (row) => String(row.age), sortable: true },
]

// `Table` is generic over `Row` — Preact's own `h<P>` overload can't infer a concrete `P` from a
// generic function component's type alone, so this narrows it to the one concrete `Row` this test
// file uses before calling `h`, the same shape a caller of a generic component always needs.
const TableForRow = Table as (props: TableProps<Row>) => VNode | null

function mount(props: TableProps<Row>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(h(TableForRow, props) as VNode, container))
  return { container, unmount: () => act(() => renderDOM(null, container)) }
}

function thWithText(container: HTMLElement, text: string) {
  return must(
    Array.from(container.querySelectorAll('th')).find((th) => th.textContent === text),
  )
}

Deno.test('Table (preact): clicking a different header deactivates the prior one', () => {
  const { container, unmount } = mount({
    columns,
    rows,
    defaultSort: { column: 'name', direction: 'asc' },
  })
  const nameHeader = thWithText(container, 'Name')
  const ageHeader = thWithText(container, 'Age')
  assertEquals(nameHeader.getAttribute('aria-sort'), 'ascending')

  const ageButton = must(ageHeader.querySelector('button'))
  act(() => ageButton.click())

  assertEquals(ageHeader.getAttribute('aria-sort'), 'ascending')
  assertEquals(nameHeader.getAttribute('aria-sort'), 'none')

  unmount()
})
