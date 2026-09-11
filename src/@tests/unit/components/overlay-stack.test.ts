import '../components/dom-test-setup.ts'
import { assert, assertEquals, assertFalse } from '@std/assert'
import { isTopOverlay, registerOverlay } from 'shared/overlay-stack.ts'
import { bodyScrollLockRuleExists, isBodyScrollLockRule } from './overlay-scroll-lock-test-utils.ts'

// `overlay-stack.ts` is pure logic with no React/Preact import — these tests exercise it directly,
// independent of either renderer binding, and independent of which component type (`Modal` or
// `Drawer`) would actually own a given symbol. `dom-test-setup.ts` only supplies the `document` the
// module touches for scroll-locking; the module itself has no top-level side effect on `document`
// (confirmed below) — real registration only ever happens inside a component instance's own
// `useEffect`, which never runs during SSR.
//
// The scroll lock itself is a `body{overflow:hidden}` CSSOM rule inside a shared `<style>`
// element — never `document.body.style.overflow` directly, which a nonce-based CSP blocks exactly
// like an inline `style` attribute (see `overlay-stack.ts`'s own doc, and
// `overlay-scroll-lock-test-utils.ts`'s own doc for why these tests check it this way). `Modal`/
// `Drawer`'s own test files (both renderers) share that same helper for their own scroll-lock
// assertions, rather than each re-implementing this.

function lockStyleElement(): HTMLStyleElement | undefined {
  return Array.from(document.head.querySelectorAll('style')).find((el) =>
    Array.from(el.sheet?.cssRules ?? []).some(isBodyScrollLockRule)
  )
}

Deno.test('overlay-stack: importing the module touches no document state on its own', () => {
  // If importing (or re-importing, since Deno caches modules) touched `document` eagerly, the
  // lock rule an EARLIER test in this same process already inserted would still be visible here
  // even with nothing currently registered. A fresh symbol's `isTopOverlay` check is the only
  // assertion that actually requires the module to have been evaluated at all — it must be
  // `false` for an unregistered id.
  const neverRegistered = Symbol('never')
  assertEquals(isTopOverlay(neverRegistered), false)
})

// Runs BEFORE any other test in this file ever calls `registerOverlay` — the shared lock `<style>`
// element is created once, lazily, on the FIRST call in this process and reused (never
// recreated/re-nonced) for every call after, the same one-shot-at-creation nonce assignment
// `comet-persist-transition.ts`'s own `getOrCreateStyleElement` establishes. A later test in this
// file registering with no `nonce` argument at all would otherwise reuse this same already-nonced
// element harmlessly (a stale nonce on an element nothing re-checks isn't observable), but the
// REVERSE order would make this assertion itself fail — so it deliberately runs first.
Deno.test('overlay-stack: the shared lock style element carries the given nonce', () => {
  const id = Symbol('a')

  const unregister = registerOverlay(id, 'test-nonce-123')
  assertEquals(lockStyleElement()?.nonce, 'test-nonce-123')

  unregister()
})

Deno.test('overlay-stack: registering locks scroll, unregistering the only one restores it', () => {
  const id = Symbol('a')

  const unregister = registerOverlay(id)
  assert(bodyScrollLockRuleExists(), 'expected a body{overflow:hidden} rule while registered')

  unregister()
  assertFalse(bodyScrollLockRuleExists(), 'expected the rule removed once unregistered')
})

Deno.test('overlay-stack: the single registered overlay is always top', () => {
  const id = Symbol('a')
  const unregister = registerOverlay(id)

  assertEquals(isTopOverlay(id), true)

  unregister()
})

Deno.test('overlay-stack: with multiple registered, the most recently registered is top', () => {
  const a = Symbol('a')
  const b = Symbol('b')

  const unregisterA = registerOverlay(a)
  assertEquals(isTopOverlay(a), true)

  const unregisterB = registerOverlay(b)
  assertEquals(isTopOverlay(a), false)
  assertEquals(isTopOverlay(b), true)

  unregisterB()
  unregisterA()
})

Deno.test('overlay-stack: mixing two "kinds" (a Modal id and a Drawer id) shares one stack', () => {
  // Nothing in this module distinguishes which component type a symbol belongs to — that's the
  // actual point of the shared stack, verified directly: a Modal opening a Drawer (or vice versa)
  // stacks exactly like two of the same kind would.
  const modalId = Symbol('modal')
  const drawerId = Symbol('drawer')

  const unregisterModal = registerOverlay(modalId)
  assertEquals(isTopOverlay(modalId), true)

  const unregisterDrawer = registerOverlay(drawerId)
  assertEquals(isTopOverlay(modalId), false)
  assertEquals(isTopOverlay(drawerId), true)

  unregisterDrawer()
  assertEquals(isTopOverlay(modalId), true)

  unregisterModal()
})

Deno.test('overlay-stack: closing the bottom overlay does not affect scroll lock', () => {
  const a = Symbol('a')
  const b = Symbol('b')

  const unregisterA = registerOverlay(a)
  const unregisterB = registerOverlay(b)
  assert(bodyScrollLockRuleExists())

  unregisterA() // bottom overlay closes first — b is still open
  assert(bodyScrollLockRuleExists())
  assertEquals(isTopOverlay(b), true)

  unregisterB()
  assertFalse(bodyScrollLockRuleExists())
})

Deno.test('overlay-stack: registering the same id twice does not duplicate it', () => {
  const id = Symbol('a')

  const unregisterFirst = registerOverlay(id)
  const unregisterSecond = registerOverlay(id) // no-op — already registered

  assertEquals(isTopOverlay(id), true)

  unregisterFirst() // removes the (single) entry
  assertFalse(bodyScrollLockRuleExists()) // no phantom second entry keeping it locked

  unregisterSecond() // idempotent — nothing left to remove, no throw, no double-unlock
  assertFalse(bodyScrollLockRuleExists())
})

Deno.test('overlay-stack: unregistering twice is a no-op the second time', () => {
  const a = Symbol('a')
  const b = Symbol('b')
  const unregisterA = registerOverlay(a)
  const unregisterB = registerOverlay(b)

  unregisterA()
  unregisterA() // already gone — must not remove b or re-run the "stack became empty" branch

  assertEquals(isTopOverlay(b), true)
  assert(bodyScrollLockRuleExists(), 'b is still open — the lock must still be in effect')

  unregisterB() // leaves the shared module-level stack empty for whichever test runs next
})

Deno.test(
  'overlay-stack: a mount → cleanup → mount sequence (StrictMode-shaped) leaves no phantom entry',
  () => {
    const id = Symbol('a')

    // StrictMode's dev-mode double-invocation runs an effect, its cleanup, then the effect again
    // — with the SAME stable id (from a `useRef`), exactly as simulated here.
    const firstUnregister = registerOverlay(id)
    firstUnregister()
    const secondUnregister = registerOverlay(id)

    assertEquals(isTopOverlay(id), true)

    secondUnregister()
    assertFalse(bodyScrollLockRuleExists())
    assertEquals(isTopOverlay(id), false)
  },
)
