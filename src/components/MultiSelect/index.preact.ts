import { h } from 'preact'
import type { VNode } from 'preact'
import { useId, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.preact.ts'
import { usePosition } from 'shared/use-position.preact.ts'
import { createMultiSelect } from './render.ts'
import type { MultiSelectBaseProps } from './types.ts'

/** {@linkcode MultiSelectBaseProps} — nothing extra for the Preact binding. */
export type MultiSelectProps = MultiSelectBaseProps

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (the two `allowCustomValue`
 * modes, already-committed values excluded from the listbox, chip removal via a composed `Button`
 * plus `Backspace`, `aria-activedescendant` rather than roving tabindex, `max` capping commits
 * never removals, the visually-hidden selected-count description, controlled/uncontrolled
 * `values`/`inputValue`/`open`, and why this is a genuine sibling implementation rather than a
 * `Combobox` composition) — not repeated here. Same contract, same rendered behavior, real
 * implementation shared with the React binding via `render.ts`'s own `createMultiSelect` (hook
 * injection, plus the one isolable `onChange`/`onInput` prop-key difference `Input/render.ts`
 * already established the shape for — see that file's own doc for why that's sound) — never
 * `preact/compat`. Passes `'onInput'` as this binding's own `changeEventProp`, the literal native
 * `input` event, for live per-keystroke updates — Preact's own `onChange` would instead mean the
 * native `change` event (fires only on blur), the same real divergence `Combobox/index.preact.ts`
 * already documents.
 */
export const MultiSelect: (props: MultiSelectProps) => VNode = createMultiSelect<VNode>(
  h as unknown as CreateElement<VNode>,
  { useId, useRef, useState, useCloseOnOutside, usePosition },
  'onInput',
)
