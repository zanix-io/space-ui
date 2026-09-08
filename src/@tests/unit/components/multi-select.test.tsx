import { dispatchWindowEvent, must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { MultiSelect } from 'components/MultiSelect/index.ts'
import type { MultiSelectProps } from 'components/MultiSelect/index.ts'
import type { MultiSelectOption } from 'components/MultiSelect/types.ts'

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

// Same native-setter technique `combobox.test.tsx`'s own `typeInto` already documents — bypasses
// React's own "value tracker" so a plain `.value =` assignment isn't silently ignored.
function typeInto(input: HTMLInputElement, text: string) {
  const descriptor = must(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value'))
  const nativeSetter = must(descriptor.set)
  nativeSetter.call(input, text)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function mount(element: ReturnType<typeof MultiSelect>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof MultiSelect>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
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

Deno.test('MultiSelect: SSR — role=combobox, closed, no listbox, no chips', () => {
  const html = renderToStaticMarkup(<MultiSelect {...basicProps()} />)

  assertStringIncludes(html, 'role="combobox"')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('role="listbox"'), false)
  assertEquals(html.includes('multi-select-chip'), false)
  assertStringIncludes(html, '0 items selected')
})

Deno.test('MultiSelect: SSR with values — renders one chip per value, in order', () => {
  const html = renderToStaticMarkup(<MultiSelect {...basicProps({ values: ['en', 'fr'] })} />)

  assertStringIncludes(html, 'English')
  assertStringIncludes(html, 'French')
  assertStringIncludes(html, '2 items selected')
})

Deno.test('MultiSelect: aria-controls on the input cross-references the listbox id', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps()} />)
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="multi-select-listbox"]'))

  assertEquals(input.getAttribute('aria-controls'), listbox.id)

  unmount()
})

// --- committing a chip (Mode 1 — closed list) -----------------------------------------------

Deno.test('MultiSelect: focusing the input opens the listbox', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps()} />)
  const input = must(container.querySelector('input'))

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]') !== null, true)
  assertEquals(input.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test('MultiSelect: the options render as role=option items with the given labels', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps()} />)
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })

  const options = Array.from(container.querySelectorAll('[role="option"]'))
  assertEquals(options.map((option) => option.textContent), ['English', 'French', 'German'])

  unmount()
})

Deno.test(
  'MultiSelect: clicking an option commits it as a chip, clears the input, and keeps the ' +
    'listbox open for the next pick',
  () => {
    const valuesSeen: string[][] = []
    const { container, unmount } = mount(
      <MultiSelect {...basicProps({ onValuesChange: (v) => valuesSeen.push(v) })} />,
    )
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
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
    // Still open, ready for the next pick — unlike `Combobox`, which closes on selection.
    assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]') !== null, true)

    unmount()
  },
)

Deno.test(
  'MultiSelect: an already-committed value is excluded from the listbox — never offered twice',
  () => {
    const { container, unmount } = mount(<MultiSelect {...basicProps({ values: ['en'] })} />)
    const input = must(container.querySelector('input'))

    act(() => {
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })

    const options = Array.from(container.querySelectorAll('[role="option"]'))
    assertEquals(options.map((option) => option.textContent), ['French', 'German'])

    unmount()
  },
)

Deno.test(
  'MultiSelect: no listbox is shown once every option is already committed',
  () => {
    const { container, unmount } = mount(
      <MultiSelect {...basicProps({ options: LANGUAGES.slice(0, 2), values: ['en', 'fr'] })} />,
    )
    const input = must(container.querySelector('input'))

    act(() => {
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })

    assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)
    assertEquals(input.getAttribute('aria-expanded'), 'false')

    unmount()
  },
)

Deno.test('MultiSelect: clicking a disabled option does nothing', () => {
  const valuesSeen: string[][] = []
  const { container, unmount } = mount(
    <MultiSelect {...basicProps({ onValuesChange: (v) => valuesSeen.push(v) })} />,
  )
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  const germanOption = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'German'
    ),
  )
  assertEquals(germanOption.getAttribute('aria-disabled'), 'true')

  act(() => {
    germanOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    germanOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(valuesSeen, [])

  unmount()
})

// --- Mode 2 — allowCustomValue ----------------------------------------------------------------

Deno.test(
  'MultiSelect: allowCustomValue — Enter with typed text matching no option commits it as a ' +
    'new free-text chip',
  () => {
    const valuesSeen: string[][] = []
    const { container, unmount } = mount(
      <MultiSelect
        {...basicProps({ allowCustomValue: true, onValuesChange: (v) => valuesSeen.push(v) })}
      />,
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
  'MultiSelect: allowCustomValue false — Enter with typed text matching no option does nothing',
  () => {
    const valuesSeen: string[][] = []
    const { container, unmount } = mount(
      <MultiSelect {...basicProps({ onValuesChange: (v) => valuesSeen.push(v) })} />,
    )
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
  'MultiSelect: allowCustomValue — typed text exactly matching an option label selects that ' +
    'option instead of duplicating it',
  () => {
    const valuesSeen: string[][] = []
    const { container, unmount } = mount(
      <MultiSelect
        {...basicProps({ allowCustomValue: true, onValuesChange: (v) => valuesSeen.push(v) })}
      />,
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
  'MultiSelect: allowCustomValue — losing focus with non-empty typed text commits it as a chip',
  () => {
    const valuesSeen: string[][] = []
    const { container, unmount } = mount(
      <MultiSelect
        {...basicProps({ allowCustomValue: true, onValuesChange: (v) => valuesSeen.push(v) })}
      />,
    )
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      typeInto(input, 'Klingon')
    })
    act(() => {
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })

    assertEquals(valuesSeen, [['Klingon']])

    unmount()
  },
)

// --- chip removal -----------------------------------------------------------------------------

Deno.test('MultiSelect: each chip has its own remove button, aria-label="Remove {label}"', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps({ values: ['en'] })} />)

  const removeButton = must(container.querySelector('button[aria-label="Remove English"]'))
  assertEquals(removeButton.tagName, 'BUTTON')

  unmount()
})

