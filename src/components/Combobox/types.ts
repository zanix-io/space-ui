import type { Placement } from 'shared/positioning.ts'

/** A single selectable entry. `value` is the caller's own stable identifier — used for selection
 * comparison AND, combined with this component's own `useId()`, to derive each option's real DOM
 * id (`${baseId}-option-${value}`), the exact same "one `useId()` call, combined with the caller's
 * own already-unique key" convention `Tabs`' own `TabItem.value` already establishes — trusted to
 * be id-safe per that same data contract, not sanitized. Also rendered verbatim as each option
 * `<li>`'s own `data-value` attribute — a styling hook for a caller that wants ONE particular
 * option to look different from the rest (an "add a new item" affordance mixed into an otherwise
 * plain suggestion list, say), the same `data-*`-attribute-as-styling-seam convention this
 * package's own headless components already use elsewhere (`data-position`, `data-variant`). */
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
  /** Native HTML `required` on this component's own real `<input>` — the input a caller's `<form>`
   * actually sees and validates, since `role="combobox"` lives directly on it (this component's own
   * top doc, "single-input shape"), not a separate trigger element. A real, focusable form control
   * needs no `name` to participate in constraint validation (`form.reportValidity()`/blocking
   * submit both key off whether an element is a genuine "candidate for constraint validation" —
   * visible, not disabled — never its `name`), so this works even though a typical consumer mirrors
   * the committed text into a SEPARATE, actually-named hidden input for the real submission (the
   * same shape this package's own `docs/`-referenced field-wrapper convention establishes). Native
   * validation simply checks this input's own text is non-empty — exactly right for a free-text
   * field (a picked-but-not-yet-confirmed value still satisfies it, same as any plain required
   * `<input>`). @default false */
  required?: boolean
  /** A validation message the caller owns, applied to this component's own real `<input>` with
   * `setCustomValidity`, so the browser's native constraint validation reports it: the input is
   * `:invalid`, `form.checkValidity()` is `false`, `form.reportValidity()` shows the message in the
   * browser's own bubble, and a `<form>` submit is blocked. The caller needs no ref, submit listener
   * or blur handler.
   *
   * A non-empty string sets the error; `undefined` or `''` clears it. The component follows every
   * change of the prop and clears the error when it unmounts. It never decides what is valid:
   * whether the typed text is acceptable stays the caller's call, the same "presents data, never
   * owns it" seam as `options`.
   *
   * It does not touch `aria-invalid`, which is the caller's too. Pass both together, and give the
   * visible text to `Field`'s `error`; the native message is the browser's notice when a submit is
   * attempted:
   *
   * ```tsx
   * const message = unknownCity ? 'Pick a city from the list' : undefined
   * <Field label='City' error={message}>
   *   {(field) => <Combobox {...field} options={cities} validationMessage={message} />}
   * </Field>
   * ```
   *
   * Nothing is set on the server: the error applies once the component mounts in the browser, so a
   * server-rendered page carries no native error before then. */
  validationMessage?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
  /** Threaded onto this component's own self-rendered `<style>` element(s), required only when
   * the consuming page runs a nonce-based `style-src` CSP (`@zanix/space`'s own zero-config
   * default is exactly this shape) — without a matching nonce, a strict CSP blocks this
   * component's ENTIRE listbox positioning (`position: fixed` and the dynamic
   * `transform`/`visibility` `usePosition` computes) the same way it would an inline `style`
   * attribute, same contract `SelectBaseProps.nonce` already establishes (see `index.ts`'s own
   * doc, and `shared/overlay-position-css.ts`'s, for the full mechanism). Omit `nonce` entirely
   * when no such CSP is in effect — nothing here changes. */
  nonce?: string
}
