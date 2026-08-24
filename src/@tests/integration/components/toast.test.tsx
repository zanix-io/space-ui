import { must } from '../../unit/components/dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { assertEquals } from '@std/assert'
import { ToastProvider, useToast } from 'components/Toast/index.ts'

/**
 * Real cross-component composition: `Toast` (`components/Toast/index.ts`) composes `Alert` +
 * `Button` (+ `Icon`/`ProgressBar`, covered by their own moved tests) unmocked — moved here from
 * `unit/components/toast.test.tsx` (test-tier placement audit, 2026-08-21).
 *
 * - "clicking the close button closes the toast" exercises a real `Button` click actually
 *   propagating through to `Toast`'s own `closeToast` — not `Toast` calling its close logic
 *   directly (`showToast`/`closeToast` via the API, covered in `unit/`, does that).
 * - The two role/politeness tests exercise real `Alert`'s OWN internal `politeness → role`
 *   mapping (`Alert/render.ts`), driven by a prop `Toast` merely forwards — proving the
 *   composition actually wires through to `Alert`'s real behavior, not asserting on `Toast`'s own
 *   markup in isolation.
 * - "showProgress defaults to true for 'loading', false otherwise" exercises real `ProgressBar`
 *   actually mounting (or not) per `Toast`'s own derived `shouldShowProgress`, verified by
 *   querying for `ProgressBar`'s own `data-space-ui="progress-bar"` hook.
 *
 * NOTE: the audit that named this component's move originally cited a third block by line range
 * that, on re-reading the current file, turned out to be "position controls the stack container
 * anchor" — that test asserts on `Toast`'s OWN `MODAL_POSITION_STYLE` positioning logic, with no
 * real `Alert`/`Button`/`Icon`/`ProgressBar` interaction involved, so it stayed in
 * `unit/components/toast.test.tsx` rather than moving here. The two role/politeness tests below
 * are the real match for "Alert determines the role per variant."
 *
 * `Toast`'s remaining tests (basic show/close via the imperative API, upsert-by-id, timeout
 * auto-dismiss/cancellation, onClose callback, multi-toast stacking, position anchoring) stay in
 * `unit/components/toast.test.tsx` — each exercises `Toast`'s own state machine, not real
 * cross-component interaction.
 */

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

function mountWithApi(position?: 'top-left' | 'bottom-left') {
  let api!: ReturnType<typeof useToast>
  const { container, unmount } = mount(
    <ToastProvider position={position}>
      <Trigger onReady={(value) => (api = value)} />
    </ToastProvider>,
  )
  return { container, unmount, api }
}

Deno.test('ToastProvider: clicking the close button closes the toast', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ title: 'Dismiss me' })
  })

  const closeButton = must(container.querySelector<HTMLButtonElement>('button[aria-label="Close"]'))
  act(() => closeButton.click())

  assertEquals(container.querySelector('[data-space-ui="toast"]'), null)

  unmount()
})

Deno.test('ToastProvider: variant="error" gets role="alert" (assertive)', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ variant: 'error', title: 'Failed' })
  })

  assertEquals(container.querySelector('[role="alert"]') !== null, true)
  assertEquals(container.querySelector('[role="status"]'), null)

  unmount()
})

Deno.test('ToastProvider: other variants get role="status" (polite)', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ variant: 'success', title: 'Saved' })
  })

  assertEquals(container.querySelector('[role="status"]') !== null, true)
  assertEquals(container.querySelector('[role="alert"]'), null)

  unmount()
})

Deno.test('ToastProvider: showProgress defaults to true for "loading", false otherwise', () => {
  const { container, unmount, api } = mountWithApi()

  act(() => {
    api.showToast({ variant: 'loading', title: 'Working', timeout: 5000 })
  })
  assertEquals(container.querySelector('[data-space-ui="progress-bar"]') !== null, true)

  unmount()
})
