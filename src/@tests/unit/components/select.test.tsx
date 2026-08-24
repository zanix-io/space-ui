import { dispatchWindowEvent, must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Select } from 'components/Select/index.ts'
import type { SelectOption } from 'components/Select/types.ts'

function stubRect(el: Element, rect: { x: number; y: number; width: number; height: number }) {
  el.getBoundingClientRect = () => ({
    ...rect,
    top: rect.y,
    left: rect.x,
    right: 0,
    bottom: 0,
    toJSON() {},
  })
}

function mount(element: ReturnType<typeof Select>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Select>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

const SIZES: SelectOption[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium', disabled: true },
  { value: 'large', label: 'Large' },
]

function basicSelect(options: SelectOption[] = SIZES) {
  return <Select options={options} placeholder='Choose a size' label='Size' />
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Select: SSR — trigger shows the placeholder, closed, no listbox', () => {
  const html = renderToStaticMarkup(basicSelect())

  assertStringIncludes(html, 'Choose a size')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('role="listbox"'), false)
})

Deno.test('Select: no placeholder and nothing selected — trigger has no visible text', () => {
  const html = renderToStaticMarkup(<Select options={SIZES} label='Size' />)

  assertStringIncludes(html, '<button')
  assertStringIncludes(html, 'aria-label="Size"')
  assertStringIncludes(html, '></button>')
})

Deno.test('Select: an empty options array never crashes — opens with zero options rendered', () => {
  const { container, unmount } = mount(<Select options={[]} placeholder='Choose' label='Size' />)
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  assertEquals(container.querySelector('[data-space-ui="select-listbox"]') !== null, true)
  assertEquals(container.querySelectorAll('[role="option"]').length, 0)

  // A second ArrowDown, now that it's open, exercises `nextEnabledIndexFor` with zero options —
  // never throws, never selects anything.
  act(() => {
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  assertEquals(trigger.getAttribute('aria-activedescendant'), null)

  unmount()
})

Deno.test('Select: a key with no navigation meaning, while open, changes nothing', () => {
  const { container, unmount } = mount(basicSelect())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  const activeBefore = trigger.getAttribute('aria-activedescendant')

  act(() => {
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
  })

  assertEquals(trigger.getAttribute('aria-activedescendant'), activeBefore)

  unmount()
})

Deno.test('Select: aria-controls on the trigger cross-references the listbox id', () => {
  const { container, unmount } = mount(basicSelect())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))

  assertEquals(trigger.getAttribute('aria-controls'), listbox.id)

  unmount()
})

// --- real DOM: opening, selecting -----------------------------------------------------------

Deno.test('Select: clicking the trigger opens the listbox and moves focus onto it', () => {
  const { container, unmount } = mount(basicSelect())
  const trigger = must(container.querySelector('button'))

  assertEquals(container.querySelector('[data-space-ui="select-listbox"]'), null)

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))
  assertEquals(trigger.getAttribute('aria-expanded'), 'true')
  assertEquals(document.activeElement, listbox)

  unmount()
})

Deno.test('Select: options render as role=option items with the given labels', () => {
  const { container, unmount } = mount(basicSelect())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  const options = Array.from(container.querySelectorAll('[role="option"]'))
  assertEquals(options.map((option) => option.textContent), ['Small', 'Medium', 'Large'])

  unmount()
})

Deno.test('Select: clicking an option selects, updates, closes, and refocuses', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <Select
      options={SIZES}
      placeholder='Choose'
      label='Size'
      onValueChange={(v) => values.push(v)}
    />,
  )
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const largeOption = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'Large'
    ),
  )

  act(() => {
    largeOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    largeOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, ['large'])
  assertEquals(trigger.textContent, 'Large')
  assertEquals(container.querySelector('[data-space-ui="select-listbox"]'), null)
  assertEquals(document.activeElement, trigger)

  unmount()
})

Deno.test('Select: a mousedown on an option never blurs/closes it before the click lands', () => {
  const { container, unmount } = mount(basicSelect())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const smallOption = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'Small'
    ),
  )

  act(() => {
    smallOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="select-listbox"]') !== null, true)

  unmount()
})

Deno.test('Select: clicking a disabled option does nothing', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <Select
      options={SIZES}
      placeholder='Choose'
      label='Size'
      onValueChange={(v) => values.push(v)}
    />,
  )
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const mediumOption = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'Medium'
    ),
  )
  assertEquals(mediumOption.getAttribute('aria-disabled'), 'true')

  act(() => {
    mediumOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    mediumOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, [])
  assertEquals(container.querySelector('[data-space-ui="select-listbox"]') !== null, true)

  unmount()
})

// --- keyboard navigation ---------------------------------------------------------------------

