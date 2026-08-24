import { h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import { useId, useState } from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createAccordion } from './render.ts'
import type { AccordionBaseProps, AccordionItemBase } from './types.ts'

/** One collapsible section: {@linkcode AccordionItemBase} plus its trigger and content. */
export type AccordionItem = AccordionItemBase & {
  trigger: ComponentChildren
  children: ComponentChildren
}

/** {@linkcode AccordionBaseProps} plus the list of sections to render. */
export type AccordionProps = AccordionBaseProps & {
  items: AccordionItem[]
}

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (data-driven `items`, how
 * `multiple` coordinates purely through each `Disclosure`'s own `open`, why no extra keyboard
 * handling) — not repeated here. Same contract, same rendered behavior, real implementation shared
 * with the React binding via `render.ts`'s own `createAccordion` (hook injection — see that file's
 * own doc for why that's sound) — never `preact/compat`.
 */
export const Accordion: (props: AccordionProps) => VNode = createAccordion<
  VNode,
  ComponentChildren
>(
  h as unknown as CreateElement<VNode>,
  { useId, useState },
)
