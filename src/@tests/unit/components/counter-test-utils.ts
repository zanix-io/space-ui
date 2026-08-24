// `Counter`'s entire contract — reveal-once, the animation loop, cleanup — lives inside effects,
// which `renderToStaticMarkup`/`preact-render-to-string` never run. Both `counter.test.tsx` and
// `counter-preact.test.tsx` mount into the real DOM `dom-test-setup.ts` installs, and drive
// `IntersectionObserver`/`requestAnimationFrame` through small, fully deterministic mocks instead
// of real wall-clock time or a real viewport — see each mock's own doc for why.
import './dom-test-setup.ts'

// deno-lint-ignore no-explicit-any
const globals = globalThis as any

/**
 * A minimal, fully controllable `IntersectionObserver` stand-in: no real geometry, no timers of
 * its own. `intersect(element)` fires `isIntersecting: true` for whichever observer is currently
 * watching that element, exactly once, synchronously — a test drives the "became visible" moment
 * directly instead of racing a real viewport/scroll. Restores the previous global on `restore()`.
 */
export function installIntersectionObserverMock() {
  const previous = globals.IntersectionObserver
  const active = new Map<Element, { callback: IntersectionObserverCallback; instance: unknown }>()

  class MockIntersectionObserver {
    #callback: IntersectionObserverCallback
    constructor(callback: IntersectionObserverCallback) {
      this.#callback = callback
    }
    public observe(target: Element) {
      active.set(target, { callback: this.#callback, instance: this })
    }
    public unobserve(target: Element) {
      active.delete(target)
    }
    public disconnect() {
      for (const [target, entry] of active) {
        if (entry.instance === this) active.delete(target)
      }
    }
  }

  globals.IntersectionObserver = MockIntersectionObserver

  return {
    /** Fires a single `isIntersecting: true` entry for `element`'s current observer, if any. */
    intersect(element: Element) {
      const entry = active.get(element)
      entry?.callback(
        [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
        entry.instance as IntersectionObserver,
      )
    },
    /** True once nothing is observing `element` any more (via `unobserve`/`disconnect`). */
    isObserved(element: Element) {
      return active.has(element)
    },
    restore() {
      globals.IntersectionObserver = previous
    },
  }
}

/**
 * A deterministic replacement for `requestAnimationFrame`/`cancelAnimationFrame`/`Date.now` — a
 * test advances a fake clock by an exact number of milliseconds and flushes exactly the frames
 * that would have fired by then, rather than waiting on real wall-clock time (which would make the
 * animation's own tests slow and timing-flaky).
 */
export function installFrameClock() {
  const previousRaf = globals.requestAnimationFrame
  const previousCaf = globals.cancelAnimationFrame
  const previousNow = Date.now

  let now = 0
  let nextId = 1
  const pending = new Map<number, FrameRequestCallback>()

  Date.now = () => now
  globals.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const id = nextId++
    pending.set(id, callback)
    return id
  }
  globals.cancelAnimationFrame = (id: number) => {
    pending.delete(id)
  }

  return {
    /** Advances the fake clock and runs every frame callback scheduled up to that point — a
     * callback that schedules another frame during this flush is NOT run again in the same call
     * (matches one real animation frame: at most one `step` per `advance`). */
    advance(ms: number) {
      now += ms
      const due = [...pending.entries()]
      pending.clear()
      for (const [, callback] of due) callback(now)
    },
    pendingFrameCount() {
      return pending.size
    },
    restore() {
      globals.requestAnimationFrame = previousRaf
      globals.cancelAnimationFrame = previousCaf
      Date.now = previousNow
    },
  }
}
