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
 *
 * **Body scroll lock is a CSSOM rule inside a nonced `<style>` element, never `document.body.style
 * .overflow` directly**: a real, confirmed-in-browser violation of `@zanix/space`'s own zero-config
 * default CSP (`style-src 'self' 'nonce-<per-request>'`) — browsers block `element.style.setProperty
 * (...)`/a plain `.style.<prop> = ...` assignment under `style-src` exactly like an inline `style`
 * attribute, and a nonce never covers either (see `overlay-position-css.ts`'s own doc for the full
 * reasoning `Modal`/`Drawer` already apply to their own positioning styles). `getOrCreateLockStyleEl`
 * below mirrors that same `sheet.insertRule` technique for the ONE shared `body{overflow:hidden}`
 * rule every overlay in the stack shares, toggled on/off by inserting/deleting that single rule
 * rather than touching `document.body.style` at all.
 */

let stack: symbol[] = []
let lockStyleEl: HTMLStyleElement | null = null

/** Gets (creating if needed) the shared, nonced `<style>` element `registerOverlay` inserts its one
 * `body{overflow:hidden}` rule into — module-level and lazily created, same "one shared element for
 * the module's own lifetime" shape `comet-persist-transition.ts` (`@zanix/space`) uses for its own
 * shared rule set, since a body-scroll lock has no per-component-instance element of its own to live
 * in the way `Modal`/`Drawer`'s own positioning styles do. */
function getOrCreateLockStyleEl(nonce: string | undefined): HTMLStyleElement | null {
  if (typeof document === 'undefined') return null
  if (lockStyleEl?.isConnected) return lockStyleEl
  const el = document.createElement('style')
  // Assigned BEFORE `appendChild` — a nonce-based CSP evaluates a `<style>` element the INSTANT it
  // enters the document; setting `.nonce` any later is already too late (same ordering
  // `comet-persist-transition.ts`'s own `getOrCreateStyleElement` requires).
  if (nonce) el.nonce = nonce
  document.head.appendChild(el)
  lockStyleEl = el
  return el
}

/** Registers `id` as an open overlay (a no-op if already registered) and returns the matching
 * unregister function (also a no-op if called more than once, or after `id` is already gone) —
 * safe to call from an effect that may run its cleanup and setup again, e.g. React StrictMode's
 * dev-mode double-invocation, without ever producing a duplicate or phantom stack entry.
 *
 * @param nonce - The consuming page's own CSP nonce, when running under a nonce-based `style-src`
 * — the same value already threaded into `Modal`/`Drawer`'s own `<style nonce={nonce}>` element at
 * their call site. Omit on a page with no such CSP; the lock style element then carries no `nonce`
 * attribute either, same as `comet-persist-transition.ts`'s own doc establishes for that case. */
export function registerOverlay(id: symbol, nonce?: string): () => void {
  if (!stack.includes(id)) {
    if (stack.length === 0) {
      const sheet = getOrCreateLockStyleEl(nonce)?.sheet
      sheet?.insertRule('body{overflow:hidden}', sheet.cssRules.length)
    }
    stack = [...stack, id]
  }

  return () => {
    if (!stack.includes(id)) return
    stack = stack.filter((entry) => entry !== id)
    if (stack.length === 0) {
      const sheet = lockStyleEl?.sheet
      if (sheet) {
        while (sheet.cssRules.length > 0) sheet.deleteRule(0)
      }
    }
  }
}

/** True exactly for the most-recently-registered still-open overlay (a `Modal` or a `Drawer`) —
 * the only one that should react to `Escape` or trap `Tab`. */
export function isTopOverlay(id: symbol): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id
}
