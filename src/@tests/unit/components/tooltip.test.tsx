import { getDynamicRule, installTimerMock, must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertNotEquals, assertStringIncludes } from '@std/assert'
import { Tooltip } from 'components/Tooltip/index.ts'

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

function mount(element: ReturnType<typeof Tooltip>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Tooltip>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

function basicTooltip(open?: boolean) {
  return (
    <Tooltip
      open={open}
      content='Delete this item'
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
    />
  )
}

/** The CSSOM rule `getOrInsertDynamicRule` scoped to `panel`'s own `data-tooltip-id` — see
 * `dom-test-setup.ts`'s own `getDynamicRule` doc. */
function tooltipRule(container: Element, panel: Element) {
  return getDynamicRule(container, panel, 'data-tooltip-id')
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Tooltip: SSR — the panel is always in markup, referenced by aria-describedby', () => {
  const html = renderToStaticMarkup(basicTooltip(false))

  const describedByMatch = must(html.match(/aria-describedby="([^"]+)"/))[1]
  assertStringIncludes(html, `role="tooltip"`)
  assertStringIncludes(html, `id="${describedByMatch}"`)
  assertStringIncludes(html, 'Delete this item')
})

Deno.test('Tooltip: SSR — closed, the panel is hidden via the static CSS rule alone', () => {
  const html = renderToStaticMarkup(basicTooltip(false))

  // Effects never run during SSR, so no CSSOM rule exists yet — the panel still starts hidden
  // because `TOOLTIP_POSITION_CSS`'s own STATIC rule now includes `visibility: hidden` as a
  // default (see that constant's own doc), not because of anything computed per-render. The panel
  // itself carries no `style` attribute at all.
  assertStringIncludes(html, 'visibility:hidden')
  const panelMatch = must(html.match(/<div id="[^"]*" role="tooltip"[^>]*>/))[0]
  assertEquals(panelMatch.includes('style='), false)
})

// --- real DOM: hover open/close, positioning ----------------------------------------------

Deno.test('Tooltip: hovering the trigger opens it — real DOM', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })

  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

  unmount()
})

Deno.test('Tooltip: the panel is positioned via the trigger reference rect', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))
  stubRect(panel, { x: 0, y: 0, width: 80, height: 40 })

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })

  // No inline `style` attribute at all — `position`/`top`/`left` live in the static `<style>` rule
  // (a real CSP fix), and the genuinely dynamic `transform`/`visibility`/`pointer-events` are
  // applied to a CSSOM rule inside that SAME element instead (see `TOOLTIP_POSITION_CSS`'s and
  // `createTooltip`'s own doc).
  assertEquals(panel.getAttribute('style'), null)

  const styleEl = must(container.querySelector('style'))
  assertStringIncludes(styleEl.textContent ?? '', "[data-space-ui='tooltip']{position:fixed")

  const rule = tooltipRule(container, panel)
  assertStringIncludes(rule.style.transform, 'translate(')
  assertEquals(rule.style.visibility, 'visible')
  assertEquals(rule.style.pointerEvents, 'auto')
  // Scoped to THIS instance, not the static rule's own broader selector.
  assertStringIncludes(rule.selectorText, "[data-tooltip-id='")
  assertNotEquals(rule.selectorText, "[data-space-ui='tooltip']")

  unmount()
})

Deno.test('Tooltip: two instances mounted as siblings get independently scoped dynamic rules', () => {
  // Two SEPARATE `createRoot` calls (rather than siblings under one root) would be the wrong way to
  // test this: `useId()` is only ever guaranteed unique WITHIN a single root's own tree — a real,
  // confirmed divergence found while building this (Preact's own `useId()` resets its own counter
  // per independent root, producing the SAME id, e.g. `P0-0`, for two genuinely separate roots;
  // React's own root-scoped counter did not collide in the one construction actually tried, but
  // relying on that is still the wrong test — see `tooltip-preact.test.tsx`'s own doc for the full
  // account). Two sibling instances under ONE root/tree is the realistic case this actually needs to
  // prove, and the only shape `useId()` is documented to guarantee uniqueness for.
  const { container, unmount } = mount(
    <div>
      <Tooltip
        content='First'
        trigger={(triggerProps) => <button type='button' {...triggerProps}>First</button>}
      />
      <Tooltip
        content='Second'
        trigger={(triggerProps) => <button type='button' {...triggerProps}>Second</button>}
      />
    </div>,
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
    firstTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })

  // Opening the FIRST tooltip only ever touches its own scoped rule — the second instance's own
  // rule, in the SAME `<style>` element's own stylesheet, stays untouched.
  assertEquals(tooltipRule(container, firstPanel).style.visibility, 'visible')
  assertEquals(tooltipRule(container, secondPanel).style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip: nonce lands on the injected style element', () => {
  const html = renderToStaticMarkup(
    <Tooltip
      content='Delete this item'
      nonce='abc123'
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
    />,
  )

  assertStringIncludes(html, 'nonce="abc123"')
})

