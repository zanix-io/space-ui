/** The `id`/ARIA-wiring a `Field` computes for the caller's own input to apply — see
 * `index.ts`'s own doc for why this arrives via a render-prop rather than `cloneElement` or a
 * plain content prop. */
export type FieldRenderProps = {
  /** Pass this as the input's own `id` — also what `Field`'s own `<label htmlFor>` points at. */
  id: string
  /** Pass this verbatim as the input's own `aria-describedby` — already combines the hint's and
   * error's own ids (space-separated) when both are present, `undefined` when neither is. */
  'aria-describedby'?: string
  /** Pass this verbatim as the input's own `aria-invalid` — `true` exactly when `error` is given,
   * `undefined` otherwise (never a literal `false`, matching every other boolean ARIA attribute's
   * own "absent means false" convention already established across this package). */
  'aria-invalid'?: boolean
}

/**
 * The text a form-level validator shows for each way a control can fail the browser's constraint
 * validation, one key per `ValidityState` flag (`required` is `valueMissing`). `Field` renders each
 * as a `data-*` attribute on its root element, where `@zanix/space`'s `ManagedForm`
 * `validateInline` reads it for the control inside; without such a validator the attributes only
 * sit in the markup.
 */
export type FieldValidationMessages = {
  /** `data-validation-message`: any failure with no message of its own below. */
  default?: string
  /** `data-message-required`: the control is `required` and empty. */
  required?: string
  /** `data-message-type-mismatch`: not an e-mail, a URL, ... for its `type`. */
  typeMismatch?: string
  /** `data-message-pattern-mismatch`: does not match `pattern`. */
  patternMismatch?: string
  /** `data-message-too-short`: shorter than `minLength`. */
  tooShort?: string
  /** `data-message-too-long`: longer than `maxLength`. */
  tooLong?: string
  /** `data-message-range-underflow`: below `min`. */
  rangeUnderflow?: string
  /** `data-message-range-overflow`: above `max`. */
  rangeOverflow?: string
  /** `data-message-step-mismatch`: not a multiple of `step`. */
  stepMismatch?: string
  /** `data-message-bad-input`: the browser cannot parse what was typed (a number field). */
  badInput?: string
}

/** Props for {@linkcode Field}. */
export type FieldBaseProps = {
  /** Visible label text. */
  label: string
  /**
   * Already-resolved error message(s) for this field — deliberately a plain `string`/`string[]`,
   * never `@zanix/space`'s own `PageFieldErrors` shape (`Record<string, unknown>`) or
   * `@zanix/validator`'s underlying `{ constraints, value, plainValue }` entries. Extracting the
   * real message(s) for one field out of `PageFieldErrors` is the caller's own job — the exact
   * shape `@zanix/space`'s own reference usage already extracts with
   * `Object.entries(fieldErrors).flatMap(e => e.constraints ?? [])`. Keeping `Field` decoupled
   * from that shape means it works identically whether the caller's error came from
   * `@zanix/space`'s form flow, a client-only validation library, or anything else — and sidesteps
   * a real gap in `@zanix/space` itself: `PageFieldErrors` isn't exported from its own `mod.ts`
   * today, so no consumer can import it by name yet regardless.
   */
  error?: string | string[]
  /** Optional helper/description text, unrelated to `error` — both can be present at once, and
   * both are wired into the same `aria-describedby`. */
  hint?: string
  /**
   * The text a form-level validator (`@zanix/space`'s `ManagedForm` `validateInline`) shows when
   * the control inside fails the browser's constraint validation, per kind of failure. Rendered as
   * `data-*` attributes on `Field`'s root; absent by default, so the markup does not change.
   * `error` is unrelated: it is the message the server (or the caller) already resolved.
   */
  validationMessages?: FieldValidationMessages
  /** Seeds the id every element in this field derives from — auto-generated via `useId()` when
   * omitted, same "optional, generated fallback" contract most `id`-needing internals in this
   * package already have. */
  id?: string
  className?: string
}
