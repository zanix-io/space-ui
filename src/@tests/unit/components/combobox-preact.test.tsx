import { dispatchWindowEvent, getDynamicRule, must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Combobox } from 'components/Combobox/index.preact.ts'
import type { ComboboxProps } from 'components/Combobox/index.preact.ts'
import type { ComboboxOption } from 'components/Combobox/types.ts'

// Unlike every hookless Preact component in this package, `Combobox` uses real hooks — built with
// `h(Combobox, props)` and rendered through Preact's own pipeline. See `counter-preact.test.tsx`'s
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

function typeInto(input: HTMLInputElement, text: string) {
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function element(props: ComboboxProps): VNode {
  return h(Combobox, props) as VNode
}

function mount(props: ComboboxProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: ComboboxProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

const FRUITS: ComboboxOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry', disabled: true },
]

function basicProps(options: ComboboxOption[] = FRUITS): ComboboxProps {
  return { options, 'aria-label': 'Fruit' }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Combobox (preact): SSR — role=combobox, closed, no listbox', () => {
  const html = renderToString(element(basicProps()))

  assertStringIncludes(html, 'role="combobox"')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('role="listbox"'), false)
})

Deno.test('Combobox (preact): required lands on the real input — omitted by default', () => {
  assertEquals(renderToString(element(basicProps())).includes('required'), false)
  assertStringIncludes(
    renderToString(element({ ...basicProps(), required: true })),
    'required',
  )
})

Deno.test('Combobox (preact): aria-controls cross-references the listbox id', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  const listbox = must(container.querySelector('[data-space-ui="combobox-listbox"]'))

  assertEquals(input.getAttribute('aria-controls'), listbox.id)

  unmount()
})

// --- real DOM: opening, typing, selecting --------------------------------------------------

Deno.test('Combobox (preact): focusing the input opens the listbox', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector('input'))

  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })

  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)
  assertEquals(input.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test(
  'Combobox (preact): focusing a prefilled input selects its whole text — typing over it ' +
    'replaces rather than concatenating onto the existing value',
  () => {
    const { container, unmount } = mount({ ...basicProps(), defaultInputValue: 'Apple' })
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      input.dispatchEvent(new Event('focus'))
    })

    assertEquals(input.selectionStart, 0)
    assertEquals(input.selectionEnd, 'Apple'.length)

    unmount()
  },
)

Deno.test('Combobox (preact): typing updates the input value and opens the listbox', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    typeInto(input, 'ap')
  })

  assertEquals(input.value, 'ap')
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  unmount()
})

Deno.test('Combobox (preact): options render as role=option items with the given labels', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })

  const options = Array.from(container.querySelectorAll('[role="option"]'))
  assertEquals(options.map((option) => option.textContent), ['Apple', 'Banana', 'Cherry'])
  assertEquals(options.map((option) => option.getAttribute('data-value')), [
    'apple',
    'banana',
    'cherry',
  ])

  unmount()
})

Deno.test('Combobox (preact): clicking an option selects it, fills input, and closes', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onValueChange: (v) => values.push(v),
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  const bananaOption = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'Banana'
    ),
  )

  act(() => {
    bananaOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    bananaOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, ['banana'])
  assertEquals(input.value, 'Banana')
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  unmount()
})

Deno.test('Combobox (preact): hovering an option makes it the highlighted (active) one', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  const bananaOption = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'Banana'
    ),
  )

  act(() => {
    bananaOption.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
  })

  assertEquals(input.getAttribute('aria-activedescendant'), bananaOption.id)

  unmount()
})

Deno.test('Combobox (preact): a mousedown on an option never closes it before the click', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  const appleOption = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'Apple'
    ),
  )

  act(() => {
    appleOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  unmount()
})

Deno.test('Combobox (preact): clicking a disabled option does nothing', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onValueChange: (v) => values.push(v),
  })
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  const cherryOption = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'Cherry'
    ),
  )
  assertEquals(cherryOption.getAttribute('aria-disabled'), 'true')

  act(() => {
    cherryOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    cherryOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, [])
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  unmount()
})

// --- keyboard navigation ---------------------------------------------------------------------

Deno.test('Combobox (preact): ArrowDown from nothing highlighted lands on first option', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })

  const apple = must(container.querySelector('[data-space-ui="combobox-option"]'))
  assertEquals(input.getAttribute('aria-activedescendant'), apple.id)
  assertStringIncludes(apple.id, 'apple')

  unmount()
})

Deno.test('Combobox (preact): ArrowUp from nothing highlighted lands on last option', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  })

  assertStringIncludes(must(input.getAttribute('aria-activedescendant')), 'cherry')

  unmount()
})

