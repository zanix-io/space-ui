import './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Tabs } from 'components/Tabs/index.ts'
import type { TabItem } from 'components/Tabs/index.ts'

// Test-tier placement decision (audit, 2026-08-21): the `ArrowRight`/`ArrowLeft` roving-focus
// tests below stay in `unit/`, not `integration/` — same `shared/roving-focus.ts`-is-a-primitive
// reasoning recorded in full in `radio-group.test.tsx`'s own doc (same directory).

const items: TabItem[] = [
  { value: 'general', label: 'General', children: 'General settings' },
  { value: 'privacy', label: 'Privacy', children: 'Privacy settings' },
  { value: 'billing', label: 'Billing', children: 'Billing settings' },
]

function mount(element: ReturnType<typeof Tabs>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Tabs>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
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

Deno.test('Tabs: role="tablist" wraps role="tab" items, exactly one tabpanel renders', () => {
  const html = renderToStaticMarkup(<Tabs items={items} label='Settings' />)

  assertStringIncludes(html, 'role="tablist"')
  assertStringIncludes(html, 'aria-label="Settings"')
  assertEquals((html.match(/role="tab"/g) ?? []).length, 3)
  assertEquals((html.match(/role="tabpanel"/g) ?? []).length, 1)
  assertStringIncludes(html, 'data-space-ui="tabs"')
})

Deno.test('Tabs: defaults to the first item — unlike RadioGroup, never nothing-selected', () => {
  const html = renderToStaticMarkup(<Tabs items={items} label='Settings' />)

  assertStringIncludes(html, 'General settings')
  assertEquals(html.includes('Privacy settings'), false)
  const [firstSelected] = html.match(/aria-selected="(true|false)"/) ?? []
  assertEquals(firstSelected, 'aria-selected="true"')
})

Deno.test('Tabs: a controlled value matching no item falls back to the first tab', () => {
  const html = renderToStaticMarkup(
    <Tabs items={items} label='Settings' value='does-not-exist' onValueChange={() => {}} />,
  )

  // The rendered PANEL and the roving `tabIndex` both fall back to the first item
  // (`activeIndex`-derived, same as the no-`value`-at-all case above). `tabindex="0"` shows up
  // twice: once on the first tab button (the roving-focus target) and once on the panel itself
  // (render.ts's own unconditional `tabIndex: 0` there) — never on any OTHER tab button.
  assertStringIncludes(html, 'General settings')
  assertEquals((html.match(/tabindex="0"/g) ?? []).length, 2)

  // KNOWN, confirmed-real inconsistency (not fixed here — see the coverage-audit report this test
  // was added under): `aria-selected` is computed as `item.value === value` (render.ts's own
  // `selected: item.value === value`), which does NOT share the `activeIndex` fallback — so with
  // an invalid controlled `value`, every tab ends up `aria-selected="false"` even though one
  // panel is visibly showing and one tab carries `tabindex="0"`. Locking in the CURRENT behavior
  // here (not asserting what "should" happen) so a real fix shows up as an intentional test change.
  assertEquals((html.match(/aria-selected="true"/g) ?? []).length, 0)
})

Deno.test('Tabs: an empty items array renders no tabpanel and no tabs, without crashing', () => {
  const html = renderToStaticMarkup(<Tabs items={[]} label='Settings' />)

  assertStringIncludes(html, 'role="tablist"')
  assertEquals(html.includes('role="tab"'), false)
  assertEquals(html.includes('role="tabpanel"'), false)
})

Deno.test('Tabs: defaultValue selects that tab and its panel instead of the first', () => {
  const html = renderToStaticMarkup(<Tabs items={items} label='Settings' defaultValue='billing' />)

  assertStringIncludes(html, 'Billing settings')
  assertEquals(html.includes('General settings'), false)
})

Deno.test('Tabs: id/className land on the outer wrapper', () => {
  const html = renderToStaticMarkup(
    <Tabs items={items} label='Settings' id='settings-tabs' className='pill-tabs' />,
  )

  const wrapperMatch = html.match(/<div id="settings-tabs" class="pill-tabs"[^>]*>/)
  assertEquals(wrapperMatch !== null, true)
})

// --- aria cross-references ---------------------------------------------------------------------

Deno.test('Tabs: aria-controls/aria-labelledby cross-reference the tab/panel correctly', () => {
  const html = renderToStaticMarkup(<Tabs items={items} label='Settings' />)

  // The tab's own `id` is the FIRST `id="..."` in document order (no wrapper `id` set in this
  // test); the panel's is the second, matched precisely via its own unique `role="tabpanel"`.
  const tabIdMatch = html.match(/id="([^"]+)"/)?.[1]
  const controlsMatch = html.match(/aria-controls="([^"]+)"/)?.[1]
  const panelIdMatch = html.match(/<div id="([^"]+)" role="tabpanel"/)?.[1]
  const labelledByMatch = html.match(/aria-labelledby="([^"]+)"/)?.[1]

  assertEquals(controlsMatch, panelIdMatch)
  assertEquals(labelledByMatch, tabIdMatch)
})

