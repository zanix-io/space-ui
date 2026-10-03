import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { FileInput } from 'components/FileInput/index.ts'

// happy-dom's own `HTMLInputElement.files` setter types against ITS OWN `FileList` class — real,
// plain `File` instances (Deno's own native Web File API, confirmed real, not a mock) are set via
// `Object.defineProperty` instead of the typed setter, sidestepping the need to also construct
// happy-dom's own `FileList` wrapper class just for a test double.
function setFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
}

function mount(element: ReturnType<typeof FileInput>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof FileInput>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('FileInput: SSR — type=file, data-space-ui', () => {
  const html = renderToStaticMarkup(<FileInput aria-label='Attachments' />)
  assertStringIncludes(html, 'type="file"')
  assertStringIncludes(html, 'data-space-ui="file-input"')
})

// --- real DOM: selecting files ------------------------------------------------------------------

Deno.test('FileInput: a real file selection fires onFilesChange with a plain File[]', () => {
  const calls: File[][] = []
  const { container, unmount } = mount(
    <FileInput aria-label='Attachments' onFilesChange={(files) => calls.push(files)} />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))
  const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
  setFiles(input, [file])

  // React's own `onChange` for a `type="file"` input maps to the literal native `change` event
  // (never `input`) — confirmed directly against `react-dom`'s own installed source
  // (`getTargetInstForChangeEvent`, gated on `input[type=file]`/`select` specifically) — see
  // `FileInput/render.ts`'s own doc for the full citation. Dispatching only `change` (no `input`)
  // here is the real, empirical proof this component's `onChange` prop actually reaches it.
  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })

  assertEquals(calls.length, 1)
  assertEquals(calls[0].length, 1)
  assertEquals(calls[0][0].name, 'hello.txt')
  assertEquals(Array.isArray(calls[0]), true)

  unmount()
})

Deno.test('FileInput: multiple selected files all reach onFilesChange, in order', () => {
  const calls: File[][] = []
  const { container, unmount } = mount(
    <FileInput
      aria-label='Attachments'
      multiple
      onFilesChange={(files) => calls.push(files)}
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))
  const fileA = new File(['a'], 'a.txt')
  const fileB = new File(['b'], 'b.txt')
  setFiles(input, [fileA, fileB])

  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })

  assertEquals(calls[0].map((f) => f.name), ['a.txt', 'b.txt'])

  unmount()
})

Deno.test(
  'FileInput: a change event with no files (e.g. the picker was cancelled) reports []',
  () => {
    const calls: File[][] = []
    const { container, unmount } = mount(
      <FileInput aria-label='Attachments' onFilesChange={(files) => calls.push(files)} />,
    )
    const input = must(container.querySelector<HTMLInputElement>('input'))
    // Never called `setFiles` — `input.files` stays whatever the native element starts with
    // (empty), the same shape a real "open the picker, then cancel" native `change` event carries.

    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    assertEquals(calls, [[]])

    unmount()
  },
)

// --- resetTrigger ----------------------------------------------------------------------------

Deno.test('FileInput: resetTrigger clears the native value and notifies onFilesChange([])', () => {
  const calls: File[][] = []
  // `resetTrigger` starts `undefined` — the realistic usage this component's own doc describes
  // (`undefined` never resets anything); starting with an already-defined value would fire the
  // reset effect on the very first mount too (an effect's dependency array always runs once after
  // the first render, same as every other render), which isn't what this test is exercising.
  const { container, rerender, unmount } = mount(
    <FileInput aria-label='Attachments' onFilesChange={(files) => calls.push(files)} />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))
  const file = new File(['a'], 'a.txt')
  setFiles(input, [file])
  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  assertEquals(calls.length, 1)

  rerender(
    <FileInput
      aria-label='Attachments'
      onFilesChange={(files) => calls.push(files)}
      resetTrigger={1}
    />,
  )

  assertEquals(input.value, '')
  assertEquals(calls.at(-1), [])

  unmount()
})

Deno.test('FileInput: no resetTrigger given — never resets', () => {
  const calls: File[][] = []
  const { unmount } = mount(
    <FileInput aria-label='Attachments' onFilesChange={(files) => calls.push(files)} />,
  )
  assertEquals(calls, [])
  unmount()
})

// --- native attribute passthrough ---------------------------------------------------------------

