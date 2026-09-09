import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Textarea } from 'components/Textarea/index.ts'

// Same real-value-tracker-bypassing technique `input.test.tsx` already establishes and explains
// in full — React installs the identical "value tracker" on a native `<textarea>` as it does on
// an `<input>`, to distinguish a real user edit from a programmatic `.value =` assignment.
function typeInto(textarea: HTMLTextAreaElement, text: string) {
  const descriptor = must(
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(textarea), 'value'),
  )
  const nativeSetter = must(descriptor.set)
  nativeSetter.call(textarea, text)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

function mount(element: ReturnType<typeof Textarea>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Textarea>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Textarea: SSR — a bare textarea, data-space-ui, default rows, no value yet', () => {
  const html = renderToStaticMarkup(<Textarea aria-label='Notes' />)

  assertStringIncludes(html, 'data-space-ui="textarea"')
  assertStringIncludes(html, 'rows="4"')
})

Deno.test('Textarea: defaultValue seeds the first render', () => {
  const html = renderToStaticMarkup(<Textarea defaultValue='hello' aria-label='Notes' />)
  assertStringIncludes(html, '>hello</textarea>')
})

// --- real DOM: uncontrolled typing -----------------------------------------------------------

Deno.test('Textarea: uncontrolled — typing updates the value live, per keystroke', () => {
  const values: string[] = []
  const { container, unmount } = mount(
    <Textarea aria-label='Notes' onValueChange={(v) => values.push(v)} />,
  )
  const textarea = must(container.querySelector<HTMLTextAreaElement>('textarea'))

  act(() => typeInto(textarea, 'a'))
  act(() => typeInto(textarea, 'ab'))

  assertEquals(textarea.value, 'ab')
  assertEquals(values, ['a', 'ab'])

  unmount()
})

// --- real DOM: controlled ----------------------------------------------------------------------

Deno.test('Textarea: controlled — typing notifies but never self-mutates', () => {
  const values: string[] = []
  const { container, unmount } = mount(
    <Textarea aria-label='Notes' value='fixed' onValueChange={(v) => values.push(v)} />,
  )
  const textarea = must(container.querySelector<HTMLTextAreaElement>('textarea'))

  act(() => typeInto(textarea, 'changed'))

  assertEquals(values, ['changed'])
  assertEquals(textarea.value, 'fixed')

  unmount()
})

Deno.test('Textarea: controlled value updates on rerender', () => {
  const { container, rerender, unmount } = mount(<Textarea aria-label='Notes' value='one' />)
  const textarea = must(container.querySelector<HTMLTextAreaElement>('textarea'))
  assertEquals(textarea.value, 'one')

  rerender(<Textarea aria-label='Notes' value='two' />)
  assertEquals(textarea.value, 'two')

  unmount()
})

// --- native attribute passthrough ---------------------------------------------------------------

Deno.test('Textarea: native attributes pass straight through', () => {
  const { container, unmount } = mount(
    <Textarea
      aria-label='Bio'
      rows={6}
      cols={40}
      wrap='hard'
      placeholder='Tell us about yourself'
      disabled
      required
      maxLength={280}
      autoComplete='off'
      name='bio'
      id='bio-textarea'
      className='bio'
    />,
  )
  const textarea = must(container.querySelector<HTMLTextAreaElement>('textarea'))

  // `rows`/`cols` via `getAttribute`, not the IDL `.rows`/`.cols` properties — happy-dom (this
  // test environment) reflects both as strings rather than the spec's `long`, same reason `wrap`
  // below is already checked this way; asserting the real rendered attribute is what's actually
  // under test here, not this environment's own IDL-reflection fidelity.
  assertEquals(textarea.getAttribute('rows'), '6')
  assertEquals(textarea.getAttribute('cols'), '40')
  assertEquals(textarea.getAttribute('wrap'), 'hard')
  assertEquals(textarea.placeholder, 'Tell us about yourself')
  assertEquals(textarea.disabled, true)
  assertEquals(textarea.required, true)
  assertEquals(textarea.maxLength, 280)
  assertEquals(textarea.autocomplete, 'off')
  assertEquals(textarea.name, 'bio')
  assertEquals(textarea.id, 'bio-textarea')
  assertEquals(textarea.className, 'bio')

  unmount()
})

Deno.test('Textarea: readOnly passes through', () => {
  const { container, unmount } = mount(<Textarea aria-label='Notes' readOnly value='fixed' />)
  const textarea = must(container.querySelector<HTMLTextAreaElement>('textarea'))
  assertEquals(textarea.readOnly, true)
  unmount()
})

Deno.test('Textarea: rows defaults to 4 when omitted', () => {
  const { container, unmount } = mount(<Textarea aria-label='Notes' />)
  const textarea = must(container.querySelector<HTMLTextAreaElement>('textarea'))
  assertEquals(textarea.getAttribute('rows'), '4')
  unmount()
})

// --- Field composition (FieldRenderProps shape) --------------------------------------------

Deno.test('Textarea: composes cleanly with the props Field.children hands back', () => {
  const { container, unmount } = mount(
    <Textarea
      id='bio-textarea'
      aria-describedby='bio-hint bio-error'
      aria-invalid
      aria-label='Bio'
    />,
  )
  const textarea = must(container.querySelector<HTMLTextAreaElement>('textarea'))

  assertEquals(textarea.id, 'bio-textarea')
  assertEquals(textarea.getAttribute('aria-describedby'), 'bio-hint bio-error')
  assertEquals(textarea.getAttribute('aria-invalid'), 'true')

  unmount()
})
