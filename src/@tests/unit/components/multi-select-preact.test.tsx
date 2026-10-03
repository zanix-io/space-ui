import { dispatchWindowEvent, getDynamicRule, must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { MultiSelect } from 'components/MultiSelect/index.preact.ts'
import type { MultiSelectProps } from 'components/MultiSelect/index.preact.ts'
import type { MultiSelectOption } from 'components/MultiSelect/types.ts'

// Unlike every hookless Preact component in this package, `MultiSelect` uses real hooks — built
// with `h(MultiSelect, props)` and rendered through Preact's own pipeline. Same reasoning
// `combobox-preact.test.tsx`'s own doc gives in full.

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

function element(props: MultiSelectProps): VNode {
  return h(MultiSelect, props) as VNode
}

function mount(props: MultiSelectProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: MultiSelectProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

const LANGUAGES: MultiSelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German', disabled: true },
]

function basicProps(props: Partial<MultiSelectProps> = {}): MultiSelectProps {
  return { options: LANGUAGES, 'aria-label': 'Languages', ...props }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('MultiSelect (preact): SSR — role=combobox, closed, no listbox, no chips', () => {
  const html = renderToString(element(basicProps()))

  assertStringIncludes(html, 'role="combobox"')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('role="listbox"'), false)
  assertEquals(html.includes('multi-select-chip'), false)
  assertStringIncludes(html, '0 items selected')
})

Deno.test('MultiSelect (preact): SSR with values — renders one chip per value, in order', () => {
  const html = renderToString(element(basicProps({ values: ['en', 'fr'] })))

  assertStringIncludes(html, 'English')
  assertStringIncludes(html, 'French')
  assertStringIncludes(html, '2 items selected')
})

Deno.test('MultiSelect (preact): getSelectionDescription overrides the default English text', () => {
  const html = renderToString(
    element(basicProps({
      values: ['en', 'fr'],
      getSelectionDescription: (count) => `${count} elementos seleccionados`,
    })),
  )

  assertStringIncludes(html, '2 elementos seleccionados')
  assertEquals(html.includes('items selected'), false)
})

Deno.test('MultiSelect (preact): aria-controls cross-references the listbox id', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  const listbox = must(container.querySelector('[data-space-ui="multi-select-listbox"]'))

  assertEquals(input.getAttribute('aria-controls'), listbox.id)

  unmount()
})

// --- committing a chip (Mode 1 — closed list) -----------------------------------------------

Deno.test('MultiSelect (preact): focusing the input opens the listbox', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector('input'))

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]') !== null, true)
  assertEquals(input.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test(
  'MultiSelect (preact): clicking an option commits it as a chip, clears the input, and keeps ' +
    'the listbox open for the next pick',
  () => {
    const valuesSeen: string[][] = []
    const { container, unmount } = mount(
      basicProps({ onValuesChange: (v) => valuesSeen.push(v) }),
    )
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      input.dispatchEvent(new Event('focus'))
    })
    const englishOption = must(
      Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
        o.textContent === 'English'
      ),
    )

    act(() => {
      englishOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      englishOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    assertEquals(valuesSeen, [['en']])
    assertEquals(input.value, '')
    assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]') !== null, true)

    unmount()
  },
)

Deno.test(
  'MultiSelect (preact): an already-committed value is excluded from the listbox',
  () => {
    const { container, unmount } = mount(basicProps({ values: ['en'] }))
    const input = must(container.querySelector('input'))

    act(() => {
      input.dispatchEvent(new Event('focus'))
    })

    const options = Array.from(container.querySelectorAll('[role="option"]'))
    assertEquals(options.map((option) => option.textContent), ['French', 'German'])

    unmount()
  },
)

Deno.test('MultiSelect (preact): no listbox is shown once every option is already committed', () => {
  const { container, unmount } = mount(
    basicProps({ options: LANGUAGES.slice(0, 2), values: ['en', 'fr'] }),
  )
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)

  unmount()
})

Deno.test('MultiSelect (preact): clicking a disabled option does nothing', () => {
  const valuesSeen: string[][] = []
  const { container, unmount } = mount(basicProps({ onValuesChange: (v) => valuesSeen.push(v) }))
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  const germanOption = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'German'
    ),
  )

  act(() => {
    germanOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    germanOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(valuesSeen, [])

  unmount()
})