// --- roving tabindex -------------------------------------------------------------------------

Deno.test('Tabs: only the active tab has tabIndex 0, the rest -1', () => {
  const html = renderToStaticMarkup(<Tabs items={items} label='Settings' defaultValue='privacy' />)

  // Scoped to `<button>` tags only — the panel itself also carries `tabIndex={0}` (a real, separate
  // WAI-ARIA requirement: the panel is directly focusable so `Tab` can reach its content), which
  // isn't what this test is about.
  const buttonTags = html.match(/<button[^>]*>/g) ?? []
  const tabbableCount = buttonTags.filter((tag) => tag.includes('tabindex="0"')).length
  const untabbableCount = buttonTags.filter((tag) => tag.includes('tabindex="-1"')).length

  assertEquals(tabbableCount, 1)
  assertEquals(untabbableCount, 2)
})

// --- click selection, real DOM ----------------------------------------------------------------

Deno.test('Tabs: clicking a tab switches the active panel — real DOM', () => {
  const { container, unmount } = mount(<Tabs items={items} label='Settings' />)
  const [, privacyTab] = tabs(container)

  assertEquals(panel(container)?.textContent, 'General settings')

  act(() => privacyTab.click())

  assertEquals(panel(container)?.textContent, 'Privacy settings')
  assertEquals(privacyTab.getAttribute('aria-selected'), 'true')

  unmount()
})

// --- arrow-key roving focus, real DOM ---------------------------------------------------------

Deno.test('Tabs: ArrowRight moves focus AND selects the next tab — real DOM', () => {
  const { container, unmount } = mount(<Tabs items={items} label='Settings' />)
  const [general, privacy] = tabs(container)

  arrowKey(general, 'ArrowRight')

  assertEquals(privacy.getAttribute('aria-selected'), 'true')
  assertEquals(document.activeElement, privacy)
  assertEquals(panel(container)?.textContent, 'Privacy settings')

  unmount()
})

Deno.test('Tabs: ArrowLeft wraps from the first tab to the last', () => {
  const { container, unmount } = mount(<Tabs items={items} label='Settings' />)
  const [general, , billing] = tabs(container)

  arrowKey(general, 'ArrowLeft')

  assertEquals(billing.getAttribute('aria-selected'), 'true')
  assertEquals(document.activeElement, billing)

  unmount()
})

Deno.test('Tabs: orientation="vertical" responds to ArrowDown, not ArrowRight', () => {
  const { container, unmount } = mount(
    <Tabs items={items} label='Settings' orientation='vertical' />,
  )
  const [general, privacy] = tabs(container)

  arrowKey(general, 'ArrowRight')
  assertEquals(general.getAttribute('aria-selected'), 'true')

  arrowKey(general, 'ArrowDown')
  assertEquals(privacy.getAttribute('aria-selected'), 'true')

  unmount()
})

// --- controlled / uncontrolled / onValueChange -------------------------------------------------

Deno.test('Tabs: uncontrolled — onValueChange fires, the tab still selects itself', () => {
  const calls: string[] = []
  const { container, unmount } = mount(
    <Tabs items={items} label='Settings' onValueChange={(next) => calls.push(next)} />,
  )
  const [, privacy] = tabs(container)

  act(() => privacy.click())

  assertEquals(calls, ['privacy'])

  unmount()
})

Deno.test('Tabs: controlled — a click notifies onValueChange but never self-selects', () => {
  const calls: string[] = []
  const { container, unmount } = mount(
    <Tabs
      items={items}
      label='Settings'
      value='general'
      onValueChange={(next) => calls.push(next)}
    />,
  )
  const [general, privacy] = tabs(container)

  act(() => privacy.click())

  assertEquals(calls, ['privacy'])
  assertEquals(general.getAttribute('aria-selected'), 'true')
  assertEquals(panel(container)?.textContent, 'General settings')

  unmount()
})

Deno.test('Tabs: controlled — updating value from outside re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount(
    <Tabs items={items} label='Settings' value='general' />,
  )

  rerender(<Tabs items={items} label='Settings' value='billing' />)

  assertEquals(panel(container)?.textContent, 'Billing settings')

  unmount()
})

Deno.test('Tabs: value takes precedence over defaultValue when both are given', () => {
  const html = renderToStaticMarkup(
    <Tabs items={items} label='Settings' value='billing' defaultValue='privacy' />,
  )

  assertStringIncludes(html, 'Billing settings')
  assertEquals(html.includes('Privacy settings'), false)
})
