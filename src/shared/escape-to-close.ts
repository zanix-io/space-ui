/**
 * `Escape` closes something and returns focus to whatever triggered it — the exact shape `Menu`'s
 * own toggle and each of its submenu items need: a guard condition, `stopPropagation` so an outer
 * level's own handler never runs for a key an inner level already handled, close, then move focus
 * back to the control that opened it.
 *
 * A plain function, not a hook — no `useEffect`/`useRef` needed, since (unlike
 * `close-on-outside.ts`'s own `useCloseOnOutside`, which subscribes a listener once and must stay
 * fresh across many renders without re-subscribing) this only ever gets wired into a JSX element's own
 * `onKeyDown` prop, called fresh on every render — the same way `Menu`'s own inline handler always
 * was, so there's no closure-staleness risk to guard against here. This is also why one file
 * genuinely covers both renderers: `React.KeyboardEvent` and Preact's own native `KeyboardEvent`
 * both structurally satisfy {@linkcode EscapeKeyEvent} — this module never imports React or Preact.
 *
 * Deliberately NOT used by `Modal`, despite superficially "also closing on `Escape`": `Modal`
 * doesn't do inline refocus at all (a separate, more general effect restores focus for ANY close
 * reason — Escape, backdrop click, an external `open={false}` — checked at cleanup time via
 * `isTopModal`, not tied to the `Escape` key specifically), and its own `Escape` branch is merged
 * into the same handler as `Tab`-cycling. Forcing `Modal` onto this shape would either lose that
 * correctness or need enough opt-out parameters to defeat the point of sharing it at all — see
 * `Modal/index.ts`'s own "Focus management" doc section for its actual mechanism.
 */
/** Exported so `createEscapeToCloseHandler`'s own return type is nameable from outside this
 * module. */
export type EscapeKeyEvent = {
  key: string
  stopPropagation(): void
}

/**
 * Builds an `onKeyDown` handler: `Escape` (while `active`) stops the key from bubbling further,
 * calls `onClose`, then focuses whatever `getRefocusTarget()` currently resolves to (a fresh
 * lookup at close time, not a captured reference — the DOM node a `querySelector`/ref points at
 * can change between renders).
 */
export function createEscapeToCloseHandler(
  active: boolean,
  onClose: () => void,
  getRefocusTarget: () => HTMLElement | null | undefined,
): (event: EscapeKeyEvent) => void {
  return (event) => {
    if (!active || event.key !== 'Escape') return
    event.stopPropagation()
    onClose()
    getRefocusTarget()?.focus()
  }
}
