import { installIntervalClock } from './countdown-test-utils.ts'
import { must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Countdown } from 'components/Countdown/index.ts'

function mount(element: ReturnType<typeof Countdown>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    root: container.firstElementChild as HTMLElement,
    rerender: (next: ReturnType<typeof Countdown>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

// --- SSR / before mount ----------------------------------------------------------------------

Deno.test('Countdown: SSR markup — data-space-ui, data-variant, no value yet', () => {
  const html = renderToStaticMarkup(<Countdown target={Date.now() + 60_000} />)

  assertStringIncludes(html, 'data-space-ui="countdown"')
  assertStringIncludes(html, 'data-variant="numeric"')
  assertEquals(html.includes('aria-live'), false)
})

Deno.test('Countdown: id/className land on the root element', () => {
  const html = renderToStaticMarkup(
    <Countdown target={Date.now() + 1000} id='sale-timer' className='big' />,
  )
  assertStringIncludes(html, 'id="sale-timer"')
  assertStringIncludes(html, 'class="big"')
})

// --- real DOM: wall-clock ticking ------------------------------------------------------------

Deno.test('Countdown: shows a real formatted value immediately after mount', () => {
  const clock = installIntervalClock()
  const { root, unmount } = mount(<Countdown target={Date.now() + 65_000} />)

  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '01:05')

  unmount()
  clock.restore()
})

Deno.test('Countdown: ticks down as the fake clock advances, anchored to Date.now, not decremented', () => {
  const clock = installIntervalClock()
  const { root, unmount } = mount(<Countdown target={Date.now() + 3000} />)

  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '00:03')
  act(() => clock.advance(1000))
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '00:02')
  act(() => clock.advance(1000))
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '00:01')

  unmount()
  clock.restore()
})

Deno.test('Countdown: a large clock jump (simulated tab throttling) snaps straight to the correct value', () => {
  const clock = installIntervalClock()
  const { root, unmount } = mount(<Countdown target={Date.now() + 10_000} />)

  // One single big jump, as if the tab was backgrounded and only resumed once — a naive
  // decrement-by-interval-count implementation would under-shoot this.
  act(() => clock.advance(7000))
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '00:03')

  unmount()
  clock.restore()
})

Deno.test('Countdown: reaches exactly 00:00 and calls onComplete exactly once', () => {
  const clock = installIntervalClock()
  let completions = 0
  const { root, unmount } = mount(
    <Countdown target={Date.now() + 1000} onComplete={() => completions++} />,
  )

  act(() => clock.advance(500))
  assertEquals(completions, 0)
  act(() => clock.advance(1000))
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '00:00')
  assertEquals(completions, 1)

  // Further advances (or re-renders) never call it again.
  act(() => clock.advance(5000))
  assertEquals(completions, 1)

  unmount()
  clock.restore()
})

Deno.test('Countdown: a target already in the past completes immediately, exactly once', () => {
  const clock = installIntervalClock()
  let completions = 0
  const { root, unmount } = mount(
    <Countdown target={Date.now() - 1000} onComplete={() => completions++} />,
  )

  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '00:00')
  assertEquals(completions, 1)

  unmount()
  clock.restore()
})

Deno.test('Countdown: a fresh, later target after completion can complete again', () => {
  const clock = installIntervalClock()
  let completions = 0
  const { unmount, rerender } = mount(
    <Countdown target={Date.now() + 1000} onComplete={() => completions++} />,
  )

  act(() => clock.advance(1000))
  assertEquals(completions, 1)

  rerender(<Countdown target={Date.now() + 1000} onComplete={() => completions++} />)
  act(() => clock.advance(1000))
  assertEquals(completions, 2)

  unmount()
  clock.restore()
})

// --- aria-live: throttled, not per-second ---------------------------------------------------

Deno.test('Countdown: announces on mount, then only at whole-minute boundaries, plus once at zero', () => {
  const clock = installIntervalClock()
  const { root, unmount } = mount(<Countdown target={Date.now() + 125_000} />)

  const liveRegion = () => must(root.querySelector('[aria-live]'))
  assertEquals(liveRegion().textContent, '3 minutes remaining') // ceil(125000/60000) = 3

  act(() => clock.advance(1000)) // 124s left — still minute 3, no re-announcement expected
  const textAfterOneSecond = liveRegion().textContent
  assertEquals(textAfterOneSecond, '3 minutes remaining')

  act(() => clock.advance(64_000)) // 60s left — crosses into minute 1 boundary territory
  assertEquals(liveRegion().textContent, 'Less than a minute remaining')

  act(() => clock.advance(60_000)) // reaches zero
  assertEquals(liveRegion().textContent, "Time's up")

  unmount()
  clock.restore()
})

