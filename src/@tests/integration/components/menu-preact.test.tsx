import { must } from '../../unit/components/dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import { act } from 'preact/test-utils'
import { assertEquals } from '@std/assert'
import { Menu } from 'components/Menu/index.preact.ts'
import type { MenuItem, MenuProps } from 'components/Menu/index.preact.ts'

// See `menu.test.tsx`'s own doc (same directory) for why these live in `integration/` rather than
// `unit/`. Preact binding — same contract, same rendered behavior as the React version.

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

function mount(props: MenuProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(h(Menu, props), container))
  return {
    container,
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('Menu (preact): onClick — clicking the disclosure toggle opens its own submenu', () => {
  const { container, unmount } = mount({ items, label: 'Main' })

  const services = container.querySelectorAll('li')[1]
  const toggle = must(services.querySelector<HTMLButtonElement>('button'))
  assertEquals(toggle.getAttribute('aria-expanded'), 'false')

  act(() => toggle.click())

  assertEquals(toggle.getAttribute('aria-expanded'), 'true')
  assertEquals(services.querySelector('[data-space-ui="menu-submenu"]') !== null, true)

  unmount()
})

Deno.test('Menu (preact): onClick — opening one submenu never closes a sibling', () => {
  const { container, unmount } = mount({ items, label: 'Main' })

  const [, services, gear] = container.querySelectorAll('li')
  const servicesToggle = must(services.querySelector<HTMLButtonElement>('button'))
  const gearToggle = must(gear.querySelector<HTMLButtonElement>('button'))

  act(() => servicesToggle.click())
  act(() => gearToggle.click())

  assertEquals(servicesToggle.getAttribute('aria-expanded'), 'true')
  assertEquals(gearToggle.getAttribute('aria-expanded'), 'true')

  unmount()
})
