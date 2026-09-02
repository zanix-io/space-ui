import { getDynamicRule, installTimerMock, must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertNotEquals, assertStringIncludes } from '@std/assert'
import { Tooltip } from 'components/Tooltip/index.preact.ts'
import type { TooltipProps } from 'components/Tooltip/index.preact.ts'

// Unlike every hookless Preact component in this package, `Tooltip` uses real hooks — built with
// `h(Tooltip, props)` and rendered through Preact's own pipeline. See `counter-preact.test.tsx`'s
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

function element(props: TooltipProps): VNode {
  return h(Tooltip, props) as VNode
}

function mount(props: TooltipProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: TooltipProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function basicProps(open?: boolean): TooltipProps {
  return {
    open,
    content: 'Delete this item',
    trigger: (triggerProps) => h('button', { type: 'button', ...triggerProps }, 'Delete'),
  }
}

/** The CSSOM rule `getOrInsertDynamicRule` scoped to `panel`'s own `data-tooltip-id` — see
 * `dom-test-setup.ts`'s own `getDynamicRule` doc. */
function tooltipRule(container: Element, panel: Element) {
  return getDynamicRule(container, panel, 'data-tooltip-id')
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Tooltip (preact): SSR — the panel is in markup, referenced by aria-describedby', () => {
  const html = renderToString(element(basicProps(false)))

  const describedByMatch = must(html.match(/aria-describedby="([^"]+)"/))[1]
  assertStringIncludes(html, 'role="tooltip"')
  assertStringIncludes(html, `id="${describedByMatch}"`)
  assertStringIncludes(html, 'Delete this item')
})

Deno.test('Tooltip (preact): SSR — closed, the panel is hidden via the static CSS rule alone', () => {
  const html = renderToString(element(basicProps(false)))

  // Effects never run during SSR, so no CSSOM rule exists yet — the panel still starts hidden
  // because `TOOLTIP_POSITION_CSS`'s own STATIC rule now includes `visibility: hidden` as a
  // default. The panel itself carries no `style` attribute at all.
  assertStringIncludes(html, 'visibility:hidden')
})

// --- real DOM: hover open/close, positioning ----------------------------------------------

Deno.test('Tooltip (preact): hovering the trigger opens it — real DOM', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })

  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

  unmount()
})

Deno.test('Tooltip (preact): the panel is positioned via the trigger reference rect', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))
  stubRect(panel, { x: 0, y: 0, width: 80, height: 40 })

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })

  // No inline `style` attribute at all — `position`/`top`/`left` live in the static `<style>` rule
  // (a real CSP fix), and the genuinely dynamic `transform`/`visibility`/`pointer-events` are
  // applied to a CSSOM rule inside that SAME element instead.
  assertEquals(panel.getAttribute('style'), null)

  const styleEl = must(container.querySelector('style'))
  assertStringIncludes(styleEl.textContent ?? '', "[data-space-ui='tooltip']{position:fixed")

  const rule = tooltipRule(container, panel)
  assertStringIncludes(rule.style.transform, 'translate(')
  assertEquals(rule.style.visibility, 'visible')
  assertEquals(rule.style.pointerEvents, 'auto')
  assertStringIncludes(rule.selectorText, "[data-tooltip-id='")

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
Deno.test('Tooltip (preact): two instances mounted as siblings get independently scoped rules', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() =>
    renderDOM(
      h('div', {}, [
        h(Tooltip, {
          content: 'First',
          trigger: (triggerProps) => h('button', { type: 'button', ...triggerProps }, 'First'),
        }),
        h(Tooltip, {
          content: 'Second',
          trigger: (triggerProps) => h('button', { type: 'button', ...triggerProps }, 'Second'),
        }),
      ]),
      container,
    )
  )

  const [firstTrigger, secondTrigger] = Array.from(container.querySelectorAll('button'))
  stubRect(firstTrigger, { x: 100, y: 100, width: 50, height: 20 })
  stubRect(secondTrigger, { x: 200, y: 200, width: 50, height: 20 })
  const [firstPanel, secondPanel] = Array.from(
    container.querySelectorAll<HTMLElement>('[data-space-ui="tooltip"]'),
  )

  assertNotEquals(
    firstPanel.getAttribute('data-tooltip-id'),
    secondPanel.getAttribute('data-tooltip-id'),
  )

  act(() => {
    firstTrigger.dispatchEvent(new Event('mouseenter'))
  })

  assertEquals(tooltipRule(container, firstPanel).style.visibility, 'visible')
  assertEquals(tooltipRule(container, secondPanel).style.visibility, 'hidden')

  act(() => renderDOM(null, container))
})

Deno.test('Tooltip (preact): nonce lands on the injected style element', () => {
  const { container, unmount } = mount({ ...basicProps(true), nonce: 'abc123' })

  const styleEl = must(container.querySelector('style'))
  assertEquals(styleEl.getAttribute('nonce'), 'abc123')

  unmount()
})

Deno.test(
  'Tooltip (preact): a trigger render-prop with no element child never crashes — stays unpositioned',
  () => {
    // `trigger` returning plain text (no wrapping element) means the reference element
    // `usePosition` needs (`triggerWrapperRef.current?.firstElementChild`) is genuinely absent —
    // the `?? null` fallback is what keeps this from throwing.
    const { container, unmount } = mount({
      open: true,
      content: 'Delete this item',
      trigger: () => 'Just text, no element',
    })

    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))
    const rule = tooltipRule(container, panel)
    assertEquals(rule.style.transform, '')
    assertEquals(rule.style.visibility, 'hidden')

    unmount()
  },
)

