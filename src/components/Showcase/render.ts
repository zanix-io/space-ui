import type { CreateElement } from 'typings/renderer.ts'
import { createSlider } from '../Slider/render.ts'
import type { SliderHooks, SliderRenderProps } from '../Slider/render.ts'
import type { ShowcaseBaseProps } from './types.ts'
import { chunkItems, clampItemsPerSlide, resolveItemsPerSlide } from './resolve-items-per-slide.ts'

/**
 * The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here). Exactly
 * {@linkcode SliderHooks} (the composed `Slider`'s own bag, forwarded straight through) — this
 * component's own body needs the identical three.
 */
export type ShowcaseHooks = SliderHooks

/** The one piece of `children` handling that's genuinely a different API per renderer — React's
 * `Children.toArray`/Preact's `toChildArray` (same "flatten an arbitrary `children` value into a
 * real array" behavior, different names — no semantic divergence this component's own body relies
 * on). Injected as its own parameter, the same way `Fragment` already is for other components. */
export type ChildrenToArray<Node> = (children: Node) => Node[]

/** {@linkcode ShowcaseBaseProps} plus the `Slider` props it forwards and the items themselves,
 * generic over the renderer's own node type — `index.ts`/`index.preact.ts` each instantiate this as
 * their own public `ShowcaseProps`, with `ReactNode`/`ComponentChildren`. */
export type ShowcaseRenderProps<Node> = ShowcaseBaseProps & {
  slider?: Omit<SliderRenderProps<Node>, 'children' | 'id' | 'className'>
  children: Node
}

/**
 * The real implementation of `Showcase`, shared identically between the React and Preact bindings —
 * same pattern as `Table/render.ts`. Composes the real `Slider` (via its own `render.ts` factory,
 * bound to the same `h`/`hooks`) — inherits its own `data-space-ui="slider"` hook, never a
 * redundant one of its own.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (grouping-only scope, container-
 * width-vs-viewport-width rationale, the private measurement wrapper, the group wrapper's own
 * `display: flex`, SSR/hydration strategy, why `ResizeObserver` stays private, the `Slider` fix this
 * exposed) — not repeated here.
 */
export function createShowcase<E, Node>(
  h: CreateElement<E>,
  hooks: ShowcaseHooks,
  childrenToArray: ChildrenToArray<Node>,
): (props: ShowcaseRenderProps<Node>) => E {
  const Slider = createSlider<E, Node>(h, hooks)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function Showcase(props: ShowcaseRenderProps<Node>): E {
    const { itemsPerSlide, slider, id, className, children } = props

    const containerRef = hooks.useRef<HTMLDivElement | null>(null)
    const [containerWidth, setContainerWidth] = hooks.useState<number | null>(null)

    hooks.useEffect(() => {
      const element = containerRef.current
      // Not an SSR guard (neither renderer ever runs effects during SSR) — a graceful fallback for
      // a real client browser that doesn't implement `ResizeObserver`: stay at `null`, resolving to
      // the smallest configured threshold, same as before any measurement exists.
      if (!element || typeof ResizeObserver === 'undefined') return

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (entry) setContainerWidth(entry.contentRect.width)
      })
      observer.observe(element)

      return () => observer.disconnect()
    }, [])

    const items = childrenToArray(children)
    const resolvedCount = resolveItemsPerSlide(itemsPerSlide, containerWidth)
    const groupSize = clampItemsPerSlide(resolvedCount, items.length)
    const groups = chunkItems(items, groupSize)

    return h(
      'div',
      { ref: containerRef },
      hAny(Slider, {
        ...slider,
        id,
        className,
        children: groups.map((group, index) =>
          h(
            'div',
            { key: index, 'data-space-ui': 'showcase-group', style: { display: 'flex' } },
            group,
          )
        ),
      }),
    )
  }
}
