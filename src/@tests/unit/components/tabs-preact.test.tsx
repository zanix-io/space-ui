import './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Tabs } from 'components/Tabs/index.preact.ts'
import type { TabItem, TabsProps } from 'components/Tabs/index.preact.ts'

// Unlike every hookless Preact component in this package, `Tabs` uses real hooks — built with
// `h(Tabs, props)` and rendered through Preact's own pipeline, not called as a plain function. See
// `counter-preact.test.tsx`'s own doc for the same reasoning.
//
// Test-tier placement: the `ArrowRight`/`ArrowLeft` roving-focus tests below stay in `unit/` —
// see `radio-group.test.tsx`'s own doc (same directory) for the full reasoning.

const items: TabItem[] = [
  { value: 'general', label: 'General', children: 'General settings' },
  { value: 'privacy', label: 'Privacy', children: 'Privacy settings' },
  { value: 'billing', label: 'Billing', children: 'Billing settings' },
]

function element(props: TabsProps): VNode {
  return h(Tabs, props) as VNode
}

function mount(props: TabsProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: TabsProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function tabs(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
}

function panel(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[role="tabpanel"]')
}

function arrowKey(target: Element, key: string) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })
}

// --- structure -----------------------------------------------------------------------------

Deno.test('Tabs (preact): role="tablist" wraps role="tab" items, one tabpanel renders', () => {
  const html = renderToString(element({ items, label: 'Settings' }))

  assertStringIncludes(html, 'role="tablist"')
  assertStringIncludes(html, 'aria-label="Settings"')
  assertEquals((html.match(/role="tab"/g) ?? []).length, 3)
  assertEquals((html.match(/role="tabpanel"/g) ?? []).length, 1)
  assertStringIncludes(html, 'data-space-ui="tabs"')
})

Deno.test('Tabs (preact): defaults to the first item, never nothing-selected', () => {
  const html = renderToString(element({ items, label: 'Settings' }))

  assertStringIncludes(html, 'General settings')
  assertEquals(html.includes('Privacy settings'), false)
  const [firstSelected] = html.match(/aria-selected="(true|false)"/) ?? []
  assertEquals(firstSelected, 'aria-selected="true"')
})

Deno.test('Tabs (preact): defaultValue selects that tab and its panel', () => {
  const html = renderToString(element({ items, label: 'Settings', defaultValue: 'billing' }))

  assertStringIncludes(html, 'Billing settings')
  assertEquals(html.includes('General settings'), false)
})

Deno.test('Tabs (preact): id/className land on the outer wrapper', () => {
  const html = renderToString(
    element({ items, label: 'Settings', id: 'settings-tabs', className: 'pill-tabs' }),
  )

  const wrapperMatch = html.match(/<div id="settings-tabs" class="pill-tabs"[^>]*>/)
  assertEquals(wrapperMatch !== null, true)
})

// --- aria cross-references ---------------------------------------------------------------------

Deno.test('Tabs (preact): aria-controls/aria-labelledby cross-reference correctly', () => {
  const html = renderToString(element({ items, label: 'Settings' }))

  const tabIdMatch = html.match(/id="([^"]+)"/)?.[1]
  const controlsMatch = html.match(/aria-controls="([^"]+)"/)?.[1]
  const panelIdMatch = html.match(/<div id="([^"]+)" role="tabpanel"/)?.[1]
  const labelledByMatch = html.match(/aria-labelledby="([^"]+)"/)?.[1]

  assertEquals(controlsMatch, panelIdMatch)
  assertEquals(labelledByMatch, tabIdMatch)
})

// --- roving tabindex -------------------------------------------------------------------------

Deno.test('Tabs (preact): only the active tab has tabIndex 0, the rest -1', () => {
  const html = renderToString(element({ items, label: 'Settings', defaultValue: 'privacy' }))

  const buttonTags = html.match(/<button[^>]*>/g) ?? []
  const tabbableCount = buttonTags.filter((tag) => tag.includes('tabindex="0"')).length
  const untabbableCount = buttonTags.filter((tag) => tag.includes('tabindex="-1"')).length

  assertEquals(tabbableCount, 1)
  assertEquals(untabbableCount, 2)
})

// --- click selection, real DOM ----------------------------------------------------------------

Deno.test('Tabs (preact): clicking a tab switches the active panel — real DOM', () => {
  const { container, unmount } = mount({ items, label: 'Settings' })
  const [, privacyTab] = tabs(container)

  assertEquals(panel(container)?.textContent, 'General settings')

  act(() => privacyTab.click())

  assertEquals(panel(container)?.textContent, 'Privacy settings')
  assertEquals(privacyTab.getAttribute('aria-selected'), 'true')

  unmount()
})

// --- arrow-key roving focus, real DOM ---------------------------------------------------------

Deno.test('Tabs (preact): ArrowRight moves focus AND selects the next tab', () => {
  const { container, unmount } = mount({ items, label: 'Settings' })
  const [general, privacy] = tabs(container)

  arrowKey(general, 'ArrowRight')

  assertEquals(privacy.getAttribute('aria-selected'), 'true')
  assertEquals(document.activeElement, privacy)
  assertEquals(panel(container)?.textContent, 'Privacy settings')

  unmount()
})

Deno.test('Tabs (preact): ArrowLeft wraps from the first tab to the last', () => {
  const { container, unmount } = mount({ items, label: 'Settings' })
  const [general, , billing] = tabs(container)

  arrowKey(general, 'ArrowLeft')

  assertEquals(billing.getAttribute('aria-selected'), 'true')
  assertEquals(document.activeElement, billing)

  unmount()
})

Deno.test('Tabs (preact): orientation="vertical" responds to ArrowDown, not ArrowRight', () => {
  const { container, unmount } = mount({ items, label: 'Settings', orientation: 'vertical' })
  const [general, privacy] = tabs(container)

  arrowKey(general, 'ArrowRight')
  assertEquals(general.getAttribute('aria-selected'), 'true')

  arrowKey(general, 'ArrowDown')
  assertEquals(privacy.getAttribute('aria-selected'), 'true')

  unmount()
})

// --- controlled / uncontrolled / onValueChange -------------------------------------------------

Deno.test('Tabs (preact): uncontrolled — onValueChange fires, the tab still selects itself', () => {
  const calls: string[] = []
  const { container, unmount } = mount({
    items,
    label: 'Settings',
    onValueChange: (next) => calls.push(next),
  })
  const [, privacy] = tabs(container)

  act(() => privacy.click())

  assertEquals(calls, ['privacy'])

  unmount()
})

Deno.test('Tabs (preact): controlled — a click notifies but never self-selects', () => {
  const calls: string[] = []
  const { container, unmount } = mount({
    items,
    label: 'Settings',
    value: 'general',
    onValueChange: (next) => calls.push(next),
  })
  const [general, privacy] = tabs(container)

  act(() => privacy.click())

  assertEquals(calls, ['privacy'])
  assertEquals(general.getAttribute('aria-selected'), 'true')
  assertEquals(panel(container)?.textContent, 'General settings')

  unmount()
})

Deno.test('Tabs (preact): controlled — updating value re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount({ items, label: 'Settings', value: 'general' })

  rerender({ items, label: 'Settings', value: 'billing' })

  assertEquals(panel(container)?.textContent, 'Billing settings')

  unmount()
})

Deno.test('Tabs (preact): value takes precedence over defaultValue', () => {
  const html = renderToString(
    element({ items, label: 'Settings', value: 'billing', defaultValue: 'privacy' }),
  )

  assertStringIncludes(html, 'Billing settings')
  assertEquals(html.includes('Privacy settings'), false)
})
