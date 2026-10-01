import './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assert, assertEquals, assertMatch, assertStringIncludes } from '@std/assert'
import { must } from './dom-test-setup.ts'
import { RangeSlider } from 'components/RangeSlider/index.ts'
import type { RangeSliderProps } from 'components/RangeSlider/index.ts'

// `RangeSlider` uses real hooks (`useState`/`useRef`/`useEffect`/`useLayoutEffect`) — mounted
// through `react-dom`'s real `createRoot`, same reasoning `radio-group.test.tsx`'s own doc
// documents for an identical shape.

function mount(props: RangeSliderProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<RangeSlider {...props} />))
  return {
    container,
    rerender: (next: RangeSliderProps) => act(() => root.render(<RangeSlider {...next} />)),
    unmount: () => act(() => root.unmount()),
  }
}

function handles(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[role="slider"]'))
}

/** See `range-slider-preact.test.tsx`'s own identical helper for the full reasoning: two CSS rules
 * share the exact same selector for one moving part (the SSR-rendered static one from
 * `initialPositionCss`, and the dynamically-inserted one hydration's own `useLayoutEffect`
 * mutates) — the LAST one in source order is always the live, dynamically-mutated rule. */
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

/** `PointerEvent` isn't bridged in `dom-test-setup.ts` (not universally available across every DOM
 * implementation this package's own tests run against — the exact reason `createRangeSlider`'s own
 * doc gives for never relying on `setPointerCapture`) — a plain `Event` with `clientX` assigned
 * directly dispatches identically for `addEventListener`/React's own delegated listener, since both
 * match purely on the event's own `type` string, never on its concrete constructor. */
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

