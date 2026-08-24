// deno-coverage-ignore-file

// `Showcase`'s own responsive contract lives inside a `ResizeObserver` effect, which
// `renderToStaticMarkup`/`preact-render-to-string` never run — `showcase.test.tsx`/
// `showcase-preact.test.tsx` mount into the real DOM `dom-test-setup.ts` installs, and drive
// `ResizeObserver` through this small, fully deterministic mock instead of real layout — jsdom
// (confirmed empirically, this repo's own pinned version) implements no `ResizeObserver` at all,
// so importing this file is required, not optional, for anything that measures a container.
import './dom-test-setup.ts'

// deno-lint-ignore no-explicit-any
const globals = globalThis as any

/**
 * A minimal, fully controllable `ResizeObserver` stand-in: no real layout, no actual geometry.
 * `resize(element, width)` fires a synthetic entry — only `contentRect.width` is populated, the
 * one field this package's own `Showcase` ever reads — for whichever observer is currently
 * watching that element. Restores the previous global on `restore()`.
 */
export function installResizeObserverMock() {
  const previous = globals.ResizeObserver
  const active = new Map<Element, { callback: ResizeObserverCallback; instance: unknown }>()

  class MockResizeObserver {
    #callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
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

  globals.ResizeObserver = MockResizeObserver

  return {
    /** Fires a single entry with `contentRect.width = width` for `element`'s current observer, if
     * any — a no-op if nothing is observing it (e.g. after unmount/`disconnect`). */
    resize(element: Element, width: number) {
      const entry = active.get(element)
      entry?.callback(
        [{ contentRect: { width } } as ResizeObserverEntry],
        entry.instance as ResizeObserver,
      )
    },
    /** True once nothing is observing `element` any more (via `unobserve`/`disconnect`). */
    isObserved(element: Element) {
      return active.has(element)
    },
    restore() {
      globals.ResizeObserver = previous
    },
  }
}
