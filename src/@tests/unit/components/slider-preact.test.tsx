import { installTimerMock, must } from './dom-test-setup.ts'
import { h, render as renderDOM } from 'preact'
import type { VNode } from 'preact'
import { act } from 'preact/test-utils'
import { render as renderToString } from 'preact-render-to-string'
import { assertEquals, assertStrictEquals, assertStringIncludes } from '@std/assert'
import { Slider } from 'components/Slider/index.preact.ts'
import type { SliderProps } from 'components/Slider/index.preact.ts'

// Unlike every hookless Preact component in this package, `Slider` uses real hooks — built with
// `h(Slider, props)` and rendered through Preact's own pipeline, not called as a plain function.
// See `counter-preact.test.tsx`'s own doc for the same reasoning.

function element(props: SliderProps): VNode {
  return h(Slider, props) as VNode
}

function mount(props: SliderProps) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  act(() => renderDOM(element(props), container))
  return {
    container,
    rerender: (next: SliderProps) => act(() => renderDOM(element(next), container)),
    unmount: () => act(() => renderDOM(null, container)),
  }
}

function countingSlides(counts: number[]): VNode[] {
  return counts.map((_, i) => {
    function Slide() {
      counts[i]++
      return h('div', {}, `Slide ${i}`)
    }
    return h(Slide, { key: i }) as VNode
  })
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Slider (preact): SSR markup — Carousel region, never role="slider"', () => {
  const html = renderToString(element({ children: [h('div', {}, 'A'), h('div', {}, 'B')] }))

  assertStringIncludes(html, 'data-space-ui="slider"')
  assertStringIncludes(html, 'role="region"')
  assertStringIncludes(html, 'aria-roledescription="carousel"')
  assertStringIncludes(html, 'aria-label="Carousel"')
  assertEquals(html.includes('role="slider"'), false)
})

Deno.test('Slider (preact): id/className land on the root region', () => {
  const html = renderToString(
    element({ id: 'hero', className: 'big', children: [h('div', {}, 'A')] }),
  )

  assertStringIncludes(html, 'id="hero"')
  assertStringIncludes(html, 'class="big"')
})

Deno.test('Slider (preact): only the first slide is mounted initially', () => {
  const html = renderToString(
    element({ children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C')] }),
  )

  assertStringIncludes(html, 'Slide 1 of 3')
  assertStringIncludes(html, '>A<')
  assertEquals(html.includes('>B<'), false)
  assertEquals(html.includes('>C<'), false)
})

Deno.test('Slider (preact): a single child never renders dots/arrows/pause', () => {
  const html = renderToString(element({ children: [h('div', {}, 'Only')] }))

  assertEquals(html.includes('data-space-ui="slider-dots"'), false)
  assertEquals(html.includes('data-space-ui="slider-arrows"'), false)
})

// --- arrows / dots ---------------------------------------------------------------------------

Deno.test('Slider (preact): arrows by default, clicking Next advances, real DOM', () => {
  const { container, unmount } = mount({ children: [h('div', {}, 'A'), h('div', {}, 'B')] })

  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')
  const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])

  act(() => (next as HTMLButtonElement).click())

  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

  unmount()
})

Deno.test('Slider (preact): without loop, Next at the last slide stays there', () => {
  const { container, unmount } = mount({ children: [h('div', {}, 'A'), h('div', {}, 'B')] })

  const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])
  act(() => (next as HTMLButtonElement).click())
  act(() => (next as HTMLButtonElement).click())

  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

  unmount()
})

Deno.test('Slider (preact): with loop, Next at the last slide wraps to the first', () => {
  const { container, unmount } = mount({
    loop: true,
    children: [h('div', {}, 'A'), h('div', {}, 'B')],
  })

  const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])
  act(() => (next as HTMLButtonElement).click())
  act(() => (next as HTMLButtonElement).click())

  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

  unmount()
})

Deno.test('Slider (preact): with loop, Prev at the first slide wraps to the last', () => {
  const { container, unmount } = mount({
    loop: true,
    children: [h('div', {}, 'A'), h('div', {}, 'B')],
  })

  const prev = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[0])
  act(() => (prev as HTMLButtonElement).click())

  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

  unmount()
})

