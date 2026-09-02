import type { CreateElement } from 'typings/renderer.ts'
import logger from 'shared/client-logger.ts'
import { createButton } from '../Button/render.ts'
import { createDefaultCloseIcon } from 'shared/close-button-icon.ts'
import { isTopOverlay, registerOverlay } from 'shared/overlay-stack.ts'
import type { DrawerAccessibleName, DrawerBaseProps } from './types.ts'
import { DRAWER_POSITION_CSS } from './types.ts'

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
 * The close button's own visible content is `closeButtonContent` when given, otherwise
 * `shared/close-button-icon.ts`'s own default inline "X" `<svg>` — same contract, same reasoning
 * `Modal/render.ts`'s own doc already covers (not repeated here); `aria-label="Close"` is
 * unconditional either way.
 *
 * Positioning is a `<style nonce={nonce}>` element this component renders itself, built once from
 * `DRAWER_POSITION_CSS` (`Drawer/types.ts`) — same mechanism/reasoning as `Modal/render.ts`'s own
 * `MODAL_POSITION_CSS`, never an inline `style` attribute.
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
  const DefaultCloseIcon = createDefaultCloseIcon(h)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function Drawer(props: DrawerRenderProps<Node>): E | null {
    const {
      open,
      onClose,
      closeButtonContent,
      side,
      label,
      ariaLabelledBy,
      showOverlay = true,
      closeOnEscape = true,
      id,
      className,
      nonce,
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

    // Static, non-dynamic positioning CSS, injected as a real `<style>` element instead of an
    // inline `style` attribute — see `DRAWER_POSITION_CSS`'s own doc for the full CSP reasoning.
    const styleEl = h('style', { key: 'style', nonce }, DRAWER_POSITION_CSS)

    const backdrop = showOverlay
      ? h('div', { key: 'backdrop', 'data-space-ui': 'drawer-backdrop' })
      : null

    return hAny(Fragment, null, [
      styleEl,
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
          'data-side': side,
          onKeyDown: handleKeyDown,
        },
        [
          hAny(
            Fragment,
            { key: 'close' },
            // Same default-vs-override contract `Modal/render.ts`'s own close button uses (see
            // that file's own comment here for the full reasoning) — not repeated per component.
            Button({
              onClick: onClose,
              label: 'Close',
              children: closeButtonContent ?? DefaultCloseIcon(),
            }),
          ),
          hAny(Fragment, { key: 'children' }, children),
        ],
      ),
    ])
  }
}
