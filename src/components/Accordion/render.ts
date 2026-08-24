import type { CreateElement } from 'typings/renderer.ts'
import { createDisclosure } from '../Disclosure/render.ts'
import type { AccordionBaseProps, AccordionItemBase } from './types.ts'

/**
 * The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here). Includes
 * `useId` even though this component's own body never calls it directly — `createDisclosure`
 * itself needs it for every composed `Disclosure` instance, so this bag is exactly
 * `DisclosureHooks` plus `useState` (already shared with it), passed straight through.
 */
export type AccordionHooks = {
  useId: () => string
  useState: <T>(initial: T | (() => T)) => [T, (value: T | ((current: T) => T)) => void]
}

/** {@linkcode AccordionItemBase} plus its `Disclosure`'s own trigger/content, generic over the
 * renderer's own node type — `index.ts`/`index.preact.ts` each instantiate this as their own public
 * `AccordionItem`, with `ReactNode`/`ComponentChildren`. */
export type AccordionRenderItem<Node> = AccordionItemBase & {
  trigger: Node
  children: Node
}

/** {@linkcode AccordionBaseProps} plus the list of sections to render, generic over `Node`. */
export type AccordionRenderProps<Node> = AccordionBaseProps & {
  items: AccordionRenderItem<Node>[]
}

/**
 * The real implementation of `Accordion`, shared identically between the React and Preact bindings
 * — same pattern as `Table/render.ts`. Composes the real `Disclosure` (via its own `render.ts`
 * factory, bound to the same `h`/`hooks`) — inherits its own `data-space-ui="disclosure"` hook on
 * every section it renders, never a redundant one of its own; the root `<div>` itself carries
 * `data-space-ui="accordion"`. Each composed `Disclosure` is rendered via `h(Disclosure, {key, ...})`
 * directly (not a bare function call the way `RadioGroup/render.ts`'s own composed `Button` needs a
 * `Fragment` wrapper for) — going through `h` this way already lets `key` attach correctly, no extra
 * wrapper needed.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (data-driven `items`, how
 * `multiple` coordinates purely through each `Disclosure`'s own `open`, why no extra keyboard
 * handling) — not repeated here.
 */
export function createAccordion<E, Node>(
  h: CreateElement<E>,
  hooks: AccordionHooks,
): (props: AccordionRenderProps<Node>) => E {
  const Disclosure = createDisclosure<E, Node>(h, hooks)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function Accordion(props: AccordionRenderProps<Node>): E {
    const {
      items,
      multiple = false,
      openItems: controlledOpenItems,
      defaultOpenItems = [],
      onOpenItemsChange,
      id,
      className,
    } = props
    const isControlled = controlledOpenItems !== undefined
    const [internalOpenItems, setInternalOpenItems] = hooks.useState(() =>
      multiple ? defaultOpenItems : defaultOpenItems.slice(0, 1)
    )
    const openItems = isControlled ? controlledOpenItems : internalOpenItems

    const setOpenItems = (next: string[]) => {
      if (!isControlled) setInternalOpenItems(next)
      onOpenItemsChange?.(next)
    }

    const handleItemChange = (itemId: string, isOpen: boolean) => {
      if (multiple) {
        setOpenItems(
          isOpen ? [...openItems, itemId] : openItems.filter((current) => current !== itemId),
        )
      } else {
        setOpenItems(isOpen ? [itemId] : [])
      }
    }

    return h(
      'div',
      { id, className, 'data-space-ui': 'accordion' },
      items.map((item, index) => {
        const itemId = item.id ?? String(index)
        return hAny(Disclosure, {
          key: itemId,
          trigger: item.trigger,
          open: openItems.includes(itemId),
          onOpenChange: (next: boolean) => handleItemChange(itemId, next),
          children: item.children,
        })
      }),
    )
  }
}
