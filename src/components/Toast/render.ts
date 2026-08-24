import type { CreateElement } from 'typings/renderer.ts'
import { createAlert } from '../Alert/render.ts'
import { createButton } from '../Button/render.ts'
import { createIcon } from '../Icon/render.ts'
import { createProgressBar } from '../ProgressBar/render.ts'
import { MODAL_POSITION_STYLE, MODAL_Z_INDEX } from 'components/Modal/types.ts'
import type { ToastMessage, ToastPosition } from './types.ts'

/**
 * The hooks/primitives this component's shared body needs, injected alongside `h` — same shape
 * `Modal/render.ts`'s own `ModalHooks` establishes (see that file's own doc for the full soundness
 * reasoning, including why `createContext`/`useContext` are typed loosely — not repeated here);
 * `Toast` needs no `useRef`/`useFocusScope`/`useCloseOnOutside` (no focus trap or outside-click
 * dismissal of its own — a toast is imperatively shown/hidden, never trapped or backdrop-dismissed
 * the way `Modal`/`Drawer` are).
 */
export type ToastHooks = {
  createContext: (defaultValue: unknown) => unknown
  useContext: (context: unknown) => unknown
  useCallback: <T extends (...args: never[]) => unknown>(fn: T, deps: unknown[]) => T
  useMemo: <T>(fn: () => T, deps: unknown[]) => T
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
}

/** The object `useToast` returns, generic over nothing extra beyond `ToastApi` itself —
 * `index.ts`/`index.preact.ts` each re-export this shape as their own public `ToastApi`. */
export type ToastRenderApi = {
  showToast: (message: ToastMessage) => string
  closeToast: (id: string) => void
}

/**
 * The real implementation of `ToastProvider`/`useToast`, shared identically between the React and
 * Preact bindings — same pattern as `Modal/render.ts`. Composes the real `Button`/`Icon`/
 * `ProgressBar`/`Alert` (via their own `render.ts` factories, bound to the same `h`) — inherits
 * their own `data-space-ui` hooks on the elements they render, never a redundant one of its own;
 * each toast's own wrapper carries `data-space-ui="toast"` plus `data-variant`, the stack container
 * `data-space-ui="toast-stack"`.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (imperative-only, `position`
 * per-`ToastProvider` not per-toast, the `Alert` composition, the legacy `setTimeout`/
 * `clearInterval` bug NOT replicated, why `'custom'` variant was dropped, always-present close
 * button + upsert-by-`id` semantics) — not repeated here.
 */
export function createToast<E, Node>(
  h: CreateElement<E>,
  hooks: ToastHooks,
  Fragment: unknown,
): {
  ToastProvider: (props: { position?: ToastPosition; children: Node }) => E
  useToast: () => ToastRenderApi
} {
  const Button = createButton(h)
  const Icon = createIcon(h)
  const ProgressBar = createProgressBar(h)
  const Alert = createAlert(h)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  function ToastEntryView(
    { entry, onClose }: { entry: ToastMessage & { id: string }; onClose: () => void },
  ): E {
    const { variant = 'info', title, body, icon, buttons, timeout, showProgress, className } = entry
    const shouldShowProgress = showProgress ?? variant === 'loading'

    hooks.useEffect(() => {
      if (!timeout) return
      const timer = setTimeout(onClose, timeout)
      // `clearTimeout`, correctly paired with the `setTimeout` above that scheduled it — a real,
      // confirmed bug in legacy's own equivalent effect paired this with `clearInterval` instead.
      return () => clearTimeout(timer)
      // `onClose` deliberately excluded from the dependency list — it's a fresh inline closure
      // (`() => closeToast(entry.id)`) from `ToastProvider` on every render, and re-running this
      // effect on every one of THOSE re-renders would restart the countdown each time; `timeout`
      // itself is the only real trigger for "this toast's auto-dismiss timer should restart."
    }, [timeout])

    return h(
      'div',
      { className, 'data-space-ui': 'toast', 'data-variant': variant },
      Alert({
        politeness: variant === 'error' ? 'assertive' : 'polite',
        children: [
          icon ? hAny(Fragment, { key: 'icon' }, Icon(icon)) : null,
          title ? h('strong', { key: 'title' }, title) : null,
          body ? h('p', { key: 'body' }, body) : null,
          hAny(Fragment, { key: 'close' }, Button({ onClick: onClose, label: 'Close' })),
          buttons?.length
            ? hAny(
              Fragment,
              { key: 'buttons' },
              buttons.map((buttonProps, index) =>
                hAny(Fragment, { key: index }, Button(buttonProps))
              ),
            )
            : null,
          timeout && shouldShowProgress
            ? hAny(Fragment, { key: 'progress' }, ProgressBar({ timeout }))
            : null,
        ],
      }),
    )
  }

  const ToastContext = hooks.createContext(null)

  let nextToastId = 0

  function ToastProvider(props: { position?: ToastPosition; children: Node }): E {
    const { position = 'bottom-left', children } = props
    const [entries, setEntries] = hooks.useState<Array<ToastMessage & { id: string }>>([])

    const closeToast = hooks.useCallback((id: string) => {
      setEntries((current) => {
        const entry = current.find((item) => item.id === id)
        entry?.onClose?.()
        return current.filter((item) => item.id !== id)
      })
    }, [])

    const showToast = hooks.useCallback((message: ToastMessage): string => {
      const id = message.id ?? `toast-${++nextToastId}`
      const entry = { ...message, id }
      setEntries((current) => {
        const existingIndex = current.findIndex((item) => item.id === id)
        if (existingIndex === -1) return [...current, entry]
        const next = [...current]
        next[existingIndex] = entry
        return next
      })
      return id
    }, [])

    const api = hooks.useMemo<ToastRenderApi>(
      () => ({ showToast, closeToast }),
      [showToast, closeToast],
    )

    return hAny((ToastContext as { Provider: unknown }).Provider, { value: api }, [
      hAny(Fragment, { key: 'children' }, children),
      entries.length > 0
        ? h(
          'div',
          {
            key: 'stack',
            'data-space-ui': 'toast-stack',
            style: {
              position: 'fixed',
              zIndex: MODAL_Z_INDEX.dialog,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              ...MODAL_POSITION_STYLE[position],
            },
          },
          entries.map((entry) =>
            hAny(ToastEntryView, { key: entry.id, entry, onClose: () => closeToast(entry.id) })
          ),
        )
        : null,
    ])
  }

  function useToast(): ToastRenderApi {
    const context = hooks.useContext(ToastContext) as ToastRenderApi | null
    if (!context) {
      throw new Error(
        'useToast() was called outside a <ToastProvider>. Wrap the component tree that needs it ' +
          'with <ToastProvider>...</ToastProvider>.',
      )
    }
    return context
  }

  return { ToastProvider, useToast }
}
