import './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assert, assertEquals, assertMatch, assertStringIncludes } from '@std/assert'
import { must } from './dom-test-setup.ts'
import { RangeSlider } from 'components/RangeSlider/index.preact.ts'
import type { RangeSliderProps } from 'components/RangeSlider/index.preact.ts'

// Unlike a hookless Preact component, `RangeSlider` uses real hooks — built with
// `h(RangeSlider, props)` and rendered through Preact's own pipeline, not called as a plain
// function. See `radio-group-preact.test.tsx`'s own doc for the same reasoning.

function element(props: RangeSliderProps): VNode {
  return h(RangeSlider, props) as VNode
}

function mount(props: RangeSliderProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: RangeSliderProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function handles(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[role="slider"]'))
}

/** The CSSOM rule `getOrInsertDynamicRule` inserts for one moving part (`selectorFragment`
 * identifies which: `[data-range-slider-handle='single']`, `'min'`, `'max'`, or the fill's own
 * `[data-range-slider-id='...']` with no `data-range-slider-handle` at all). `initialPositionCss`
 * (`render.ts`'s own doc) renders a FIRST rule with the identical selector as plain SSR text,
 * before the dynamic one is ever inserted — `sheet.insertRule`'s own index argument always appends,
 * so the LAST matching rule in source order is always the one hydration's own `useLayoutEffect`
 * actually mutates on every later value change; the first is the static SSR snapshot, which never
 * changes again once the dynamic rule takes over the cascade. */
function lastDynamicRule(container: Element, selectorFragment: string): CSSStyleRule {
  let found: CSSStyleRule | undefined
  for (const styleEl of Array.from(container.querySelectorAll('style'))) {
    const sheet = (styleEl as HTMLStyleElement).sheet
    if (!sheet) continue
    for (const rule of Array.from(sheet.cssRules)) {
      const styleRule = rule as CSSStyleRule
      if (styleRule.selectorText?.includes(selectorFragment)) found = styleRule
    }
  }
  if (!found) throw new Error(`Expected a dynamic rule matching ${selectorFragment}, found none`)
  return found
}

function stubRect(el: Element, width: number) {
  el.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width,
    height: 20,
    top: 0,
    left: 0,
    right: width,
    bottom: 20,
    toJSON() {},
  })
}

/** See `range-slider.test.tsx`'s own doc on this same helper — identical reasoning, Preact. */
function pointerEvent(type: string, clientX: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & { clientX: number }
  Object.assign(event, { clientX })
  return event
}

function keyDown(target: Element, key: string) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })
}

// --- structure: single value -------------------------------------------------------------------

Deno.test('RangeSlider (preact): single value renders exactly one role="slider" handle', () => {
  const html = renderToString(element({ label: 'Search radius', value: 30 }))

  assertEquals((html.match(/role="slider"/g) ?? []).length, 1)
  assertStringIncludes(html, 'aria-label="Search radius"')
  assertStringIncludes(html, 'aria-valuemin="0"')
  assertStringIncludes(html, 'aria-valuemax="100"')
  assertStringIncludes(html, 'aria-valuenow="30"')
  assertStringIncludes(html, 'data-space-ui="range-slider"')
  assertStringIncludes(html, 'data-space-ui="range-slider-track"')
  assertStringIncludes(html, 'data-space-ui="range-slider-range"')
  assertStringIncludes(html, 'data-space-ui="range-slider-handle"')
  assertStringIncludes(html, `data-range-slider-handle="single"`)
})

Deno.test('RangeSlider (preact): id/className land on the root', () => {
  const html = renderToString(
    element({ label: 'Radius', value: 10, id: 'radius', className: 'my-slider' }),
  )
  const rootMatch = html.match(/<div[^>]*id="radius"[^>]*class="my-slider"[^>]*>/)
  assertEquals(rootMatch !== null, true)
})

