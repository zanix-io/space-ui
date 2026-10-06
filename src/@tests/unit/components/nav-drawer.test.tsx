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

// The cross-render "same id, server vs. client" guarantee belongs at the REAL Comet-boundary
// level, not here: `NavDrawer` above is the raw, un-wrapped component this file deliberately
// exercises directly (see the top-of-file comment) — outside `defineComet`'s own
// `CometIdScopeProvider`, `useCometStableId()` is a plain passthrough to the renderer's own
// `useId()`, which has NO cross-render guarantee once two independent renders' hook-call ordinals
// diverge (a real, expected difference between a server render's own position in a larger tree and
// an isolated client root's fresh count from zero — closing that gap is a Comet boundary's own job,
// not something the raw component can promise on its own). See
// `integration/components/nav-drawer.test.tsx`'s own two panel-id tests (against the REAL
// `defineComet`-wrapped default export) for the guarantee that actually matters here.

Deno.test(
  'NavDrawer: two different labels get two different auto-generated ids — never a shared ' +
    'constant fallback that would collide when a page composes more than one NavDrawer',
  () => {
    const first = mount(<NavDrawer items={items} label='Main navigation' defaultOpen />)
    const second = mount(<NavDrawer items={items} label='Footer navigation' defaultOpen />)

    const firstId = must(first.container.querySelector('[data-space-ui="drawer"]'))
      .getAttribute('id')
    const secondId = must(second.container.querySelector('[data-space-ui="drawer"]'))
      .getAttribute('id')
    assertEquals(firstId === secondId, false)

    first.unmount()
    second.unmount()
  },
)

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

Deno.test('NavDrawer: the toggle says "Open menu" by default and takes a translated label and a class of its own', () => {
  const byDefault = renderToStaticMarkup(<NavDrawer items={items} label='Main navigation' />)
  assertStringIncludes(byDefault, 'aria-label="Open menu"')

  const translated = renderToStaticMarkup(
    <NavDrawer
      items={items}
      label='Navegación'
      openLabel='Abrir menú'
      closeLabel='Cerrar menú'
      toggleClassName='app-nav-toggle'
    />,
  )
  assertStringIncludes(translated, 'aria-label="Abrir menú"')
  assertStringIncludes(translated, 'class="app-nav-toggle"')
  assertEquals(translated.includes('Open menu'), false)
})

Deno.test('NavDrawer: once open, the toggle says the translated close label', () => {
  const { container, unmount } = mount(
    <NavDrawer
      items={items}
      label='Navegación'
      openLabel='Abrir menú'
      closeLabel='Cerrar menú'
      defaultOpen
    />,
  )

  assertEquals(
    must(container.querySelector('[aria-controls]')).getAttribute('aria-label'),
    'Cerrar menú',
  )
  unmount()
})

Deno.test('NavDrawer: the panel close button is "Close" by default and closeButtonLabel renames it, apart from the toggle', () => {
  const byDefault = mount(<NavDrawer items={items} label='Main navigation' defaultOpen />)
  assertEquals(byDefault.container.querySelector('button[aria-label="Close"]') !== null, true)
  byDefault.unmount()

  const { container, unmount } = mount(
    <NavDrawer
      items={items}
      label='Navegación'
      closeLabel='Cerrar menú'
      closeButtonLabel='Cerrar'
      defaultOpen
    />,
  )
  assertEquals(container.querySelector('button[aria-label="Close"]'), null)
  assertEquals(
    container.querySelector('[data-space-ui="drawer"] button[aria-label="Cerrar"]') !== null,
    true,
  )
  assertEquals(
    container.querySelector('[aria-controls]')?.getAttribute('aria-label'),
    'Cerrar menú',
  )
  unmount()
})

Deno.test('NavDrawer: current puts aria-current="page" on that item’s link only, submenu items included', () => {
  const { container, unmount } = mount(
    <NavDrawer
      items={[
        { label: 'Home', url: '/' },
        {
          label: 'Docs',
          url: '/docs',
          submenu: [{ label: 'Guides', url: '/docs/guides', current: true }],
        },
      ]}
      label='Main navigation'
      openMode='onRender'
      defaultOpen
    />,
  )

  const marked = container.querySelectorAll('[aria-current]')
  assertEquals(marked.length, 1)
  assertEquals(marked[0].getAttribute('aria-current'), 'page')
  assertEquals(marked[0].getAttribute('href'), '/docs/guides')
  unmount()
})

