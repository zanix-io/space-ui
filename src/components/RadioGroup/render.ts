import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createRovingKeyDownHandler } from 'shared/roving-focus.ts'
import type { RadioGroupBaseProps, RadioGroupItemBase } from './types.ts'

/**
 * The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 */
export type RadioGroupHooks = {
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
}

/** {@linkcode RadioGroupItemBase} plus its `Button`'s visible content, generic over the renderer's
 * own node type — `index.ts`/`index.preact.ts` each instantiate this as their own public
 * `RadioGroupItem`, with `ReactNode`/`ComponentChildren`. */
export type RadioGroupRenderItem<Node> = RadioGroupItemBase & { children: Node }

/** {@linkcode RadioGroupBaseProps} plus the list of selectable items, generic over `Node`. */
export type RadioGroupRenderProps<Node> = RadioGroupBaseProps & {
  items: RadioGroupRenderItem<Node>[]
}

/**
 * The real implementation of `RadioGroup`, shared identically between the React and Preact
 * bindings — same pattern as `Table/render.ts`. Composes the real `Button` (via its own
 * `render.ts` factory, bound to the same `h`) — inherits its own `data-space-ui="button"` hook on
 * every item it renders, never a redundant one of its own; the root `<div>` itself carries
 * `data-space-ui="radio-group"`. `Fragment` is injected as its own parameter (not a hook) for the
 * same reason `Menu/render.ts` documents — needed here so each composed `Button` in the items list
 * can still carry a real `key`, the same missing-key fix `Modal`/`Drawer`/`Toast/render.ts` already
 * needed for their own composed, factory-produced children.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (the radiogroup pattern, why no
 * multi-select toggle-group case, why items are looked up fresh via the container rather than
 * per-item refs) — not repeated here.
 */
export function createRadioGroup<E, Node>(
  h: CreateElement<E>,
  hooks: RadioGroupHooks,
  Fragment: unknown,
): (props: RadioGroupRenderProps<Node>) => E {
  const Button = createButton(h)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function RadioGroup(props: RadioGroupRenderProps<Node>): E {
    const {
      items,
      value: controlledValue,
      defaultValue,
      onValueChange,
      orientation = 'horizontal',
      label,
      id,
      className,
    } = props
    const isControlled = controlledValue !== undefined
    const [internalValue, setInternalValue] = hooks.useState(defaultValue)
    const value = isControlled ? controlledValue : internalValue
    const containerRef = hooks.useRef<HTMLDivElement | null>(null)

    const setValue = (next: string) => {
      if (!isControlled) setInternalValue(next)
      onValueChange?.(next)
    }

    const selectedIndex = items.findIndex((item) => item.value === value)
    const activeIndex = selectedIndex === -1 ? 0 : selectedIndex

    const handleKeyDown = createRovingKeyDownHandler(
      activeIndex,
      items.length,
      (nextIndex) => setValue(items[nextIndex].value),
      (index) => containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[index],
      orientation,
    )

    return h(
      'div',
      {
        ref: containerRef,
        id,
        className,
        role: 'radiogroup',
        'aria-label': label,
        'data-space-ui': 'radio-group',
        onKeyDown: handleKeyDown,
      },
      items.map((item, index) =>
        hAny(
          Fragment,
          { key: item.value },
          Button({
            role: 'radio',
            checked: item.value === value,
            onClick: () => setValue(item.value),
            label: item.label,
            tabIndex: index === activeIndex ? 0 : -1,
            children: item.children,
          }),
        )
      ),
    )
  }
}
