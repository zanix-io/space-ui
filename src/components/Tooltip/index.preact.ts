import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { usePosition } from 'shared/use-position.preact.ts'
import { createTooltip } from './render.ts'
import type { TooltipBaseProps, TooltipTriggerRenderProps } from './types.ts'

/** {@linkcode TooltipBaseProps} plus the render-prop that supplies the trigger element. */
export type TooltipProps = TooltipBaseProps & {
  trigger: (triggerProps: TooltipTriggerRenderProps) => ComponentChildren
  content: ComponentChildren
}

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (always mounted rather than
 * unmounted like `Popover`, why every trigger event lands on the caller's own element and never a
 * wrapper, why keyboard focus bypasses both delays, no outside-click dismissal, no focus trap, why
 * `Escape` is a document-level listener rather than `createEscapeToCloseHandler` on the trigger — a
 * real bug found while building this, not a stylistic choice — measured while hidden then revealed)
 * — not repeated here. Same contract, same rendered behavior, real implementation shared with the
 * React binding via `render.ts`'s own `createTooltip` (hook injection — see that file's own doc for
 * why that's sound) — never `preact/compat`.
 */
export const Tooltip: (props: TooltipProps) => VNode = createTooltip<VNode, ComponentChildren>(
  h as unknown as CreateElement<VNode>,
  { useEffect, useLayoutEffect, useId, useMemo, useRef, useState, usePosition },
)
