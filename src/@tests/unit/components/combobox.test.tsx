import { dispatchWindowEvent, must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Combobox } from 'components/Combobox/index.ts'
import type { ComboboxOption } from 'components/Combobox/types.ts'

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

// React installs a "value tracker" on native inputs to distinguish a real user edit from a
// programmatic `.value =` assignment — setting `.value` directly and dispatching a plain `input`
// event is silently ignored unless it goes through the native property setter this way, bypassing
// that tracker the same way `@testing-library/user-event` does internally.
function typeInto(input: HTMLInputElement, text: string) {
  const descriptor = must(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value'))
  const nativeSetter = must(descriptor.set)
  nativeSetter.call(input, text)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function mount(element: ReturnType<typeof Combobox>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Combobox>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

const FRUITS: ComboboxOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry', disabled: true },
]

function basicCombobox(options: ComboboxOption[] = FRUITS) {
  return <Combobox options={options} aria-label='Fruit' />
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Combobox: SSR — the input carries role=combobox, closed, no listbox', () => {
  const html = renderToStaticMarkup(basicCombobox())

  assertStringIncludes(html, 'role="combobox"')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('role="listbox"'), false)
})

Deno.test('Combobox: aria-controls on the input cross-references the listbox id', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  const listbox = must(container.querySelector('[data-space-ui="combobox-listbox"]'))

  assertEquals(input.getAttribute('aria-controls'), listbox.id)

  unmount()
})

// --- real DOM: opening, typing, selecting --------------------------------------------------

Deno.test('Combobox: focusing the input opens the listbox', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector('input'))

  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)
  assertEquals(input.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test('Combobox: typing updates the input value and opens the listbox', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    typeInto(input, 'ap')
  })

  assertEquals(input.value, 'ap')
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  unmount()
})

Deno.test('Combobox: the options render as role=option items with the given labels', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })

  const options = Array.from(container.querySelectorAll('[role="option"]'))
  assertEquals(options.map((option) => option.textContent), ['Apple', 'Banana', 'Cherry'])

  unmount()
})

Deno.test('Combobox: clicking an option selects it, fills the input, and closes', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <Combobox options={FRUITS} aria-label='Fruit' onValueChange={(v) => values.push(v)} />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
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

Deno.test('Combobox: hovering an option makes it the highlighted (active) one', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  const bananaOption = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'Banana'
    ),
  )

  act(() => {
    // React delegates `onMouseEnter` from the native, bubbling `mouseover` event (never listens
    // for a raw `mouseenter` directly) — same reasoning `Tooltip`/`Menu`'s own hover tests already
    // rely on for their `onMouseEnter`/`onMouseLeave` props.
    bananaOption.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })

  assertEquals(input.getAttribute('aria-activedescendant'), bananaOption.id)

  unmount()
})

Deno.test('Combobox: a mousedown on an option never blurs/closes it before the click lands', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  const appleOption = must(
    Array.from(container.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent === 'Apple'
    ),
  )

  act(() => {
    appleOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  })

  // Still open — a bare mousedown (before the matching click) must not have blurred/closed it.
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  unmount()
})

Deno.test('Combobox: clicking a disabled option does nothing', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <Combobox options={FRUITS} aria-label='Fruit' onValueChange={(v) => values.push(v)} />,
  )
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
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

Deno.test('Combobox: ArrowDown from nothing highlighted lands on the first option', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })

  const activeId = input.getAttribute('aria-activedescendant')
  const apple = must(container.querySelector('[data-space-ui="combobox-option"]'))
  assertEquals(activeId, apple.id)
  assertStringIncludes(apple.id, 'apple')

  unmount()
})

Deno.test('Combobox: ArrowUp from nothing highlighted lands on the last option', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  })

  const activeId = input.getAttribute('aria-activedescendant')
  assertStringIncludes(must(activeId), 'cherry')

  unmount()
})

Deno.test('Combobox: ArrowDown repeatedly wraps back to the first option', () => {
  // Each press must be its own `act()` — dispatching all four inside a single `act()` call lets
  // React batch every `setActiveIndex` together, so `handleKeyDown`'s closure sees the SAME stale
  // `activeIndex` (still `null`) on every dispatch and the "already highlighted, step forward"
  // branch (`getNextRovingIndex`) never actually runs — every press would independently land on
  // `apple` again instead of stepping through the list, and the final assertion would pass for the
  // wrong reason. A real keypress in a real browser is always its own event-loop turn, so this
  // mirrors that instead of batching.
  const { container, unmount } = mount(basicCombobox())
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

Deno.test('Combobox: ArrowDown/ArrowUp with no options is a no-op', () => {
  const { container, unmount } = mount(basicCombobox([]))
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
  'Combobox: a key that maps to no navigation, with nothing highlighted, is a no-op',
  () => {
    const { container, unmount } = mount(basicCombobox())
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    })

    assertEquals(input.getAttribute('aria-expanded'), 'false')
    assertEquals(input.getAttribute('aria-activedescendant'), null)

    unmount()
  },
)

Deno.test('Combobox: Escape while already closed is a no-op', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(input.getAttribute('aria-expanded'), 'false')
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  unmount()
})

Deno.test('Combobox: Enter selects the highlighted option', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <Combobox options={FRUITS} aria-label='Fruit' onValueChange={(v) => values.push(v)} />,
  )
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

