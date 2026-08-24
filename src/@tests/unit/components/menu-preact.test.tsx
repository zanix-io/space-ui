import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { useState } from 'preact/hooks'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Menu } from 'components/Menu/index.preact.ts'
import type { MenuItem, MenuProps } from 'components/Menu/types.ts'

// Unlike every hookless Preact component in this package, `Menu` uses real hooks — built with
// `h(Menu, props)` and rendered through Preact's own pipeline, not called as a plain function.
// See `counter-preact.test.tsx`'s own doc for the same reasoning.

const items: MenuItem[] = [
  { label: 'Home', url: '/' },
  {
    label: 'Services',
    url: '/services',
    submenu: [
      { label: 'Consulting', url: '/services/consulting' },
      { label: 'Support', url: '/services/support' },
    ],
  },
  {
    label: 'Gear',
    icon: { href: '/sprite.svg', name: 'gear', viewBox: '0 0 24 24' },
    submenu: [{ label: 'Sub A', url: '/a' }],
  },
]

function element(props: MenuProps): VNode {
  return h(Menu, props) as VNode
}

function mount(props: MenuProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: MenuProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function mountVNode(vnode: VNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(vnode, container))
  return {
    container,
    unmount: () => act(() => renderDOM(null, container)),
  }
}

// Preact binds `onMouseEnter`/`onMouseLeave` directly to the native (non-bubbling) `mouseenter`/
// `mouseleave` events — confirmed empirically to differ from React, which synthesizes them from
// bubbling `mouseover`/`mouseout` at a delegated root (see `menu.test.tsx`'s own helpers).
function mouseOver(target: Element) {
  target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, cancelable: true }))
}

function mouseOut(target: Element) {
  target.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false, cancelable: true }))
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Menu (preact): SSR markup — nav, ul, plain links, no role="menu"', () => {
  const html = renderToString(element({ items, label: 'Main' }))

  assertStringIncludes(html, 'data-space-ui="menu"')
  assertStringIncludes(html, 'aria-label="Main"')
  assertStringIncludes(html, 'data-space-ui="menu-list"')
  assertStringIncludes(html, '<a href="/"')
  assertEquals(html.includes('role="menu"'), false)
})

Deno.test('Menu (preact): id/className land on the root <nav>', () => {
  const html = renderToString(element({ items, label: 'Main', id: 'site-nav', className: 'big' }))

  assertStringIncludes(html, '<nav')
  assertStringIncludes(html, 'id="site-nav"')
  assertStringIncludes(html, 'class="big"')
})

// --- top-level toggle ------------------------------------------------------------------------

Deno.test('Menu (preact): toggle=true renders a real toggle button with aria-expanded', () => {
  const html = renderToString(element({ items, label: 'Main', toggle: true }))

  assertStringIncludes(html, 'data-space-ui="button"')
  assertStringIncludes(html, 'aria-expanded="false"')
})

Deno.test('Menu (preact): toggle=true, closed by default — list absent from markup', () => {
  const html = renderToString(element({ items, label: 'Main', toggle: true }))

  assertEquals(html.includes('data-space-ui="menu-list"'), false)
})

Deno.test('Menu (preact): toggle=true with defaultOpen renders the list immediately', () => {
  const html = renderToString(element({ items, label: 'Main', toggle: true, defaultOpen: true }))

  assertStringIncludes(html, 'data-space-ui="menu-list"')
  assertStringIncludes(html, 'aria-expanded="true"')
})

Deno.test('Menu (preact): clicking the toggle button opens the list, real DOM', () => {
  const { container, unmount } = mount({ items, label: 'Main', toggle: true })

  const toggleButton = must(container.querySelector<HTMLButtonElement>('button'))
  assertEquals(toggleButton.getAttribute('aria-expanded'), 'false')
  assertEquals(container.querySelector('[data-space-ui="menu-list"]'), null)

  act(() => toggleButton.click())

  assertEquals(toggleButton.getAttribute('aria-expanded'), 'true')
  assertEquals(container.querySelector('[data-space-ui="menu-list"]') !== null, true)

  unmount()
})

Deno.test('Menu (preact): clicking outside closes the toggled menu', () => {
  const { container, unmount } = mount({ items, label: 'Main', toggle: true, defaultOpen: true })

  assertEquals(container.querySelector('[data-space-ui="menu-list"]') !== null, true)

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="menu-list"]'), null)

  unmount()
})

// --- open / defaultOpen / onOpenChange ------------------------------------------------------

