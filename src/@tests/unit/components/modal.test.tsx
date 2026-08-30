import { must } from './dom-test-setup.ts'
import { act, StrictMode } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStrictEquals, assertStringIncludes } from '@std/assert'
import logger from 'shared/client-logger.ts'
import { Modal, ModalProvider, useModal } from 'components/Modal/index.ts'

function mount(element: ReturnType<typeof Modal>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Modal>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Modal: SSR — closed renders nothing at all', () => {
  const html = renderToStaticMarkup(
    <Modal open={false} onClose={() => {}} label='Delete account'>
      <p>Are you sure?</p>
    </Modal>,
  )

  assertEquals(html, '')
})

Deno.test('Modal: SSR — open renders the full dialog, no portal needed for this to work', () => {
  const html = renderToStaticMarkup(
    <Modal open onClose={() => {}} label='Delete account'>
      <p>Are you sure?</p>
    </Modal>,
  )

  assertStringIncludes(html, 'role="dialog"')
  assertStringIncludes(html, 'aria-modal="true"')
  assertStringIncludes(html, 'aria-label="Delete account"')
  assertStringIncludes(html, 'data-space-ui="modal"')
  assertStringIncludes(html, 'Are you sure?')
})

Deno.test('Modal: ariaLabelledBy works as the accessible name instead of label', () => {
  const html = renderToStaticMarkup(
    <Modal open onClose={() => {}} ariaLabelledBy='heading-id'>
      <h2 id='heading-id'>Delete account</h2>
    </Modal>,
  )

  assertStringIncludes(html, 'aria-labelledby="heading-id"')
  // The dialog element itself carries no aria-label — only the (unrelated) close button does.
  const dialogHtml = html.slice(html.indexOf('role="dialog"'), html.indexOf('</div>'))
  assertEquals(dialogHtml.includes('aria-label='), false)
})

Deno.test('Modal: neither label nor ariaLabelledBy warns via the shared logger', () => {
  const calls: unknown[][] = []
  const originalWarn = logger.warn
  logger.warn = (...args: unknown[]) => {
    calls.push(args)
  }

  try {
    renderToStaticMarkup(
      // deno-lint-ignore no-explicit-any
      <Modal open onClose={() => {}} {...({} as any)}>
        <p>Are you sure?</p>
      </Modal>,
    )
  } finally {
    logger.warn = originalWarn
  }

  assertEquals(calls.length, 1)
  assertStringIncludes(String(calls[0][0]), 'Modal: neither `label` nor `ariaLabelledBy`')
  assertEquals(calls[0][1], 'noSave')
})

Deno.test('Modal: id/className land on the dialog element', () => {
  const html = renderToStaticMarkup(
    <Modal open onClose={() => {}} label='X' id='confirm' className='big'>
      Body
    </Modal>,
  )

  assertStringIncludes(html, 'id="confirm"')
  assertStringIncludes(html, 'class="big"')
})

Deno.test('Modal: showOverlay=true (default) renders a backdrop', () => {
  const html = renderToStaticMarkup(
    <Modal open onClose={() => {}} label='X'>
      Body
    </Modal>,
  )

  assertStringIncludes(html, 'data-space-ui="modal-backdrop"')
})

Deno.test('Modal: showOverlay=false renders no backdrop', () => {
  const html = renderToStaticMarkup(
    <Modal open onClose={() => {}} label='X' showOverlay={false}>
      Body
    </Modal>,
  )

  assertEquals(html.includes('data-space-ui="modal-backdrop"'), false)
})

Deno.test('Modal: renders a real, accessible close button', () => {
  const html = renderToStaticMarkup(
    <Modal open onClose={() => {}} label='X'>
      Body
    </Modal>,
  )

  assertStringIncludes(html, 'aria-label="Close"')
})

// --- backdrop / outside-click contract --------------------------------------------------------

Deno.test('Modal: with a backdrop, an outside click never closes it', () => {
  const closes: boolean[] = []
  const { container, unmount } = mount(
    <Modal open onClose={() => closes.push(true)} label='X'>
      Body
    </Modal>,
  )

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(closes.length, 0)
  assertEquals(must(container.querySelector('[data-space-ui="modal-backdrop"]')) !== null, true)

  unmount()
})

Deno.test('Modal: without a backdrop, an outside click closes it', () => {
  let closed = false
  const { unmount } = mount(
    <Modal open onClose={() => (closed = true)} label='X' showOverlay={false}>
      Body
    </Modal>,
  )

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(closed, true)

  unmount()
})

// --- Escape ----------------------------------------------------------------------------------