Deno.test('Combobox (preact): ArrowDown repeatedly wraps back to the first option', () => {
  // Same reasoning as the React binding's own version of this test: each press needs its own
  // `act()`, otherwise every dispatch inside one `act()` sees the same stale `activeIndex` and the
  // "step from an already-highlighted option" branch (`getNextRovingIndex`) never actually runs.
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  const seen: string[] = []
  for (let i = 0; i < 4; i++) {
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    seen.push(must(input.getAttribute('aria-activedescendant')))
  }

  assertStringIncludes(seen[0], 'apple')
  assertStringIncludes(seen[1], 'banana')
  assertStringIncludes(seen[2], 'cherry')
  assertStringIncludes(seen[3], 'apple')

  unmount()
})

Deno.test('Combobox (preact): ArrowDown/ArrowUp with no options is a no-op', () => {
  const { container, unmount } = mount({ ...basicProps(), options: [] })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })

  assertEquals(input.getAttribute('aria-expanded'), 'false')
  assertEquals(input.getAttribute('aria-activedescendant'), null)
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  unmount()
})

Deno.test(
  'Combobox (preact): a key that maps to no navigation, with nothing highlighted, is a no-op',
  () => {
    const { container, unmount } = mount(basicProps())
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    })

    assertEquals(input.getAttribute('aria-expanded'), 'false')
    assertEquals(input.getAttribute('aria-activedescendant'), null)

    unmount()
  },
)

Deno.test('Combobox (preact): Escape while already closed is a no-op', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(input.getAttribute('aria-expanded'), 'false')
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  unmount()
})

Deno.test('Combobox (preact): Enter selects the highlighted option', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onValueChange: (v) => values.push(v),
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })

  assertEquals(values, ['apple'])
  assertEquals(input.value, 'Apple')
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  unmount()
})

Deno.test('Combobox (preact): Enter with nothing highlighted selects nothing', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onValueChange: (v) => values.push(v),
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })

  assertEquals(values, [])

  unmount()
})

Deno.test('Combobox (preact): Escape closes it without selecting, keeping the typed text', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    typeInto(input, 'ap')
  })
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)
  assertEquals(input.value, 'ap')

  unmount()
})

Deno.test('Combobox (preact): the highlight resets when the options set changes', () => {
  const { container, rerender, unmount } = mount(basicProps(FRUITS))
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  assertStringIncludes(must(input.getAttribute('aria-activedescendant')), 'apple')

  rerender(basicProps([{ value: 'kiwi', label: 'Kiwi' }]))

  assertEquals(input.getAttribute('aria-activedescendant'), null)

  unmount()
})

Deno.test(
  'Combobox (preact): Enter is a no-op when the highlighted index outlives a same-key options swap',
  () => {
    // See `combobox.test.tsx`'s own identical test for why this is a real, forceable case, not a
    // contrived one — `options.map((o) => o.value).join(' ')` collides for two different-length
    // sets below, so the reset never fires and `activeIndex` outlives the shrink.
    const values: (string | null)[] = []
    const { container, rerender, unmount } = mount({
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, {
        value: 'c',
        label: 'C',
      }],
      'aria-label': 'Fruit',
      onValueChange: (v) => values.push(v),
    })
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    assertStringIncludes(must(input.getAttribute('aria-activedescendant')), 'c')

    rerender({
      options: [{ value: 'a b', label: 'AB' }, { value: 'c', label: 'C' }],
      'aria-label': 'Fruit',
      onValueChange: (v) => values.push(v),
    })

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    assertEquals(values, [])
    assertEquals(input.value, '')

    unmount()
  },
)

// --- closing: outside click, blur -------------------------------------------------------------

Deno.test('Combobox (preact): an outside click closes it', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  unmount()
})

Deno.test('Combobox (preact): blurring the input (e.g. Tab away) closes it', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  act(() => {
    input.dispatchEvent(new Event('blur'))
  })

  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  unmount()
})

// --- positioning -----------------------------------------------------------------------------

Deno.test('Combobox (preact): the listbox is positioned via the input reference rect', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))
  stubRect(input, { x: 20, y: 40, width: 200, height: 30 })

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  const listbox = must(container.querySelector<HTMLElement>('[data-space-ui="combobox-listbox"]'))
  stubRect(listbox, { x: 0, y: 0, width: 200, height: 90 })

  act(() => dispatchWindowEvent(new Event('resize')))

  // No inline `style` attribute at all — `position`/`top`/`left` live in the static `<style>`
  // rule (a real CSP fix), and the genuinely dynamic `transform`/`visibility` are applied to a
  // CSSOM rule inside that SAME element instead (see `COMBOBOX_LISTBOX_POSITION_CSS`'s own doc in
  // `index.preact.ts`).
  assertEquals(listbox.getAttribute('style'), null)
  const rule = getDynamicRule(container, listbox, 'data-combobox-id')
  assertStringIncludes(rule.style.transform, 'translate(')

  unmount()
})