Deno.test('NavDrawer: currentFromLocation marks the item for the location when the panel opens, not the one the server marked', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', {
    value: { pathname: '/es/b/7' },
    configurable: true,
  })
  try {
    const { container, unmount } = mount(
      <NavDrawer
        items={[
          { label: 'A', url: '/es/a', current: true },
          { label: 'B', url: '/es/b' },
          { label: 'Home', url: '/es' },
        ]}
        label='Main navigation'
        currentFromLocation
      />,
    )
    act(() => must(container.querySelector<HTMLButtonElement>('button')).click())

    const marked = container.querySelectorAll('[aria-current]')
    assertEquals(marked.length, 1)
    assertEquals(marked[0].getAttribute('href'), '/es/b')
    unmount()
  } finally {
    if (original) Object.defineProperty(globalThis, 'location', original)
    else delete (globalThis as { location?: unknown }).location
  }
})

Deno.test('NavDrawer: without currentFromLocation the items’ own current is kept even if the location differs', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', {
    value: { pathname: '/es/b' },
    configurable: true,
  })
  try {
    const { container, unmount } = mount(
      <NavDrawer
        items={[{ label: 'A', url: '/es/a', current: true }, { label: 'B', url: '/es/b' }]}
        label='Main navigation'
        defaultOpen
      />,
    )
    const marked = container.querySelectorAll('[aria-current]')
    assertEquals(marked.length, 1)
    assertEquals(marked[0].getAttribute('href'), '/es/a')
    unmount()
  } finally {
    if (original) Object.defineProperty(globalThis, 'location', original)
    else delete (globalThis as { location?: unknown }).location
  }
})

Deno.test('NavDrawer: currentFromLocation marks nothing when no item matches, and root only matches itself', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', {
    value: { pathname: '/es/other' },
    configurable: true,
  })
  try {
    const { container, unmount } = mount(
      <NavDrawer
        items={[{ label: 'Root', url: '/' }, { label: 'A', url: '/es/a', current: true }]}
        label='Main navigation'
        currentFromLocation
        defaultOpen
      />,
    )
    assertEquals(container.querySelectorAll('[aria-current]').length, 0)
    unmount()
  } finally {
    if (original) Object.defineProperty(globalThis, 'location', original)
    else delete (globalThis as { location?: unknown }).location
  }
})

// --- inlineFrom ----------------------------------------------------------------------------

Deno.test('NavDrawer: without inlineFrom the markup carries no inline list, wrapper or rule', () => {
  const html = renderToStaticMarkup(<NavDrawer items={items} label='Main navigation' />)

  assertEquals(html.includes('data-navdrawer-'), false)
  assertEquals(html.includes('<style'), false)
  assertEquals(html.includes('href="/docs"'), false)
})

Deno.test('NavDrawer: inlineFrom puts the list in the server markup next to the closed toggle, and a nonce’d rule swaps them at that width', () => {
  const html = renderToStaticMarkup(
    <NavDrawer items={items} label='Main navigation' inlineFrom='48rem' nonce='abc123' id='nav' />,
  )

  // The list is there without opening anything, so it shows before hydration.
  assertStringIncludes(html, 'data-navdrawer-inline=')
  assertStringIncludes(html, 'href="/"')
  assertStringIncludes(html, 'href="/docs"')
  // The toggle is still there, closed, wrapped so the rule can hide it.
  assertStringIncludes(html, 'data-navdrawer-toggle=')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('role="dialog"'), false)
  // One width, written once: the complement query hides the list below it.
  assertStringIncludes(html, 'nonce="abc123"')
  // The scope is a bare token, never the panel id: a quoted selector would be escaped inside the
  // <style> by Preact's server renderer and stop matching.
  const scope = html.match(/data-navdrawer-toggle="([^"]+)"/)?.[1]
  assertEquals(/^nd[a-z0-9]+$/.test(scope ?? ''), true)
  assertStringIncludes(
    html,
    `@media (min-width:48rem){[data-navdrawer-toggle=${scope}]{display:none}}`,
  )
  assertStringIncludes(
    html,
    `@media not all and (min-width:48rem){[data-navdrawer-inline=${scope}]{display:none}}`,
  )
})

