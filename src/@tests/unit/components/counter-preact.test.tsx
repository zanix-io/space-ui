import { installFrameClock, installIntersectionObserverMock } from './counter-test-utils.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Counter } from 'components/Counter/index.preact.ts'

// Unlike every other Preact component in this package, `Counter` uses real hooks (`useState`/
// `useRef`/`useEffect`) — those only work when Preact itself invokes the component as part of an
// actual render pass, so this file builds a `Counter` element with `h(Counter, props)` and renders
// that, instead of calling `Counter(props)` directly as a plain function the way every other
// (hookless) `*-preact.test.tsx` file in this package does — see `icon-preact.test.tsx`'s own doc
// for why that shortcut works there.
function element(props: Parameters<typeof Counter>[0]): VNode {
  // Same widening cast `Counter/index.preact.ts`'s own `h()` call needs — see that file's doc.
  return h(Counter, props) as VNode
}

function mount(props: Parameters<typeof Counter>[0]) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    root: container.firstElementChild as HTMLElement,
    rerender: (next: Parameters<typeof Counter>[0]) =>
      act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

// --- SSR / before hydration ------------------------------------------------------------------

Deno.test('Counter (preact): SSR markup has no animated number, only the fixed aria-label', () => {
  const html = renderToString(element({ target: 100, duration: 1000, prefix: '$' }))

  assertStringIncludes(html, 'aria-label="$100"')
  assertEquals(html.includes('aria-hidden'), false)
})

Deno.test('Counter (preact): id/className land on the single root element, no wrapper', () => {
  const html = renderToString(
    element({ target: 1, duration: 1, id: 'hero-counter', className: 'big' }),
  )

  assertStringIncludes(html, '<span')
  assertStringIncludes(html, 'id="hero-counter"')
  assertStringIncludes(html, 'class="big"')
  assertStringIncludes(html, 'data-space-ui="counter"')
  assertEquals((html.match(/<span/g) ?? []).length, 1)
})

// --- before intersecting ----------------------------------------------------------------------

Deno.test('Counter (preact): before intersecting, only the fixed aria-label is present', () => {
  const io = installIntersectionObserverMock()
  const { root, unmount } = mount({ target: 100, duration: 1000 })

  assertEquals(root.getAttribute('aria-label'), '100')
  assertEquals(root.querySelector('[aria-hidden]'), null)

  unmount()
  io.restore()
})

// --- intersection starts the animation ----------------------------------------------------------

Deno.test(
  'Counter (preact): intersecting unobserves and starts exactly one animation frame',
  async () => {
    const io = installIntersectionObserverMock()
    const clock = installFrameClock()
    const { root, unmount } = mount({ target: 100, duration: 1000 })

    await act(() => io.intersect(root))

    assertEquals(io.isObserved(root), false)
    assertEquals(clock.pendingFrameCount(), 1)
    assertEquals(root.querySelector('[aria-hidden]')?.textContent, '0')

    unmount()
    clock.restore()
    io.restore()
  },
)

Deno.test(
  'Counter (preact): advances linearly and lands on the exact target, decimals included',
  async () => {
    const io = installIntersectionObserverMock()
    const clock = installFrameClock()
    const { root, unmount } = mount({ target: 4.5, duration: 100 })

    await act(() => io.intersect(root))
    await act(() => clock.advance(50))
    assertEquals(root.querySelector('[aria-hidden]')?.textContent, '2') // Math.floor(0.5 * 4.5)

    await act(() => clock.advance(50))
    assertEquals(root.querySelector('[aria-hidden]')?.textContent, '4.5') // exact target

    unmount()
    clock.restore()
    io.restore()
  },
)

// --- cleanup ------------------------------------------------------------------------------------

Deno.test(
  'Counter (preact): changing target/duration mid-animation cancels the old frame',
  async () => {
    const io = installIntersectionObserverMock()
    const clock = installFrameClock()
    const { root, rerender, unmount } = mount({ target: 100, duration: 1000 })

    await act(() => io.intersect(root))
    await act(() => clock.advance(500))
    assertEquals(root.querySelector('[aria-hidden]')?.textContent, '50')

    await rerender({ target: 200, duration: 1000 })

    // Exactly one frame pending — the old loop's frame was cancelled, not left racing a new one.
    assertEquals(clock.pendingFrameCount(), 1)
    assertEquals(root.querySelector('[aria-hidden]')?.textContent, '0')

    await act(() => clock.advance(1000))
    assertEquals(root.querySelector('[aria-hidden]')?.textContent, '200')

    unmount()
    clock.restore()
    io.restore()
  },
)

Deno.test('Counter (preact): unmounting mid-animation cancels the pending frame', async () => {
  const io = installIntersectionObserverMock()
  const clock = installFrameClock()
  const { root, unmount } = mount({ target: 100, duration: 1000 })

  await act(() => io.intersect(root))
  assertEquals(clock.pendingFrameCount(), 1)

  await unmount()

  assertEquals(clock.pendingFrameCount(), 0)

  clock.restore()
  io.restore()
})

// --- format / prefix / accessible name -----------------------------------------------------

Deno.test(
  'Counter (preact): default format is plain String — no separators, no implicit locale',
  () => {
    const html = renderToString(element({ target: 27_800, duration: 1000 }))

    assertStringIncludes(html, 'aria-label="27800"')
  },
)

Deno.test(
  'Counter (preact): format applies to both the animated value and the accessible name',
  async () => {
    const format = (value: number) => value.toLocaleString('en-US')
    const io = installIntersectionObserverMock()
    const clock = installFrameClock()
    const { root, unmount } = mount({ target: 27_800, duration: 100, prefix: '$', format })

    assertEquals(root.getAttribute('aria-label'), '$27,800')

    await act(() => io.intersect(root))
    await act(() => clock.advance(100))
    assertEquals(root.querySelector('[aria-hidden]')?.textContent, '$27,800')

    unmount()
    clock.restore()
    io.restore()
  },
)
