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

/** CSS properties that, per spec, make an element the containing block for a `position: fixed`
 * descendant instead of the viewport — any non-`none` `transform` (`Modal`/`Drawer`'s own
 * `translate(-50%,-50%)` centering trick included), `perspective`, `filter`, `backdrop-filter`, a
 * `will-change` naming one of those, or a `contain` of `layout`/`paint`/`strict`/`content`. */
function establishesFixedContainingBlock(style: CSSStyleDeclaration): boolean {
  if (style.transform !== 'none') return true
  if (style.perspective !== 'none') return true
  if (style.filter !== 'none') return true
  if (style.backdropFilter && style.backdropFilter !== 'none') return true
  if (/transform|perspective|filter/.test(style.willChange)) return true
  if (/layout|paint|strict|content/.test(style.contain)) return true
  return false
}

/**
 * `measurePosition`'s own `referenceRect`/`boundary` are viewport-relative
 * (`getBoundingClientRect()`'s own coordinate space) — the correct space for `computePosition`'s
 * collision math, which should avoid the real screen edges, never a container's. But the RESULT is
 * applied as `translate(x, y)` on `floatingEl` itself (`top: 0; left: 0; position: fixed`, this
 * package's own `SELECT_LISTBOX_POSITION_CSS`-style static rule) — and a `position: fixed`
 * element's `top`/`left`/`transform` resolve against its own CONTAINING BLOCK, which per spec is
 * the viewport ONLY when no ancestor {@linkcode establishesFixedContainingBlock}. Walks up from
 * `floatingEl`'s own parent to find the nearest one that does, and returns its own
 * `getBoundingClientRect()` origin — `{x: 0, y: 0}` when none exists (the common case, and exactly
 * today's behavior). `Select`'s own listbox, nested inside `Modal`'s default `position: 'center'`,
 * renders clipped/offset from its trigger without this correction: `Modal`'s own
 * `transform: translate(-50%, -50%)` centering silently becomes the floating element's real
 * containing block, so the viewport-relative `x`/`y` `computePosition` returns lands relative to
 * the MODAL's own box instead, visibly mispositioning the listbox. */
function getFixedContainingBlockOrigin(floatingEl: Element): { x: number; y: number } {
  let current = floatingEl.parentElement
  while (current) {
    if (establishesFixedContainingBlock(globalThis.getComputedStyle(current))) {
      const rect = current.getBoundingClientRect()
      return { x: rect.left, y: rect.top }
    }
    current = current.parentElement
  }
  return { x: 0, y: 0 }
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
  const result = computePosition(
    referenceRect,
    { width: floatingRect.width, height: floatingRect.height },
    { boundary: getViewportRect(), ...options },
  )
  const containingBlockOrigin = getFixedContainingBlockOrigin(floatingEl)
  return {
    ...result,
    x: result.x - containingBlockOrigin.x,
    y: result.y - containingBlockOrigin.y,
  }
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
