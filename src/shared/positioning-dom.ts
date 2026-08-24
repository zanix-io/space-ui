import { computePosition } from './positioning.ts'
import type { ComputePositionOptions, ComputePositionResult, Rect } from './positioning.ts'

/**
 * The DOM-measuring half of `positioning.ts`'s own pure geometry — reads real elements
 * (`getBoundingClientRect`, the viewport, scrollable ancestors) and keeps a position live as any
 * of them change. Still no React/Preact hook machinery (`ResizeObserver`/`addEventListener` are
 * plain browser APIs) — `usePosition` (`use-position.ts`/`use-position.preact.ts`) is the thin
 * per-renderer hook that ties this into a real component's render cycle, wiring `Popover`,
 * `Tooltip`, and `Combobox` up to the functions below.
 */

/** The current viewport as a {@linkcode Rect}, in the same coordinate space
 * `getBoundingClientRect()` already uses — the default `boundary` a real consumer reaches for. */
export function getViewportRect(): Rect {
  return { x: 0, y: 0, width: globalThis.innerWidth, height: globalThis.innerHeight }
}

/**
 * Measures `referenceEl`/`floatingEl` and computes where `floatingEl` should sit, via
 * `computePosition`. Defaults `boundary` to the real viewport ({@linkcode getViewportRect}) rather
 * than `computePosition`'s own "effectively infinite" default — real DOM measurement is exactly
 * the case collision detection is actually useful for.
 */
export function measurePosition(
  referenceEl: Element,
  floatingEl: Element,
  options: ComputePositionOptions = {},
): ComputePositionResult {
  const referenceRect = referenceEl.getBoundingClientRect()
  const floatingRect = floatingEl.getBoundingClientRect()
  return computePosition(
    referenceRect,
    { width: floatingRect.width, height: floatingRect.height },
    { boundary: getViewportRect(), ...options },
  )
}

/** Elements between `el` and the document root whose own `overflow` can actually clip/scroll their
 * content — a floating element anchored to something inside one of these needs to re-measure
 * whenever that container scrolls, not just the window. */
function getScrollParents(el: Element): Element[] {
  const scrollParents: Element[] = []
  let current = el.parentElement
  while (current) {
    const style = globalThis.getComputedStyle(current)
    if (/(auto|scroll|overlay)/.test(style.overflow + style.overflowX + style.overflowY)) {
      scrollParents.push(current)
    }
    current = current.parentElement
  }
  return scrollParents
}

/**
 * Keeps `update` firing whenever the position `referenceEl`/`floatingEl` should sit at could have
 * changed: either one resizing (`ResizeObserver`), any scrollable ancestor of either scrolling, or
 * the window itself resizing. Returns a cleanup function that removes every listener/observer this
 * set up — call it on unmount/deactivate.
 *
 * A real client browser lacking `ResizeObserver` simply skips that one piece (same graceful-
 * degradation philosophy `Counter`'s own guard documents) — scroll/resize listeners still work.
 */
export function autoUpdate(
  referenceEl: Element,
  floatingEl: Element,
  update: () => void,
): () => void {
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
  resizeObserver?.observe(referenceEl)
  resizeObserver?.observe(floatingEl)

  const scrollParents = Array.from(
    new Set([...getScrollParents(referenceEl), ...getScrollParents(floatingEl)]),
  )
  for (const parent of scrollParents) {
    parent.addEventListener('scroll', update, { passive: true })
  }
  globalThis.addEventListener('scroll', update, { passive: true })
  globalThis.addEventListener('resize', update)

  return () => {
    resizeObserver?.disconnect()
    for (const parent of scrollParents) {
      parent.removeEventListener('scroll', update)
    }
    globalThis.removeEventListener('scroll', update)
    globalThis.removeEventListener('resize', update)
  }
}
