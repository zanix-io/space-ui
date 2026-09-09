import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { DatePicker } from 'components/DatePicker/index.preact.ts'
import type { DatePickerProps } from 'components/DatePicker/index.preact.ts'

// Unlike every hookless Preact component in this package, `DatePicker` uses real hooks — built
// with `h(DatePicker, props)` and rendered through Preact's own pipeline. See
// `select-preact.test.tsx`'s own doc for the same reasoning; this component is `DatePicker`'s own
// closest sibling.

function element(props: DatePickerProps): VNode {
  return h(DatePicker, props) as VNode
}

function mount(props: DatePickerProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: DatePickerProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function openPicker(container: HTMLElement) {
  const trigger = must(container.querySelector('button'))
  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  return trigger
}

function getCell(container: HTMLElement, iso: string): HTMLElement {
  return must(container.querySelector<HTMLElement>(`[data-date="${iso}"]`))
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('DatePicker (preact): SSR — trigger shows the placeholder, closed, no panel', () => {
  const html = renderToString(element({ placeholder: 'Choose a date' }))

  assertStringIncludes(html, 'Choose a date')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('role="grid"'), false)
})

Deno.test('DatePicker (preact): a selected value formats onto the trigger, locale-aware', () => {
  const html = renderToString(element({ value: '2000-01-15', locale: 'en' }))
  assertStringIncludes(html, 'January 15, 2000')
})

Deno.test('DatePicker (preact): icon renders a decorative <use> on the trigger, alongside the text', () => {
  const html = renderToString(
    element({
      placeholder: 'Choose a date',
      icon: { name: 'calendar', href: '/assets/icons/catalog.svg', viewBox: '0 0 512 512' },
    }),
  )

  assertStringIncludes(html, 'Choose a date')
  assertStringIncludes(html, 'href="/assets/icons/catalog.svg#calendar"')
  assertStringIncludes(html, 'aria-hidden="true"')
})

Deno.test('DatePicker (preact): no icon given renders no <use> at all', () => {
  const html = renderToString(element({ placeholder: 'Choose a date' }))
  assertEquals(html.includes('<use'), false)
})

// --- day grid --------------------------------------------------------------------------------

Deno.test('DatePicker (preact): clicking the trigger opens the panel with a day grid', () => {
  const { container, unmount } = mount({ value: '2024-05-10' })
  openPicker(container)

  const grid = must(container.querySelector('[data-space-ui="date-picker-grid"]'))
  assertEquals(grid.getAttribute('role'), 'grid')
  assertStringIncludes(grid.getAttribute('aria-label') ?? '', 'May 2024')

  unmount()
})

Deno.test('DatePicker (preact): clicking a day selects it, closes, and refocuses the trigger', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    value: '2024-05-10',
    onValueChange: (v) => values.push(v),
  })
  const trigger = openPicker(container)
  const cell = getCell(container, '2024-05-15')

  act(() => {
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, ['2024-05-15'])
  assertEquals(container.querySelector('[data-space-ui="date-picker-panel"]'), null)
  assertEquals(document.activeElement, trigger)

  unmount()
})

Deno.test('DatePicker (preact): clicking a disabled (out-of-range) day does nothing', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    value: '2024-05-10',
    min: '2024-05-05',
    max: '2024-05-20',
    onValueChange: (v) => values.push(v),
  })
  openPicker(container)
  const cell = getCell(container, '2024-05-25')
  assertEquals(cell.getAttribute('aria-disabled'), 'true')

  act(() => {
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, [])
  unmount()
})

Deno.test('DatePicker (preact): ArrowRight moves the cursor by one day', () => {
  const { container, unmount } = mount({ value: '2024-05-10' })
  openPicker(container)
  const grid = must(container.querySelector('[data-space-ui="date-picker-grid"]'))

  act(() => {
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  })

  assertEquals(getCell(container, '2024-05-11').tabIndex, 0)
  unmount()
})

Deno.test('DatePicker (preact): Escape closes the panel and refocuses the trigger', () => {
  const { container, unmount } = mount({ value: '2024-05-10' })
  const trigger = openPicker(container)
  const panel = must(container.querySelector('[data-space-ui="date-picker-panel"]'))

  act(() => {
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="date-picker-panel"]'), null)
  assertEquals(document.activeElement, trigger)

  unmount()
})

Deno.test('DatePicker (preact): an outside click closes it', () => {
  const { container, unmount } = mount({ value: '2024-05-10' })
  openPicker(container)
  assertEquals(container.querySelector('[data-space-ui="date-picker-panel"]') !== null, true)

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="date-picker-panel"]'), null)
  unmount()
})

// --- year navigation (the core requirement) --------------------------------------------------

Deno.test('DatePicker (preact): clicking the year switches to a 12-per-page year grid', () => {
  const { container, unmount } = mount({ value: '2024-05-10' })
  openPicker(container)

  const yearButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '2024'),
  )
  act(() => {
    yearButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  const years = container.querySelectorAll('[data-space-ui="date-picker-year"]')
  assertEquals(years.length, 12)

  unmount()
})

Deno.test('DatePicker (preact): picking a year returns to the day view for that year, same month', () => {
  const { container, unmount } = mount({ value: '2024-05-10' })
  openPicker(container)

  const yearButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '2024'),
  )
  act(() => {
    yearButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const targetYear = must(
    Array.from(container.querySelectorAll('[data-space-ui="date-picker-year"]')).find((b) =>
      b.textContent === '2020'
    ),
  )
  act(() => {
    targetYear.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  const grid = must(container.querySelector('[data-space-ui="date-picker-grid"]'))
  assertStringIncludes(grid.getAttribute('aria-label') ?? '', 'May 2020')

  unmount()
})

// --- withTime ----------------------------------------------------------------------------------

Deno.test('DatePicker (preact): withTime — picking a day does NOT close the popup, keeps the time', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    withTime: true,
    value: '2024-05-10T09:30',
    onValueChange: (v) => values.push(v),
  })
  openPicker(container)
  const cell = getCell(container, '2024-05-15')

  act(() => {
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, ['2024-05-15T09:30'])
  assertEquals(container.querySelector('[data-space-ui="date-picker-panel"]') !== null, true)

  unmount()
})

Deno.test('DatePicker (preact): withTime — ArrowUp on the minute spinbutton wraps 59 → 0', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    withTime: true,
    value: '2024-05-10T09:59',
    onValueChange: (v) => values.push(v),
  })
  openPicker(container)
  const minute = must(container.querySelector('[aria-label="Minute"]'))

  act(() => {
    minute.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  })

  assertEquals(values, ['2024-05-10T09:00'])
  unmount()
})

Deno.test('DatePicker (preact): withTime — "Done" closes and refocuses the trigger', () => {
  const { container, unmount } = mount({ withTime: true, value: '2024-05-10T09:30' })
  const trigger = openPicker(container)

  const doneButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Done'),
  )
  act(() => {
    doneButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="date-picker-panel"]'), null)
  assertEquals(document.activeElement, trigger)

  unmount()
})

// --- id/className ------------------------------------------------------------------------------

Deno.test('DatePicker (preact): id/className land on the trigger button', () => {
  const { container, unmount } = mount({
    placeholder: 'Choose',
    id: 'dob',
    className: 'date-trigger',
  })
  const trigger = must(container.querySelector('button'))
  assertEquals(trigger.id, 'dob')
  assertEquals(trigger.className, 'date-trigger')

  unmount()
})
