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

Deno.test('NavDrawer (preact): the toggle says "Open menu" by default and takes a translated label and a class of its own', () => {
  const byDefault = renderToString(element({ items, label: 'Main navigation' }))
  assertStringIncludes(byDefault, 'aria-label="Open menu"')

  const translated = renderToString(
    element({
      items,
      label: 'Navegación',
      openLabel: 'Abrir menú',
      closeLabel: 'Cerrar menú',
      toggleClassName: 'app-nav-toggle',
    }),
  )
  assertStringIncludes(translated, 'aria-label="Abrir menú"')
  assertStringIncludes(translated, 'class="app-nav-toggle"')
  assertEquals(translated.includes('Open menu'), false)
})

Deno.test('NavDrawer (preact): once open, the toggle says the translated close label', () => {
  const { container, unmount } = mount({
    items,
    label: 'Navegación',
    openLabel: 'Abrir menú',
    closeLabel: 'Cerrar menú',
    defaultOpen: true,
  })
  const toggle = must(container.querySelector('[aria-controls]'))

  assertEquals(toggle.getAttribute('aria-label'), 'Cerrar menú')
  unmount()
})

Deno.test('NavDrawer (preact): the panel close button is "Close" by default and closeButtonLabel renames it, apart from the toggle', () => {
  const byDefault = mount({ items, label: 'Main navigation', defaultOpen: true })
  assertEquals(byDefault.container.querySelector('button[aria-label="Close"]') !== null, true)
  byDefault.unmount()

  const { container, unmount } = mount({
    items,
    label: 'Navegación',
    closeLabel: 'Cerrar menú',
    closeButtonLabel: 'Cerrar',
    defaultOpen: true,
  })
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

Deno.test('NavDrawer (preact): current puts aria-current="page" on that item’s link only, submenu items included', () => {
  const { container, unmount } = mount({
    items: [
      { label: 'Home', url: '/' },
      {
        label: 'Docs',
        url: '/docs',
        submenu: [{ label: 'Guides', url: '/docs/guides', current: true }],
      },
    ],
    label: 'Main navigation',
    openMode: 'onRender',
    defaultOpen: true,
  })

  const marked = container.querySelectorAll('[aria-current]')
  assertEquals(marked.length, 1)
  assertEquals(marked[0].getAttribute('aria-current'), 'page')
  assertEquals(marked[0].getAttribute('href'), '/docs/guides')
  unmount()
})

Deno.test('NavDrawer (preact): currentFromLocation marks the item for the location when the panel opens, not the one the server marked', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', {
    value: { pathname: '/es/b/7' },
    configurable: true,
  })
  try {
    const { container, unmount } = mount({
      items: [
        { label: 'A', url: '/es/a', current: true },
        { label: 'B', url: '/es/b' },
        { label: 'Home', url: '/es' },
      ],
      label: 'Main navigation',
      currentFromLocation: true,
    })
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

Deno.test('NavDrawer (preact): without currentFromLocation the items’ own current is kept even if the location differs', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', {
    value: { pathname: '/es/b' },
    configurable: true,
  })
  try {
    const { container, unmount } = mount({
      items: [{ label: 'A', url: '/es/a', current: true }, { label: 'B', url: '/es/b' }],
      label: 'Main navigation',
      defaultOpen: true,
    })
    const marked = container.querySelectorAll('[aria-current]')
    assertEquals(marked.length, 1)
    assertEquals(marked[0].getAttribute('href'), '/es/a')
    unmount()
  } finally {
    if (original) Object.defineProperty(globalThis, 'location', original)
    else delete (globalThis as { location?: unknown }).location
  }
})

Deno.test('NavDrawer (preact): currentFromLocation marks nothing when no item matches, and root only matches itself', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', {
    value: { pathname: '/es/other' },
    configurable: true,
  })
  try {
    const { container, unmount } = mount({
      items: [{ label: 'Root', url: '/' }, { label: 'A', url: '/es/a', current: true }],
      label: 'Main navigation',
      currentFromLocation: true,
      defaultOpen: true,
    })
    assertEquals(container.querySelectorAll('[aria-current]').length, 0)
    unmount()
  } finally {
    if (original) Object.defineProperty(globalThis, 'location', original)
    else delete (globalThis as { location?: unknown }).location
  }
})

// --- inlineFrom ----------------------------------------------------------------------------

Deno.test('NavDrawer (preact): without inlineFrom the markup carries no inline list, wrapper or rule', () => {
  const html = renderToString(element({ items, label: 'Main navigation' }))

  assertEquals(html.includes('data-navdrawer-'), false)
  assertEquals(html.includes('<style'), false)
  assertEquals(html.includes('href="/docs"'), false)
})

Deno.test('NavDrawer (preact): inlineFrom puts the list in the server markup next to the closed toggle, and a nonce’d rule swaps them at that width', () => {
  const html = renderToString(
    element({ items, label: 'Main navigation', inlineFrom: '48rem', nonce: 'abc123', id: 'nav' }),
  )

  assertStringIncludes(html, 'data-navdrawer-inline=')
  assertStringIncludes(html, 'href="/"')
  assertStringIncludes(html, 'href="/docs"')
  assertStringIncludes(html, 'data-navdrawer-toggle=')
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(html.includes('role="dialog"'), false)
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

Deno.test('NavDrawer (preact): each inlineFrom instance gets its own scope, shared by its toggle, its list and its rule', () => {
  const scopesOf = (id: string, inlineFrom: string) => {
    const { container, unmount } = mount({
      items,
      label: 'Main navigation',
      inlineFrom,
      id,
    })
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
  assertEquals(first === scopesOf('footer-nav', '48rem'), false)
  assertEquals(/^nd[a-z0-9]+$/.test(scopesOf('a:b"c\'d&e', '64em') ?? ''), true)
})

Deno.test('NavDrawer (preact): inlineFrom only takes a positive length in px, em or rem — anything else cannot reach the generated style', () => {
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
      renderToString(element({ items, label: 'Main navigation', inlineFrom: bad }))
    } catch (error) {
      message = (error as Error).message
    }
    assertStringIncludes(message, 'inlineFrom must be a positive length', JSON.stringify(bad))
  }
  for (const good of ['48rem', '768px', '60em', '40.5rem', '.5em']) {
    renderToString(element({ items, label: 'Main navigation', inlineFrom: good }))
  }
})

Deno.test('NavDrawer (preact): an open panel closes when the viewport grows past inlineFrom', () => {
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
    const { container, unmount } = mount({ items, label: 'Main navigation', inlineFrom: '48rem' })
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

Deno.test('NavDrawer (preact): with inlineFrom and currentFromLocation the inline list marks the current item after hydration', () => {
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
    const html = renderToString(
      element({
        items: nav,
        label: 'Main navigation',
        inlineFrom: '48rem',
        currentFromLocation: true,
      }),
    )
    assertEquals(html.match(/aria-current/g)?.length, 1)

    const { container, unmount } = mount({
      items: nav,
      label: 'Main navigation',
      inlineFrom: '48rem',
      currentFromLocation: true,
    })
    const marked = container.querySelectorAll('[aria-current]')
    assertEquals(marked.length, 1)
    assertEquals(marked[0].getAttribute('href'), '/es/b')
    unmount()
  } finally {
    if (original) Object.defineProperty(globalThis, 'location', original)
    else delete (globalThis as { location?: unknown }).location
  }
})
