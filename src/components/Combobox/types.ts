import type { Placement } from 'shared/positioning.ts'

/** A single selectable entry. `value` is the caller's own stable identifier — used for selection
 * comparison AND, combined with this component's own `useId()`, to derive each option's real DOM
 * id (`${baseId}-option-${value}`), the exact same "one `useId()` call, combined with the caller's
 * own already-unique key" convention `Tabs`' own `TabItem.value` already establishes — trusted to
 * be id-safe per that same data contract, not sanitized. */
export type ComboboxOption = {
  value: string
  /** The visible text — also what fills the input once this option is selected. */
  label: string
  disabled?: boolean
}

/** Props for {@linkcode Combobox}. */
export type ComboboxBaseProps = {
  /** The options to show in the listbox, already filtered by the caller for the current
   * `inputValue` — this component never filters `options` itself. Same "presents data, never owns
   * it" seam every other component in this package already keeps: a case-sensitivity policy, a
   * fuzzy-match algorithm, or a server-side search are all real, divergent choices a headless
   * package has no business making for every consumer. */
  options: ComboboxOption[]
  /** Controlled text input value — always wins over `defaultInputValue` when both are given,
   * ignored not invalid, same contract established throughout this component family. */
  inputValue?: string
  /** @default '' */
  defaultInputValue?: string
  /** Fires on every keystroke, controlled or not — same "always notify" contract established
   * throughout. Typing never clears a previously committed `value` on its own (see `index.ts`'s own
   * doc for why) — only an explicit selection, or the caller's own controlled update, changes it. */
  onInputValueChange?: (value: string) => void
  /** The selected option's own `value`, or `null` for no selection — controlled, same "always wins"
   * contract as `inputValue`/`open` above. */
  value?: string | null
  /** @default null */
  defaultValue?: string | null
  /** Fires whenever a real selection is made (`Enter` or a click on an option) — fires even in the
   * uncontrolled case. Never fires with a value not present in `options` at the moment of
   * selection. */
  onValueChange?: (value: string | null) => void
  /** Controlled listbox-open state — same contract as every other overlay in this package. */
  open?: boolean
  /** @default false */
  defaultOpen?: boolean
  /** Fires whenever focus, typing, arrow navigation, a selection, `Escape`, or an outside
   * click/blur would open or close the listbox — fires even in the uncontrolled case. */
  onOpenChange?: (open: boolean) => void
  /** @default 'bottom' — same default `Popover` already uses; a combobox listbox conventionally
   * drops below the input, unlike `Tooltip`'s own `'top'`. */
  placement?: Placement
  /** @default 8 */
  offset?: number
  placeholder?: string
  id?: string
  className?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
}