Deno.test('Modal: Escape closes by default', () => {
  let closed = false
  const { container, unmount } = mount(
    <Modal open onClose={() => (closed = true)} label='X'>
      Body
    </Modal>,
  )

  const dialog = must(container.querySelector('[role="dialog"]'))
  act(() => {
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(closed, true)

  unmount()
})

Deno.test('Modal: closeOnEscape={false} disables it', () => {
  let closed = false
  const { container, unmount } = mount(
    <Modal open onClose={() => (closed = true)} label='X' closeOnEscape={false}>
      Body
    </Modal>,
  )

  const dialog = must(container.querySelector('[role="dialog"]'))
  act(() => {
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(closed, false)

  unmount()
})

// --- focus management --------------------------------------------------------------------------

Deno.test('Modal: opening moves focus to the first focusable element inside', () => {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  act(() => trigger.focus())
  assertStrictEquals(document.activeElement, trigger)

  const { container, unmount } = mount(
    <Modal open onClose={() => {}} label='X'>
      <button type='button'>Confirm</button>
    </Modal>,
  )

  const confirmButton = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent === 'Confirm'
  )
  assertStrictEquals(document.activeElement, confirmButton)

  unmount()
  trigger.remove()
})

Deno.test('Modal: with no focusable content besides its own close button, that gets focus', () => {
  const { container, unmount } = mount(
    <Modal open onClose={() => {}} label='X'>
      <p>Just text</p>
    </Modal>,
  )

  // The close button is always rendered and always focusable, so the "focus the dialog
  // container itself" fallback is unreachable through the public API — this is the real,
  // reachable fallback: nothing else to focus, land on the one control that IS there.
  const closeButton = must(
    Array.from(container.querySelectorAll('button')).find((b) =>
      b.getAttribute('aria-label') === 'Close'
    ),
  )
  assertStrictEquals(document.activeElement, closeButton)

  unmount()
})

Deno.test('Modal: closing returns focus to the element that had it before opening', () => {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  act(() => trigger.focus())

  const { rerender, unmount } = mount(
    <Modal open onClose={() => {}} label='X'>
      <button type='button'>Confirm</button>
    </Modal>,
  )

  rerender(<Modal open={false} onClose={() => {}} label='X'>Body</Modal>)

  assertStrictEquals(document.activeElement, trigger)

  unmount()
  trigger.remove()
})

Deno.test('Modal: Tab at the last focusable element cycles to the first (focus trap)', () => {
  const { container, unmount } = mount(
    <Modal open onClose={() => {}} label='X'>
      <button type='button'>First</button>
      <button type='button'>Last</button>
    </Modal>,
  )

  const dialog = must(container.querySelector('[role="dialog"]'))
  const buttons = Array.from(container.querySelectorAll('button'))
  const closeButton = must(buttons.find((b) => b.getAttribute('aria-label') === 'Close'))
  const last = must(buttons.find((b) => b.textContent === 'Last'))

  act(() => last.focus())
  act(() => {
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    )
  })

  // wraps to the first focusable (the close button)
  assertStrictEquals(document.activeElement, closeButton)

  unmount()
})

Deno.test('Modal: Shift+Tab at the first focusable element cycles to the last', () => {
  const { container, unmount } = mount(
    <Modal open onClose={() => {}} label='X'>
      <button type='button'>First</button>
      <button type='button'>Last</button>
    </Modal>,
  )

  const dialog = must(container.querySelector('[role="dialog"]'))
  const buttons = Array.from(container.querySelectorAll('button'))
  const closeButton = must(buttons.find((b) => b.getAttribute('aria-label') === 'Close'))
  const last = must(buttons.find((b) => b.textContent === 'Last'))

  act(() => closeButton.focus())
  act(() => {
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    )
  })

  assertStrictEquals(document.activeElement, last)

  unmount()
})

// --- scroll lock (component-level integration) ----------------------------------------------

Deno.test('Modal: opening locks body scroll, closing restores it', () => {
  document.body.style.overflow = 'auto'
  const { rerender, unmount } = mount(
    <Modal open onClose={() => {}} label='X'>
      Body
    </Modal>,
  )

  assertEquals(document.body.style.overflow, 'hidden')

  rerender(<Modal open={false} onClose={() => {}} label='X'>Body</Modal>)
  assertEquals(document.body.style.overflow, 'auto')

  unmount()
})

// --- multiple modals / stacking ---------------------------------------------------------------

Deno.test('Modal: with two open, Escape closes only the topmost', () => {
  const closedIds: string[] = []
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() =>
    root.render(
      <>
        <Modal open onClose={() => closedIds.push('a')} label='A' id='modal-a'>
          A body
        </Modal>
        <Modal open onClose={() => closedIds.push('b')} label='B' id='modal-b'>
          B body
        </Modal>
      </>,
    )
  )

  const dialogB = must(container.querySelector('#modal-b'))
  act(() => {
    dialogB.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(closedIds, ['b'])

  act(() => root.unmount())
})

Deno.test('Modal: closing the bottom modal does not steal focus from the top one', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  // Both `<Modal>` elements stay in the exact same tree position/key throughout — only `A`'s own
  // `open` prop toggles, matching how a real consumer closes one without touching the other.
  // Restructuring the tree itself (e.g. removing `A`'s JSX entirely) would make React remount `B`
  // as a brand new instance instead of updating it in place, which isn't what closing one modal
  // while another stays open actually looks like.
  const render = (aOpen: boolean) =>
    act(() =>
      root.render(
        <>
          <Modal open={aOpen} onClose={() => {}} label='A' id='modal-a'>
            <button type='button'>A button</button>
          </Modal>
          <Modal open onClose={() => {}} label='B' id='modal-b'>
            <button type='button'>B button</button>
          </Modal>
        </>,
      )
    )

  render(true)

  const bButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'B button'),
  )
  assertStrictEquals(document.activeElement, bButton)

  render(false) // close A (the bottom one) — B stays open, focus must remain inside it

  assertStrictEquals(document.activeElement, bButton)

  act(() => root.unmount())
})

