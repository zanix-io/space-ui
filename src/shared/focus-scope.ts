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
export const FOCUSABLE_SELECTOR: string = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** Tuning knobs for {@linkcode useFocusScope}'s focus-trap behavior. */
export type FocusScopeOptions = {
  /**
   * Which focusable descendant (by index) gets initial focus when the scope activates — default
   * `0`, the first one. `Modal` passes `1` to skip its own close button (always focusable
   * descendant #0, by construction) as the INITIAL target specifically — auto-focusing a dismissive
   * control risks an accidental close from a reflexive Enter/Space. Falls back to the previous
   * index, then to the container itself (`tabIndex={-1}`), if the requested index doesn't exist.
   */
  initialFocusIndex?: number
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
    if (container) {
      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      const target = focusables[initialFocusIndex] ?? focusables[0] ?? container
      target.focus()
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
    const focusableEls = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
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
