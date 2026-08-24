import { dispatchWindowEvent, must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Select } from 'components/Select/index.preact.ts'
import type { SelectProps } from 'components/Select/index.preact.ts'
import type { SelectOption } from 'components/Select/types.ts'

// Unlike every hookless Preact component in this package, `Select` uses real hooks — built with
// `h(Select, props)` and rendered through Preact's own pipeline. See `counter-preact.test.tsx`'s
// own doc for the same reasoning.

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

function element(props: SelectProps): VNode {
  return h(Select, props) as VNode
}

function mount(props: SelectProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: SelectProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

const SIZES: SelectOption[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium', disabled: true },
  { value: 'large', label: 'Large' },
]

function basicProps(options: SelectOption[] = SIZES): SelectProps {
  return { options, placeholder: 'Choose a size', label: 'Size' }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Select (preact): SSR — trigger shows the placeholder, closed, no listbox', () => {
  const html = renderToString(element(basicProps()))

  assertStringIncludes(html, 'Choose a size')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('role="listbox"'), false)
})

Deno.test('Select (preact): aria-controls cross-references the listbox id', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))

  assertEquals(trigger.getAttribute('aria-controls'), listbox.id)

  unmount()
})

// --- real DOM: opening, selecting -----------------------------------------------------------

Deno.test('Select (preact): clicking the trigger opens the listbox and moves focus onto it', () => {
  const { container, unmount } = mount(basicProps())
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

Deno.test('Select (preact): options render as role=option items with the given labels', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  const options = Array.from(container.querySelectorAll('[role="option"]'))
  assertEquals(options.map((option) => option.textContent), ['Small', 'Medium', 'Large'])

  unmount()
})

Deno.test('Select (preact): clicking an option selects, updates, closes, refocuses', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onValueChange: (v) => values.push(v),
  })
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

Deno.test('Select (preact): a mousedown on an option never closes it before the click', () => {
  const { container, unmount } = mount(basicProps())
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

Deno.test('Select (preact): clicking a disabled option does nothing', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onValueChange: (v) => values.push(v),
  })
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

Deno.test('Select (preact): ArrowDown on the closed trigger opens the listbox', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="select-listbox"]') !== null, true)

  unmount()
})

Deno.test('Select (preact): ArrowDown while open skips a disabled option', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onValueChange: (v) => values.push(v),
  })
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))

  act(() => {
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })

  assertEquals(values, ['large'])

  unmount()
})

Deno.test('Select (preact): with every option disabled, arrow navigation selects nothing', () => {
  const allDisabled: SelectOption[] = [
    { value: 'a', label: 'A', disabled: true },
    { value: 'b', label: 'B', disabled: true },
  ]
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    options: allDisabled,
    placeholder: 'Choose',
    label: 'Size',
    onValueChange: (v) => values.push(v),
  })
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

Deno.test('Select (preact): Enter while open closes it and refocuses the trigger', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))

  act(() => {
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="select-listbox"]'), null)
  assertEquals(document.activeElement, trigger)

  unmount()
})

Deno.test('Select (preact): Escape closes it and refocuses the trigger', () => {
  const { container, unmount } = mount(basicProps())
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

Deno.test('Select (preact): an outside click closes it', () => {
  const { container, unmount } = mount(basicProps())
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

Deno.test('Select (preact): blurring the listbox (e.g. Tab away) closes it', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="select-listbox"]'))

  act(() => {
    listbox.dispatchEvent(new Event('blur'))
  })

  assertEquals(container.querySelector('[data-space-ui="select-listbox"]'), null)

  unmount()
})

// --- positioning -----------------------------------------------------------------------------

Deno.test('Select (preact): the listbox is positioned via the trigger reference rect', () => {
  const { container, unmount } = mount(basicProps())
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

Deno.test('Select (preact): uncontrolled open — onOpenChange fires, still opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onOpenChange: (next) => calls.push(next),
  })
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="select-listbox"]') !== null, true)

  unmount()
})

Deno.test('Select (preact): controlled open — clicking notifies but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    open: false,
    onOpenChange: (next) => calls.push(next),
  })
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="select-listbox"]'), null)

  unmount()
})

Deno.test('Select (preact): controlled value — selects, never mutates the trigger text', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    value: null,
    onValueChange: (v) => values.push(v),
  })
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
  assertEquals(trigger.textContent, 'Choose a size')

  unmount()
})

// --- id/className ----------------------------------------------------------------------------

Deno.test('Select (preact): id/className land on the trigger button', () => {
  const { container, unmount } = mount({
    ...basicProps(),
    id: 'size-select',
    className: 'select-trigger',
  })
  const trigger = must(container.querySelector('button'))
  assertEquals(trigger.id, 'size-select')
  assertEquals(trigger.className, 'select-trigger')

  unmount()
})
