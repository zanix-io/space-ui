import {
  createContext,
  Fragment,
  useCallback,
  useContext as useReactContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.ts'
import { useFocusScope } from 'shared/focus-scope.ts'
import { createElementWithNonceHydrationFix } from 'shared/create-element-nonce-hydration-fix.ts'
import { createConsentModal } from './render.ts'
import type { ConsentModalProps } from './types.ts'

export type { ConsentModalDeclinedAcknowledgement, ConsentModalProps } from './types.ts'

/** Named (not an anonymous arrow assigned to an object property) so `deno lint`'s own
 * `react-rules-of-hooks` recognizes this as a hook by its name — see `Modal/index.ts`'s own comment
 * on this exact line for the full reasoning (identical here, since this component composes `Modal`
 * internally with the same hook bag). */
function useContext(context: unknown): unknown {
  return useReactContext(context as Parameters<typeof useReactContext>[0])
}

const bound = createConsentModal<ReactElement>(
  createElementWithNonceHydrationFix as unknown as CreateElement<ReactElement>,
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
 * A generic accept/decline confirmation dialog, built entirely from this package's own `Modal` +
 * `Button` (plus `Alert` for the optional `error` row) — no new primitive, no state beyond what the
 * composed `Modal` already manages internally. See `render.ts`'s own doc for the full contract
 * (accessible name, `declinedAcknowledgement`, the `error` row). Real implementation shared with the
 * Preact binding via `render.ts`'s own `createConsentModal`; import from `@zanix/space-ui/preact`
 * instead for the Preact one, same contract, same rendered behavior.
 *
 * Extracted from real, near-identical duplication: two separate consumer apps each built their own
 * cookie-consent dialog composed entirely from `Modal`/`Button`, diverging only in the network/form
 * logic around it — this component is the shared presentational shell, generic over any binary
 * accept/decline confirmation, not a "cookie consent" domain concept. All state/effects/network
 * logic (a `fetch` call, a `<form>` submit interception, anything else project-specific) stays
 * entirely the caller's own.
 *
 * @example
 * ```tsx
 * <ConsentModal
 *   open={open}
 *   onClose={() => decide(false)}
 *   heading="Session cookie"
 *   body="This service needs to store one cookie in your browser to keep you signed in."
 *   onAccept={() => decide(true)}
 *   onDecline={() => decide(false)}
 *   error={requestFailed ? 'Something went wrong recording your choice. Please try again.' : undefined}
 * />
 * ```
 */
export const ConsentModal: (props: ConsentModalProps) => ReactElement | null = bound
