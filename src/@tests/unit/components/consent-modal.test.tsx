import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { ConsentModal } from 'components/ConsentModal/index.ts'

function mount(element: ReturnType<typeof ConsentModal>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof ConsentModal>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

const baseProps = {
  onClose: () => {},
  heading: 'Session cookie',
  body: 'This service needs one cookie to keep you signed in.',
  onAccept: () => {},
  onDecline: () => {},
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('ConsentModal: closed renders nothing at all (delegates entirely to Modal)', () => {
  const html = renderToStaticMarkup(<ConsentModal {...baseProps} open={false} />)
  assertEquals(html, '')
})

Deno.test('ConsentModal: open renders heading/body and the default Accept/Decline buttons', () => {
  const html = renderToStaticMarkup(<ConsentModal {...baseProps} open />)

  assertStringIncludes(html, 'role="dialog"')
  assertStringIncludes(html, '<h2')
  assertStringIncludes(html, 'Session cookie')
  assertStringIncludes(html, '<p')
  assertStringIncludes(html, 'This service needs one cookie to keep you signed in.')
  assertStringIncludes(html, '>Accept<')
  assertStringIncludes(html, '>Decline<')
})

Deno.test('ConsentModal: acceptLabel/declineLabel override the defaults', () => {
  const html = renderToStaticMarkup(
    <ConsentModal {...baseProps} open acceptLabel='Allow' declineLabel='Refuse' />,
  )

  assertStringIncludes(html, '>Allow<')
  assertStringIncludes(html, '>Refuse<')
  assertEquals(html.includes('>Accept<'), false)
  assertEquals(html.includes('>Decline<'), false)
})

Deno.test('ConsentModal: the accessible name comes from heading via aria-labelledby, never a separate label', () => {
  const html = renderToStaticMarkup(<ConsentModal {...baseProps} open />)

  const headingId = must(html.match(/<h2[^>]*id="([^"]+)"/))[1]
  assertStringIncludes(html, `aria-labelledby="${headingId}"`)
  // The dialog element itself carries no aria-label — Modal's own accessible-name warning would
  // fire if neither were given at all; ariaLabelledBy alone is enough.
  const dialogHtml = html.slice(html.indexOf('role="dialog"'), html.indexOf('</div>'))
  assertEquals(dialogHtml.includes('aria-label='), false)
})

Deno.test('ConsentModal: the heading id is stable across renders with the same props (SSR/hydration match)', () => {
  const first = renderToStaticMarkup(<ConsentModal {...baseProps} open />)
  const second = renderToStaticMarkup(<ConsentModal {...baseProps} open />)

  const firstId = must(first.match(/<h2[^>]*id="([^"]+)"/))[1]
  const secondId = must(second.match(/<h2[^>]*id="([^"]+)"/))[1]
  assertEquals(firstId, secondId)
})

// --- composed markup: no redundant hooks of its own -----------------------------------------

Deno.test('ConsentModal: inherits Modal/Button hooks, adds no consent-modal hook of its own', () => {
  const html = renderToStaticMarkup(<ConsentModal {...baseProps} open />)

  assertStringIncludes(html, 'data-space-ui="modal"')
  assertStringIncludes(html, 'data-space-ui="button"')
  assertEquals(html.includes('consent-modal"'), false)
})

// --- error row -------------------------------------------------------------------------------

Deno.test('ConsentModal: error renders as a real Alert between body and the action buttons', () => {
  const html = renderToStaticMarkup(
    <ConsentModal {...baseProps} open error='Something went wrong. Please try again.' />,
  )

  assertStringIncludes(html, 'role="alert"')
  assertStringIncludes(html, 'data-space-ui="alert"')
  assertStringIncludes(html, 'Something went wrong. Please try again.')

  const bodyIndex = html.indexOf('This service needs one cookie')
  const errorIndex = html.indexOf('Something went wrong')
  const acceptIndex = html.indexOf('>Accept<')
  assertEquals(bodyIndex < errorIndex && errorIndex < acceptIndex, true)
})

Deno.test('ConsentModal: with no error given, no alert row renders at all', () => {
  const html = renderToStaticMarkup(<ConsentModal {...baseProps} open />)
  assertEquals(html.includes('role="alert"'), false)
})

// --- declinedAcknowledgement: presence on THIS render is what shows it ----------------------

Deno.test(
  'ConsentModal: without declinedAcknowledgement, Decline behaves exactly like Accept — no ' +
    'acknowledgement view exists',
  () => {
    const html = renderToStaticMarkup(<ConsentModal {...baseProps} open />)
    assertEquals(html.includes('>Continue<'), false)
  },
)

Deno.test(
  'ConsentModal: with declinedAcknowledgement given, the acknowledgement body/Continue button ' +
    'replace body/Accept/Decline entirely',
  () => {
    const html = renderToStaticMarkup(
      <ConsentModal
        {...baseProps}
        open
        declinedAcknowledgement={{ body: 'You will be signed out again next time.' }}
      />,
    )

    assertStringIncludes(html, 'You will be signed out again next time.')
    assertStringIncludes(html, '>Continue<')
    assertEquals(html.includes('This service needs one cookie'), false)
    assertEquals(html.includes('>Accept<'), false)
    assertEquals(html.includes('>Decline<'), false)
  },
)

Deno.test('ConsentModal: declinedAcknowledgement.continueLabel overrides the default "Continue"', () => {
  const html = renderToStaticMarkup(
    <ConsentModal
      {...baseProps}
      open
      declinedAcknowledgement={{ body: 'Explanation', continueLabel: 'Got it' }}
    />,
  )

  assertStringIncludes(html, '>Got it<')
  assertEquals(html.includes('>Continue<'), false)
})

Deno.test('ConsentModal: clicking Continue calls declinedAcknowledgement.onContinue when given', () => {
  let continued = false
  const { container, unmount } = mount(
    <ConsentModal
      {...baseProps}
      open
      onClose={() => {}}
      declinedAcknowledgement={{ body: 'Explanation', onContinue: () => (continued = true) }}
    />,
  )

  const continueButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Continue'),
  )
  act(() => continueButton.click())

  assertEquals(continued, true)
  unmount()
})

Deno.test(
  'ConsentModal: clicking Continue with no onContinue given falls back to onClose',
  () => {
    let closed = false
    const { container, unmount } = mount(
      <ConsentModal
        {...baseProps}
        open
        onClose={() => (closed = true)}
        declinedAcknowledgement={{ body: 'Explanation' }}
      />,
    )

    const continueButton = must(
      Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Continue'),
    )
    act(() => continueButton.click())

    assertEquals(closed, true)
    unmount()
  },
)

// --- accept/decline callbacks ------------------------------------------------------------------

Deno.test('ConsentModal: clicking Accept calls onAccept, never onDecline/onClose', () => {
  let accepted = false
  let declined = false
  let closed = false
  const { container, unmount } = mount(
    <ConsentModal
      {...baseProps}
      open
      onAccept={() => (accepted = true)}
      onDecline={() => (declined = true)}
      onClose={() => (closed = true)}
    />,
  )

  const acceptButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Accept'),
  )
  act(() => acceptButton.click())

  assertEquals(accepted, true)
  assertEquals(declined, false)
  assertEquals(closed, false)
  unmount()
})

