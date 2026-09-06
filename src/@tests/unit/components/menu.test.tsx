import { must } from './dom-test-setup.ts'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Menu } from 'components/Menu/index.ts'
import type { MenuItem } from 'components/Menu/index.ts'

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
    rerender: (next: ReturnType<typeof Menu>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

function mouseOver(target: Element, related: EventTarget | null = null) {
  target.dispatchEvent(
    new MouseEvent('mouseover', { bubbles: true, cancelable: true, relatedTarget: related }),
  )
}

function mouseOut(target: Element, related: EventTarget | null = null) {
  target.dispatchEvent(
    new MouseEvent('mouseout', { bubbles: true, cancelable: true, relatedTarget: related }),
  )
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Menu: SSR markup — nav, ul, plain links, no role="menu"', () => {
  const html = renderToStaticMarkup(<Menu items={items} label='Main' />)

  assertStringIncludes(html, 'data-space-ui="menu"')
  assertStringIncludes(html, 'aria-label="Main"')
  assertStringIncludes(html, 'data-space-ui="menu-list"')
  assertStringIncludes(html, '<a href="/"')
  assertEquals(html.includes('role="menu"'), false)
  assertEquals(html.includes('role="menuitem"'), false)
})

Deno.test('Menu: id/className land on the root <nav>', () => {
  const html = renderToStaticMarkup(
    <Menu items={items} label='Main' id='site-nav' className='big' />,
  )

  assertStringIncludes(html, '<nav')
  assertStringIncludes(html, 'id="site-nav"')
  assertStringIncludes(html, 'class="big"')
})

Deno.test('Menu: without toggle, the list always renders — no toggle button', () => {
  const html = renderToStaticMarkup(<Menu items={items} label='Main' />)

  assertEquals(html.includes('aria-expanded'), true) // from submenu triggers, not the (absent) top toggle
  assertStringIncludes(html, 'data-space-ui="menu-list"')
})

// --- top-level toggle ------------------------------------------------------------------------

Deno.test('Menu: toggle=true renders a real toggle button with aria-expanded/aria-controls', () => {
  const html = renderToStaticMarkup(<Menu items={items} label='Main' toggle />)

  assertStringIncludes(html, 'data-space-ui="button"')
  assertStringIncludes(html, 'aria-expanded="false"')
})

Deno.test('Menu: toggle=true, defaultOpen — closed by default, list absent from markup', () => {
  const html = renderToStaticMarkup(<Menu items={items} label='Main' toggle />)

  assertEquals(html.includes('data-space-ui="menu-list"'), false)
})

Deno.test('Menu: toggle=true with defaultOpen renders the list immediately', () => {
  const html = renderToStaticMarkup(<Menu items={items} label='Main' toggle defaultOpen />)

  assertStringIncludes(html, 'data-space-ui="menu-list"')
  assertStringIncludes(html, 'aria-expanded="true"')
})

Deno.test('Menu: clicking the toggle button opens the list, real DOM', () => {
  const { container, unmount } = mount(<Menu items={items} label='Main' toggle />)

  const toggleButton = must(container.querySelector<HTMLButtonElement>('button'))
  assertEquals(toggleButton.getAttribute('aria-expanded'), 'false')
  assertEquals(container.querySelector('[data-space-ui="menu-list"]'), null)

  act(() => toggleButton.click())

  assertEquals(toggleButton.getAttribute('aria-expanded'), 'true')
  assertEquals(container.querySelector('[data-space-ui="menu-list"]') !== null, true)

  unmount()
})

Deno.test('Menu: clicking outside closes the toggled menu', () => {
  const { container, unmount } = mount(<Menu items={items} label='Main' toggle defaultOpen />)

  assertEquals(container.querySelector('[data-space-ui="menu-list"]') !== null, true)

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="menu-list"]'), null)

  unmount()
})

// --- open / defaultOpen / onOpenChange ------------------------------------------------------

