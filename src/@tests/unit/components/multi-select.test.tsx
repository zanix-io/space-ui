import { dispatchWindowEvent, getDynamicRule, must } from './dom-test-setup.ts'
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

Deno.test('MultiSelect: getSelectionDescription overrides the default English text', () => {
  const html = renderToStaticMarkup(
    <MultiSelect
      {...basicProps({
        values: ['en', 'fr'],
        getSelectionDescription: (count) => `${count} elementos seleccionados`,
      })}
    />,
  )

  assertStringIncludes(html, '2 elementos seleccionados')
  assertEquals(html.includes('items selected'), false)
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

Deno.test(
  'MultiSelect: a chip keeps its own label once the caller narrows options past it (a live ' +
    'search filtering out an already-selected value) — real, confirmed bug: the label used to ' +
    'fall back to the raw value the instant this happened',
  () => {
    const { container, rerender, unmount } = mount(
      <MultiSelect {...basicProps({ values: ['en'] })} />,
    )
    assertStringIncludes(must(container.textContent), 'English')

    // The documented caller contract (`index.ts`'s own doc): "options is still already filtered
    // by the caller for the current inputValue" — a live search for something that no longer
    // matches the already-selected 'en' option narrows it out of `options` entirely.
    rerender(
      <MultiSelect
        {...basicProps({ values: ['en'], options: [{ value: 'fr', label: 'French' }] })}
      />,
    )

    assertStringIncludes(must(container.textContent), 'English')
    unmount()
  },
)

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

Deno.test(
  'MultiSelect: clicking a chip remove button returns focus to the input — real, confirmed bug ' +
    "this closes: focus used to stay on the (now-removed) button, so the listbox's own blur-" +
    'close left a caller with no visible way back in without a second, separate click',
  () => {
    const { container, unmount } = mount(<MultiSelect {...basicProps({ values: ['en'] })} />)
    const removeButton = must(container.querySelector('button[aria-label="Remove English"]'))
    const input = must(container.querySelector('input'))

    act(() => {
      removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    assertEquals(document.activeElement, input)

    unmount()
  },
)

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

// --- closeOnSelect ------------------------------------------------------------------------------

Deno.test('MultiSelect: a selection leaves the listbox open by default', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps()} />)
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]') !== null, true)

  unmount()
})

Deno.test('MultiSelect: closeOnSelect closes the listbox once a selection commits', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps({ closeOnSelect: true })} />)
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)

  unmount()
})

Deno.test(
  "MultiSelect: removing a chip reopens the listbox by default (the remove button's own " +
    'refocus triggers it, same as any other focus) — unchanged, closeOnSelect unset',
  () => {
    const { container, unmount } = mount(
      <MultiSelect {...basicProps({ defaultValues: ['en'] })} />,
    )
    const removeButton = must(container.querySelector('button[aria-label="Remove English"]'))

    act(() => {
      removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]') !== null, true)

    unmount()
  },
)

Deno.test(
  "MultiSelect: closeOnSelect also keeps a chip's own removal from reopening the listbox " +
    "through its remove button's own refocus",
  () => {
    const { container, unmount } = mount(
      <MultiSelect {...basicProps({ defaultValues: ['en'], closeOnSelect: true })} />,
    )
    const removeButton = must(container.querySelector('button[aria-label="Remove English"]'))

    act(() => {
      removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)
    assertEquals(document.activeElement, container.querySelector('input'))

    unmount()
  },
)

Deno.test(
  'MultiSelect: clicking the input reopens the listbox even when already focused — real, ' +
    'confirmed bug this closes: a click never fires a NEW `focus` event on an already-focused ' +
    "element, so the chip-remove button's own refocus (above) left a caller with no way back in " +
    'via a plain click, only `focus` ever opened this listbox before',
  () => {
    const { container, unmount } = mount(
      <MultiSelect {...basicProps({ defaultValues: ['en'], closeOnSelect: true })} />,
    )
    const removeButton = must(container.querySelector('button[aria-label="Remove English"]'))
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)
    assertEquals(document.activeElement, input)

    // The input is already focused (no new `focus` event will fire) — only a real `click` on it
    // should still reopen the listbox.
    act(() => {
      input.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]') !== null, true)

    unmount()
  },
)

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

  // No inline `style` attribute at all — `position`/`top`/`left` live in the static `<style>`
  // rule (a real CSP fix), and the genuinely dynamic `transform`/`visibility` are applied to a
  // CSSOM rule inside that SAME element instead (see `MULTI_SELECT_LISTBOX_POSITION_CSS`'s and
  // `createMultiSelect`'s own doc).
  assertEquals(listbox.getAttribute('style'), null)
  const rule = getDynamicRule(container, listbox, 'data-multi-select-id')
  assertStringIncludes(rule.style.transform, 'translate(')

  unmount()
})

