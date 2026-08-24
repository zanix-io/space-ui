import './dom-test-setup.ts'
import { assertEquals, assertStringIncludes } from '@std/assert'
import { subscribeScript } from 'shared/script-loader-dom.ts'
import type { ScriptLoaderState } from 'shared/script-loader-dom.ts'

// `happy-dom`'s own default `Window` settings (`dom-test-setup.ts` installs one with no overrides)
// have `enableJavaScriptEvaluation: false` — real, confirmed behavior: appending ANY `<script src>`
// to `document.head` fires a synchronous `error` event of its own (`"...JavaScript file loading is
// disabled"`), before this test file's own subscriber is even attached. This is a real environment
// quirk, not something `script-loader-dom.ts` itself does — tests below account for it by only
// asserting what's actually deterministic here (dedup, and state transitions this file drives
// itself via a manually-dispatched `load`/`error` event, which always runs LAST and so always
// wins), never the exact identity of whatever happy-dom's own auto-error happened to leave behind.
function scriptsFor(src: string): HTMLScriptElement[] {
  return Array.from(document.head.querySelectorAll('script')).filter(
    (el) => (el as HTMLScriptElement).src === src,
  ) as HTMLScriptElement[]
}

Deno.test('subscribeScript: injects one script per src, replays state synchronously', () => {
  const src = 'https://example.com/one.js'
  const states: ScriptLoaderState[] = []
  const unsubscribe = subscribeScript(src, 'ExampleProvider', (state) => states.push(state))

  assertEquals(scriptsFor(src).length, 1)
  // The subscriber was already called at least once, synchronously, by the time `subscribeScript`
  // returns — no `await`/timer needed to observe the initial replay.
  assertEquals(states.length >= 1, true)

  unsubscribe()
})

Deno.test('subscribeScript: a second subscriber for the same src injects no second script', () => {
  const src = 'https://example.com/two.js'
  const unsubscribeFirst = subscribeScript(src, 'ExampleProvider', () => {})
  const unsubscribeSecond = subscribeScript(src, 'ExampleProvider', () => {})

  assertEquals(scriptsFor(src).length, 1)

  unsubscribeFirst()
  unsubscribeSecond()
})

Deno.test('subscribeScript: a different src gets its own independent <script>', () => {
  const srcA = 'https://example.com/a.js'
  const srcB = 'https://example.com/b.js'
  const unsubscribeA = subscribeScript(srcA, 'ExampleProvider', () => {})
  const unsubscribeB = subscribeScript(srcB, 'ExampleProvider', () => {})

  assertEquals(scriptsFor(srcA).length, 1)
  assertEquals(scriptsFor(srcB).length, 1)

  unsubscribeA()
  unsubscribeB()
})

Deno.test('subscribeScript: the script load event notifies subscribers with status ready', () => {
  const src = 'https://example.com/ready.js'
  const states: ScriptLoaderState[] = []
  const unsubscribe = subscribeScript(src, 'ExampleProvider', (state) => states.push(state))

  const script = scriptsFor(src)[0]
  script.dispatchEvent(new Event('load'))

  assertEquals(states[states.length - 1], { status: 'ready', error: null })

  unsubscribe()
})

Deno.test('subscribeScript: the script error event notifies error with a CSP hint', () => {
  const src = 'https://example.com/blocked.js'
  const states: ScriptLoaderState[] = []
  const unsubscribe = subscribeScript(src, 'ExampleProvider', (state) => states.push(state))

  const script = scriptsFor(src)[0]
  script.dispatchEvent(new Event('error'))

  const last = states[states.length - 1]
  assertEquals(last.status, 'error')
  assertStringIncludes(last.error ?? '', 'ExampleProvider')
  assertStringIncludes(last.error ?? '', src)
  assertStringIncludes(last.error ?? '', 'script-src')
  assertStringIncludes(last.error ?? '', 'frame-src')
  assertStringIncludes(last.error ?? '', 'Content-Security-Policy')

  unsubscribe()
})

Deno.test('subscribeScript: unsubscribe stops further notifications for that subscriber', () => {
  const src = 'https://example.com/unsub.js'
  const states: ScriptLoaderState[] = []
  const unsubscribe = subscribeScript(src, 'ExampleProvider', (state) => states.push(state))
  const countBeforeUnsubscribe = states.length
  unsubscribe()

  const script = scriptsFor(src)[0]
  script.dispatchEvent(new Event('load'))

  // The `load` dispatched AFTER unsubscribing never reached this subscriber — the recorded count
  // is exactly what it was the instant `unsubscribe()` was called, not one more.
  assertEquals(states.length, countBeforeUnsubscribe)
})

Deno.test('subscribeScript: a late subscriber replays the resolved state, not re-injected', () => {
  const src = 'https://example.com/late.js'
  const unsubscribeEarly = subscribeScript(src, 'ExampleProvider', () => {})

  const script = scriptsFor(src)[0]
  script.dispatchEvent(new Event('load'))

  const late: ScriptLoaderState[] = []
  const unsubscribeLate = subscribeScript(src, 'ExampleProvider', (state) => late.push(state))

  assertEquals(scriptsFor(src).length, 1)
  assertEquals(late, [{ status: 'ready', error: null }])

  unsubscribeEarly()
  unsubscribeLate()
})
