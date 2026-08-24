import { must } from '../../unit/components/dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { assertEquals } from '@std/assert'
import { Menu } from 'components/Menu/index.ts'
import type { MenuItem } from 'components/Menu/types.ts'

/**
 * Real cross-component composition: `Menu` (`components/Menu/index.ts`) composes real `Button`
 * instances (one disclosure toggle per `<li>` with a `submenu`) — moved here from
 * `unit/components/menu.test.tsx` (test-tier placement audit, 2026-08-21) because what's under
 * test is coordination BETWEEN sibling `<li>`s, each with its own real `Button`, not one `Button`
 * or one `<li>` in isolation.
 *
 * `Menu`'s other tests (SSR structure, single-toggle open/close, controlled/uncontrolled,
 * hover/render open modes) stay in `unit/components/menu.test.tsx` — they exercise a single item,
 * no real cross-sibling interaction.
 */

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

function mount(element: ReturnType<typeof Menu>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    unmount: () => act(() => root.unmount()),
  }
}

Deno.test('Menu: onClick — clicking the disclosure toggle opens its own submenu, real DOM', () => {
  const { container, unmount } = mount(<Menu items={items} label='Main' />)

  const services = container.querySelectorAll('li')[1]
  const toggle = must(services.querySelector<HTMLButtonElement>('button'))
  assertEquals(toggle.getAttribute('aria-expanded'), 'false')
  assertEquals(services.querySelector('[data-space-ui="menu-submenu"]'), null)

  act(() => toggle.click())

  assertEquals(toggle.getAttribute('aria-expanded'), 'true')
  assertEquals(services.querySelector('[data-space-ui="menu-submenu"]') !== null, true)

  unmount()
})

Deno.test('Menu: onClick — opening one submenu never closes a sibling (no accordion)', () => {
  const { container, unmount } = mount(<Menu items={items} label='Main' />)

  const [, services, gear] = container.querySelectorAll('li')
  const servicesToggle = must(services.querySelector<HTMLButtonElement>('button'))
  const gearToggle = must(gear.querySelector<HTMLButtonElement>('button'))

  act(() => servicesToggle.click())
  act(() => gearToggle.click())

  assertEquals(servicesToggle.getAttribute('aria-expanded'), 'true')
  assertEquals(gearToggle.getAttribute('aria-expanded'), 'true')

  unmount()
})
