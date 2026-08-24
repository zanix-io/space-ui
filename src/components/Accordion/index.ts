import { createElement, useId, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createAccordion } from './render.ts'
import type { AccordionBaseProps, AccordionItemBase } from './types.ts'

/** One collapsible section: {@linkcode AccordionItemBase} plus its trigger and content. */
export type AccordionItem = AccordionItemBase & {
  /** Same "content of the `<button>` `Disclosure` renders, never a pre-built element" contract —
   * see `Disclosure/index.ts`'s own doc for why. */
  trigger: ReactNode
  /** The collapsible content for this section. */
  children: ReactNode
}

/** {@linkcode AccordionBaseProps} plus the list of sections to render. */
export type AccordionProps = AccordionBaseProps & {
  items: AccordionItem[]
}

/**
 * A list of `Disclosure` sections with one component coordinating which are open — the WAI-ARIA
 * Accordion pattern. Real implementation shared with the Preact binding via `render.ts`'s own
 * `createAccordion` (see that file's own doc for how — hook injection); import from
 * `@zanix/space-ui/preact` instead for the Preact one, same contract, same rendered behavior. No
 * legacy equivalent — new, composing `Disclosure` directly rather than duplicating its own markup/
 * behavior (see `Disclosure/index.ts`'s own doc for the trigger/`hidden`/`<details>`/
 * `role="region"` decisions this inherits unchanged).
 *
 * ## Data-driven, same shape `Menu.items` already establishes
 *
 * `items: AccordionItem[]` — each item's `trigger`/`children` map straight onto the `Disclosure`
 * this component renders for it, one per item. An item's `id` (optional, falls back to its own
 * index) is the identity `openItems`/`onOpenItemsChange` track — see `types.ts`'s own doc.
 *
 * ## `multiple` — coordinates through `Disclosure`'s own `open`, no new mechanism
 *
 * Every section is a real, independent `Disclosure`, each with its own `open` driven directly by
 * this component's own open-item set — never told about the others. Opening one section in
 * single-open mode (`multiple` unset/`false`) closes any other simply because this component
 * computes a NEW one-item set and passes it down; each other `Disclosure` re-renders with
 * `open={false}` like any ordinary controlled prop change. No cross-item coordination lives inside
 * `Disclosure` itself.
 *
 * ## No extra keyboard handling
 *
 * The WAI-ARIA APG's own Accordion pattern lists arrow-key navigation BETWEEN section headers as
 * an optional enhancement ("should", not "must") layered on top of headers that stay individually
 * `Tab`-reachable — genuinely NOT the same shape `shared/roving-focus.ts` assumes (a radiogroup/
 * tablist, where only ONE item is ever in the tab sequence at a time). Plain `Tab` through each
 * `Disclosure`'s own button is already spec-compliant on its own, so nothing extra is added here
 * without a real consumer motivating the specific shape that enhancement should take.
 */
export const Accordion: (props: AccordionProps) => ReactElement = createAccordion<
  ReactElement,
  ReactNode
>(
  createElement as unknown as CreateElement<ReactElement>,
  { useId, useState },
)