// --- controlled / uncontrolled -----------------------------------------------------------------

Deno.test('Combobox (preact): uncontrolled open — onOpenChange fires, still opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onOpenChange: (next) => calls.push(next),
  })
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  unmount()
})

Deno.test('Combobox (preact): controlled open — focusing notifies but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    open: false,
    onOpenChange: (next) => calls.push(next),
  })
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  unmount()
})

Deno.test('Combobox (preact): controlled value/inputValue — selects, never mutates', () => {
  const values: (string | null)[] = []
  const inputValues: string[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    value: null,
    inputValue: '',
    onValueChange: (v) => values.push(v),
    onInputValueChange: (v) => inputValues.push(v),
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  const appleOption = must(container.querySelector('[role="option"]'))

  act(() => {
    appleOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    appleOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, ['apple'])
  assertEquals(inputValues, ['Apple'])
  assertEquals(input.value, '')

  unmount()
})

// --- id/className ----------------------------------------------------------------------------

Deno.test('Combobox (preact): id/className land on the input', () => {
  const { container, unmount } = mount({
    ...basicProps(),
    id: 'country-search',
    className: 'combobox-input',
  })
  const input = must(container.querySelector('input'))
  assertEquals(input.id, 'country-search')
  assertEquals(input.className, 'combobox-input')

  unmount()
})

// --- validationMessage -----------------------------------------------------------------------

function formElement(props: Partial<ComboboxProps> = {}): VNode {
  return h('form', null, h(Combobox, { options: FRUITS, 'aria-label': 'Fruit', ...props })) as VNode
}

function mountInForm(props: Partial<ComboboxProps> = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(formElement(props), container))
  return {
    container,
    rerender: (next: Partial<ComboboxProps> = {}) =>
      act(() => renderDOM(formElement(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('Combobox (Preact): validationMessage marks the real input invalid through native validation', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Pick a fruit from the list' })
  const input = must(container.querySelector('input'))
  const form = must(container.querySelector('form'))

  assertEquals(input.validity.customError, true)
  assertEquals(input.validationMessage, 'Pick a fruit from the list')
  assertEquals(input.checkValidity(), false)
  assertEquals(form.checkValidity(), false)

  unmount()
})

Deno.test('Combobox (Preact): no validationMessage leaves the input valid', () => {
  const { container, unmount } = mountInForm()
  const input = must(container.querySelector('input'))

  assertEquals(input.validity.customError, false)
  assertEquals(must(container.querySelector('form')).checkValidity(), true)

  unmount()
})

Deno.test('Combobox (Preact): removing validationMessage, or emptying it, clears the error', () => {
  const { container, rerender, unmount } = mountInForm({ validationMessage: 'Not valid' })
  const input = must(container.querySelector('input'))
  assertEquals(input.validity.customError, true)

  rerender()
  assertEquals(input.validity.customError, false)
  assertEquals(input.checkValidity(), true)

  rerender({ validationMessage: 'Not valid' })
  assertEquals(input.validity.customError, true)
  rerender({ validationMessage: '' })
  assertEquals(input.validity.customError, false)

  unmount()
})

Deno.test('Combobox (Preact): a changed validationMessage replaces the previous one', () => {
  const { container, rerender, unmount } = mountInForm({ validationMessage: 'First' })
  const input = must(container.querySelector('input'))
  assertEquals(input.validationMessage, 'First')

  rerender({ validationMessage: 'Second' })
  assertEquals(input.validationMessage, 'Second')
  assertEquals(input.validity.customError, true)

  unmount()
})

Deno.test('Combobox (Preact): unmounting clears the error it set', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Not valid' })
  const input = must(container.querySelector('input'))
  assertEquals(input.validity.customError, true)

  unmount()
  assertEquals(input.validity.customError, false)
})

Deno.test('Combobox (Preact): validationMessage renders nothing on the server', () => {
  const plain = renderToString(formElement())
  const withMessage = renderToString(formElement({ validationMessage: 'Not valid' }))

  assertEquals(withMessage, plain)
  assertEquals(withMessage.includes('Not valid'), false)
})

Deno.test('Combobox (Preact): validationMessage coexists with required, and leaves aria-invalid alone', () => {
  const { container, rerender, unmount } = mountInForm({
    required: true,
    validationMessage: 'Not valid',
  })
  const input = must(container.querySelector('input'))

  assertEquals(input.validity.valueMissing, true)
  assertEquals(input.validity.customError, true)
  assertEquals(input.getAttribute('aria-invalid'), null)

  rerender({ required: true, validationMessage: 'Not valid', 'aria-invalid': true })
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  rerender({ required: true, 'aria-invalid': true })
  assertEquals(input.validity.valueMissing, true)
  assertEquals(input.validity.customError, false)
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  unmount()
})
