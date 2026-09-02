import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import logger from 'shared/client-logger.ts'
import { Drawer } from 'components/Drawer/index.ts'
import { Modal } from 'components/Modal/index.ts'

function mount(element: ReturnType<typeof Drawer>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Drawer>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Drawer: SSR — closed renders nothing at all', () => {
  const html = renderToStaticMarkup(
    <Drawer open={false} onClose={() => {}} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )

  assertEquals(html, '')
})

Deno.test('Drawer: SSR — open renders role=dialog/aria-modal, no portal needed', () => {
  const html = renderToStaticMarkup(
    <Drawer open onClose={() => {}} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )

  assertStringIncludes(html, 'role="dialog"')
  assertStringIncludes(html, 'aria-modal="true"')
  assertStringIncludes(html, 'aria-label="Cart"')
  assertStringIncludes(html, 'data-space-ui="drawer"')
})

Deno.test('Drawer: ariaLabelledBy works as the accessible name instead of label', () => {
  const html = renderToStaticMarkup(
    <Drawer open onClose={() => {}} side='left' ariaLabelledBy='cart-heading'>
      <h2 id='cart-heading'>Your cart</h2>
    </Drawer>,
  )

  assertStringIncludes(html, 'aria-labelledby="cart-heading"')
})

Deno.test('Drawer: neither label nor ariaLabelledBy warns via the shared logger', () => {
  const calls: unknown[][] = []
  const originalWarn = logger.warn
  logger.warn = (...args: unknown[]) => {
    calls.push(args)
  }

  try {
    renderToStaticMarkup(
      // deno-lint-ignore no-explicit-any
      <Drawer open onClose={() => {}} side='left' {...({} as any)}>
        <p>Empty</p>
      </Drawer>,
    )
  } finally {
    logger.warn = originalWarn
  }

  assertEquals(calls.length, 1)
  assertStringIncludes(String(calls[0][0]), 'Drawer: neither `label` nor `ariaLabelledBy`')
  assertEquals(calls[0][1], 'noSave')
})

Deno.test('Drawer: id/className land on the panel element', () => {
  const html = renderToStaticMarkup(
    <Drawer open onClose={() => {}} side='left' label='Cart' id='cart-drawer' className='panel'>
      <p>Empty</p>
    </Drawer>,
  )

  assertStringIncludes(html, 'id="cart-drawer"')
  assertStringIncludes(html, 'class="panel"')
})

// --- side positioning --------------------------------------------------------------------------
//
// Positioning moved from an inline `style` attribute to a self-rendered `<style>` element (a real
// CSP fix — see `DRAWER_POSITION_CSS`'s own doc) — the panel now carries no `style` attribute at
// all, only a `data-side` marker the injected CSS text keys its per-side rule off of.

function styleTagText(html: string): string {
  return must(html.match(/<style[^>]*>([^<]+)<\/style>/))[1]
}

Deno.test('Drawer: the panel element itself carries no style attribute', () => {
  const html = renderToStaticMarkup(
    <Drawer open onClose={() => {}} side='left' label='Nav'>
      <p>Links</p>
    </Drawer>,
  )

  assertEquals(/data-space-ui="drawer"[^>]*style="/.test(html), false)
})

Deno.test('Drawer: side="left" carries data-side="left", and the injected CSS anchors top/left/bottom, no right', () => {
  const html = renderToStaticMarkup(
    <Drawer open onClose={() => {}} side='left' label='Nav'>
      <p>Links</p>
    </Drawer>,
  )

  assertStringIncludes(html, 'data-side="left"')

  const css = styleTagText(html)
  const rule = must(css.match(/\[data-space-ui='drawer'\]\[data-side='left'\]\{([^}]+)\}/))[1]
  assertStringIncludes(rule, 'top:0')
  assertStringIncludes(rule, 'left:0')
  assertStringIncludes(rule, 'bottom:0')
  assertEquals(rule.includes('right:0'), false)
})