Deno.test(
  'Tooltip: a trigger render-prop with no element child never crashes — just stays unpositioned',
  () => {
    // `trigger` returning plain text (no wrapping element) means the reference element `usePosition`
    // needs (`triggerWrapperRef.current?.firstElementChild`) is genuinely absent — the `?? null`
    // fallback is what keeps this from throwing.
    const { container, unmount } = mount(
      <Tooltip open content='Delete this item' trigger={() => 'Just text, no element'} />,
    )

    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))
    const rule = tooltipRule(container, panel)
    assertEquals(rule.style.transform, '')
    // `visible = open && position !== null` — with no reference element to measure, `position`
    // never resolves, so the panel stays `open`-requested but never actually shown. Never throws,
    // which is the real contract being tested here.
    assertEquals(rule.style.visibility, 'hidden')

    unmount()
  },
)

Deno.test('Tooltip: the mouse leaving the trigger closes it', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })
  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  })
  assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip: focusing the trigger opens it, blurring it closes it', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

  act(() => {
    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
  assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip: Escape closes it when opened via real keyboard focus', () => {
  const { container, unmount } = mount(basicTooltip())
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

// A real, confirmed bug caught by this exact test while building `Tooltip`: an earlier version
// wired `Escape` to the trigger's own `onKeyDown` via `createEscapeToCloseHandler` (the same shape
// `Popover` uses), which refocuses the trigger on close — but when the tooltip was opened by mouse
// hover alone (never a real focus change), that refocus call fires a genuine `focusin` event,
// which this component's own `onFocus` handler treats as "open," undoing the close immediately.
// Fixed by moving `Escape` to a document-level listener with no refocus side effect at all — see
// `index.ts`'s own doc for the full explanation.
Deno.test('Tooltip: Escape closes a hover-only tooltip too, without reopening it', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector<HTMLButtonElement>('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
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

Deno.test('Tooltip: openDelay defers showing until it elapses, closeDelay defers hiding', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount(
      <Tooltip
        openDelay={300}
        closeDelay={200}
        content='Delete this item'
        trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
      />,
    )
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
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
      trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
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

Deno.test('Tooltip: a mouseleave before openDelay elapses cancels the pending open', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount(
      <Tooltip
        openDelay={300}
        content='Delete this item'
        trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
      />,
    )
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    act(() => {
      trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
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

Deno.test('Tooltip: focus bypasses openDelay entirely — opens instantly', () => {
  const timers = installTimerMock()
  try {
    const { container, unmount } = mount(
      <Tooltip
        openDelay={300}
        content='Delete this item'
        trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
      />,
    )
    const trigger = must(container.querySelector('button'))
    stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
    const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

    act(() => {
      trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })

    assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

    unmount()
  } finally {
    timers.restore()
  }
})

// --- controlled / uncontrolled / onOpenChange -------------------------------------------------

Deno.test('Tooltip: uncontrolled — onOpenChange fires, still opens itself', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Tooltip
      onOpenChange={(next) => calls.push(next)}
      content='Delete this item'
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
    />,
  )
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })

  assertEquals(calls, [true])
  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

  unmount()
})

Deno.test('Tooltip: controlled — hovering notifies onOpenChange but never self-opens', () => {
  const calls: boolean[] = []
  const { container, unmount } = mount(
    <Tooltip
      open={false}
      onOpenChange={(next) => calls.push(next)}
      content='Delete this item'
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
    />,
  )
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  act(() => {
    trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })

  assertEquals(calls, [true])
  assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip: controlled — updating open from outside re-renders, no hover needed', () => {
  const { container, rerender, unmount } = mount(basicTooltip(false))
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))

  rerender(basicTooltip(true))

  assertEquals(tooltipRule(container, panel).style.visibility, 'visible')

  unmount()
})

// --- id/className ----------------------------------------------------------------------------

Deno.test('Tooltip: id/className land on the panel', () => {
  const { container, unmount } = mount(
    <Tooltip
      id='delete-tooltip'
      className='tooltip-panel'
      content='Delete this item'
      trigger={(triggerProps) => <button type='button' {...triggerProps}>Delete</button>}
    />,
  )
  const panel = must(container.querySelector('[data-space-ui="tooltip"]'))
  assertEquals(panel.id, 'delete-tooltip')
  assertEquals(panel.className, 'tooltip-panel')

  unmount()
})

Deno.test('Tooltip: the trigger carries aria-describedby cross-referencing the panel id', () => {
  const { container, unmount } = mount(basicTooltip(false))
  const trigger = must(container.querySelector('button'))
  const panel = must(container.querySelector('[data-space-ui="tooltip"]'))

  assertEquals(trigger.getAttribute('aria-describedby'), panel.id)

  unmount()
})

// --- CSSOM cleanup -----------------------------------------------------------------------------

// The real gap this whole change closes: a strict nonce-only CSP blocks an inline `style` attribute
// but not a CSSOM mutation of a rule already living inside an authorized `<style nonce>` element —
// see `shared/overlay-position-css.ts`'s own doc. These tests confirm the rule is inserted exactly
// once (not duplicated on every re-render) and cleaned up on unmount, not just that its values look
// right.
Deno.test('Tooltip: the dynamic rule is inserted once, not duplicated on repeated hover cycles', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })
  const panel = must(container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))
  const styleEl = must(container.querySelector<HTMLStyleElement>('style'))
  const sheet = must(styleEl.sheet)

  for (let i = 0; i < 3; i++) {
    act(() => trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    act(() => trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })))
  }

  // One static rule (`TOOLTIP_POSITION_CSS`) plus exactly one dynamic rule for this one instance —
  // never more, regardless of how many times it opened and closed.
  assertEquals(sheet.cssRules.length, 2)
  assertEquals(tooltipRule(container, panel).style.visibility, 'hidden')

  unmount()
})

