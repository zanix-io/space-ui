import { installTimerMock, must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import { act } from 'preact/test-utils'
import { assertEquals, assertStringIncludes, assertThrows } from '@std/assert'
import { ToastProvider, useToast } from 'components/Toast/index.preact.ts'

// Unlike every hookless Preact component in this package, `Toast` uses real hooks — built with
// `h(...)` and rendered through Preact's own pipeline, not called as a plain function. See
// `counter-preact.test.tsx`'s own doc for the same reasoning.

function Trigger({ onReady }: { onReady: (api: ReturnType<typeof useToast>) => void }) {
  const api = useToast()
  onReady(api)
  return null
}

function mountWithApi(position?: 'top-left' | 'bottom-left', nonce?: string) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  let api!: ReturnType<typeof useToast>
  act(() =>
    renderDOM(
      h(ToastProvider, {
        position,
        nonce,
        children: h(Trigger, { onReady: (value) => (api = value) }),
      }),
      container,
    )
  )
  return { container, unmount: () => act(() => renderDOM(null, container)), api }
}

// --- useToast outside a provider ----------------------------------------------------------

Deno.test('useToast (preact): throws when called outside a ToastProvider', () => {
  function Bare() {
    useToast()
    return null
  }
  assertThrows(
    () => {
      const container = document.createElement('div')
      act(() => renderDOM(h(Bare, {}), container))
    },
    Error,
    'useToast() was called outside a <ToastProvider>',
  )
})

// --- showToast / closeToast, basic ------------------------------------------------------------

Deno.test('ToastProvider (preact): showToast renders, closeToast removes it', () => {
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

Deno.test('ToastProvider (preact): a toast always renders a close button', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ title: 'No timeout' })
  })

  assertEquals(container.querySelector('button[aria-label="Close"]') !== null, true)

  unmount()
})

Deno.test('ToastProvider (preact): the close button has real, aria-hidden visible content by default', () => {
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

Deno.test('ToastProvider (preact): closeButtonContent overrides the default close icon', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({
      title: 'Custom close icon',
      closeButtonContent: h('span', { 'data-testid': 'my-close-icon' }, '×'),
    })
  })

  const closeButton = must(container.querySelector('button[aria-label="Close"]'))
  assertEquals(closeButton.querySelector('svg'), null)
  assertEquals(closeButton.querySelector('[data-testid="my-close-icon"]') !== null, true)
  assertEquals(closeButton.getAttribute('aria-label'), 'Close')

  unmount()
})

// "clicking the close button closes the toast" moved to
// `integration/components/toast-preact.test.tsx` (test-tier placement audit, 2026-08-21).

// --- variant → Alert politeness -----------------------------------------------------------

// The two role/politeness tests moved to `integration/components/toast-preact.test.tsx` — see
// `unit/components/toast.test.tsx`'s own doc.

Deno.test('ToastProvider (preact): default variant is "info"', () => {
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

Deno.test('ToastProvider (preact): showToast with a matching id updates in place', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ id: 'save', variant: 'loading', title: 'Saving…' })
  })
  assertEquals(container.querySelectorAll('[data-space-ui="toast"]').length, 1)

  act(() => {
    api.showToast({ id: 'save', variant: 'success', title: 'Saved!' })
  })

  assertEquals(container.querySelectorAll('[data-space-ui="toast"]').length, 1)
  assertEquals(container.textContent?.includes('Saved!'), true)
  assertEquals(container.textContent?.includes('Saving…'), false)

  unmount()
})

// --- auto-dismiss timeout, deterministic --------------------------------------------------

Deno.test('ToastProvider (preact): timeout auto-dismisses after exactly that long', () => {
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

Deno.test('ToastProvider (preact): without a timeout, a toast never auto-dismisses', () => {
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

Deno.test('ToastProvider (preact): closing manually cancels the pending timer', () => {
  const timers = installTimerMock()
  const { unmount, api } = mountWithApi()

  let id = ''
  act(() => {
    id = api.showToast({ title: 'Manual close', timeout: 3000 })
  })
  act(() => api.closeToast(id))
  assertEquals(timers.pendingCount(), 0)

  timers.restore()
  unmount()
})

// "showProgress defaults to true for 'loading'" moved to
// `integration/components/toast-preact.test.tsx` — see `unit/components/toast.test.tsx`'s own
// doc.

// --- onClose callback ------------------------------------------------------------------------

Deno.test('ToastProvider (preact): the per-toast onClose fires once, on close', () => {
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

Deno.test('ToastProvider (preact): multiple toasts all render at once', () => {
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

Deno.test('ToastProvider (preact): position controls the stack container anchor', () => {
  const { container, unmount, api } = mountWithApi('top-left')

  act(() => {
    api.showToast({ title: 'Anchored' })
  })

  // The whole `style` object moved to a self-rendered `<style>` element (a real CSP fix) — the
  // stack container carries no inline `style` attribute at all anymore.
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

Deno.test('ToastProvider (preact): nonce lands on the injected style element', () => {
  const { container, unmount, api } = mountWithApi('bottom-left', 'abc123')

  act(() => {
    api.showToast({ title: 'Anchored' })
  })

  const styleEl = must(container.querySelector('style'))
  assertEquals(styleEl.getAttribute('nonce'), 'abc123')

  unmount()
})
