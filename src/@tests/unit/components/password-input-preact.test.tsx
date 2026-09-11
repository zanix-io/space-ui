import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { PasswordInput } from 'components/PasswordInput/index.preact.ts'
import type { PasswordInputProps } from 'components/PasswordInput/index.preact.ts'

function element(props: PasswordInputProps): VNode {
  return h(PasswordInput, props) as VNode
}

function mount(props: PasswordInputProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: PasswordInputProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('PasswordInput (preact): SSR — masked by default, real button, wrapper hook', () => {
  const html = renderToString(element({ 'aria-label': 'Password' }))

  assertStringIncludes(html, 'data-space-ui="password-input"')
  assertStringIncludes(html, 'data-space-ui="input"')
  assertStringIncludes(html, 'type="password"')
  assertStringIncludes(html, 'data-space-ui="button"')
})

Deno.test('PasswordInput (preact): clicking the toggle flips the input type (onInput branch)', () => {
  const { container, unmount } = mount({ 'aria-label': 'Password' })
  const input = must(container.querySelector<HTMLInputElement>('input'))
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  assertEquals(input.type, 'password')
  act(() => button.click())
  assertEquals(input.type, 'text')

  unmount()
})

Deno.test('PasswordInput (preact): controlled visible — click notifies but never self-mutates', () => {
  const values: boolean[] = []
  const { container, unmount } = mount({
    'aria-label': 'Password',
    visible: false,
    onVisibleChange: (v) => values.push(v),
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))
  const button = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => button.click())

  assertEquals(values, [true])
  assertEquals(input.type, 'password')

  unmount()
})

Deno.test('PasswordInput (preact): autoComplete/name passthrough reaches the real input', () => {
  const { container, unmount } = mount({
    'aria-label': 'Password',
    autoComplete: 'current-password',
    name: 'password',
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.autocomplete, 'current-password')
  assertEquals(input.name, 'password')

  unmount()
})

Deno.test('PasswordInput (preact): composes cleanly with the props Field.children hands back', () => {
  const { container, unmount } = mount({
    id: 'password-field',
    'aria-describedby': 'password-hint',
    'aria-invalid': true,
    'aria-label': 'Password',
  })
  const input = must(container.querySelector<HTMLInputElement>('input'))

  assertEquals(input.id, 'password-field')
  assertEquals(input.getAttribute('aria-describedby'), 'password-hint')
  assertEquals(input.getAttribute('aria-invalid'), 'true')

  unmount()
})

Deno.test('PasswordInput (preact): nonce lands on the self-rendered stroke <style> element', () => {
  const html = renderToString(element({ 'aria-label': 'Password', nonce: 'abc123' }))

  assertStringIncludes(html, '<style nonce="abc123">')
  assertStringIncludes(html, 'stroke-width:1.6px')
  assertEquals(html.includes(' style='), false)
})