// --- Mode 2 — allowCustomValue ----------------------------------------------------------------

Deno.test(
  'MultiSelect (preact): allowCustomValue — Enter with typed text matching no option commits ' +
    'it as a new free-text chip',
  () => {
    const valuesSeen: string[][] = []
    const { container, unmount } = mount(
      basicProps({ allowCustomValue: true, onValuesChange: (v) => valuesSeen.push(v) }),
    )
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      typeInto(input, 'Klingon')
    })
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    assertEquals(valuesSeen, [['Klingon']])
    assertEquals(input.value, '')

    unmount()
  },
)

Deno.test(
  'MultiSelect (preact): allowCustomValue false — Enter with typed text matching no option ' +
    'does nothing',
  () => {
    const valuesSeen: string[][] = []
    const { container, unmount } = mount(basicProps({ onValuesChange: (v) => valuesSeen.push(v) }))
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      typeInto(input, 'Klingon')
    })
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    assertEquals(valuesSeen, [])
    assertEquals(input.value, 'Klingon')

    unmount()
  },
)

Deno.test(
  'MultiSelect (preact): allowCustomValue — typed text exactly matching an option label ' +
    'selects that option instead of duplicating it',
  () => {
    const valuesSeen: string[][] = []
    const { container, unmount } = mount(
      basicProps({ allowCustomValue: true, onValuesChange: (v) => valuesSeen.push(v) }),
    )
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      typeInto(input, 'english')
    })
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    assertEquals(valuesSeen, [['en']])

    unmount()
  },
)

Deno.test(
  'MultiSelect (preact): allowCustomValue — losing focus with non-empty typed text commits it ' +
    'as a chip',
  () => {
    const valuesSeen: string[][] = []
    const { container, unmount } = mount(
      basicProps({ allowCustomValue: true, onValuesChange: (v) => valuesSeen.push(v) }),
    )
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      typeInto(input, 'Klingon')
    })
    act(() => {
      input.dispatchEvent(new Event('blur'))
    })

    assertEquals(valuesSeen, [['Klingon']])

    unmount()
  },
)

// --- chip removal -----------------------------------------------------------------------------

Deno.test(
  'MultiSelect (preact): each chip has its own remove button, aria-label="Remove {label}"',
  () => {
    const { container, unmount } = mount(basicProps({ values: ['en'] }))

    const removeButton = must(container.querySelector('button[aria-label="Remove English"]'))
    assertEquals(removeButton.tagName, 'BUTTON')

    unmount()
  },
)

Deno.test('MultiSelect (preact): clicking a chip remove button removes just that value', () => {
  const valuesSeen: string[][] = []
  const { container, unmount } = mount(
    basicProps({ values: ['en', 'fr'], onValuesChange: (v) => valuesSeen.push(v) }),
  )
  const removeButton = must(container.querySelector('button[aria-label="Remove English"]'))

  act(() => {
    removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(valuesSeen, [['fr']])

  unmount()
})

Deno.test(
  'MultiSelect (preact): Backspace on an already-empty input removes the last committed chip',
  () => {
    const valuesSeen: string[][] = []
    const { container, unmount } = mount(
      basicProps({ values: ['en', 'fr'], onValuesChange: (v) => valuesSeen.push(v) }),
    )
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    })

    assertEquals(valuesSeen, [['en']])

    unmount()
  },
)

// --- max --------------------------------------------------------------------------------------

Deno.test('MultiSelect (preact): max caps further commits and hides the listbox once reached', () => {
  const { container, unmount } = mount(basicProps({ values: ['en'], max: 1 }))
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)
  unmount()
})

// --- keyboard navigation ------------------------------------------------------------------------

Deno.test('MultiSelect (preact): ArrowDown from nothing highlighted lands on the first option', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })

  const activeId = input.getAttribute('aria-activedescendant')
  const english = must(container.querySelector('[data-space-ui="multi-select-option"]'))
  assertEquals(activeId, english.id)

  unmount()
})

