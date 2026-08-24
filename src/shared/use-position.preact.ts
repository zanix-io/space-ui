import { useEffect, useState } from 'preact/hooks'
import { autoUpdate, measurePosition } from './positioning-dom.ts'
import type { ComputePositionOptions, ComputePositionResult } from './positioning.ts'

/**
 * Preact binding — see `use-position.ts`'s own doc for the full contract (why `null` until the
 * first measurement, why this is naturally SSR-safe, why only `active` tracks) — not repeated
 * here. Same contract, same behavior, independent implementation — never `preact/compat`.
 */
export function usePosition(
  referenceRef: { current: Element | null },
  floatingRef: { current: Element | null },
  active: boolean,
  options?: ComputePositionOptions,
): ComputePositionResult | null {
  const [result, setResult] = useState<ComputePositionResult | null>(null)
  // See `use-position.ts`'s own comment on this — depending on the raw `options` object (a fresh
  // literal at most call sites, every render) would re-trigger this effect every time `setResult`
  // below causes a re-render, a real infinite loop.
  const optionsKey = JSON.stringify(options ?? null)

  useEffect(() => {
    if (!active) {
      setResult(null)
      return
    }
    const referenceEl = referenceRef.current
    const floatingEl = floatingRef.current
    if (!referenceEl || !floatingEl) return

    const update = () => setResult(measurePosition(referenceEl, floatingEl, options))
    update()
    return autoUpdate(referenceEl, floatingEl, update)
  }, [active, optionsKey])

  return result
}