Deno.test(
  'Slider (preact): dots get individual accessible names and aria-current on the active one',
  () => {
    const html = renderToString(
      element({
        showDots: true,
        children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C')],
      }),
    )

    assertStringIncludes(html, 'aria-label="Go to slide 1"')
    assertStringIncludes(html, 'aria-label="Go to slide 2"')
    assertStringIncludes(html, 'aria-label="Go to slide 3"')
    assertStringIncludes(html, 'aria-current="true"')
    assertEquals((html.match(/aria-current/g) ?? []).length, 1)
  },
)

Deno.test('Slider (preact): clicking a dot jumps directly to that slide', () => {
  const { container, unmount } = mount({
    showDots: true,
    children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C')],
  })

  const dots = container.querySelectorAll('[data-space-ui="slider-dots"] button')
  act(() => (dots[2] as HTMLButtonElement).click())

  assertStringIncludes(container.innerHTML, 'Slide 3 of 3')
  assertEquals(dots[2].getAttribute('aria-current'), 'true')

  unmount()
})

// --- keyboard --------------------------------------------------------------------------------

Deno.test('Slider (preact): ArrowRight/ArrowLeft on the focused region change the slide', () => {
  const { container, unmount } = mount({ children: [h('div', {}, 'A'), h('div', {}, 'B')] })

  const region = must(container.querySelector('[data-space-ui="slider"]'))

  act(() => {
    region.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    )
  })
  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

  act(() => {
    region.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
    )
  })
  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

  unmount()
})

// --- never remount while cached / cap at 10 ---------------------------------------------------

Deno.test('Slider (preact): a visited slide never re-renders while it stays cached', () => {
  const counts = [0, 0, 0]
  const { container, unmount } = mount({ children: countingSlides(counts) })

  const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])
  act(() => (next as HTMLButtonElement).click())
  act(() => (next as HTMLButtonElement).click())

  const prev = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[0])
  act(() => (prev as HTMLButtonElement).click())
  act(() => (prev as HTMLButtonElement).click())

  assertEquals(counts, [1, 1, 1])

  unmount()
})

Deno.test(
  'Slider (preact): caps mounted slides at 10 — revisiting an evicted one remounts it',
  () => {
    const counts = Array.from({ length: 12 }, () => 0)
    const { container, unmount } = mount({ children: countingSlides(counts) })

    const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])
    for (let i = 0; i < 10; i++) act(() => (next as HTMLButtonElement).click())

    assertEquals(container.querySelectorAll('[data-space-ui="slider-item"]').length, 10)
    assertEquals(counts[0], 1)

    const prev = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[0])
    for (let i = 0; i < 10; i++) act(() => (prev as HTMLButtonElement).click())

    assertEquals(counts[0], 2)

    unmount()
  },
)

// --- autoplay ----------------------------------------------------------------------------------

Deno.test('Slider (preact): autoPlayInterval advances after the interval elapses', () => {
  const clock = installTimerMock()
  const { container, unmount } = mount({
    autoPlayInterval: 1000,
    children: [h('div', {}, 'A'), h('div', {}, 'B')],
  })

  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')
  act(() => clock.advance(1000))
  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

  unmount()
  clock.restore()
})

Deno.test(
  'Slider (preact): autoplay without loop stops at the last slide (timer self-terminates)',
  () => {
    const clock = installTimerMock()
    const { container, unmount } = mount({
      autoPlayInterval: 1000,
      children: [h('div', {}, 'A'), h('div', {}, 'B')],
    })

    act(() => clock.advance(1000))
    assertStringIncludes(container.innerHTML, 'Slide 2 of 2')
    assertEquals(clock.pendingCount(), 0)

    unmount()
    clock.restore()
  },
)

Deno.test('Slider (preact): autoplay with loop keeps advancing past the last slide', () => {
  const clock = installTimerMock()
  const { container, unmount } = mount({
    autoPlayInterval: 1000,
    loop: true,
    children: [h('div', {}, 'A'), h('div', {}, 'B')],
  })

  act(() => clock.advance(1000))
  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')
  act(() => clock.advance(1000))
  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

  unmount()
  clock.restore()
})

