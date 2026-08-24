import { must } from '../../unit/components/dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import { act } from 'preact/test-utils'
import { assertEquals } from '@std/assert'
import { ToastProvider, useToast } from 'components/Toast/index.preact.ts'

// See `toast.test.tsx`'s own doc (same directory) for why these live in `integration/` rather
// than `unit/`, and for the note about the original audit's stale third-line-range citation.
// Preact binding — same contract, same rendered behavior as the React version.

function Trigger({ onReady }: { onReady: (api: ReturnType<typeof useToast>) => void }) {
  const api = useToast()
  onReady(api)
  return null
}

function mountWithApi(position?: 'top-left' | 'bottom-left') {
  const container = document.createElement('div')
  document.body.appendChild(container)
  let api!: ReturnType<typeof useToast>
  act(() =>
    renderDOM(
      h(ToastProvider, {
        position,
        children: h(Trigger, { onReady: (value) => (api = value) }),
      }),
      container,
    )
  )
  return { container, unmount: () => act(() => renderDOM(null, container)), api }
}

Deno.test('ToastProvider (preact): clicking the close button closes the toast', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ title: 'Dismiss me' })
  })

  const closeButton = must(container.querySelector<HTMLButtonElement>('button[aria-label="Close"]'))
  act(() => closeButton.click())

  assertEquals(container.querySelector('[data-space-ui="toast"]'), null)

  unmount()
})

Deno.test('ToastProvider (preact): variant="error" gets role="alert"', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ variant: 'error', title: 'Failed' })
  })

  assertEquals(container.querySelector('[role="alert"]') !== null, true)
  assertEquals(container.querySelector('[role="status"]'), null)

  unmount()
})

Deno.test('ToastProvider (preact): other variants get role="status"', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ variant: 'success', title: 'Saved' })
  })

  assertEquals(container.querySelector('[role="status"]') !== null, true)
  assertEquals(container.querySelector('[role="alert"]'), null)

  unmount()
})

Deno.test('ToastProvider (preact): showProgress defaults to true for "loading"', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ variant: 'loading', title: 'Working', timeout: 5000 })
  })
  assertEquals(container.querySelector('[data-space-ui="progress-bar"]') !== null, true)

  unmount()
})