Deno.test('Menu: uncontrolled — onOpenChange fires, and the toggle still opens on its own', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Menu items={items} label='Main' toggle onOpenChange={(next) => calls.push(next)} />,
  )
  const toggleButton = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => toggleButton.click())

  assertEquals(calls, [true])
  assertEquals(toggleButton.getAttribute('aria-expanded'), 'true') // still self-manages when uncontrolled

  unmount()
})

Deno.test('Menu: controlled — a click notifies onOpenChange but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Menu
      items={items}
      label='Main'
      toggle
      open={false}
      onOpenChange={(next) => calls.push(next)}
    />,
  )
  const toggleButton = must(container.querySelector<HTMLButtonElement>('button'))

  act(() => toggleButton.click())

  assertEquals(calls, [true]) // notified...
  assertEquals(toggleButton.getAttribute('aria-expanded'), 'false') // ...but nothing reopened it
  assertEquals(container.querySelector('[data-space-ui="menu-list"]'), null)

  unmount()
})

Deno.test('Menu: controlled — updating open from outside re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount(
    <Menu items={items} label='Main' toggle open={false} />,
  )

  assertEquals(container.querySelector('[data-space-ui="menu-list"]'), null)

  rerender(<Menu items={items} label='Main' toggle open />)

  assertEquals(container.querySelector('[data-space-ui="menu-list"]') !== null, true)
  assertEquals(
    must(container.querySelector<HTMLButtonElement>('button')).getAttribute('aria-expanded'),
    'true',
  )

  unmount()
})