Deno.test('Combobox: Enter with nothing highlighted selects nothing', () => {
  const values: (string | null)[] = []
  const { container, unmount } = mount(
    <Combobox options={FRUITS} aria-label='Fruit' onValueChange={(v) => values.push(v)} />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })

  assertEquals(values, [])

  unmount()
})

Deno.test('Combobox: Escape closes it without selecting, keeping the typed text', () => {
  const { container, unmount } = mount(basicCombobox())
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

Deno.test('Combobox: the highlighted option resets when the options set itself changes', () => {
  const { container, rerender, unmount } = mount(basicCombobox(FRUITS))
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  })
  assertStringIncludes(must(input.getAttribute('aria-activedescendant')), 'apple')

  rerender(basicCombobox([{ value: 'kiwi', label: 'Kiwi' }]))

  assertEquals(input.getAttribute('aria-activedescendant'), null)

  unmount()
})

Deno.test(
  'Combobox: Enter is a no-op when the highlighted index outlives a same-key options swap',
  () => {
    // The reset above keys off `options.map((o) => o.value).join(' ')` — a cheap, usually-sound
    // heuristic, not a true identity/length check. A value containing the same separator the join
    // uses can make two DIFFERENT-length option sets collide on that string: 3 options collapse to
    // the same key as 2 differently-shaped ones below. When that happens, `activeIndex` survives
    // the swap unreset and can point past the new (shorter) array — this is exactly what the Enter
    // handler's own `if (!option) return` guards against; this test forces that exact collision
    // rather than assuming it away. Same case `combobox-preact.test.tsx`'s identical test covers.
    const values: (string | null)[] = []
    const { container, rerender, unmount } = mount(
      <Combobox
        options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, {
          value: 'c',
          label: 'C',
        }]}
        aria-label='Fruit'
        onValueChange={(v) => values.push(v)}
      />,
    )
    const input = must(container.querySelector<HTMLInputElement>('input'))

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    assertStringIncludes(must(input.getAttribute('aria-activedescendant')), 'c')

    // New set: only 2 options, but `['a b', 'c'].join(' ')` === `['a', 'b', 'c'].join(' ')` — same
    // key, so the reset never fires, and the highlighted index (2) now points past this array's
    // own last index (1).
    rerender(
      <Combobox
        options={[{ value: 'a b', label: 'AB' }, { value: 'c', label: 'C' }]}
        aria-label='Fruit'
        onValueChange={(v) => values.push(v)}
      />,
    )

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    assertEquals(values, [])
    assertEquals(input.value, '')

    unmount()
  },
)

// --- closing: outside click, blur -------------------------------------------------------------

Deno.test('Combobox: an outside click closes it', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  unmount()
})

Deno.test('Combobox: blurring the input (e.g. Tab away) closes it', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  act(() => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  unmount()
})

// --- positioning -----------------------------------------------------------------------------

Deno.test('Combobox: the listbox is positioned via the input reference rect', () => {
  const { container, unmount } = mount(basicCombobox())
  const input = must(container.querySelector<HTMLInputElement>('input'))
  stubRect(input, { x: 20, y: 40, width: 200, height: 30 })

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  const listbox = must(container.querySelector<HTMLElement>('[data-space-ui="combobox-listbox"]'))
  stubRect(listbox, { x: 0, y: 0, width: 200, height: 90 })

  act(() => dispatchWindowEvent(new Event('resize')))

  assertEquals(listbox.style.position, 'fixed')
  assertStringIncludes(listbox.style.transform, 'translate(')

  unmount()
})

// --- controlled / uncontrolled -----------------------------------------------------------------

Deno.test('Combobox: uncontrolled open — onOpenChange fires, still opens itself', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Combobox options={FRUITS} aria-label='Fruit' onOpenChange={(next) => calls.push(next)} />,
  )
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]') !== null, true)

  unmount()
})

Deno.test('Combobox: controlled open — focusing notifies but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Combobox
      options={FRUITS}
      aria-label='Fruit'
      open={false}
      onOpenChange={(next) => calls.push(next)}
    />,
  )
  const input = must(container.querySelector('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="combobox-listbox"]'), null)

  unmount()
})

Deno.test('Combobox: controlled value/inputValue — a selection notifies, never mutates', () => {
  const values: (string | null)[] = []
  const inputValues: string[] = []
  const { container, unmount } = mount(
    <Combobox
      options={FRUITS}
      aria-label='Fruit'
      value={null}
      inputValue=''
      onValueChange={(v) => values.push(v)}
      onInputValueChange={(v) => inputValues.push(v)}
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => {
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  const appleOption = must(container.querySelector('[role="option"]'))

  act(() => {
    appleOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    appleOption.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  assertEquals(values, ['apple'])
  assertEquals(inputValues, ['Apple'])
  // Controlled props were held at their original values (`value={null}`, `inputValue=''`) — the
  // component never self-mutated despite notifying.
  assertEquals(input.value, '')

  unmount()
})

// --- id/className ----------------------------------------------------------------------------

Deno.test('Combobox: id/className land on the input', () => {
  const { container, unmount } = mount(
    <Combobox
      options={FRUITS}
      aria-label='Fruit'
      id='country-search'
      className='combobox-input'
    />,
  )
  const input = must(container.querySelector('input'))
  assertEquals(input.id, 'country-search')
  assertEquals(input.className, 'combobox-input')

  unmount()
})
