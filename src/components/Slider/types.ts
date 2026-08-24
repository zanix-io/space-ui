/**
 * Shared base for `SliderProps` — `children`'s own type is genuinely renderer-specific (`ReactNode`
 * vs. Preact's `ComponentChildren`), so each of `index.ts`/`index.preact.ts` declares its own
 * `SliderProps = SliderBaseProps & { children: ... }` rather than this file declaring `children`
 * itself — same reasoning `intl/index.ts`/`index.preact.ts` don't share `IntlProviderProps`, applied
 * to only the one field that actually needs it instead of the whole type.
 */
export type SliderBaseProps = {
  /** Wrap past the last/first slide instead of stopping. @default false */
  loop?: boolean
  /** Milliseconds between automatic advances. Present → autoplay runs and a Pause/Play control is
   * rendered; absent → no autoplay, no such control. Independent of `loop`: without it, autoplay
   * advances to the last slide and stops; with it, autoplay continues wrapping around. */
  autoPlayInterval?: number
  /** `true` renders slide-picker dots instead of previous/next arrows. @default false */
  showDots?: boolean
  /** Accessible name for the carousel region. @default 'Carousel' */
  label?: string
  id?: string
  className?: string
}

/** Slides beyond this many simultaneously mounted get evicted (oldest-visited first, never the
 * current one) — bounds DOM/memory growth for a slider with many slides. Not exposed as a prop;
 * see `index.ts`'s own doc for the full cache contract. */
export const MAX_MOUNTED_SLIDES = 10