Deno.test('Tooltip (preact): the mouse leaving the trigger closes it', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })
  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

  act(() => {
    trigger.dispatchEvent(new Event('mouseleave'))
  })
  assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip (preact): focusing the trigger opens it, blurring it closes it', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new Event('focus'))
  })
  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

  act(() => {
    trigger.dispatchEvent(new Event('blur'))
  })
  assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip (preact): Escape closes it when opened via real keyboard focus', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector<HTMLButtonElement>('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.focus()
  })
  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

  unmount()
})

// Same real bug this component's React binding found and fixed — see `index.ts`'s own doc. Proven
// here too, independently, since this is a genuinely separate implementation.
Deno.test('Tooltip (preact): Escape closes a hover-only tooltip too, without reopening it', () => {
  const { container, unmount } = mount(basicProps())
  const trigger = must(container.querySelector<HTMLButtonElement>('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })
  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')
  assertEquals(document.activeElement === trigger, false)

  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

  assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

  unmount()
})

// --- delays ----------------------------------------------------------------------------------

Deno.test('Tooltip (preact): openDelay defers showing, closeDelay defers hiding', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount({ ...basicProps(), openDelay: 300, closeDelay: 200 })
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new Event('mouseenter'))
    })
    assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

    act(() => {
      timers.advance(299)
    })
    assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

    act(() => {
      timers.advance(1)
    })
    assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

    act(() => {
      trigger.dispatchEvent(new Event('mouseleave'))
    })
    assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

    act(() => {
      timers.advance(199)
    })
    assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

    act(() => {
      timers.advance(1)
    })
    assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

    unmount()
  } finally {
    timers.restore()
  }
})

Deno.test('Tooltip (preact): a mouseleave before openDelay elapses cancels the open', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount({ ...basicProps(), openDelay: 300 })
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new Event('mouseenter'))
    })
    act(() => {
      trigger.dispatchEvent(new Event('mouseleave'))
    })
    act(() => {
      timers.advance(300)
    })

    assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

    unmount()
  } finally {
    timers.restore()
  }
})

Deno.test('Tooltip (preact): focus bypasses openDelay entirely — opens instantly', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount({ ...basicProps(), openDelay: 300 })
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new Event('focus'))
    })

    assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

    unmount()
  } finally {
    timers.restore()
  }
})

// --- controlled / uncontrolled / onOpenChange -------------------------------------------------

Deno.test('Tooltip (preact): uncontrolled — onOpenChange fires, still opens itself', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    ...basicProps(),
    onOpenChange: (next) => calls.push(next),
  })
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })

  assertEquals(calls, [true])
  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

  unmount()
})

Deno.test('Tooltip (preact): controlled — hovering notifies but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount({
    ...basicProps(false),
    onOpenChange: (next) => calls.push(next),
  })
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new Event('mouseenter'))
  })

  assertEquals(calls, [true])
  assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip (preact): controlled — updating open re-renders, no hover needed', () => {
  const { container, rerender, unmount } = mount(basicProps(false))
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  rerender(basicProps(true))

  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

  unmount()
})

// --- id/className ----------------------------------------------------------------------------

Deno.test('Tooltip (preact): id/className land on the panel', () => {
  const { container, unmount } = mount({
    ...basicProps(),
    id: 'delete-tooltip',
    className: 'tooltip-panel',
  })
  const panel = must(container.querySelector('[data-space-ui="tooltip"]'))
  assertEquals(panel.id, 'delete-tooltip')
  assertEquals(panel.className, 'tooltip-panel')

  unmount()
})

Deno.test('Tooltip (preact): the trigger aria-describedby cross-references the panel id', () => {
  const { container, unmount } = mount(basicProps(false))
  const trigger = must(container.querySelector('button'))
  const panel = must(container.querySelector('[data-space-ui="tooltip"]'))

  assertEquals(trigger.getAttribute('aria-describedby'), panel.id)

  unmount()
})

// --- CSSOM cleanup -----------------------------------------------------------------------------

Deno.test(
  'Tooltip (preact): the dynamic rule is inserted once, not duplicated on repeated hover cycles',
  () => {
    const { container, unmount } = mount(basicProps())
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))
    const styleEl = must(container.querySelector<HTMLStyleElement>('style'))
    const sheet = must(styleEl.sheet)

    for (let i = 0; i < 3; i++) {
      act(() => {
        trigger.dispatchEvent(new Event('mouseenter'))
      })
      act(() => {
        trigger.dispatchEvent(new Event('mouseleave'))
      })
    }

    assertEquals(sheet.cssRules.length, 2)
    assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

    unmount()
  },
)

Deno.test(
  'Tooltip (preact): unmounting removes its own `<style>` element, leaking nothing in the DOM',
  () => {
    const { container, unmount } = mount(basicProps())
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

    act(() => {
      trigger.dispatchEvent(new Event('mouseenter'))
    })
    assertEquals(container.querySelector('style') !== null, true)

    unmount()

    assertEquals(container.querySelector('style'), null)
  },
)
