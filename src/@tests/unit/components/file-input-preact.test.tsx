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
