import { must } from './dom-test-setup.ts'
import { installResizeObserverMock } from './showcase-test-utils.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Showcase } from 'components/Showcase/index.ts'

function mount(element: ReturnType<typeof Showcase>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Showcase>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

function groupTexts(container: HTMLElement): string[][] {
  return Array.from(container.querySelectorAll('[data-space-ui="showcase-group"]')).map(
    (group) => Array.from(group.children).map((child) => child.textContent ?? ''),
  )
}

// --- SSR / first client paint — no window/matchMedia, no hydration mismatch -----------------

Deno.test('Showcase: SSR — no real measurement exists, resolves to the smallest threshold', () => {
  const html = renderToStaticMarkup(
    <Showcase itemsPerSlide={{ 0: 1, 768: 3 }}>
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </Showcase>,
  )

  assertStringIncludes(html, 'data-space-ui="slider"')
  assertStringIncludes(html, 'Slide 1 of 3') // grouped by 1 — the smallest threshold's own value
})

Deno.test('Showcase: the first client paint matches SSR exactly, before any resize fires', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount(
    <Showcase itemsPerSlide={{ 0: 1, 768: 3 }}>
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </Showcase>,
  )

  // No `ro.resize(...)` call yet — this is the exact state SSR itself would have produced.
  assertStringIncludes(container.innerHTML, 'Slide 1 of 3')
  assertEquals(groupTexts(container)[0], ['A'])

  unmount()
  ro.restore()
})

// --- itemsPerSlide: fixed, omitted, over-sized ------------------------------------------------

Deno.test('Showcase: without itemsPerSlide, groups by a fixed 1 (no responsiveness at all)', () => {
  const { container, unmount } = mount(
    <Showcase>
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </Showcase>,
  )

  assertStringIncludes(container.innerHTML, 'Slide 1 of 3')

  unmount()
})

Deno.test('Showcase: a fixed itemsPerSlide number ignores container width entirely', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount(
    <Showcase itemsPerSlide={2}>
      <div>A</div>
      <div>B</div>
      <div>C</div>
      <div>D</div>
      <div>E</div>
      <div>F</div>
    </Showcase>,
  )

  assertEquals(groupTexts(container), [['A', 'B']])
  assertStringIncludes(container.innerHTML, 'Slide 1 of 3')

  const wrapper = must(container.firstElementChild)
  act(() => ro.resize(wrapper, 5000))
  assertStringIncludes(container.innerHTML, 'Slide 1 of 3') // unchanged — fixed, not responsive

  unmount()
  ro.restore()
})

Deno.test('Showcase: itemsPerSlide larger than the item count clamps to one slide', () => {
  const { container, unmount } = mount(
    <Showcase itemsPerSlide={10}>
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </Showcase>,
  )

  assertStringIncludes(container.innerHTML, 'Slide 1 of 1')
  assertEquals(groupTexts(container), [['A', 'B', 'C']])

  unmount()
})

// --- container-width thresholds: responsive, mobile-first, both directions ------------------

Deno.test('Showcase: a wider resize increases itemsPerSlide (fewer, bigger slides)', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount(
    <Showcase itemsPerSlide={{ 0: 1, 480: 2, 1024: 4 }}>
      <div>A</div>
      <div>B</div>
      <div>C</div>
      <div>D</div>
    </Showcase>,
  )

  assertEquals(groupTexts(container)[0], ['A']) // no measurement yet — smallest threshold

  const wrapper = must(container.firstElementChild)
  act(() => ro.resize(wrapper, 500))
  assertEquals(groupTexts(container)[0], ['A', 'B'])
  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

  act(() => ro.resize(wrapper, 2000))
  assertEquals(groupTexts(container)[0], ['A', 'B', 'C', 'D'])
  assertStringIncludes(container.innerHTML, 'Slide 1 of 1')

  unmount()
  ro.restore()
})

Deno.test('Showcase: a narrower resize decreases itemsPerSlide (more, smaller slides)', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount(
    <Showcase itemsPerSlide={{ 0: 1, 480: 2, 1024: 4 }}>
      <div>A</div>
      <div>B</div>
      <div>C</div>
      <div>D</div>
    </Showcase>,
  )

  const wrapper = must(container.firstElementChild)
  act(() => ro.resize(wrapper, 2000))
  assertEquals(groupTexts(container).length, 1)

  act(() => ro.resize(wrapper, 100))
  assertStringIncludes(container.innerHTML, 'Slide 1 of 4')
  // `Slider` only ever mounts a VISITED slide — group 0 ("A" alone, now that groupSize dropped
  // to 1) is the only one rendered so far; the other 3 groups exist (`itemsQuantity` is 4) but
  // nothing has navigated to them yet. Navigating to each confirms they're really there, one item
  // per slide, in order.
  assertEquals(groupTexts(container), [['A']])

  const dots = container.querySelectorAll('[data-space-ui="slider-dots"] button')
  assertEquals(dots.length, 0) // no `slider` prop given — arrows, not dots, in this test
  const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])
  act(() => (next as HTMLButtonElement).click())
  assertEquals(groupTexts(container).find((g) => g.length && g[0] === 'B'), ['B'])
  act(() => (next as HTMLButtonElement).click())
  assertEquals(groupTexts(container).find((g) => g.length && g[0] === 'C'), ['C'])
  act(() => (next as HTMLButtonElement).click())
  assertEquals(groupTexts(container).find((g) => g.length && g[0] === 'D'), ['D'])

  unmount()
  ro.restore()
})

