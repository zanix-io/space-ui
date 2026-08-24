import './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { RadioGroup } from 'components/RadioGroup/index.preact.ts'
import type { RadioGroupItem, RadioGroupProps } from 'components/RadioGroup/index.preact.ts'

// Unlike every hookless Preact component in this package, `RadioGroup` uses real hooks — built
// with `h(RadioGroup, props)` and rendered through Preact's own pipeline, not called as a plain
// function. See `counter-preact.test.tsx`'s own doc for the same reasoning.
//
// Test-tier placement: the `ArrowRight`/`ArrowLeft` roving-focus tests below stay in `unit/` —
// see `radio-group.test.tsx`'s own doc (same directory, React version) for the full reasoning.

const items: RadioGroupItem[] = [
  { value: 'small', children: 'Small' },
  { value: 'medium', children: 'Medium' },
  { value: 'large', children: 'Large' },
]

function element(props: RadioGroupProps): VNode {
  return h(RadioGroup, props) as VNode
}

function mount(props: RadioGroupProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: RadioGroupProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function radios(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radio"]'))
}

function arrowKey(target: Element, key: string) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })
}

// --- structure -----------------------------------------------------------------------------

Deno.test('RadioGroup (preact): role="radiogroup" wraps role="radio" items', () => {
  const html = renderToString(element({ items, label: 'Size' }))

  assertStringIncludes(html, 'role="radiogroup"')
  assertStringIncludes(html, 'aria-label="Size"')
  assertEquals((html.match(/role="radio"/g) ?? []).length, 3)
  assertStringIncludes(html, 'data-space-ui="radio-group"')
})

Deno.test('RadioGroup (preact): id/className land on the wrapper', () => {
  const html = renderToString(
    element({ items, label: 'Size', id: 'size-group', className: 'segmented' }),
  )

  const wrapperMatch = html.match(/<div[^>]*id="size-group"[^>]*class="segmented"[^>]*>/)
  assertEquals(wrapperMatch !== null, true)
})

Deno.test('RadioGroup (preact): nothing selected by default, first item tabbable', () => {
  const html = renderToString(element({ items, label: 'Size' }))

  assertEquals(html.includes('aria-checked="true"'), false)
  assertEquals((html.match(/aria-checked="false"/g) ?? []).length, 3)
})

Deno.test('RadioGroup (preact): defaultValue selects the matching item, and only that one', () => {
  const html = renderToString(element({ items, label: 'Size', defaultValue: 'medium' }))

  const checkedStates = html.match(/aria-checked="(true|false)"/g) ?? []
  assertEquals(checkedStates, [
    'aria-checked="false"',
    'aria-checked="true"',
    'aria-checked="false"',
  ])
})

// --- roving tabindex -------------------------------------------------------------------------

Deno.test('RadioGroup (preact): only the active item has tabIndex 0, the rest -1', () => {
  const html = renderToString(element({ items, label: 'Size', defaultValue: 'medium' }))

  assertEquals((html.match(/tabindex="0"/g) ?? []).length, 1)
  assertEquals((html.match(/tabindex="-1"/g) ?? []).length, 2)
})

Deno.test('RadioGroup (preact): with nothing selected, the first item is tabbable', () => {
  const html = renderToString(element({ items, label: 'Size' }))

  const firstTabIndexMatch = html.match(/tabindex="(0|-1)"/)
  assertEquals(firstTabIndexMatch?.[1], '0')
})

// --- click selection, real DOM ----------------------------------------------------------------

Deno.test('RadioGroup (preact): clicking an item selects it — real DOM', () => {
  const { container, unmount } = mount({ items, label: 'Size' })
  const [small, medium] = radios(container)

  assertEquals(small.getAttribute('aria-checked'), 'false')

  act(() => medium.click())

  assertEquals(medium.getAttribute('aria-checked'), 'true')
  assertEquals(small.getAttribute('aria-checked'), 'false')

  unmount()
})

