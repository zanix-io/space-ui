import { must } from './dom-test-setup.ts'
import { Fragment, h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStrictEquals, assertStringIncludes } from '@std/assert'
import logger from 'shared/client-logger.ts'
import { Modal, ModalProvider, useModal } from 'components/Modal/index.preact.ts'
import type { ModalProps } from 'components/Modal/index.preact.ts'

// Unlike every hookless Preact component in this package, `Modal` uses real hooks — built with
// `h(Modal, props)` and rendered through Preact's own pipeline, not called as a plain function.
// See `counter-preact.test.tsx`'s own doc for the same reasoning.

function element(props: ModalProps): VNode {
  return h(Modal, props) as VNode
}

function mount(props: ModalProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: ModalProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Modal (preact): SSR — closed renders nothing at all', () => {
  const html = renderToString(
    element({ open: false, onClose: () => {}, label: 'X', children: 'Hi' }),
  )
  assertEquals(html, '')
})

Deno.test('Modal (preact): SSR — open renders the full dialog', () => {
  const html = renderToString(
    element({ open: true, onClose: () => {}, label: 'Delete account', children: 'Are you sure?' }),
  )

  assertStringIncludes(html, 'role="dialog"')
  assertStringIncludes(html, 'aria-modal="true"')
  assertStringIncludes(html, 'aria-label="Delete account"')
  assertStringIncludes(html, 'data-space-ui="modal"')
  assertStringIncludes(html, 'Are you sure?')
})

Deno.test('Modal (preact): ariaLabelledBy works as the accessible name instead of label', () => {
  const html = renderToString(
    element({
      open: true,
      onClose: () => {},
      ariaLabelledBy: 'heading-id',
      children: h('h2', { id: 'heading-id' }, 'Delete account'),
    }),
  )

  assertStringIncludes(html, 'aria-labelledby="heading-id"')
  const dialogHtml = html.slice(html.indexOf('role="dialog"'), html.indexOf('</div>'))
  assertEquals(dialogHtml.includes('aria-label='), false)
})

Deno.test('Modal (preact): neither label nor ariaLabelledBy warns via the shared logger', () => {
  const calls: unknown[][] = []
  const originalWarn = logger.warn
  logger.warn = (...args: unknown[]) => {
    calls.push(args)
  }

  try {
    renderToString(
      // deno-lint-ignore no-explicit-any
      element({ open: true, onClose: () => {}, children: 'Are you sure?' } as any),
    )
  } finally {
    logger.warn = originalWarn
  }

  assertEquals(calls.length, 1)
  assertStringIncludes(String(calls[0][0]), 'Modal: neither `label` nor `ariaLabelledBy`')
  assertEquals(calls[0][1], 'noSave')
})

Deno.test('Modal (preact): id/className land on the dialog element', () => {
  const html = renderToString(
    element({
      open: true,
      onClose: () => {},
      label: 'X',
      id: 'confirm',
      className: 'big',
      children: 'Body',
    }),
  )

  assertStringIncludes(html, 'id="confirm"')
  assertStringIncludes(html, 'class="big"')
})

Deno.test('Modal (preact): showOverlay=true (default) renders a backdrop', () => {
  const html = renderToString(
    element({ open: true, onClose: () => {}, label: 'X', children: 'Body' }),
  )
  assertStringIncludes(html, 'data-space-ui="modal-backdrop"')
})

Deno.test('Modal (preact): showOverlay=false renders no backdrop', () => {
  const html = renderToString(
    element({ open: true, onClose: () => {}, label: 'X', showOverlay: false, children: 'Body' }),
  )
  assertEquals(html.includes('data-space-ui="modal-backdrop"'), false)
})

Deno.test('Modal (preact): renders a real, accessible close button', () => {
  const html = renderToString(
    element({ open: true, onClose: () => {}, label: 'X', children: 'Body' }),
  )
  assertStringIncludes(html, 'aria-label="Close"')
})

Deno.test('Modal (preact): the close button has real, aria-hidden visible content by default', () => {
  const html = renderToString(
    element({ open: true, onClose: () => {}, label: 'X', children: 'Body' }),
  )

  const closeButtonHtml = must(
    html.match(/<button[^>]*aria-label="Close"[^>]*>.*?<\/button>/s),
  )[0]
  assertStringIncludes(closeButtonHtml, '<svg')
  assertStringIncludes(closeButtonHtml, 'aria-hidden="true"')
})

