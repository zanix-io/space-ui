// deno-coverage-ignore-file

// Shared real-DOM bootstrap for the components in this package whose contract can't be verified
// from static SSR markup alone (`renderToStaticMarkup`/`preact-render-to-string` never run
// `useEffect`) — `Counter` was the first; `Menu` (real focus/keyboard/outside-click interaction)
// is the second, which is what justifies this now being its own shared file rather than living
// inline in `counter-test-utils.ts` as a one-off. Side-effecting on import: importing this module
// once installs a single `happy-dom` document/window for the whole `deno test` process (ES modules
// are evaluated once and cached, so every test file importing this — directly or transitively —
// shares the same instance).
import { Window } from 'happy-dom'

const dom = new Window()
// deno-lint-ignore no-explicit-any
const globals = globalThis as any
globals.window = dom
globals.document = dom.document
globals.navigator = dom.navigator
globals.HTMLElement = dom.HTMLElement
globals.Node = dom.Node
globals.Event = dom.Event
globals.MouseEvent = dom.MouseEvent
globals.KeyboardEvent = dom.KeyboardEvent
globals.FocusEvent = dom.FocusEvent
// Silences React's own "environment not configured for act()" warning — this file IS that
// configuration, just not through the officially-recognized `@testing-library/react` setup path
// React looks for by default. Preact's own `act()` (`preact/test-utils`) needs no equivalent flag.
globals.IS_REACT_ACT_ENVIRONMENT = true
// Window-level APIs (as opposed to `document`/element-level ones like `HTMLElement`/`Event` above)
// — this project's own lint config (`no-window`/`no-window-prefix`) requires real source to reach
// these through bare `globalThis`, never through a `window` identifier (Deno has no global `window`
// at all outside this test bootstrap; `globalThis` is what's universal, and equals `window` in a
// real browser) — `positioning-dom.ts` is written that way. Bridged here so that convention keeps
// working under `happy-dom`: `getComputedStyle`/`innerWidth`/`innerHeight`/`addEventListener`/
// `removeEventListener` all proxy straight to `dom` (happy-dom's `Window` instance IS the window,
// unlike `jsdom`'s `JSDOM` wrapper which needed a `.window` hop).
globals.getComputedStyle = dom.getComputedStyle.bind(dom)
globals.addEventListener = dom.addEventListener.bind(dom)
globals.removeEventListener = dom.removeEventListener.bind(dom)
Object.defineProperty(globals, 'innerWidth', {
  configurable: true,
  get: () => dom.innerWidth,
})
Object.defineProperty(globals, 'innerHeight', {
  configurable: true,
  get: () => dom.innerHeight,
})
// `dispatchEvent` is deliberately NOT bridged onto bare `globalThis` — Deno's OWN runtime dispatches
// its own native `load`/`unload` events on `globalThis` using its own native `Event` class once the
// process/worker finishes, and routing that through happy-dom's `Window.dispatchEvent` (which
// validates its argument against happy-dom's own idl-tagged `Event`) throws. A real collision,
// confirmed via a throwaway repro script, not a hypothetical one. Tests that need to fire a
// window-level event (`scroll`/`resize`) use {@linkcode dispatchWindowEvent} below instead, which
// dispatches directly on `dom` — the same target `addEventListener` above actually registered
// listeners on.
export function dispatchWindowEvent(event: Event) {
  // Compile-time `Event` here is `lib.dom`'s ambient type (what every call site's own
  // `new Event(...)` resolves to statically) — at runtime it's actually a `happy-dom` `Event`
  // instance, because `globals.Event` above was reassigned to `dom.Event`. `happy-dom` types its
  // own `Event` nominally (private `PropertySymbol`-keyed fields), so the two named `Event` types
  // don't structurally unify even though the runtime object is exactly what `dispatchEvent`
  // expects. Cast through `unknown` at this one boundary rather than typing every call site's
  // `new Event(...)` against `happy-dom`'s own type.
  dom.dispatchEvent(event as unknown as Parameters<typeof dom.dispatchEvent>[0])
}

/** Narrows a nullable DOM query result without `!` (banned by this project's own lint config) —
 * throws with a clear message instead of silently continuing with `null`. */
export function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Expected a non-null value, got ' + String(value))
  }
  return value
}

/**
 * A deterministic replacement for `setTimeout`/`clearTimeout` — a fake clock a test advances by an
 * exact number of milliseconds, firing exactly the timeouts that would have fired by then, instead
 * of waiting on real wall-clock time. Same shape and reasoning as `counter-test-utils.ts`'s own
 * `installFrameClock`, for a different timer API (`Slider`'s autoplay uses `setTimeout`, not
 * `requestAnimationFrame`).
 */
export function installTimerMock() {
  const previousSetTimeout = globals.setTimeout
  const previousClearTimeout = globals.clearTimeout

  let now = 0
  let nextId = 1
  const pending = new Map<number, { callback: () => void; fireAt: number }>()

  globals.setTimeout = (callback: () => void, delay = 0) => {
    const id = nextId++
    pending.set(id, { callback, fireAt: now + delay })
    return id
  }
  globals.clearTimeout = (id: number) => {
    pending.delete(id)
  }

  return {
    /** Advances the fake clock and runs every timeout callback due by that point — a callback
     * that schedules another timeout during this flush is NOT run again in the same call. */
    advance(ms: number) {
      now += ms
      const due = [...pending.entries()].filter(([, timer]) => timer.fireAt <= now)
      for (const [id] of due) pending.delete(id)
      for (const [, timer] of due) timer.callback()
    },
    pendingCount() {
      return pending.size
    },
    restore() {
      globals.setTimeout = previousSetTimeout
      globals.clearTimeout = previousClearTimeout
    },
  }
}
