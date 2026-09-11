import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createPasswordInput } from './render.ts'
import type { PasswordInputBaseProps } from './types.ts'

export type { PasswordInputBaseProps } from './types.ts'

/** See `index.ts`'s own `PasswordInputProps` doc — same type, with `ComponentChildren` in place of
 * `ReactNode`. */
export type PasswordInputProps = PasswordInputBaseProps & {
  /** See `index.ts`'s own `PasswordInputProps.showIcon` doc — same render-prop slot, returning
   * `ComponentChildren` instead of `ReactNode`. */
  showIcon?: () => ComponentChildren
  /** See `index.ts`'s own `PasswordInputProps.hideIcon` doc. */
  hideIcon?: () => ComponentChildren
}

/**
 * A password `Input` with a built-in, accessible show/hide visibility toggle — see `index.ts`'s
 * own doc for the full contract (native-attribute passthrough, `Field` composition, the toggle
 * button's own accessibility guarantees, why autofill/password managers stay unaffected), not
 * repeated here. Preact binding, same props, same rendered markup; import from `@zanix/space-ui`
 * (no subpath) for the React one. Passes `'onInput'` as `createPasswordInput`'s own
 * `changeEventProp` — the same real `onChange`/`onInput` divergence `Input/index.preact.ts` already
 * documents applies identically here, since the composed `Input` is still a plain live-typing
 * `<input>`.
 */
// Same widening cast `index.ts`'s own doc explains, applied to `ComponentChildren` here instead of
// `ReactNode`.
export const PasswordInput: (props: PasswordInputProps) => VNode = createPasswordInput<VNode>(
  h as unknown as CreateElement<VNode>,
  { useState },
  'onInput',
) as (props: PasswordInputProps) => VNode
