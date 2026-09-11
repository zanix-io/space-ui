// `Countdown`'s entire contract (the wall-clock tick loop, `onComplete`, the throttled `aria-live`
// announcements) lives inside effects, which `renderToStaticMarkup`/`preact-render-to-string` never
// run — both `countdown.test.tsx` and `countdown-preact.test.tsx` mount into the real DOM
// `dom-test-setup.ts` installs, driving `Date.now`/`setInterval` through this deterministic mock
// instead of real wall-clock time (which would make this component's own tests slow and
// timing-flaky). Same reasoning `counter-test-utils.ts`'s own `installFrameClock` already
// establishes, for `setInterval`/`clearInterval` instead of `requestAnimationFrame`/
// `cancelAnimationFrame` — `Countdown` ticks on a real interval (see `Countdown/render.ts`'s own
// doc for why a recurring interval, re-anchored to `Date.now()` on every firing, is the right shape
// here, unlike `Counter`'s one-shot-per-frame animation loop).
import './dom-test-setup.ts'

// deno-lint-ignore no-explicit-any
const globals = globalThis as any

/**
 * A deterministic replacement for `Date.now`/`setInterval`/`clearInterval` — a test moves the fake
 * clock forward by an exact number of milliseconds and fires exactly the interval callbacks due by
 * then (each one re-scheduled for its own next period, matching a real `setInterval`'s repeating
 * behavior — unlike `installFrameClock`'s one-shot-per-`advance` `requestAnimationFrame` mock).
 */
export function installIntervalClock() {
  const previousSetInterval = globals.setInterval
  const previousClearInterval = globals.clearInterval
  const previousNow = Date.now

  let now = 0
  let nextId = 1
  const intervals = new Map<number, { callback: () => void; period: number; nextFireAt: number }>()

  Date.now = () => now
  globals.setInterval = (callback: () => void, period = 0) => {
    const id = nextId++
    intervals.set(id, { callback, period, nextFireAt: now + period })
    return id
  }
  globals.clearInterval = (id: number) => {
    intervals.delete(id)
  }

  return {
    /**
     * Advances the fake clock by `ms`. Deliberately does NOT fire once per missed period boundary
     * — a real browser throttling/suspending a backgrounded tab's timers coalesces any number of
     * missed periods into at most ONE catch-up callback once it resumes, never queuing up the
     * missed count. Firing at most once per still-due interval here (moving its own `nextFireAt`
     * straight to `now + period`, not incrementally through every boundary skipped) reproduces
     * that real coalescing behavior — the same real gap a naive `setInterval(() => setCount(c =>
     * c - period), period)` decrement would get wrong (it would only ever subtract one period's
     * worth per callback, regardless of how much real wall-clock time actually elapsed), and the
     * same gap `Countdown/render.ts`'s own wall-clock re-anchoring (`target - Date.now()`, recomputed
     * fresh on every callback) is specifically built to self-correct for automatically.
     */
    advance(ms: number) {
      now += ms
      for (const timer of intervals.values()) {
        if (timer.nextFireAt > now) continue
        timer.nextFireAt = now + timer.period
        timer.callback()
      }
    },
    restore() {
      globals.setInterval = previousSetInterval
      globals.clearInterval = previousClearInterval
      Date.now = previousNow
    },
  }
}
