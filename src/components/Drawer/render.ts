import type { CreateElement } from 'typings/renderer.ts'
import logger from 'shared/client-logger.ts'
import { createButton } from '../Button/render.ts'
import { isTopOverlay, registerOverlay } from 'shared/overlay-stack.ts'
import type { DrawerAccessibleName, DrawerBaseProps } from './types.ts'
import { DRAWER_SIDE_STYLE, DRAWER_Z_INDEX } from './types.ts'

/**
 * The hooks/primitives this component's shared body needs, injected alongside `h` — same shape
 * `Modal/render.ts`'s own `ModalHooks` establishes (see that file's own doc for the full soundness
 * reasoning, not repeated here); `Drawer` needs no `createContext`/`useContext`/`useCallback`/
 * `useMemo` (no provider/global mode of its own, unlike `Modal`), only `useEffect`/`useRef` plus
 * the same injected `useFocusScope`/`useCloseOnOutside` pair.
 */
export type DrawerHooks = {
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useRef: <T>(initial: T) => { current: T }
  useFocusScope: (
    containerRef: { current: HTMLElement | null },
    active: boolean,
    options: { initialFocusIndex?: number; shouldRestoreFocus?: () => boolean },
  ) => (event: { key: string; shiftKey: boolean; preventDefault(): void }) => void
  useCloseOnOutside: (
    ref: { current: HTMLElement | null },
    active: boolean,
    onClose: () => void,
  ) => void
}

/** {@linkcode DrawerBaseProps} plus an accessible name and the panel's own content, generic over
 * the renderer's own node type — `index.ts`/`index.preact.ts` each instantiate this as their own
 * public `DrawerProps`, with `ReactNode`/`ComponentChildren`. */
export type DrawerRenderProps<Node> = DrawerBaseProps & DrawerAccessibleName & { children: Node }

/**
 * The real implementation of `Drawer`, shared identically between the React and Preact bindings —
 * same pattern as `Modal/render.ts` (hook injection, `Fragment` injected as its own parameter for
 * the same reason `Menu/render.ts` documents). Composes the real `Button` (via its own `render.ts`
 * factory, bound to the same `h`) — inherits its own `data-space-ui="button"` hook on the close
 * button it renders, never a redundant one of its own; the panel root itself carries
 * `data-space-ui="drawer"`, the optional backdrop `data-space-ui="drawer-backdrop"`.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (shares `Modal`'s own overlay
 * stack, `side` with no default, otherwise identical to `Modal`'s own contract) — not repeated
 * here.
 */
export function createDrawer<E, Node>(
  h: CreateElement<E>,
  hooks: DrawerHooks,
  Fragment: unknown,
): (props: DrawerRenderProps<Node>) => E | null {
  const Button = createButton(h)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function Drawer(props: DrawerRenderProps<Node>): E | null {
    const {
      open,
      onClose,
      side,
      label,
      ariaLabelledBy,
      showOverlay = true,
      closeOnEscape = true,
      id,
      className,
      children,
    } = props

    if (!label && !ariaLabelledBy) {
      logger.warn(
        'Drawer: neither `label` nor `ariaLabelledBy` was given — this panel has no accessible ' +
          'name. Pass one of the two so assistive technology can announce what this panel is.',
        'noSave',
      )
    }

    const stackId = hooks.useRef(Symbol('drawer')).current
    const containerRef = hooks.useRef<HTMLDivElement | null>(null)

    // Same declaration-order requirement `Modal/render.ts`'s own doc explains in full — sibling
    // effects clean up in the SAME order they were declared, not reversed.
    const handleFocusScopeTab = hooks.useFocusScope(containerRef, open, {
      initialFocusIndex: 1,
      shouldRestoreFocus: () => isTopOverlay(stackId),
    })

    hooks.useEffect(() => {
      if (!open) return
      return registerOverlay(stackId)
    }, [open, stackId])

    hooks.useCloseOnOutside(containerRef, open && !showOverlay, () => {
      if (isTopOverlay(stackId)) onClose()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopOverlay(stackId)) return

      if (closeOnEscape && event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      handleFocusScopeTab(event)
    }

    if (!open) return null

    const backdrop = showOverlay
      ? h('div', {
        key: 'backdrop',
        'data-space-ui': 'drawer-backdrop',
        style: { position: 'fixed', inset: 0, zIndex: DRAWER_Z_INDEX.backdrop },
      })
      : null

    return hAny(Fragment, null, [
      backdrop,
      h(
        'div',
        {
          key: 'panel',
          id,
          className,
          ref: containerRef,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': label,
          'aria-labelledby': ariaLabelledBy,
          tabIndex: -1,
          'data-space-ui': 'drawer',
          onKeyDown: handleKeyDown,
          style: {
            position: 'fixed',
            zIndex: DRAWER_Z_INDEX.panel,
            ...DRAWER_SIDE_STYLE[side],
          },
        },
        [
          hAny(Fragment, { key: 'close' }, Button({ onClick: onClose, label: 'Close' })),
          hAny(Fragment, { key: 'children' }, children),
        ],
      ),
    ])
  }
}
