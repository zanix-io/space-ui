import { must } from './dom-test-setup.ts'
import { Fragment, h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import logger from 'shared/client-logger.ts'
import { Drawer } from 'components/Drawer/index.preact.ts'
import type { DrawerProps } from 'components/Drawer/index.preact.ts'
import { Modal } from 'components/Modal/index.preact.ts'
import type { ModalProps } from 'components/Modal/index.preact.ts'

// Unlike every hookless Preact component in this package, `Drawer` uses real hooks — built with
// `h(Drawer, props)` and rendered through Preact's own pipeline, not called as a plain function.
// See `counter-preact.test.tsx`'s own doc for the same reasoning.

function element(props: DrawerProps): VNode {
  return h(Drawer, props) as VNode
}

function mount(props: DrawerProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: DrawerProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function styleTagText(html: string): string {
  return must(html.match(/<style[^>]*>([^<]+)<\/style>/))[1]
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Drawer (preact): SSR — closed renders nothing at all', () => {
  const html = renderToString(
    element({ open: false, onClose: () => {}, side: 'left', label: 'Cart', children: 'Empty' }),
  )

  assertEquals(html, '')
})

Deno.test('Drawer (preact): SSR — open renders role=dialog/aria-modal', () => {
  const html = renderToString(
    element({ open: true, onClose: () => {}, side: 'left', label: 'Cart', children: 'Empty' }),
  )

  assertStringIncludes(html, 'role="dialog"')
  assertStringIncludes(html, 'aria-modal="true"')
  assertStringIncludes(html, 'aria-label="Cart"')
  assertStringIncludes(html, 'data-space-ui="drawer"')
})

Deno.test('Drawer (preact): ariaLabelledBy works as the accessible name', () => {
  const html = renderToString(
    element({
      open: true,
      onClose: () => {},
      side: 'left',
      ariaLabelledBy: 'cart-heading',
      children: h('h2', { id: 'cart-heading' }, 'Your cart'),
    }),
  )

  assertStringIncludes(html, 'aria-labelledby="cart-heading"')
})

Deno.test('Drawer (preact): neither label nor ariaLabelledBy warns via the shared logger', () => {
  const calls: unknown[][] = []
  const originalWarn = logger.warn
  logger.warn = (...args: unknown[]) => {
    calls.push(args)
  }

  try {
    renderToString(
      // deno-lint-ignore no-explicit-any
      element({ open: true, onClose: () => {}, side: 'left', children: 'Empty' } as any),
    )
  } finally {
    logger.warn = originalWarn
  }

  assertEquals(calls.length, 1)
  assertStringIncludes(String(calls[0][0]), 'Drawer: neither `label` nor `ariaLabelledBy`')
  assertEquals(calls[0][1], 'noSave')
})

Deno.test('Drawer (preact): id/className land on the panel element', () => {
  const html = renderToString(
    element({
      open: true,
      onClose: () => {},
      side: 'left',
      label: 'Cart',
      id: 'cart-drawer',
      className: 'panel',
      children: 'Empty',
    }),
  )

  assertStringIncludes(html, 'id="cart-drawer"')
  assertStringIncludes(html, 'class="panel"')
})

// --- side positioning ------------------------------------------------------------------------

Deno.test('Drawer (preact): the panel element itself carries no style attribute', () => {
  const html = renderToString(
    element({ open: true, onClose: () => {}, side: 'left', label: 'Nav', children: 'Links' }),
  )

  assertEquals(/data-space-ui="drawer"[^>]*style="/.test(html), false)
})

Deno.test('Drawer (preact): side="left" carries data-side="left", and the injected CSS anchors top/left/bottom, no right', () => {
  const html = renderToString(
    element({ open: true, onClose: () => {}, side: 'left', label: 'Nav', children: 'Links' }),
  )

  assertStringIncludes(html, 'data-side="left"')

  const css = styleTagText(html)
  const rule = must(css.match(/\[data-space-ui='drawer'\]\[data-side='left'\]\{([^}]+)\}/))[1]
  assertStringIncludes(rule, 'top:0')
  assertStringIncludes(rule, 'left:0')
  assertStringIncludes(rule, 'bottom:0')
  assertEquals(rule.includes('right:0'), false)
})

Deno.test('Drawer (preact): side="bottom" carries data-side="bottom", and the injected CSS anchors bottom/left/right, no top', () => {
  const html = renderToString(
    element({
      open: true,
      onClose: () => {},
      side: 'bottom',
      label: 'Filters',
      children: 'Options',
    }),
  )

  assertStringIncludes(html, 'data-side="bottom"')

  const css = styleTagText(html)
  const rule = must(css.match(/\[data-space-ui='drawer'\]\[data-side='bottom'\]\{([^}]+)\}/))[1]
  assertStringIncludes(rule, 'bottom:0')
  assertStringIncludes(rule, 'left:0')
  assertStringIncludes(rule, 'right:0')
  assertEquals(rule.includes('top:0'), false)
})

