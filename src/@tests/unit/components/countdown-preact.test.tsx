import { installIntervalClock } from './countdown-test-utils.ts'
import { must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Countdown } from 'components/Countdown/index.preact.ts'
import type { CountdownProps } from 'components/Countdown/index.preact.ts'

function element(props: CountdownProps): VNode {
  return h(Countdown, props) as VNode
}

function mount(props: CountdownProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    root: container.firstElementChild as HTMLElement,
    rerender: (next: CountdownProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

Deno.test('Countdown (preact): SSR markup — data-space-ui, data-variant', () => {
  const html = renderToString(element({ target: Date.now() + 60_000 }))
  assertStringIncludes(html, 'data-space-ui="countdown"')
  assertStringIncludes(html, 'data-variant="numeric"')
})

Deno.test('Countdown (preact): ticks down as the fake clock advances', () => {
  const clock = installIntervalClock()
  const { root, unmount } = mount({ target: Date.now() + 3000 })

  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '00:03')
  act(() => clock.advance(1000))
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '00:02')

  unmount()
  clock.restore()
})

Deno.test('Countdown (preact): calls onComplete exactly once at zero', () => {
  const clock = installIntervalClock()
  let completions = 0
  const { root, unmount } = mount({ target: Date.now() + 1000, onComplete: () => completions++ })

  act(() => clock.advance(1000))
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '00:00')
  assertEquals(completions, 1)
  act(() => clock.advance(5000))
  assertEquals(completions, 1)

  unmount()
  clock.restore()
})

Deno.test('Countdown (preact): aria-live announces at whole-minute boundaries, not per second', () => {
  const clock = installIntervalClock()
  const { root, unmount } = mount({ target: Date.now() + 65_000 })

  const liveRegion = () => must(root.querySelector('[aria-live]'))
  assertEquals(liveRegion().textContent, '2 minutes remaining') // ceil(65000/60000) = 2

  act(() => clock.advance(1000))
  assertEquals(liveRegion().textContent, '2 minutes remaining') // unchanged — same minute

  act(() => clock.advance(4000))
  assertEquals(liveRegion().textContent, 'Less than a minute remaining')

  unmount()
  clock.restore()
})

// See `countdown.test.tsx`'s own identical helper doc — `stroke-dashoffset` lives in the
// `<style nonce>` element's own text content, never an inline `style` attribute.
function progressStrokeDashoffset(root: Element): number {
  const styleEl = must(root.querySelector('style'))
  const match = (styleEl.textContent ?? '').match(/stroke-dashoffset:([\d.]+)px/)
  return match ? Number.parseFloat(match[1]) : NaN
}

Deno.test('Countdown (preact): ring variant renders two circles, progress shrinks over time', () => {
  const clock = installIntervalClock()
  const { root, unmount } = mount({ target: Date.now() + 10_000, variant: 'ring' })

  const circles = () => root.querySelectorAll('circle')
  assertEquals(circles().length, 2)
  for (const circle of circles()) {
    assertEquals(circle.getAttribute('style'), null)
  }
  assertEquals(progressStrokeDashoffset(root), 0)

  act(() => clock.advance(5000))
  assertEquals(progressStrokeDashoffset(root) > 0, true)

  unmount()
  clock.restore()
})
