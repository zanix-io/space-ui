import { createContext, Fragment, h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import {
  useCallback,
  useContext as usePreactContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.preact.ts'
import { useFocusScope } from 'shared/focus-scope.preact.ts'
import { createModal } from './render.ts'
import type { ModalAccessibleName, ModalBaseProps } from './types.ts'

/** {@linkcode ModalBaseProps} plus an accessible name and the dialog's own content. */
export type ModalProps = ModalBaseProps & ModalAccessibleName & { children: ComponentChildren }

/** The object {@linkcode useModal} returns — imperative open/close control over the modal stack. */
export type ModalStackApi = {
  openModal: (props: Omit<ModalProps, 'open' | 'onClose'> & { onClose?: () => void }) => string
  closeModal: (id: string) => void
}

/** Named (not an anonymous arrow assigned to an object property) so `deno lint`'s own
 * `react-rules-of-hooks` recognizes this as a hook by its name — see `index.ts`'s own comment on
 * this exact line, and `ModalHooks`'s own doc, for why the cast inside is sound. */
function useContext(context: unknown): unknown {
  return usePreactContext(context as Parameters<typeof usePreactContext>[0])
}

const bound = createModal<VNode, ComponentChildren>(
  h as unknown as CreateElement<VNode>,
  {
    createContext,
    useContext,
    useCallback,
    useMemo,
    useEffect,
    useRef,
    useState,
    useFocusScope,
    useCloseOnOutside,
  },
  Fragment,
)

/**
 * A dialog — Preact binding, see `index.ts`'s own doc for the full behavioral contract
 * (declarative vs. `ModalProvider`/`useModal`, no portal, the accessible-name contract, backdrop
 * vs. outside-click, focus management, stacking, scroll lock) — not repeated here. Same contract,
 * same rendered behavior, real implementation shared with the React binding via `render.ts`'s own
 * `createModal` (hook injection — see that file's own doc for why that's sound, including why
 * `createContext`/`useContext` are typed loosely) — never `preact/compat` (the same reason this
 * binding has no portal — see `index.ts`'s own doc).
 */
export const Modal: (props: ModalProps) => VNode | null = bound.Modal

/**
 * Opt-in global mode — Preact binding, see `index.ts`'s own doc for the full contract. Plain
 * `useState` + `Context`, never Zustand.
 */
export const ModalProvider: (props: { children: ComponentChildren }) => VNode = bound.ModalProvider

/**
 * Reads the global open/close API {@linkcode ModalProvider} provides to descendants. Throws if
 * called outside one — same fail-fast contract as `useIntl()` outside an `<IntlProvider>`.
 */
export const useModal: () => ModalStackApi = bound.useModal
