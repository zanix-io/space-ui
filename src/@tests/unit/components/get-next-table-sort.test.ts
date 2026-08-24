import { assertEquals } from '@std/assert'
import { getNextTableSort } from 'components/Table/get-next-table-sort.ts'

Deno.test('getNextTableSort: no current sort — activates the clicked column at asc', () => {
  assertEquals(getNextTableSort(undefined, 'name'), { column: 'name', direction: 'asc' })
  assertEquals(getNextTableSort(null, 'name'), { column: 'name', direction: 'asc' })
})

Deno.test('getNextTableSort: a different column is sorted — clicked column starts at asc', () => {
  assertEquals(
    getNextTableSort({ column: 'name', direction: 'desc' }, 'age'),
    { column: 'age', direction: 'asc' },
  )
})

Deno.test('getNextTableSort: the same column is currently asc — toggles to desc', () => {
  assertEquals(
    getNextTableSort({ column: 'name', direction: 'asc' }, 'name'),
    { column: 'name', direction: 'desc' },
  )
})

Deno.test('getNextTableSort: the same column is currently desc — toggles back to asc', () => {
  assertEquals(
    getNextTableSort({ column: 'name', direction: 'desc' }, 'name'),
    { column: 'name', direction: 'asc' },
  )
})
