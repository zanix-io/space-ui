import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { FileInput } from 'components/FileInput/index.preact.ts'
import type { FileInputProps } from 'components/FileInput/index.preact.ts'

// Unlike every hookless Preact component in this package, `FileInput` uses real hooks
// (`useRef`/`useEffect` for `resetTrigger`) — built with `h(FileInput, props)` and rendered
// through Preact's own pipeline, same reasoning `combobox-preact.test.tsx` establishes.

function setFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
}

function element(props: FileInputProps): VNode {
  return h(FileInput, props) as VNode
}

function mount(props: FileInputProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: FileInputProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('FileInput (preact): SSR — type=file, data-space-ui', () => {
  const html = renderToString(element({ 'aria-label': 'Attachments' }))
  assertStringIncludes(html, 'type="file"')
  assertStringIncludes(html, 'data-space-ui="file-input"')
})

// --- real DOM: selecting files, confirming no onChange/onInput split is needed here -------------

Deno.test('FileInput (preact): a real file selection (native change) fires onFilesChange', () => {
  const calls: File[][] = []
  const { container, unmount } = mount({
    'aria-label': 'Attachments',
    onFilesChange: (files) => calls.push(files),
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))
  const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
  setFiles(input, [file])

  // Preact's own `onChange` always means the literal native `change` event — no remapping at all,
  // for any element. Combined with `file-input.test.tsx`'s own React-side proof (React's `onChange`
  // for `type="file"` ALSO means literal `change`, confirmed against `react-dom`'s real source),
  // both bindings genuinely agree here — no `onInput` needed, unlike `Input`.
  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })

  assertEquals(calls.length, 1)
  assertEquals(calls[0][0].name, 'hello.txt')

  unmount()
})

// --- resetTrigger ----------------------------------------------------------------------------

Deno.test('FileInput (preact): resetTrigger clears the value, notifies onFilesChange([])', () => {
  const calls: File[][] = []
  // `resetTrigger` starts `undefined` — see `file-input.test.tsx`'s own identical comment on why.
  const { container, rerender, unmount } = mount({
    'aria-label': 'Attachments',
    onFilesChange: (files) => calls.push(files),
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))
  setFiles(input, [new File(['a'], 'a.txt')])
  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  assertEquals(calls.length, 1)

  rerender({
    'aria-label': 'Attachments',
    onFilesChange: (files) => calls.push(files),
    resetTrigger: 1,
  })

  assertEquals(input.value, '')
  assertEquals(calls.at(-1), [])

  unmount()
})

// --- native attribute passthrough ---------------------------------------------------------------

