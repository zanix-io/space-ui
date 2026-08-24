import type { CreateElement } from 'typings/renderer.ts'
import type { DisclosureBaseProps } from './types.ts'

/**
 * The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 */
export type DisclosureHooks = {
  useId: () => string
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
}

/** {@linkcode DisclosureBaseProps} plus the trigger and the collapsible content, generic over the
 * renderer's own node type — `index.ts`/`index.preact.ts` each instantiate this as their own
 * public `DisclosureProps`, with `ReactNode`/`ComponentChildren`. */
export type DisclosureRenderProps<Node> = DisclosureBaseProps & {
  /** Content of the trigger `<button>` this component renders — never a pre-built element of its
   * own. See `index.ts`'s own doc ("Why `trigger` is content, not an element") for why. */
  trigger: Node
  /** The collapsible content. */
  children: Node
}

/**
 * The real implementation of `Disclosure`, shared identically between the React and Preact
 * bindings — same pattern as `Table/render.ts`. Renders a plain `<button>` directly (never the
 * composed `Button`, since this component needs full control over the trigger's own attributes —
 * `aria-expanded`/`aria-controls` — the same reason `Menu`'s structurally identical disclosure
 * triggers compose `Button` directly with those extra ARIA fields rather than reaching for a
 * smaller API); the root `<div>` carries `data-space-ui="disclosure"`.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (why `trigger` is content, not
 * an element; why `hidden`, not unmounting, when closed; why not `<details>`/`<summary>`; no
 * `role="region"` by default; SSR/hydration via `useId()`) — not repeated here.
 */
export function createDisclosure<E, Node>(
  h: CreateElement<E>,
  hooks: DisclosureHooks,
): (props: DisclosureRenderProps<Node>) => E {
  return function Disclosure(props: DisclosureRenderProps<Node>): E {
    const {
      trigger,
      children,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      id,
      className,
    } = props
    const contentId = hooks.useId()
    const triggerId = hooks.useId()
    const isControlled = controlledOpen !== undefined
    const [internalOpen, setInternalOpen] = hooks.useState(defaultOpen)
    const isOpen = isControlled ? controlledOpen : internalOpen

    const setOpen = (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    }

    return h(
      'div',
      { id, className, 'data-space-ui': 'disclosure' },
      h(
        'button',
        {
          id: triggerId,
          type: 'button',
          'aria-expanded': isOpen,
          'aria-controls': contentId,
          onClick: () => setOpen(!isOpen),
        },
        trigger,
      ),
      h(
        'div',
        { id: contentId, 'aria-labelledby': triggerId, hidden: !isOpen },
        children,
      ),
    )
  }
}
