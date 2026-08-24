import { must } from './dom-test-setup.ts'
import { installResizeObserverMock } from './showcase-test-utils.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { Showcase } from 'components/Showcase/index.preact.ts'
import type { ShowcaseProps } from 'components/Showcase/index.preact.ts'

// Unlike every hookless Preact component in this package, `Showcase` uses real hooks — built with
// `h(Showcase, props)` and rendered through Preact's own pipeline, not called as a plain function.
// See `counter-preact.test.tsx`'s own doc for the same reasoning.

function element(props: ShowcaseProps): VNode {
  return h(Showcase, props) as VNode
}

function mount(props: ShowcaseProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: ShowcaseProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function groupTexts(container: HTMLElement): string[][] {
  return Array.from(container.querySelectorAll('[data-space-ui="showcase-group"]')).map(
    (group) => Array.from(group.children).map((child) => child.textContent ?? ''),
  )
}

// --- SSR / first client paint — no window/matchMedia, no hydration mismatch -----------------

Deno.test('Showcase (preact): SSR resolves to the smallest threshold, no real measurement', () => {
  const html = renderToString(
    element({
      itemsPerSlide: { 0: 1, 768: 3 },
      children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C')],
    }),
  )

  assertStringIncludes(html, 'data-space-ui="slider"')
  assertStringIncludes(html, 'Slide 1 of 3')
})

Deno.test('Showcase (preact): the first client paint matches SSR, before any resize fires', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount({
    itemsPerSlide: { 0: 1, 768: 3 },
    children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C')],
  })

  assertStringIncludes(container.innerHTML, 'Slide 1 of 3')
  assertEquals(groupTexts(container)[0], ['A'])

  unmount()
  ro.restore()
})

// --- itemsPerSlide: fixed, omitted, over-sized ------------------------------------------------

Deno.test('Showcase (preact): without itemsPerSlide, groups by a fixed 1', () => {
  const { container, unmount } = mount({
    children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C')],
  })

  assertStringIncludes(container.innerHTML, 'Slide 1 of 3')

  unmount()
})

Deno.test('Showcase (preact): a fixed itemsPerSlide number ignores container width', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount({
    itemsPerSlide: 2,
    children: [
      h('div', {}, 'A'),
      h('div', {}, 'B'),
      h('div', {}, 'C'),
      h('div', {}, 'D'),
      h('div', {}, 'E'),
      h('div', {}, 'F'),
    ],
  })

  assertEquals(groupTexts(container), [['A', 'B']])
  assertStringIncludes(container.innerHTML, 'Slide 1 of 3')

  const wrapper = must(container.firstElementChild)
  act(() => ro.resize(wrapper, 5000))
  assertStringIncludes(container.innerHTML, 'Slide 1 of 3')

  unmount()
  ro.restore()
})

Deno.test('Showcase (preact): itemsPerSlide larger than the item count clamps to one slide', () => {
  const { container, unmount } = mount({
    itemsPerSlide: 10,
    children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C')],
  })

  assertStringIncludes(container.innerHTML, 'Slide 1 of 1')
  assertEquals(groupTexts(container), [['A', 'B', 'C']])

  unmount()
})

// --- container-width thresholds: responsive, mobile-first, both directions ------------------

Deno.test('Showcase (preact): a wider resize increases itemsPerSlide', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount({
    itemsPerSlide: { 0: 1, 480: 2, 1024: 4 },
    children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C'), h('div', {}, 'D')],
  })

  assertEquals(groupTexts(container)[0], ['A'])

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

Deno.test(
  'Showcase (preact): a narrower resize decreases itemsPerSlide (more, smaller slides)',
  () => {
    const ro = installResizeObserverMock()
    const { container, unmount } = mount({
      itemsPerSlide: { 0: 1, 480: 2, 1024: 4 },
      children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C'), h('div', {}, 'D')],
    })

    const wrapper = must(container.firstElementChild)
    act(() => ro.resize(wrapper, 2000))
    assertEquals(groupTexts(container).length, 1)

    act(() => ro.resize(wrapper, 100))
    assertStringIncludes(container.innerHTML, 'Slide 1 of 4')
    // Only the visited slide (0, "A" alone now) is actually mounted — the other 3 groups exist
    // (`itemsQuantity` is 4) but nothing has navigated to them yet.
    assertEquals(groupTexts(container), [['A']])

    const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])
    act(() => (next as HTMLButtonElement).click())
    assertEquals(groupTexts(container).find((g) => g.length && g[0] === 'B'), ['B'])
    act(() => (next as HTMLButtonElement).click())
    assertEquals(groupTexts(container).find((g) => g.length && g[0] === 'C'), ['C'])
    act(() => (next as HTMLButtonElement).click())
    assertEquals(groupTexts(container).find((g) => g.length && g[0] === 'D'), ['D'])

    unmount()
    ro.restore()
  },
)