Deno.test('Slider (preact): without autoPlayInterval, no Pause/Play control is rendered', () => {
  const html = renderToString(element({ children: [h('div', {}, 'A'), h('div', {}, 'B')] }))

  assertEquals(html.includes('Pause slideshow'), false)
  assertEquals(html.includes('Play slideshow'), false)
})

Deno.test(
  'Slider (preact): the Pause button stops autoplay and changes its own accessible name',
  () => {
    const clock = installTimerMock()
    const { container, unmount } = mount({
      autoPlayInterval: 1000,
      children: [h('div', {}, 'A'), h('div', {}, 'B')],
    })

    const pauseButton = must(
      Array.from(container.querySelectorAll('button')).find((b) =>
        b.getAttribute('aria-label') === 'Pause slideshow'
      ),
    )
    act(() => pauseButton.click())
    assertEquals(pauseButton.getAttribute('aria-label'), 'Play slideshow')

    act(() => clock.advance(2000))
    assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

    unmount()
    clock.restore()
  },
)

Deno.test('Slider (preact): hovering pauses autoplay, leaving resumes it', () => {
  const clock = installTimerMock()
  const { container, unmount } = mount({
    autoPlayInterval: 1000,
    children: [h('div', {}, 'A'), h('div', {}, 'B')],
  })

  // Preact binds onMouseEnter/onMouseLeave directly to the native (non-bubbling) mouseenter/
  // mouseleave — confirmed different from React in the Menu audit; see menu-preact.test.tsx.
  const region = must(container.querySelector('[data-space-ui="slider"]'))
  act(() => {
    region.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
  })
  act(() => clock.advance(1000))
  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

  act(() => {
    region.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
  })
  act(() => clock.advance(1000))
  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

  unmount()
  clock.restore()
})

Deno.test('Slider (preact): manual pause is never overridden by mouseleave', () => {
  const clock = installTimerMock()
  const { container, unmount } = mount({
    autoPlayInterval: 1000,
    children: [h('div', {}, 'A'), h('div', {}, 'B')],
  })

  const pauseButton = must(
    Array.from(container.querySelectorAll('button')).find((b) =>
      b.getAttribute('aria-label') === 'Pause slideshow'
    ),
  )
  act(() => pauseButton.click())

  const region = must(container.querySelector('[data-space-ui="slider"]'))
  act(() => {
    region.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
  })
  act(() => {
    region.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
  })
  act(() => clock.advance(2000))

  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

  unmount()
  clock.restore()
})

// --- aria-live -----------------------------------------------------------------------------

Deno.test('Slider (preact): aria-live is "off" while autoplay actively advances', () => {
  const html = renderToString(
    element({ autoPlayInterval: 1000, children: [h('div', {}, 'A'), h('div', {}, 'B')] }),
  )

  assertStringIncludes(html, 'aria-live="off"')
})

Deno.test('Slider (preact): aria-live is "polite" without autoplay', () => {
  const html = renderToString(element({ children: [h('div', {}, 'A'), h('div', {}, 'B')] }))

  assertStringIncludes(html, 'aria-live="polite"')
})

// --- a shrinking `children` array never leaves `currentIndex` invalid -----------------------
// See `slider.test.tsx`'s own copy of these tests / `index.ts`'s own doc for the full contract —
// general robustness for ANY consumer with dynamic `children`, not `Showcase`-specific.

Deno.test('Slider (preact): children shrinking to one slide clamps currentIndex, no crash', () => {
  const { container, rerender, unmount } = mount({
    showDots: true,
    children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C')],
  })

  const dots = container.querySelectorAll('[data-space-ui="slider-dots"] button')
  act(() => (dots[2] as HTMLButtonElement).click())
  assertStringIncludes(container.innerHTML, 'Slide 3 of 3')

  rerender({ showDots: true, children: [h('div', {}, 'Only')] })

  assertStringIncludes(container.innerHTML, 'Slide 1 of 1')
  assertEquals(container.querySelector('[data-active="true"]')?.textContent, 'Only')

  unmount()
})

