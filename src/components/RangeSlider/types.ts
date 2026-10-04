/** Knobs shared by both shapes of {@linkcode RangeSliderBaseProps} — see `render.ts`'s own doc for
 * the full behavioral contract (keyboard, drag, positioning). */
export type RangeSliderCommonProps = {
  /** @default 0 */
  min?: number
  /** @default 100 */
  max?: number
  /** Granularity every committed value snaps to, via keyboard, drag, or a track click — the same
   * `step` an `<input type="range">` already has. @default 1 */
  step?: number
  /** A larger jump for `PageUp`/`PageDown`, per the WAI-ARIA APG's own slider keyboard convention.
   * @default step * 10 */
  pageStep?: number
  /** Formats a raw numeric value into the human-readable string a screen reader announces via
   * `aria-valuetext` (e.g. `25` → `'25 years'`, `15` → `'15 km'`) instead of the bare number.
   * Applied identically to every handle this component renders — omit for the plain numeric
   * `aria-valuenow` announcement every ARIA slider gets by default. */
  formatValue?: (value: number) => string
  /** Removes every handle from the tab order (`tabIndex={-1}`) and marks each `aria-disabled`,
   * ignoring keyboard/pointer input entirely. @default false */
  disabled?: boolean
  /**
   * Marks the value as invalid, on every `role="slider"` handle (both of them for the two-handle
   * range, which is one logical value): the elements the WAI-ARIA slider role supports the
   * attribute on, and the focusable ones. Pass it together with `aria-describedby`, and give the
   * visible text to `Field`'s `error`, whose render-prop already hands both over:
   *
   * ```tsx
   * <Field label='Age range' error={error}>
   *   {(field) => <RangeSlider {...field} minLabel='Minimum age' maxLabel='Maximum age' />}
   * </Field>
   * ```
   *
   * `Field`'s `id` lands on the root `<div>`, which is not a labelable element, so the visible
   * `<label>` does not name the handles: `label`/`minLabel`/`maxLabel` do. It decides nothing about
   * what is valid: that stays the caller's. There is no `validationMessage`: the handles are
   * `role="slider"` divs, not a native `<input type="range">`, so there is no constraint validation
   * and no control to call `setCustomValidity` on. Validate on the server or in the caller, and
   * report the result here. Absent by default: nothing is rendered.
   */
  'aria-invalid'?: boolean
  /**
   * The id(s) of the element(s) that describe the value (an error, a hint), on every
   * `role="slider"` handle. `Field`'s render-prop gives it already combined (the hint's and the
   * error's ids, space-separated), so pass it verbatim. Absent by default.
   */
  'aria-describedby'?: string
  id?: string
  className?: string
  /** This component's own per-instance handle/fill positioning (a continuous 0–100% value with no
   * finite, precomputable set of cases — unlike `Drawer`'s `DRAWER_SIDE_STYLE`/`Modal`'s
   * `MODAL_Z_INDEX`) is applied via a CSSOM rule inside a self-rendered `<style nonce={nonce}>`
   * element, mutated directly (`CSSStyleRule.style.setProperty`) on every drag/keyboard update —
   * never an inline `style` attribute, and never a `<style>` text rebuild on every frame either; see
   * `render.ts`'s own doc, and `Tooltip`'s own identical `getOrInsertDynamicRule` mechanism, for the
   * full CSP reasoning and why a genuinely continuous, high-frequency value uses this instead of
   * `Avatar`/`ProgressBar`'s own "rebuild static CSS text every render" approach (correct for a
   * value that changes rarely, wasteful for one that changes on every pointer-move frame).
   * Without a matching nonce, a strict CSP blocks the `<style>` element itself, leaving every handle
   * at its default, unpositioned spot — a real, documented fallback, never a crash. Omit entirely
   * when no such CSP is in effect — nothing here changes. */
  nonce?: string
}

/** A single numeric value — one draggable handle (a distance/radius picker, a volume level). */
export type RangeSliderSingleProps = RangeSliderCommonProps & {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** Accessible name for the one handle this shape renders — required, same "make forgetting an
   * accessible name a compile error" reason `RadioGroup.label`/`Image.alt` already are required. */
  label: string
  minLabel?: undefined
  maxLabel?: undefined
}

/**
 * A two-handle numeric range (an age range, a price band). `value`/`defaultValue` are always the
 * `[lower, upper]` pair, in that order — this component never lets the lower handle's value exceed
 * the upper's, or vice versa: each handle's own effective bound is clamped to the OTHER handle's
 * current value, not just to `min`/`max`, so the two can never cross.
 */
export type RangeSliderRangeProps = RangeSliderCommonProps & {
  value?: [number, number]
  defaultValue?: [number, number]
  onValueChange?: (value: [number, number]) => void
  /** Accessible name for the lower (`value[0]`) handle — required, same reason
   * {@linkcode RangeSliderSingleProps.label} is. */
  minLabel: string
  /** Accessible name for the upper (`value[1]`) handle — required, same reason
   * {@linkcode RangeSliderSingleProps.label} is. */
  maxLabel: string
  label?: undefined
}

/**
 * Props for {@linkcode RangeSlider} — a compile-time choice between the single-value shape
 * ({@linkcode RangeSliderSingleProps}, one handle, `label` required) and the two-handle range shape
 * ({@linkcode RangeSliderRangeProps}, `minLabel`/`maxLabel` required instead) — the same "which
 * shape, picked by a required, mutually exclusive field" convention `ButtonProps`' own `role`-keyed
 * union already establishes (`role: 'switch'` forces `checked`; here, providing `minLabel`/
 * `maxLabel` forces the two-handle shape), applied to a value's own arity instead of a widget
 * `role`. Which shape is active at runtime is read off `minLabel !== undefined` — never inferred
 * from `value`'s own shape, so an entirely uncontrolled instance (no `value`, no `defaultValue`)
 * still resolves to the correct mode from its required label prop(s) alone.
 */
export type RangeSliderBaseProps = RangeSliderSingleProps | RangeSliderRangeProps
