import { dispatchWindowEvent, getDynamicRule, must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertNotEquals, assertStringIncludes } from '@std/assert'
import { Popover } from 'components/Popover/index.preact.ts'
import type { PopoverProps } from 'components/Popover/index.preact.ts'

// Unlike every hookless Preact component in this package, `Popover` uses real hooks — built with
// `h(Popover, props)` and rendered through Preact's own pipeline. See `counter-preact.test.tsx`'s
// own doc for the same reasoning.

function stubRect(el: Element, rect: { x: number; y: number; width: number; height: number }) {
  el.getBoundingClientRect = () => ({
    ...rect,
    top: rect.y,
    left: rect.x,
    right: 0,
    bottom: 0,
    toJSON() {},
  })
}

function element(props: PopoverProps): VNode {
  return h(Popover, props) as VNode
}

function mount(props: PopoverProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: PopoverProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function basicProps(open?: boolean): PopoverProps {
  return {
    open,
    trigger: (triggerProps) => h('button', { type: 'button', ...triggerProps }, 'Open'),
    children: h('p', {}, 'Content'),
  }
}

/** The CSSOM rule `getOrInsertDynamicRule` scoped to `panel`'s own `data-popover-id` — see
 * `dom-test-setup.ts`'s own `getDynamicRule` doc. */
function popoverRule(container: Element, panel: Element) {
  return getDynamicRule(container, panel, 'data-popover-id')
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Popover (preact): SSR — closed renders the trigger but no panel', () => {
  const html = renderToString(element(basicProps(false)))

  assertStringIncludes(html, '>Open</button>')
  assertEquals(html.includes('data-space-ui="popover"'), false)
  assertStringIncludes(html, 'aria-expanded="false"')
})

Deno.test('Popover (preact): trigger receives aria-expanded/aria-controls, cross-ref', () => {
  const html = renderToString(element(basicProps(false)))

  const controlsMatch = must(html.match(/aria-controls="([^"]+)"/))[1]
  assertStringIncludes(html, 'aria-expanded="false"')
  assertEquals(controlsMatch.length > 0, true)
})

// --- real DOM: open/close, positioning ----------------------------------------------------

Deno.test('Popover (preact): clicking the trigger opens the panel — real DOM', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  assertEquals(container.querySelector('[data-space-ui="popover"]'), null)

  act(() => trigger.click())

  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)
  assertEquals(trigger.getAttribute('aria-expanded'), 'true')

  unmount()
})

Deno.test('Popover (preact): the panel is positioned via the trigger reference rect', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())

  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="popover"]'))
  stubRect(panel, { x: 0, y: 0, width: 80, height: 40 })

  act(() => dispatchWindowEvent(new Event('resize')))

  // No inline `style` attribute at all — `position`/`top`/`left` live in the static `<style>` rule
  // (a real CSP fix), and the genuinely dynamic `transform`/`visibility` are applied to a CSSOM
  // rule inside that SAME element instead (see `POPOVER_POSITION_CSS`'s and `createPopover`'s own
  // doc).
  assertEquals(panel.getAttribute('style'), null)

  const styleEl = must(container.querySelector('style'))
  assertStringIncludes(styleEl.textContent ?? '', "[data-space-ui='popover']{position:fixed")

  const rule = popoverRule(container, panel)
  assertStringIncludes(rule.style.transform, 'translate(')
  assertEquals(rule.style.visibility, 'visible')
  assertStringIncludes(rule.selectorText, "[data-popover-id='")

  unmount()
})