// --- arrow-key roving focus, real DOM ---------------------------------------------------------

Deno.test('RadioGroup (preact): ArrowRight moves focus AND selects the next item', () => {
  const { container, unmount } = mount({ items, label: 'Size', defaultValue: 'small' })
  const [small, medium] = radios(container)

  arrowKey(small, 'ArrowRight')

  assertEquals(medium.getAttribute('aria-checked'), 'true')
  assertEquals(small.getAttribute('aria-checked'), 'false')
  assertEquals(document.activeElement, medium)

  unmount()
})

Deno.test('RadioGroup (preact): ArrowLeft wraps from the first item to the last', () => {
  const { container, unmount } = mount({ items, label: 'Size', defaultValue: 'small' })
  const [small, , large] = radios(container)

  arrowKey(small, 'ArrowLeft')

  assertEquals(large.getAttribute('aria-checked'), 'true')
  assertEquals(document.activeElement, large)

  unmount()
})

Deno.test('RadioGroup (preact): tabIndex follows the newly-selected item after a click', () => {
  const { container, unmount } = mount({ items, label: 'Size' })
  const [small, medium] = radios(container)

  assertEquals(small.getAttribute('tabindex'), '0')
  assertEquals(medium.getAttribute('tabindex'), '-1')

  act(() => medium.click())

  assertEquals(small.getAttribute('tabindex'), '-1')
  assertEquals(medium.getAttribute('tabindex'), '0')

  unmount()
})

Deno.test('RadioGroup (preact): orientation="vertical" ignores ArrowRight/Left', () => {
  const { container, unmount } = mount({
    items,
    label: 'Size',
    defaultValue: 'small',
    orientation: 'vertical',
  })
  const [small, medium] = radios(container)

  arrowKey(small, 'ArrowRight')
  assertEquals(small.getAttribute('aria-checked'), 'true')

  arrowKey(small, 'ArrowDown')
  assertEquals(medium.getAttribute('aria-checked'), 'true')

  unmount()
})

// --- controlled / uncontrolled / onValueChange -------------------------------------------------

Deno.test('RadioGroup (preact): uncontrolled — onValueChange fires, still selects itself', () => {
  const calls: string[] = []
  const { container, unmount } = mount({
    items,
    label: 'Size',
    onValueChange: (next) => calls.push(next),
  })
  const [, medium] = radios(container)

  act(() => medium.click())

  assertEquals(calls, ['medium'])
  assertEquals(medium.getAttribute('aria-checked'), 'true')

  unmount()
})

Deno.test('RadioGroup (preact): controlled — a click notifies but never self-selects', () => {
  const calls: string[] = []
  const { container, unmount } = mount({
    items,
    label: 'Size',
    value: 'small',
    onValueChange: (next) => calls.push(next),
  })
  const [small, medium] = radios(container)

  act(() => medium.click())

  assertEquals(calls, ['medium'])
  assertEquals(small.getAttribute('aria-checked'), 'true')
  assertEquals(medium.getAttribute('aria-checked'), 'false')

  unmount()
})

Deno.test('RadioGroup (preact): controlled — updating value re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount({ items, label: 'Size', value: 'small' })

  rerender({ items, label: 'Size', value: 'large' })

  const [small, , large] = radios(container)
  assertEquals(small.getAttribute('aria-checked'), 'false')
  assertEquals(large.getAttribute('aria-checked'), 'true')

  unmount()
})

Deno.test('RadioGroup (preact): value takes precedence over defaultValue', () => {
  const html = renderToString(
    element({ items, label: 'Size', value: 'large', defaultValue: 'small' }),
  )

  const checkedStates = html.match(/aria-checked="(true|false)"/g) ?? []
  assertEquals(checkedStates, [
    'aria-checked="false"',
    'aria-checked="false"',
    'aria-checked="true"',
  ])
})