// --- nonce / CSP -----------------------------------------------------------------------------

Deno.test('Drawer (preact): nonce lands on the injected style element', () => {
  const html = renderToString(
    element({
      open: true,
      onClose: () => {},
      side: 'left',
      label: 'Cart',
      nonce: 'abc123',
      children: 'Empty',
    }),
  )

  assertStringIncludes(html, 'nonce="abc123"')
})

// --- backdrop / outside click ------------------------------------------------------------------

Deno.test('Drawer (preact): showOverlay=true (default) renders a backdrop', () => {
  const html = renderToString(
    element({ open: true, onClose: () => {}, side: 'left', label: 'Cart', children: 'Empty' }),
  )

  assertStringIncludes(html, 'data-space-ui="drawer-backdrop"')
})

Deno.test('Drawer (preact): showOverlay=false renders no backdrop, closes on outside click', () => {
  let closed = false
  const { container, unmount } = mount({
    open: true,
    onClose: () => (closed = true),
    side: 'left',
    label: 'Cart',
    showOverlay: false,
    children: 'Empty',
  })

  assertEquals(container.querySelector('[data-space-ui="drawer-backdrop"]'), null)

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(closed, true)

  unmount()
})

Deno.test('Drawer (preact): with a backdrop, an outside click never closes it', () => {
  let closed = false
  const { unmount } = mount({
    open: true,
    onClose: () => (closed = true),
    side: 'left',
    label: 'Cart',
    children: 'Empty',
  })

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(closed, false)

  unmount()
})

// --- close button / Escape --------------------------------------------------------------------

Deno.test('Drawer (preact): renders a real, accessible close button', () => {
  const { container, unmount } = mount({
    open: true,
    onClose: () => {},
    side: 'left',
    label: 'Cart',
    children: 'Empty',
  })

  assertEquals(must(container.querySelector('button')).getAttribute('aria-label'), 'Close')

  unmount()
})

Deno.test('Drawer (preact): the close button has real, aria-hidden visible content by default', () => {
  const { container, unmount } = mount({
    open: true,
    onClose: () => {},
    side: 'left',
    label: 'Cart',
    children: 'Empty',
  })

  const closeButton = must(container.querySelector('button[aria-label="Close"]'))
  const svg = closeButton.querySelector('svg')
  assertEquals(svg !== null, true)
  assertEquals(must(svg).getAttribute('aria-hidden'), 'true')

  unmount()
})

Deno.test('Drawer (preact): closeButtonContent overrides the default close icon', () => {
  const { container, unmount } = mount({
    open: true,
    onClose: () => {},
    side: 'left',
    label: 'Cart',
    children: 'Empty',
    closeButtonContent: h('span', { 'data-testid': 'my-close-icon' }, '×'),
  })

  const closeButton = must(container.querySelector('button[aria-label="Close"]'))
  assertEquals(closeButton.querySelector('svg'), null)
  assertEquals(closeButton.querySelector('[data-testid="my-close-icon"]') !== null, true)
  assertEquals(closeButton.getAttribute('aria-label'), 'Close')

  unmount()
})