Deno.test('Drawer: side="bottom" carries data-side="bottom", and the injected CSS anchors bottom/left/right, no top', () => {
  const html = renderToStaticMarkup(
    <Drawer open onClose={() => {}} side='bottom' label='Filters'>
      <p>Options</p>
    </Drawer>,
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

Deno.test('Drawer: nonce lands on the injected style element', () => {
  const html = renderToStaticMarkup(
    <Drawer open onClose={() => {}} side='left' label='Cart' nonce='abc123'>
      <p>Empty</p>
    </Drawer>,
  )

  assertStringIncludes(html, '<style nonce="abc123">')
})

Deno.test('Drawer: with no nonce given, the style element renders without one', () => {
  const html = renderToStaticMarkup(
    <Drawer open onClose={() => {}} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )

  assertStringIncludes(html, '<style>')
})

// --- backdrop / outside click ------------------------------------------------------------------

Deno.test('Drawer: showOverlay=true (default) renders a backdrop', () => {
  const html = renderToStaticMarkup(
    <Drawer open onClose={() => {}} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )

  assertStringIncludes(html, 'data-space-ui="drawer-backdrop"')
})

Deno.test('Drawer: showOverlay=false renders no backdrop, closes on outside click', () => {
  const { container, unmount } = mount(
    <Drawer open onClose={() => {}} side='left' label='Cart' showOverlay={false}>
      <p>Empty</p>
    </Drawer>,
  )

  assertEquals(container.querySelector('[data-space-ui="drawer-backdrop"]'), null)

  unmount()
})

Deno.test('Drawer: with a backdrop, an outside click never closes it', () => {
  let closed = false
  const { unmount } = mount(
    <Drawer open onClose={() => (closed = true)} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )

  act(() => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })))

  assertEquals(closed, false)

  unmount()
})

Deno.test('Drawer: without a backdrop, an outside click closes it', () => {
  let closed = false
  const { unmount } = mount(
    <Drawer open onClose={() => (closed = true)} side='left' label='Cart' showOverlay={false}>
      <p>Empty</p>
    </Drawer>,
  )

  act(() => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })))

  assertEquals(closed, true)

  unmount()
})

// --- close button / Escape --------------------------------------------------------------------

Deno.test('Drawer: renders a real, accessible close button', () => {
  const { container, unmount } = mount(
    <Drawer open onClose={() => {}} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )

  const closeButton = must(container.querySelector('button'))
  assertEquals(closeButton.getAttribute('aria-label'), 'Close')

  unmount()
})

Deno.test('Drawer: the close button has real, aria-hidden visible content by default', () => {
  const { container, unmount } = mount(
    <Drawer open onClose={() => {}} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )

  const closeButton = must(container.querySelector('button[aria-label="Close"]'))
  const svg = closeButton.querySelector('svg')
  assertEquals(svg !== null, true)
  assertEquals(must(svg).getAttribute('aria-hidden'), 'true')

  unmount()
})

Deno.test('Drawer: closeButtonContent overrides the default close icon', () => {
  const { container, unmount } = mount(
    <Drawer
      open
      onClose={() => {}}
      side='left'
      label='Cart'
      closeButtonContent={<span data-testid='my-close-icon'>×</span>}
    >
      <p>Empty</p>
    </Drawer>,
  )

  const closeButton = must(container.querySelector('button[aria-label="Close"]'))
  assertEquals(closeButton.querySelector('svg'), null)
  assertEquals(closeButton.querySelector('[data-testid="my-close-icon"]') !== null, true)
  // `aria-label="Close"` stays the accessible name regardless of which content renders.
  assertEquals(closeButton.getAttribute('aria-label'), 'Close')

  unmount()
})

Deno.test('Drawer: Escape closes by default', () => {
  let closed = false
  const { container, unmount } = mount(
    <Drawer open onClose={() => (closed = true)} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )

  act(() => {
    must(container.querySelector('[role="dialog"]')).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })

  assertEquals(closed, true)

  unmount()
})