Deno.test('Menu (preact): uncontrolled — onOpenChange fires, toggle still opens itself', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    items,
    label: 'Main',
    toggle: true,
    onOpenChange: (next) => calls.push(next),
  })
  const toggleButton = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => toggleButton.click())

  assertEquals(calls, [true])
  assertEquals(toggleButton.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test('Menu (preact): controlled — a click notifies onOpenChange but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    items,
    label: 'Main',
    toggle: true,
    open: false,
    onOpenChange: (next) => calls.push(next),
  })
  const toggleButton = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => toggleButton.click())

  assertEquals(calls, [true])
  assertEquals(toggleButton.getAttribute('aria-expanded'), 'false')
  assertEquals(container.querySelector('[data-space-ui="menu-list"]'), null)

  unmount()
})

Deno.test('Menu (preact): controlled — updating open re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount({
    items,
    label: 'Main',
    toggle: true,
    open: false,
  })

  assertEquals(container.querySelector('[data-space-ui="menu-list"]'), null)

  rerender({ items, label: 'Main', toggle: true, open: true })

  assertEquals(container.querySelector('[data-space-ui="menu-list"]') !== null, true)
  assertEquals(
    must(container.querySelector<HTMLButtonElement>('button')).getAttribute('aria-expanded'),
    'true',
  )

  unmount()
})

Deno.test('Menu (preact): controlled — a full click round-trip via real external state', () => {
  function Wrapper() {
    const [open, setOpen] = useState(false)
    return h(Menu, { items, label: 'Main', toggle: true, open, onOpenChange: setOpen })
  }
  const { container, unmount } = mountVNode(h(Wrapper, {}))
  const toggleButton = must(container.querySelector<HTMLButtonElement>('button'))

  assertEquals(toggleButton.getAttribute('aria-expanded'), 'false')
  act(() => toggleButton.click())
  assertEquals(toggleButton.getAttribute('aria-expanded'), 'true')
  act(() => toggleButton.click())
  assertEquals(toggleButton.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Menu (preact): open takes precedence over defaultOpen when both are given', () => {
  const { container: closedFirst, unmount: unmountClosed } = mount({
    items,
    label: 'Main',
    toggle: true,
    open: false,
    defaultOpen: true,
  })
  assertEquals(closedFirst.querySelector('[data-space-ui="menu-list"]'), null)
  unmountClosed()

  const { container: openFirst, unmount: unmountOpen } = mount({
    items,
    label: 'Main',
    toggle: true,
    open: true,
    defaultOpen: false,
  })
  assertEquals(openFirst.querySelector('[data-space-ui="menu-list"]') !== null, true)
  unmountOpen()
})

// --- item shapes -----------------------------------------------------------------------------

Deno.test('Menu (preact): an item with url and no submenu is a plain navigable Link', () => {
  const html = renderToString(element({ items: [{ label: 'Home', url: '/' }], label: 'Main' }))

  assertStringIncludes(html, '<a href="/"')
  assertStringIncludes(html, 'data-space-ui="link"')
  assertEquals(html.includes('aria-expanded'), false)
})

Deno.test('Menu (preact): an item with submenu and no url is a single control', () => {
  const html = renderToString(
    element({ items: [{ label: 'Gear', submenu: [{ label: 'A', url: '/a' }] }], label: 'Main' }),
  )

  assertStringIncludes(html, 'data-space-ui="button"')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('<a '), false)
})

Deno.test('Menu (preact): an item with url AND submenu renders two separate controls', () => {
  const html = renderToString(
    element({
      items: [{
        label: 'Services',
        url: '/services',
        submenu: [{ label: 'A', url: '/services/a' }],
      }],
      label: 'Main',
    }),
  )

  const anchorHtml = html.slice(html.indexOf('<a href="/services"'), html.indexOf('</a>'))
  assertEquals(anchorHtml.includes('aria-expanded'), false)
  assertStringIncludes(html, 'aria-expanded="false"')
  assertStringIncludes(html, 'aria-label="Services submenu"')
})

Deno.test(
  'Menu (preact): an item with neither url nor submenu renders static, non-interactive text',
  () => {
    const html = renderToString(element({ items: [{ label: 'Just text' }], label: 'Main' }))

    assertEquals(html.includes('<a '), false)
    assertEquals(html.includes('<button'), false)
    assertStringIncludes(html, 'Just text')
  },
)

// --- onClick submenu interaction (default openMode) -------------------------------------------

