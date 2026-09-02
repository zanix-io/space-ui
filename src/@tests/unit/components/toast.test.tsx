import { installTimerMock, must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { assertEquals, assertStringIncludes, assertThrows } from '@std/assert'
import { ToastProvider, useToast } from 'components/Toast/index.ts'

function mount(children: ReturnType<typeof ToastProvider>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(children))
  return { container, unmount: () => act(() => root.unmount()) }
}

function Trigger({ onReady }: { onReady: (api: ReturnType<typeof useToast>) => void }) {
  const api = useToast()
  onReady(api)
  return null
}

function mountWithApi(position?: 'top-left' | 'bottom-left', nonce?: string) {
  let api!: ReturnType<typeof useToast>
  const { container, unmount } = mount(
    <ToastProvider position={position} nonce={nonce}>
      <Trigger onReady={(value) => (api = value)} />
    </ToastProvider>,
  )
  return { container, unmount, api }
}

// --- useToast outside a provider ----------------------------------------------------------

Deno.test('useToast: throws when called outside a ToastProvider', () => {
  function Bare() {
    useToast()
    return null
  }
  assertThrows(
    () => {
      const container = document.createElement('div')
      const root = createRoot(container)
      act(() => root.render(<Bare />))
    },
    Error,
    'useToast() was called outside a <ToastProvider>',
  )
})

// --- showToast / closeToast, basic ------------------------------------------------------------

Deno.test('ToastProvider: showToast renders a toast, closeToast removes it', () => {
  const { container, unmount, api } = mountWithApi()

  assertEquals(container.querySelector('[data-space-ui="toast"]'), null)

  let id = ''
  act(() => {
    id = api.showToast({ title: 'Saved' })
  })

  assertEquals(container.querySelector('[data-space-ui="toast"]') !== null, true)
  assertEquals(container.textContent?.includes('Saved'), true)

  act(() => api.closeToast(id))

  assertEquals(container.querySelector('[data-space-ui="toast"]'), null)

  unmount()
})

Deno.test('ToastProvider: a toast always renders a close button, regardless of timeout', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ title: 'No timeout' })
  })

  const closeButton = must(container.querySelector('button[aria-label="Close"]'))
  assertEquals(closeButton !== null, true)

  unmount()
})

Deno.test('ToastProvider: the close button has real, aria-hidden visible content by default', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ title: 'No timeout' })
  })

  const closeButton = must(container.querySelector('button[aria-label="Close"]'))
  const svg = closeButton.querySelector('svg')
  assertEquals(svg !== null, true)
  assertEquals(must(svg).getAttribute('aria-hidden'), 'true')

  unmount()
})

Deno.test('ToastProvider: closeButtonContent overrides the default close icon', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({
      title: 'Custom close icon',
      closeButtonContent: <span data-testid='my-close-icon'>×</span>,
    })
  })

  const closeButton = must(container.querySelector('button[aria-label="Close"]'))
  assertEquals(closeButton.querySelector('svg'), null)
  assertEquals(closeButton.querySelector('[data-testid="my-close-icon"]') !== null, true)
  // `aria-label="Close"` stays the accessible name regardless of which content renders.
  assertEquals(closeButton.getAttribute('aria-label'), 'Close')

  unmount()
})

Deno.test('ToastProvider: icon and body render; an omitted title renders no <strong>', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({
      icon: { href: '/sprite.svg', name: 'info', viewBox: '0 0 24 24' },
      body: 'Details go here.',
    })
  })

  assertEquals(container.querySelector('[data-space-ui="icon"]') !== null, true)
  assertEquals(container.textContent?.includes('Details go here.'), true)
  assertEquals(container.querySelector('strong'), null)

  unmount()
})

Deno.test('ToastProvider: buttons render as real extra action buttons, alongside Close', () => {
  const clicks: string[] = []
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({
      title: 'Undo?',
      buttons: [{ children: 'Undo', onClick: () => clicks.push('undo') }],
    })
  })

  const undoButton = must(
    Array.from(container.querySelectorAll('button')).find((btn) => btn.textContent === 'Undo'),
  )
  // Close is still there too — `buttons` is additive, never a replacement.
  assertEquals(container.querySelector('button[aria-label="Close"]') !== null, true)

  act(() => undoButton.click())
  assertEquals(clicks, ['undo'])

  unmount()
})

Deno.test('ToastProvider: no buttons prop renders no extra action buttons', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ title: 'Plain' })
  })

  assertEquals(container.querySelectorAll('button').length, 1) // just Close

  unmount()
})

// "clicking the close button closes the toast" moved to
// `integration/components/toast.test.tsx` (test-tier placement audit, 2026-08-21) — real `Button`
// click actually propagating through, not the imperative `closeToast` API tested above.

// --- variant → Alert politeness -----------------------------------------------------------

// The two role/politeness tests ("variant=error gets role=alert", "other variants get
// role=status") moved to `integration/components/toast.test.tsx` — they exercise real `Alert`'s
// own internal `politeness → role` mapping, not `Toast`'s own markup in isolation. See that
// file's own doc for the note on the audit's originally-cited (and since corrected) line range.

