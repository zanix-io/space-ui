/** `'numeric'` (default): plain formatted text only. `'ring'`: an additional circular SVG progress
 * ring alongside the same formatted text. */
export type CountdownVariant = 'numeric' | 'ring'

/** Props for {@linkcode Countdown}. See `render.ts`'s own doc for the full behavioral contract. */
export type CountdownBaseProps = {
  /**
   * The absolute instant this countdown reaches zero — a `Date`, or an epoch-ms `number`
   * (`Date.now()`-comparable). Deliberately NOT a relative `seconds`-from-now duration: converting
   * one into an absolute instant needs exactly one `Date.now()` read, which is the caller's own job
   * to do once, explicitly (`new Date(Date.now() + 90_000)`) — doing that conversion INSIDE this
   * component would mean reading the clock during render, the same SSR/first-client-paint mismatch
   * `DatePicker`'s own "today" value is deliberately resolved post-mount to avoid (see that
   * component's own doc). `target` itself is already-resolved data, the same principle every prop
   * in this package follows.
   */
  target: Date | number
  /** Fires exactly once, the instant the remaining time reaches zero — never again afterwards, and
   * never more than once even if this component re-renders many times while already at zero.
   * Fires again only if `target` itself changes to a new, later instant. */
  onComplete?: () => void
  /** Formats the remaining time (in milliseconds, never negative) into display text — both the
   * visible `'numeric'`/`'ring'` text and (via {@linkcode getAnnouncement}, indirectly) the
   * `aria-live` announcement share the same underlying value. Defaults to zero-padded `'mm:ss'`
   * (ceiling-rounded, so `"00:03"` shows for the full final second rather than flashing to
   * `"00:02"` early). This component never reads an ambient locale — same "no implicit locale,
   * pass an explicit formatter" principle `Counter.format` already establishes. */
  format?: (remainingMs: number) => string
  /** Builds the text announced to assistive technology via a visually-hidden `aria-live="polite"`
   * region — called only at meaningful boundaries (see `render.ts`'s own doc for exactly when),
   * never once per second, which would spam a screen reader. Defaults to plain English (`"N minutes
   * remaining"`, `"Less than a minute remaining"`, `"Time's up"`); override for a localized
   * consumer, same "no i18n mechanism of its own" contract `MultiSelect.getSelectionDescription`
   * already establishes. */
  getAnnouncement?: (remainingMs: number) => string
  /** @default 'numeric' */
  variant?: CountdownVariant
  /** Ring diameter in pixels — `'ring'` variant only, ignored otherwise. A real, functional sizing
   * value (the SVG's own `width`/`height`/`viewBox`), same footing as `Image.width`/`Image.height`
   * — never a decorative default this package doesn't otherwise apply. @default 96 */
  size?: number
  /** Ring stroke width in pixels — `'ring'` variant only. @default 6 */
  strokeWidth?: number
  id?: string
  className?: string
  /** This component's own `'ring'`-variant stroke styling and its visually-hidden live region both
   * live in a self-rendered `<style nonce={nonce}>` element, never an inline `style` attribute —
   * required only when the consuming page runs a nonce-based `style-src` CSP (`@zanix/space`'s own
   * zero-config default is exactly this shape); without a matching nonce, a strict CSP blocks those
   * `<style>` elements — the ring renders with the browser's own default stroke (thin, fully drawn,
   * no smoothing) and the live region renders visually UNHIDDEN, both real fallbacks, never a crash
   * — until a matching nonce is supplied. Omit `nonce` entirely when no such CSP is in effect —
   * nothing here changes, including for `'numeric'`. */
  nonce?: string
}