Deno.test('Tooltip: unmounting removes its own `<style>` element, leaking nothing in the DOM', () => {
  const { container, unmount } = mount(basicTooltip())
  const trigger = must(container.querySelector('button'))
  stubRect(trigger, { x: 100, y: 100, width: 50, height: 20 })

  act(() => trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
  assertEquals(container.querySelector('style') !== null, true)

  unmount()

  // The whole `<style>` element (both rules — static and this instance's own dynamic one) is gone
  // from the DOM once unmounted, which is what actually matters for "nothing leaks": a disconnected,
  // no-longer-referenced stylesheet applies to nothing and is eligible for garbage collection
  // regardless of whether its own `cssRules` array still happens to hold entries in memory.
  assertEquals(container.querySelector('style'), null)
})

// A real, confirmed bug caught by this exact test while building this: `HTMLStyleElement.sheet`
// legitimately returns `null` once its element is disconnected (spec behavior — confirmed here, not
// assumed), which is often already true by the time an unmount/close cleanup effect runs. An
// earlier version of `removeDynamicRule` returned early in that case WITHOUT clearing its own
// `ruleRef`, so a stale rule reference survived into the NEXT `getOrInsertDynamicRule` call, which
// then wrongly treated a rule as "already inserted" and skipped inserting a fresh one into the new
// `<style>` element's own new stylesheet — silently leaving a reopened instance with no dynamic
// rule (and therefore no real position) at all. `Popover`'s own panel/`<style>` element unmount on
// every close (unlike `Tooltip`'s always-mounted one), so this is the component that actually
// exercises that path — see its own test file for the fix proven in full.
Deno.test('Tooltip: unmounting then a fresh mount gets its own working dynamic rule', () => {
  const first = mount(basicTooltip())
  const firstTrigger = must(first.container.querySelector('button'))
  stubRect(firstTrigger, { x: 100, y: 100, width: 50, height: 20 })
  act(() => firstTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
  const firstPanel = must(first.container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'))
  assertEquals(tooltipRule(first.container, firstPanel).style.visibility, 'visible')
  first.unmount()

  const second = mount(basicTooltip())
  const secondTrigger = must(second.container.querySelector('button'))
  stubRect(secondTrigger, { x: 100, y: 100, width: 50, height: 20 })
  act(() => secondTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
  const secondPanel = must(
    second.container.querySelector<HTMLElement>('[data-space-ui="tooltip"]'),
  )
  assertEquals(tooltipRule(second.container, secondPanel).style.visibility, 'visible')

  second.unmount()
})