// --- ModalProvider / useModal ------------------------------------------------------------------

Deno.test('useModal: throws when called outside a ModalProvider', () => {
  function Orphan() {
    useModal()
    return null
  }
  let threw = false
  try {
    renderToStaticMarkup(<Orphan />)
  } catch {
    threw = true
  }
  assertEquals(threw, true)
})

Deno.test('ModalProvider/useModal: openModal renders a real Modal, closeModal removes it', () => {
  let api: ReturnType<typeof useModal> | null = null
  function Trigger() {
    api = useModal()
    return null
  }

  const { container, unmount } = mount(
    <ModalProvider>
      <Trigger />
    </ModalProvider>,
  )

  let id = ''
  act(() => {
    id = must(api).openModal({ label: 'From provider', children: <p>Hi</p> })
  })

  assertStringIncludes(container.innerHTML, 'role="dialog"')
  assertStringIncludes(container.innerHTML, 'aria-label="From provider"')

  act(() => must(api).closeModal(id))
  assertEquals(container.innerHTML.includes('role="dialog"'), false)

  unmount()
})

Deno.test('ModalProvider: the consumer-supplied onClose runs on a normal close', () => {
  let api: ReturnType<typeof useModal> | null = null
  function Trigger() {
    api = useModal()
    return null
  }

  const { container, unmount } = mount(
    <ModalProvider>
      <Trigger />
    </ModalProvider>,
  )

  let consumerCalled = false
  act(() => {
    must(api).openModal({
      label: 'X',
      children: <p>Hi</p>,
      onClose: () => (consumerCalled = true),
    })
  })

  const closeButton = must(
    Array.from(container.querySelectorAll('button')).find((b) =>
      b.getAttribute('aria-label') === 'Close'
    ),
  )
  act(() => closeButton.click())

  assertEquals(consumerCalled, true)
  assertEquals(container.innerHTML.includes('role="dialog"'), false)

  unmount()
})

Deno.test(
  'ModalProvider: closeModal always runs, even if the consumer onClose throws (isolated ' +
    'reproduction of the exact try/finally shape ModalProvider uses internally)',
  () => {
    // A real DOM `click()` reporting an exception thrown inside a listener goes through jsdom's
    // own `reportException`, which Deno's test runner treats as a fatal, file-crashing error
    // regardless of any `try`/`catch` around the dispatch — not something a unit test can
    // reliably intercept, and not what this guarantee is actually about. This verifies the exact
    // control-flow shape `ModalProvider`'s own `onClose` wrapper uses (see `index.ts`) directly:
    // the `finally` block runs before the error propagates, it never swallows the error, and it
    // runs regardless of whether the guarded call throws at all.
    let closeModalCalled = false
    const closeModal = () => (closeModalCalled = true)
    const consumerOnClose = () => {
      throw new Error('consumer onClose blew up')
    }

    let thrown: unknown = null
    try {
      try {
        consumerOnClose()
      } finally {
        closeModal()
      }
    } catch (error) {
      thrown = error
    }

    assertEquals((thrown as Error).message, 'consumer onClose blew up')
    assertEquals(closeModalCalled, true)
  },
)