Deno.test('RangeSlider (preact): formatValue drives aria-valuetext', () => {
  const html = renderToString(
    element({ label: 'Radius', value: 15, formatValue: (v) => `${v} km` }),
  )
  assertStringIncludes(html, 'aria-valuetext="15 km"')
})

// --- structure: two-handle range ----------------------------------------------------------------

Deno.test('RangeSlider (preact): range shape renders exactly two role="slider" handles', () => {
  const html = renderToString(
    element({
      minLabel: 'Minimum age',
      maxLabel: 'Maximum age',
      min: 18,
      max: 80,
      value: [25, 40],
    }),
  )

  assertEquals((html.match(/role="slider"/g) ?? []).length, 2)
  assertStringIncludes(html, 'aria-label="Minimum age"')
  assertStringIncludes(html, 'aria-label="Maximum age"')
  assertStringIncludes(html, 'aria-valuenow="25"')
  assertStringIncludes(html, 'aria-valuenow="40"')
})

// --- bounds clamping -----------------------------------------------------------------------------

Deno.test('RangeSlider (preact): a defaultValue below min clamps to min', () => {
  const html = renderToString(element({ label: 'Radius', min: 10, max: 100, defaultValue: 0 }))
  assertStringIncludes(html, 'aria-valuenow="10"')
})

Deno.test('RangeSlider (preact): a defaultValue above max clamps to max', () => {
  const html = renderToString(element({ label: 'Radius', min: 0, max: 50, defaultValue: 999 }))
  assertStringIncludes(html, 'aria-valuenow="50"')
})

Deno.test('RangeSlider (preact): an off-step defaultValue rounds to the nearest step', () => {
  const html = renderToString(
    element({ label: 'Radius', min: 0, max: 100, step: 10, defaultValue: 23 }),
  )
  assertStringIncludes(html, 'aria-valuenow="20"')
})

// --- keyboard: single value, real DOM -------------------------------------------------------------

Deno.test('RangeSlider (preact): ArrowRight increments by step', () => {
  const { container, unmount } = mount({ label: 'Radius', defaultValue: 30 })
  const [handle] = handles(container)

  keyDown(handle, 'ArrowRight')

  assertEquals(handle.getAttribute('aria-valuenow'), '31')
  unmount()
})

Deno.test('RangeSlider (preact): Home/End jump to min/max', () => {
  const { container, unmount } = mount({ label: 'Radius', min: 0, max: 100, defaultValue: 30 })
  const [handle] = handles(container)

  keyDown(handle, 'End')
  assertEquals(handle.getAttribute('aria-valuenow'), '100')

  keyDown(handle, 'Home')
  assertEquals(handle.getAttribute('aria-valuenow'), '0')

  unmount()
})

Deno.test('RangeSlider (preact): PageUp/PageDown jump by pageStep (default step * 10)', () => {
  const { container, unmount } = mount({ label: 'Radius', min: 0, max: 100, defaultValue: 30 })
  const [handle] = handles(container)

  keyDown(handle, 'PageUp')
  assertEquals(handle.getAttribute('aria-valuenow'), '40')

  unmount()
})

// --- keyboard: two-handle range, handles never cross ---------------------------------------------

Deno.test("RangeSlider (preact): the lower handle's End stops at the upper handle's value", () => {
  const { container, unmount } = mount({
    minLabel: 'Min',
    maxLabel: 'Max',
    min: 0,
    max: 100,
    defaultValue: [20, 60],
  })
  const [minHandle, maxHandle] = handles(container)

  keyDown(minHandle, 'End')

  assertEquals(minHandle.getAttribute('aria-valuenow'), '60')
  assertEquals(maxHandle.getAttribute('aria-valuenow'), '60')
  unmount()
})

Deno.test('RangeSlider (preact): the two handles adjust independently otherwise', () => {
  const { container, unmount } = mount({
    minLabel: 'Min',
    maxLabel: 'Max',
    min: 0,
    max: 100,
    defaultValue: [20, 60],
  })
  const [minHandle, maxHandle] = handles(container)

  keyDown(minHandle, 'ArrowRight')

  assertEquals(minHandle.getAttribute('aria-valuenow'), '21')
  assertEquals(maxHandle.getAttribute('aria-valuenow'), '60')
  unmount()
})