Deno.test('FileInput: native attributes pass straight through', () => {
  const { container, unmount } = mount(
    <FileInput
      aria-label='Attachments'
      accept='image/*'
      multiple
      disabled
      required
      name='attachments'
      id='files'
      className='file-field'
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.accept, 'image/*')
  assertEquals(input.multiple, true)
  assertEquals(input.disabled, true)
  assertEquals(input.required, true)
  assertEquals(input.name, 'attachments')
  assertEquals(input.id, 'files')
  assertEquals(input.className, 'file-field')

  unmount()
})

// --- Field composition (FieldRenderProps shape) --------------------------------------------

Deno.test('FileInput: composes cleanly with the props Field.children hands back', () => {
  const { container, unmount } = mount(
    <FileInput
      id='attachments-input'
      aria-describedby='attachments-hint'
      aria-invalid
      aria-label='Attachments'
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.id, 'attachments-input')
  assertEquals(input.getAttribute('aria-describedby'), 'attachments-hint')
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  unmount()
})

// --- validationMessage -----------------------------------------------------------------------

function inForm(props: Partial<Parameters<typeof FileInput>[0]> = {}) {
  return (
    <form>
      <FileInput aria-label='Field' {...props} />
    </form>
  )
}

Deno.test('FileInput: validationMessage marks the real file input invalid through native validation', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Too large' }))
  const control = must(container.querySelector<HTMLInputElement>('input'))
  const form = must(container.querySelector('form'))

  assertEquals(control.type, 'file')
  assertEquals(control.validity.customError, true)
  assertEquals(control.validationMessage, 'Too large')
  assertEquals(control.checkValidity(), false)
  assertEquals(form.checkValidity(), false)

  unmount()
})

Deno.test('FileInput: the rendered input is a candidate for constraint validation, never hidden', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Too large' }))
  const control = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(control.willValidate, true)
  assertEquals(control.hidden, false)
  assertEquals(control.getAttribute('style'), null)

  unmount()
})

Deno.test('FileInput: no validationMessage leaves the input valid', () => {
  const { container, unmount } = mount(inForm())

  assertEquals(must(container.querySelector<HTMLInputElement>('input')).validity.customError, false)
  assertEquals(must(container.querySelector('form')).checkValidity(), true)

  unmount()
})

Deno.test('FileInput: removing validationMessage, or emptying it, clears the error', () => {
  const { container, rerender, unmount } = mount(inForm({ validationMessage: 'Not valid' }))
  const control = must(container.querySelector<HTMLInputElement>('input'))
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

Deno.test('FileInput: a changed validationMessage replaces the previous one', () => {
  const { container, rerender, unmount } = mount(inForm({ validationMessage: 'First' }))
  const control = must(container.querySelector<HTMLInputElement>('input'))
  assertEquals(control.validationMessage, 'First')

  rerender(inForm({ validationMessage: 'Second' }))
  assertEquals(control.validationMessage, 'Second')
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('FileInput: unmounting clears the error it set', () => {
  const { container, unmount } = mount(inForm({ validationMessage: 'Not valid' }))
  const control = must(container.querySelector<HTMLInputElement>('input'))
  assertEquals(control.validity.customError, true)

  unmount()
  assertEquals(control.validity.customError, false)
})

Deno.test('FileInput: choosing or clearing a file does not clear the error — only the caller does', () => {
  const { container, rerender, unmount } = mount(inForm({ validationMessage: 'Too large' }))
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
  rerender(inForm())
  assertEquals(control.validity.customError, false)

  unmount()
})

Deno.test('FileInput: a resetTrigger change leaves the caller-owned error in place', () => {
  const { container, rerender, unmount } = mount(
    inForm({ validationMessage: 'Too large', resetTrigger: 1 }),
  )
  const control = must(container.querySelector<HTMLInputElement>('input'))

  rerender(inForm({ validationMessage: 'Too large', resetTrigger: 2 }))
  assertEquals(control.validity.customError, true)

  unmount()
})

Deno.test('FileInput: validationMessage renders nothing on the server', () => {
  const plain = renderToStaticMarkup(inForm())
  const withMessage = renderToStaticMarkup(inForm({ validationMessage: 'Not valid' }))

  assertEquals(withMessage, plain)
  assertEquals(withMessage.includes('Not valid'), false)
})

Deno.test('FileInput: validationMessage coexists with required, and leaves aria-invalid alone', () => {
  const { container, rerender, unmount } = mount(
    inForm({ required: true, validationMessage: 'Not valid' }),
  )
  const control = must(container.querySelector<HTMLInputElement>('input'))

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
