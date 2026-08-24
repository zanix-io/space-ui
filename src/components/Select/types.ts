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
  id?: string
  className?: string
}
