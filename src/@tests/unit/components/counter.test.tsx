import { installFrameClock, installIntersectionObserverMock } from './counter-test-utils.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Counter } from 'components/Counter/index.ts'

function mount(element: ReturnType<typeof Counter>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    root: container.firstElementChild as HTMLElement,
    rerender: (next: ReturnType<typeof Counter>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

// --- SSR / before hydration ------------------------------------------------------------------

Deno.test('Counter: SSR markup has no animated number, only the fixed aria-label', () => {
  const html = renderToStaticMarkup(<Counter target={100} duration={1000} prefix='$' />)

  assertStringIncludes(html, 'aria-label="$100"')
  assertEquals(html.includes('aria-hidden'), false)
})

Deno.test('Counter: id/className land on the single root element, no wrapper of any kind', () => {
  const html = renderToStaticMarkup(
    <Counter target={1} duration={1} id='hero-counter' className='big' />,
  )

  assertStringIncludes(html, '<span')
  assertStringIncludes(html, 'id="hero-counter"')
  assertStringIncludes(html, 'class="big"')
  assertStringIncludes(html, 'data-space-ui="counter"')
  assertEquals((html.match(/<span/g) ?? []).length, 1)
})

// --- before intersecting ----------------------------------------------------------------------

Deno.test('Counter: before intersecting, only the fixed aria-label is present', () => {
  const io = installIntersectionObserverMock()
  const { root, unmount } = mount(<Counter target={100} duration={1000} />)

  assertEquals(root.getAttribute('aria-label'), '100')
  assertEquals(root.querySelector('[aria-hidden]'), null)

  unmount()
  io.restore()
})

// --- no real IntersectionObserver support --------------------------------------------------

Deno.test(
  'Counter: without a real IntersectionObserver, reveals immediately instead of never revealing',
  () => {
    // deno-lint-ignore no-explicit-any
    const globals = globalThis as any
    const previous = globals.IntersectionObserver
    delete globals.IntersectionObserver
    const clock = installFrameClock()

    const { root, unmount } = mount(<Counter target={100} duration={1000} />)

    // No `intersect()` ever fired — the fallback itself must be what revealed it.
    assertEquals(root.querySelector('[aria-hidden]')?.textContent, '0')

    unmount()
    clock.restore()
    globals.IntersectionObserver = previous
  },
)

// --- intersection starts the animation ----------------------------------------------------------

Deno.test('Counter: intersecting unobserves and starts exactly one animation frame', async () => {
  const io = installIntersectionObserverMock()
  const clock = installFrameClock()
  const { root, unmount } = mount(<Counter target={100} duration={1000} />)

  await act(() => io.intersect(root))

  assertEquals(io.isObserved(root), false)
  assertEquals(clock.pendingFrameCount(), 1)
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '0')

  unmount()
  clock.restore()
  io.restore()
})

Deno.test('Counter: advances linearly and lands on the exact target', async () => {
  const io = installIntersectionObserverMock()
  const clock = installFrameClock()
  const { root, unmount } = mount(<Counter target={4.5} duration={100} />)

  await act(() => io.intersect(root))
  await act(() => clock.advance(50))
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '2') // Math.floor(0.5 * 4.5)

  await act(() => clock.advance(50))
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '4.5') // exact target, not floored

  unmount()
  clock.restore()
  io.restore()
})

// --- cleanup ------------------------------------------------------------------------------------

Deno.test('Counter: changing target/duration mid-animation cancels the old frame', async () => {
  const io = installIntersectionObserverMock()
  const clock = installFrameClock()
  const { root, rerender, unmount } = mount(<Counter target={100} duration={1000} />)

  await act(() => io.intersect(root))
  await act(() => clock.advance(500))
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '50')

  await rerender(<Counter target={200} duration={1000} />)

  // Exactly one frame pending — the old loop's frame was cancelled, not left racing a new one.
  assertEquals(clock.pendingFrameCount(), 1)
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '0')

  await act(() => clock.advance(1000))
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '200')

  unmount()
  clock.restore()
  io.restore()
})

Deno.test('Counter: unmounting mid-animation cancels the pending frame', async () => {
  const io = installIntersectionObserverMock()
  const clock = installFrameClock()
  const { root, unmount } = mount(<Counter target={100} duration={1000} />)

  await act(() => io.intersect(root))
  assertEquals(clock.pendingFrameCount(), 1)

  await unmount()

  assertEquals(clock.pendingFrameCount(), 0)

  clock.restore()
  io.restore()
})

// --- format / prefix / accessible name -----------------------------------------------------

Deno.test('Counter: default format is plain String — no separators, no implicit locale', () => {
  const html = renderToStaticMarkup(<Counter target={27_800} duration={1000} />)

  assertStringIncludes(html, 'aria-label="27800"')
})

Deno.test('Counter: format applies to both the animated value and accessible name', async () => {
  const format = (value: number) => value.toLocaleString('en-US')
  const io = installIntersectionObserverMock()
  const clock = installFrameClock()
  const { root, unmount } = mount(
    <Counter target={27_800} duration={100} prefix='$' format={format} />,
  )

  assertEquals(root.getAttribute('aria-label'), '$27,800')

  await act(() => io.intersect(root))
  await act(() => clock.advance(100))
  assertEquals(root.querySelector('[aria-hidden]')?.textContent, '$27,800')

  unmount()
  clock.restore()
  io.restore()
})
