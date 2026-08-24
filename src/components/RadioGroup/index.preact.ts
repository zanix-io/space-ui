import { Fragment, h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createRadioGroup } from './render.ts'
import type { RadioGroupBaseProps, RadioGroupItemBase } from './types.ts'

/** One radio option: {@linkcode RadioGroupItemBase} plus its `Button`'s visible content. */
export type RadioGroupItem = RadioGroupItemBase & {
  children: ComponentChildren
}

/** {@linkcode RadioGroupBaseProps} plus the list of selectable items. */
export type RadioGroupProps = RadioGroupBaseProps & {
  items: RadioGroupItem[]
}

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (the radiogroup pattern, why no
 * multi-select toggle-group case, why items are looked up fresh via the container rather than
 * per-item refs) — not repeated here. Same contract, same rendered behavior, real implementation
 * shared with the React binding via `render.ts`'s own `createRadioGroup` (hook injection — see
 * that file's own doc for why that's sound) — never `preact/compat`.
 */
export const RadioGroup: (props: RadioGroupProps) => VNode = createRadioGroup<
  VNode,
  ComponentChildren
>(
  h as unknown as CreateElement<VNode>,
  { useRef, useState },
  Fragment,
)