Deno.test('Showcase (preact): the lower and upper threshold edges resolve to exact values', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount({
    itemsPerSlide: { 320: 1, 768: 2, 1440: 3 },
    children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C')],
  })

  const wrapper = must(container.firstElementChild)

  act(() => ro.resize(wrapper, 0))
  assertEquals(groupTexts(container)[0], ['A'])

  act(() => ro.resize(wrapper, 1440))
  assertEquals(groupTexts(container)[0], ['A', 'B', 'C'])

  act(() => ro.resize(wrapper, 99999))
  assertEquals(groupTexts(container)[0], ['A', 'B', 'C'])

  unmount()
  ro.restore()
})

Deno.test('Showcase (preact): a 0-width measurement resolves like no measurement', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount({
    itemsPerSlide: { 0: 1, 768: 3 },
    children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C')],
  })

  assertEquals(groupTexts(container)[0], ['A'])

  const wrapper = must(container.firstElementChild)
  act(() => ro.resize(wrapper, 0))
  assertEquals(groupTexts(container)[0], ['A'])

  unmount()
  ro.restore()
})

// --- transition through Showcase never shows Slider an invalid index ------------------------

Deno.test('Showcase (preact): a shrinking resize never shows an invalid slide', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount({
    itemsPerSlide: { 0: 1, 1024: 4 },
    slider: { showDots: true },
    children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C'), h('div', {}, 'D')],
  })

  const dots = container.querySelectorAll('[data-space-ui="slider-dots"] button')
  assertEquals(dots.length, 4)
  act(() => (dots[3] as HTMLButtonElement).click())
  assertStringIncludes(container.innerHTML, 'Slide 4 of 4')

  const wrapper = must(container.firstElementChild)
  act(() => ro.resize(wrapper, 2000))

  assertStringIncludes(container.innerHTML, 'Slide 1 of 1')
  assertEquals(groupTexts(container), [['A', 'B', 'C', 'D']])

  unmount()
  ro.restore()
})

// --- ResizeObserver lifecycle -----------------------------------------------------------------

Deno.test('Showcase (preact): observes its own wrapper on mount, disconnects on unmount', () => {
  const ro = installResizeObserverMock()
  const { container, unmount } = mount({
    itemsPerSlide: { 0: 1, 768: 3 },
    children: [h('div', {}, 'A')],
  })

  const wrapper = must(container.firstElementChild)
  assertEquals(ro.isObserved(wrapper), true)

  unmount()
  assertEquals(ro.isObserved(wrapper), false)

  ro.restore()
})

// --- id/className/data-space-ui land on the real (Slider) root, not the measurement wrapper -

Deno.test('Showcase (preact): id/className land on Slider; group wrapper is flex', () => {
  const { container, unmount } = mount({
    id: 'my-showcase',
    className: 'big',
    itemsPerSlide: 2,
    children: [h('div', {}, 'A'), h('div', {}, 'B')],
  })

  const slider = must(container.querySelector('[data-space-ui="slider"]'))
  assertEquals(slider.getAttribute('id'), 'my-showcase')
  assertEquals(slider.getAttribute('class'), 'big')

  assertEquals(container.firstElementChild?.getAttribute('id'), null)
  assertEquals(container.firstElementChild?.getAttribute('class'), null)
  assertEquals(container.firstElementChild?.getAttribute('data-space-ui'), null)

  const group = must(container.querySelector('[data-space-ui="showcase-group"]')) as HTMLElement
  assertEquals(group.style.display, 'flex')

  unmount()
})

Deno.test('Showcase (preact): the `slider` prop passes through to the underlying Slider', () => {
  const html = renderToString(
    element({
      itemsPerSlide: 2,
      slider: { loop: true, label: 'Featured' },
      children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C'), h('div', {}, 'D')],
    }),
  )

  assertStringIncludes(html, 'aria-label="Featured"')
})