Deno.test(
  'MultiSelect: the listbox re-measures and shows again after a query that matched nothing, ' +
    'then matches again — real, confirmed bug: this used to stay permanently closed for the ' +
    'rest of the session, since `open` itself never toggles across that round trip and the ' +
    'position hook was keyed on `open`, never on the listbox actually (re)mounting',
  () => {
    const { container, rerender, unmount } = mount(
      <MultiSelect {...basicProps({ inputValue: '' })} />,
    )
    const input = must(container.querySelector<HTMLInputElement>('input'))
    stubRect(input, { x: 20, y: 40, width: 200, height: 30 })

    act(() => {
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })
    let listbox = must(
      container.querySelector<HTMLElement>('[data-space-ui="multi-select-listbox"]'),
    )
    stubRect(listbox, { x: 0, y: 0, width: 200, height: 90 })
    act(() => dispatchWindowEvent(new Event('resize')))
    assertStringIncludes(
      getDynamicRule(container, listbox, 'data-multi-select-id').style.transform,
      'translate(',
    )

    // A live search matching nothing — the caller's own filtered `options` goes empty while
    // `open` stays exactly as it was (never toggled by this component itself).
    rerender(<MultiSelect {...basicProps({ inputValue: 'nomatch', options: [] })} />)
    assertEquals(container.querySelector('[data-space-ui="multi-select-listbox"]'), null)

    // Back to a query that matches again — the caller's own `options` is a genuinely NEW array
    // (never the identical reference), same as any real caller re-filtering per keystroke.
    // Deliberately NO manual `stubRect`/`resize` trigger here, unlike the setup above — a real
    // caller never fires one either; the remount itself is the only thing that should ever need
    // to re-measure.
    rerender(<MultiSelect {...basicProps({ inputValue: 'en' })} />)
    listbox = must(container.querySelector<HTMLElement>('[data-space-ui="multi-select-listbox"]'))

    // `visibility`, not `transform`: the buggy version DOES still create a fresh CSSOM rule for
    // this new `<ul>` (that part was already correctly keyed on `listboxVisible`) — it just never
    // updates it past its own static base (`MULTI_SELECT_LISTBOX_POSITION_CSS`'s own `visibility:
    // 'hidden'`), because `usePosition`'s own effect never re-ran to produce a fresh `position` to
    // apply. A real caller sees exactly this: a `<ul>` technically in the DOM, permanently
    // invisible.
    assertEquals(
      getDynamicRule(container, listbox, 'data-multi-select-id').style.visibility,
      'visible',
    )

    unmount()
  },
)

Deno.test('MultiSelect: the listbox min-width matches the input — never narrower than the control it belongs to', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps()} />)
  const input = must(container.querySelector<HTMLInputElement>('input'))
  stubRect(input, { x: 20, y: 40, width: 417, height: 38 })

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
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

Deno.test('MultiSelect: nonce lands on the always-rendered wrapper <style> element', () => {
  const html = renderToStaticMarkup(<MultiSelect nonce='abc123' options={[]} />)

  assertStringIncludes(html, '<style nonce="abc123">')
})

// --- required ---------------------------------------------------------------------------------

Deno.test(
  'MultiSelect: required means "at least one chip" — the input stops being required the ' +
    'moment a first chip commits, regardless of its own (still empty) typed text',
  () => {
    const { container, unmount } = mount(
      <MultiSelect {...basicProps({ required: true, defaultValues: [] })} />,
    )
    const input = must(container.querySelector('input'))
    assertEquals(input.required, true)

    act(() => {
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })
    const option = must(container.querySelector('[data-space-ui="multi-select-option"]'))
    act(() => {
      option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    assertEquals(input.required, false)

    unmount()
  },
)

Deno.test('MultiSelect: required is omitted entirely when not requested', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps()} />)
  const input = must(container.querySelector('input'))

  assertEquals(input.required, false)

  unmount()
})