// --- controlled / uncontrolled / onValueChange ----------------------------------------------------

Deno.test('RangeSlider (preact): uncontrolled — onValueChange fires, self-updates', () => {
  const calls: number[] = []
  const { container, unmount } = mount({
    label: 'Radius',
    defaultValue: 30,
    onValueChange: (next) => calls.push(next),
  })
  const [handle] = handles(container)

  keyDown(handle, 'ArrowRight')

  assertEquals(calls, [31])
  assertEquals(handle.getAttribute('aria-valuenow'), '31')
  unmount()
})

Deno.test('RangeSlider (preact): controlled — a key notifies but never self-updates', () => {
  const calls: number[] = []
  const { container, unmount } = mount({
    label: 'Radius',
    value: 30,
    onValueChange: (next) => calls.push(next),
  })
  const [handle] = handles(container)

  keyDown(handle, 'ArrowRight')

  assertEquals(calls, [31])
  assertEquals(handle.getAttribute('aria-valuenow'), '30')
  unmount()
})

Deno.test('RangeSlider (preact): controlled — updating value re-renders, no interaction needed', () => {
  const { container, rerender, unmount } = mount({ label: 'Radius', value: 30 })

  rerender({ label: 'Radius', value: 70 })

  const [handle] = handles(container)
  assertEquals(handle.getAttribute('aria-valuenow'), '70')
  unmount()
})

// --- disabled --------------------------------------------------------------------------------

Deno.test('RangeSlider (preact): disabled sets aria-disabled and tabIndex -1, ignores keyboard', () => {
  const calls: number[] = []
  const { container, unmount } = mount({
    label: 'Radius',
    value: 30,
    disabled: true,
    onValueChange: (next) => calls.push(next),
  })
  const [handle] = handles(container)

  assertEquals(handle.getAttribute('aria-disabled'), 'true')
  assertEquals(handle.getAttribute('tabindex'), '-1')

  keyDown(handle, 'ArrowRight')

  assertEquals(calls, [])
  unmount()
})

// --- pointer/touch drag, real DOM -----------------------------------------------------------------

Deno.test('RangeSlider (preact): dragging a handle updates its value via document pointermove', () => {
  const calls: number[] = []
  const { container, unmount } = mount({
    label: 'Radius',
    min: 0,
    max: 100,
    defaultValue: 0,
    onValueChange: (next) => calls.push(next),
  })
  const track = must(container.querySelector<HTMLElement>('[data-space-ui="range-slider-track"]'))
  stubRect(track, 200)
  const [handle] = handles(container)

  act(() => {
    handle.dispatchEvent(pointerEvent('pointerdown', 0))
  })
  act(() => {
    document.dispatchEvent(pointerEvent('pointermove', 100))
  })

  assert(calls.includes(50), `expected a call with 50, got ${JSON.stringify(calls)}`)
  assertEquals(handle.getAttribute('aria-valuenow'), '50')

  act(() => {
    document.dispatchEvent(new Event('pointerup', { bubbles: true, cancelable: true }))
  })
  unmount()
})

Deno.test('RangeSlider (preact): clicking the track (not a handle) jumps the nearest handle', () => {
  const { container, unmount } = mount({
    minLabel: 'Min',
    maxLabel: 'Max',
    min: 0,
    max: 100,
    defaultValue: [10, 90],
  })
  const track = must(container.querySelector<HTMLElement>('[data-space-ui="range-slider-track"]'))
  stubRect(track, 200)

  // clientX 30 -> 15% -> value 15, closer to the lower handle (10) than the upper (90)
  act(() => {
    track.dispatchEvent(pointerEvent('pointerdown', 30))
  })

  const [minHandle, maxHandle] = handles(container)
  assertEquals(minHandle.getAttribute('aria-valuenow'), '15')
  assertEquals(maxHandle.getAttribute('aria-valuenow'), '90')
  unmount()
})

