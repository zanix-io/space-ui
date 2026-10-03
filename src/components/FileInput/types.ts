/** Props for {@linkcode FileInput}, shared by both the React and Preact bindings. */
export type FileInputBaseProps = {
  /** Native `accept` attribute — a comma-separated list of MIME types/extensions (e.g.
   * `'image/*'`, `'.pdf,.docx'`), passed through verbatim. A client-side hint only, per the HTML
   * spec itself — never a real content-type guarantee (a user can override it in most native file
   * pickers, and nothing here inspects the actual selected `File`s' bytes/MIME type). */
  accept?: string
  /** @default false (single-file selection) */
  multiple?: boolean
  /** Native `capture` attribute — hints a mobile browser to open the camera/microphone directly
   * instead of a general file picker. No effect on desktop, and no effect at all unless `accept`
   * also targets a capturable media type (per the HTML spec, not enforced by this component). */
  capture?: boolean | 'user' | 'environment'
  /** Fires with the real, current selection every time it changes — always a plain `File[]`
   * (converted from the native `FileList` via `Array.from`, since a `FileList` is array-like but
   * not a real `Array`), never the raw `FileList` itself, so a caller never needs to know that
   * distinction exists. An empty selection (the user's picker was dismissed with nothing chosen,
   * or {@linkcode resetTrigger} fired) still fires, with `[]` — same "always notify" contract
   * `Combobox.onInputValueChange`/`RadioGroup.onValueChange` already establish. This component
   * owns no list of its own beyond what the native uncontrolled input already tracks — no
   * add/remove-file UI, no upload progress, no preview; real consumer-side composition builds on
   * top of the `File[]` this hands back. */
  onFilesChange?: (files: File[]) => void
  /** Forces the native input to clear its current selection (sets the real DOM `.value` to `''`,
   * the one mutation browsers actually allow a script to make on a file input — `.files`/`.value`
   * can never be SET to a specific selection, for security reasons) whenever this prop changes to
   * a new, defined value. The same "can't be controlled directly, so expose a change-triggered
   * escape hatch instead" shape `Recaptcha`/`HCaptcha`/`Turnstile`'s own `resetTrigger` already
   * establishes for an analogous platform constraint (see `docs/architecture.md`'s row 16) — not a
   * new pattern invented for this component. Also fires `onFilesChange([])`, keeping a caller's
   * own external state in sync with the real, now-empty native selection. `undefined` (the
   * default) never resets anything. */
  resetTrigger?: number | string
  /** Native `name` attribute — the one piece of information a plain `<form method="post">` submit
   * actually needs to include the selected file(s) in the resulting `FormData(form)`; with no
   * `name`, a selection made here is invisible to a native form submission no matter how
   * `onFilesChange` tracks it externally. Passed through verbatim, no default — same
   * thin-passthrough contract as `accept`/`multiple`/`capture`. */
  name?: string
  disabled?: boolean
  required?: boolean
  /** A validation message the caller owns, applied to this component's own real
   * `<input type="file">` with `setCustomValidity`, so the browser's native constraint validation
   * reports it: the input is `:invalid`, `form.checkValidity()` is `false`,
   * `form.reportValidity()` shows the message in the browser's own bubble, and a `<form>` submit is
   * blocked. The caller needs no ref or submit listener.
   *
   * A non-empty string sets the error; `undefined` or `''` clears it. The component follows every
   * change of the prop and clears the error when it unmounts. It never decides what is valid:
   * whether the chosen files are acceptable (a size limit, a type the caller checks itself) stays
   * the caller's call. Choosing or clearing a file never removes the message on its own, because
   * the browser does not clear a custom validity when the value changes: the caller recomputes it
   * from `onFilesChange` and passes `undefined` once the selection is acceptable.
   *
   * It does not touch `aria-invalid`, which is the caller's too. Pass both together, and give the
   * visible text to `Field`'s `error`; the native message is the browser's notice when a submit is
   * attempted:
   *
   * ```tsx
   * const message = tooBig ? 'The file must be under 5 MB' : undefined
   * <Field label='Photo' error={message}>
   *   {(field) => <FileInput {...field} onFilesChange={check} validationMessage={message} />}
   * </Field>
   * ```
   *
   * The control must stay a candidate for constraint validation: visually hiding it with
   * `display: none` or the `hidden` attribute excludes it from validation, so the message is never
   * reported. Hide it with a visually-hidden technique instead (clip or off-screen positioning).
   * Nothing is set on the server: the error applies once the component mounts in the browser. */
  validationMessage?: string
  id?: string
  className?: string
  /** Spread this straight from `FieldRenderProps` (`components/Field/types.ts`, not restated here)
   * when composing inside `Field` — same prop name, same contract. */
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  /** Only meaningful when NOT composed inside `Field` — a bare `FileInput` with no visible label
   * still needs an accessible name from somewhere. */
  'aria-label'?: string
  'aria-labelledby'?: string
}
