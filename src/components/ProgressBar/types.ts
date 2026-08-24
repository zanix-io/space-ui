/**
 * Props for {@linkcode ProgressBar}. See `render.ts`'s own doc for the full set of design
 * decisions behind this component's shape, including the accessibility model and the optional
 * `shared/behavior.css` wiring.
 */
export type ProgressBarProps = {
  /** Duration, in milliseconds, for a determinate, one-shot fill animation — a bar that visibly
   * empties over exactly this long, then stops. Omit for an indeterminate, continuously looping
   * loading indicator instead — the two are mutually exclusive visual states, matching the only two
   * states a CSS-only animation (no JS ticking a real numeric value) can honestly represent. */
  timeout?: number
  /** Bar thickness. A bare number is treated as pixels (`7` → `'7px'`) — the same default value
   * the component this rescues always used — a string is used verbatim as any valid CSS length
   * (e.g. `'0.5rem'`). */
  height?: string | number
  /** Accessible name. Omitted by default, in which case this component is purely decorative
   * (`aria-hidden`) — the same decorative-by-default convention `Icon.label` already establishes.
   * Passing `label` switches it to `role="progressbar"` with declared
   * `aria-valuemin`/`aria-valuemax` bounds. `aria-valuenow` is never set, on either path: a
   * CSS-only animation has no discrete, JS-tracked "current value" to report at any instant, and
   * per WAI-ARIA, a `progressbar` with no `aria-valuenow` is the correct, honest way to mark it
   * indeterminate — a fabricated number no assistive technology reader could trust would be worse
   * than admitting there isn't one. */
  label?: string
  id?: string
  className?: string
}
