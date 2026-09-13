/** The native `<input>` `type`s this package actually supports — every one where a plain
 * controlled `value: string`/`onValueChange(value: string)` pair is the whole contract (real
 * per-key/per-character text entry, browser-validated by the native attribute alone). Deliberately
 * excludes `checkbox`/`radio` (`checked: boolean`, a genuinely different contract — `RadioGroup`
 * already owns the radio case at a higher level), `file` (no `value` a script can set at all, see
 * `FileInput`), `date`/`time`/`color`/`range`/`hidden`/`submit`/`button`/`image`/`reset` (no real
 * consumer evidence yet, and several need a materially different contract of their own — not
 * guessed at speculatively here). */
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'

/** Props for {@linkcode Input}, shared by both the React and Preact bindings. */
export type InputBaseProps = {
  /** @default 'text' */
  type?: InputType
  /** Controlled value — when given, this component's own internal state is never the source of
   * truth; the caller must update this prop (typically from `onValueChange`) for the displayed
   * value to actually change. Always wins over `defaultValue` when both are given — ignored, not
   * invalid, same contract established throughout this component family
   * (`Combobox.value`/`RadioGroup.value`). */
  value?: string
  /** Initial value — seeds the first render only, ignored once `value` is given.
   * @default '' */
  defaultValue?: string
  /** Fires on every keystroke, controlled or not — same "always notify" contract
   * `Combobox.onInputValueChange` already establishes for live text entry (as opposed to
   * `RadioGroup.onValueChange`/`Combobox.onValueChange`, which fire once per discrete selection,
   * not per keystroke). */
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Native `autocomplete` attribute value (e.g. `'email'`, `'new-password'`, `'off'`) — passed
   * through verbatim, no allow-list; the real, current values this attribute accepts are the
   * browser's/WHATWG's own concern, not this package's to enumerate and fall behind. */
  autoComplete?: string
  /** `type="number"` only — ignored by every other `type`, same as the native attribute itself. */
  min?: number | string
  /** `type="number"` only. */
  max?: number | string
  /** `type="number"` only. */
  step?: number | string
  maxLength?: number
  /** `type="text"`/`"email"`/`"password"`/`"tel"`/`"search"` — a native `RegExp`-source-string
   * constraint; the browser's own `:invalid` matching applies it, this component doesn't
   * re-validate it. */
  pattern?: string
  /** Native `name` attribute — the one piece of information a plain `<form method="post">` submit
   * actually needs to include this field's value in the resulting `FormData(form)`; with no `name`,
   * this input's value is invisible to a native form submission no matter how `value`/
   * `onValueChange` track it internally. Passed through verbatim, no default — same thin-passthrough
   * contract as `autoComplete`/`pattern`. */
  name?: string
  id?: string
  className?: string
  /** Native `inputmode` attribute (e.g. `'numeric'`, `'decimal'`, `'none'`) — a browser/virtual-
   * keyboard hint only, never a validation constraint of its own; passed through verbatim, same
   * thin-passthrough contract as `autoComplete`/`pattern`. Real, common need: a numeric-only OTP/
   * verification-code field wants the phone's numeric keypad without actually being `type="number"`
   * (which would also enable spinner arrows and reject a leading zero). */
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
  /** Fires on a native paste event, e.g. a code-entry field that wants to accept a whole
   * clipboard-pasted code in one go rather than one character at a time. Real event, not a
   * synthetic re-derivation — a caller that calls `event.preventDefault()` inside this handler
   * (to fully own how the pasted text gets applied) sees the native `<input>`'s own value stay
   * unchanged, exactly like any other native `onpaste` handler. */
  onPaste?: (event: ClipboardEvent) => void
  /** Native `autofocus` attribute — the browser itself focuses this element the moment it's
   * parsed/inserted, with no `ref`/`useEffect` needed on either side. Deliberately NOT a `ref`
   * prop instead: React 19 allows `ref` as a plain prop on a function component, but Preact core
   * (no `preact/compat` dependency anywhere in this package) does not — a function-component
   * vnode's `ref` resolves to Preact's own internal component wrapper, never the DOM node,
   * confirmed against Preact's own `diff/children.js` (`childVNode._component || newDom`, and
   * `_component` is always set for a function component). `autoFocus` sidesteps that renderer
   * asymmetry entirely — the real, confirmed motivating need (a six-box OTP/verification-code
   * field focusing itself on mount — see `@zanix/iam`'s own `ui/components/otp-code-field`) needs
   * nothing more than this. */
  autoFocus?: boolean
  /** Spread this straight from {@linkcode FieldRenderProps} (imported from
   * `components/Field/types.ts`, not restated here) when composing inside `Field` — same prop
   * name, same contract. */
  'aria-describedby'?: string
  /** Spread this straight from {@linkcode FieldRenderProps} when composing inside `Field`. */
  'aria-invalid'?: boolean
  /** Only meaningful when NOT composed inside `Field` (which renders its own `<label>` pointing
   * `htmlFor` at this input's own `id` instead) — a bare `Input` with no visible label still needs
   * an accessible name from somewhere. */
  'aria-label'?: string
  'aria-labelledby'?: string
}