Deno.test('Select: ArrowDown on the closed trigger opens the listbox', () => {
  const { container, unmount } = mount(basicSelect())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="select-listbox"]') !== null, true)

  unmount()
})

Deno.test('Select: ArrowDown while open skips disabled, selects the next enabled option', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <Select
      options={SIZES}
      placeholder='Choose'
      label='Size'
      onValueChange={(v) => values.push(v)}
    />,
  )
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))

  act(() => {
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })

  // From `small` (index 0), ArrowDown must skip disabled `medium` (index 1) and land on `large`.
  assertEquals(values, ['large'])

  unmount()
})

Deno.test('Select: ArrowUp from the first option wraps to the last, skipping disabled ones', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <Select
      options={SIZES}
      placeholder='Choose'
      label='Size'
      onValueChange={(v) => values.push(v)}
    />,
  )
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))

  act(() => {
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  })

  assertEquals(values, ['large'])

  unmount()
})

Deno.test('Select: with every option disabled, arrow navigation selects nothing', () => {
  const allDisabled: SelectOption[] = [
    { value: 'a', label: 'A', disabled: true },
    { value: 'b', label: 'B', disabled: true },
  ]
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <Select
      options={allDisabled}
      placeholder='Choose'
      label='Size'
      onValueChange={(v) => values.push(v)}
    />,
  )
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))

  act(() => {
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })

  assertEquals(values, [])

  unmount()
})

Deno.test('Select: Enter while open closes, refocuses the trigger, value unchanged', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <Select
      options={SIZES}
      placeholder='Choose'
      label='Size'
      onValueChange={(v) => values.push(v)}
    />,
  )
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))

  act(() => {
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })

  assertEquals(values, [])
  assertEquals(container.querySelector('[data-space-ui="select-listbox"]'), null)
  assertEquals(document.activeElement, trigger)

  unmount()
})

Deno.test('Select: Escape closes it and refocuses the trigger', () => {
  const { container, unmount } = mount(basicSelect())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))

  act(() => {
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="select-listbox"]'), null)
  assertEquals(document.activeElement, trigger)

  unmount()
})

// --- closing: outside click, blur -------------------------------------------------------------

Deno.test('Select: an outside click closes it', () => {
  const { container, unmount } = mount(basicSelect())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  assertEquals(container.querySelector('[data-space-ui="select-listbox"]') !== null, true)

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="select-listbox"]'), null)

  unmount()
})

Deno.test('Select: blurring the listbox (e.g. Tab away) closes it', () => {
  const { container, unmount } = mount(basicSelect())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))

  act(() => {
    listbox.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="select-listbox"]'), null)

  unmount()
})

// --- positioning -----------------------------------------------------------------------------

Deno.test('Select: the listbox is positioned via the trigger reference rect', () => {
  const { container, unmount } = mount(basicSelect())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 20, y: 40, width: 200, height: 30 })

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector<HTMLElement>('[data-space-ui="select-listbox"]'))
  stubRect(listbox, { x: 0, y: 0, width: 200, height: 90 })

  act(() => dispatchWindowEvent(new Event('resize')))

  assertEquals(listbox.style.position, 'fixed')
  assertStringIncludes(listbox.style.transform, 'translate(')

  unmount()
})

// --- controlled / uncontrolled -----------------------------------------------------------------

Deno.test('Select: uncontrolled open — onOpenChange fires, still opens itself', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Select
      options={SIZES}
      placeholder='Choose'
      label='Size'
      onOpenChange={(next) => calls.push(next)}
    />,
  )
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="select-listbox"]') !== null, true)

  unmount()
})

Deno.test('Select: controlled open — clicking notifies but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Select
      options={SIZES}
      placeholder='Choose'
      label='Size'
      open={false}
      onOpenChange={(next) => calls.push(next)}
    />,
  )
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="select-listbox"]'), null)

  unmount()
})

Deno.test('Select: controlled value — a selection notifies, never mutates the trigger text', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <Select
      options={SIZES}
      placeholder='Choose'
      label='Size'
      value={null}
      onValueChange={(v) => values.push(v)}
    />,
  )
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const smallOption = must(container.querySelector('[role="option"]'))

  act(() => {
    smallOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    smallOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, ['small'])
  // Controlled `value={null}` was held at its original value — the component never self-mutated
  // despite notifying.
  assertEquals(trigger.textContent, 'Choose')

  unmount()
})

// --- id/className ----------------------------------------------------------------------------

Deno.test('Select: id/className land on the trigger button', () => {
  const { container, unmount } = mount(
    <Select
      options={SIZES}
      placeholder='Choose'
      label='Size'
      id='size-select'
      className='select-trigger'
    />,
  )
  const trigger = must(container.querySelector('button'))
  assertEquals(trigger.id, 'size-select')
  assertEquals(trigger.className, 'select-trigger')

  unmount()
})
