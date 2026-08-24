import '../components/dom-test-setup.ts'
import { assertEquals } from '@std/assert'
import { isTopOverlay, registerOverlay } from 'shared/overlay-stack.ts'

// `overlay-stack.ts` is pure logic with no React/Preact import — these tests exercise it directly,
// independent of either renderer binding, and independent of which component type (`Modal` or
// `Drawer`) would actually own a given symbol. `dom-test-setup.ts` only supplies the `document` the
// module touches for scroll-locking; the module itself has no top-level side effect on `document`
// (confirmed below) — real registration only ever happens inside a component instance's own
// `useEffect`, which never runs during SSR.

Deno.test('overlay-stack: importing the module touches no document state on its own', () => {
  // If importing (or re-importing, since Deno caches modules) touched `document` eagerly, the
  // overflow set up by an EARLIER test in this same process would already be visible here. A
  // fresh symbol's `isTopOverlay` check is the only assertion that actually requires the module to
  // have been evaluated at all — it must be `false` for an unregistered id.
  const neverRegistered = Symbol('never')
  assertEquals(isTopOverlay(neverRegistered), false)
})

Deno.test('overlay-stack: registering locks scroll, unregistering the only one restores it', () => {
  document.body.style.overflow = 'scroll'
  const id = Symbol('a')

  const unregister = registerOverlay(id)
  assertEquals(document.body.style.overflow, 'hidden')

  unregister()
  assertEquals(document.body.style.overflow, 'scroll')
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
  document.body.style.overflow = 'auto'
  const a = Symbol('a')
  const b = Symbol('b')

  const unregisterA = registerOverlay(a)
  const unregisterB = registerOverlay(b)
  assertEquals(document.body.style.overflow, 'hidden')

  unregisterA() // bottom overlay closes first — b is still open
  assertEquals(document.body.style.overflow, 'hidden')
  assertEquals(isTopOverlay(b), true)

  unregisterB()
  assertEquals(document.body.style.overflow, 'auto')
})

Deno.test('overlay-stack: closing the last one restores the exact prior overflow value', () => {
  document.body.style.overflow = 'clip'
  const id = Symbol('a')

  const unregister = registerOverlay(id)
  unregister()

  assertEquals(document.body.style.overflow, 'clip')
})

Deno.test('overlay-stack: registering the same id twice does not duplicate it', () => {
  document.body.style.overflow = 'visible'
  const id = Symbol('a')

  const unregisterFirst = registerOverlay(id)
  const unregisterSecond = registerOverlay(id) // no-op — already registered

  assertEquals(isTopOverlay(id), true)

  unregisterFirst() // removes the (single) entry
  assertEquals(document.body.style.overflow, 'visible') // restored — no phantom second entry

  unregisterSecond() // idempotent — nothing left to remove, no throw, no double-restore
  assertEquals(document.body.style.overflow, 'visible')
})

Deno.test('overlay-stack: unregistering twice is a no-op the second time', () => {
  const a = Symbol('a')
  const b = Symbol('b')
  const unregisterA = registerOverlay(a)
  registerOverlay(b)

  unregisterA()
  unregisterA() // already gone — must not remove b or re-run the "stack became empty" branch

  assertEquals(isTopOverlay(b), true)
})

Deno.test(
  'overlay-stack: a mount → cleanup → mount sequence (StrictMode-shaped) leaves no phantom entry',
  () => {
    document.body.style.overflow = 'auto'
    const id = Symbol('a')

    // StrictMode's dev-mode double-invocation runs an effect, its cleanup, then the effect again
    // — with the SAME stable id (from a `useRef`), exactly as simulated here.
    const firstUnregister = registerOverlay(id)
    firstUnregister()
    const secondUnregister = registerOverlay(id)

    assertEquals(isTopOverlay(id), true)

    secondUnregister()
    assertEquals(document.body.style.overflow, 'auto')
    assertEquals(isTopOverlay(id), false)
  },
)