// --- validationMessage -----------------------------------------------------------------------

function inForm(props: Partial<MultiSelectProps> = {}) {
  return (
    <form>
      <MultiSelect {...basicProps(props)} />
    </form>
  )
}

Deno.test('MultiSelect: validationMessage marks the real combobox input invalid through native validation', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Pick two' }))
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  const form = must(container.querySelector('form'))

  assertEquals(control.validity.customError, true)
  assertEquals(control.validationMessage, 'Pick two')
  assertEquals(control.checkValidity(), false)
  assertEquals(form.checkValidity(), false)

  unmount()
})

Deno.test('MultiSelect: no validationMessage leaves the input valid', () => {
  const { container, unmount } = mount(inForm())

  assertEquals(
    must(container.querySelector<HTMLInputElement>('input[role="combobox"]')).validity.customError,
    false,
  )
  assertEquals(must(container.querySelector('form')).checkValidity(), true)

  unmount()
})

Deno.test('MultiSelect: removing validationMessage, or emptying it, clears the error', () => {
  const { container, rerender, unmount } = mount(inForm({ validationMessage: 'Not valid' }))
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  assertEquals(control.validity.customError, true)

  rerender(inForm())
  assertEquals(control.validity.customError, false)
  assertEquals(control.checkValidity(), true)

  rerender(inForm({ validationMessage: 'Not valid' }))
  assertEquals(control.validity.customError, true)
  rerender(inForm({ validationMessage: '' }))
  assertEquals(control.validity.customError, false)

  unmount()
})

Deno.test('MultiSelect: a changed validationMessage replaces the previous one', () => {
  const { container, rerender, unmount } = mount(inForm({ validationMessage: 'First' }))
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  assertEquals(control.validationMessage, 'First')

  rerender(inForm({ validationMessage: 'Second' }))
  assertEquals(control.validationMessage, 'Second')
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('MultiSelect: unmounting clears the error it set', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Not valid' }))
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  assertEquals(control.validity.customError, true)

  unmount()
  assertEquals(control.validity.customError, false)
})

Deno.test('MultiSelect: typing does not clear the error — the open suggestions only hold it back', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Not valid' }))
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))

  act(() => typeInto(control, 'Engl'))
  assertEquals(control.value, 'Engl')
  // The typed text opened the suggestions, so the error is held back while they show.
  assertEquals(control.validity.customError, false)

  // Closing them brings it back: typing never removed the caller's message, only the caller can.
  act(() => {
    control.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
  assertEquals(control.value, 'Engl')
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('MultiSelect: the error sits on the same input `required` applies to, chips or not', () => {
  const empty = mount(inForm({ required: true, validationMessage: 'Pick two' }))
  const emptyInput = must(empty.container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  assertEquals(emptyInput.required, true)
  assertEquals(emptyInput.validity.valueMissing, true)
  assertEquals(emptyInput.validity.customError, true)
  empty.unmount()

  // With a committed chip `required` is dropped from the input, and the caller's error stays: the
  // two are independent, and the chips are siblings of this one input.
  const chipped = mount(
    inForm({ required: true, defaultValues: ['en'], validationMessage: 'Pick two' }),
  )
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

Deno.test('MultiSelect: validationMessage renders nothing on the server', () => {
  const plain = renderToStaticMarkup(inForm())
  const withMessage = renderToStaticMarkup(inForm({ validationMessage: 'Not valid' }))

  assertEquals(withMessage, plain)
  assertEquals(withMessage.includes('Not valid'), false)
})

Deno.test('MultiSelect: validationMessage leaves aria-invalid alone', () => {
  const { container, rerender, unmount } = mount(inForm({ validationMessage: 'Not valid' }))
  const control = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  assertEquals(control.getAttribute('aria-invalid'), null)

  rerender(inForm({ validationMessage: 'Not valid', 'aria-invalid': true }))
  assertEquals(control.getAttribute('aria-invalid'), 'true')

  rerender(inForm({ 'aria-invalid': true }))
  assertEquals(control.validity.customError, false)
  assertEquals(control.getAttribute('aria-invalid'), 'true')

  unmount()
})

// --- validationMessage while the listbox is open ----------------------------------------------
// The browser's validation bubble would sit over the suggestions, so the error is held back while
// they show and applied again, synchronously, when the listbox closes.

function openListbox(input: HTMLInputElement) {
  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
}

function withSubmitButton(props: Partial<MultiSelectProps> = {}) {
  return (
    <form>
      <MultiSelect {...basicProps(props)} />
      <button type='submit'>Save</button>
    </form>
  )
}

Deno.test('MultiSelect: validationMessage is held back while the listbox shows suggestions', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Pick two' }))
  const input = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  const form = must(container.querySelector('form'))
  assertEquals(input.validity.customError, true)

  openListbox(input)
  assertEquals(container.querySelector('[role="listbox"]') !== null, true)
  assertEquals(input.validity.customError, false)
  assertEquals(form.checkValidity(), true)

  unmount()
})

Deno.test('MultiSelect: validationMessage stays applied while the open listbox has nothing to offer', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Pick two', options: [] }))
  const input = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))

  openListbox(input)
  assertEquals(container.querySelector('[role="listbox"]'), null)
  assertEquals(input.validity.customError, true)

  unmount()
})

Deno.test('MultiSelect: validationMessage is applied again when the listbox closes, by every way it can close', () => {
  const closers: Record<string, (input: HTMLInputElement) => void> = {
    Escape: (input) =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    blur: (input) => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })),
    'outside mousedown': () =>
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })),
  }
  for (const [name, close] of Object.entries(closers)) {
    const { container, unmount } = mount(inForm({ validationMessage: 'Pick two' }))
    const input = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
    openListbox(input)
    assertEquals(input.validity.customError, false, `${name}: held back while open`)

    act(() => close(input))
    assertEquals(container.querySelector('[role="listbox"]'), null, `${name}: closed`)
    assertEquals(input.validity.customError, true, `${name}: applied again`)
    unmount()
  }
})