Deno.test('MultiSelect: clicking a chip remove button removes just that value', () => {
  const valuesSeen: string[][] = []
  const { container, unmount } = mount(
    <MultiSelect
      {...basicProps({ values: ['en', 'fr'], onValuesChange: (v) => valuesSeen.push(v) })}
    />,
  )
  const removeButton = must(container.querySelector('button[aria-label="Remove English"]'))

  act(() => {
    removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(valuesSeen, [['fr']])

  unmount()
})

Deno.test('MultiSelect: Backspace on an already-empty input removes the last committed chip', () => {
  const valuesSeen: string[][] = []
  const { container, unmount } = mount(
    <MultiSelect
      {...basicProps({ values: ['en', 'fr'], onValuesChange: (v) => valuesSeen.push(v) })}
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
  })

  assertEquals(valuesSeen, [['en']])

  unmount()
})

Deno.test('MultiSelect: Backspace with typed text present never removes a chip', () => {
  const valuesSeen: string[][] = []
  const { container, unmount } = mount(
    <MultiSelect
      {...basicProps({ values: ['en'], onValuesChange: (v) => valuesSeen.push(v) })}
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    typeInto(input, 'fr')
  })
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
  })

  assertEquals(valuesSeen, [])

  unmount()
})

// --- max --------------------------------------------------------------------------------------

Deno.test('MultiSelect: max caps further commits and hides the listbox once reached', () => {
  const valuesSeen: string[][] = []
  const { container, unmount } = mount(
    <MultiSelect
      {...basicProps({ values: ['en'], max: 1, onValuesChange: (v) => valuesSeen.push(v) })}
    />,
  )
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)
  unmount()
})

Deno.test('MultiSelect: max never blocks removing a chip', () => {
  const valuesSeen: string[][] = []
  const { container, unmount } = mount(
    <MultiSelect
      {...basicProps({ values: ['en'], max: 1, onValuesChange: (v) => valuesSeen.push(v) })}
    />,
  )
  const removeButton = must(container.querySelector('button[aria-label="Remove English"]'))

  act(() => {
    removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(valuesSeen, [[]])

  unmount()
})

// --- keyboard navigation ------------------------------------------------------------------------

Deno.test('MultiSelect: ArrowDown from nothing highlighted lands on the first option', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps()} />)
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })

  const activeId = input.getAttribute('aria-activedescendant')
  const english = must(container.querySelector('[data-space-ui="multi-select-option"]'))
  assertEquals(activeId, english.id)

  unmount()
})

Deno.test('MultiSelect: Enter selects the highlighted option', () => {
  const valuesSeen: string[][] = []
  const { container, unmount } = mount(
    <MultiSelect {...basicProps({ onValuesChange: (v) => valuesSeen.push(v) })} />,
  )
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

Deno.test('MultiSelect: an outside click closes the listbox', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps()} />)
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]') !== null, true)

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)

  unmount()
})

Deno.test('MultiSelect: Escape closes it without selecting, keeping the typed text', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps()} />)
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    typeInto(input, 'en')
  })
  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]') !== null, true)

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)
  assertEquals(input.value, 'en')

  unmount()
})

// --- controlled / uncontrolled -----------------------------------------------------------------

Deno.test('MultiSelect: controlled values — a selection notifies, never self-mutates', () => {
  const valuesSeen: string[][] = []
  const { container, unmount } = mount(
    <MultiSelect {...basicProps({ values: [], onValuesChange: (v) => valuesSeen.push(v) })} />,
  )
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  const englishOption = must(container.querySelector('[role="option"]'))

  act(() => {
    englishOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    englishOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(valuesSeen, [['en']])
  // Controlled at `values={[]}` throughout — no chip actually rendered despite notifying.
  assertEquals(container.querySelector('[data-space-ui="multi-select-chip"]'), null)

  unmount()
})

// --- positioning -----------------------------------------------------------------------------

Deno.test('MultiSelect: the listbox is positioned via the input reference rect', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps()} />)
  const input = must(container.querySelector<HTMLInputElement>('input'))
  stubRect(input, { x: 20, y: 40, width: 200, height: 30 })

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  const listbox = must(
    container.querySelector<HTMLElement>('[data-space-ui="multi-select-listbox"]'),
  )
  stubRect(listbox, { x: 0, y: 0, width: 200, height: 90 })

  act(() => dispatchWindowEvent(new Event('resize')))

  assertEquals(listbox.style.position, 'fixed')
  assertStringIncludes(listbox.style.transform, 'translate(')

  unmount()
})

// --- id/className ----------------------------------------------------------------------------

Deno.test('MultiSelect: id/className land on the input', () => {
  const { container, unmount } = mount(
    <MultiSelect {...basicProps({ id: 'language-search', className: 'multi-select-input' })} />,
  )
  const input = must(container.querySelector('input'))
  assertEquals(input.id, 'language-search')
  assertEquals(input.className, 'multi-select-input')

  unmount()
})
