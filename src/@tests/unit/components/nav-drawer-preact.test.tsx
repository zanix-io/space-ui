import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { NavDrawer } from 'components/NavDrawer/index.preact.ts'
import type { NavDrawerItem, NavDrawerProps } from 'components/NavDrawer/index.preact.ts'

// See `nav-drawer.test.tsx`'s own doc (same directory) — Preact binding, same contract, same
// rendered behavior, real implementation shared via `render.ts`'s own `createNavDrawer`.

const items: NavDrawerItem[] = [
  { label: 'Home', url: '/' },
  {
    label: 'Docs',
    url: '/docs',
    submenu: [{ label: 'Guides', url: '/docs/guides' }],
  },
]

function element(props: NavDrawerProps): VNode {
  return h(NavDrawer, props) as VNode
}

function mount(props: NavDrawerProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('NavDrawer (preact): SSR — closed by default, only the toggle button renders', () => {
  const html = renderToString(element({ items, label: 'Main navigation' }))

  assertStringIncludes(html, 'data-space-ui="button"')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('role="dialog"'), false)
})

Deno.test('NavDrawer (preact): side defaults to left', () => {
  const html = renderToString(element({ items, label: 'Main navigation', defaultOpen: true }))

  assertStringIncludes(html, 'data-side="left"')
})

Deno.test('NavDrawer (preact): inherits composed hooks only — no redundant "nav-drawer" hook', () => {
  const html = renderToString(element({ items, label: 'Main navigation', defaultOpen: true }))

  assertStringIncludes(html, 'data-space-ui="button"')
  assertStringIncludes(html, 'data-space-ui="drawer"')
  assertStringIncludes(html, 'data-space-ui="menu"')
  assertEquals(html.includes('data-space-ui="nav-drawer"'), false)
})

Deno.test('NavDrawer (preact): clicking the toggle button opens the drawer, real DOM', () => {
  const { container, unmount } = mount({ items, label: 'Main navigation' })

  const toggle = must(container.querySelector<HTMLButtonElement>('button'))
  assertEquals(toggle.getAttribute('aria-expanded'), 'false')

  act(() => toggle.click())

  assertEquals(toggle.getAttribute('aria-expanded'), 'true')
  assertEquals(container.querySelector('[data-space-ui="drawer"]') !== null, true)

  unmount()
})

Deno.test('NavDrawer (preact): Escape closes the drawer by default', () => {
  const { container, unmount } = mount({ items, label: 'Main navigation', defaultOpen: true })

  const panel = must(container.querySelector('[data-space-ui="drawer"]'))

  act(() => {
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
  })

  assertEquals(container.querySelector('[data-space-ui="drawer"]'), null)

  unmount()
})

Deno.test('NavDrawer (preact): clicking a real navigation link inside closes the drawer', () => {
  const { container, unmount } = mount({ items, label: 'Main navigation', defaultOpen: true })

  const homeLink = must(container.querySelector<HTMLAnchorElement>('a[href="/"]'))

  act(() => {
    homeLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="drawer"]'), null)

  unmount()
})

Deno.test(
  'NavDrawer (preact): clicking a submenu disclosure button does not close the drawer',
  () => {
    const { container, unmount } = mount({ items, label: 'Main navigation', defaultOpen: true })

    const submenuToggle = must(
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((el) =>
        el.getAttribute('aria-label')?.includes('submenu')
      ),
    )

    act(() => {
      submenuToggle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    assertEquals(container.querySelector('[data-space-ui="drawer"]') !== null, true)

    unmount()
  },
)