Deno.test('MultiSelect: a selection that closes the listbox applies the message again', () => {
  const { container, unmount } = mount(
    inForm({ validationMessage: 'Pick two', closeOnSelect: true }),
  )
  const input = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
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

Deno.test('MultiSelect: the message is back before a submit click that closes the listbox is validated', () => {
  const { container, unmount } = mount(withSubmitButton({ validationMessage: 'Pick two' }))
  const input = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  const form = must(container.querySelector('form'))
  const button = must(container.querySelector('button'))
  openListbox(input)
  assertEquals(form.checkValidity(), true)

  // `mousedown` on a button outside (closes the listbox), the input's `focusout`, then `click`;
  // nothing here flushes effects, so the message is only there if the closing handler applied it.
  button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  assertEquals(input.validity.customError, true, 'after mousedown')
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  assertEquals(input.validity.customError, true, 'after focusout')
  assertEquals(form.checkValidity(), false, 'the form is invalid when the click validates it')

  unmount()
})

Deno.test('MultiSelect: an Enter with nothing to commit applies the message before the implicit submit', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Pick two' }))
  const input = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  openListbox(input)
  assertEquals(input.validity.customError, false)

  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  assertEquals(input.validity.customError, true)

  unmount()
})

Deno.test('MultiSelect: holding the message back leaves required and aria-invalid alone', () => {
  const { container, unmount } = mount(
    inForm({ required: true, validationMessage: 'Pick two', 'aria-invalid': true }),
  )
  const input = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  openListbox(input)

  assertEquals(input.validity.customError, false)
  assertEquals(input.validity.valueMissing, true)
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  unmount()
})

Deno.test('MultiSelect: unmounting with the listbox open leaves no error behind', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Pick two' }))
  const input = must(container.querySelector<HTMLInputElement>('input[role="combobox"]'))
  openListbox(input)

  unmount()
  assertEquals(input.validity.customError, false)
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

Deno.test('MultiSelect: adding a chip fires a bubbling change event from the input', () => {
  const { container, unmount } = mount(<MultiSelect {...basicProps({ 'aria-invalid': true })} />)
  const changes = collectChanges(container)
  const input = must(container.querySelector<HTMLInputElement>('input'))
  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  assertEquals(changes.length, 0)
  const english = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'English'
    ),
  )
  act(() => {
    english.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(changes.length, 1)
  assertEquals(changes[0], input)
  unmount()
})
