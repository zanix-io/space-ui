/** Native `<textarea>` `wrap` attribute values — `'soft'` (the browser default: visually wraps
 * long lines but submits them unwrapped) vs. `'hard'` (submits with real line breaks inserted at
 * the wrap point, only valid alongside a `cols` value) vs. `'off'` (no visual wrapping, a
 * horizontal scrollbar appears instead) — passed straight through, no default of its own, same
 * "thin passthrough" contract {@linkcode TextareaBaseProps} keeps for every other native
 * attribute. */
export type TextareaWrap = 'hard' | 'soft' | 'off'

/** Props for {@linkcode Textarea}, shared by both the React and Preact bindings. */
export type TextareaBaseProps = {
  /** Controlled value — when given, this component's own internal state is never the source of
   * truth; the caller must update this prop (typically from `onValueChange`) for the displayed
   * value to actually change. Always wins over `defaultValue` when both are given — ignored, not
   * invalid, same contract {@linkcode InputBaseProps} `value`/`defaultValue}` establishes. */
  value?: string
  /** Initial value — seeds the first render only, ignored once `value` is given.
   * @default '' */
  defaultValue?: string
  /** Fires on every keystroke, controlled or not — same "always notify" contract `Input`'s own
   * `onValueChange` already establishes for live text entry. */
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Native `autocomplete` attribute value (e.g. `'on'`, `'off'`) — passed through verbatim, no
   * allow-list, same reasoning `Input.autoComplete` already documents. */
  autoComplete?: string
  maxLength?: number
  /** Visible number of text lines — the one sizing hint every real `<textarea>` needs that an
   * `<input>` has no equivalent for (a single-line control has nothing to size vertically).
   * @default 4 */
  rows?: number
  /** Visible average character width — the native attribute's own default (`20`) applies when
   * omitted; this component sets no default of its own beyond the browser's. */
  cols?: number
  /** See {@linkcode TextareaWrap} — the native `wrap` attribute, passed straight through. */
  wrap?: TextareaWrap
  /** Native `name` attribute — the one piece of information a plain `<form method="post">` submit
   * actually needs to include this field's value in the resulting `FormData(form)`, same
   * reasoning `Input.name` already documents. */
  name?: string
  id?: string
  className?: string
  /** Spread this straight from {@linkcode FieldRenderProps} (imported from
   * `components/Field/types.ts`, not restated here) when composing inside `Field` — same prop
   * name, same contract `Input.aria-describedby` already establishes. */
  'aria-describedby'?: string
  /** Spread this straight from {@linkcode FieldRenderProps} when composing inside `Field`. */
  'aria-invalid'?: boolean
  /** Only meaningful when NOT composed inside `Field` (which renders its own `<label>` pointing
   * `htmlFor` at this textarea's own `id` instead) — a bare `Textarea` with no visible label still
   * needs an accessible name from somewhere. */
  'aria-label'?: string
  'aria-labelledby'?: string
}