Deno.test('Countdown: getAnnouncement overrides the default English strings', () => {
  const clock = installIntervalClock()
  const { root, unmount } = mount(
    <Countdown
      target={Date.now() + 1000}
      getAnnouncement={(ms) => ms <= 0 ? 'Listo' : 'Esperando'}
    />,
  )

  assertEquals(root.querySelector('[aria-live]')?.textContent, 'Esperando')
  act(() => clock.advance(1000))
  assertEquals(root.querySelector('[aria-live]')?.textContent, 'Listo')

  unmount()
  clock.restore()
})

// --- format override ------------------------------------------------------------------------

Deno.test('Countdown: format overrides the default mm:ss text', () => {
  const clock = installIntervalClock()
  const { root, unmount } = mount(
    <Countdown target={Date.now() + 9000} format={(ms) => `${Math.ceil(ms / 1000)}s`} />,
  )

  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '9s')

  unmount()
  clock.restore()
})

// --- ring variant -----------------------------------------------------------------------------

Deno.test('Countdown: ring variant renders an SVG with two circles, data-variant="ring"', () => {
  const clock = installIntervalClock()
  const { root, unmount } = mount(<Countdown target={Date.now() + 10_000} variant='ring' />)

  assertEquals(root.getAttribute('data-variant'), 'ring')
  const svg = must(root.querySelector('svg'))
  assertEquals(svg.querySelectorAll('circle').length, 2)

  unmount()
  clock.restore()
})

// `stroke-dashoffset`/`transition` live in the `<style nonce>` element's own text content, never an
// inline `style` attribute — a real, confirmed CSP violation the previous `style`-object version had
// under a nonce-based `style-src`; see `Countdown/render.ts`'s own doc, "every stroke declaration
// lives in a self-rendered `<style nonce={nonce}>` element", for the full reasoning. This component
// re-renders the whole CSS text fresh on every tick — read it off the `<style>` element's own
// `textContent`, never `circle.style.strokeDashoffset` (there is no such inline style anymore).
function progressStrokeDashoffset(root: Element): number {
  const styleEl = must(root.querySelector('style'))
  const match = (styleEl.textContent ?? '').match(/stroke-dashoffset:([\d.]+)px/)
  return match ? Number.parseFloat(match[1]) : NaN
}

function progressTransition(root: Element): string | null {
  const styleEl = must(root.querySelector('style'))
  const match = (styleEl.textContent ?? '').match(/transition:([^;}]+)[;}]/)
  return match ? match[1] : null
}

Deno.test('Countdown: ring stroke-dashoffset shrinks toward zero as time elapses', () => {
  const clock = installIntervalClock()
  const { root, unmount } = mount(<Countdown target={Date.now() + 10_000} variant='ring' />)

  for (const circle of root.querySelectorAll('circle')) {
    assertEquals(circle.getAttribute('style'), null)
  }
  assertEquals(progressStrokeDashoffset(root), 0) // full time remaining → full ring → zero offset

  act(() => clock.advance(5000))
  const halfwayOffset = progressStrokeDashoffset(root)
  assertEquals(halfwayOffset > 0, true)

  unmount()
  clock.restore()
})

Deno.test('Countdown: prefers-reduced-motion disables the ring transition, value still updates', () => {
  // deno-lint-ignore no-explicit-any
  const globals = globalThis as any
  const previousMatchMedia = globals.matchMedia
  globals.matchMedia = () => ({ matches: true })
  const clock = installIntervalClock()

  const { root, unmount } = mount(<Countdown target={Date.now() + 10_000} variant='ring' />)

  assertEquals(progressTransition(root), 'none')

  act(() => clock.advance(1000))
  // `span[aria-hidden]`, not the bare `[aria-hidden]` attribute selector used elsewhere in this
  // file — the ring variant's own `<svg aria-hidden="true">` wrapper would otherwise match FIRST
  // (it comes before the value `<span>` in DOM order), and an SVG's own `textContent` is always
  // empty, which previously made this assertion pass for the wrong element entirely.
  assertEquals(root.querySelector('span[aria-hidden]')?.textContent, '00:09')

  unmount()
  clock.restore()
  globals.matchMedia = previousMatchMedia
})

// --- cleanup ------------------------------------------------------------------------------------

Deno.test('Countdown: unmounting stops the interval (no further onComplete calls possible)', () => {
  const clock = installIntervalClock()
  let completions = 0
  const { unmount } = mount(
    <Countdown target={Date.now() + 1000} onComplete={() => completions++} />,
  )

  unmount()
  act(() => clock.advance(5000))
  assertEquals(completions, 0)

  clock.restore()
})

Deno.test('Countdown: nonce lands on the ring/live-region <style> elements, none on ring circles', () => {
  const html = renderToStaticMarkup(
    <Countdown target={Date.now() + 10_000} variant='ring' nonce='abc123' />,
  )

  assertStringIncludes(html, '<style nonce="abc123">')
  assertEquals(html.includes(' style='), false)
})