Deno.test('MultiSelect (preact): Enter selects the highlighted option', () => {
  const valuesSeen: string[][] = []
  const { container, unmount } = mount(basicProps({ onValuesChange: (v) => valuesSeen.push(v) }))
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })

  assertEquals(valuesSeen, [['en']])

  unmount()
})

// --- closing: outside click, blur -------------------------------------------------------------

Deno.test('MultiSelect (preact): an outside click closes the listbox', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]') !== null, true)

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)

  unmount()
})

Deno.test('MultiSelect (preact): blurring the input closes it', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]') !== null, true)

  act(() => {
    input.dispatchEvent(new Event('blur'))
  })

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)

  unmount()
})

// --- positioning -----------------------------------------------------------------------------

Deno.test('MultiSelect (preact): the listbox is positioned via the input reference rect', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))
  stubRect(input, { x: 20, y: 40, width: 200, height: 30 })

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  const listbox = must(
    container.querySelector<HTMLElement>('[data-space-ui="multi-select-listbox"]'),
  )
  stubRect(listbox, { x: 0, y: 0, width: 200, height: 90 })

  act(() => dispatchWindowEvent(new Event('resize')))

  // No inline `style` attribute at all — `position`/`top`/`left` live in the static `<style>`
  // rule (a real CSP fix), and the genuinely dynamic `transform`/`visibility` are applied to a
  // CSSOM rule inside that SAME element instead (see `MULTI_SELECT_LISTBOX_POSITION_CSS`'s and
  // `createMultiSelect`'s own doc).
  assertEquals(listbox.getAttribute('style'), null)
  const rule = getDynamicRule(container, listbox, 'data-multi-select-id')
  assertStringIncludes(rule.style.transform, 'translate(')

  unmount()
})

Deno.test('MultiSelect (preact): the listbox min-width matches the input — never narrower than the control it belongs to', () => {
  const { container, unmount } = mount(basicProps())
  const input = must(container.querySelector<HTMLInputElement>('input'))
  stubRect(input, { x: 20, y: 40, width: 417, height: 38 })

  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
  const listbox = must(
    container.querySelector<HTMLElement>('[data-space-ui="multi-select-listbox"]'),
  )
  stubRect(listbox, { x: 0, y: 0, width: 186, height: 144 })

  act(() => dispatchWindowEvent(new Event('resize')))

  const rule = getDynamicRule(container, listbox, 'data-multi-select-id')
  assertEquals(rule.style.minWidth, '417px')

  unmount()
})

Deno.test('MultiSelect (preact): nonce lands on the always-rendered wrapper <style> element', () => {
  const html = renderToString(h(MultiSelect, { nonce: 'abc123', options: [] }))

  assertStringIncludes(html, '<style nonce="abc123">')
})

// --- validationMessage -----------------------------------------------------------------------

// Wrapped in a `<form>` through a tiny parent so the control's native validity can also be read
// from `form.checkValidity()`, same as the React file's own `inForm`.
function formElement(props: MultiSelectProps) {
  return h('form', null, h(MultiSelect, props)) as VNode
}

