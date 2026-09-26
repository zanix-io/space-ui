import { createContext, Fragment, h } from 'preact'
import type { VNode } from 'preact'
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
import { createConsentModal } from './render.ts'
import type { ConsentModalProps } from './types.ts'

export type { ConsentModalDeclinedAcknowledgement, ConsentModalProps } from './types.ts'

/** Named (not an anonymous arrow assigned to an object property) so `deno lint`'s own
 * `react-rules-of-hooks` recognizes this as a hook by its name — see `index.ts`'s own comment on
 * this exact line, and `ConsentModalHooks`'s own doc, for why the cast inside is sound. */
function useContext(context: unknown): unknown {
  return usePreactContext(context as Parameters<typeof usePreactContext>[0])
}

const bound = createConsentModal<VNode>(
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
 * A generic accept/decline confirmation dialog — Preact binding, see `index.ts`'s own doc for the
 * full behavioral contract (accessible name, `declinedAcknowledgement`, the `error` row). Same
 * contract, same rendered behavior, real implementation shared with the React binding via
 * `render.ts`'s own `createConsentModal`.
 */
export const ConsentModal: (props: ConsentModalProps) => VNode | null = bound