Deno.test('Showcase: the lower and upper threshold edges resolve to their own exact values', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount(
    <Showcase itemsPerSlide={{ 320: 1, 768: 2, 1440: 3 }}>
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </Showcase>,
  )

  const wrapper = must(container.firstElementChild)

  // Below every threshold — the smallest (320) still applies, same as `null`/no measurement.
  act(() => ro.resize(wrapper, 0))
  assertEquals(groupTexts(container)[0], ['A'])

  // Exactly at the largest threshold — inclusive.
  act(() => ro.resize(wrapper, 1440))
  assertEquals(groupTexts(container)[0], ['A', 'B', 'C'])

  // Far beyond the largest threshold — still the largest's own value, nothing above it to win.
  act(() => ro.resize(wrapper, 99999))
  assertEquals(groupTexts(container)[0], ['A', 'B', 'C'])

  unmount()
  ro.restore()
})

Deno.test('Showcase: a container measured at exactly 0 resolves like no measurement', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount(
    <Showcase itemsPerSlide={{ 0: 1, 768: 3 }}>
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </Showcase>,
  )

  assertEquals(groupTexts(container)[0], ['A']) // before any measurement

  const wrapper = must(container.firstElementChild)
  act(() => ro.resize(wrapper, 0))
  assertEquals(groupTexts(container)[0], ['A']) // a real 0-width measurement, same result

  unmount()
  ro.restore()
})

// --- transition through Showcase never shows Slider an invalid index ------------------------

Deno.test('Showcase: a resize that reduces the slide count never shows an invalid slide', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount(
    <Showcase itemsPerSlide={{ 0: 1, 1024: 4 }} slider={{ showDots: true }}>
      <div>A</div>
      <div>B</div>
      <div>C</div>
      <div>D</div>
    </Showcase>,
  )

  // Narrow: 4 slides (1 item each). Navigate to the last one.
  const dots = container.querySelectorAll('[data-space-ui="slider-dots"] button')
  assertEquals(dots.length, 4)
  act(() => (dots[3] as HTMLButtonElement).click())
  assertStringIncludes(container.innerHTML, 'Slide 4 of 4')

  // Widen — regroups down to a single slide (all 4 items together). The old index (3) is now
  // invalid; `Slider`'s own fix (see `Slider/index.ts`) clamps it, and no invalid slide is ever
  // rendered — not "Showcase" reset via a `key`/remount, `Slider`'s own corrected invariant.
  const wrapper = must(container.firstElementChild)
  act(() => ro.resize(wrapper, 2000))

  assertStringIncludes(container.innerHTML, 'Slide 1 of 1')
  assertEquals(groupTexts(container), [['A', 'B', 'C', 'D']])

  unmount()
  ro.restore()
})

// --- ResizeObserver lifecycle -----------------------------------------------------------------

Deno.test('Showcase: observes its own measurement wrapper on mount, disconnects on unmount', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount(
    <Showcase itemsPerSlide={{ 0: 1, 768: 3 }}>
      <div>A</div>
    </Showcase>,
  )

  const wrapper = must(container.firstElementChild)
  assertEquals(ro.isObserved(wrapper), true)

  unmount()
  assertEquals(ro.isObserved(wrapper), false)

  ro.restore()
})

// --- id/className/data-space-ui land on the real (Slider) root, not the measurement wrapper -

Deno.test('Showcase: id/className land on the real Slider root; group wrapper is flex', () => {
  const { container, unmount } = mount(
    <Showcase id='my-showcase' className='big' itemsPerSlide={2}>
      <div>A</div>
      <div>B</div>
    </Showcase>,
  )

  const slider = must(container.querySelector('[data-space-ui="slider"]'))
  assertEquals(slider.getAttribute('id'), 'my-showcase')
  assertEquals(slider.getAttribute('class'), 'big')

  // The private measurement wrapper itself carries none of this.
  assertEquals(container.firstElementChild?.getAttribute('id'), null)
  assertEquals(container.firstElementChild?.getAttribute('class'), null)
  assertEquals(container.firstElementChild?.getAttribute('data-space-ui'), null)

  const group = must(container.querySelector('[data-space-ui="showcase-group"]')) as HTMLElement
  assertEquals(group.style.display, 'flex')

  unmount()
})

Deno.test('Showcase: the `slider` prop passes through to the underlying Slider unchanged', () => {
  const html = renderToStaticMarkup(
    <Showcase itemsPerSlide={2} slider={{ loop: true, label: 'Featured' }}>
      <div>A</div>
      <div>B</div>
      <div>C</div>
      <div>D</div>
    </Showcase>,
  )

  assertStringIncludes(html, 'aria-label="Featured"')
})
