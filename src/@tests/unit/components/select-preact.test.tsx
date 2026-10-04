import { dispatchWindowEvent, getDynamicRule, must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Select } from 'components/Select/index.preact.ts'
import { Field } from 'components/Field/index.preact.ts'
import type { SelectProps } from 'components/Select/index.preact.ts'
import type { SelectOption } from 'components/Select/types.ts'

// Unlike every hookless Preact component in this package, `Select` uses real hooks — built with
// `h(Select, props)` and rendered through Preact's own pipeline. See `counter-preact.test.tsx`'s
// own doc for the same reasoning.

/** See `select.test.tsx`'s own `tick` doc for why `closeAndRefocus`'s refocus needs a real
 * macrotask to fire before `document.activeElement` can be observed. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

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

Deno.test('Select (preact): clicking an option selects, updates, closes, refocuses', async () => {
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

  // `closeAndRefocus`'s own real `<button>`-refocus (see its own doc) is deliberately deferred to
  // a macrotask to avoid Chromium's second synthesized click, not this test's own timing.
  await tick()
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

Deno.test('Select (preact): Enter while open closes it and refocuses the trigger', async () => {
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

  // Same deferred-refocus timing `closeAndRefocus`'s own doc explains — Enter routes through it
  // too (`handleKeyDown`'s own `Enter`/`Space` branch).
  await tick()
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

  // No inline `style` attribute at all — `position`/`top`/`left` live in the static `<style>`
  // rule (a real CSP fix), and the genuinely dynamic `transform`/`visibility` are applied to a
  // CSSOM rule inside that SAME element instead (see `SELECT_LISTBOX_POSITION_CSS`'s and
  // `createSelect`'s own doc).
  assertEquals(listbox.getAttribute('style'), null)
  const rule = getDynamicRule(container, listbox, 'data-select-id')
  assertStringIncludes(rule.style.transform, 'translate(')

  unmount()
})

Deno.test('Select (preact): the listbox min-width matches the trigger — never narrower than the control it belongs to', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 20, y: 40, width: 417, height: 38 })

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const listbox = must(container.querySelector<HTMLElement>('[data-space-ui="select-listbox"]'))
  stubRect(listbox, { x: 0, y: 0, width: 186, height: 144 })

  act(() => dispatchWindowEvent(new Event('resize')))

  const rule = getDynamicRule(container, listbox, 'data-select-id')
  assertEquals(rule.style.minWidth, '417px')

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

// --- aria-invalid / aria-describedby ---------------------------------------------------------

Deno.test('Select (preact): the trigger is a combobox that announces its listbox popup', () => {
  const html = renderToString(element({ options: SIZES, placeholder: 'Choose' }))

  const trigger = html.match(/<button[^>]*>/)?.[0] ?? ''
  assertStringIncludes(trigger, 'role="combobox"')
  assertStringIncludes(trigger, 'aria-haspopup="listbox"')
  assertStringIncludes(trigger, 'aria-expanded="false"')
})

Deno.test('Select (preact): aria-invalid and aria-describedby land on the trigger button only', () => {
  const html = renderToString(
    element({
      options: SIZES,
      placeholder: 'Choose',
      'aria-invalid': true,
      'aria-describedby': 'size-error',
    }),
  )

  const trigger = html.match(/<button[^>]*>/)?.[0] ?? ''
  assertStringIncludes(trigger, 'aria-invalid="true"')
  assertStringIncludes(trigger, 'aria-describedby="size-error"')
  assertEquals((html.match(/aria-invalid/g) ?? []).length, 1)
  assertEquals((html.match(/aria-describedby/g) ?? []).length, 1)
})

Deno.test('Select (preact): an open listbox does not carry the attributes, only the trigger does', () => {
  const { container, unmount } = mount({
    options: SIZES,
    placeholder: 'Choose',
    defaultOpen: true,
    'aria-invalid': true,
    'aria-describedby': 'size-error',
  })

  assertEquals(container.querySelectorAll('[aria-invalid]').length, 1)
  assertEquals(container.querySelectorAll('[aria-describedby]').length, 1)
  assertEquals(must(container.querySelector('[aria-invalid]')).tagName, 'BUTTON')
  assertEquals(container.querySelector('[role="listbox"]')?.hasAttribute('aria-invalid'), false)

  unmount()
})

Deno.test('Select (preact): without the props the markup carries neither attribute and is unchanged', () => {
  const omitted = renderToString(element({ options: SIZES, placeholder: 'Choose' }))
  const undefinedProps = renderToString(
    element({
      options: SIZES,
      placeholder: 'Choose',
      'aria-invalid': undefined,
      'aria-describedby': undefined,
    }),
  )

  assertEquals(omitted.includes('aria-invalid'), false)
  assertEquals(omitted.includes('aria-describedby'), false)
  assertEquals(undefinedProps, omitted)
})

Deno.test('Select (preact): an explicit aria-invalid false renders aria-invalid="false"', () => {
  const html = renderToString(
    element({ options: SIZES, placeholder: 'Choose', 'aria-invalid': false }),
  )

  assertStringIncludes(html, 'aria-invalid="false"')
})

Deno.test('Select (preact): inside Field, the render-prop wiring points the trigger at the error', () => {
  const html = renderToString(
    h(Field, {
      label: 'Size',
      hint: 'Pick one',
      error: 'Pick a size',
      children: (field) => h(Select, { ...field, options: SIZES, placeholder: 'Choose' }),
    }) as VNode,
  )

  const trigger = html.match(/<button[^>]*>/)?.[0] ?? ''
  assertStringIncludes(trigger, 'aria-invalid="true"')
  const describedBy = (trigger.match(/aria-describedby="([^"]+)"/)?.[1] ?? '').split(' ')
  assertEquals(describedBy.length, 2)
  for (const id of describedBy) assertStringIncludes(html, `id="${id}"`)
  assertStringIncludes(html, 'Pick a size')
  const id = trigger.match(/ id="([^"]+)"/)?.[1] ?? ''
  assertStringIncludes(html, `for="${id}"`)
})

Deno.test('Select (preact): inside Field without an error, neither attribute is rendered', () => {
  const html = renderToString(
    h(Field, {
      label: 'Size',
      children: (field) => h(Select, { ...field, options: SIZES, placeholder: 'Choose' }),
    }) as VNode,
  )

  assertEquals(html.includes('aria-invalid'), false)
  assertEquals(html.includes('aria-describedby'), false)
})

Deno.test('Select (preact): the props change neither the toggling nor the selection', () => {
  const picked: (string | null)[] = []
  const { container, unmount } = mount({
    options: SIZES,
    placeholder: 'Choose',
    onValueChange: (value) => picked.push(value),
    'aria-invalid': true,
    'aria-describedby': 'e',
  })
  const trigger = must(container.querySelector('button'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  assertEquals(trigger.getAttribute('aria-expanded'), 'true')
  act(() => {
    must(container.querySelector('[role="option"]')).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
  })

  assertEquals(picked, ['small'])
  assertEquals(trigger.getAttribute('aria-invalid'), 'true')

  unmount()
})

// --- change event for a delegated form listener ----------------------------------------------

/** Collects the target of every bubbling `change` event that reaches `container`. */
function collectChanges(container: HTMLElement): EventTarget[] {
  const targets: EventTarget[] = []
  container.addEventListener('change', (event) => {
    if (event.target) targets.push(event.target)
  })
  return targets
}

