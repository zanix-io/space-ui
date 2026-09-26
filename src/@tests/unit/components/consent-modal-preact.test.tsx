import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { ConsentModal } from 'components/ConsentModal/index.preact.ts'
import type { ConsentModalProps } from 'components/ConsentModal/index.preact.ts'

// Unlike a hookless Preact component in this package, `ConsentModal` composes the real, hook-using
// `Modal` internally — built with `h(ConsentModal, props)` and rendered through Preact's own
// pipeline, not called as a plain function, same reasoning `modal-preact.test.tsx`'s own doc gives.

function element(props: ConsentModalProps): VNode {
  return h(ConsentModal, props) as VNode
}

function mount(props: ConsentModalProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    unmount: () => act(() => renderDOM(null, container)),
  }
}

const baseProps: ConsentModalProps = {
  open: true,
  onClose: () => {},
  heading: 'Session cookie',
  body: 'This service needs one cookie to keep you signed in.',
  onAccept: () => {},
  onDecline: () => {},
}

Deno.test('ConsentModal (preact): closed renders nothing at all', () => {
  const html = renderToString(element({ ...baseProps, open: false }))
  assertEquals(html, '')
})

Deno.test('ConsentModal (preact): open renders heading/body and the default Accept/Decline buttons', () => {
  const html = renderToString(element(baseProps))

  assertStringIncludes(html, 'role="dialog"')
  assertStringIncludes(html, 'Session cookie')
  assertStringIncludes(html, 'This service needs one cookie to keep you signed in.')
  assertStringIncludes(html, '>Accept<')
  assertStringIncludes(html, '>Decline<')
})

Deno.test('ConsentModal (preact): the accessible name comes from heading via aria-labelledby', () => {
  const html = renderToString(element(baseProps))
  const headingId = must(html.match(/<h2[^>]*id="([^"]+)"/))[1]
  assertStringIncludes(html, `aria-labelledby="${headingId}"`)
})

Deno.test(
  'ConsentModal (preact): declinedAcknowledgement replaces body/Accept/Decline with the ' +
    'acknowledgement body and a Continue button',
  () => {
    const html = renderToString(
      element({
        ...baseProps,
        declinedAcknowledgement: { body: 'You will be signed out again next time.' },
      }),
    )

    assertStringIncludes(html, 'You will be signed out again next time.')
    assertStringIncludes(html, '>Continue<')
    assertEquals(html.includes('This service needs one cookie'), false)
    assertEquals(html.includes('>Accept<'), false)
  },
)

Deno.test('ConsentModal (preact): error renders as a real Alert row', () => {
  const html = renderToString(element({ ...baseProps, error: 'Network error.' }))
  assertStringIncludes(html, 'role="alert"')
  assertStringIncludes(html, 'Network error.')
})

Deno.test('ConsentModal (preact): clicking Accept calls onAccept', () => {
  let accepted = false
  const { container, unmount } = mount({ ...baseProps, onAccept: () => (accepted = true) })

  const acceptButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Accept'),
  )
  act(() => acceptButton.click())

  assertEquals(accepted, true)
  unmount()
})

Deno.test('ConsentModal (preact): clicking Decline calls onDecline, never onClose', () => {
  let declined = false
  let closed = false
  const { container, unmount } = mount({
    ...baseProps,
    onDecline: () => (declined = true),
    onClose: () => (closed = true),
  })

  const declineButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Decline'),
  )
  act(() => declineButton.click())

  assertEquals(declined, true)
  assertEquals(closed, false)
  unmount()
})

Deno.test('ConsentModal (preact): Escape closes by default, via the composed Modal', () => {
  let closed = false
  const { container, unmount } = mount({ ...baseProps, onClose: () => (closed = true) })

  const dialog = must(container.querySelector('[role="dialog"]'))
  act(() => {
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(closed, true)
  unmount()
})
