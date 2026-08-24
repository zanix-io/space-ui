import { useEffect, useState } from 'react'
import { autoUpdate, measurePosition } from './positioning-dom.ts'
import type { ComputePositionOptions, ComputePositionResult } from './positioning.ts'

/**
 * The per-renderer hook that wires `positioning.ts`'s pure geometry and `positioning-dom.ts`'s DOM
 * measurement into a real component's render cycle — ref timing, when to re-measure, and an SSR
 * guard. `Popover`, `Tooltip`, and `Combobox` all use this (React binding; see
 * `use-position.preact.ts` for the Preact one).
 *
 * Returns `null` until the first real measurement completes — never a fake starting position that
 * would flash into place, and naturally SSR-safe: `referenceRef.current`/`floatingRef.current` are
 * both `null` on the server (refs never populate outside a real DOM), so the measuring effect
 * simply never runs there, no `typeof window` check needed — same "ref-gated, not environment-
 * gated" pattern `Showcase`'s own `ResizeObserver` effect already uses.
 *
 * Only measures/tracks while `active` — no cost paid, and no `autoUpdate` scroll/resize listeners
 * registered, for a closed `Popover`/`Tooltip`.
 */
export function usePosition(
  referenceRef: { current: Element | null },
  floatingRef: { current: Element | null },
  active: boolean,
  options?: ComputePositionOptions,
): ComputePositionResult | null {
  const [result, setResult] = useState<ComputePositionResult | null>(null)
  // A stable, value-based key for `options` — the natural call shape is an inline object literal
  // (`usePosition(a, b, open, { placement, offset })`), a NEW reference every render regardless of
  // whether its actual values changed. Depending on the raw object below would re-run the effect
  // every render once `active`, since `setResult` below always produces a new result object too —
  // triggering a re-render, a new `options` literal, another effect run, forever: a real infinite
  // loop, not just a stale-closure risk.
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
    // `referenceRef`/`floatingRef` are refs — deliberately not in the dependency list, same
    // "read via the ref object itself, not its `.current`" convention every other ref-consuming
    // effect in this package already follows. `options` itself is deliberately not a dependency
    // either (see `optionsKey` above) — only ITS SERIALIZED VALUE is, so this effect re-runs when
    // the actual placement/offset/etc. change, not on every render a fresh literal happens to
    // create.
  }, [active, optionsKey])

  return result
}
