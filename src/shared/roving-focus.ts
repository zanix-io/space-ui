/**
 * Arrow-key/`Home`/`End` navigation among a set of items — the WAI-ARIA APG's own "Keyboard
 * Interaction" convention shared by a tablist (roving `tabindex`, real DOM focus moves between
 * triggers) and a listbox/menu (`aria-activedescendant`, DOM focus stays on one element while a
 * different attribute tracks which option is "active"). `RadioGroup` and `Tabs` both use the
 * roving-tabindex shape via {@linkcode createRovingKeyDownHandler}; `Combobox` uses the
 * `aria-activedescendant` shape, calling {@linkcode getNextRovingIndex} directly.
 *
 * Split into two pieces on purpose: {@linkcode getNextRovingIndex} is pure arithmetic (no DOM, no
 * renderer) — the one thing roving-tabindex and `aria-activedescendant` genuinely share.
 * {@linkcode createRovingKeyDownHandler} is the roving-TABINDEX-specific DOM wiring (it moves real
 * focus) — `Combobox`, using `aria-activedescendant` instead, calls `getNextRovingIndex` directly
 * and updates its own "active option" state without ever moving real focus, since that's the
 * entire point of that pattern. Deliberately does NOT own `tabIndex` itself —
 * `index === activeIndex ? 0 : -1` is a one-line prop a consumer computes inline per item, not
 * something worth wrapping.
 *
 * A plain module, not a hook — no `useEffect`/`useRef` needed (same reasoning
 * `shared/escape-to-close.ts` documents for itself), so this is genuinely one file for both
 * renderers.
 */
export type RovingFocusOrientation = 'horizontal' | 'vertical' | 'both'

/** Minimal structural shape both `React.KeyboardEvent` and Preact's own native `KeyboardEvent`
 * satisfy — this module never imports React or Preact. Exported so
 * `createRovingKeyDownHandler`'s own return type is nameable from outside this module. */
export type NavigationKeyEvent = {
  key: string
  preventDefault(): void
}

/**
 * Pure arithmetic: given the current active index among `itemCount` items and a navigation key,
 * returns the next active index per the WAI-ARIA APG convention — wrapping at both ends (`Home`/
 * `End` jump to the first/last item regardless of orientation). Returns `null` when the key isn't
 * one this pattern handles (anything other than the relevant arrow keys/`Home`/`End`), so a caller
 * can tell "no navigation happened" apart from "navigated back to where it already was."
 *
 * `orientation: 'both'` accepts all four arrow keys — the APG's own guidance for a 2D grid-shaped
 * widget. `RadioGroup` and `Tabs` both default to `'horizontal'`; `'both'` is included for
 * completeness rather than because a grid-shaped widget in this package uses it.
 */
export function getNextRovingIndex(
  currentIndex: number,
  key: string,
  itemCount: number,
  orientation: RovingFocusOrientation = 'horizontal',
): number | null {
  if (itemCount === 0) return null

  const isNext = (orientation !== 'vertical' && key === 'ArrowRight') ||
    (orientation !== 'horizontal' && key === 'ArrowDown')
  const isPrev = (orientation !== 'vertical' && key === 'ArrowLeft') ||
    (orientation !== 'horizontal' && key === 'ArrowUp')

  if (isNext) return (currentIndex + 1) % itemCount
  if (isPrev) return (currentIndex - 1 + itemCount) % itemCount
  if (key === 'Home') return 0
  if (key === 'End') return itemCount - 1
  return null
}

/**
 * Builds an `onKeyDown` handler for the roving-TABINDEX pattern specifically: on a navigation key,
 * computes the next index via {@linkcode getNextRovingIndex}, calls `setActiveIndex`, then moves
 * real DOM focus to that item — the defining behavior of roving tabindex, as opposed to
 * `aria-activedescendant` (where focus never leaves the containing widget).
 *
 * @param getItemElement Looked up fresh at navigation time (not a captured array), the same "read
 * the current DOM, don't cache it" approach `shared/escape-to-close.ts`'s own `getRefocusTarget`
 * uses — the set of items can change between renders.
 */
export function createRovingKeyDownHandler(
  activeIndex: number,
  itemCount: number,
  setActiveIndex: (index: number) => void,
  getItemElement: (index: number) => HTMLElement | null | undefined,
  orientation: RovingFocusOrientation = 'horizontal',
): (event: NavigationKeyEvent) => void {
  return (event) => {
    const nextIndex = getNextRovingIndex(activeIndex, event.key, itemCount, orientation)
    if (nextIndex === null || nextIndex === activeIndex) return
    event.preventDefault()
    setActiveIndex(nextIndex)
    getItemElement(nextIndex)?.focus()
  }
}
