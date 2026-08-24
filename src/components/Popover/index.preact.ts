import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useId, useMemo, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.preact.ts'
import { usePosition } from 'shared/use-position.preact.ts'
import { createPopover } from './render.ts'
import type { PopoverBaseProps, PopoverTriggerRenderProps } from './types.ts'

/** {@linkcode PopoverBaseProps} plus the render-prop that supplies the trigger element. */
export type PopoverProps = PopoverBaseProps & {
  trigger: (triggerProps: PopoverTriggerRenderProps) => ComponentChildren
  children: ComponentChildren
}

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (why `trigger` is a render-prop
 * with no `ref` crossing it, why no portal, why no focus trap, why unmounted-when-closed like
 * `Modal`, why `useCloseOnOutside` scopes to a container wrapping BOTH the trigger and the panel
 * instead of the trigger alone, why the panel is measured while hidden then revealed) — not
 * repeated here. Same contract, same rendered behavior, real implementation shared with the React
 * binding via `render.ts`'s own `createPopover` (hook injection — see that file's own doc for why
 * that's sound) — never `preact/compat`.
 */
export const Popover: (props: PopoverProps) => VNode = createPopover<VNode, ComponentChildren>(
  h as unknown as CreateElement<VNode>,
  { useId, useMemo, useRef, useState, useCloseOnOutside, usePosition },
)
