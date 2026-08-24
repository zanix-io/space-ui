import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createRovingKeyDownHandler } from 'shared/roving-focus.ts'
import type { TabItemBase, TabsBaseProps } from './types.ts'

/**
 * The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 */
export type TabsHooks = {
  useId: () => string
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
}

/** {@linkcode TabItemBase} plus its `Button` label and panel content, generic over the renderer's
 * own node type — `index.ts`/`index.preact.ts` each instantiate this as their own public
 * `TabItem`, with `ReactNode`/`ComponentChildren`. */
export type TabsRenderItem<Node> = TabItemBase & { label: Node; children: Node }

/** {@linkcode TabsBaseProps} plus the list of tabs, generic over `Node`. */
export type TabsRenderProps<Node> = TabsBaseProps & {
  items: TabsRenderItem<Node>[]
}

/**
 * The real implementation of `Tabs`, shared identically between the React and Preact bindings —
 * same pattern as `Table/render.ts`. Composes the real `Button` (via its own `render.ts` factory,
 * bound to the same `h`) — inherits its own `data-space-ui="button"` hook on every tab it renders,
 * never a redundant one of its own; the root `<div>` carries `data-space-ui="tabs"`, the tablist
 * `data-space-ui="tabs-list"`, the active panel `data-space-ui="tabs-panel"`. `Fragment` is
 * injected as its own parameter (not a hook) for the same reason `Menu/render.ts` documents —
 * needed here so each composed `Button` in the tab list can still carry a real `key`, the same
 * missing-key fix `Modal`/`Drawer`/`Toast`/`RadioGroup`'s own `render.ts` files already needed for
 * their own composed, factory-produced children.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (the tablist/tabpanel pattern,
 * the single-`useId()`-derived-per-item id scheme, why this defaults to the first item unlike
 * `RadioGroup`) — not repeated here.
 */
export function createTabs<E, Node>(
  h: CreateElement<E>,
  hooks: TabsHooks,
  Fragment: unknown,
): (props: TabsRenderProps<Node>) => E {
  const Button = createButton(h)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function Tabs(props: TabsRenderProps<Node>): E {
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
    const baseId = hooks.useId()
    const isControlled = controlledValue !== undefined
    const [internalValue, setInternalValue] = hooks.useState(defaultValue ?? items[0]?.value)
    const value = isControlled ? controlledValue : internalValue
    const containerRef = hooks.useRef<HTMLDivElement | null>(null)

    const setValue = (next: string) => {
      if (!isControlled) setInternalValue(next)
      onValueChange?.(next)
    }

    const selectedIndex = items.findIndex((item) => item.value === value)
    const activeIndex = selectedIndex === -1 ? 0 : selectedIndex
    const activeItem = items[activeIndex] as TabsRenderItem<Node> | undefined

    const handleKeyDown = createRovingKeyDownHandler(
      activeIndex,
      items.length,
      (nextIndex) => setValue(items[nextIndex].value),
      (index) => containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index],
      orientation,
    )

    return h(
      'div',
      { id, className, 'data-space-ui': 'tabs' },
      h(
        'div',
        {
          ref: containerRef,
          role: 'tablist',
          'aria-label': label,
          'data-space-ui': 'tabs-list',
          onKeyDown: handleKeyDown,
        },
        items.map((item, index) =>
          hAny(
            Fragment,
            { key: item.value },
            Button({
              id: `${baseId}-tab-${item.value}`,
              role: 'tab',
              selected: item.value === value,
              'aria-controls': `${baseId}-panel-${item.value}`,
              onClick: () => setValue(item.value),
              tabIndex: index === activeIndex ? 0 : -1,
              children: item.label,
            }),
          )
        ),
      ),
      activeItem
        ? h(
          'div',
          {
            key: activeItem.value,
            id: `${baseId}-panel-${activeItem.value}`,
            role: 'tabpanel',
            'aria-labelledby': `${baseId}-tab-${activeItem.value}`,
            tabIndex: 0,
            'data-space-ui': 'tabs-panel',
          },
          activeItem.children,
        )
        : null,
    )
  }
}