Deno.test('FileInput (preact): native attributes pass straight through', () => {
  const { container, unmount } = mount({
    'aria-label': 'Attachments',
    accept: 'image/*',
    multiple: true,
    disabled: true,
    name: 'attachments',
    id: 'files',
    className: 'file-field',
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.accept, 'image/*')
  assertEquals(input.multiple, true)
  assertEquals(input.disabled, true)
  assertEquals(input.name, 'attachments')
  assertEquals(input.id, 'files')
  assertEquals(input.className, 'file-field')

  unmount()
})

// --- Field composition (FieldRenderProps shape) --------------------------------------------

Deno.test('FileInput (preact): composes cleanly with the props Field.children hands back', () => {
  const { container, unmount } = mount({
    id: 'attachments-input',
    'aria-describedby': 'attachments-hint',
    'aria-invalid': true,
    'aria-label': 'Attachments',
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.id, 'attachments-input')
  assertEquals(input.getAttribute('aria-describedby'), 'attachments-hint')
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  unmount()
})

// --- validationMessage -----------------------------------------------------------------------

// Wrapped in a `<form>` through a tiny parent so the control's native validity can also be read
// from `form.checkValidity()`, same as the React file's own `inForm`.
function formElement(props: FileInputProps) {
  return h('form', null, h(FileInput, { 'aria-label': 'Field', ...props })) as VNode
}

function mountInForm(props: FileInputProps = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(formElement(props), container))
  return {
    container,
    rerender: (next: FileInputProps) => act(() => renderDOM(formElement(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('FileInput (preact): validationMessage marks the real file input invalid through native validation', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Too large' })
  const control = must(container.querySelector<HTMLInputElement>('input'))
  const form = must(container.querySelector('form'))

  assertEquals(control.type, 'file')
  assertEquals(control.validity.customError, true)
  assertEquals(control.validationMessage, 'Too large')
  assertEquals(control.checkValidity(), false)
  assertEquals(form.checkValidity(), false)

  unmount()
})

Deno.test('FileInput (preact): the rendered input is a candidate for constraint validation, never hidden', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Too large' })
  const control = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(control.willValidate, true)
  assertEquals(control.hidden, false)
  assertEquals(control.getAttribute('style'), null)

  unmount()
})

Deno.test('FileInput (preact): no validationMessage leaves the input valid', () => {
  const { container, unmount } = mountInForm()

  assertEquals(must(container.querySelector<HTMLInputElement>('input')).validity.customError, false)
  assertEquals(must(container.querySelector('form')).checkValidity(), true)

  unmount()
})

Deno.test('FileInput (preact): removing validationMessage, or emptying it, clears the error', () => {
  const { container, rerender, unmount } = mountInForm({ validationMessage: 'Not valid' })
  const control = must(container.querySelector<HTMLInputElement>('input'))
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

Deno.test('FileInput (preact): a changed validationMessage replaces the previous one', () => {
  const { container, rerender, unmount } = mountInForm({ validationMessage: 'First' })
  const control = must(container.querySelector<HTMLInputElement>('input'))
  assertEquals(control.validationMessage, 'First')

  rerender({ validationMessage: 'Second' })
  assertEquals(control.validationMessage, 'Second')
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('FileInput (preact): unmounting clears the error it set', () => {
  const { container, unmount } = mountInForm({ validationMessage: 'Not valid' })
  const control = must(container.querySelector<HTMLInputElement>('input'))
  assertEquals(control.validity.customError, true)

  unmount()
  assertEquals(control.validity.customError, false)
})

Deno.test('FileInput (preact): choosing or clearing a file does not clear the error — only the caller does', () => {
  const { container, rerender, unmount } = mountInForm({ validationMessage: 'Too large' })
  const control = must(container.querySelector<HTMLInputElement>('input'))

  setFiles(control, [new File(['x'], 'big.bin')])
  act(() => {
    control.dispatchEvent(new Event('change', { bubbles: true }))
  })
  assertEquals(control.validity.customError, true)

  setFiles(control, [])
  act(() => {
    control.dispatchEvent(new Event('change', { bubbles: true }))
  })
  assertEquals(control.validity.customError, true)

  // The caller recomputes it from `onFilesChange` and passes `undefined` once the selection is fine.
  rerender({})
  assertEquals(control.validity.customError, false)

  unmount()
})

Deno.test('FileInput (preact): a resetTrigger change leaves the caller-owned error in place', () => {
  const { container, rerender, unmount } = mountInForm({
    validationMessage: 'Too large',
    resetTrigger: 1,
  })
  const control = must(container.querySelector<HTMLInputElement>('input'))

  rerender({ validationMessage: 'Too large', resetTrigger: 2 })
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('FileInput (preact): validationMessage renders nothing on the server', () => {
  const plain = renderToString(formElement({}))
  const withMessage = renderToString(formElement({ validationMessage: 'Not valid' }))

  assertEquals(withMessage, plain)
  assertEquals(withMessage.includes('Not valid'), false)
})

Deno.test('FileInput (preact): validationMessage coexists with required, and leaves aria-invalid alone', () => {
  const { container, rerender, unmount } = mountInForm({
    required: true,
    validationMessage: 'Not valid',
  })
  const control = must(container.querySelector<HTMLInputElement>('input'))

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
