import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { DatePicker } from 'components/DatePicker/index.ts'

function mount(element: ReturnType<typeof DatePicker>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof DatePicker>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
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

Deno.test('DatePicker: SSR — trigger shows the placeholder, closed, no panel', () => {
  const html = renderToStaticMarkup(<DatePicker placeholder='Choose a date' />)

  assertStringIncludes(html, 'Choose a date')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('role="grid"'), false)
})

Deno.test('DatePicker: a selected value formats onto the trigger, locale-aware', () => {
  const html = renderToStaticMarkup(<DatePicker value='2000-01-15' locale='en' />)
  assertStringIncludes(html, 'January 15, 2000')
})

Deno.test('DatePicker: clicking the trigger opens the panel with a day grid', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  const trigger = openPicker(container)

  assertEquals(trigger.getAttribute('aria-expanded'), 'true')
  const grid = must(container.querySelector('[data-space-ui="date-picker-grid"]'))
  assertEquals(grid.getAttribute('role'), 'grid')
  assertStringIncludes(grid.getAttribute('aria-label') ?? '', 'May 2024')

  unmount()
})

// --- selecting a day -------------------------------------------------------------------------

Deno.test('DatePicker: clicking a day selects it, closes, and refocuses the trigger', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <DatePicker value='2024-05-10' onValueChange={(v) => values.push(v)} />,
  )
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

Deno.test('DatePicker: clicking a disabled (out-of-range) day does nothing', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <DatePicker
      value='2024-05-10'
      min='2024-05-05'
      max='2024-05-20'
      onValueChange={(v) => values.push(v)}
    />,
  )
  openPicker(container)
  const cell = getCell(container, '2024-05-25')
  assertEquals(cell.getAttribute('aria-disabled'), 'true')

  act(() => {
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, [])
  assertEquals(container.querySelector('[data-space-ui="date-picker-panel"]') !== null, true)

  unmount()
})

Deno.test('DatePicker: the selected day carries aria-selected', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  openPicker(container)

  assertEquals(getCell(container, '2024-05-10').getAttribute('aria-selected'), 'true')
  assertEquals(getCell(container, '2024-05-11').getAttribute('aria-selected'), 'false')

  unmount()
})

// --- keyboard: day grid ----------------------------------------------------------------------

Deno.test('DatePicker: ArrowRight/ArrowLeft moves the cursor by one day', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  openPicker(container)
  const grid = must(container.querySelector('[data-space-ui="date-picker-grid"]'))

  act(() => {
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  })
  assertEquals(getCell(container, '2024-05-11').tabIndex, 0)
  assertEquals(getCell(container, '2024-05-10').tabIndex, -1)

  act(() => {
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
  })
  assertEquals(getCell(container, '2024-05-10').tabIndex, 0)

  unmount()
})

Deno.test('DatePicker: ArrowUp/ArrowDown moves the cursor by one week', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  openPicker(container)
  const grid = must(container.querySelector('[data-space-ui="date-picker-grid"]'))

  act(() => {
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  assertEquals(getCell(container, '2024-05-17').tabIndex, 0)

  unmount()
})

Deno.test('DatePicker: PageUp/PageDown moves the cursor by one month, clamping the day', () => {
  const { container, unmount } = mount(<DatePicker value='2024-01-31' />)
  openPicker(container)
  const grid = must(container.querySelector('[data-space-ui="date-picker-grid"]'))

  act(() => {
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }))
  })
  // January 31 + 1 month clamps to February 29 (2024 is a leap year).
  assertStringIncludes(grid.getAttribute('aria-label') ?? '', 'February 2024')
  assertEquals(getCell(container, '2024-02-29').tabIndex, 0)

  unmount()
})

Deno.test('DatePicker: Shift+PageUp/PageDown moves the cursor by one year', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  openPicker(container)
  const grid = must(container.querySelector('[data-space-ui="date-picker-grid"]'))

  act(() => {
    grid.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'PageDown', shiftKey: true, bubbles: true }),
    )
  })
  assertStringIncludes(grid.getAttribute('aria-label') ?? '', 'May 2025')

  unmount()
})

Deno.test('DatePicker: Enter commits the focused (cursor) day', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <DatePicker value='2024-05-10' onValueChange={(v) => values.push(v)} />,
  )
  const trigger = openPicker(container)
  const grid = must(container.querySelector('[data-space-ui="date-picker-grid"]'))

  act(() => {
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  })
  act(() => {
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })

  assertEquals(values, ['2024-05-11'])
  assertEquals(document.activeElement, trigger)

  unmount()
})

Deno.test('DatePicker: Escape closes the panel and refocuses the trigger', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  const trigger = openPicker(container)
  const panel = must(container.querySelector('[data-space-ui="date-picker-panel"]'))

  act(() => {
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="date-picker-panel"]'), null)
  assertEquals(document.activeElement, trigger)

  unmount()
})

// --- year navigation (the core requirement) --------------------------------------------------

Deno.test('DatePicker: clicking the year switches to a 12-per-page year grid', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  openPicker(container)

  const yearButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '2024'),
  )
  act(() => {
    yearButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  const yearGrid = must(container.querySelector('[data-space-ui="date-picker-year-grid"]'))
  const years = Array.from(yearGrid.querySelectorAll('[data-space-ui="date-picker-year"]')).map(
    (el) => el.textContent,
  )
  assertEquals(years.length, 12)
  assertEquals(years.includes('2024'), true)

  unmount()
})

