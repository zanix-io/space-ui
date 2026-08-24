import { createElement, useEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createSlider } from './render.ts'
import type { SliderBaseProps } from './types.ts'

/** {@linkcode SliderBaseProps} plus the slides themselves, passed as `children`. */
export type SliderProps = SliderBaseProps & { children: ReactNode }

/**
 * A carousel: one slide visible at a time, advanced by arrows, dots, keyboard, or autoplay. Real
 * implementation shared with the Preact binding via `render.ts`'s own `createSlider` (see that
 * file's own doc for how — hook injection); import from `@zanix/space-ui/preact` instead for the
 * Preact one, same contract, same rendered behavior.
 *
 * ## No store, no Context
 *
 * The component this rescues ran a real Zustand store per instance, bound through React Context.
 * Nothing here ever needs `currentIndex`/pause state from outside this component's own tree — no
 * consumer was found reading or driving a slider from elsewhere — so it's plain local state
 * (`useState`), same as `Counter`/`Menu`. `zustand/react/shallow` (what the store relied on) also
 * imports from a `react` subpath specifically — keeping the store would have meant confirming a
 * Preact-compatible equivalent existed at all; dropping it sidesteps that entirely.
 *
 * ## Structure: `role="region"` + `aria-roledescription="carousel"`, never `role="slider"`
 *
 * The component this rescues used `role="slider"` — the WAI-ARIA widget role for a single-value
 * range input (a volume control), which requires full keyboard support to adjust that value and a
 * live `aria-valuenow`. A carousel isn't that; the correct WAI-ARIA pattern is "Carousel"
 * (`role="region"` + `aria-roledescription="carousel"` + an accessible name). The region carries
 * `tabIndex={0}` — fixed, never the current index (the component this rescues set
 * `tabIndex = currentIndex`, a real bug: any `tabIndex` above 0 pulls an element out of the
 * page's natural tab order into a manually numbered sequence, deeply confusing once more than one
 * such element exists on a page).
 *
 * ## Never remounting a visited slide, capped at {@linkcode MAX_MOUNTED_SLIDES}
 *
 * A slide keeps whatever internal state it has (video playback position, scroll, typed input) once
 * shown, rather than losing it every time the user navigates away and back. `visited` (below)
 * tracks which slide indices have ever been shown,
 * in the order they were first shown; each render, every visited index gets a real DOM node (only
 * the current one visible, others carry the native `hidden` attribute — not an inline style, so a
 * carousel with zero optional CSS is still correct: only one slide visible, instant switching,
 * nothing left stacked or leaking through). Once more than {@linkcode MAX_MOUNTED_SLIDES} have been
 * visited, the oldest-visited index (never the current one) is dropped — a real capability, ported
 * with a deliberately simpler mechanism than the component this rescues: that one did positional
 * arithmetic over a sparse array (its own dedicated test file, arithmetic non-trivial enough to
 * need hand-built fixtures); this one is an ordinary array of visited indices, oldest-first, same
 * observable contract (cap enforced, no remount while cached) without the sparse-array bookkeeping.
 * Revisiting an index that's still cached doesn't refresh its position — eviction order is
 * strictly "oldest first shown," not true least-recently-viewed; a real, accepted simplification.
 *
 * ## A shrinking `children` array never leaves `currentIndex` pointing past the end
 *
 * `children` is an ordinary prop — nothing stops a consumer from re-rendering this component with
 * FEWER slides than before (found auditing `Showcase`, which regroups its own children live on a
 * container resize, but this is a general guarantee for ANY consumer with dynamic `children`, not
 * a fix scoped to that one). The raw `currentIndex` STATE is never eagerly corrected for this —
 * nothing else ever reads it directly — but every derived value used for rendering (which slide is
 * `data-active`, which dot carries `aria-current`, the live region's own "Slide N of Total", and
 * `exhausted`/`autoPlayActive`) reads a `clampedIndex` computed fresh every render
 * (`Math.min(Math.max(currentIndex, 0), itemsQuantity - 1)`, or `0` for zero slides) instead — so
 * there is never a render, not even the very first one after `itemsQuantity` drops, where an
 * out-of-range index is visible. `Math.min` — not a reset to `0` — preserves the user's position as
 * exactly as it still can: landing on the new LAST slide, not back at the first one. `goNext`/
 * `goPrev` independently re-clamp their own base before stepping, so the next navigation is always
 * correct even if the raw state was left momentarily stale. `visited` gets the same treatment
 * (pruned of any index `>= itemsQuantity` in its own effect) — otherwise a stale index keeps
 * occupying a real slot against {@linkcode MAX_MOUNTED_SLIDES}, which could evict a slide that's
 * still genuinely valid and cached the moment `itemsQuantity` grows back (e.g. the container
 * widening again) — exactly the guarantee that cache exists to provide.
 *
 * ## Crossfade: `data-space-ui` + optional CSS, not `style` + a hardcoded delay
 *
 * The component this rescues mutated `style.top`/`position`/`visibility` directly and staged the
 * transition through a hardcoded `setTimeout(100)`. Here, each mounted slide carries
 * `data-space-ui="slider-item"`, with `data-active="true"` on the current one and the native
 * `hidden` attribute on the rest — an optional stylesheet can override `[hidden]` (author styles
 * always beat the user-agent's own `[hidden]{display:none}`, no `!important` needed) to build any
 * real CSS transition keyed off `[data-active]`. With no such stylesheet, switching is instant.
 *
 * ## `loop` and `autoPlayInterval`, separated
 *
 * The component this rescues conflated them into one `infinity: boolean | {autoPlayTransition}`
 * prop — autoplay only existed when `infinity` was given as an object, so a looping-but-not-
 * autoplaying carousel and an autoplaying-but-not-looping one couldn't both be expressed cleanly.
 * Here they're independent: `loop` alone just wraps `goNext`/`goPrev` at the ends.
 * `autoPlayInterval` alone advances automatically to the last slide and stops there (the
 * `setTimeout` driving it — chosen over `setInterval` specifically — never reschedules itself once
 * `goNext` stops changing `currentIndex`, so it self-terminates with no extra bookkeeping). Both
 * together: autoplay continues wrapping around.
 *
 * ## Pausing autoplay: an explicit `Button`, mouse hover as a complement only
 *
 * The component this rescues paused autoplay only via `mousedown`/`mouseup` on the slide content
 * — both wired to the SAME toggle, so a plain click fired it twice and cancelled itself out, and
 * there was no way at all to pause without a mouse. Here, a `Button` (rendered only when
 * `autoPlayInterval` is given) is the one explicit,
 * accessible mechanism — its own accessible name changes between "Pause slideshow"/"Play slideshow"
 * rather than needing an `aria-pressed` this package's `Button` doesn't expose. Hovering the
 * carousel (`mouseenter`/`mouseleave`) is a real, kept complement, but a STRICTLY LOWER-PRIORITY
 * signal: it can only pause an otherwise-playing carousel, never resume one the user paused
 * manually — `hoverPaused` and `isPlaying` are two independent pieces of state precisely so
 * `mouseleave` clearing `hoverPaused` can never flip `isPlaying` back on.
 *
 * ## Keyboard: `ArrowLeft`/`ArrowRight` while the region has focus
 *
 * Absent entirely in the component this rescues, despite implying keyboard interactivity via
 * `tabIndex`/`role="slider"`. Both call the same `goPrev`/`goNext` the arrow buttons and dots do —
 * no separate code path to keep in sync.
 *
 * ## `aria-live`, off during autoplay
 *
 * A visually-hidden region (`shared/live-region.ts`'s own `liveRegionProps` — extracted from this
 * exact usage; unlike `close-on-outside.ts`/`escape-to-close.ts`, this one was pulled out ahead of
 * a real second consumer, on the expectation that other components will need the same
 * announcement pattern. The shape itself is unchanged) announces `"Slide N of
 * Total"` on
 * every change. `aria-live="off"` exactly while autoplay is actively advancing on its own
 * (`autoPlayInterval` given, not manually paused, not hover-paused, not exhausted) — otherwise
 * `"polite"`, since a screen reader announcing every automatic tick would be spam the component
 * this rescues never had to consider at all (no live region existed).
 *
 * ## Dots: a real `aria-current`, a real per-dot name
 *
 * The component this rescues gave every dot the exact same literal `aria-label` — a screen reader
 * user tabbing through them heard the identical announcement N times, with no way to tell them
 * apart or know which was active. Each dot here has its own accessible name
 * (`` `Go to slide ${n}` ``) and `aria-current="true"` on the active one (via `Button`'s own native
 * ARIA passthrough — see its own `types.ts` doc), added for this exact case the same way
 * `aria-expanded`/`aria-controls` were added for `Menu`'s disclosure trigger.
 *
 * ## No forced visual — arrows/dots/pause are bare, accessible controls
 *
 * Same reasoning as `Menu`'s disclosure toggle: this component doesn't know a consumer's icon
 * sprite, so it never composes `ImgButton`/`Icon` for its own controls — a `Button` with only an
 * accessible name, styleable entirely through `className`/`data-space-ui`.
 */
export const Slider: (props: SliderProps) => ReactElement = createSlider<ReactElement, ReactNode>(
  createElement as unknown as CreateElement<ReactElement>,
  { useEffect, useRef, useState },
)
