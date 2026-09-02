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
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.ts'
import { useFocusScope } from 'shared/focus-scope.ts'
import { createElementWithNonceHydrationFix } from 'shared/create-element-nonce-hydration-fix.ts'
import { createModal } from './render.ts'
import type { ModalAccessibleName, ModalBaseProps } from './types.ts'

/** {@linkcode ModalBaseProps} plus an accessible name and the dialog's own content. */
export type ModalProps = ModalBaseProps & ModalAccessibleName & { children: ReactNode }

/** The object {@linkcode useModal} returns — imperative open/close control over the modal stack. */
export type ModalStackApi = {
  openModal: (props: Omit<ModalProps, 'open' | 'onClose'> & { onClose?: () => void }) => string
  closeModal: (id: string) => void
}

/** Named (not an anonymous arrow assigned to an object property) so `deno lint`'s own
 * `react-rules-of-hooks` recognizes this as a hook by its name — see `ModalHooks`'s own doc for
 * why the cast inside is sound (the same reason the un-refactored code trusted `useContext`'s own
 * inferred type without a narrower annotation getting in the way). */
function useContext(context: unknown): unknown {
  return useReactContext(context as Parameters<typeof useReactContext>[0])
}

const bound = createModal<ReactElement, ReactNode>(
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
 * A dialog: `role="dialog"` + `aria-modal="true"`, a focus trap, `Escape`, an accessible close
 * button, and (with several open at once) correct stacking — all in this one component, reused
 * verbatim by both the declarative API below and {@linkcode ModalProvider}/{@linkcode useModal}.
 * Real implementation shared with the Preact binding via `render.ts`'s own `createModal` (see that
 * file's own doc for how — hook injection, including why `createContext`/`useContext` are typed
 * loosely); import from `@zanix/space-ui/preact` instead for the Preact one, same contract, same
 * rendered behavior.
 *
 * ## Declarative by default, global as an explicit opt-in
 *
 * ```tsx
 * <Modal open={isOpen} onClose={() => setIsOpen(false)} label="Delete account">...</Modal>
 * ```
 *
 * The component this rescues only ever worked one way: `openModal(...)` called imperatively from
 * anywhere, rendering into a Zustand-store-backed container mounted once at the app root — real
 * capability (trigger from an arbitrary depth, render decoupled from the caller), but it forced
 * every consumer into that model, and needed global state for something most callers don't
 * actually need (a modal's own visibility is ordinarily owned by whoever renders it, same as
 * `Counter`/`Menu`/`Slider`). Here, that's the OPT-IN model instead:
 *
 * ```tsx
 * <ModalProvider>
 *   <App />
 * </ModalProvider>
 * // anywhere inside:
 * const { openModal, closeModal } = useModal()
 * const id = openModal({ label: 'Delete account', children: <p>Are you sure?</p> })
 * ```
 *
 * `ModalProvider`/`useModal` add no RUNTIME cost at all unless actually mounted/called — an app
 * using only `<Modal open>` never pays for them at runtime: zero listeners, zero state, zero extra
 * render. Both models render the exact same `Modal`, so focus management/backdrop/`Escape`/
 * positioning/accessibility behave identically either way — nothing is duplicated between them.
 * Internally, `ModalProvider` is plain `useState` + `Context`, the same shape `IntlProvider`
 * already uses in this package — no Zustand, never assumed as a requirement just because the
 * component this rescues happened to use it.
 *
 * ## No portal — `position: fixed` + a high `z-index`, same as the component this rescues
 *
 * A real portal (`ReactDOM.createPortal`) is the more correct-by-construction way to guarantee a
 * dialog escapes an ancestor's `overflow`/`transform` clipping — but Preact CORE has no
 * `createPortal` at all; it only exists in `preact/compat`, which this package has never depended
 * on. Building one by hand for Preact is possible, but real, asymmetric complexity `Modal`'s React
 * binding wouldn't otherwise need. Without a real consumer demonstrating the CSS-clipping failure
 * mode matters in practice, `position: fixed` (which the component this rescues already used,
 * successfully) is the simpler default. Revisit if that changes.
 *
 * ## Accessible name: required by the type, not enforced by a throw
 *
 * {@linkcode ModalAccessibleName} makes "at least one of `label`/`ariaLabelledBy`" a compile
 * error to skip for typed callers. For anyone else, this component logs a `logger.warn` (via
 * this package's own `shared/client-logger.ts`, marked `'noSave'` — never `@zanix/utils/logger`
 * directly; see that shared module's own doc) rather than throwing — a missing accessible name is
 * a real accessibility gap to catch in development and tests, not a structural misuse: a
 * mislabeled dialog still opens, still traps focus, still closes correctly.
 *
 * ## Backdrop and outside-click are the same decision, not two
 *
 * `showOverlay` (default `true`) does two things at once: renders a dimmed backdrop, AND never
 * closes on an outside click (the backdrop itself absorbs it). `showOverlay={false}` renders no
 * backdrop and DOES close on an outside click — reusing {@linkcode useCloseOnOutside} verbatim,
 * the same small hook `Menu`'s own submenu disclosure already uses. No separate
 * `closeOnOutsideClick` prop: it would just be a second way to express a rule `showOverlay`
 * already determines.
 *
 * ## `nonce`, for a nonce-based `style-src` CSP
 *
 * This component positions itself (`position`/`z-index`, both the backdrop's and the dialog's own
 * per-`position` anchor) via a self-rendered `<style nonce={nonce}>` element (never an inline
 * `style` attribute, which a nonce-based CSP — e.g. `@zanix/space`'s own zero-config default —
 * blocks unconditionally, since a nonce never applies to a `style="..."` attribute, only to a
 * `<style>` element). Pass the request's real nonce as `<Modal nonce={nonce}>` (or in an
 * `openModal({ nonce, ... })` call) when running under such a CSP; omit it otherwise.
 *
 * A browser clears an applied `nonce` attribute back to `""` right after using it (real, spec'd
 * behavior — the true value survives only on the element's own `.nonce` property); React's
 * hydration check doesn't special-case this for `<style>` the way it does for `<script>`, so this
 * component's React binding renders its `<style nonce>` via
 * `shared/create-element-nonce-hydration-fix.ts` — suppresses the resulting cosmetic hydration
 * mismatch warning without touching `render.ts`'s own Preact-shared markup (see that file's own doc
 * for the full reasoning, including why Preact needs no equivalent).
 *
 * ## Close button content
 *
 * The close button always renders — an inline "X" `<svg>` by default (see
 * `shared/close-button-icon.ts`'s own doc for why it's a real inline SVG, not a Unicode character
 * or a bundled `CatalogIcon` call: the sprite `CatalogIcon` needs is a scaffolded, consumer-chosen
 * template asset this component has no `href` for). `closeButtonContent` overrides it with any
 * renderer node — a `CatalogIcon`, a plain `<svg>`, plain text — for a consumer who already has an
 * icon system set up; the button's own accessible name (`aria-label="Close"`) never changes either
 * way.
 *
 * ## Focus management
 *
 * On open: the currently-focused element is captured, then focus moves to the dialog's first real
 * *content* focusable — deliberately skipping the dialog's own close button as the initial target,
 * since auto-focusing a dismissive control risks an accidental close from a reflexive Enter/Space.
 * While open, `Tab`/`Shift+Tab` cycle only among the dialog's own focusable descendants. On close
 * (or unmount while still open), focus returns to whatever was captured — but only if this
 * instance was the topmost open modal at that moment.
 *
 * ## Stacking — {@linkcode isTopOverlay}/{@linkcode registerOverlay}, a small module, not a store
 *
 * Only the topmost open modal should trap `Tab` or react to `Escape`; the page's scroll stays
 * locked for as long as ANY modal is open, restored to its exact prior value only once the last
 * one closes. `shared/overlay-stack.ts`'s own doc covers the full mechanism — extracted once
 * `Drawer` became a second real consumer needing the exact same coordination.
 *
 * ## Scroll lock
 *
 * `document.body.style.overflow` is set to `'hidden'` while any modal is open, restored to its
 * real prior value once the last one closes.
 *
 * ## Deliberately not attempted: making the rest of the page `inert`
 *
 * The focus trap already prevents a keyboard user from reaching background content. Marking that
 * background genuinely `inert` would need knowing which DOM subtree IS "the rest of the app" —
 * this package has no visibility into a consumer's own root. Left for a future app-shell-level
 * integration, if one appears.
 */
export const Modal: (props: ModalProps) => ReactElement | null = bound.Modal

/**
 * Opt-in global mode — see {@linkcode Modal}'s own doc for the full contract. Mount once, high in
 * the tree; adds no behavior at all beyond providing {@linkcode useModal} to descendants. Plain
 * `useState` + `Context`, same shape as `IntlProvider` — never Zustand, never assumed as a
 * requirement just because the component this rescues used it for the same problem.
 */
export const ModalProvider: (props: { children: ReactNode }) => ReactElement = bound.ModalProvider

/**
 * Reads the global open/close API {@linkcode ModalProvider} provides to descendants. Throws if
 * called outside one — same fail-fast contract as `useIntl()` outside an `<IntlProvider>` (unlike
 * a missing accessible name, calling this hook with no provider mounted IS a structural misuse:
 * there's no state for it to read at all).
 */
export const useModal: () => ModalStackApi = bound.useModal
