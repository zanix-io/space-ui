/**
 * Minimal module-level coordination between simultaneously-open blocking overlays — not a store,
 * not Context, not Zustand. Extracted verbatim from `Modal`'s own `modal-stack.ts` (renamed
 * `registerModal`/`isTopModal` → `registerOverlay`/`isTopOverlay`, otherwise byte-for-byte
 * identical logic) once `Drawer` became the second real consumer this doc's own "Foundation
 * primitives" table already anticipated — the exact trigger condition already named for this move.
 *
 * Sharing ONE stack across both component types (rather than `Modal` and `Drawer` each keeping
 * their own) is the actual point of extracting this now, not just a rename: if a `Modal` opens a
 * `Drawer` (or vice versa), only the genuinely topmost of either type should trap `Tab`/respond to
 * `Escape`, and the page's scroll should stay locked for as long as ANY of either is open, restored
 * only once the very last one — regardless of which kind it is — closes. Two independent stacks
 * couldn't provide that.
 *
 * Every instance registers itself (via its own stable `Symbol`, from a `useRef`) in a `useEffect`
 * when it opens — never at import or render time, so this module never touches `document` during
 * SSR — and unregisters on close/unmount.
 *
 * Pure logic, no React/Preact import at all — genuinely shareable between both bindings verbatim.
 */

let stack: symbol[] = []
let savedBodyOverflow: string | null = null

/** Registers `id` as an open overlay (a no-op if already registered) and returns the matching
 * unregister function (also a no-op if called more than once, or after `id` is already gone) —
 * safe to call from an effect that may run its cleanup and setup again, e.g. React StrictMode's
 * dev-mode double-invocation, without ever producing a duplicate or phantom stack entry. */
export function registerOverlay(id: symbol): () => void {
  if (!stack.includes(id)) {
    if (stack.length === 0 && typeof document !== 'undefined') {
      savedBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    stack = [...stack, id]
  }

  return () => {
    if (!stack.includes(id)) return
    stack = stack.filter((entry) => entry !== id)
    if (stack.length === 0 && typeof document !== 'undefined') {
      document.body.style.overflow = savedBodyOverflow ?? ''
      savedBodyOverflow = null
    }
  }
}

/** True exactly for the most-recently-registered still-open overlay (a `Modal` or a `Drawer`) —
 * the only one that should react to `Escape` or trap `Tab`. */
export function isTopOverlay(id: symbol): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id
}
