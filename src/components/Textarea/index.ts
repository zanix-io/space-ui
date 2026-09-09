import { createElement, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createTextarea } from './render.ts'
import type { TextareaBaseProps } from './types.ts'

/** {@linkcode TextareaBaseProps} — nothing extra for the React binding. */
export type TextareaProps = TextareaBaseProps

/**
 * A thin, accessible wrapper around a native `<textarea>` — the multi-line counterpart `Input`
 * has no equivalent for, filling a real, confirmed gap (a plain-text `bio`-shaped field a
 * consumer app currently renders through single-line `Input`). Controlled `value`/`onValueChange`
 * with an uncontrolled `defaultValue` fallback, the same seam every stateful component in this
 * package already follows. Real implementation shared with the Preact binding via `render.ts`'s
 * own `createTextarea` (see that file's own doc for how — hook injection, plus the same
 * `onChange`/`onInput` divergence `Input`'s own `render.ts` documents in full, since neither is
 * specific to one native element over the other); import from `@zanix/space-ui/preact` instead for
 * the Preact one, same contract, same rendered behavior. Owns no form state of its own: no
 * validation, no dirty-tracking, no submission logic — `space-ui-architecture`'s seam 7, applied
 * to a `<textarea>` the same way `Input` already applies it to a single-line field.
 *
 * A real, plain `<textarea>` — not a rich-text editor, and no resizable-widget abstraction beyond
 * what the native element already gives for free (a caller controls resize behavior, if any, via
 * plain CSS `resize` on `className`, the same "headless until styled" posture every component here
 * has). `placeholder`/`disabled`/`readOnly`/`required`/`autoComplete`/`maxLength`/`name` pass
 * straight through, no reimplementation of `<textarea>`'s own contract, same as `Input`.
 * `rows` (default `4`) and `cols`/`wrap` are the attributes a `<textarea>` actually supports that
 * an `<input>` has no equivalent for — see `types.ts`'s own doc for each.
 *
 * ## Composing inside `Field`
 *
 * Same integration `Input` already has: `Textarea` accepts exactly the props `Field`'s own
 * render-prop hands back ({@linkcode FieldRenderProps}, imported from `components/Field/types.ts`)
 * — `id`, `aria-describedby`, `aria-invalid` all share the identical prop name, so spreading
 * `fieldProps` straight onto `Textarea` is the whole integration, no adapter needed.
 *
 * @example
 * ```tsx
 * <Field label="Bio" error={errors.bio}>
 *   {(fieldProps) => (
 *     <Textarea {...fieldProps} rows={6} value={bio} onValueChange={setBio} />
 *   )}
 * </Field>
 * ```
 *
 * A bare, unlabeled case (no `Field`) needs its own accessible name — `aria-label`/
 * `aria-labelledby` cover that, same as `Input`'s own bare-usage contract.
 *
 * @example
 * ```tsx
 * <Textarea aria-label="Notes" value={notes} onValueChange={setNotes} />
 * ```
 */
export const Textarea: (props: TextareaProps) => ReactElement = createTextarea<ReactElement>(
  createElement as unknown as CreateElement<ReactElement>,
  { useState },
  'onChange',
)
