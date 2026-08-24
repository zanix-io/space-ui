import './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { RadioGroup } from 'components/RadioGroup/index.ts'
import type { RadioGroupItem } from 'components/RadioGroup/index.ts'

/**
 * Test-tier placement decision (audit, 2026-08-21): the arrow-key roving-focus tests below
 * (`ArrowRight`/`ArrowLeft`) move focus AND selection across two real sibling `Button` instances,
 * which superficially resembles the confirmed `Accordion`/`Toast`/`Menu`/`Pagination`
 * cross-component-composition moves to `integration/`. Deliberately kept in `unit/` instead:
 * the coordination here is mediated by `shared/roving-focus.ts`, a package-internal foundation
 * PRIMITIVE (same category as `close-on-outside.ts`/`focus-scope.ts`/`positioning.ts` — see
 * `space-ui-foundation-primitives`, and `space-ui-architecture`'s rejected-abstractions section,
 * which names roving focus as "the one real transversal sub-need... already named as its own
 * primitive"), not a second independently-published component with its own public contract the
 * way `Disclosure`/`Alert`/`ProgressBar` are. Arrow-key navigation is part of `RadioGroup`'s OWN
 * documented keyboard contract, exercised here against real `Button`s the same way any single
 * component's own behavior is verified against its real rendered output — it isn't proof of two
 * independent published components' contracts interacting. `roving-focus.ts` itself already has
 * its own isolated `unit/components/roving-focus.test.ts` coverage. Contrast with `Pagination`'s
 * click-navigation tests (moved to `integration/`): those coordinate two `Button`s directly
 * through `Pagination`'s own state, with no primitive layer involved at all.
 */

const items: RadioGroupItem[] = [
  { value: 'small', children: 'Small' },
  { value: 'medium', children: 'Medium' },
  { value: 'large', children: 'Large' },
]

