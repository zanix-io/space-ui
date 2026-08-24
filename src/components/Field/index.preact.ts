import { Fragment, h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useId } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createField } from './render.ts'
import type { FieldBaseProps, FieldRenderProps } from './types.ts'

/** {@linkcode FieldBaseProps} plus the render-prop that supplies the actual form control. */
export type FieldProps = FieldBaseProps & {
  children: (fieldProps: FieldRenderProps) => ComponentChildren
}

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (why `children` is a render-prop
 * here specifically, why the error message composes `Alert`) — not repeated here. Same contract,
 * same rendered behavior, real implementation shared with the React binding via `render.ts`'s own
 * `createField` (hook injection — see that file's own doc for why that's sound) — never
 * `preact/compat`.
 */
export const Field: (props: FieldProps) => VNode = createField<VNode, ComponentChildren>(
  h as unknown as CreateElement<VNode>,
  { useId },
  Fragment,
)