Deno.test('Menu: controlled (open) — a full click round-trip through real external state', () => {
  function Wrapper() {
    const [open, setOpen] = useState(false)
    return <Menu items={items} label='Main' toggle open={open} onOpenChange={setOpen} />
  }
  const { container, unmount } = mount(<Wrapper />)
  const toggleButton = must(container.querySelector<HTMLButtonElement>('button'))

  assertEquals(toggleButton.getAttribute('aria-expanded'), 'false')
  act(() => toggleButton.click())
  assertEquals(toggleButton.getAttribute('aria-expanded'), 'true')
  act(() => toggleButton.click())
  assertEquals(toggleButton.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Menu: open takes precedence over defaultOpen when both are given', () => {
  const { container: closedFirst, unmount: unmountClosed } = mount(
    <Menu items={items} label='Main' toggle open={false} defaultOpen />,
  )
  assertEquals(closedFirst.querySelector('[data-space-ui="menu-list"]'), null)
  unmountClosed()

  const { container: openFirst, unmount: unmountOpen } = mount(
    <Menu items={items} label='Main' toggle open defaultOpen={false} />,
  )
  assertEquals(openFirst.querySelector('[data-space-ui="menu-list"]') !== null, true)
  unmountOpen()
})

// --- item shapes -----------------------------------------------------------------------------

Deno.test('Menu: an item with url and no submenu is a plain navigable Link', () => {
  const html = renderToStaticMarkup(<Menu items={[{ label: 'Home', url: '/' }]} label='Main' />)

  assertStringIncludes(html, '<a href="/"')
  assertStringIncludes(html, 'data-space-ui="link"')
  assertEquals(html.includes('aria-expanded'), false)
})

Deno.test('Menu: an item with url and icon renders a Link with the icon as its child', () => {
  const html = renderToStaticMarkup(
    <Menu
      items={[{
        label: 'Home',
        url: '/',
        icon: { href: '/sprite.svg', name: 'home', viewBox: '0 0 24 24' },
      }]}
      label='Main'
    />,
  )

  assertStringIncludes(html, 'data-space-ui="icon"')
  assertStringIncludes(html, 'href="/sprite.svg#home"')
})

Deno.test(
  'Menu: an item with submenu and no url is a single control (aria-expanded/aria-controls)',
  () => {
    const html = renderToStaticMarkup(
      <Menu
        items={[{ label: 'Gear', submenu: [{ label: 'A', url: '/a' }] }]}
        label='Main'
      />,
    )

    assertStringIncludes(html, 'data-space-ui="button"')
    assertStringIncludes(html, 'aria-expanded="false"')
    // Exactly one interactive control for this item — no separate <a>.
    assertEquals(html.includes('<a '), false)
  },
)

Deno.test('Menu: an item with url AND submenu renders two separate controls', () => {
  const html = renderToStaticMarkup(
    <Menu
      items={[{
        label: 'Services',
        url: '/services',
        submenu: [{ label: 'A', url: '/services/a' }],
      }]}
      label='Main'
    />,
  )

  // The <a> is a plain, unexpanded link — the disclosure attributes live on a separate <button>.
  const anchorHtml = html.slice(html.indexOf('<a href="/services"'), html.indexOf('</a>'))
  assertEquals(anchorHtml.includes('aria-expanded'), false)
  assertStringIncludes(html, 'aria-expanded="false"')
  assertStringIncludes(html, 'aria-label="Services submenu"')
})

Deno.test(
  'Menu: an item with url AND submenu AND an icon renders the icon inside the link control',
  () => {
    const html = renderToStaticMarkup(
      <Menu
        items={[{
          label: 'Services',
          url: '/services',
          icon: { href: '/sprite.svg', name: 'gear', viewBox: '0 0 24 24' },
          submenu: [{ label: 'A', url: '/services/a' }],
        }]}
        label='Main'
      />,
    )

    // Same "two separate controls" shape as the plain (no-icon) case, but the link control's own
    // children now include the decorative icon alongside the visible label.
    assertStringIncludes(html, 'data-space-ui="icon"')
    assertStringIncludes(html, 'href="/sprite.svg#gear"')
    assertStringIncludes(html, 'href="/services"')
    assertStringIncludes(html, 'aria-label="Services submenu"')
  },
)

Deno.test(
  'Menu: an item with neither url nor submenu, but a visual render-prop, renders it as decoration',
  () => {
    const html = renderToStaticMarkup(
      <Menu
        items={[{ label: 'Team', visual: () => <img src='/team.jpg' alt='' /> }]}
        label='Main'
      />,
    )

    assertEquals(html.includes('<a '), false)
    assertEquals(html.includes('<button'), false)
    assertStringIncludes(html, 'team.jpg')
    assertStringIncludes(html, 'Team')
  },
)

Deno.test(
  'Menu: visual is a plain render-prop — never composes Image/ImgButton internally',
  () => {
    const calls: string[] = []
    const html = renderToStaticMarkup(
      <Menu
        items={[{
          label: 'Team',
          url: '/team',
          visual: () => {
            calls.push('called')
            return <span data-testid='custom-visual'>*</span>
          },
        }]}
        label='Main'
      />,
    )

    assertEquals(calls, ['called'])
    assertStringIncludes(html, 'data-testid="custom-visual"')
    assertEquals(html.includes('data-space-ui="image"'), false)
  },
)

Deno.test('Menu: an item with neither url nor submenu renders static, non-interactive text', () => {
  const html = renderToStaticMarkup(<Menu items={[{ label: 'Just text' }]} label='Main' />)

  assertEquals(html.includes('<a '), false)
  assertEquals(html.includes('<button'), false)
  assertStringIncludes(html, 'Just text')
})

// --- onClick submenu interaction (default openMode) -------------------------------------------

// The two cross-sibling coordination tests ("clicking the disclosure toggle opens its own
// submenu", "opening one submenu never closes a sibling") moved to
// `integration/components/menu.test.tsx` (test-tier placement audit, 2026-08-21) — real
// interaction BETWEEN sibling `<li>`s' own `Button`s, not one item in isolation.

Deno.test(
  "Menu: onClick — a click inside an item's own open submenu does not close it",
  () => {
    const { container, unmount } = mount(<Menu items={items} label='Main' />)

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
  'Menu: onClick — each open submenu closes independently on any click outside its own subtree',
  () => {
    const { container, unmount } = mount(<Menu items={items} label='Main' />)

    const [, services, gear] = container.querySelectorAll('li')
    const servicesToggle = must(services.querySelector<HTMLButtonElement>('button'))
    const gearToggle = must(gear.querySelector<HTMLButtonElement>('button'))

    act(() => servicesToggle.click())

    // A click inside "gear" — genuinely outside "services"'s own subtree — closes "services",
    // with no coordination between the two items required.
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

Deno.test('Menu: Escape closes only the innermost open level, returns focus to its trigger', () => {
  const nested: MenuItem[] = [
    {
      label: 'Services',
      submenu: [
        { label: 'Consulting', submenu: [{ label: 'Deep', url: '/deep' }] },
      ],
    },
  ]
  const { container, unmount } = mount(<Menu items={nested} label='Main' />)

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

  // Only the innermost (Consulting) closed — Services, the outer level, stays open.
  assertEquals(consultingToggle.getAttribute('aria-expanded'), 'false')
  assertEquals(servicesToggle.getAttribute('aria-expanded'), 'true')
  assertEquals(document.activeElement, consultingToggle)

  unmount()
})

// --- onHover ---------------------------------------------------------------------------------

Deno.test('Menu: onHover — mouse hover opens, mouse leave (unfocused) closes', () => {
  const { container, unmount } = mount(<Menu items={items} label='Main' openMode='onHover' />)

  const services = container.querySelectorAll('li')[1]
  const toggle = must(services.querySelector<HTMLButtonElement>('button'))
  assertEquals(toggle.getAttribute('aria-expanded'), 'false')

  act(() => mouseOver(services))
  assertEquals(toggle.getAttribute('aria-expanded'), 'true')

  act(() => mouseOut(services, document.body))
  assertEquals(toggle.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test('Menu: onHover — keyboard focus alone opens it too, not mouse-only', () => {
  const { container, unmount } = mount(<Menu items={items} label='Main' openMode='onHover' />)

  const services = container.querySelectorAll('li')[1]
  const toggle = must(services.querySelector<HTMLButtonElement>('button'))

  act(() => toggle.focus())
  assertEquals(toggle.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test(
  'Menu: onHover — leaving by mouse while still focused inside does not close it',
  () => {
    const { container, unmount } = mount(<Menu items={items} label='Main' openMode='onHover' />)

    const services = container.querySelectorAll('li')[1]
    const toggle = must(services.querySelector<HTMLButtonElement>('button'))

    act(() => mouseOver(services))
    act(() => toggle.focus())
    act(() => mouseOut(services, document.body))

    // Mouse left, but focus is still inside — stays open.
    assertEquals(toggle.getAttribute('aria-expanded'), 'true')

    unmount()
  },
)

Deno.test('Menu: onHover — focus leaving to outside the item, unhovered, closes it', () => {
  const { container, unmount } = mount(<Menu items={items} label='Main' openMode='onHover' />)

  const services = container.querySelectorAll('li')[1]
  const toggle = must(services.querySelector<HTMLButtonElement>('button'))

  act(() => toggle.focus())
  assertEquals(toggle.getAttribute('aria-expanded'), 'true')

  act(() => {
    toggle.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }),
    )
  })

  assertEquals(toggle.getAttribute('aria-expanded'), 'false')

  unmount()
})

Deno.test(
  'Menu: onHover — focus moving to another control within the same item stays open',
  () => {
    const { container, unmount } = mount(<Menu items={items} label='Main' openMode='onHover' />)

    const services = container.querySelectorAll('li')[1]
    const toggle = must(services.querySelector<HTMLButtonElement>('button'))
    const link = must(services.querySelector<HTMLAnchorElement>('a'))

    act(() => toggle.focus())
    assertEquals(toggle.getAttribute('aria-expanded'), 'true')

    act(() => {
      toggle.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: link }))
    })

    // Focus moved to the sibling <a> — still inside the same <li> — so it stays open.
    assertEquals(toggle.getAttribute('aria-expanded'), 'true')

    unmount()
  },
)

// --- onRender --------------------------------------------------------------------------------

Deno.test('Menu: onRender — always expanded, no disclosure trigger rendered at all', () => {
  const html = renderToStaticMarkup(<Menu items={items} label='Main' openMode='onRender' />)

  assertEquals(html.includes('aria-expanded'), false)
  assertEquals(html.includes('<button'), false)
  assertStringIncludes(html, 'data-space-ui="menu-submenu"')
  assertStringIncludes(html, 'Consulting')
})