Deno.test('Drawer: closeOnEscape=false disables it', () => {
  let closed = false
  const { container, unmount } = mount(
    <Drawer open onClose={() => (closed = true)} side='left' label='Cart' closeOnEscape={false}>
      <p>Empty</p>
    </Drawer>,
  )

  act(() => {
    must(container.querySelector('[role="dialog"]')).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })

  assertEquals(closed, false)

  unmount()
})

// --- focus management ------------------------------------------------------------------------

Deno.test('Drawer: opening moves focus to the first focusable content element', () => {
  const { unmount } = mount(
    <Drawer open onClose={() => {}} side='left' label='Cart'>
      <a href='/checkout'>Checkout</a>
    </Drawer>,
  )

  assertEquals(document.activeElement?.textContent, 'Checkout')

  unmount()
})

Deno.test('Drawer: with no focusable content, the close button gets focus', () => {
  const { unmount } = mount(
    <Drawer open onClose={() => {}} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )

  assertEquals(document.activeElement?.getAttribute('aria-label'), 'Close')

  unmount()
})

Deno.test('Drawer: closing returns focus to the element that had it before opening', () => {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  trigger.focus()

  const { rerender, unmount } = mount(
    <Drawer open={false} onClose={() => {}} side='left' label='Cart'>
      <a href='/checkout'>Checkout</a>
    </Drawer>,
  )

  rerender(
    <Drawer open onClose={() => {}} side='left' label='Cart'>
      <a href='/checkout'>Checkout</a>
    </Drawer>,
  )
  rerender(
    <Drawer open={false} onClose={() => {}} side='left' label='Cart'>
      <a href='/checkout'>Checkout</a>
    </Drawer>,
  )

  assertEquals(document.activeElement, trigger)

  unmount()
  trigger.remove()
})

// --- scroll lock -----------------------------------------------------------------------------

Deno.test('Drawer: opening locks body scroll, closing restores it', () => {
  document.body.style.overflow = 'auto'
  const { rerender, unmount } = mount(
    <Drawer open={false} onClose={() => {}} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )

  rerender(
    <Drawer open onClose={() => {}} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )
  assertEquals(document.body.style.overflow, 'hidden')

  rerender(
    <Drawer open={false} onClose={() => {}} side='left' label='Cart'>
      <p>Empty</p>
    </Drawer>,
  )
  assertEquals(document.body.style.overflow, 'auto')

  unmount()
})

// --- shares the overlay stack with Modal --------------------------------------------------------

Deno.test('Drawer + Modal: only the topmost (either kind) responds to Escape', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  let drawerClosed = false
  let modalClosed = false

  act(() =>
    root.render(
      <>
        <Drawer open onClose={() => (drawerClosed = true)} side='left' label='Nav'>
          <a href='/a'>A</a>
        </Drawer>
        <Modal open onClose={() => (modalClosed = true)} label='Confirm'>
          <a href='/b'>B</a>
        </Modal>
      </>,
    )
  )

  // Modal mounted second — it's the topmost overlay regardless of kind. Dispatching Escape on the
  // DRAWER's own subtree still reaches its handler (same-element bubbling, unlike a cross-subtree
  // dispatch) — this is what actually proves `isTopOverlay` defers correctly cross-kind: the
  // Drawer's own handler runs but no-ops because Modal, not it, is topmost.
  act(() => {
    must(container.querySelector('[role="dialog"][aria-label="Nav"]')).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })
  assertEquals(drawerClosed, false)
  assertEquals(modalClosed, false)

  // The Modal, correctly topmost, still responds to its own Escape normally.
  act(() => {
    must(container.querySelector('[role="dialog"][aria-label="Confirm"]')).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })
  assertEquals(modalClosed, true)
  assertEquals(drawerClosed, false)

  act(() => root.unmount())
})
