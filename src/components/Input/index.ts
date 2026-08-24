import { createElement, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createInput } from './render.ts'
import type { InputBaseProps } from './types.ts'

/** {@linkcode InputBaseProps} — nothing extra for the React binding. */
export type InputProps = InputBaseProps

/**
 * A thin, accessible wrapper around a native `<input>` — `text`/`email`/`password`/`number`/
 * `tel`/`url`/`search` (see {@linkcode InputType}), controlled `value`/`onValueChange` with an
 * uncontrolled `defaultValue` fallback, same seam every other stateful component in this package
 * already follows. Real implementation shared with the Preact binding via `render.ts`'s own
 * `createInput` (see that file's own doc for how — hook injection, plus the one real, confirmed
 * `onChange`/`onInput` divergence a live-typing `<input>` needs, same class `Combobox` already
 * documents); import from `@zanix/space-ui/preact` instead for the Preact one, same contract, same
 * rendered behavior. Owns no form state of its own: no validation, no dirty-tracking, no submission
 * logic — `space-ui-architecture`'s seam 7, applied to the one primitive this package didn't have
 * yet.
 *
 * A thin passthrough, not a reimplementation of `<input>`'s own contract: `placeholder`/
 * `disabled`/`readOnly`/`required`/`autoComplete`/`min`/`max`/`step`/`maxLength`/`pattern` all pass
 * straight through to the real native attribute, this component adds no validation or coercion of
 * its own on top of them.
 *
 * ## Composing inside `Field`
 *
 * `Input` isn't required to live inside `Field` — a bare `Input` with no visible label is a
 * legitimate, common case (a search box, an inline filter) — but when a caller does want a labeled
 * field, `Input` accepts exactly the props `Field`'s own render-prop hands back
 * ({@linkcode FieldRenderProps}, imported from `components/Field/types.ts`): `id`,
 * `aria-describedby`, `aria-invalid` all share the identical prop name, so spreading
 * `fieldProps` straight onto `Input` is the whole integration, no adapter needed —
 *
 * @example
 * ```tsx
 * <Field label="Email" error={errors.email}>
 *   {(fieldProps) => (
 *     <Input {...fieldProps} type="email" value={email} onValueChange={setEmail} required />
 *   )}
 * </Field>
 * ```
 *
 * A bare, unlabeled case (no `Field`) needs its own accessible name — `aria-label`/
 * `aria-labelledby` cover that, same as `Combobox`'s own bare-usage contract.
 *
 * @example
 * ```tsx
 * <Input type="search" aria-label="Search" value={query} onValueChange={setQuery} />
 * ```
 */
export const Input: (props: InputProps) => ReactElement = createInput<ReactElement>(
  createElement as unknown as CreateElement<ReactElement>,
  { useState },
  'onChange',
)
