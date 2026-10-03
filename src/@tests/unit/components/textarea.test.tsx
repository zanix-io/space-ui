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

// --- validationMessage -----------------------------------------------------------------------

function inForm(props: Partial<Parameters<typeof Textarea>[0]> = {}) {
  return (
    <form>
      <Textarea aria-label='Field' {...props} />
    </form>
  )
}

Deno.test('Textarea: validationMessage marks the real textarea invalid through native validation', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Not acceptable' }))
  const control = must(container.querySelector('textarea'))
  const form = must(container.querySelector('form'))

  assertEquals(control.validity.customError, true)
  assertEquals(control.validationMessage, 'Not acceptable')
  assertEquals(control.checkValidity(), false)
  assertEquals(form.checkValidity(), false)

  unmount()
})

Deno.test('Textarea: no validationMessage leaves the textarea valid', () => {
  const { container, unmount } = mount(inForm())

  assertEquals(must(container.querySelector('textarea')).validity.customError, false)
  assertEquals(must(container.querySelector('form')).checkValidity(), true)

  unmount()
})

Deno.test('Textarea: removing validationMessage, or emptying it, clears the error', () => {
  const { container, rerender, unmount } = mount(inForm({ validationMessage: 'Not valid' }))
  const control = must(container.querySelector('textarea'))
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

Deno.test('Textarea: a changed validationMessage replaces the previous one', () => {
  const { container, rerender, unmount } = mount(inForm({ validationMessage: 'First' }))
  const control = must(container.querySelector('textarea'))
  assertEquals(control.validationMessage, 'First')

  rerender(inForm({ validationMessage: 'Second' }))
  assertEquals(control.validationMessage, 'Second')
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('Textarea: unmounting clears the error it set', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Not valid' }))
  const control = must(container.querySelector('textarea'))
  assertEquals(control.validity.customError, true)

  unmount()
  assertEquals(control.validity.customError, false)
})

Deno.test('Textarea: typing does not clear the error — only the caller does', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Not valid' }))
  const control = must(container.querySelector('textarea'))

  typeInto(control, 'something else')
  assertEquals(control.value, 'something else')
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('Textarea: validationMessage renders nothing on the server', () => {
  const plain = renderToStaticMarkup(inForm())
  const withMessage = renderToStaticMarkup(inForm({ validationMessage: 'Not valid' }))

  assertEquals(withMessage, plain)
  assertEquals(withMessage.includes('Not valid'), false)
})

Deno.test('Textarea: validationMessage coexists with required, and leaves aria-invalid alone', () => {
  const { container, rerender, unmount } = mount(
    inForm({ required: true, validationMessage: 'Not valid' }),
  )
  const control = must(container.querySelector('textarea'))

  assertEquals(control.validity.valueMissing, true)
  assertEquals(control.validity.customError, true)
  assertEquals(control.getAttribute('aria-invalid'), null)

  rerender(inForm({ required: true, validationMessage: 'Not valid', 'aria-invalid': true }))
  assertEquals(control.getAttribute('aria-invalid'), 'true')

  rerender(inForm({ required: true, 'aria-invalid': true }))
  assertEquals(control.validity.valueMissing, true)
  assertEquals(control.validity.customError, false)
  assertEquals(control.getAttribute('aria-invalid'), 'true')

  unmount()
})
