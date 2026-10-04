import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Field } from 'components/Field/index.preact.ts'

// Same behavior as `field.test.tsx` (the React binding), verified independently against the
// Preact one.

// --- structure -----------------------------------------------------------------------------

Deno.test('Field (preact): renders a label wired to the input via htmlFor/id', () => {
  const html = renderToString(
    h(Field, {
      label: 'Email',
      children: (fieldProps) => h('input', { ...fieldProps, type: 'email' }),
    }),
  )

  const inputIdMatch = must(html.match(/<input[^>]*id="([^"]+)"/))[1]
  const forMatch = must(html.match(/for="([^"]+)"/))[1]
  assertEquals(inputIdMatch, forMatch)
  assertStringIncludes(html, '>Email</label>')
})

Deno.test('Field (preact): id/className land on the wrapper', () => {
  const html = renderToString(
    h(Field, {
      label: 'Email',
      id: 'email-field',
      className: 'form-row',
      children: (fieldProps) => h('input', fieldProps),
    }),
  )

  assertStringIncludes(html, 'id="email-field"')
  assertStringIncludes(html, 'class="form-row"')
})

Deno.test('Field (preact): carries data-space-ui="field"', () => {
  const html = renderToString(
    h(Field, { label: 'Email', children: (fieldProps) => h('input', fieldProps) }),
  )

  assertStringIncludes(html, 'data-space-ui="field"')
})

// --- no error/hint ---------------------------------------------------------------------------

Deno.test('Field (preact): without error, aria-invalid is absent', () => {
  const html = renderToString(
    h(Field, { label: 'Email', children: (fieldProps) => h('input', fieldProps) }),
  )

  assertEquals(html.includes('aria-invalid'), false)
})

Deno.test('Field (preact): without hint or error, aria-describedby is absent', () => {
  const html = renderToString(
    h(Field, { label: 'Email', children: (fieldProps) => h('input', fieldProps) }),
  )

  assertEquals(html.includes('aria-describedby'), false)
})

// --- hint --------------------------------------------------------------------------------------

Deno.test('Field (preact): a hint renders and is referenced by aria-describedby', () => {
  const html = renderToString(
    h(Field, {
      label: 'Email',
      hint: 'We never share this',
      children: (fieldProps) => h('input', fieldProps),
    }),
  )

  const hintIdMatch = must(html.match(/<p id="([^"]+)"/))[1]
  assertStringIncludes(html, `aria-describedby="${hintIdMatch}"`)
  assertStringIncludes(html, 'We never share this')
})

// --- error ---------------------------------------------------------------------------------

Deno.test('Field (preact): a single error string renders via Alert, aria-invalid=true', () => {
  const html = renderToString(
    h(Field, {
      label: 'Email',
      error: 'Must be a valid email address',
      children: (fieldProps) => h('input', fieldProps),
    }),
  )

  assertStringIncludes(html, 'aria-invalid="true"')
  assertStringIncludes(html, 'role="alert"')
  assertStringIncludes(html, 'Must be a valid email address')
})

Deno.test('Field (preact): multiple errors render as a list inside one Alert', () => {
  const html = renderToString(
    h(Field, {
      label: 'Password',
      error: ['Too short', 'Needs a number'],
      children: (fieldProps) => h('input', { ...fieldProps, type: 'password' }),
    }),
  )

  assertEquals((html.match(/role="alert"/g) ?? []).length, 1)
  assertStringIncludes(html, '<li>Too short</li>')
  assertStringIncludes(html, '<li>Needs a number</li>')
})

Deno.test('Field (preact): aria-describedby combines hint AND error ids', () => {
  const html = renderToString(
    h(Field, {
      label: 'Email',
      hint: 'Use your work email',
      error: 'Must be a valid email address',
      children: (fieldProps) => h('input', fieldProps),
    }),
  )

  const hintId = must(html.match(/<p id="([^"]+)"/))[1]
  const errorId = must(html.match(/id="([^"]+)"[^>]*role="alert"/))[1]
  const describedBy = must(html.match(/aria-describedby="([^"]+)"/))[1]

  assertEquals(describedBy, `${hintId} ${errorId}`)
})

// --- real DOM: the render-prop actually wires a real, focusable input --------------------------

Deno.test('Field (preact): real DOM — the rendered input is focusable, right id', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)

  renderDOM(
    h(Field, {
      label: 'Email',
      error: 'Required',
      children: (fieldProps) => h('input', { ...fieldProps, type: 'email' }),
    }),
    container,
  )

  const input = must(container.querySelector('input'))
  const label = must(container.querySelector('label'))

  assertEquals(input.id, label.getAttribute('for'))
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  input.focus()
  assertEquals(document.activeElement, input)

  renderDOM(null, container)
})

// --- validationMessages ----------------------------------------------------------------------

Deno.test('Field (preact): validationMessages become data-* attributes on the wrapper only', () => {
  const html = renderToString(
    h(Field, {
      label: 'Email',
      validationMessages: { required: 'Say it', typeMismatch: 'Not an email', default: 'Fix it' },
      children: (fieldProps) => h('input', { ...fieldProps, type: 'email', required: true }),
    }),
  )
  const wrapper = html.match(/<div[^>]*data-space-ui="field"[^>]*>/)?.[0] ?? ''
  assertStringIncludes(wrapper, 'data-message-required="Say it"')
  assertStringIncludes(wrapper, 'data-message-type-mismatch="Not an email"')
  assertStringIncludes(wrapper, 'data-validation-message="Fix it"')
  assertEquals((html.match(/data-message-/g) ?? []).length, 2)
})

Deno.test('Field (preact): every validationMessages key maps to its own attribute', () => {
  const html = renderToString(
    h(Field, {
      label: 'N',
      validationMessages: {
        patternMismatch: 'a',
        tooShort: 'b',
        tooLong: 'c',
        rangeUnderflow: 'd',
        rangeOverflow: 'e',
        stepMismatch: 'f',
        badInput: 'g',
      },
      children: (fieldProps) => h('input', fieldProps),
    }),
  )
  for (
    const name of [
      'pattern-mismatch',
      'too-short',
      'too-long',
      'range-underflow',
      'range-overflow',
      'step-mismatch',
      'bad-input',
    ]
  ) assertStringIncludes(html, `data-message-${name}="`)
})

Deno.test('Field (preact): without validationMessages the markup is unchanged', () => {
  const build = (extra: Record<string, unknown>) =>
    renderToString(
      h(Field, {
        label: 'Email',
        id: 'f',
        ...extra,
        children: (fieldProps) => h('input', fieldProps),
      }),
    )
  const plain = build({})
  assertEquals(plain, build({ validationMessages: {} }))
  assertEquals(plain.includes('data-message'), false)
  assertEquals(plain.includes('data-validation-message'), false)
})
