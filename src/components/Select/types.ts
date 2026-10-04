import type { Placement } from 'shared/positioning.ts'

/** A single selectable entry. `value` is the caller's own stable identifier — used for selection
 * comparison AND, combined with this component's own `useId()`, to derive each option's real DOM
 * id (`${baseId}-option-${value}`), the same "one `useId()` call, combined with the caller's own
 * already-unique key" convention `Combobox.ComboboxOption`/`Tabs.TabItem` already establish —
 * trusted to be id-safe per that same data contract, not sanitized. */
export type SelectOption = {
  value: string
  /** The visible text — rendered both as the option's own content and, once selected, as the
   * trigger button's own visible content. */
  label: string
  disabled?: boolean
}

/** Props for {@linkcode Select}. */
export type SelectBaseProps = {
  /** The options to show in the listbox — same "presents data, never owns it" seam every other
   * component in this package keeps: this component never filters/sorts/dedupes `options` itself. */
  options: SelectOption[]
  /** The selected option's own `value`, or `null` for no selection — controlled, always wins over
   * `defaultValue` when both are given, ignored not invalid, same contract established throughout
   * this component family. */
  value?: string | null
  /** @default null */
  defaultValue?: string | null
  /** Fires whenever a real selection is made (an arrow key moving to a new, enabled option, or a
   * click on one) — fires even in the uncontrolled case. Never fires for a disabled option, and
   * never fires just from opening/closing the listbox on its own. */
  onValueChange?: (value: string | null) => void
  /** Controlled listbox-open state — same contract as every other overlay in this package. */
  open?: boolean
  /** @default false */
  defaultOpen?: boolean
  /** Fires whenever the trigger, a keyboard open/close key, a selection, `Escape`, or an outside
   * click would open or close the listbox — fires even in the uncontrolled case. */
  onOpenChange?: (open: boolean) => void
  /** Shown on the trigger when nothing is selected (`value` is `null`/unset). With neither
   * `placeholder` nor `label` given and nothing selected, the trigger has no visible text and no
   * accessible name of its own — a real, disclosed gap the caller is expected to avoid, not a
   * runtime check this component performs itself. */
  placeholder?: string
  /** Accessible-name override for the trigger button — same "supplements or replaces" contract as
   * `Button.label`, since the trigger already composes a real `Button` and inherits that same
   * convention: only needed when the selected option's own label (or `placeholder`) isn't already
   * readable/sufficient standalone. */
  label?: string
  /** @default 'bottom' — same default `Combobox`/`Popover` already use. */
  placement?: Placement
  /** @default 8 */
  offset?: number
  /**
   * Marks the control as holding an invalid value, on the trigger `<button>`: the one focusable,
   * named element of the component, which `Field`'s `<label htmlFor>` points at and which a
   * `[aria-invalid="true"]` focus lookup reaches directly. Pass it together with
   * `aria-describedby`, and give the visible text to `Field`'s `error`, whose render-prop already
   * hands both over:
   *
   * ```tsx
   * <Field label='City' error={error}>
   *   {(field) => <Select {...field} options={cities} placeholder='Pick a city' />}
   * </Field>
   * ```
   *
   * The trigger is a `role="combobox"` button with `aria-haspopup="listbox"`, a role WAI-ARIA 1.2
   * lists `aria-invalid` for (the implicit `button` role does not). It decides nothing about what
   * is valid: that stays the caller's. There is
   * no `validationMessage`: the trigger is a `type="button"` button, which the browser excludes
   * from constraint validation, so there is no native control to call `setCustomValidity` on.
   * Validate on the server or in the caller, and report the result here. Absent by default:
   * nothing is rendered.
   */
  /**
   * Marks the control as required. This component renders no native field, so the browser's own
   * `required` cannot apply to it: while `required` is set and no option is chosen, its own element carries
   * `data-value-missing="true"` (the DOM counterpart of `validity.valueMissing`), which a
   * form-level validator such as `@zanix/space`'s `ManagedForm` `validateInline` reads to block the
   * submit and show the field's own message. Nothing else changes, and the attribute blocks nothing
   * without such a validator: the server still decides. Absent by default.
   */
  required?: boolean
  'aria-invalid'?: boolean
  /**
   * The id(s) of the element(s) that describe the control (an error, a hint), on the trigger
   * `<button>`, where `aria-describedby` is valid. `Field`'s render-prop gives it already combined
   * (the hint's and the error's ids, space-separated), so pass it verbatim. Absent by default.
   */
  'aria-describedby'?: string
  id?: string
  className?: string
  /** Threaded onto this component's own self-rendered `<style>` element(s), required only when
   * the consuming page runs a nonce-based `style-src` CSP (`@zanix/space`'s own zero-config
   * default is exactly this shape) — without a matching nonce, a strict CSP blocks this
   * component's ENTIRE listbox positioning (`position: fixed` and the dynamic
   * `transform`/`visibility` `usePosition` computes) the same way it would an inline `style`
   * attribute, same contract `TooltipBaseProps.nonce`/`PopoverBaseProps.nonce` already establish
   * (see `render.ts`'s own doc, and `shared/overlay-position-css.ts`'s, for the full mechanism).
   * Omit `nonce` entirely when no such CSP is in effect — nothing here changes. */
  nonce?: string
}