function mount(element: ReturnType<typeof RadioGroup>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof RadioGroup>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
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

Deno.test('RadioGroup: role="radiogroup" wraps role="radio" items, aria-label set', () => {
  const html = renderToStaticMarkup(<RadioGroup items={items} label='Size' />)

  assertStringIncludes(html, 'role="radiogroup"')
  assertStringIncludes(html, 'aria-label="Size"')
  assertEquals((html.match(/role="radio"/g) ?? []).length, 3)
  assertStringIncludes(html, 'data-space-ui="radio-group"')
})

Deno.test('RadioGroup: id/className land on the wrapper', () => {
  const html = renderToStaticMarkup(
    <RadioGroup items={items} label='Size' id='size-group' className='segmented' />,
  )

  const wrapperMatch = html.match(/<div[^>]*id="size-group"[^>]*class="segmented"[^>]*>/)
  assertEquals(wrapperMatch !== null, true)
})

Deno.test('RadioGroup: nothing selected by default — no item checked, first item tabbable', () => {
  const html = renderToStaticMarkup(<RadioGroup items={items} label='Size' />)

  assertEquals(html.includes('aria-checked="true"'), false)
  assertEquals((html.match(/aria-checked="false"/g) ?? []).length, 3)
})

Deno.test('RadioGroup: defaultValue selects the matching item, and only that one', () => {
  const html = renderToStaticMarkup(<RadioGroup items={items} label='Size' defaultValue='medium' />)

  const checkedStates = html.match(/aria-checked="(true|false)"/g) ?? []
  assertEquals(checkedStates, [
    'aria-checked="false"', // small
    'aria-checked="true"', // medium
    'aria-checked="false"', // large
  ])
})

// --- roving tabindex -------------------------------------------------------------------------

Deno.test('RadioGroup: only the active item has tabIndex 0, the rest -1', () => {
  const html = renderToStaticMarkup(<RadioGroup items={items} label='Size' defaultValue='medium' />)

  assertEquals((html.match(/tabindex="0"/g) ?? []).length, 1)
  assertEquals((html.match(/tabindex="-1"/g) ?? []).length, 2)
})

Deno.test('RadioGroup: with nothing selected, the FIRST item is the tabbable one', () => {
  const html = renderToStaticMarkup(<RadioGroup items={items} label='Size' />)

  const firstTabIndexMatch = html.match(/tabindex="(0|-1)"/)
  assertEquals(firstTabIndexMatch?.[1], '0')
})

// --- click selection, real DOM ----------------------------------------------------------------

Deno.test('RadioGroup: clicking an item selects it — real DOM', () => {
  const { container, unmount } = mount(<RadioGroup items={items} label='Size' />)
  const [small, medium] = radios(container)

  assertEquals(small.getAttribute('aria-checked'), 'false')

  act(() => medium.click())

  assertEquals(medium.getAttribute('aria-checked'), 'true')
  assertEquals(small.getAttribute('aria-checked'), 'false')

  unmount()
})

// --- arrow-key roving focus, real DOM ---------------------------------------------------------

Deno.test('RadioGroup: ArrowRight moves focus AND selects the next item — real DOM', () => {
  const { container, unmount } = mount(
    <RadioGroup items={items} label='Size' defaultValue='small' />,
  )
  const [small, medium] = radios(container)

  arrowKey(small, 'ArrowRight')

  assertEquals(medium.getAttribute('aria-checked'), 'true')
  assertEquals(small.getAttribute('aria-checked'), 'false')
  assertEquals(document.activeElement, medium)

  unmount()
})

Deno.test('RadioGroup: ArrowLeft wraps from the first item to the last — real DOM', () => {
  const { container, unmount } = mount(
    <RadioGroup items={items} label='Size' defaultValue='small' />,
  )
  const [small, , large] = radios(container)

  arrowKey(small, 'ArrowLeft')

  assertEquals(large.getAttribute('aria-checked'), 'true')
  assertEquals(document.activeElement, large)

  unmount()
})

Deno.test('RadioGroup: tabIndex updates to follow the newly-selected item after a click', () => {
  const { container, unmount } = mount(<RadioGroup items={items} label='Size' />)
  const [small, medium] = radios(container)

  assertEquals(small.getAttribute('tabindex'), '0')
  assertEquals(medium.getAttribute('tabindex'), '-1')

  act(() => medium.click())

  assertEquals(small.getAttribute('tabindex'), '-1')
  assertEquals(medium.getAttribute('tabindex'), '0')

  unmount()
})

Deno.test('RadioGroup: orientation="vertical" responds to ArrowDown, not ArrowRight', () => {
  const { container, unmount } = mount(
    <RadioGroup items={items} label='Size' defaultValue='small' orientation='vertical' />,
  )
  const [small, medium] = radios(container)

  arrowKey(small, 'ArrowRight') // wrong axis — no-op
  assertEquals(small.getAttribute('aria-checked'), 'true')

  arrowKey(small, 'ArrowDown')
  assertEquals(medium.getAttribute('aria-checked'), 'true')

  unmount()
})

// --- controlled / uncontrolled / onValueChange -------------------------------------------------

Deno.test('RadioGroup: uncontrolled — onValueChange fires, the item still selects itself', () => {
  const calls: string[] = []
  const { container, unmount } = mount(
    <RadioGroup items={items} label='Size' onValueChange={(next) => calls.push(next)} />,
  )
  const [, medium] = radios(container)

  act(() => medium.click())

  assertEquals(calls, ['medium'])
  assertEquals(medium.getAttribute('aria-checked'), 'true')

  unmount()
})

Deno.test('RadioGroup: controlled — a click notifies onValueChange but never self-selects', () => {
  const calls: string[] = []
  const { container, unmount } = mount(
    <RadioGroup
      items={items}
      label='Size'
      value='small'
      onValueChange={(next) => calls.push(next)}
    />,
  )
  const [small, medium] = radios(container)

  act(() => medium.click())

  assertEquals(calls, ['medium'])
  assertEquals(small.getAttribute('aria-checked'), 'true')
  assertEquals(medium.getAttribute('aria-checked'), 'false')

  unmount()
})

Deno.test('RadioGroup: controlled — updating value re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount(
    <RadioGroup items={items} label='Size' value='small' />,
  )

  rerender(<RadioGroup items={items} label='Size' value='large' />)

  const [small, , large] = radios(container)
  assertEquals(small.getAttribute('aria-checked'), 'false')
  assertEquals(large.getAttribute('aria-checked'), 'true')

  unmount()
})

Deno.test('RadioGroup: value takes precedence over defaultValue when both are given', () => {
  const html = renderToStaticMarkup(
    <RadioGroup items={items} label='Size' value='large' defaultValue='small' />,
  )

  const checkedStates = html.match(/aria-checked="(true|false)"/g) ?? []
  assertEquals(checkedStates, [
    'aria-checked="false"', // small
    'aria-checked="false"', // medium
    'aria-checked="true"', // large
  ])
})