// A real, confirmed cross-renderer divergence found while building this: two genuinely SEPARATE
// Preact roots (two independent `render()` calls into two different containers) produced the SAME
// `useId()` value (`P0-0`) for both — Preact's own `useId` resets its counter per independent root,
// unlike `useId()`'s documented guarantee, which only ever covers uniqueness WITHIN a single root's
// own tree, never across two unrelated ones. (React's own root-scoped counter happened not to
// collide in the one two-separate-`createRoot`s construction actually tried, but relying on that
// would have been the wrong test either way — this file tests the realistic case that actually
// matters: two sibling instances under ONE root/tree, the only shape `useId()` is documented to
// guarantee uniqueness for.)
Deno.test('Popover (preact): two instances mounted as siblings get independently scoped rules', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() =>
    renderDOM(
      h('div', {}, [
        h(Popover, {
          trigger: (triggerProps) => h('button', { type: 'button', ...triggerProps }, 'First'),
          children: h('p', {}, 'First content'),
        }),
        h(Popover, {
          trigger: (triggerProps) => h('button', { type: 'button', ...triggerProps }, 'Second'),
          children: h('p', {}, 'Second content'),
        }),
      ]),
      container,
    )
  )

  const [firstTrigger, secondTrigger] = Array.from(container.querySelectorAll('button'))
  stubRect(firstTrigger, { x: 100, y: 100, width: 50, height: 20 })
  stubRect(secondTrigger, { x: 200, y: 200, width: 50, height: 20 })

  act(() => {
    firstTrigger.click()
  })
  act(() => {
    secondTrigger.click()
  })

  const [firstPanel, secondPanel] = Array.from(
    container.querySelectorAll<HTMLElement>('[data-space-ui="popover"]'),
  )

  assertNotEquals(
    firstPanel.getAttribute('data-popover-id'),
    secondPanel.getAttribute('data-popover-id'),
  )

  stubRect(firstPanel, { x: 0, y: 0, width: 80, height: 40 })
  act(() => dispatchWindowEvent(new Event('resize')))

  assertEquals(popoverRule(container, firstPanel).style.visibility, 'visible')
  assertStringIncludes(popoverRule(container, firstPanel).style.transform, 'translate(')

  act(() => renderDOM(null, container))
})

Deno.test('Popover (preact): repeated open/close cycles never accumulate duplicate rules', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  for (let i = 0; i < 3; i++) {
    act(() => trigger.click()) // open
    const styleEl = must(container.querySelector<HTMLStyleElement>('style'))
    const sheet = must(styleEl.sheet)
    assertEquals(sheet.cssRules.length, 2)
    act(() => trigger.click()) // close
  }

  assertEquals(container.querySelector('style'), null)

  unmount()
})

Deno.test('Popover (preact): nonce lands on the injected style element', () => {
  const { container, unmount } = mount({ ...basicProps(true), nonce: 'abc123' })

  const styleEl = must(container.querySelector('style'))
  assertEquals(styleEl.getAttribute('nonce'), 'abc123')

  unmount()
})

Deno.test('Popover (preact): clicking the trigger again closes the panel', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())
  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  act(() => trigger.click())
  assertEquals(container.querySelector('[data-space-ui="popover"]'), null)

  unmount()
})

// Same real bug this component's React binding found and fixed — see `index.ts`'s own doc. Proven
// here too, independently, since this is a genuinely separate implementation.
Deno.test('Popover (preact): a click inside the panel on its own content never closes it', () => {
  const { container, unmount } = mount({
    trigger: (triggerProps) => h('button', { type: 'button', ...triggerProps }, 'Open'),
    children: h('button', { type: 'button', id: 'inside-action' }, 'Inside action'),
  })
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())
  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  const insideButton = must(container.querySelector('#inside-action'))
  act(() => {
    insideButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  unmount()
})

Deno.test('Popover (preact): an outside click closes it', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())
  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  act(() => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="popover"]'), null)

  unmount()
})

Deno.test('Popover (preact): Escape closes it and refocuses the trigger', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector<HTMLButtonElement>('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())
  const panel = must(container.querySelector('[data-space-ui="popover"]'))

  act(() => {
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(container.querySelector('[data-space-ui="popover"]'), null)
  assertEquals(document.activeElement, trigger)

  unmount()
})

// --- controlled / uncontrolled / onOpenChange -------------------------------------------------

Deno.test('Popover (preact): uncontrolled — onOpenChange fires, still opens itself', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onOpenChange: (next) => calls.push(next),
  })
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  unmount()
})

Deno.test('Popover (preact): controlled — a click notifies but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    ...basicProps(false),
    onOpenChange: (next) => calls.push(next),
  })
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.click())

  assertEquals(calls, [true])
  assertEquals(container.querySelector('[data-space-ui="popover"]'), null)

  unmount()
})

Deno.test('Popover (preact): controlled — updating open re-renders, no click needed', () => {
  const { container, rerender, unmount } = mount(basicProps(false))
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  rerender(basicProps(true))

  assertEquals(container.querySelector('[data-space-ui="popover"]') !== null, true)

  unmount()
})

// --- id/className ----------------------------------------------------------------------------

Deno.test('Popover (preact): id/className land on the panel', () => {
  const { container, unmount } = mount({
    ...basicProps(),
    defaultOpen: true,
    id: 'menu-panel',
    className: 'popover-panel',
  })
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  const panel = must(container.querySelector('[data-space-ui="popover"]'))
  assertEquals(panel.id, 'menu-panel')
  assertEquals(panel.className, 'popover-panel')

  unmount()
})