Deno.test(
  "RangeSlider (preact): a handle's own pointerdown never triggers the track's jump logic",
  () => {
    const { container, unmount } = mount({ label: 'Radius', min: 0, max: 100, defaultValue: 50 })
    const track = must(container.querySelector<HTMLElement>('[data-space-ui="range-slider-track"]'))
    stubRect(track, 200)
    const [handle] = handles(container)

    act(() => {
      handle.dispatchEvent(pointerEvent('pointerdown', 5))
    })

    assertEquals(handle.getAttribute('aria-valuenow'), '50')
    unmount()
  },
)

// --- SSR: the handle/fill jump this suite exists for -----------------------------------------
//
// `getOrInsertDynamicRule`'s own CSSOM mutation only ever runs once a `useLayoutEffect` fires —
// `preact-render-to-string` never runs an effect at all, so without `initialPositionCss`
// (`render.ts`'s own doc), the server-rendered `<style>` text would carry no `left`/`width` for the
// fill/handles at all, and every first paint would show them at their unstyled default spot until
// the client hydrates.

Deno.test(
  "RangeSlider (preact) SSR: the single handle's real position is already in the server HTML",
  () => {
    const html = renderToString(element({ label: 'Radius', min: 0, max: 100, defaultValue: 66 }))

    assertMatch(html, /\[data-range-slider-handle='single'\]\{left:66%\}/)
    assertMatch(html, /\[data-range-slider-id='[^']*'\]\{left:0%;width:66%\}/)
  },
)

Deno.test(
  "RangeSlider (preact) SSR: the two-handle range shape carries both handles' real positions",
  () => {
    const html = renderToString(
      element({
        minLabel: 'Min age',
        maxLabel: 'Max age',
        min: 0,
        max: 100,
        defaultValue: [20, 80],
      }),
    )

    assertMatch(html, /\[data-range-slider-handle='min'\]\{left:20%\}/)
    assertMatch(html, /\[data-range-slider-handle='max'\]\{left:80%\}/)
    assertMatch(html, /\[data-range-slider-id='[^']*'\]\{left:20%;width:60%\}/)
  },
)

Deno.test(
  'RangeSlider (preact) SSR: an out-of-bounds/off-step defaultValue is normalized first',
  () => {
    // Same clamp+round-to-step every later committed value goes through (`render.ts`'s own
    // `normalize`) — the server-rendered position has to match what the client commits to on
    // hydration, or the "no jump" guarantee breaks for exactly this edge case.
    const html = renderToString(
      element({ label: 'Radius', min: 10, max: 100, step: 10, defaultValue: 3 }),
    )

    assertMatch(html, /\[data-range-slider-handle='single'\]\{left:0%\}/)
  },
)

// --- real DOM: hydration lands on the SAME value the server already rendered ------------------

Deno.test(
  'RangeSlider (preact): once mounted, the dynamic rule matches the SSR-rendered position exactly',
  () => {
    const { container, unmount } = mount({ label: 'Radius', min: 0, max: 100, defaultValue: 66 })

    const rule = lastDynamicRule(container, "[data-range-slider-handle='single']")
    assertEquals(rule.style.left, '66%')

    unmount()
  },
)

Deno.test(
  'RangeSlider (preact): dragging after mount still updates the dynamic rule live',
  () => {
    const { container, unmount } = mount({ label: 'Radius', min: 0, max: 100, defaultValue: 66 })
    const track = must(container.querySelector<HTMLElement>('[data-space-ui="range-slider-track"]'))
    stubRect(track, 100)
    const [handle] = handles(container)

    act(() => {
      handle.dispatchEvent(pointerEvent('pointerdown', 66))
    })
    act(() => {
      document.dispatchEvent(pointerEvent('pointermove', 20))
    })

    const rule = lastDynamicRule(container, "[data-range-slider-handle='single']")
    assertEquals(rule.style.left, '20%')

    unmount()
  },
)
