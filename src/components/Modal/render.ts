import type { CreateElement } from 'typings/renderer.ts'
import logger from 'shared/client-logger.ts'
import { createButton } from '../Button/render.ts'
import { createDefaultCloseIcon } from 'shared/close-button-icon.ts'
import { isTopOverlay, registerOverlay } from 'shared/overlay-stack.ts'
import type { ModalAccessibleName, ModalBaseProps } from './types.ts'
import { MODAL_POSITION_CSS } from './types.ts'

/**
 * The hooks/primitives this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here). Every one of
 * these is still only ever called at this component's own top level, in the same order, every
 * render — never conditionally, never inside a loop — so the same call-order-keying argument
 * applies unchanged, even for this wider bag.
 *
 * `useFocusScope`/`useCloseOnOutside` are themselves injected too, not imported directly — each is
 * already a per-renderer pair (`shared/focus-scope.ts`/`.preact.ts`,
 * `shared/close-on-outside.ts`/`.preact.ts`), so `index.ts`/`index.preact.ts` each pass their own
 * already-bound one in, the same way `Menu/render.ts` already does for `useCloseOnOutside` alone.
 *
 * `createContext`/`useContext` are typed loosely (`unknown` in, `unknown` out) rather than against
 * a generic `Context<T>` shape: React's and Preact's own `Context<T>` types carry more fields
 * (`Consumer`, `displayName`, ...) than any structural subset this file could name, and assigning
 * either renderer's real, generic `useContext<T>(context: Context<T>): T` into a field typed
 * against a narrower structural `Context<T>` fails TypeScript's contravariant parameter check
 * (confirmed empirically, not assumed) — verified with a throwaway prototype: `{ Provider: unknown
 * }` as the declared parameter type still failed the exact same way. Loosening both ends to
 * `unknown` and casting at the two read sites ({@linkcode createModal}'s own `ModalStackContext`
 * construction, and `useModal`'s own read) is the sound fix, not a workaround — the cast is exactly
 * as safe as it already was in the un-refactored code, where TypeScript trusted `createContext`'s
 * own inferred type without this file's own narrower annotation getting in the way at all.
 */