function mountInForm(props: Partial<MultiSelectProps> = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(formElement(basicProps(props)), container))
  return {
    container,
    rerender: (next: Partial<MultiSelectProps>) =>
      act(() => renderDOM(formElement(basicProps(next)), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('MultiSelect (preact): validationMessage marks the real combobox input invalid through native validation', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Pick two' })
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  const form = must(container.querySelector('form'))

  assertEquals(control.validity.customError, true)
  assertEquals(control.validationMessage, 'Pick two')
  assertEquals(control.checkValidity(), false)
  assertEquals(form.checkValidity(), false)

  unmount()
})

Deno.test('MultiSelect (preact): no validationMessage leaves the input valid', () => {
  const { container, unmount } = mountInForm()

  assertEquals(
    must(container.querySelector<HTMLInputElement>('input[role="combobox"]')).validity.customError,
    false,
  )
  assertEquals(must(container.querySelector('form')).checkValidity(), true)

  unmount()
})

Deno.test('MultiSelect (preact): removing validationMessage, or emptying it, clears the error', () => {
  const { container, rerender, unmount } = mountInForm({ validationMessage: 'Not valid' })
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  assertEquals(control.validity.customError, true)

  rerender({})
  assertEquals(control.validity.customError, false)
  assertEquals(control.checkValidity(), true)

  rerender({ validationMessage: 'Not valid' })
  assertEquals(control.validity.customError, true)
  rerender({ validationMessage: '' })
  assertEquals(control.validity.customError, false)

  unmount()
})

Deno.test('MultiSelect (preact): a changed validationMessage replaces the previous one', () => {
  const { container, rerender, unmount } = mountInForm({ validationMessage: 'First' })
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  assertEquals(control.validationMessage, 'First')

  rerender({ validationMessage: 'Second' })
  assertEquals(control.validationMessage, 'Second')
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('MultiSelect (preact): unmounting clears the error it set', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Not valid' })
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  assertEquals(control.validity.customError, true)

  unmount()
  assertEquals(control.validity.customError, false)
})

Deno.test('MultiSelect (preact): typing does not clear the error — the open suggestions only hold it back', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Not valid' })
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))

  act(() => typeInto(control, 'Engl'))
  assertEquals(control.value, 'Engl')
  // The typed text opened the suggestions, so the error is held back while they show.
  assertEquals(control.validity.customError, false)

  // Closing them brings it back: typing never removed the caller's message, only the caller can.
  act(() => {
    control.dispatchEvent(new Event('blur'))
  })
  assertEquals(control.value, 'Engl')
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('MultiSelect (preact): the error sits on the same input `required` applies to, chips or not', () => {
  const empty = mountInForm({ required: true, validationMessage: 'Pick two' })
  const emptyInput = must(empty.container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  assertEquals(emptyInput.required, true)
  assertEquals(emptyInput.validity.valueMissing, true)
  assertEquals(emptyInput.validity.customError, true)
  empty.unmount()

  // With a committed chip `required` is dropped from the input, and the caller's error stays: the
  // two are independent, and the chips are siblings of this one input.
  const chipped = mountInForm({
    required: true,
    defaultValues: ['en'],
    validationMessage: 'Pick two',
  })
  const chippedInput = must(
    chipped.container.querySelector<HTMLInputElement>('input[role="combobox"]'),
  )
  assertEquals(chipped.container.querySelectorAll('input').length, 1)
  assertEquals(chippedInput.required, false)
  assertEquals(chippedInput.validity.valueMissing, false)
  assertEquals(chippedInput.validity.customError, true)
  assertEquals(chippedInput.checkValidity(), false)
  chipped.unmount()
})

Deno.test('MultiSelect (preact): validationMessage renders nothing on the server', () => {
  const plain = renderToString(formElement(basicProps()))
  const withMessage = renderToString(formElement(basicProps({ validationMessage: 'Not valid' })))

  assertEquals(withMessage, plain)
  assertEquals(withMessage.includes('Not valid'), false)
})

Deno.test('MultiSelect (preact): validationMessage leaves aria-invalid alone', () => {
  const { container, rerender, unmount } = mountInForm({ validationMessage: 'Not valid' })
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  assertEquals(control.getAttribute('aria-invalid'), null)

  rerender({ validationMessage: 'Not valid', 'aria-invalid': true })
  assertEquals(control.getAttribute('aria-invalid'), 'true')

  rerender({ 'aria-invalid': true })
  assertEquals(control.validity.customError, false)
  assertEquals(control.getAttribute('aria-invalid'), 'true')

  unmount()
})

// --- validationMessage while the listbox is open ----------------------------------------------
// The browser's validation bubble would sit over the suggestions, so the error is held back while
// they show and applied again, synchronously, when the listbox closes.

function openListbox(input: HTMLInputElement) {
  act(() => {
    input.dispatchEvent(new Event('focus'))
  })
}

function mountWithSubmitButton(props: Partial<MultiSelectProps> = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() =>
    renderDOM(
      h(
        'form',
        null,
        h(MultiSelect, basicProps(props)),
        h('button', { type: 'submit' }, 'Save'),
      ) as VNode,
      container,
    )
  )
  return { container, unmount: () => act(() => renderDOM(null, container)) }
}

const COMBOBOX = 'input[role="combobox"]'

Deno.test('MultiSelect (preact): validationMessage is held back while the listbox shows suggestions', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Pick two' })
  const input = must(container.querySelector<HTMLInputElement>(COMBOBOX))
  const form = must(container.querySelector('form'))
  assertEquals(input.validity.customError, true)

  openListbox(input)
  assertEquals(container.querySelector('[role="listbox"]') !== null, true)
  assertEquals(input.validity.customError, false)
  assertEquals(form.checkValidity(), true)

  unmount()
})

Deno.test('MultiSelect (preact): validationMessage stays applied while the open listbox has nothing to offer', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Pick two', options: [] })
  const input = must(container.querySelector<HTMLInputElement>(COMBOBOX))

  openListbox(input)
  assertEquals(container.querySelector('[role="listbox"]'), null)
  assertEquals(input.validity.customError, true)

  unmount()
})

