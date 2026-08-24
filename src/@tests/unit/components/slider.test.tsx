import { installTimerMock, must } from './dom-test-setup.ts'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStrictEquals, assertStringIncludes } from '@std/assert'
import { Slider } from 'components/Slider/index.ts'

function mount(element: ReturnType<typeof Slider>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))
  return {
    container,
    rerender: (next: ReturnType<typeof Slider>) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  }
}

function renderCountingSlides(counts: number[]) {
  return counts.map((_, i) => {
    function Slide() {
      counts[i]++
      return <div>{`Slide ${i}`}</div>
    }
    return <Slide key={i} />
  })
}

// --- SSR / structure -----------------------------------------------------------------------

Deno.test('Slider: SSR markup — Carousel region, never role="slider"', () => {
  const html = renderToStaticMarkup(
    <Slider>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  assertStringIncludes(html, 'data-space-ui="slider"')
  assertStringIncludes(html, 'role="region"')
  assertStringIncludes(html, 'aria-roledescription="carousel"')
  assertStringIncludes(html, 'aria-label="Carousel"')
  assertEquals(html.includes('role="slider"'), false)
})

Deno.test('Slider: id/className land on the root region', () => {
  const html = renderToStaticMarkup(
    <Slider id='hero' className='big'>
      <div>A</div>
    </Slider>,
  )

  assertStringIncludes(html, 'id="hero"')
  assertStringIncludes(html, 'class="big"')
})

Deno.test('Slider: only the first slide is mounted initially, others absent entirely', () => {
  const html = renderToStaticMarkup(
    <Slider>
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </Slider>,
  )

  assertStringIncludes(html, 'Slide 1 of 3')
  assertStringIncludes(html, '>A<')
  assertEquals(html.includes('>B<'), false)
  assertEquals(html.includes('>C<'), false)
})

Deno.test('Slider: a single child never renders dots/arrows/pause', () => {
  const html = renderToStaticMarkup(
    <Slider>
      <div>Only</div>
    </Slider>,
  )

  assertEquals(html.includes('data-space-ui="slider-dots"'), false)
  assertEquals(html.includes('data-space-ui="slider-arrows"'), false)
})

// --- arrows / dots ---------------------------------------------------------------------------

Deno.test('Slider: arrows by default, clicking Next advances, real DOM', () => {
  const { container, unmount } = mount(
    <Slider>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')
  const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])

  act(() => (next as HTMLButtonElement).click())

  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

  unmount()
})

Deno.test('Slider: without loop, Next at the last slide stays there', () => {
  const { container, unmount } = mount(
    <Slider>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])
  act(() => (next as HTMLButtonElement).click())
  act(() => (next as HTMLButtonElement).click())

  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

  unmount()
})

Deno.test('Slider: with loop, Next at the last slide wraps to the first', () => {
  const { container, unmount } = mount(
    <Slider loop>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])
  act(() => (next as HTMLButtonElement).click())
  act(() => (next as HTMLButtonElement).click())

  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

  unmount()
})

Deno.test('Slider: with loop, Prev at the first slide wraps to the last', () => {
  const { container, unmount } = mount(
    <Slider loop>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  const prev = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[0])
  act(() => (prev as HTMLButtonElement).click())

  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

  unmount()
})

Deno.test('Slider: dots get individual accessible names and aria-current on the active one', () => {
  const html = renderToStaticMarkup(
    <Slider showDots>
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </Slider>,
  )

  assertStringIncludes(html, 'aria-label="Go to slide 1"')
  assertStringIncludes(html, 'aria-label="Go to slide 2"')
  assertStringIncludes(html, 'aria-label="Go to slide 3"')
  assertStringIncludes(html, 'aria-current="true"')
  // Only the active dot carries aria-current.
  assertEquals((html.match(/aria-current/g) ?? []).length, 1)
})

Deno.test('Slider: clicking a dot jumps directly to that slide', () => {
  const { container, unmount } = mount(
    <Slider showDots>
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </Slider>,
  )

  const dots = container.querySelectorAll('[data-space-ui="slider-dots"] button')
  act(() => (dots[2] as HTMLButtonElement).click())

  assertStringIncludes(container.innerHTML, 'Slide 3 of 3')
  assertEquals(dots[2].getAttribute('aria-current'), 'true')

  unmount()
})

// --- keyboard --------------------------------------------------------------------------------

