import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Field } from 'components/Field/index.ts'

// --- structure -----------------------------------------------------------------------------

Deno.test('Field: renders a label wired to the input via htmlFor/id', () => {
  const html = renderToStaticMarkup(
    <Field label='Email'>
      {(fieldProps) => <input {...fieldProps} type='email' />}
    </Field>,
  )

  const inputIdMatch = must(html.match(/<input[^>]*id="([^"]+)"/))[1]
  const forMatch = must(html.match(/for="([^"]+)"/))[1]
  assertEquals(inputIdMatch, forMatch)
  assertStringIncludes(html, '>Email</label>')
})

Deno.test('Field: id/className land on the wrapper', () => {
  const html = renderToStaticMarkup(
    <Field label='Email' id='email-field' className='form-row'>
      {(fieldProps) => <input {...fieldProps} type='email' />}
    </Field>,
  )

  assertStringIncludes(html, 'id="email-field"')
  assertStringIncludes(html, 'class="form-row"')
})

Deno.test('Field: without id, a stable id is auto-generated via useId', () => {
  const html = renderToStaticMarkup(
    <Field label='Email'>
      {(fieldProps) => <input {...fieldProps} type='email' />}
    </Field>,
  )

  assertStringIncludes(html, 'data-space-ui="field"')
  assertStringIncludes(html, '<input')
})

Deno.test('Field: carries data-space-ui="field"', () => {
  const html = renderToStaticMarkup(
    <Field label='Email'>{(fieldProps) => <input {...fieldProps} />}</Field>,
  )

  assertStringIncludes(html, 'data-space-ui="field"')
})

// --- no error/hint ---------------------------------------------------------------------------

Deno.test('Field: without error, aria-invalid is absent — never a literal "false"', () => {
  const html = renderToStaticMarkup(
    <Field label='Email'>{(fieldProps) => <input {...fieldProps} />}</Field>,
  )

  assertEquals(html.includes('aria-invalid'), false)
})

Deno.test('Field: without hint or error, aria-describedby is absent entirely', () => {
  const html = renderToStaticMarkup(
    <Field label='Email'>{(fieldProps) => <input {...fieldProps} />}</Field>,
  )

  assertEquals(html.includes('aria-describedby'), false)
})

// --- hint --------------------------------------------------------------------------------------

Deno.test('Field: a hint renders and is referenced by aria-describedby', () => {
  const html = renderToStaticMarkup(
    <Field label='Email' hint='We never share this'>
      {(fieldProps) => <input {...fieldProps} />}
    </Field>,
  )

  const hintIdMatch = must(html.match(/<p id="([^"]+)"/))[1]
  assertStringIncludes(html, `aria-describedby="${hintIdMatch}"`)
  assertStringIncludes(html, 'We never share this')
})

// --- error ---------------------------------------------------------------------------------

Deno.test('Field: a single error string renders via Alert, aria-invalid=true', () => {
  const html = renderToStaticMarkup(
    <Field label='Email' error='Must be a valid email address'>
      {(fieldProps) => <input {...fieldProps} />}
    </Field>,
  )

  assertStringIncludes(html, 'aria-invalid="true"')
  assertStringIncludes(html, 'role="alert"')
  assertStringIncludes(html, 'Must be a valid email address')
})

Deno.test('Field: multiple errors render as a list inside one Alert', () => {
  const html = renderToStaticMarkup(
    <Field label='Password' error={['Too short', 'Needs a number']}>
      {(fieldProps) => <input {...fieldProps} type='password' />}
    </Field>,
  )

  assertEquals((html.match(/role="alert"/g) ?? []).length, 1)
  assertStringIncludes(html, '<li>Too short</li>')
  assertStringIncludes(html, '<li>Needs a number</li>')
})

Deno.test('Field: aria-describedby combines hint AND error ids when both are present', () => {
  const html = renderToStaticMarkup(
    <Field label='Email' hint='Use your work email' error='Must be a valid email address'>
      {(fieldProps) => <input {...fieldProps} />}
    </Field>,
  )

  const hintId = must(html.match(/<p id="([^"]+)"/))[1]
  const errorId = must(html.match(/id="([^"]+)"[^>]*role="alert"/))[1]
  const describedBy = must(html.match(/aria-describedby="([^"]+)"/))[1]

  assertEquals(describedBy, `${hintId} ${errorId}`)
})

// --- real DOM: the render-prop actually wires a real, focusable input --------------------------

Deno.test('Field: real DOM — the rendered input is focusable and carries the right id', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() =>
    root.render(
      <Field label='Email' error='Required'>
        {(fieldProps) => <input {...fieldProps} type='email' />}
      </Field>,
    )
  )

  const input = must(container.querySelector('input'))
  const label = must(container.querySelector('label'))

  assertEquals(input.id, label.getAttribute('for'))
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  act(() => input.focus())
  assertEquals(document.activeElement, input)

  act(() => root.unmount())
})
