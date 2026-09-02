import { createContext, Fragment, h } from 'preact'
import type { ComponentChildren, VNode } from 'preact'
import {
  useCallback,
  useContext as usePreactContext,
  useEffect,
  useMemo,
  useState,
} from 'preact/hooks'
import type { CreateElement } from 'typings/renderer.ts'
import { createToast } from './render.ts'
import type { ToastMessage, ToastPosition } from './types.ts'

/** The object {@linkcode useToast} returns — imperative show/close control over toast messages. */
export type ToastApi = {
  showToast: (message: ToastMessage) => string
  closeToast: (id: string) => void
}

/** Named (not an anonymous arrow assigned to an object property) so `deno lint`'s own
 * `react-rules-of-hooks` recognizes this as a hook by its name — see `Modal/index.ts`'s own
 * comment on this exact line for the full reasoning (identical here). */
function useContext(context: unknown): unknown {
  return usePreactContext(context as Parameters<typeof usePreactContext>[0])
}

const bound = createToast<VNode, ComponentChildren>(
  h as unknown as CreateElement<VNode>,
  { createContext, useContext, useCallback, useMemo, useEffect, useState },
  Fragment,
)

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (imperative-only, `position`
 * moved to `ToastProvider`, the `Alert` composition, the legacy `setTimeout`/`clearInterval` bug
 * NOT replicated, why `'custom'` variant was dropped, always-present close button + upsert-by-`id`
 * semantics) — not repeated here. Same contract, same rendered behavior, real implementation
 * shared with the React binding via `render.ts`'s own `createToast` (hook injection — see that
 * file's own doc for why that's sound) — never `preact/compat`.
 */
export const ToastProvider: (
  props: { position?: ToastPosition; nonce?: string; children: ComponentChildren },
) => VNode = bound.ToastProvider

/**
 * Reads the `showToast`/`closeToast` API {@linkcode ToastProvider} provides to descendants. Throws
 * if called outside one — same fail-fast contract `useModal()`/`useIntl()` already have.
 */
export const useToast: () => ToastApi = bound.useToast