Deno.test('MultiSelect (preact): validationMessage is applied again when the listbox closes, by every way it can close', () => {
  const closers: Record<string, (input: HTMLInputElement) => void> = {
    Escape: (input) =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    blur: (input) => input.dispatchEvent(new Event('blur')),
    'outside mousedown': () =>
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })),
  }
  for (const [name, close] of Object.entries(closers)) {
    const { container, unmount } = mountInForm({ validationMessage: 'Pick two' })
    const input = must(container.querySelector<HTMLInputElement>(COMBOBOX))
    openListbox(input)
    assertEquals(input.validity.customError, false, `${name}: held back while open`)

    act(() => close(input))
    assertEquals(container.querySelector('[role="listbox"]'), null, `${name}: closed`)
    assertEquals(input.validity.customError, true, `${name}: applied again`)
    unmount()
  }
})

Deno.test('MultiSelect (preact): a selection that closes the listbox applies the message again', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Pick two', closeOnSelect: true })
  const input = must(container.querySelector<HTMLInputElement>(COMBOBOX))
  openListbox(input)
  const option = must(container.querySelector('[role="option"]'))

  act(() => {
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  assertEquals(container.querySelector('[role="listbox"]'), null)
  assertEquals(input.validity.customError, true)

  unmount()
})

Deno.test('MultiSelect (preact): the message is back before a submit click that closes the listbox is validated', () => {
  const { container, unmount } = mountWithSubmitButton({ validationMessage: 'Pick two' })
  const input = must(container.querySelector<HTMLInputElement>(COMBOBOX))
  const form = must(container.querySelector('form'))
  const button = must(container.querySelector('button'))
  openListbox(input)
  assertEquals(form.checkValidity(), true)

  // `mousedown` on a button outside (closes the listbox), the input's `blur`, then `click`. Preact
  // defers both its re-render and its effects past these handlers, so the message is only there if
  // the closing handler applied it.
  button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  assertEquals(input.validity.customError, true, 'after mousedown')
  input.dispatchEvent(new Event('blur'))
  assertEquals(input.validity.customError, true, 'after blur')
  assertEquals(form.checkValidity(), false, 'the form is invalid when the click validates it')

  unmount()
})

Deno.test('MultiSelect (preact): an Enter with nothing to commit applies the message before the implicit submit', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Pick two' })
  const input = must(container.querySelector<HTMLInputElement>(COMBOBOX))
  openListbox(input)
  assertEquals(input.validity.customError, false)

  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  assertEquals(input.validity.customError, true)

  unmount()
})

Deno.test('MultiSelect (preact): holding the message back leaves required and aria-invalid alone', () => {
  const { container, unmount } = mountInForm({
    required: true,
    validationMessage: 'Pick two',
    'aria-invalid': true,
  })
  const input = must(container.querySelector<HTMLInputElement>(COMBOBOX))
  openListbox(input)

  assertEquals(input.validity.customError, false)
  assertEquals(input.validity.valueMissing, true)
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  unmount()
})

Deno.test('MultiSelect (preact): unmounting with the listbox open leaves no error behind', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Pick two' })
  const input = must(container.querySelector<HTMLInputElement>(COMBOBOX))
  openListbox(input)

  unmount()
  assertEquals(input.validity.customError, false)
})
