import { Children, createElement, useEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import type { SliderProps } from 'components/Slider/index.ts'
import { createShowcase } from './render.ts'
import type { ShowcaseBaseProps } from './types.ts'

/** {@linkcode ShowcaseBaseProps} plus the `Slider` props it forwards. */
export type ShowcaseProps = ShowcaseBaseProps & {
  /** Every other `Slider` prop — `id`/`className` land on this component's own top-level props
   * instead (never here too), so there's exactly one way to set either, not two possibly-
   * conflicting ones. */
  slider?: Omit<SliderProps, 'children' | 'id' | 'className'>
  children: ReactNode
}

/**
 * `children` grouped into pages of `itemsPerSlide`, each page one {@linkcode Slider} slide. Real
 * implementation shared with the Preact binding via `render.ts`'s own `createShowcase` (see that
 * file's own doc for how — hook injection); import from `@zanix/space-ui/preact` instead for the
 * Preact one, same contract, same rendered behavior.
 *
 * ## What this is: grouping + `Slider`, nothing else
 *
 * The component this rescues composed the exact same way — no visual/behavioral logic of its own
 * beyond turning a flat list into pages and handing them to a slider. `slider` (`Omit<SliderProps,
 * 'children'>`) passes straight through to the underlying `Slider`, so every one of its own
 * capabilities (loop, autoplay, dots vs. arrows, keyboard, accessible structure) is available here
 * unchanged, without this component knowing or caring what any of them do.
 *
 * ## `itemsPerSlide`: container width, never viewport width
 *
 * The component this rescues drove "how many items per page" off `window.innerWidth`, through a
 * global Zustand-backed `useResolution` hook (the same mechanism already rejected package-wide —
 * see `Image`'s own doc for `useAspectRatio`/`useResolution`) and 6 hardcoded breakpoint IDs
 * (`msm`/`mmd`/`mlg`/`dsm`/`dmd`/`dlg`) that appear nowhere else in this package. That mechanism is
 * dropped entirely — but the CAPABILITY it demonstrated (item count responds live to available
 * space, re-grouping across breakpoints without remounting the underlying items) is real and is
 * kept, on a genuinely more correct basis:
 * `itemsPerSlide?: number | Record<number, number>`, where a `Record`'s keys are `ResizeObserver`-
 * measured width thresholds of THIS component's OWN rendered container, not the viewport. A
 * viewport-width assumption breaks the moment this component isn't rendered full-width (a sidebar,
 * a modal, a narrower column on an otherwise-wide screen) — measuring the actual space this
 * component itself was given is what the component this rescues' own `window.innerWidth` was
 * really trying to proxy for, and gets it right in cases it couldn't. See `resolve-items-per-slide.ts`'s own doc for
 * the exact mobile-first resolution algorithm (largest threshold `<=` the measured width; below
 * every threshold, the smallest threshold's own value) and why threshold ordering never depends on
 * `Object.keys()`'s own iteration order. Omitted entirely → a fixed `1`.
 *
 * ## No viewport tracking of `Slider`'s own root — a private, unmarked wrapper `<div>` instead
 *
 * `Slider` doesn't forward a ref to its own root node (never asked to, until now) — extending an
 * already-shipped component's API for this isn't warranted when a private wrapper works just as
 * well: this component renders one plain `<div>` around `<Slider>`, existing ONLY to give
 * `ResizeObserver` something to observe. No `id`/`className`/`data-space-ui`, no styling of any
 * kind — a bare block element's own natural `width: 100%` is already exactly what's needed, and
 * adding a real, documented, semver-protected selector hook to it would turn a pure measurement
 * detail into a public primitive it was never meant to be. `id`/`className` (this component's own
 * props) land on `Slider` itself instead — `data-space-ui="slider"` (composed, not reimplemented,
 * same convention `ImgButton` uses for `Link`/`Button`) remains the real, effective root a
 * consumer's CSS reaches for.
 *
 * ## Each slide's own group wrapper: `display: flex`, nothing else
 *
 * The component this rescues wrapped each page in `LayoutContainer` (never opting into ITS OWN
 * lazy-mount/aspect-ratio/ref-forwarding capabilities — none of which any real usage exercised),
 * styled via Tachyons/BEM into a centered, gapped flex row. Stripped of that mechanism, the one
 * REAL functional requirement survives: without `display: flex`, a group's own items (plain block-
 * level children) would stack vertically instead of sitting side by side — "N items visible
 * together" wouldn't materialize with zero consumer CSS at all, the same "headless but still
 * correct unstyled" bar `Grid`'s own unconditional `display: grid` and `ProgressBar`'s own markup
 * already hold. Nothing beyond that: no `gap`, no `justify-content`, no padding/margin/color — the
 * component this rescues' own centering/spacing was a design choice, not something the contract
 * needs to exist,
 * and belongs to `className`/`data-space-ui="showcase-group"` instead.
 *
 * ## SSR and the first client paint: same value, always — no `window`/`matchMedia` during render
 *
 * `ResizeObserver` never runs during SSR, and its own first callback is asynchronous — it cannot
 * fire during, or synchronously after, the very first client render either. Rather than reading
 * `window.innerWidth`/`matchMedia` synchronously during render (which would diverge from SSR's own
 * output and trip a real hydration mismatch), the measured width starts as `null` — an explicit
 * "no real measurement yet" state — and `resolveItemsPerSlide` treats `null` identically to "the
 * container turned out to be narrower than every threshold": the smallest threshold's own value.
 * SSR and the first client paint are BYTE-IDENTICAL by construction, not by accident: a narrow
 * container never has anything to visually correct once the real measurement arrives; a wider one
 * refines upward, once, the moment `ResizeObserver`'s first callback runs (batched before the next
 * paint per spec — in practice no visible flash, though not a guarantee this implementation
 * depends on for correctness, only for smoothness).
 *
 * ## `ResizeObserver`, kept private — not a new exported hook
 *
 * No second real consumer exists yet for "track my own container's width" as a standalone
 * primitive — same reasoning `close-on-outside.ts` documents for staying `Menu`-local until
 * `Modal` became a genuine second consumer. This lives entirely inside this component; nothing
 * about it is public. A real client browser lacking `ResizeObserver` degrades to the same `null`
 * state SSR already uses — the smallest threshold's own value — rather than throwing or never
 * rendering, same fallback philosophy `Counter`'s own `IntersectionObserver` guard uses.
 *
 * ## The `Slider` fix this exposed, and fixed generally — not with a `key`/remount here
 *
 * Regrouping in response to a live resize can shrink the number of slides while the user isn't on
 * the first one — `Slider` didn't validate its own `currentIndex` against a shrinking `children`
 * array; see `Slider/index.ts`'s own doc for the fix (a general robustness guarantee for ANY
 * consumer with dynamic `children`, not a patch scoped to this component). This component never
 * forces a remount (no derived `key` on its own `<Slider>`) — the user's position is preserved as
 * exactly as `Slider`'s own corrected invariant allows.
 */
export const Showcase: (props: ShowcaseProps) => ReactElement = createShowcase<
  ReactElement,
  ReactNode
>(
  createElement as unknown as CreateElement<ReactElement>,
  { useEffect, useRef, useState },
  Children.toArray,
)
