import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { PasswordInput } from 'components/PasswordInput/index.ts'

function mount(element: ReturnType<typeof PasswordInput>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof PasswordInput>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('PasswordInput: SSR — masked by default, real button, wrapper hook', () => {
  const html = renderToStaticMarkup(<PasswordInput aria-label='Password' />)

  assertStringIncludes(html, 'data-space-ui="password-input"')
  assertStringIncludes(html, 'data-space-ui="input"')
  assertStringIncludes(html, 'type="password"')
  assertStringIncludes(html, 'data-space-ui="button"')
  assertStringIncludes(html, 'type="button"')
})

Deno.test('PasswordInput: toggle button never defaults to type="submit"', () => {
  const html = renderToStaticMarkup(<PasswordInput aria-label='Password' />)
  // A native <button> with no explicit `type` inside a <form> defaults to "submit" — this asserts
  // the real rendered attribute is the explicit override, not an accidental omission.
  assertStringIncludes(html, '<button type="button"')
})

Deno.test('PasswordInput: default toggle label reflects the current (pre-click) state', () => {
  const maskedHtml = renderToStaticMarkup(<PasswordInput aria-label='Password' />)
  assertStringIncludes(maskedHtml, 'aria-label="Show password"')

  const revealedHtml = renderToStaticMarkup(<PasswordInput aria-label='Password' visible />)
  assertStringIncludes(revealedHtml, 'aria-label="Hide password"')
})

// --- real DOM: toggling ----------------------------------------------------------------------

Deno.test('PasswordInput: uncontrolled — clicking the toggle flips the input type', () => {
  const { container, unmount } = mount(<PasswordInput aria-label='Password' />)
  const input = must(container.querySelector<HTMLInputElement>('input'))
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  assertEquals(input.type, 'password')
  act(() => button.click())
  assertEquals(input.type, 'text')
  act(() => button.click())
  assertEquals(input.type, 'password')

  unmount()
})

Deno.test('PasswordInput: controlled visible — click notifies but never self-mutates', () => {
  const values: boolean[] = []
  const { container, unmount } = mount(
    <PasswordInput aria-label='Password' visible={false} onVisibleChange={(v) => values.push(v)} />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click())

  assertEquals(values, [true])
  assertEquals(input.type, 'password') // still masked — caller declined to update `visible`

  unmount()
})

Deno.test('PasswordInput: controlled visible updates the input type on rerender', () => {
  const { container, rerender, unmount } = mount(
    <PasswordInput aria-label='Password' visible={false} />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))
  assertEquals(input.type, 'password')

  rerender(<PasswordInput aria-label='Password' visible />)
  assertEquals(input.type, 'text')

  unmount()
})

// --- native attribute / Field passthrough (via Input) --------------------------------------

Deno.test('PasswordInput: autoComplete/name/value passthrough reaches the real input', () => {
  const { container, unmount } = mount(
    <PasswordInput
      aria-label='Password'
      autoComplete='new-password'
      name='password'
      value='hunter2'
      id='password-field'
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.autocomplete, 'new-password')
  assertEquals(input.name, 'password')
  assertEquals(input.value, 'hunter2')
  assertEquals(input.id, 'password-field')

  unmount()
})

Deno.test('PasswordInput: composes cleanly with the props Field.children hands back', () => {
  const { container, unmount } = mount(
    <PasswordInput
      id='password-field'
      aria-describedby='password-hint'
      aria-invalid
      aria-label='Password'
    />,
  )
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.id, 'password-field')
  assertEquals(input.getAttribute('aria-describedby'), 'password-hint')
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  unmount()
})

// --- custom icons / label --------------------------------------------------------------------

Deno.test('PasswordInput: getToggleLabel overrides the default English strings', () => {
  const html = renderToStaticMarkup(
    <PasswordInput
      aria-label='Password'
      getToggleLabel={(visible) => visible ? 'Ocultar' : 'Mostrar'}
    />,
  )
  assertStringIncludes(html, 'aria-label="Mostrar"')
})

Deno.test('PasswordInput: showIcon/hideIcon override the default glyphs', () => {
  const { container, unmount } = mount(
    <PasswordInput
      aria-label='Password'
      showIcon={() => <span data-testid='show-glyph' />}
      hideIcon={() => <span data-testid='hide-glyph' />}
    />,
  )

  assertEquals(container.querySelector('[data-testid="show-glyph"]') !== null, true)

  const button = must(container.querySelector<HTMLButtonElement>('button'))
  act(() => button.click())
  assertEquals(container.querySelector('[data-testid="hide-glyph"]') !== null, true)

  unmount()
})

Deno.test('PasswordInput: nonce lands on the self-rendered stroke <style> element', () => {
  const html = renderToStaticMarkup(<PasswordInput aria-label='Password' nonce='abc123' />)

  assertStringIncludes(html, '<style nonce="abc123">')
  assertStringIncludes(html, 'stroke-width:1.6px')
  assertEquals(html.includes(' style='), false)
})