Deno.test('RangeSlider: single value renders exactly one role="slider" handle', () => {
  const html = renderToStaticMarkup(<RangeSlider label='Search radius' value={30} />)

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

Deno.test('RangeSlider: id/className land on the root', () => {
  const html = renderToStaticMarkup(
    <RangeSlider label='Radius' value={10} id='radius' className='my-slider' />,
  )
  const rootMatch = html.match(/<div[^>]*id="radius"[^>]*class="my-slider"[^>]*>/)
  assertEquals(rootMatch !== null, true)
})

Deno.test('RangeSlider: formatValue drives aria-valuetext', () => {
  const html = renderToStaticMarkup(
    <RangeSlider label='Radius' value={15} formatValue={(v) => `${v} km`} />,
  )
  assertStringIncludes(html, 'aria-valuetext="15 km"')
})

Deno.test('RangeSlider: with no formatValue, aria-valuetext is never rendered', () => {
  const html = renderToStaticMarkup(<RangeSlider label='Radius' value={15} />)
  assertEquals(html.includes('aria-valuetext'), false)
})

// --- structure: two-handle range ----------------------------------------------------------------

Deno.test('RangeSlider: range shape renders exactly two role="slider" handles', () => {
  const html = renderToStaticMarkup(
    <RangeSlider
      minLabel='Minimum age'
      maxLabel='Maximum age'
      min={18}
      max={80}
      value={[25, 40]}
    />,
  )

  assertEquals((html.match(/role="slider"/g) ?? []).length, 2)
  assertStringIncludes(html, 'aria-label="Minimum age"')
  assertStringIncludes(html, 'aria-label="Maximum age"')
  assertStringIncludes(html, 'aria-valuenow="25"')
  assertStringIncludes(html, 'aria-valuenow="40"')
})

Deno.test("RangeSlider: the lower handle's own aria-valuemax is the upper handle's current value", () => {
  const html = renderToStaticMarkup(
    <RangeSlider minLabel='Min' maxLabel='Max' min={0} max={100} value={[20, 60]} />,
  )
  // lower handle: min=0 (global), max=60 (the other handle's current value)
  // upper handle: min=20 (the other handle's current value), max=100 (global)
  const minValuemax = html.match(/aria-label="Min"[^>]*aria-valuemin="0"[^>]*aria-valuemax="(\d+)"/)
  const maxValuemin = html.match(
    /aria-label="Max"[^>]*aria-valuemin="(\d+)"[^>]*aria-valuemax="100"/,
  )
  assertEquals(minValuemax?.[1], '60')
  assertEquals(maxValuemin?.[1], '20')
})

// --- bounds clamping -----------------------------------------------------------------------------

Deno.test('RangeSlider: a defaultValue below min clamps to min', () => {
  const html = renderToStaticMarkup(
    <RangeSlider label='Radius' min={10} max={100} defaultValue={0} />,
  )
  assertStringIncludes(html, 'aria-valuenow="10"')
})

Deno.test('RangeSlider: a defaultValue above max clamps to max', () => {
  const html = renderToStaticMarkup(
    <RangeSlider label='Radius' min={0} max={50} defaultValue={999} />,
  )
  assertStringIncludes(html, 'aria-valuenow="50"')
})

Deno.test('RangeSlider: an off-step defaultValue rounds to the nearest step', () => {
  const html = renderToStaticMarkup(
    <RangeSlider label='Radius' min={0} max={100} step={10} defaultValue={23} />,
  )
  assertStringIncludes(html, 'aria-valuenow="20"')
})

// --- keyboard: single value, real DOM -------------------------------------------------------------

Deno.test('RangeSlider: ArrowRight increments by step — real DOM', () => {
  const { container, unmount } = mount({ label: 'Radius', defaultValue: 30 })
  const [handle] = handles(container)

  keyDown(handle, 'ArrowRight')

  assertEquals(handle.getAttribute('aria-valuenow'), '31')
  unmount()
})

Deno.test('RangeSlider: ArrowLeft decrements by step — real DOM', () => {
  const { container, unmount } = mount({ label: 'Radius', defaultValue: 30 })
  const [handle] = handles(container)

  keyDown(handle, 'ArrowLeft')

  assertEquals(handle.getAttribute('aria-valuenow'), '29')
  unmount()
})

Deno.test('RangeSlider: ArrowUp/ArrowDown behave the same as Right/Left', () => {
  const { container, unmount } = mount({ label: 'Radius', defaultValue: 30 })
  const [handle] = handles(container)

  keyDown(handle, 'ArrowUp')
  assertEquals(handle.getAttribute('aria-valuenow'), '31')
  keyDown(handle, 'ArrowDown')
  keyDown(handle, 'ArrowDown')
  assertEquals(handle.getAttribute('aria-valuenow'), '29')

  unmount()
})

Deno.test('RangeSlider: Home/End jump to min/max — real DOM', () => {
  const { container, unmount } = mount({
    label: 'Radius',
    min: 0,
    max: 100,
    defaultValue: 30,
  })
  const [handle] = handles(container)

  keyDown(handle, 'End')
  assertEquals(handle.getAttribute('aria-valuenow'), '100')

  keyDown(handle, 'Home')
  assertEquals(handle.getAttribute('aria-valuenow'), '0')

  unmount()
})

Deno.test('RangeSlider: PageUp/PageDown jump by pageStep (default step * 10)', () => {
  const { container, unmount } = mount({
    label: 'Radius',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 30,
  })
  const [handle] = handles(container)

  keyDown(handle, 'PageUp')
  assertEquals(handle.getAttribute('aria-valuenow'), '40')

  keyDown(handle, 'PageDown')
  keyDown(handle, 'PageDown')
  assertEquals(handle.getAttribute('aria-valuenow'), '20')

  unmount()
})

Deno.test('RangeSlider: ArrowRight never exceeds max — real DOM', () => {
  const { container, unmount } = mount({
    label: 'Radius',
    min: 0,
    max: 10,
    defaultValue: 10,
  })
  const [handle] = handles(container)

  keyDown(handle, 'ArrowRight')

  assertEquals(handle.getAttribute('aria-valuenow'), '10')
  unmount()
})

// --- keyboard: two-handle range, handles never cross — real DOM ---------------------------------

Deno.test("RangeSlider: the lower handle's End stops at the upper handle's current value", () => {
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

Deno.test("RangeSlider: the upper handle's Home stops at the lower handle's current value", () => {
  const { container, unmount } = mount({
    minLabel: 'Min',
    maxLabel: 'Max',
    min: 0,
    max: 100,
    defaultValue: [20, 60],
  })
  const [minHandle, maxHandle] = handles(container)

  keyDown(maxHandle, 'Home')

  assertEquals(maxHandle.getAttribute('aria-valuenow'), '20')
  assertEquals(minHandle.getAttribute('aria-valuenow'), '20')
  unmount()
})

Deno.test('RangeSlider: the two handles adjust independently otherwise', () => {
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

Deno.test('RangeSlider: uncontrolled single value — onValueChange fires, self-updates', () => {
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

Deno.test('RangeSlider: controlled single value — a key notifies but never self-updates', () => {
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

Deno.test('RangeSlider: controlled — updating value re-renders, no interaction needed', () => {
  const { container, rerender, unmount } = mount({ label: 'Radius', value: 30 })

  rerender({ label: 'Radius', value: 70 })

  const [handle] = handles(container)
  assertEquals(handle.getAttribute('aria-valuenow'), '70')
  unmount()
})

Deno.test('RangeSlider: uncontrolled range — onValueChange fires with the full [lower, upper] tuple', () => {
  const calls: [number, number][] = []
  const { container, unmount } = mount({
    minLabel: 'Min',
    maxLabel: 'Max',
    defaultValue: [20, 60],
    onValueChange: (next) => calls.push(next),
  })
  const [minHandle] = handles(container)

  keyDown(minHandle, 'ArrowRight')

  assertEquals(calls, [[21, 60]])
  unmount()
})

Deno.test('RangeSlider: value takes precedence over defaultValue when both are given', () => {
  const html = renderToStaticMarkup(<RangeSlider label='Radius' value={80} defaultValue={10} />)
  assertStringIncludes(html, 'aria-valuenow="80"')
})

// --- disabled --------------------------------------------------------------------------------

Deno.test('RangeSlider: disabled sets aria-disabled and tabIndex -1, ignores keyboard', () => {
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
  assertEquals(handle.getAttribute('aria-valuenow'), '30')
  unmount()
})

// --- pointer/touch drag, real DOM -----------------------------------------------------------------

Deno.test('RangeSlider: dragging a handle updates its value via document pointermove', () => {
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

  act(() => handle.dispatchEvent(pointerEvent('pointerdown', 0)))
  act(() => document.dispatchEvent(pointerEvent('pointermove', 100)))

  assert(calls.includes(50), `expected a call with 50, got ${JSON.stringify(calls)}`)
  assertEquals(handle.getAttribute('aria-valuenow'), '50')

  act(() => document.dispatchEvent(new Event('pointerup', { bubbles: true, cancelable: true })))
  unmount()
})

Deno.test('RangeSlider: pointerup stops tracking further pointermove updates', () => {
  const { container, unmount } = mount({
    label: 'Radius',
    min: 0,
    max: 100,
    defaultValue: 0,
  })
  const track = must(container.querySelector<HTMLElement>('[data-space-ui="range-slider-track"]'))
  stubRect(track, 200)
  const [handle] = handles(container)

  act(() => handle.dispatchEvent(pointerEvent('pointerdown', 0)))
  act(() => document.dispatchEvent(pointerEvent('pointermove', 100)))
  assertEquals(handle.getAttribute('aria-valuenow'), '50')

  act(() => document.dispatchEvent(new Event('pointerup', { bubbles: true, cancelable: true })))
  act(() => document.dispatchEvent(pointerEvent('pointermove', 200)))

  // still 50 — the pointerup above already tore down the document-level listener.
  assertEquals(handle.getAttribute('aria-valuenow'), '50')
  unmount()
})

Deno.test('RangeSlider: clicking the track (not a handle) jumps the nearest handle there', () => {
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
  act(() => track.dispatchEvent(pointerEvent('pointerdown', 30)))

  const [minHandle, maxHandle] = handles(container)
  assertEquals(minHandle.getAttribute('aria-valuenow'), '15')
  assertEquals(maxHandle.getAttribute('aria-valuenow'), '90')
  unmount()
})

Deno.test(
  "RangeSlider: a handle's own pointerdown never also triggers the track's jump-to-click logic",
  () => {
    const { container, unmount } = mount({
      label: 'Radius',
      min: 0,
      max: 100,
      value: 50,
      onValueChange: () => {},
    })
    const track = must(container.querySelector<HTMLElement>('[data-space-ui="range-slider-track"]'))
    stubRect(track, 200)
    const [handle] = handles(container)

    // The handle currently sits at 50% (left: 100px in a 200px track) — a pointerdown dispatched
    // directly on the handle itself carries whatever clientX the real cursor happened to be at,
    // which is never guaranteed to equal the handle's own exact pixel center. `clientX: 5` here
    // would jump the value to ~2% if the track's own handler ran — proving it didn't.
    act(() => handle.dispatchEvent(pointerEvent('pointerdown', 5)))

    assertEquals(handle.getAttribute('aria-valuenow'), '50')
    unmount()
  },
)

// --- SSR: the handle/fill jump this suite exists for -----------------------------------------
//
// `getOrInsertDynamicRule`'s own CSSOM mutation only ever runs once a `useLayoutEffect` fires —
// `renderToStaticMarkup` never runs an effect at all, so without `initialPositionCss` (`render.ts`'s
// own doc), the server-rendered `<style>` text would carry no `left`/`width` for the fill/handles
// at all, and every first paint would show them at their unstyled default spot until the client
// hydrates.

Deno.test(
  "RangeSlider: SSR — the single handle's real position is already in the server HTML",
  () => {
    const html = renderToStaticMarkup(
      <RangeSlider label='Radius' min={0} max={100} defaultValue={66} />,
    )

    assertMatch(html, /\[data-range-slider-handle='single'\]\{left:66%\}/)
    assertMatch(html, /\[data-range-slider-id='[^']*'\]\{left:0%;width:66%\}/)
  },
)

Deno.test(
  "RangeSlider: SSR — the two-handle range shape carries both handles' real positions",
  () => {
    const html = renderToStaticMarkup(
      <RangeSlider
        minLabel='Min age'
        maxLabel='Max age'
        min={0}
        max={100}
        defaultValue={[20, 80]}
      />,
    )

    assertMatch(html, /\[data-range-slider-handle='min'\]\{left:20%\}/)
    assertMatch(html, /\[data-range-slider-handle='max'\]\{left:80%\}/)
    assertMatch(html, /\[data-range-slider-id='[^']*'\]\{left:20%;width:60%\}/)
  },
)

Deno.test('RangeSlider: SSR — an out-of-bounds/off-step defaultValue is normalized first', () => {
  // Same clamp+round-to-step every later committed value goes through (`render.ts`'s own
  // `normalize`) — the server-rendered position has to match what the client commits to on
  // hydration, or the "no jump" guarantee breaks for exactly this edge case.
  const html = renderToStaticMarkup(
    <RangeSlider label='Radius' min={10} max={100} step={10} defaultValue={3} />,
  )

  assertMatch(html, /\[data-range-slider-handle='single'\]\{left:0%\}/)
})

// --- real DOM: hydration lands on the SAME value the server already rendered ------------------

Deno.test(
  'RangeSlider: once mounted, the dynamic rule matches the SSR-rendered position exactly',
  () => {
    const { container, unmount } = mount({ label: 'Radius', min: 0, max: 100, defaultValue: 66 })

    const rule = lastDynamicRule(container, "[data-range-slider-handle='single']")
    assertEquals(rule.style.left, '66%')

    unmount()
  },
)

Deno.test('RangeSlider: dragging after mount still updates the dynamic rule live', () => {
  const { container, unmount } = mount({ label: 'Radius', min: 0, max: 100, defaultValue: 66 })
  const track = must(container.querySelector<HTMLElement>('[data-space-ui="range-slider-track"]'))
  stubRect(track, 100)
  const [handle] = handles(container)

  act(() => handle.dispatchEvent(pointerEvent('pointerdown', 66)))
  act(() => document.dispatchEvent(pointerEvent('pointermove', 20)))

  const rule = lastDynamicRule(container, "[data-range-slider-handle='single']")
  assertEquals(rule.style.left, '20%')

  unmount()
})
