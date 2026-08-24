import type { CreateElement } from 'typings/renderer.ts'
import type { CounterProps } from './types.ts'

/**
 * The hooks this component's shared body needs, injected alongside `h` — same `render.ts`-factory
 * technique {@linkcode createTable}'s own `TableHooks` established, extended here to real
 * `useEffect`/`useRef` usage (not just `useState`) — the harder case that same file's own doc
 * describes as empirically verified sound (a throwaway `Counter` reimplementation, mounted through
 * both `react-dom`'s real `createRoot` and Preact's real `render()`, driven by this package's own
 * deterministic `IntersectionObserver`/`requestAnimationFrame` fake-clock mocks, confirmed state
 * updates re-render correctly and effect cleanup actually fires on both an unmount and a
 * mid-animation prop change) — this file IS that verification, applied for real.
 */
export type CounterHooks = {
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
}

/**
 * The real implementation of `Counter`, shared identically between the React and Preact bindings —
 * same pattern as `Table/render.ts`, extended to real `useEffect`/`useRef` usage (see
 * {@linkcode CounterHooks}'s own doc for why that's sound here). The rendered `<span>` carries
 * `data-space-ui="counter"`, same convention as every other component's own genuine root element.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (reveal-once via
 * `IntersectionObserver`, no `Lazy`/`LayoutContainer`, SSR/pre-intersection `null`, the fixed
 * `aria-label`, `format` instead of an implicit locale, exact final value, real
 * `requestAnimationFrame` cleanup) — not repeated here.
 */
export function createCounter<E>(
  h: CreateElement<E>,
  hooks: CounterHooks,
): (props: CounterProps) => E {
  return function Counter(props: CounterProps): E {
    const { target, duration, prefix = '', format = String, id, className } = props
    const ref = hooks.useRef<HTMLSpanElement | null>(null)
    const [hasIntersected, setHasIntersected] = hooks.useState(false)
    const [count, setCount] = hooks.useState(0)

    hooks.useEffect(() => {
      const element = ref.current
      // Not an SSR guard (neither renderer runs effects during SSR at all) — a graceful fallback
      // for a real client browser that doesn't implement `IntersectionObserver`: reveal
      // immediately rather than never revealing at all.
      if (!element) return
      if (typeof IntersectionObserver === 'undefined') {
        setHasIntersected(true)
        return
      }

      const observer = new IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setHasIntersected(true)
              observer.unobserve(entry.target)
            }
          }
        },
        { threshold: 0.05 },
      )
      observer.observe(element)

      return () => observer.disconnect()
    }, [])

    hooks.useEffect(() => {
      if (!hasIntersected) return

      setCount(0)
      const startTime = Date.now()

      const step = () => {
        const progress = Math.min((Date.now() - startTime) / duration, 1)
        setCount(progress >= 1 ? target : Math.floor(progress * target))
        if (progress < 1) frameId = requestAnimationFrame(step)
      }
      let frameId = requestAnimationFrame(step)

      return () => cancelAnimationFrame(frameId)
    }, [hasIntersected, target, duration])

    return h(
      'span',
      { id, className, ref, 'data-space-ui': 'counter', 'aria-label': prefix + format(target) },
      hasIntersected ? h('span', { 'aria-hidden': 'true' }, prefix + format(count)) : null,
    )
  }
}