Deno.test('Slider: ArrowRight/ArrowLeft on the focused region change the slide', () => {
  const { container, unmount } = mount(
    <Slider>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

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

Deno.test(
  'Slider: with only a single child, ArrowRight/ArrowLeft never throw and never move',
  () => {
    const { container, unmount } = mount(
      <Slider>
        <div>Only</div>
      </Slider>,
    )

    const region = must(container.querySelector('[data-space-ui="slider"]'))

    act(() => {
      region.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      )
      region.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      )
    })

    assertStringIncludes(container.innerHTML, 'Slide 1 of 1')

    unmount()
  },
)

// --- never remount while cached / cap at 10 ---------------------------------------------------

Deno.test('Slider: a visited slide never re-renders while it stays cached', () => {
  const counts = [0, 0, 0]
  const { container, unmount } = mount(<Slider>{renderCountingSlides(counts)}</Slider>)

  const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])
  act(() => (next as HTMLButtonElement).click()) // -> slide 1
  act(() => (next as HTMLButtonElement).click()) // -> slide 2

  const prev = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[0])
  act(() => (prev as HTMLButtonElement).click()) // -> slide 1
  act(() => (prev as HTMLButtonElement).click()) // -> slide 0

  assertEquals(counts, [1, 1, 1])

  unmount()
})

Deno.test('Slider: caps mounted slides at 10 — revisiting an evicted one remounts it', () => {
  const counts = Array.from({ length: 12 }, () => 0)
  const { container, unmount } = mount(<Slider>{renderCountingSlides(counts)}</Slider>)

  const next = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[1])
  // Visit indices 0..10 (11 distinct slides) — index 0 must be evicted once the 11th is visited.
  for (let i = 0; i < 10; i++) act(() => (next as HTMLButtonElement).click())

  assertEquals(container.querySelectorAll('[data-space-ui="slider-item"]').length, 10)
  assertEquals(counts[0], 1)

  const prev = must(container.querySelectorAll('[data-space-ui="slider-arrows"] button')[0])
  for (let i = 0; i < 10; i++) act(() => (prev as HTMLButtonElement).click())

  // Slide 0 was evicted while away — coming back to it is a real, fresh render.
  assertEquals(counts[0], 2)

  unmount()
})

// --- autoplay ----------------------------------------------------------------------------------

