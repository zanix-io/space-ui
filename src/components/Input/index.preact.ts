import { h } from 'preact'
import type { VNode } from 'preact'
import { useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createInput } from './render.ts'
import type { InputBaseProps } from './types.ts'

/** {@linkcode InputBaseProps} — nothing extra for the Preact binding. */
export type InputProps = InputBaseProps

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (controlled `value`/
 * `onValueChange` with an uncontrolled `defaultValue` fallback, the thin native-attribute
 * passthrough, composing inside `Field`) — not repeated here. Same contract, same rendered
 * behavior, real implementation shared with the React binding via `render.ts`'s own `createInput`
 * (hook injection, plus the one isolable `onChange`/`onInput` prop-key difference — see that
 * file's own doc for why that's sound) — never `preact/compat`. Passes `'onInput'` as this
 * binding's own `changeEventProp`, the literal native `input` event, for live per-keystroke
 * updates — Preact's own `onChange` would instead mean the native `change` event (fires only on
 * blur), the same real divergence `Combobox/index.preact.ts` already documents.
 */
export const Input: (props: InputProps) => VNode = createInput<VNode>(
  h as unknown as CreateElement<VNode>,
  { useState },
  'onInput',
)
