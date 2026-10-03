import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Textarea } from 'components/Textarea/index.preact.ts'
import type { TextareaProps } from 'components/Textarea/index.preact.ts'

// Unlike every hookless Preact component in this package, `Textarea` uses real hooks — built with
// `h(Textarea, props)` and rendered through Preact's own pipeline, same reasoning
// `input-preact.test.tsx` already establishes.

function typeInto(textarea: HTMLTextAreaElement, text: string) {
  textarea.value = text
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

function element(props: TextareaProps): VNode {
  return h(Textarea, props) as VNode
}

function mount(props: TextareaProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: TextareaProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Textarea (preact): SSR — a bare textarea, data-space-ui, default rows', () => {
  const html = renderToString(element({ 'aria-label': 'Notes' }))
  assertStringIncludes(html, 'data-space-ui="textarea"')
  assertStringIncludes(html, 'rows="4"')
})

// --- real DOM: the onInput/onChange divergence, the reason this binding differs from React ------

Deno.test('Textarea (preact): typing updates the value live, per keystroke', () => {
  const values: string[] = []
  const { container, unmount } = mount({
    'aria-label': 'Notes',
    onValueChange: (v) => values.push(v),
  })
  const textarea = must(container.querySelector<HTMLTextAreaElement>('textarea'))

  act(() => typeInto(textarea, 'a'))
  act(() => typeInto(textarea, 'ab'))

  assertEquals(textarea.value, 'ab')
  assertEquals(values, ['a', 'ab'])

  unmount()
})

// --- real DOM: controlled ----------------------------------------------------------------------

Deno.test('Textarea (preact): controlled — typing notifies but never self-mutates', () => {
  const values: string[] = []
  const { container, unmount } = mount({
    'aria-label': 'Notes',
    value: 'fixed',
    onValueChange: (v) => values.push(v),
  })
  const textarea = must(container.querySelector<HTMLTextAreaElement>('textarea'))

  act(() => typeInto(textarea, 'changed'))

  assertEquals(values, ['changed'])
  assertEquals(textarea.value, 'fixed')

  unmount()
})

// --- native attribute passthrough ---------------------------------------------------------------

Deno.test('Textarea (preact): native attributes pass straight through', () => {
  const { container, unmount } = mount({
    'aria-label': 'Bio',
    rows: 6,
    cols: 40,
    wrap: 'hard',
    disabled: true,
    required: true,
    name: 'bio',
    id: 'bio-textarea',
    className: 'bio',
  })
  const textarea = must(container.querySelector<HTMLTextAreaElement>('textarea'))

  // `rows`/`cols` via `getAttribute` — see `textarea.test.tsx`'s own comment on this same
  // assertion for why (happy-dom reflects both as strings, not the spec's `long`).
  assertEquals(textarea.getAttribute('rows'), '6')
  assertEquals(textarea.getAttribute('cols'), '40')
  assertEquals(textarea.getAttribute('wrap'), 'hard')
  assertEquals(textarea.disabled, true)
  assertEquals(textarea.required, true)
  assertEquals(textarea.name, 'bio')
  assertEquals(textarea.id, 'bio-textarea')
  assertEquals(textarea.className, 'bio')

  unmount()
})

// --- Field composition (FieldRenderProps shape) --------------------------------------------

Deno.test('Textarea (preact): composes cleanly with the props Field.children hands back', () => {
  const { container, unmount } = mount({
    id: 'bio-textarea',
    'aria-describedby': 'bio-hint bio-error',
    'aria-invalid': true,
    'aria-label': 'Bio',
  })
  const textarea = must(container.querySelector<HTMLTextAreaElement>('textarea'))

  assertEquals(textarea.id, 'bio-textarea')
  assertEquals(textarea.getAttribute('aria-describedby'), 'bio-hint bio-error')
  assertEquals(textarea.getAttribute('aria-invalid'), 'true')

  unmount()
})

// --- validationMessage -----------------------------------------------------------------------

// Wrapped in a `<form>` through a tiny parent so the control's native validity can also be read
// from `form.checkValidity()`, same as the React file's own `inForm`.
function formElement(props: TextareaProps) {
  return h('form', null, h(Textarea, { 'aria-label': 'Field', ...props })) as VNode
}

function mountInForm(props: TextareaProps = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(formElement(props), container))
  return {
    container,
    rerender: (next: TextareaProps) => act(() => renderDOM(formElement(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('Textarea (preact): validationMessage marks the real textarea invalid through native validation', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Not acceptable' })
  const control = must(container.querySelector<HTMLTextAreaElement>('textarea'))
  const form = must(container.querySelector('form'))

  assertEquals(control.validity.customError, true)
  assertEquals(control.validationMessage, 'Not acceptable')
  assertEquals(control.checkValidity(), false)
  assertEquals(form.checkValidity(), false)

  unmount()
})

Deno.test('Textarea (preact): no validationMessage leaves the textarea valid', () => {
  const { container, unmount } = mountInForm()

  assertEquals(
    must(container.querySelector<HTMLTextAreaElement>('textarea')).validity.customError,
    false,
  )
  assertEquals(must(container.querySelector('form')).checkValidity(), true)

  unmount()
})

Deno.test('Textarea (preact): removing validationMessage, or emptying it, clears the error', () => {
  const { container, rerender, unmount } = mountInForm({ validationMessage: 'Not valid' })
  const control = must(container.querySelector<HTMLTextAreaElement>('textarea'))
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

Deno.test('Textarea (preact): a changed validationMessage replaces the previous one', () => {
  const { container, rerender, unmount } = mountInForm({ validationMessage: 'First' })
  const control = must(container.querySelector<HTMLTextAreaElement>('textarea'))
  assertEquals(control.validationMessage, 'First')

  rerender({ validationMessage: 'Second' })
  assertEquals(control.validationMessage, 'Second')
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('Textarea (preact): unmounting clears the error it set', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Not valid' })
  const control = must(container.querySelector<HTMLTextAreaElement>('textarea'))
  assertEquals(control.validity.customError, true)

  unmount()
  assertEquals(control.validity.customError, false)
})

Deno.test('Textarea (preact): typing does not clear the error — only the caller does', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Not valid' })
  const control = must(container.querySelector<HTMLTextAreaElement>('textarea'))

  typeInto(control, 'something else')
  assertEquals(control.value, 'something else')
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('Textarea (preact): validationMessage renders nothing on the server', () => {
  const plain = renderToString(formElement({}))
  const withMessage = renderToString(formElement({ validationMessage: 'Not valid' }))

  assertEquals(withMessage, plain)
  assertEquals(withMessage.includes('Not valid'), false)
})

Deno.test('Textarea (preact): validationMessage coexists with required, and leaves aria-invalid alone', () => {
  const { container, rerender, unmount } = mountInForm({
    required: true,
    validationMessage: 'Not valid',
  })
  const control = must(container.querySelector<HTMLTextAreaElement>('textarea'))

  assertEquals(control.validity.valueMissing, true)
  assertEquals(control.validity.customError, true)
  assertEquals(control.getAttribute('aria-invalid'), null)

  rerender({ required: true, validationMessage: 'Not valid', 'aria-invalid': true })
  assertEquals(control.getAttribute('aria-invalid'), 'true')

  rerender({ required: true, 'aria-invalid': true })
  assertEquals(control.validity.valueMissing, true)
  assertEquals(control.validity.customError, false)
  assertEquals(control.getAttribute('aria-invalid'), 'true')

  unmount()
})