Deno.test('ToastProvider: default variant is "info", data-variant reflects it', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ title: 'Plain' })
  })

  assertEquals(
    must(container.querySelector('[data-space-ui="toast"]')).getAttribute('data-variant'),
    'info',
  )

  unmount()
})

// --- upsert by id ----------------------------------------------------------------------------

Deno.test('ToastProvider: showToast with a matching id updates in place, no duplicate', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ id: 'save', variant: 'loading', title: 'Saving…' })
  })
  assertEquals(container.querySelectorAll('[data-space-ui="toast"]').length, 1)
  assertEquals(container.textContent?.includes('Saving…'), true)

  act(() => {
    api.showToast({ id: 'save', variant: 'success', title: 'Saved!' })
  })

  assertEquals(container.querySelectorAll('[data-space-ui="toast"]').length, 1)
  assertEquals(container.textContent?.includes('Saved!'), true)
  assertEquals(container.textContent?.includes('Saving…'), false)

  unmount()
})

// --- auto-dismiss timeout, deterministic --------------------------------------------------

Deno.test('ToastProvider: timeout auto-dismisses after exactly that long, not before', () => {
  const timers = installTimerMock()
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ title: 'Auto-dismiss', timeout: 3000 })
  })
  assertEquals(container.querySelector('[data-space-ui="toast"]') !== null, true)

  act(() => timers.advance(2999))
  assertEquals(container.querySelector('[data-space-ui="toast"]') !== null, true)

  act(() => timers.advance(1))
  assertEquals(container.querySelector('[data-space-ui="toast"]'), null)

  timers.restore()
  unmount()
})

Deno.test('ToastProvider: without a timeout, a toast never auto-dismisses', () => {
  const timers = installTimerMock()
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ title: 'Stays forever' })
  })

  act(() => timers.advance(1_000_000))
  assertEquals(container.querySelector('[data-space-ui="toast"]') !== null, true)

  timers.restore()
  unmount()
})

Deno.test('ToastProvider: closing manually before the timeout cancels it (no double-close)', () => {
  const timers = installTimerMock()
  const { container, unmount, api } = mountWithApi()

  let id = ''
  act(() => {
    id = api.showToast({ title: 'Manual close', timeout: 3000 })
  })
  act(() => api.closeToast(id))
  assertEquals(timers.pendingCount(), 0) // the timer was cleared, not left dangling

  act(() => timers.advance(5000))
  assertEquals(container.querySelector('[data-space-ui="toast"]'), null)

  timers.restore()
  unmount()
})

// "showProgress defaults to true for 'loading', false otherwise" moved to
// `integration/components/toast.test.tsx` — real `ProgressBar` actually mounting per `Toast`'s
// own derived prop, not `Toast`'s own markup in isolation.

// --- onClose callback ------------------------------------------------------------------------

Deno.test('ToastProvider: the per-toast onClose fires once, on close, not before', () => {
  const calls: string[] = []
  const { unmount, api } = mountWithApi()

  let id = ''
  act(() => {
    id = api.showToast({ title: 'Bye', onClose: () => calls.push('closed') })
  })
  assertEquals(calls, [])

  act(() => api.closeToast(id))
  assertEquals(calls, ['closed'])

  unmount()
})

// --- multiple toasts stack -----------------------------------------------------------------

Deno.test('ToastProvider: multiple toasts all render at once, in a real DOM stack', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ id: 'a', title: 'First' })
    api.showToast({ id: 'b', title: 'Second' })
    api.showToast({ id: 'c', title: 'Third' })
  })

  assertEquals(container.querySelectorAll('[data-space-ui="toast"]').length, 3)

  unmount()
})

// --- position anchoring -----------------------------------------------------------------------

Deno.test('ToastProvider: position controls the stack container anchor', () => {
  const { container, unmount, api } = mountWithApi('top-left')

  act(() => {
    api.showToast({ title: 'Anchored' })
  })

  // The whole `style` object (including `top`/`left`, every one of them a fixed, non-dynamic
  // constant for this component) moved to a self-rendered `<style>` element (a real CSP fix — see
  // `TOAST_STACK_CSS`'s own doc) — the stack container carries no inline `style` attribute at all
  // anymore, only a `data-position` marker.
  const stack = must(container.querySelector<HTMLElement>('[data-space-ui="toast-stack"]'))
  assertEquals(stack.getAttribute('style'), null)
  assertEquals(stack.getAttribute('data-position'), 'top-left')

  const styleEl = must(container.querySelector('style'))
  const css = styleEl.textContent ?? ''
  const rule =
    must(css.match(/\[data-space-ui='toast-stack'\]\[data-position='top-left'\]\{([^}]+)\}/))[1]
  assertStringIncludes(rule, 'top:1rem')
  assertStringIncludes(rule, 'left:1rem')

  unmount()
})

Deno.test('ToastProvider: nonce lands on the injected style element', () => {
  const { container, unmount, api } = mountWithApi('bottom-left', 'abc123')

  act(() => {
    api.showToast({ title: 'Anchored' })
  })

  const styleEl = must(container.querySelector('style'))
  assertEquals(styleEl.getAttribute('nonce'), 'abc123')

  unmount()
})
