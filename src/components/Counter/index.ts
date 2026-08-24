import { createElement, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createCounter } from './render.ts'
import type { CounterProps } from './types.ts'

/**
 * A number that animates from `0` up to {@linkcode CounterProps.target} the first time it becomes
 * visible, and never again. Real implementation shared with the Preact binding via `render.ts`'s
 * own `createCounter` (see that file's own doc for how — hook injection, including real
 * `useEffect`/`useRef` usage, empirically confirmed sound); import from `@zanix/space-ui/preact`
 * instead for the Preact one, same contract, same rendered behavior. The rendered `<span>` carries
 * `data-space-ui="counter"`, same convention as every other component's own genuine root element.
 *
 * ## Reveal-once, no `Lazy`/`LayoutContainer`
 *
 * The component this rescues gated its count-up animation behind a separate, general-purpose
 * `LayoutContainer`/`Lazy` wrapper (`IntersectionObserver` + an unrelated event-based lazy path,
 * a global pub/sub singleton, a `RichText`-rendered placeholder). None of that is ported: the only
 * real capability with a live consumer was "don't start counting until visible, and only once" —
 * that lives here, inline, as this component's own concern, not a new public `Lazy` primitive.
 * `IntersectionObserver`, `threshold: 0.05` (matching the original), observes this component's own
 * root node directly; `observer.unobserve(entry.target)` fires on the very first
 * `entry.isIntersecting`, so the observer never runs again for this instance. No `resize`,
 * `matchMedia`, or `content-visibility` involved: those solve a rendering-cost problem, not "tell
 * me when a JS timer should start" — a different problem `IntersectionObserver` is the actual
 * purpose-built API for.
 *
 * ## SSR / before the first intersection: `null`
 *
 * Before intersecting — including the entire SSR-rendered markup and the first client render
 * before hydration — the animated number is simply absent (`null`), not `0` and not a placeholder
 * of any kind. Same state on server and first client render, so there is no hydration mismatch to
 * reconcile. Unlike the component this rescues, though, {@linkcode CounterProps.target}'s final
 * value IS present from the very first render, as a fixed `aria-label` on the root element — see
 * below.
 *
 * ## Accessibility: a fixed accessible name, an `aria-hidden` animated visual
 *
 * The root element's `aria-label` is always `prefix + format(target)` — the real final value,
 * computed synchronously from props, present from the very first render (server or client),
 * regardless of whether the animation has run yet. The animating number itself is a second,
 * `aria-hidden` element: purely decorative from an assistive-technology point of view, the same
 * "one accessible name, decorative visuals" pattern already established for `ImgButton`. A
 * fast-changing number is a poor `aria-live` candidate (it would spam an announcement on every
 * frame) — this sidesteps that entirely by never marking the animated text live at all; a screen
 * reader gets the correct final value once, unaffected by animation timing.
 *
 * ## No implicit locale — `format`, not `toLocaleString()`
 *
 * The component this rescues formatted every frame with `count.toLocaleString()`, called with no
 * explicit locale — its output silently depends on whatever locale the server or browser happens
 * to default to, unpredictable and not controlled by any prop. This component never calls
 * `toLocaleString()` itself: {@linkcode CounterProps.format} formats every value (both the
 * animating one and the fixed accessible name, through the exact same function, so they can never
 * disagree), defaulting to `String` — plain digits, no separator, fully deterministic regardless
 * of where this runs. Pass an explicit formatter (`Intl.NumberFormat` or otherwise) to get
 * thousands separators, fixed decimals, or a currency symbol.
 *
 * ## Linear interpolation, exact final value
 *
 * `progress = elapsedTime / duration`, `count = Math.floor(progress * target)` for every
 * intermediate frame — same linear interpolation as the component this rescues, no easing curve.
 * Unlike it, though, the LAST frame (`progress >= 1`) always renders `target` exactly, decimals
 * included, rather than `Math.floor(target)` — the original silently truncated a non-integer
 * `target` even once the animation had fully finished.
 *
 * ## `requestAnimationFrame` cleanup — a real bug in the component this rescues, fixed here
 *
 * The component this rescues never cancelled its `requestAnimationFrame` loop: changing `target`/
 * `duration` mid-animation started a second, competing loop running in parallel with the first
 * (visible as the displayed number jumping around unpredictably), and unmounting while still
 * counting left the loop scheduling frames — and calling `setCount` on an unmounted component —
 * until it happened to finish on its own. Both effects here return a real cleanup that cancels the
 * exact frame most recently scheduled (`cancelAnimationFrame` on the same closed-over id the
 * recursive step keeps reassigning), so a prop change or an unmount always stops the loop that was
 * actually running, never leaves a second one racing it.
 *
 * @example
 * ```tsx
 * <Counter target={27_800} duration={1000} prefix="$" />
 * <Counter target={4.5} duration={800} format={(n) => n.toFixed(1)} />
 * ```
 */
export const Counter: (props: CounterProps) => ReactElement = createCounter<ReactElement>(
  createElement as unknown as CreateElement<ReactElement>,
  { useEffect, useRef, useState },
)
