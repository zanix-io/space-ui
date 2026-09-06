import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
// The real, un-wrapped component — never the `defineComet`-wrapped default export (see
// `integration/components/nav-drawer.test.tsx` for that). Same reasoning `Menu`'s own unit tests
// exercise `components/Menu/index.ts`'s named export directly.
import { NavDrawer } from 'components/NavDrawer/index.ts'
import type { NavDrawerItem } from 'components/NavDrawer/index.ts'

const items: NavDrawerItem[] = [
  { label: 'Home', url: '/' },
  {
    label: 'Docs',
    url: '/docs',
    submenu: [{ label: 'Guides', url: '/docs/guides' }],
  },
]

function mount(element: ReturnType<typeof NavDrawer>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    unmount: () => act(() => root.unmount()),
  }
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('NavDrawer: SSR — closed by default, only the toggle button renders visibly', () => {
  const html = renderToStaticMarkup(<NavDrawer items={items} label='Main navigation' />)

  assertStringIncludes(html, 'data-space-ui="button"')
  assertStringIncludes(html, 'aria-expanded="false"')
  // The Drawer panel itself renders nothing at all while closed (same as `Drawer` standalone).
  assertEquals(html.includes('role="dialog"'), false)
  assertEquals(html.includes('data-space-ui="drawer"'), false)
})

Deno.test('NavDrawer: side defaults to left, unlike bare Drawer (which has no default)', () => {
  const html = renderToStaticMarkup(<NavDrawer items={items} label='Main navigation' defaultOpen />)

  assertStringIncludes(html, 'data-side="left"')
})

Deno.test('NavDrawer: an explicit side overrides the default', () => {
  const html = renderToStaticMarkup(
    <NavDrawer items={items} label='Main navigation' side='right' defaultOpen />,
  )

  assertStringIncludes(html, 'data-side="right"')
})

Deno.test('NavDrawer: nonce lands on the panel’s own <style> element', () => {
  const html = renderToStaticMarkup(
    <NavDrawer items={items} label='Main navigation' defaultOpen nonce='abc123' />,
  )

  assertStringIncludes(html, 'nonce="abc123"')
})

Deno.test('NavDrawer: inherits composed hooks only — no redundant "nav-drawer" hook', () => {
  const html = renderToStaticMarkup(<NavDrawer items={items} label='Main navigation' defaultOpen />)

  assertStringIncludes(html, 'data-space-ui="button"')
  assertStringIncludes(html, 'data-space-ui="drawer"')
  assertStringIncludes(html, 'data-space-ui="menu"')
  assertStringIncludes(html, 'data-space-ui="menu-list"')
  assertEquals(html.includes('data-space-ui="nav-drawer"'), false)
})

Deno.test('NavDrawer: an item’s icon renders through the composed Menu/Icon, unchanged', () => {
  const html = renderToStaticMarkup(
    <NavDrawer
      items={[{
        label: 'Gear',
        url: '/gear',
        icon: { href: '/s.svg', name: 'gear', viewBox: '0 0 24 24' },
      }]}
      label='Main navigation'
      defaultOpen
    />,
  )

  assertStringIncludes(html, 'data-space-ui="icon"')
  assertStringIncludes(html, 'href="/s.svg#gear"')
})

// --- open/close, real DOM -------------------------------------------------------------------

Deno.test('NavDrawer: clicking the toggle button opens the drawer, real DOM', () => {
  const { container, unmount } = mount(<NavDrawer items={items} label='Main navigation' />)

  const toggle = must(container.querySelector<HTMLButtonElement>('button'))
  assertEquals(toggle.getAttribute('aria-expanded'), 'false')
  assertEquals(container.querySelector('[data-space-ui="drawer"]'), null)

  act(() => toggle.click())

  assertEquals(toggle.getAttribute('aria-expanded'), 'true')
  assertEquals(container.querySelector('[data-space-ui="drawer"]') !== null, true)
  assertEquals(toggle.getAttribute('aria-label'), 'Close menu')

  unmount()
})

Deno.test('NavDrawer: aria-controls on the toggle matches the panel’s own id', () => {
  const { container, unmount } = mount(
    <NavDrawer items={items} label='Main navigation' defaultOpen />,
  )

  const toggle = must(container.querySelector<HTMLButtonElement>('button'))
  const panel = must(container.querySelector('[data-space-ui="drawer"]'))
  assertEquals(toggle.getAttribute('aria-controls'), panel.getAttribute('id'))

  unmount()
})

Deno.test('NavDrawer: Escape closes the drawer by default', () => {
  const { container, unmount } = mount(
    <NavDrawer items={items} label='Main navigation' defaultOpen />,
  )

  assertEquals(container.querySelector('[data-space-ui="drawer"]') !== null, true)
  const panel = must(container.querySelector('[data-space-ui="drawer"]'))

  act(() => {
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
  })

  assertEquals(container.querySelector('[data-space-ui="drawer"]'), null)

  unmount()
})

Deno.test('NavDrawer: closeOnEscape=false keeps it open on Escape', () => {
  const { container, unmount } = mount(
    <NavDrawer items={items} label='Main navigation' defaultOpen closeOnEscape={false} />,
  )

  const panel = must(container.querySelector('[data-space-ui="drawer"]'))

  act(() => {
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
  })

  assertEquals(container.querySelector('[data-space-ui="drawer"]') !== null, true)

  unmount()
})

Deno.test('NavDrawer: clicking a real navigation link inside closes the drawer', () => {
  const { container, unmount } = mount(
    <NavDrawer items={items} label='Main navigation' defaultOpen />,
  )

  assertEquals(container.querySelector('[data-space-ui="drawer"]') !== null, true)
  const homeLink = must(container.querySelector<HTMLAnchorElement>('a[href="/"]'))

  act(() => {
    homeLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="drawer"]'), null)

  unmount()
})

Deno.test(
  'NavDrawer: clicking a submenu disclosure button (not a real link) does not close the drawer',
  () => {
    const { container, unmount } = mount(
      <NavDrawer items={items} label='Main navigation' defaultOpen />,
    )

    const submenuToggle = must(
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((el) =>
        el.getAttribute('aria-label')?.includes('submenu')
      ),
    )

    act(() => {
      submenuToggle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    // Still open — a disclosure toggle isn't a real navigation, so it must not close the whole
    // drawer; it only opens its own nested submenu.
    assertEquals(container.querySelector('[data-space-ui="drawer"]') !== null, true)

    unmount()
  },
)
