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
  /** Value of the region's `aria-roledescription`. Pass it already translated.
   * @default 'carousel' */
  roleDescription?: string
  /** Accessible name of the previous arrow (arrows mode). @default 'Previous slide' */
  previousLabel?: string
  /** Accessible name of the next arrow (arrows mode). @default 'Next slide' */
  nextLabel?: string
  /** Accessible name of the Pause control while autoplay runs. @default 'Pause slideshow' */
  pauseLabel?: string
  /** Accessible name of the Play control while autoplay is paused. @default 'Play slideshow' */
  playLabel?: string
  /** Accessible name of each slide-picker dot (`showDots`); every `{n}` marker is replaced by the
   * slide's 1-based position. @default 'Go to slide {n}' */
  dotLabel?: string
  /** Text of the visually-hidden live region; `{n}` is the current slide (1-based) and `{total}`
   * the slide count. @default 'Slide {n} of {total}' */
  statusLabel?: string
  id?: string
  className?: string
  /** This component's own visually-hidden live region (`"Slide N of Total"`) needs
   * `shared/live-region.ts`'s own clip-and-collapse styling, applied via a self-rendered
   * `<style nonce={nonce}>` element rather than an inline `style` attribute — required only when
   * the consuming page runs a nonce-based `style-src` CSP (`@zanix/space`'s own zero-config default
   * is exactly this shape); without a matching nonce, a strict CSP blocks that `<style>` element,
   * leaving the live region visually UNHIDDEN (a real fallback, never a crash) until a matching
   * nonce is supplied. Omit `nonce` entirely when no such CSP is in effect — nothing here changes. */
  nonce?: string
}

/** Slides beyond this many simultaneously mounted get evicted (oldest-visited first, never the
 * current one) — bounds DOM/memory growth for a slider with many slides. Not exposed as a prop;
 * see `index.ts`'s own doc for the full cache contract. */
export const MAX_MOUNTED_SLIDES = 10