Deno.test(
  'Slider (preact): children shrinking preserves position — the new last slide, not slide 0',
  () => {
    const { container, rerender, unmount } = mount({
      showDots: true,
      children: [h('div', {}, 'A'), h('div', {}, 'B'), h('div', {}, 'C')],
    })

    const dots = container.querySelectorAll('[data-space-ui="slider-dots"] button')
    act(() => (dots[2] as HTMLButtonElement).click()) // on C, the last of 3

    rerender({ showDots: true, children: [h('div', {}, 'A'), h('div', {}, 'B')] })

    assertStringIncludes(container.innerHTML, 'Slide 2 of 2')
    assertEquals(container.querySelector('[data-active="true"]')?.textContent, 'B')

    unmount()
  },
)

Deno.test('Slider (preact): children shrinking to zero renders no crash, no arrows/dots', () => {
  const { container, rerender, unmount } = mount({
    showDots: true,
    children: [h('div', {}, 'A'), h('div', {}, 'B')],
  })

  rerender({ showDots: true, children: [] })

  assertEquals(container.querySelector('[data-space-ui="slider-dots"]'), null)
  assertEquals(container.querySelector('[data-space-ui="slider-arrows"]'), null)
  assertEquals(container.querySelector('[data-space-ui="slider-item"]'), null)

  unmount()
})

Deno.test(
  'Slider (preact): children undefined (never passed at all) renders no crash, no arrows/dots',
  () => {
    // See `slider.test.tsx`'s own identical test for why `undefined` is a distinct, untested
    // shape versus an explicit `[]`.
    const { container, unmount } = mount({ showDots: true, children: undefined })

    assertEquals(container.querySelector('[data-space-ui="slider-dots"]'), null)
    assertEquals(container.querySelector('[data-space-ui="slider-arrows"]'), null)
    assertEquals(container.querySelector('[data-space-ui="slider-item"]'), null)

    unmount()
  },
)

Deno.test(
  'Slider (preact): pruning stale visited indices after a shrink prevents wasting cache budget',
  () => {
    const counts = Array.from({ length: 12 }, () => 0)
    const allSlides = countingSlides(counts)

    const { container, rerender, unmount } = mount({ showDots: true, children: allSlides })

    for (let i = 0; i < 10; i++) {
      const dot = must(container.querySelectorAll('[data-space-ui="slider-dots"] button')[i])
      act(() => (dot as HTMLButtonElement).click())
    }
    assertEquals(counts.slice(0, 10), Array(10).fill(1))

    rerender({ showDots: true, children: allSlides.slice(0, 3) })
    rerender({ showDots: true, children: allSlides })

    const dotsAfterGrow = container.querySelectorAll('[data-space-ui="slider-dots"] button')
    act(() => (dotsAfterGrow[10] as HTMLButtonElement).click())

    assertEquals(counts[0], 1)

    unmount()
  },
)

Deno.test(
  'Slider (preact): a consumer that regroups children live (Showcase-shaped) preserves item DOM identity across a shrink',
  () => {
    const items = ['A', 'B', 'C', 'D', 'E', 'F']
    function chunk(groupSize: number) {
      const groups: string[][] = []
      for (let i = 0; i < items.length; i += groupSize) {
        groups.push(items.slice(i, i + groupSize))
      }
      return groups
    }

    function makeChildren(groupSize: number): VNode[] {
      return chunk(groupSize).map((group, index) =>
        h(
          'div',
          { key: index },
          group.map((label) => h('div', { key: label, 'data-item': label }, label)),
        ) as VNode
      )
    }

    const container = document.createElement('div')
    document.body.appendChild(container)
    act(() => renderDOM(element({ showDots: true, children: makeChildren(1) }), container))

    const dots = container.querySelectorAll('[data-space-ui="slider-dots"] button')
    act(() => (dots[5] as HTMLButtonElement).click())
    assertStringIncludes(container.innerHTML, 'Slide 6 of 6')

    const itemANode = must(container.querySelector('[data-item="A"]'))

    act(() => renderDOM(element({ showDots: true, children: makeChildren(3) }), container))

    assertStringIncludes(container.innerHTML, 'Slide 2 of 2')
    assertStrictEquals(container.querySelector('[data-item="A"]'), itemANode)

    act(() => renderDOM(null, container))
  },
)