Deno.test('Slider: autoPlayInterval advances on its own after the interval elapses', () => {
  const clock = installTimerMock()
  const { container, unmount } = mount(
    <Slider autoPlayInterval={1000}>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')
  act(() => clock.advance(1000))
  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

  unmount()
  clock.restore()
})

Deno.test('Slider: autoplay without loop stops at the last slide (timer self-terminates)', () => {
  const clock = installTimerMock()
  const { container, unmount } = mount(
    <Slider autoPlayInterval={1000}>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  act(() => clock.advance(1000))
  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')
  assertEquals(clock.pendingCount(), 0)

  unmount()
  clock.restore()
})

Deno.test('Slider: autoplay with loop keeps advancing past the last slide', () => {
  const clock = installTimerMock()
  const { container, unmount } = mount(
    <Slider autoPlayInterval={1000} loop>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  act(() => clock.advance(1000))
  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')
  act(() => clock.advance(1000))
  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

  unmount()
  clock.restore()
})

Deno.test('Slider: without autoPlayInterval, no Pause/Play control is rendered', () => {
  const html = renderToStaticMarkup(
    <Slider>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  assertEquals(html.includes('Pause slideshow'), false)
  assertEquals(html.includes('Play slideshow'), false)
})

Deno.test('Slider: the Pause button stops autoplay and changes its own accessible name', () => {
  const clock = installTimerMock()
  const { container, unmount } = mount(
    <Slider autoPlayInterval={1000}>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  const pauseButton = must(
    Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent === 'Pause slideshow' || b.getAttribute('aria-label') === 'Pause slideshow'
    ),
  )
  act(() => pauseButton.click())
  assertEquals(pauseButton.getAttribute('aria-label'), 'Play slideshow')

  act(() => clock.advance(2000))
  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

  unmount()
  clock.restore()
})

Deno.test('Slider: hovering pauses autoplay, leaving resumes it', () => {
  const clock = installTimerMock()
  const { container, unmount } = mount(
    <Slider autoPlayInterval={1000}>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  // React synthesizes onMouseEnter/onMouseLeave from bubbling mouseover/mouseout, not the native
  // (non-bubbling) mouseenter/mouseleave — see menu.test.tsx's own helpers for the same reasoning.
  const region = must(container.querySelector('[data-space-ui="slider"]'))
  act(() => {
    region.dispatchEvent(
      new MouseEvent('mouseover', { bubbles: true, cancelable: true, relatedTarget: null }),
    )
  })
  act(() => clock.advance(1000))
  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

  act(() => {
    region.dispatchEvent(
      new MouseEvent('mouseout', {
        bubbles: true,
        cancelable: true,
        relatedTarget: document.body,
      }),
    )
  })
  act(() => clock.advance(1000))
  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

  unmount()
  clock.restore()
})

Deno.test('Slider: manual pause is never overridden by mouseleave', () => {
  const clock = installTimerMock()
  const { container, unmount } = mount(
    <Slider autoPlayInterval={1000}>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  const pauseButton = must(
    Array.from(container.querySelectorAll('button')).find((b) =>
      b.getAttribute('aria-label') === 'Pause slideshow'
    ),
  )
  act(() => pauseButton.click())

  const region = must(container.querySelector('[data-space-ui="slider"]'))
  act(() => {
    region.dispatchEvent(
      new MouseEvent('mouseover', { bubbles: true, cancelable: true, relatedTarget: null }),
    )
  })
  act(() => {
    region.dispatchEvent(
      new MouseEvent('mouseout', {
        bubbles: true,
        cancelable: true,
        relatedTarget: document.body,
      }),
    )
  })
  act(() => clock.advance(2000))

  // Still on slide 1 — mouseleave did not resume a manually-paused autoplay.
  assertStringIncludes(container.innerHTML, 'Slide 1 of 2')

  unmount()
  clock.restore()
})

// --- aria-live -----------------------------------------------------------------------------

Deno.test('Slider: aria-live is "off" while autoplay actively advances', () => {
  const html = renderToStaticMarkup(
    <Slider autoPlayInterval={1000}>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  assertStringIncludes(html, 'aria-live="off"')
})

Deno.test('Slider: aria-live is "polite" without autoplay', () => {
  const html = renderToStaticMarkup(
    <Slider>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  assertStringIncludes(html, 'aria-live="polite"')
})

Deno.test('Slider: aria-live becomes "polite" once autoplay is manually paused', () => {
  const { container, unmount } = mount(
    <Slider autoPlayInterval={1000}>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  const pauseButton = must(
    Array.from(container.querySelectorAll('button')).find((b) =>
      b.getAttribute('aria-label') === 'Pause slideshow'
    ),
  )
  act(() => pauseButton.click())

  const live = must(container.querySelector('[aria-live]'))
  assertEquals(live.getAttribute('aria-live'), 'polite')

  unmount()
})

// --- a shrinking `children` array never leaves `currentIndex` invalid -----------------------
// General robustness for ANY consumer with dynamic `children` — found auditing `Showcase`
// (regroups its own children live on a container resize), fixed here, not with a workaround
// there. See `index.ts`'s own doc for the full contract.

Deno.test('Slider: children shrinking to one slide clamps currentIndex, no crash', () => {
  const { container, rerender, unmount } = mount(
    <Slider showDots>
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </Slider>,
  )

  const dots = container.querySelectorAll('[data-space-ui="slider-dots"] button')
  act(() => (dots[2] as HTMLButtonElement).click()) // on the last of 3
  assertStringIncludes(container.innerHTML, 'Slide 3 of 3')

  rerender(
    <Slider showDots>
      <div>Only</div>
    </Slider>,
  )

  assertStringIncludes(container.innerHTML, 'Slide 1 of 1')
  assertEquals(container.querySelector('[data-active="true"]')?.textContent, 'Only')

  unmount()
})

Deno.test('Slider: children shrinking preserves position — the new last slide, not slide 0', () => {
  const { container, rerender, unmount } = mount(
    <Slider showDots>
      <div>A</div>
      <div>B</div>
      <div>C</div>
    </Slider>,
  )

  const dots = container.querySelectorAll('[data-space-ui="slider-dots"] button')
  act(() => (dots[2] as HTMLButtonElement).click()) // on C, the last of 3

  rerender(
    <Slider showDots>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  // Was on the last slide of 3 — after shrinking to 2, lands on the new last slide (B), not back
  // at slide 0 (A). No remount was forced to get here (no `key` change on `<Slider>` itself).
  assertStringIncludes(container.innerHTML, 'Slide 2 of 2')
  assertEquals(container.querySelector('[data-active="true"]')?.textContent, 'B')

  unmount()
})

Deno.test('Slider: children shrinking to zero renders no crash, no arrows/dots', () => {
  const { container, rerender, unmount } = mount(
    <Slider showDots>
      <div>A</div>
      <div>B</div>
    </Slider>,
  )

  rerender(<Slider showDots>{[]}</Slider>)

  assertEquals(container.querySelector('[data-space-ui="slider-dots"]'), null)
  assertEquals(container.querySelector('[data-space-ui="slider-arrows"]'), null)
  assertEquals(container.querySelector('[data-space-ui="slider-item"]'), null)

  unmount()
})

Deno.test(
  'Slider: children undefined (never passed at all) renders no crash, no arrows/dots',
  () => {
    // Every other test always passes a real child or an explicit `[]` — `children` itself being
    // `undefined` (the literal shape a consumer skipping the prop entirely produces) is a distinct,
    // untested case: `Array.isArray(undefined)` is `false`, so this falls through to the
    // `undefined`/`null` branch of the ternary below it, same destination as `[]` but via a
    // different path through the source.
    const { container, unmount } = mount(<Slider showDots>{undefined}</Slider>)

    assertEquals(container.querySelector('[data-space-ui="slider-dots"]'), null)
    assertEquals(container.querySelector('[data-space-ui="slider-arrows"]'), null)
    assertEquals(container.querySelector('[data-space-ui="slider-item"]'), null)

    unmount()
  },
)

Deno.test(
  'Slider: pruning stale visited indices after a shrink prevents wasting cache budget',
  () => {
    const counts = Array.from({ length: 12 }, () => 0)
    const allSlides = renderCountingSlides(counts)

    const { container, rerender, unmount } = mount(<Slider showDots>{allSlides}</Slider>)

    // Fill the cache exactly: visit indices 0..9 (10 distinct slides, exactly at the cap).
    for (let i = 0; i < 10; i++) {
      const dot = must(container.querySelectorAll('[data-space-ui="slider-dots"] button')[i])
      act(() => (dot as HTMLButtonElement).click())
    }
    assertEquals(counts.slice(0, 10), Array(10).fill(1))

    // Shrink to only the first 3 — indices 3..9 stop being valid slide positions at all.
    rerender(<Slider showDots>{allSlides.slice(0, 3)}</Slider>)
    // Grow back to all 12, without ever navigating while shrunk.
    rerender(<Slider showDots>{allSlides}</Slider>)

    // Visit a genuinely new slide (index 10). With the stale (3..9) entries pruned during the
    // shrink, the cache has real headroom — this must NOT evict index 0 to make room.
    const dotsAfterGrow = container.querySelectorAll('[data-space-ui="slider-dots"] button')
    act(() => (dotsAfterGrow[10] as HTMLButtonElement).click())

    assertEquals(counts[0], 1) // still 1 — never evicted, never remounted

    unmount()
  },
)

Deno.test(
  'Slider: a consumer that regroups children live (Showcase-shaped) preserves item DOM identity across a shrink, without ever showing an invalid slide',
  () => {
    // Doesn't depend on `Showcase`'s own API — reproduces the general shape any consumer with
    // live, dynamic `children` has: an outer component holding its own `groupSize` state,
    // re-chunking a flat list of items into slide-worthy groups every render, exactly what
    // `Showcase` does internally in response to a container resize.
    //
    // Asserts DOM node IDENTITY (`assertStrictEquals`), not a render-invocation counter: once the
    // parent (`Host`) itself re-renders with a new `groupSize`, React legitimately re-invokes each
    // item's own render function (fresh element objects, even at the same key) — that's normal and
    // harmless. What actually matters, and what this real capability is really about, is that
    // React's own keyed reconciliation still recognizes "A" as the same node across
    // the regroup and never tears down/rebuilds it — a real remount would lose whatever internal
    // state that node happens to carry (scroll position, video playback, focus, typed input).
    const items = ['A', 'B', 'C', 'D', 'E', 'F']
    function chunk(groupSize: number) {
      const groups: string[][] = []
      for (let i = 0; i < items.length; i += groupSize) {
        groups.push(items.slice(i, i + groupSize))
      }
      return groups
    }

    function Host({ groupSize }: { groupSize: number }) {
      return (
        <Slider showDots>
          {chunk(groupSize).map((group, index) => (
            <div key={index}>
              {group.map((label) => <div key={label} data-item={label}>{label}</div>)}
            </div>
          ))}
        </Slider>
      )
    }

    const { container, rerender, unmount } = mount(<Host groupSize={1} />)

    // 6 items grouped by 1 => 6 slides. Jump to the last one.
    const dots = container.querySelectorAll('[data-space-ui="slider-dots"] button')
    act(() => (dots[5] as HTMLButtonElement).click())
    assertStringIncludes(container.innerHTML, 'Slide 6 of 6')

    const itemANode = must(container.querySelector('[data-item="A"]'))

    // Regroup by 3 => 2 slides, as a live container resize would (Showcase's own real mechanism).
    rerender(<Host groupSize={3} />)

    // No invalid index shown — itemsQuantity dropped from 6 to 2; currentIndex (was 5) clamps to
    // the new last slide (1), not back to slide 0.
    assertStringIncludes(container.innerHTML, 'Slide 2 of 2')

    // A's own DOM node survives the regroup unchanged, even though it moved from being the sole
    // occupant of slide 0 to being the first of three items in the (now differently-shaped) slide
    // 0 — real reconciliation, not a remount.
    assertStrictEquals(container.querySelector('[data-item="A"]'), itemANode)

    unmount()
  },
)
