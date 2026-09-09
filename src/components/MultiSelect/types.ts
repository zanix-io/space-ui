import type { Placement } from 'shared/positioning.ts'

/** A single selectable/suggested entry — same shape `Combobox.ComboboxOption`/`Select.SelectOption`
 * already use. `value` is the caller's own stable identifier — used for selection comparison AND,
 * combined with this component's own `useId()`, to derive each option's real DOM id
 * (`${baseId}-option-${value}`), the same "one `useId()` call, combined with the caller's own
 * already-unique key" convention `Combobox`/`Select`/`Tabs` already establish — trusted to be
 * id-safe per that same data contract, not sanitized. */
export type MultiSelectOption = {
  value: string
  /** The visible text — also what's shown on the chip once this option is committed. */
  label: string
  disabled?: boolean
}

/** Props for {@linkcode MultiSelect}. */
export type MultiSelectBaseProps = {
  /** The options to show in the listbox, already filtered by the caller for the current
   * `inputValue` — same "presents data, never owns it" seam `Combobox.options`/`Select.options`
   * already keep. This component additionally excludes any option already present in `values` from
   * what it actually renders/navigates (a duplicate pick makes no sense either mode), which the
   * caller doesn't need to do itself. */
  options: MultiSelectOption[]
  /** The committed chips, in commit order — controlled, always wins over `defaultValues` when both
   * are given, ignored not invalid, same contract established throughout this component family. */
  values?: string[]
  /** @default [] */
  defaultValues?: string[]
  /** Fires whenever a chip is added or removed (a selection, a free-text commit, or a removal) —
   * fires even in the uncontrolled case. */
  onValuesChange?: (values: string[]) => void
  /** `false` (default): a closed list, exactly like `Select` — typing only filters `options`,
   * `Enter`/a click only ever commits an EXISTING option, free text is never added as a chip.
   * `true`: `Combobox`-shaped — typing filters `options` AND, if the typed text exactly matches no
   * option's own label, `Enter` (or losing focus with a non-empty `inputValue`) commits the raw
   * typed text itself as a new chip. A typed value that DOES exactly match an option's label
   * (case-insensitively) selects that existing option instead of creating a duplicate-looking chip.
   * @default false */
  allowCustomValue?: boolean
  /** Controlled text input value (the text being typed for the NEXT chip) — always wins over
   * `defaultInputValue` when both are given, same contract as `Combobox.inputValue`. */
  inputValue?: string
  /** @default '' */
  defaultInputValue?: string
  /** Fires on every keystroke, controlled or not — same "always notify" contract
   * `Combobox.onInputValueChange`/`Input.onValueChange` already establish. */
  onInputValueChange?: (value: string) => void
  /** An optional cap on how many chips can be committed at once — once `values.length` reaches
   * `max`, selecting an option, committing free text, and the listbox itself all become no-ops
   * until a chip is removed. Removing a chip is never blocked by `max`. */
  max?: number
  /** Controlled listbox-open state — same contract as every other overlay in this package. Note the
   * listbox is only ever actually VISIBLE while `open` is true AND at least one option remains to
   * show (see `index.ts`'s own doc) — `open` itself still reflects the caller's own intent
   * unaffected by that. */
  open?: boolean
  /** @default false */
  defaultOpen?: boolean
  /** Fires whenever focus, typing, arrow navigation, a selection, `Escape`, or an outside
   * click/blur would open or close the listbox — fires even in the uncontrolled case. */
  onOpenChange?: (open: boolean) => void
  /** @default 'bottom' — same default `Combobox`/`Select` already use. */
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
  /** Formats the visually-hidden running-count description text (see `index.ts`'s own doc) —
   * receives the current `values.length`. Defaults to an English `"N item(s) selected"` string;
   * override this for a localized consumer, since this component has no i18n mechanism of its
   * own to derive one from. */
  getSelectionDescription?: (count: number) => string
}
