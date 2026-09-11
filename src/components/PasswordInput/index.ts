import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createElementWithNonceHydrationFix } from 'shared/create-element-nonce-hydration-fix.ts'
import { createPasswordInput } from './render.ts'
import type { PasswordInputBaseProps } from './types.ts'

export type { PasswordInputBaseProps } from './types.ts'

/** {@linkcode PasswordInputBaseProps} plus `showIcon`/`hideIcon`. Written out explicitly (rather
 * than a direct alias to `PasswordInputRenderProps<ReactNode>`) so this package's public API
 * surface never names an unexported type, the same `deno doc --lint` constraint `Card`'s own
 * `CardProps` doc already documents. */
export type PasswordInputProps = PasswordInputBaseProps & {
  /** See `render.ts`'s own `PasswordInputRenderProps.showIcon` doc — same render-prop slot,
   * returning `ReactNode`. */
  showIcon?: () => ReactNode
  /** See `render.ts`'s own `PasswordInputRenderProps.hideIcon` doc. */
  hideIcon?: () => ReactNode
}

/**
 * A password `Input` with a built-in, accessible show/hide visibility toggle. Real implementation
 * shared with the Preact binding via `render.ts`'s own `createPasswordInput` (composes the
 * unmodified `Input`/`Button`, see that file's own doc for the full contract); import from
 * `@zanix/space-ui/preact` instead for the Preact one, same contract, same rendered behavior.
 *
 * Everything {@linkcode PasswordInputBaseProps} accepts is exactly `Input`'s own prop set minus
 * `type` (this component owns that internally) — controlled `value`/`onValueChange` with an
 * uncontrolled `defaultValue` fallback, the same native-attribute passthrough (`autoComplete`
 * included), the same `Field` composition contract. See `Input`'s own doc for that full contract,
 * not repeated here.
 *
 * The toggle button is a real, labeled, keyboard-operable `<button type="button">` — never submits
 * an enclosing form, never breaks native autofill or a password manager (see `render.ts`'s own doc,
 * "Never breaks native autofill or a password manager", for why). Its accessible name comes from
 * {@linkcode PasswordInputBaseProps.getToggleLabel}, defaulting to plain English
 * `'Show password'`/`'Hide password'`; its visible glyph comes from `showIcon`/`hideIcon` when
 * given, this component's own inline "eye"/"eye-off" `<svg>` otherwise (`aria-hidden`, decorative —
 * the button's own `aria-label` is the real accessible name, same "one accessible name, decorative
 * visual" pattern `shared/close-button-icon.ts`'s own default glyph already establishes).
 *
 * @example
 * ```tsx
 * <Field label="Password" error={errors.password}>
 *   {(fieldProps) => (
 *     <PasswordInput
 *       {...fieldProps}
 *       value={password}
 *       onValueChange={setPassword}
 *       autoComplete="new-password"
 *       required
 *     />
 *   )}
 * </Field>
 * ```
 */
// Same widening cast `Card/index.ts`'s own doc explains in full — `createPasswordInput`'s shared
// body types `showIcon`/`hideIcon` as `() => E` (here, `() => ReactElement`), while this
// component's own public props are deliberately the wider `() => ReactNode`.
export const PasswordInput: (props: PasswordInputProps) => ReactElement = createPasswordInput<
  ReactElement
>(
  createElementWithNonceHydrationFix as unknown as CreateElement<ReactElement>,
  { useState },
  'onChange',
) as (props: PasswordInputProps) => ReactElement
