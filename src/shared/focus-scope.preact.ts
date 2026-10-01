import { useEffect, useRef } from 'preact/hooks'

/**
 * Preact binding — see `focus-scope.ts`'s own doc for the full contract (extracted from `Modal`'s
 * own focus trap once `Drawer` became a real second consumer; deliberately excludes `Escape`
 * handling). Same contract, same behavior, independent implementation.
 */
// See `focus-scope.ts`'s own identical constant for why `:not([type="hidden"])` is there.
export const FOCUSABLE_SELECTOR: string = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** See `focus-scope.ts`'s own identical helper for the full reasoning. */
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

/** Options controlling {@linkcode useFocusScope}'s initial-focus and restore-focus behavior — see
 * `focus-scope.ts`'s own doc for the full contract. */
export type FocusScopeOptions = {
  initialFocusIndex?: number
  shouldRestoreFocus?: () => boolean
}

/** Minimal structural shape both `React.KeyboardEvent` and Preact's own native `KeyboardEvent`
 * satisfy — exported so {@linkcode useFocusScope}'s own return type is nameable from outside this
 * module. */
export type TabKeyEvent = {
  key: string
  shiftKey: boolean
  preventDefault(): void
}

/** Preact binding of the focus-trap hook — see `focus-scope.ts`'s own `useFocusScope` doc for the
 * full contract (params, return value, behavior). Same contract, independent implementation. */
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
      const focusables = focusableDescendants(container)
      const target = focusables[initialFocusIndex] ?? focusables[0] ?? container
      target.focus()
    }

    return () => {
      if (!shouldRestoreFocus()) return
      const previous = previousActiveElementRef.current
      if (previous && document.contains(previous)) previous.focus()
    }
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