export type ModalHooks = {
  createContext: (defaultValue: unknown) => unknown
  useContext: (context: unknown) => unknown
  useCallback: <T extends (...args: never[]) => unknown>(fn: T, deps: unknown[]) => T
  useMemo: <T>(fn: () => T, deps: unknown[]) => T
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
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

/** {@linkcode ModalBaseProps} plus an accessible name and the dialog's own content, generic over
 * the renderer's own node type — `index.ts`/`index.preact.ts` each instantiate this as their own
 * public `ModalProps`, with `ReactNode`/`ComponentChildren`. */
export type ModalRenderProps<Node> = ModalBaseProps & ModalAccessibleName & { children: Node }

/** The object `useModal` returns, generic over `Node` — `index.ts`/`index.preact.ts` each
 * instantiate this as their own public `ModalStackApi`. */
export type ModalRenderStackApi<Node> = {
  openModal: (
    props: Omit<ModalRenderProps<Node>, 'open' | 'onClose'> & { onClose?: () => void },
  ) => string
  closeModal: (id: string) => void
}

/**
 * The real implementation of `Modal`/`ModalProvider`/`useModal`, shared identically between the
 * React and Preact bindings — same pattern as `Table/render.ts`, extended with a wider hook bag
 * (see {@linkcode ModalHooks}'s own doc, including why `createContext`/`useContext` are typed
 * loosely). Composes the real `Button` (via its own `render.ts` factory, bound to the same `h`) —
 * inherits its own `data-space-ui="button"` hook on the close button it renders, never a redundant
 * one of its own; the dialog root itself carries `data-space-ui="modal"`, the optional backdrop
 * `data-space-ui="modal-backdrop"`.
 *
 * The close button's own visible content is `closeButtonContent` when given, otherwise
 * `shared/close-button-icon.ts`'s own default inline "X" `<svg>` (see that module's own doc for why
 * — not a Unicode character, not a bundled `CatalogIcon` call). Either way it becomes that same
 * `Button`'s own `children`; `aria-label="Close"` is unconditional, independent of which content
 * renders.
 *
 * `Fragment` is injected as its own parameter (not a hook) for the same reason `Menu/render.ts`
 * already documents: `CreateElement`'s own `type` parameter is typed as `string` only, so calling
 * `h` with a component reference needs a small local widening cast, done once here.
 *
 * Positioning (`position`/`z-index`, plus the per-`ModalPosition` anchor) is a `<style
 * nonce={nonce}>` element this component renders itself, built once from `MODAL_POSITION_CSS`
 * (`Modal/types.ts`) — never an inline `style` attribute, which a nonce-based CSP blocks
 * unconditionally. See that constant's own doc for the full reasoning.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (declarative vs.
 * `ModalProvider`/`useModal`, no portal, the accessible-name contract, backdrop vs. outside-click,
 * focus management, stacking, scroll lock) — not repeated here.
 */
export function createModal<E, Node>(
  h: CreateElement<E>,
  hooks: ModalHooks,
  Fragment: unknown,
): {
  Modal: (props: ModalRenderProps<Node>) => E | null
  ModalProvider: (props: { children: Node }) => E
  useModal: () => ModalRenderStackApi<Node>
} {
  const Button = createButton(h)
  const DefaultCloseIcon = createDefaultCloseIcon(h)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  function Modal(props: ModalRenderProps<Node>): E | null {
    const {
      open,
      onClose,
      closeButtonContent,
      label,
      ariaLabelledBy,
      showOverlay = true,
      closeOnEscape = true,
      position = 'center',
      id,
      className,
      nonce,
      children,
    } = props

    if (!label && !ariaLabelledBy) {
      // `'noSave'` — this warning is ephemeral dev-time output, never meant to be persisted. What
      // actually keeps a browser-bundled call to `logger.warn` from ever reaching the (Deno-only)
      // storage path is the IMPORT above (`shared/client-logger.ts`, never `@zanix/utils/logger`
      // directly — see that shared module's own doc): `'noSave'` alone is a runtime flag on this
      // one call, and can't prevent the OTHER entry's static import graph from being bundled at all.
      logger.warn(
        'Modal: neither `label` nor `ariaLabelledBy` was given — this dialog has no accessible ' +
          'name. Pass one of the two so assistive technology can announce what this dialog is.',
        'noSave',
      )
    }

    const stackId = hooks.useRef(Symbol('modal')).current
    const containerRef = hooks.useRef<HTMLDivElement | null>(null)

    // Declared BEFORE the stacking effect below on purpose — sibling effects clean up in the SAME
    // order they were declared in, not reversed, in both renderers. `shouldRestoreFocus`'s own
    // `isTopOverlay` check needs to run before `unregister()` removes this instance from the stack,
    // or it would always see itself as already gone and never restore focus — this declaration
    // order is what guarantees that.
    const handleFocusScopeTab = hooks.useFocusScope(containerRef, open, {
      // Skip the dialog's own close button — always focusable descendant #0, by construction — as
      // the INITIAL focus target specifically: auto-focusing a dismissive control risks an
      // accidental close from a reflexive Enter/Space. It's still reachable normally once `Tab`
      // cycling is in play.
      initialFocusIndex: 1,
      // Closing a modal that has another one stacked on top of it must never yank focus out of the
      // modal that's still trapping it.
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
    // inline `style` attribute — see `MODAL_POSITION_CSS`'s own doc for the full CSP reasoning.
    // `nonce` is threaded straight from this component's own props; harmless (and `undefined`) when
    // the consuming page has no nonce-based CSP.
    const styleEl = h('style', { key: 'style', nonce }, MODAL_POSITION_CSS)

    const backdrop = showOverlay
      ? h('div', { key: 'backdrop', 'data-space-ui': 'modal-backdrop' })
      : null

    return hAny(Fragment, null, [
      styleEl,
      backdrop,
      h(
        'div',
        {
          key: 'dialog',
          id,
          className,
          ref: containerRef,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': label,
          'aria-labelledby': ariaLabelledBy,
          tabIndex: -1,
          'data-space-ui': 'modal',
          'data-position': position,
          onKeyDown: handleKeyDown,
        },
        [
          hAny(
            Fragment,
            { key: 'close' },
            // `children` here is the close button's own visible content — `closeButtonContent`
            // when the caller supplies one, otherwise the default inline "X" `<svg>` (see
            // `shared/close-button-icon.ts`'s own doc for why: a real, self-contained SVG renders
            // identically everywhere, unlike a system-font Unicode glyph, without depending on the
            // icon-catalog sprite `CatalogIcon` needs an `href` for — this component has no way to
            // know one). `aria-label="Close"` stays the accessible name regardless.
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

  type ModalEntry =
    & Omit<ModalRenderProps<Node>, 'open' | 'onClose'>
    & { id: string; onClose?: () => void }

  const ModalStackContext = hooks.createContext(null)

  let nextEntryId = 0

  function ModalProvider(props: { children: Node }): E {
    const [entries, setEntries] = hooks.useState<ModalEntry[]>([])

    const closeModal = hooks.useCallback((id: string) => {
      setEntries((current) => current.filter((entry) => entry.id !== id))
    }, [])

    const openModal = hooks.useCallback(
      (entryProps: Omit<ModalRenderProps<Node>, 'open' | 'onClose'> & { onClose?: () => void }) => {
        const id = `modal-${++nextEntryId}`
        setEntries((current) => [...current, { ...entryProps, id }])
        return id
      },
      [],
    )

    const api = hooks.useMemo<ModalRenderStackApi<Node>>(
      () => ({ openModal, closeModal }),
      [openModal, closeModal],
    )

    return hAny((ModalStackContext as { Provider: unknown }).Provider, { value: api }, [
      hAny(Fragment, { key: 'children' }, props.children),
      ...entries.map((entry) => {
        const { id, onClose: consumerOnClose, ...rest } = entry
        // `closeModal(id)` always removes the entry — the provider never lets a consumer-supplied
        // `onClose` prevent that. `finally` guarantees it runs even if `consumerOnClose` throws.
        return hAny(Modal, {
          key: id,
          ...rest,
          open: true,
          onClose: () => {
            try {
              consumerOnClose?.()
            } finally {
              closeModal(id)
            }
          },
        })
      }),
    ])
  }

  function useModal(): ModalRenderStackApi<Node> {
    const context = hooks.useContext(ModalStackContext) as ModalRenderStackApi<Node> | null
    if (!context) {
      throw new Error(
        'useModal() was called outside a <ModalProvider>. Wrap the component tree that needs it ' +
          'with <ModalProvider>...</ModalProvider>, or use <Modal open={...} onClose={...}> ' +
          "directly if you don't need to open it from an arbitrary depth.",
      )
    }
    return context
  }

  return { Modal, ModalProvider, useModal }
}