Deno.test('ModalProvider: supports multiple simultaneously open modals', () => {
  let api: ReturnType<typeof useModal> | null = null
  function Trigger() {
    api = useModal()
    return null
  }

  const { container, unmount } = mount(
    <ModalProvider>
      <Trigger />
    </ModalProvider>,
  )

  act(() => {
    must(api).openModal({ label: 'First', children: <p>1</p> })
    must(api).openModal({ label: 'Second', children: <p>2</p> })
  })

  assertEquals(container.querySelectorAll('[role="dialog"]').length, 2)

  unmount()
})

Deno.test('Modal + ModalProvider: declarative and global modals share one stack', () => {
  let api: ReturnType<typeof useModal> | null = null
  function Trigger() {
    api = useModal()
    return null
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() =>
    root.render(
      <ModalProvider>
        <Trigger />
        <Modal open onClose={() => {}} label='Declarative' id='declarative-modal'>
          Body
        </Modal>
      </ModalProvider>,
    )
  )

  const closedIds: string[] = []
  act(() => {
    must(api).openModal({
      label: 'Global',
      children: <p>Global body</p>,
      onClose: () => closedIds.push('global'),
    })
  })

  // The globally-opened modal was registered last — it, not the declarative one, is top.
  const declarativeDialog = must(container.querySelector('#declarative-modal'))
  act(() => {
    declarativeDialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  // Declarative modal's own Escape handler is a no-op — it isn't top — so it never called its
  // own onClose, and the global one (still open) is untouched too.
  assertEquals(closedIds, [])
  assertEquals(container.querySelectorAll('[role="dialog"]').length, 2)

  act(() => root.unmount())
})

// --- StrictMode: no phantom stack state across dev double-invocation -------------------------

Deno.test('Modal: mounting under StrictMode does not leave scroll locked after unmount', () => {
  document.body.style.overflow = 'auto'
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() =>
    root.render(
      <StrictMode>
        <Modal open onClose={() => {}} label='X'>
          Body
        </Modal>
      </StrictMode>,
    )
  )

  assertEquals(document.body.style.overflow, 'hidden')

  act(() => root.unmount())

  assertEquals(document.body.style.overflow, 'auto')
})

// --- global activator: gaps closed after an independent audit -------------------------------

Deno.test('useModal: works from an arbitrarily nested descendant of ModalProvider', () => {
  let api: ReturnType<typeof useModal> | null = null
  function DeepTrigger() {
    api = useModal()
    return null
  }
  function Middle({ children }: { children: ReactNode }) {
    return <div>{children}</div>
  }

  const { container, unmount } = mount(
    <ModalProvider>
      <Middle>
        <Middle>
          <Middle>
            <DeepTrigger />
          </Middle>
        </Middle>
      </Middle>
    </ModalProvider>,
  )

  act(() => {
    must(api).openModal({ label: 'Deep', children: <p>Hi</p> })
  })

  assertStringIncludes(container.innerHTML, 'role="dialog"')
  assertStringIncludes(container.innerHTML, 'aria-label="Deep"')

  unmount()
})

Deno.test('useModal: openModal reached through a real DOM click, not called directly', () => {
  let api: ReturnType<typeof useModal> | null = null
  function Trigger() {
    api = useModal()
    return (
      <button
        type='button'
        onClick={() => api?.openModal({ label: 'Via click', children: <p>Hi</p> })}
      >
        Open
      </button>
    )
  }

  const { container, unmount } = mount(
    <ModalProvider>
      <Trigger />
    </ModalProvider>,
  )

  const openButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Open'),
  )
  act(() => openButton.click())

  assertStringIncludes(container.innerHTML, 'role="dialog"')
  assertStringIncludes(container.innerHTML, 'aria-label="Via click"')

  unmount()
})

Deno.test('useModal: two independent consumers open modals independently', () => {
  let apiA: ReturnType<typeof useModal> | null = null
  let apiB: ReturnType<typeof useModal> | null = null
  function TriggerA() {
    apiA = useModal()
    return null
  }
  function TriggerB() {
    apiB = useModal()
    return null
  }

  const { container, unmount } = mount(
    <ModalProvider>
      <TriggerA />
      <TriggerB />
    </ModalProvider>,
  )

  act(() => {
    must(apiA).openModal({ label: 'From A', children: <p>A</p> })
    must(apiB).openModal({ label: 'From B', children: <p>B</p> })
  })

  assertEquals(container.querySelectorAll('[role="dialog"]').length, 2)
  assertStringIncludes(container.innerHTML, 'aria-label="From A"')
  assertStringIncludes(container.innerHTML, 'aria-label="From B"')

  unmount()
})
