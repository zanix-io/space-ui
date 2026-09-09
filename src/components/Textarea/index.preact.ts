import { h } from 'preact'
import type { VNode } from 'preact'
import { useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createTextarea } from './render.ts'
import type { TextareaBaseProps } from './types.ts'

/** {@linkcode TextareaBaseProps} — nothing extra for the Preact binding. */
export type TextareaProps = TextareaBaseProps

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (controlled `value`/
 * `onValueChange` with an uncontrolled `defaultValue` fallback, the thin native-attribute
 * passthrough, composing inside `Field`) — not repeated here. Same contract, same rendered
 * behavior, real implementation shared with the React binding via `render.ts`'s own
 * `createTextarea` (hook injection, plus the same isolable `onChange`/`onInput` prop-key
 * difference `Input/index.preact.ts` already documents) — never `preact/compat`. Passes
 * `'onInput'` as this binding's own `changeEventProp`, the literal native `input` event, for live
 * per-keystroke updates — Preact's own `onChange` would instead mean the native `change` event
 * (fires only on blur), the same divergence `Input/index.preact.ts` already documents.
 */
export const Textarea: (props: TextareaProps) => VNode = createTextarea<VNode>(
  h as unknown as CreateElement<VNode>,
  { useState },
  'onInput',
)