Deno.test('Drawer (preact): Escape closes by default', () => {
  let closed = false
  const { container, unmount } = mount({
    open: true,
    onClose: () => (closed = true),
    side: 'left',
    label: 'Cart',
    children: 'Empty',
  })

  act(() => {
    must(container.querySelector('[role="dialog"]')).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })

  assertEquals(closed, true)

  unmount()
})

Deno.test('Drawer (preact): closeOnEscape=false disables it', () => {
  let closed = false
  const { container, unmount } = mount({
    open: true,
    onClose: () => (closed = true),
    side: 'left',
    label: 'Cart',
    closeOnEscape: false,
    children: 'Empty',
  })

  act(() => {
    must(container.querySelector('[role="dialog"]')).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })

  assertEquals(closed, false)

  unmount()
})

// --- focus management ------------------------------------------------------------------------

Deno.test('Drawer (preact): opening moves focus to the first focusable content element', () => {
  const { unmount } = mount({
    open: true,
    onClose: () => {},
    side: 'left',
    label: 'Cart',
    children: h('a', { href: '/checkout' }, 'Checkout'),
  })

  assertEquals(document.activeElement?.textContent, 'Checkout')

  unmount()
})

Deno.test('Drawer (preact): with no focusable content, the close button gets focus', () => {
  const { unmount } = mount({
    open: true,
    onClose: () => {},
    side: 'left',
    label: 'Cart',
    children: 'Empty',
  })

  assertEquals(document.activeElement?.getAttribute('aria-label'), 'Close')

  unmount()
})

Deno.test('Drawer (preact): closing returns focus to whatever had it before opening', () => {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  trigger.focus()

  const child = h('a', { href: '/checkout' }, 'Checkout')
  const { rerender, unmount } = mount({
    open: false,
    onClose: () => {},
    side: 'left',
    label: 'Cart',
    children: child,
  })

  rerender({ open: true, onClose: () => {}, side: 'left', label: 'Cart', children: child })
  rerender({ open: false, onClose: () => {}, side: 'left', label: 'Cart', children: child })

  assertEquals(document.activeElement, trigger)

  unmount()
  trigger.remove()
})

// --- scroll lock -----------------------------------------------------------------------------

Deno.test('Drawer (preact): opening locks body scroll, closing restores it', () => {
  document.body.style.overflow = 'auto'
  const { rerender, unmount } = mount({
    open: false,
    onClose: () => {},
    side: 'left',
    label: 'Cart',
    children: 'Empty',
  })

  rerender({ open: true, onClose: () => {}, side: 'left', label: 'Cart', children: 'Empty' })
  assertEquals(document.body.style.overflow, 'hidden')

  rerender({ open: false, onClose: () => {}, side: 'left', label: 'Cart', children: 'Empty' })
  assertEquals(document.body.style.overflow, 'auto')

  unmount()
})

// --- shares the overlay stack with Modal --------------------------------------------------------

Deno.test('Drawer + Modal (preact): only the topmost (either kind) responds to Escape', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)

  let drawerClosed = false
  let modalClosed = false

  const drawerProps: DrawerProps = {
    open: true,
    onClose: () => (drawerClosed = true),
    side: 'left',
    label: 'Nav',
    children: h('a', { href: '/a' }, 'A'),
  }
  const modalProps: ModalProps = {
    open: true,
    onClose: () => (modalClosed = true),
    label: 'Confirm',
    children: h('a', { href: '/b' }, 'B'),
  }

  act(() => renderDOM(h(Fragment, {}, h(Drawer, drawerProps), h(Modal, modalProps)), container))

  act(() => {
    must(container.querySelector('[role="dialog"][aria-label="Nav"]')).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })
  assertEquals(drawerClosed, false)
  assertEquals(modalClosed, false)

  act(() => {
    must(container.querySelector('[role="dialog"][aria-label="Confirm"]')).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })
  assertEquals(modalClosed, true)
  assertEquals(drawerClosed, false)

  act(() => renderDOM(null, container))
})