Deno.test('DatePicker: picking a year returns to the day view for that year, same month', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  openPicker(container)

  const yearButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '2024'),
  )
  act(() => {
    yearButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  // 2024's default page is 2016-2027 (fixed 12-year boundaries) — 2020 is on it.
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

Deno.test('DatePicker: year page paging moves by fixed 12-year boundaries', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  openPicker(container)
  const yearButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === '2024'),
  )
  act(() => {
    yearButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  const nextPage = must(
    Array.from(container.querySelectorAll('button')).find((b) =>
      b.getAttribute('aria-label') === 'Next years'
    ),
  )
  act(() => {
    nextPage.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  const years = Array.from(container.querySelectorAll('[data-space-ui="date-picker-year"]')).map(
    (el) => el.textContent,
  )
  assertEquals(years[0], '2028')

  unmount()
})

// --- month navigation ------------------------------------------------------------------------

Deno.test('DatePicker: clicking the month name switches to a 12-month grid; picking one returns to days', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  openPicker(container)

  const monthButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'May'),
  )
  act(() => {
    monthButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const monthGrid = must(container.querySelector('[data-space-ui="date-picker-month-grid"]'))
  const januaryButton = must(
    Array.from(monthGrid.querySelectorAll('button')).find((b) => b.textContent === 'January'),
  )
  act(() => {
    januaryButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  const grid = must(container.querySelector('[data-space-ui="date-picker-grid"]'))
  assertStringIncludes(grid.getAttribute('aria-label') ?? '', 'January 2024')

  unmount()
})

// --- withTime ----------------------------------------------------------------------------------

Deno.test('DatePicker: withTime — picking a day does NOT close the popup', () => {
  const { container, unmount } = mount(<DatePicker withTime value='2024-05-10T09:30' />)
  openPicker(container)
  const cell = getCell(container, '2024-05-15')

  act(() => {
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="date-picker-panel"]') !== null, true)

  unmount()
})

Deno.test('DatePicker: withTime — picking a day keeps the previously-set time', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <DatePicker withTime value='2024-05-10T09:30' onValueChange={(v) => values.push(v)} />,
  )
  openPicker(container)
  const cell = getCell(container, '2024-05-15')

  act(() => {
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, ['2024-05-15T09:30'])

  unmount()
})

Deno.test('DatePicker: withTime — the hour spinbutton is disabled until a day is selected', () => {
  const { container, unmount } = mount(<DatePicker withTime placeholder='Pick' />)
  openPicker(container)

  const hour = must(container.querySelector('[aria-label="Hour"]'))
  assertEquals(hour.getAttribute('aria-disabled'), 'true')
  assertEquals(hour.getAttribute('tabindex'), '-1')

  unmount()
})

Deno.test('DatePicker: withTime — ArrowUp on the hour spinbutton increments and commits', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <DatePicker withTime value='2024-05-10T09:30' onValueChange={(v) => values.push(v)} />,
  )
  openPicker(container)
  const hour = must(container.querySelector('[aria-label="Hour"]'))

  act(() => {
    hour.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  })

  assertEquals(values, ['2024-05-10T10:30'])

  unmount()
})

Deno.test('DatePicker: withTime — the hour spinbutton wraps from 23 to 0', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <DatePicker withTime value='2024-05-10T23:30' onValueChange={(v) => values.push(v)} />,
  )
  openPicker(container)
  const hour = must(container.querySelector('[aria-label="Hour"]'))

  act(() => {
    hour.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  })

  assertEquals(values, ['2024-05-10T00:30'])

  unmount()
})

Deno.test('DatePicker: withTime — the "Done" button closes and refocuses the trigger', () => {
  const { container, unmount } = mount(<DatePicker withTime value='2024-05-10T09:30' />)
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

Deno.test('DatePicker: without withTime, the trigger formats date-only, no time', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  const trigger = must(container.querySelector('button'))
  assertEquals(trigger.textContent, 'May 10, 2024')
  unmount()
})

// --- controlled / uncontrolled -----------------------------------------------------------------

Deno.test('DatePicker: controlled value — a selection notifies, never mutates the trigger text', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <DatePicker
      value={null}
      defaultOpen
      placeholder='Choose'
      onValueChange={(v) => values.push(v)}
    />,
  )
  const trigger = must(container.querySelector('button'))
  const cell = getCell(container, formatToday())

  act(() => {
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values.length, 1)
  // Controlled `value={null}` was held at its original value — the component never self-mutated
  // despite notifying.
  assertEquals(trigger.textContent, 'Choose')

  unmount()
})

function formatToday(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

Deno.test('DatePicker: uncontrolled — self-manages value across renders', () => {
  const { container, unmount } = mount(<DatePicker defaultValue='2024-05-10' />)
  const trigger = openPicker(container)
  const cell = getCell(container, '2024-05-20')

  act(() => {
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertStringIncludes(trigger.textContent ?? '', 'May 20, 2024')

  unmount()
})

// --- outside click / id / className -------------------------------------------------------------

Deno.test('DatePicker: an outside click closes it', () => {
  const { container, unmount } = mount(<DatePicker value='2024-05-10' />)
  openPicker(container)
  assertEquals(container.querySelector('[data-space-ui="date-picker-panel"]') !== null, true)

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="date-picker-panel"]'), null)

  unmount()
})

Deno.test('DatePicker: id/className land on the trigger button', () => {
  const { container, unmount } = mount(
    <DatePicker placeholder='Choose' id='dob' className='date-trigger' />,
  )
  const trigger = must(container.querySelector('button'))
  assertEquals(trigger.id, 'dob')
  assertEquals(trigger.className, 'date-trigger')

  unmount()
})

Deno.test('DatePicker: SSR with defaultOpen and no value never crashes, renders a grid', () => {
  const html = renderToStaticMarkup(<DatePicker defaultOpen placeholder='Choose' />)
  assertStringIncludes(html, 'role="grid"')
})