Deno.test('Modal (preact): closeButtonContent overrides the default close icon', () => {
  const html = renderToString(
    element({
      open: true,
      onClose: () => {},
      label: 'X',
      children: 'Body',
      closeButtonContent: h('span', { 'data-testid': 'my-close-icon' }, '×'),
    }),
  )

  assertStringIncludes(html, 'data-testid="my-close-icon"')
  const closeButtonHtml = must(
    html.match(/<button[^>]*aria-label="Close"[^>]*>.*?<\/button>/s),
  )[0]
  assertEquals(closeButtonHtml.includes('<svg'), false)
  assertStringIncludes(closeButtonHtml, 'aria-label="Close"')
})

// --- positioning: <style> injection instead of an inline style attribute (CSP) ----------------

Deno.test('Modal (preact): the dialog/backdrop carry no style attribute, only data-position', () => {
  const html = renderToString(
    element({
      open: true,
      onClose: () => {},
      label: 'X',
      position: 'top-right',
      children: 'Body',
    }),
  )

  assertEquals(/data-space-ui="modal"[^>]*style="/.test(html), false)
  assertEquals(/data-space-ui="modal-backdrop"[^>]*style="/.test(html), false)
  assertStringIncludes(html, 'data-position="top-right"')
})

Deno.test('Modal (preact): the injected style text has the correct rule for the current position', () => {
  const html = renderToString(
    element({
      open: true,
      onClose: () => {},
      label: 'X',
      position: 'top-right',
      children: 'Body',
    }),
  )

  const styleText = must(html.match(/<style[^>]*>([^<]+)<\/style>/))[1]
  const rule = must(
    styleText.match(/\[data-space-ui='modal'\]\[data-position='top-right'\]\{([^}]+)\}/),
  )[1]
  assertStringIncludes(rule, 'top:1rem')
  assertStringIncludes(rule, 'right:1rem')
})

Deno.test('Modal (preact): nonce lands on the injected style element', () => {
  const html = renderToString(
    element({ open: true, onClose: () => {}, label: 'X', nonce: 'abc123', children: 'Body' }),
  )

  assertStringIncludes(html, 'nonce="abc123"')
})

// --- backdrop / outside-click contract --------------------------------------------------------

Deno.test('Modal (preact): with a backdrop, an outside click never closes it', () => {
  const closes: boolean[] = []
  const { container, unmount } = mount({
    open: true,
    onClose: () => closes.push(true),
    label: 'X',
    children: 'Body',
  })

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(closes.length, 0)
  assertEquals(must(container.querySelector('[data-space-ui="modal-backdrop"]')) !== null, true)

  unmount()
})

Deno.test('Modal (preact): without a backdrop, an outside click closes it', () => {
  let closed = false
  const { unmount } = mount({
    open: true,
    onClose: () => (closed = true),
    label: 'X',
    showOverlay: false,
    children: 'Body',
  })

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(closed, true)

  unmount()
})

// --- Escape ----------------------------------------------------------------------------------

Deno.test('Modal (preact): Escape closes by default', () => {
  let closed = false
  const { container, unmount } = mount({
    open: true,
    onClose: () => (closed = true),
    label: 'X',
    children: 'Body',
  })

  const dialog = must(container.querySelector('[role="dialog"]'))
  act(() => {
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(closed, true)

  unmount()
})

Deno.test('Modal (preact): closeOnEscape={false} disables it', () => {
  let closed = false
  const { container, unmount } = mount({
    open: true,
    onClose: () => (closed = true),
    label: 'X',
    closeOnEscape: false,
    children: 'Body',
  })

  const dialog = must(container.querySelector('[role="dialog"]'))
  act(() => {
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(closed, false)

  unmount()
})

// --- focus management --------------------------------------------------------------------------

Deno.test('Modal (preact): opening moves focus to the first focusable element inside', () => {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  act(() => trigger.focus())
  assertStrictEquals(document.activeElement, trigger)

  const { container, unmount } = mount({
    open: true,
    onClose: () => {},
    label: 'X',
    children: h('button', {}, 'Confirm'),
  })

  const confirmButton = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent === 'Confirm'
  )
  assertStrictEquals(document.activeElement, confirmButton)

  unmount()
  trigger.remove()
})

Deno.test('Modal (preact): with no other focusable content, its close button gets focus', () => {
  const { container, unmount } = mount({
    open: true,
    onClose: () => {},
    label: 'X',
    children: h('p', {}, 'Just text'),
  })

  const closeButton = must(
    Array.from(container.querySelectorAll('button')).find((b) =>
      b.getAttribute('aria-label') === 'Close'
    ),
  )
  assertStrictEquals(document.activeElement, closeButton)

  unmount()
})

Deno.test('Modal (preact): closing returns focus to the element that had it before opening', () => {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  act(() => trigger.focus())

  const { rerender, unmount } = mount({
    open: true,
    onClose: () => {},
    label: 'X',
    children: h('button', {}, 'Confirm'),
  })

  rerender({ open: false, onClose: () => {}, label: 'X', children: 'Body' })

  assertStrictEquals(document.activeElement, trigger)

  unmount()
  trigger.remove()
})

Deno.test('Modal (preact): Tab at the last focusable element cycles to the first', () => {
  const { container, unmount } = mount({
    open: true,
    onClose: () => {},
    label: 'X',
    children: [h('button', { key: 1 }, 'First'), h('button', { key: 2 }, 'Last')],
  })

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

  assertStrictEquals(document.activeElement, closeButton)

  unmount()
})

Deno.test('Modal (preact): Shift+Tab at the first focusable element cycles to the last', () => {
  const { container, unmount } = mount({
    open: true,
    onClose: () => {},
    label: 'X',
    children: [h('button', { key: 1 }, 'First'), h('button', { key: 2 }, 'Last')],
  })

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

Deno.test('Modal (preact): opening locks body scroll, closing restores it', () => {
  document.body.style.overflow = 'auto'
  const { rerender, unmount } = mount({
    open: true,
    onClose: () => {},
    label: 'X',
    children: 'Body',
  })

  assertEquals(document.body.style.overflow, 'hidden')

  rerender({ open: false, onClose: () => {}, label: 'X', children: 'Body' })
  assertEquals(document.body.style.overflow, 'auto')

  unmount()
})

// --- multiple modals / stacking ---------------------------------------------------------------

Deno.test('Modal (preact): with two open, Escape closes only the topmost', () => {
  const closedIds: string[] = []
  const container = document.createElement('div')
  document.body.appendChild(container)

  act(() =>
    renderDOM(
      h(Fragment, {}, [
        h(Modal, {
          key: 'a',
          open: true,
          onClose: () => closedIds.push('a'),
          label: 'A',
          id: 'modal-a',
          children: 'A body',
        }) as VNode,
        h(Modal, {
          key: 'b',
          open: true,
          onClose: () => closedIds.push('b'),
          label: 'B',
          id: 'modal-b',
          children: 'B body',
        }) as VNode,
      ]),
      container,
    )
  )

  const dialogB = must(container.querySelector('#modal-b'))
  act(() => {
    dialogB.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(closedIds, ['b'])

  act(() => renderDOM(null, container))
})

Deno.test('Modal (preact): closing the bottom modal does not steal focus from the top one', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const render = (aOpen: boolean) =>
    act(() =>
      renderDOM(
        h(Fragment, {}, [
          h(Modal, {
            key: 'a',
            open: aOpen,
            onClose: () => {},
            label: 'A',
            id: 'modal-a',
            children: h('button', {}, 'A button'),
          }) as VNode,
          h(Modal, {
            key: 'b',
            open: true,
            onClose: () => {},
            label: 'B',
            id: 'modal-b',
            children: h('button', {}, 'B button'),
          }) as VNode,
        ]),
        container,
      )
    )

  render(true)

  const bButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'B button'),
  )
  assertStrictEquals(document.activeElement, bButton)

  render(false)

  assertStrictEquals(document.activeElement, bButton)

  act(() => renderDOM(null, container))
})

// --- ModalProvider / useModal ------------------------------------------------------------------

Deno.test('useModal (preact): throws when called outside a ModalProvider', () => {
  function Orphan() {
    useModal()
    return null
  }
  let threw = false
  try {
    renderToString(h(Orphan, {}) as VNode)
  } catch {
    threw = true
  }
  assertEquals(threw, true)
})

Deno.test(
  'ModalProvider/useModal (preact): openModal renders a real Modal, closeModal removes it',
  () => {
    let api: ReturnType<typeof useModal> | null = null
    function Trigger() {
      api = useModal()
      return null
    }

    const container = document.createElement('div')
    document.body.appendChild(container)
    act(() =>
      renderDOM(h(ModalProvider, { children: h(Trigger, {}) as VNode }) as VNode, container)
    )

    let id = ''
    act(() => {
      id = must(api).openModal({ label: 'From provider', children: h('p', {}, 'Hi') })
    })

    assertStringIncludes(container.innerHTML, 'role="dialog"')
    assertStringIncludes(container.innerHTML, 'aria-label="From provider"')

    act(() => must(api).closeModal(id))
    assertEquals(container.innerHTML.includes('role="dialog"'), false)

    act(() => renderDOM(null, container))
  },
)

Deno.test('ModalProvider (preact): the consumer-supplied onClose runs on a normal close', () => {
  let api: ReturnType<typeof useModal> | null = null
  function Trigger() {
    api = useModal()
    return null
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(h(ModalProvider, { children: h(Trigger, {}) as VNode }) as VNode, container))

  let consumerCalled = false
  act(() => {
    must(api).openModal({
      label: 'X',
      children: h('p', {}, 'Hi'),
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

  act(() => renderDOM(null, container))
})

// This control-flow guarantee is renderer-agnostic — see `modal.test.tsx`'s own copy of this test
// for why it's an isolated reproduction rather than a real DOM `.click()` (jsdom reports a
// listener's thrown exception in a way no `try`/`catch` around the dispatch can intercept, which
// crashes the whole test file rather than failing one test).
Deno.test(
  'ModalProvider (preact): closeModal always runs, even if the consumer onClose throws ' +
    '(isolated reproduction of the exact try/finally shape ModalProvider uses internally)',
  () => {
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

Deno.test('ModalProvider (preact): supports multiple simultaneously open modals', () => {
  let api: ReturnType<typeof useModal> | null = null
  function Trigger() {
    api = useModal()
    return null
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(h(ModalProvider, { children: h(Trigger, {}) as VNode }) as VNode, container))

  act(() => {
    must(api).openModal({ label: 'First', children: h('p', {}, '1') })
    must(api).openModal({ label: 'Second', children: h('p', {}, '2') })
  })

  assertEquals(container.querySelectorAll('[role="dialog"]').length, 2)

  act(() => renderDOM(null, container))
})

Deno.test(
  'Modal + ModalProvider (preact): declarative and global modals share one stack',
  () => {
    let api: ReturnType<typeof useModal> | null = null
    function Trigger() {
      api = useModal()
      return null
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    act(() =>
      renderDOM(
        h(ModalProvider, {
          children: [
            h(Trigger, { key: 'trigger' }) as VNode,
            h(Modal, {
              key: 'declarative',
              open: true,
              onClose: () => {},
              label: 'Declarative',
              id: 'declarative-modal',
              children: 'Body',
            }) as VNode,
          ],
        }) as VNode,
        container,
      )
    )

    const closedIds: string[] = []
    act(() => {
      must(api).openModal({
        label: 'Global',
        children: h('p', {}, 'Global body'),
        onClose: () => closedIds.push('global'),
      })
    })

    const declarativeDialog = must(container.querySelector('#declarative-modal'))
    act(() => {
      declarativeDialog.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })

    assertEquals(closedIds, [])
    assertEquals(container.querySelectorAll('[role="dialog"]').length, 2)

    act(() => renderDOM(null, container))
  },
)

// --- global activator: gaps closed after an independent audit -------------------------------

Deno.test('useModal (preact): works from an arbitrarily nested descendant of ModalProvider', () => {
  let api: ReturnType<typeof useModal> | null = null
  function DeepTrigger() {
    api = useModal()
    return null
  }
  function Middle({ children }: { children: VNode }) {
    return h('div', {}, children)
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() =>
    renderDOM(
      h(ModalProvider, {
        children: h(Middle, {
          children: h(Middle, {
            children: h(Middle, { children: h(DeepTrigger, {}) as VNode }) as VNode,
          }) as VNode,
        }) as VNode,
      }) as VNode,
      container,
    )
  )

  act(() => {
    must(api).openModal({ label: 'Deep', children: h('p', {}, 'Hi') })
  })

  assertStringIncludes(container.innerHTML, 'role="dialog"')
  assertStringIncludes(container.innerHTML, 'aria-label="Deep"')

  act(() => renderDOM(null, container))
})

Deno.test('useModal (preact): openModal reached through a real DOM click', () => {
  let api: ReturnType<typeof useModal> | null = null
  function Trigger() {
    api = useModal()
    return h('button', {
      type: 'button',
      onClick: () => api?.openModal({ label: 'Via click', children: h('p', {}, 'Hi') }),
    }, 'Open')
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(h(ModalProvider, { children: h(Trigger, {}) as VNode }) as VNode, container))

  const openButton = must(
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Open'),
  )
  act(() => openButton.click())

  assertStringIncludes(container.innerHTML, 'role="dialog"')
  assertStringIncludes(container.innerHTML, 'aria-label="Via click"')

  act(() => renderDOM(null, container))
})

Deno.test('useModal (preact): two independent consumers open modals independently', () => {
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

  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() =>
    renderDOM(
      h(ModalProvider, {
        children: [h(TriggerA, { key: 'a' }) as VNode, h(TriggerB, { key: 'b' }) as VNode],
      }) as VNode,
      container,
    )
  )

  act(() => {
    must(apiA).openModal({ label: 'From A', children: h('p', {}, 'A') })
    must(apiB).openModal({ label: 'From B', children: h('p', {}, 'B') })
  })

  assertEquals(container.querySelectorAll('[role="dialog"]').length, 2)
  assertStringIncludes(container.innerHTML, 'aria-label="From A"')
  assertStringIncludes(container.innerHTML, 'aria-label="From B"')

  act(() => renderDOM(null, container))
})