Deno.test('Select (preact): choosing an option fires one bubbling change event from the trigger', () => {
  const { container, unmount } = mount({ ...basicProps(), 'aria-invalid': true })
  const changes = collectChanges(container)
  const trigger = must(container.querySelector('button'))
  act(() => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  assertEquals(changes.length, 0)
  const disabled = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'Medium'
    ),
  )
  act(() => {
    disabled.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  assertEquals(changes.length, 0)
  const large = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'Large'
    ),
  )
  act(() => {
    large.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(changes.length, 1)
  assertEquals(changes[0], trigger)
  assertEquals(trigger.getAttribute('aria-invalid'), 'true')
  unmount()
})

// --- required (data-value-missing) -----------------------------------------------------------

Deno.test('Select (preact): required and empty marks the trigger wrapper data-value-missing', () => {
  const html = renderToString(element({ options: SIZES, placeholder: 'Choose', required: true }))
  assertStringIncludes(html, 'data-value-missing="true"')
  assertEquals((html.match(/data-value-missing/g) ?? []).length, 1)
  assertEquals(html.includes('required'), false)
})

Deno.test('Select (preact): no data-value-missing without required, or once a value is set', () => {
  assertEquals(
    renderToString(element({ options: SIZES, placeholder: 'Choose' })).includes(
      'data-value-missing',
    ),
    false,
  )
  assertEquals(
    renderToString(element({ options: SIZES, required: true, defaultValue: SIZES[0].value }))
      .includes('data-value-missing'),
    false,
  )
})

Deno.test('Select (preact): the marker is dropped after the visitor chooses an option', async () => {
  const { container, unmount } = mount({ options: SIZES, placeholder: 'Choose', required: true })
  assertEquals(container.querySelectorAll('[data-value-missing="true"]').length, 1)
  await act(() => {
    must(container.querySelector('button')).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
  })
  const option = must(container.querySelector('[role="option"]'))
  await act(() => {
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  assertEquals(container.querySelectorAll('[data-value-missing]').length, 0)
  unmount()
})
