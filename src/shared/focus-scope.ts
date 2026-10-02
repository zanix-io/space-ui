import { useEffect, useRef } from 'react'

/**
 * Extracted from `Modal`'s own focus trap (`Modal/index.ts`'s "Focus management" doc section) once
 * `Drawer` became a real second consumer needing the identical mechanism — capture the currently
 * focused element, move focus into a container, keep `Tab`/`Shift+Tab` cycling within it, restore
 * focus on deactivate. `Escape` handling is deliberately NOT part of this — each consumer's own
 * `Escape` semantics differ too much to share (see `shared/escape-to-close.ts`'s own doc for why
 * `Modal` itself was never built on THAT primitive either) — only `Tab`-cycling is generic enough
 * to extract.
 */
// `:not([type="hidden"])` — a hidden input is never actually focusable in a real browser, same as
// a `hidden`-ancestor element; without this, a dialog whose first real field is a hidden `<input>`
// (a CSRF token, say) picks it as the initial-focus target and `.focus()` silently does nothing.
export const FOCUSABLE_SELECTOR: string = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** `true` unless `element` or an ancestor carries the native `hidden` attribute — `FOCUSABLE_
 * SELECTOR` can't express "not inside a hidden ancestor" as a plain CSS selector. Without this, a
 * dialog whose content shows/hides sections via `hidden` (a tab strip, an accordion) can pick an
 * initial-focus candidate that's currently hidden; `.focus()` on it is then a silent no-op, so
 * focus stays outside the dialog and `Escape`/`Tab` never reach its own `onKeyDown`. */
function isReachable(element: HTMLElement): boolean {
  let node: HTMLElement | null = element
  while (node) {
    if (node.hidden) return false
    node = node.parentElement
  }
  return true
}

/** Every `querySelectorAll(FOCUSABLE_SELECTOR)` call site in this module goes through this
 * instead, so none of them skip {@linkcode isReachable}'s own filter. */
function focusableDescendants(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isReachable,
  )
}

/** Tuning knobs for {@linkcode useFocusScope}'s focus-trap behavior. */
export type FocusScopeOptions = {
  /**
   * Which focusable descendant (by index) gets initial focus when the scope activates — default
   * `0`, the first one. `Modal` passes `1` to skip its own close button (always focusable
   * descendant #0, by construction) as the INITIAL target specifically — auto-focusing a dismissive
   * control risks an accidental close from a reflexive Enter/Space. Falls back to the previous
   * index, then to the container itself (`tabIndex={-1}`), if the requested index doesn't exist.
   * `null` moves no focus on activation at all (the trap and the restore on deactivate still apply).
   */
  initialFocusIndex?: number | null
  /**
   * Called once, at deactivate time, to decide whether to actually restore focus to whatever was
   * captured on activate. Defaults to always restoring. `Modal` passes a predicate that checks
   * `isTopModal` — closing a modal that has another one stacked on top of it must never yank focus
   * out of the modal that's still trapping it.
   */
  shouldRestoreFocus?: () => boolean
}

/** Minimal structural shape both `React.KeyboardEvent` and Preact's own native `KeyboardEvent`
 * satisfy — this module never imports React or Preact beyond the hooks it genuinely needs. Exported
 * (not just used internally) so `useFocusScope`'s own return type is nameable from outside this
 * module — the same reason `EscapeKeyEvent`/`NavigationKeyEvent` are exported from their own
 * modules. */
export type TabKeyEvent = {
  key: string
  shiftKey: boolean
  preventDefault(): void
}

/**
 * Traps `Tab`/`Shift+Tab` focus within a container while `active` is `true`, restoring focus to
 * whatever had it on activation once deactivated.
 * @param containerRef The scope's own root — focusable descendants are found within it.
 * @param active Whether the scope is currently trapping focus. Toggling this off (or unmounting
 * while `true`) triggers the capture/restore effect.
 * @returns A `Tab`-only `onKeyDown` handler — wire it into the container's own `onKeyDown`
 * alongside whatever else that component's own key handling needs (`Modal` composes it with its
 * own `Escape` branch in the same handler).
 */
export function useFocusScope(
  containerRef: { current: HTMLElement | null },
  active: boolean,
  options: FocusScopeOptions = {},
): (event: TabKeyEvent) => void {
  const { initialFocusIndex = 0, shouldRestoreFocus = () => true } = options
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    previousActiveElementRef.current = document.activeElement as HTMLElement | null
    const container = containerRef.current
    if (container && initialFocusIndex !== null) {
      const focusables = focusableDescendants(container)
      const target = focusables[initialFocusIndex] ?? focusables[0] ?? container
      // `preventScroll`: a dialog taller than the viewport must open at its top, not scrolled to
      // wherever the first content focusable (often its last element) happens to sit.
      target.focus({ preventScroll: true })
    }

    return () => {
      if (!shouldRestoreFocus()) return
      const previous = previousActiveElementRef.current
      if (previous && document.contains(previous)) previous.focus()
    }
    // `initialFocusIndex`/`shouldRestoreFocus` are read fresh via closure on every activation —
    // re-running this effect only when `active`/`containerRef` change matches `Modal`'s own
    // original effect dependency list exactly (it never depended on the options it read either).
  }, [active, containerRef])

  return (event) => {
    if (event.key !== 'Tab') return
    const container = containerRef.current
    if (!container) return
    const focusableEls = focusableDescendants(container)
    if (focusableEls.length === 0) {
      event.preventDefault()
      return
    }
    const first = focusableEls[0]
    const last = focusableEls[focusableEls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}