// The two cross-sibling coordination tests moved to
// `integration/components/menu-preact.test.tsx` — see `unit/components/menu.test.tsx`'s own doc.

Deno.test(
  "Menu (preact): onClick — a click inside an item's own open submenu does not close it",
  () => {
    const { container, unmount } = mount({ items, label: 'Main' })

    const services = container.querySelectorAll('li')[1]
    const servicesToggle = must(services.querySelector<HTMLButtonElement>('button'))

    act(() => servicesToggle.click())
    const consultingLink = must(services.querySelector('[data-space-ui="menu-submenu"] a'))

    act(() => {
      consultingLink.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    assertEquals(servicesToggle.getAttribute('aria-expanded'), 'true')

    unmount()
  },
)

Deno.test(
  'Menu (preact): onClick — each open submenu closes independently on outside click',
  () => {
    const { container, unmount } = mount({ items, label: 'Main' })

    const [, services, gear] = container.querySelectorAll('li')
    const servicesToggle = must(services.querySelector<HTMLButtonElement>('button'))
    const gearToggle = must(gear.querySelector<HTMLButtonElement>('button'))

    act(() => servicesToggle.click())
    act(() => {
      gear.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    assertEquals(servicesToggle.getAttribute('aria-expanded'), 'false')

    act(() => gearToggle.click())
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    assertEquals(gearToggle.getAttribute('aria-expanded'), 'false')

    unmount()
  },
)

Deno.test(
  'Menu (preact): Escape closes only the innermost open level, returns focus to its trigger',
  () => {
    const nested: MenuItem[] = [
      {
        label: 'Services',
        submenu: [
          { label: 'Consulting', submenu: [{ label: 'Deep', url: '/deep' }] },
        ],
      },
    ]
    const { container, unmount } = mount({ items: nested, label: 'Main' })

    const servicesToggle = container.querySelectorAll('button')[0]
    act(() => servicesToggle.click())
    const consultingToggle = container.querySelectorAll('button')[1]
    act(() => consultingToggle.click())

    assertEquals(servicesToggle.getAttribute('aria-expanded'), 'true')
    assertEquals(consultingToggle.getAttribute('aria-expanded'), 'true')

    act(() => consultingToggle.focus())
    act(() => {
      consultingToggle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })

    assertEquals(consultingToggle.getAttribute('aria-expanded'), 'false')
    assertEquals(servicesToggle.getAttribute('aria-expanded'), 'true')
    assertEquals(document.activeElement, consultingToggle)

    unmount()
  },
)

// --- onHover ---------------------------------------------------------------------------------

Deno.test('Menu (preact): onHover — mouse hover opens, mouse leave (unfocused) closes', () => {
  const { container, unmount } = mount({ items, label: 'Main', openMode: 'onHover' })

  const services = container.querySelectorAll('li')[1]
  const toggle = must(services.querySelector<HTMLButtonElement>('button'))

  act(() => mouseOver(services))
  assertEquals(toggle.getAttribute('aria-expanded'), 'true')

  act(() => mouseOut(services))
  assertEquals(toggle.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Menu (preact): onHover — keyboard focus alone opens it too, not mouse-only', () => {
  const { container, unmount } = mount({ items, label: 'Main', openMode: 'onHover' })

  const services = container.querySelectorAll('li')[1]
  const toggle = must(services.querySelector<HTMLButtonElement>('button'))

  act(() => toggle.focus())
  assertEquals(toggle.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test(
  'Menu (preact): onHover — leaving by mouse while still focused inside does not close it',
  () => {
    const { container, unmount } = mount({ items, label: 'Main', openMode: 'onHover' })

    const services = container.querySelectorAll('li')[1]
    const toggle = must(services.querySelector<HTMLButtonElement>('button'))

    act(() => mouseOver(services))
    act(() => toggle.focus())
    act(() => mouseOut(services))

    assertEquals(toggle.getAttribute('aria-expanded'), 'true')

    unmount()
  },
)

// --- onRender --------------------------------------------------------------------------------

Deno.test('Menu (preact): onRender — always expanded, no disclosure trigger rendered', () => {
  const html = renderToString(element({ items, label: 'Main', openMode: 'onRender' }))

  assertEquals(html.includes('aria-expanded'), false)
  assertEquals(html.includes('<button'), false)
  assertStringIncludes(html, 'data-space-ui="menu-submenu"')
  assertStringIncludes(html, 'Consulting')
})