Deno.test('ConsentModal: clicking Decline calls onDecline, never onAccept/onClose', () => {
  let accepted = false
  let declined = false
  let closed = false
  const { container, unmount } = mount(
    <ConsentModal
      {...baseProps}
      open
      onAccept={() => (accepted = true)}
      onDecline={() => (declined = true)}
      onClose={() => (closed = true)}
    />,
  )

  const declineButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Decline'),
  )
  act(() => declineButton.click())

  assertEquals(declined, true)
  assertEquals(accepted, false)
  assertEquals(closed, false)
  unmount()
})

// --- Escape / nonce / className passthrough (Modal's own contract, reused verbatim) ----------

Deno.test('ConsentModal: Escape closes by default, via the composed Modal', () => {
  let closed = false
  const { container, unmount } = mount(
    <ConsentModal {...baseProps} open onClose={() => (closed = true)} />,
  )

  const dialog = must(container.querySelector('[role="dialog"]'))
  act(() => {
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(closed, true)
  unmount()
})

Deno.test('ConsentModal: closeOnEscape={false} disables it', () => {
  let closed = false
  const { container, unmount } = mount(
    <ConsentModal {...baseProps} open onClose={() => (closed = true)} closeOnEscape={false} />,
  )

  const dialog = must(container.querySelector('[role="dialog"]'))
  act(() => {
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(closed, false)
  unmount()
})

Deno.test("ConsentModal: nonce lands on the composed Modal's injected style element", () => {
  const html = renderToStaticMarkup(<ConsentModal {...baseProps} open nonce='abc123' />)
  assertStringIncludes(html, '<style nonce="abc123">')
})

Deno.test('ConsentModal: className lands on the dialog element', () => {
  const html = renderToStaticMarkup(
    <ConsentModal {...baseProps} open className='cookie-consent-dialog' />,
  )
  assertStringIncludes(html, 'class="cookie-consent-dialog"')
})