Deno.test('NavDrawer: each inlineFrom instance gets its own scope, shared by its toggle, its list and its rule', () => {
  const scopesOf = (id: string, inlineFrom: string) => {
    const { container, unmount } = mount(
      <NavDrawer items={items} label='Main navigation' inlineFrom={inlineFrom} id={id} />,
    )
    const toggle = must(container.querySelector('[data-navdrawer-toggle]'))
    const inline = must(container.querySelector('[data-navdrawer-inline]'))
    const scope = toggle.getAttribute('data-navdrawer-toggle')
    assertEquals(inline.getAttribute('data-navdrawer-inline'), scope)
    assertEquals(
      must(container.querySelector<HTMLButtonElement>('[data-navdrawer-toggle] button'))
        .getAttribute('aria-controls'),
      id,
    )
    const rule = must(container.querySelector('style')).textContent ?? ''
    assertStringIncludes(rule, `[data-navdrawer-toggle=${scope}]`)
    assertStringIncludes(rule, `[data-navdrawer-inline=${scope}]`)
    unmount()
    return scope
  }

  const first = scopesOf('primary-nav', '48rem')
  // Same width, different instance: a different scope, so each rule only reaches its own pair.
  assertEquals(first === scopesOf('footer-nav', '48rem'), false)
  // An id with characters that a selector or the markup would treat specially is still a plain token.
  assertEquals(/^nd[a-z0-9]+$/.test(scopesOf('a:b"c\'d&e', '64em') ?? ''), true)
})

Deno.test('NavDrawer: inlineFrom only takes a positive length in px, em or rem — anything else cannot reach the generated style', () => {
  for (
    const bad of [
      '48',
      'calc(1px)',
      '-1rem',
      '0rem',
      '0',
      '48vw',
      '48rem}body{color:red',
      '',
      ' 48rem',
    ]
  ) {
    let message = ''
    try {
      renderToStaticMarkup(<NavDrawer items={items} label='Main navigation' inlineFrom={bad} />)
    } catch (error) {
      message = (error as Error).message
    }
    assertStringIncludes(message, 'inlineFrom must be a positive length', JSON.stringify(bad))
  }
  for (const good of ['48rem', '768px', '60em', '40.5rem', '.5em']) {
    renderToStaticMarkup(<NavDrawer items={items} label='Main navigation' inlineFrom={good} />)
  }
})

Deno.test('NavDrawer: with inlineFrom the toggle still opens the panel, real DOM', () => {
  const { container, unmount } = mount(
    <NavDrawer items={items} label='Main navigation' inlineFrom='48rem' />,
  )

  const toggle = must(container.querySelector<HTMLButtonElement>('[data-navdrawer-toggle] button'))
  assertEquals(container.querySelector('[data-space-ui="drawer"]'), null)
  act(() => toggle.click())
  assertEquals(container.querySelector('[data-space-ui="drawer"]') !== null, true)

  unmount()
})

Deno.test('NavDrawer: an open panel closes when the viewport grows past inlineFrom', () => {
  const listeners = new Set<() => void>()
  const query = {
    matches: false,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }
  const requested: string[] = []
  const original = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia')
  Object.defineProperty(globalThis, 'matchMedia', {
    value: (q: string) => (requested.push(q), query),
    configurable: true,
  })
  try {
    const { container, unmount } = mount(
      <NavDrawer items={items} label='Main navigation' inlineFrom='48rem' />,
    )
    assertEquals(requested[0], '(min-width:48rem)')
    act(() =>
      must(container.querySelector<HTMLButtonElement>('[data-navdrawer-toggle] button')).click()
    )
    assertEquals(container.querySelector('[data-space-ui="drawer"]') !== null, true)

    query.matches = true
    act(() => listeners.forEach((listener) => listener()))
    assertEquals(container.querySelector('[data-space-ui="drawer"]'), null)

    unmount()
    assertEquals(listeners.size, 0)
  } finally {
    if (original) Object.defineProperty(globalThis, 'matchMedia', original)
    else delete (globalThis as { matchMedia?: unknown }).matchMedia
  }
})

Deno.test('NavDrawer: with inlineFrom and currentFromLocation the inline list marks the current item after hydration', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', {
    value: { pathname: '/es/b/7' },
    configurable: true,
  })
  try {
    const nav = [
      { label: 'A', url: '/es/a', current: true },
      { label: 'B', url: '/es/b' },
    ]
    // Server render keeps the items' own `current`.
    const html = renderToStaticMarkup(
      <NavDrawer items={nav} label='Main navigation' inlineFrom='48rem' currentFromLocation />,
    )
    assertStringIncludes(html, 'aria-current="page"')
    assertEquals(html.match(/aria-current/g)?.length, 1)
    assertStringIncludes(
      html.slice(html.indexOf('/es/a') - 40, html.indexOf('/es/a') + 60),
      'aria-current',
    )

    const { container, unmount } = mount(
      <NavDrawer items={nav} label='Main navigation' inlineFrom='48rem' currentFromLocation />,
    )
    const marked = container.querySelectorAll('[aria-current]')
    assertEquals(marked.length, 1)
    assertEquals(marked[0].getAttribute('href'), '/es/b')
    unmount()
  } finally {
    if (original) Object.defineProperty(globalThis, 'location', original)
    else delete (globalThis as { location?: unknown }).location
  }
})
