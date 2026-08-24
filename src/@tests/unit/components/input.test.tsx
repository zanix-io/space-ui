import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Input } from 'components/Input/index.ts'

// Same real-value-tracker-bypassing technique `combobox.test.tsx` already establishes and
// explains in full — needed because React installs a "value tracker" on native inputs to
// distinguish a real user edit from a programmatic `.value =` assignment.
function typeInto(input: HTMLInputElement, text: string) {
  const descriptor = must(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value'))
  const nativeSetter = must(descriptor.set)
  nativeSetter.call(input, text)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function mount(element: ReturnType<typeof Input>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Input>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Input: SSR — a bare text input, data-space-ui, no value yet', () => {
  const html = renderToStaticMarkup(<Input aria-label='Name' />)

  assertStringIncludes(html, 'data-space-ui="input"')
  assertStringIncludes(html, 'type="text"')
})

Deno.test('Input: type is passed through verbatim', () => {
  const html = renderToStaticMarkup(<Input type='email' aria-label='Email' />)
  assertStringIncludes(html, 'type="email"')
})

Deno.test('Input: defaultValue seeds the first render', () => {
  const html = renderToStaticMarkup(<Input defaultValue='hello' aria-label='Name' />)
  assertStringIncludes(html, 'value="hello"')
})

// --- real DOM: uncontrolled typing -----------------------------------------------------------

Deno.test('Input: uncontrolled — typing updates the value live, per keystroke', () => {
  const values: string[] = []
  const { container, unmount } = mount(
    <Input aria-label='Name' onValueChange={(v) => values.push(v)} />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => typeInto(input, 'a'))
  act(() => typeInto(input, 'ab'))

  assertEquals(input.value, 'ab')
  assertEquals(values, ['a', 'ab'])

  unmount()
})

// --- real DOM: controlled ----------------------------------------------------------------------

Deno.test('Input: controlled — typing notifies but never self-mutates', () => {
  const values: string[] = []
  const { container, unmount } = mount(
    <Input aria-label='Name' value='fixed' onValueChange={(v) => values.push(v)} />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  act(() => typeInto(input, 'changed'))

  assertEquals(values, ['changed'])
  assertEquals(input.value, 'fixed')

  unmount()
})

Deno.test('Input: controlled value updates on rerender', () => {
  const { container, rerender, unmount } = mount(<Input aria-label='Name' value='one' />)
  const input = must(container.querySelector<HTMLInputElement>('input'))
  assertEquals(input.value, 'one')

  rerender(<Input aria-label='Name' value='two' />)
  assertEquals(input.value, 'two')

  unmount()
})

// --- native attribute passthrough ---------------------------------------------------------------

Deno.test('Input: native attributes pass straight through', () => {
  const { container, unmount } = mount(
    <Input
      aria-label='Age'
      type='number'
      min={0}
      max={120}
      step={1}
      placeholder='Age'
      disabled
      required
      maxLength={3}
      pattern='[0-9]*'
      autoComplete='off'
      name='age'
      id='age-input'
      className='age'
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.type, 'number')
  assertEquals(input.min, '0')
  assertEquals(input.max, '120')
  assertEquals(input.step, '1')
  assertEquals(input.placeholder, 'Age')
  assertEquals(input.disabled, true)
  assertEquals(input.required, true)
  assertEquals(input.maxLength, 3)
  assertEquals(input.pattern, '[0-9]*')
  assertEquals(input.autocomplete, 'off')
  assertEquals(input.name, 'age')
  assertEquals(input.id, 'age-input')
  assertEquals(input.className, 'age')

  unmount()
})

Deno.test('Input: readOnly passes through', () => {
  const { container, unmount } = mount(<Input aria-label='Name' readOnly value='fixed' />)
  const input = must(container.querySelector<HTMLInputElement>('input'))
  assertEquals(input.readOnly, true)
  unmount()
})

// --- Field composition (FieldRenderProps shape) --------------------------------------------

Deno.test('Input: composes cleanly with the props Field.children hands back', () => {
  const { container, unmount } = mount(
    <Input
      id='email-input'
      aria-describedby='email-hint email-error'
      aria-invalid
      aria-label='Email'
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.id, 'email-input')
  assertEquals(input.getAttribute('aria-describedby'), 'email-hint email-error')
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  unmount()
})
