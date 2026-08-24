import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Input } from 'components/Input/index.preact.ts'
import type { InputProps } from 'components/Input/index.preact.ts'

// Unlike every hookless Preact component in this package, `Input` uses real hooks — built with
// `h(Input, props)` and rendered through Preact's own pipeline, same reasoning
// `combobox-preact.test.tsx`/`counter-preact.test.tsx` already establish.

function typeInto(input: HTMLInputElement, text: string) {
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function element(props: InputProps): VNode {
  return h(Input, props) as VNode
}

function mount(props: InputProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: InputProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Input (preact): SSR — a bare text input, data-space-ui', () => {
  const html = renderToString(element({ 'aria-label': 'Name' }))
  assertStringIncludes(html, 'data-space-ui="input"')
  assertStringIncludes(html, 'type="text"')
})

// --- real DOM: the onInput/onChange divergence, the reason this binding differs from React ------

Deno.test('Input (preact): typing updates the value live, per keystroke', () => {
  const values: string[] = []
  const { container, unmount } = mount({
    'aria-label': 'Name',
    onValueChange: (v) => values.push(v),
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => typeInto(input, 'a'))
  act(() => typeInto(input, 'ab'))

  assertEquals(input.value, 'ab')
  assertEquals(values, ['a', 'ab'])

  unmount()
})

// --- real DOM: controlled ----------------------------------------------------------------------

Deno.test('Input (preact): controlled — typing notifies but never self-mutates', () => {
  const values: string[] = []
  const { container, unmount } = mount({
    'aria-label': 'Name',
    value: 'fixed',
    onValueChange: (v) => values.push(v),
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => typeInto(input, 'changed'))

  assertEquals(values, ['changed'])
  assertEquals(input.value, 'fixed')

  unmount()
})

// --- native attribute passthrough ---------------------------------------------------------------

Deno.test('Input (preact): native attributes pass straight through', () => {
  const { container, unmount } = mount({
    'aria-label': 'Age',
    type: 'number',
    min: 0,
    max: 120,
    step: 1,
    disabled: true,
    required: true,
    name: 'age',
    id: 'age-input',
    className: 'age',
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.type, 'number')
  assertEquals(input.min, '0')
  assertEquals(input.max, '120')
  assertEquals(input.step, '1')
  assertEquals(input.disabled, true)
  assertEquals(input.required, true)
  assertEquals(input.name, 'age')
  assertEquals(input.id, 'age-input')
  assertEquals(input.className, 'age')

  unmount()
})

// --- Field composition (FieldRenderProps shape) --------------------------------------------

Deno.test('Input (preact): composes cleanly with the props Field.children hands back', () => {
  const { container, unmount } = mount({
    id: 'email-input',
    'aria-describedby': 'email-hint email-error',
    'aria-invalid': true,
    'aria-label': 'Email',
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.id, 'email-input')
  assertEquals(input.getAttribute('aria-describedby'), 'email-hint email-error')
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  unmount()
})
