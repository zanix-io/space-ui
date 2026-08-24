import { createElement, Fragment, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createField } from './render.ts'
import type { FieldBaseProps, FieldRenderProps } from './types.ts'

/** {@linkcode FieldBaseProps} plus the render-prop that supplies the actual form control. */
export type FieldProps = FieldBaseProps & {
  /** Renders the actual `<input>`/`<select>`/`<textarea>` — receives the `id`/`aria-describedby`/
   * `aria-invalid` this component computed, to spread onto that element. */
  children: (fieldProps: FieldRenderProps) => ReactNode
}

/**
 * A labeled form field wrapper: a `<label>`, the caller's own input, an optional hint, and an
 * error message — correctly cross-referenced via `aria-describedby`/`aria-invalid`. Real
 * implementation shared with the Preact binding via `render.ts`'s own `createField` (see that
 * file's own doc for how — hook injection); import from `@zanix/space-ui/preact` instead for the
 * Preact one, same contract, same rendered behavior. Owns no state of its own: no validation, no
 * dirty-tracking, no submission logic; `error` is always given from outside, already resolved to
 * plain text.
 *
 * ## Why `children` is a render-prop here — the one place in this package that needs one
 *
 * Every other "content, not a pre-built element" case in this component family (`Disclosure`'s own
 * `trigger`, `Tabs`' own `label`) solves the "don't need `cloneElement`" problem by treating the
 * prop as pure VISUAL content that this component's own owned element wraps. That doesn't work
 * here: `Field` needs to label and ARIA-wire an arbitrary NATIVE FORM CONTROL it doesn't own or
 * render itself (an `<input>`, a `<select>`, a `<textarea>`, or even a composed custom control) —
 * a genuinely different problem shape, not the same one solved differently. `cloneElement` was
 * considered and rejected, same reasoning as everywhere else in this package: it only works for a
 * single element, silently fails for anything else, and can't inject props a component doesn't
 * already forward. A render-prop sidesteps this cleanly: the caller receives
 * `{@linkcode FieldRenderProps}` as plain data and spreads it onto whatever they render themselves
 * — no cloning, no assumptions about what `children` even is.
 *
 * ## Composes `Alert` for the error message, doesn't reimplement it
 *
 * The error message needs exactly `Alert`'s own default `role="alert"` (interrupts assistive
 * technology immediately) — real composition, not a coincidence: a validation failure IS the kind
 * of assertive, time-sensitive message `Alert` already exists for.
 */
export const Field: (props: FieldProps) => ReactElement = createField<ReactElement, ReactNode>(
  createElement as unknown as CreateElement<ReactElement>,
  { useId },
  Fragment,
)
