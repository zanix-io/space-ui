import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { liveRegionProps } from 'shared/live-region.ts'
import type { SliderBaseProps } from './types.ts'
import { MAX_MOUNTED_SLIDES } from './types.ts'

/**
 * The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 */
export type SliderHooks = {
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T | (() => T)) => [T, (value: T | ((current: T) => T)) => void]
}

/** {@linkcode SliderBaseProps} plus the slides themselves, generic over the renderer's own node
 * type — `index.ts`/`index.preact.ts` each instantiate this as their own public `SliderProps`,
 * with `ReactNode`/`ComponentChildren`. */
export type SliderRenderProps<Node> = SliderBaseProps & { children: Node }

/**
 * The real implementation of `Slider`, shared identically between the React and Preact bindings —
 * same pattern as `Table/render.ts`. Composes the real `Button` (via its own `render.ts` factory,
 * bound to the same `h`) for arrows/dots/pause-play — inherits its own `data-space-ui="button"`
 * hook, never a redundant one of its own; the root `<div>` itself carries `data-space-ui="slider"`.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (no store, the Carousel ARIA
 * pattern, the never-remount-while-cached cache, the CSS crossfade contract, `loop`/
 * `autoPlayInterval` separated, the Pause/Play control vs. hover, keyboard, `aria-live`, dots) — not
 * repeated here.
 */
export function createSlider<E, Node>(
  h: CreateElement<E>,
  hooks: SliderHooks,
): (props: SliderRenderProps<Node>) => E {
  const Button = createButton(h)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function Slider(props: SliderRenderProps<Node>): E {
    const {
      children,
      loop = false,
      autoPlayInterval,
      showDots = false,
      label = 'Carousel',
      id,
      className,
    } = props

    const slides = Array.isArray(children)
      ? children
      : children === undefined || children === null
      ? []
      : [children]
    const itemsQuantity = slides.length
    const hasMultipleItems = itemsQuantity > 1

    const [currentIndex, setCurrentIndex] = hooks.useState(0)
    const [visited, setVisited] = hooks.useState<number[]>(() => [0])
    const [isPlaying, setIsPlaying] = hooks.useState(autoPlayInterval !== undefined)
    const [hoverPaused, setHoverPaused] = hooks.useState(false)

    // `children` can shrink out from under a still-mounted instance (any consumer that regroups its
    // own children live — e.g. `Showcase` regrouping on a container resize) — `currentIndex` itself
    // is never eagerly corrected for this (nothing else ever reads the raw, possibly-stale value —
    // see `clampToValidIndex` below), but EVERY derived value used for rendering reads `clampedIndex`
    // instead, so there is never a render with an out-of-range index visible, not even the first one
    // after `itemsQuantity` drops. `Math.min` (not a reset to `0`) preserves the user's position as
    // exactly as still makes sense: the LAST valid slide, not the first one.
    const clampToValidIndex = (index: number) =>
      itemsQuantity === 0 ? 0 : Math.min(Math.max(index, 0), itemsQuantity - 1)
    const clampedIndex = clampToValidIndex(currentIndex)

    const exhausted = !loop && clampedIndex === itemsQuantity - 1
    const autoPlayActive = autoPlayInterval !== undefined && isPlaying && !hoverPaused &&
      !exhausted && hasMultipleItems

    const goNext = () => {
      if (!hasMultipleItems) return
      setCurrentIndex((current) => {
        const base = clampToValidIndex(current)
        return loop ? (base + 1) % itemsQuantity : Math.min(base + 1, itemsQuantity - 1)
      })
    }

    const goPrev = () => {
      if (!hasMultipleItems) return
      setCurrentIndex((current) => {
        const base = clampToValidIndex(current)
        return loop ? (base - 1 + itemsQuantity) % itemsQuantity : Math.max(base - 1, 0)
      })
    }

    hooks.useEffect(() => {
      setVisited((current) => {
        // Drop any index a shrunk `itemsQuantity` has left behind — otherwise a stale, no-longer-
        // renderable index keeps occupying a real slot in the `MAX_MOUNTED_SLIDES` cap, which can
        // evict a slide that's still genuinely valid and cached the moment `itemsQuantity` grows
        // back (e.g. a container resize that later reverses) — the exact guarantee this cache exists
        // to provide.
        const pruned = current.filter((index) => index < itemsQuantity)
        const alreadyIncludesCurrent = pruned.includes(clampedIndex)
        if (alreadyIncludesCurrent && pruned.length === current.length) return current
        const next = alreadyIncludesCurrent ? pruned : [...pruned, clampedIndex]
        return next.length <= MAX_MOUNTED_SLIDES ? next : next.slice(1)
      })
    }, [clampedIndex, itemsQuantity])

    const goNextRef = hooks.useRef(goNext)
    goNextRef.current = goNext

    hooks.useEffect(() => {
      if (!autoPlayActive) return
      const timeout = setTimeout(() => goNextRef.current(), autoPlayInterval)
      return () => clearTimeout(timeout)
    }, [autoPlayActive, autoPlayInterval, clampedIndex])

    const handleKeyDown = (event: { key: string; preventDefault(): void }) => {
      if (!hasMultipleItems) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      }
    }

    const handleMouseEnter = () => {
      if (hasMultipleItems) setHoverPaused(true)
    }
    // Never touches `isPlaying` — a manual pause (the Button) always outlives the pointer leaving.
    const handleMouseLeave = () => setHoverPaused(false)

    const slideElements = slides.map((slide, index) =>
      visited.includes(index)
        ? h(
          'div',
          {
            key: index,
            'data-space-ui': 'slider-item',
            ...(index === clampedIndex ? { 'data-active': 'true' } : { hidden: true }),
          },
          slide,
        )
        : null
    )

    const liveAnnouncing = !autoPlayActive

    const dotsOrArrows = !hasMultipleItems ? null : showDots
      ? h(
        'div',
        { key: 'dots', 'data-space-ui': 'slider-dots' },
        slides.map((_, index) =>
          hAny(Button, {
            key: index,
            onClick: () => setCurrentIndex(index),
            label: `Go to slide ${index + 1}`,
            'aria-current': index === clampedIndex ? true : undefined,
          })
        ),
      )
      : h('div', { key: 'arrows', 'data-space-ui': 'slider-arrows' }, [
        hAny(Button, { key: 'prev', onClick: goPrev, label: 'Previous slide' }),
        hAny(Button, { key: 'next', onClick: goNext, label: 'Next slide' }),
      ])

    const pausePlayButton = autoPlayInterval === undefined ? null : hAny(Button, {
      key: 'pause-play',
      onClick: () => setIsPlaying((current) => !current),
      label: isPlaying ? 'Pause slideshow' : 'Play slideshow',
    })

    return h(
      'div',
      {
        id,
        className,
        'data-space-ui': 'slider',
        role: 'region',
        'aria-roledescription': 'carousel',
        'aria-label': label,
        tabIndex: 0,
        onKeyDown: handleKeyDown,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      },
      [
        h('div', { key: 'track', 'data-space-ui': 'slider-track' }, slideElements),
        dotsOrArrows,
        pausePlayButton,
        h(
          'span',
          { key: 'live', ...liveRegionProps(liveAnnouncing ? 'polite' : 'off') },
          `Slide ${clampedIndex + 1} of ${itemsQuantity}`,
        ),
      ],
    )
  }
}
