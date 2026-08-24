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
  /** Seeds the id every element in this field derives from — auto-generated via `useId()` when
   * omitted, same "optional, generated fallback" contract most `id`-needing internals in this
   * package already have. */
  id?: string
  className?: string
}
