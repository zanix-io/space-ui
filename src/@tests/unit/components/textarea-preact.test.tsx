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
