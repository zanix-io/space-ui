import type { CreateElement } from 'typings/renderer.ts'
import { createAlert } from '../Alert/render.ts'
import { createButton } from '../Button/render.ts'
import { createModal } from '../Modal/render.ts'
import type { ModalHooks } from '../Modal/render.ts'
import { deriveStableCometId } from 'shared/stable-comet-id.ts'
import type { ConsentModalProps } from './types.ts'

/** Same hook bag {@linkcode createModal}'s own `ModalHooks` needs — `ConsentModal` owns no state of
 * its own (every real decision is a controlled prop), so it never calls any of these directly; they
 * only pass through to the `Modal` this component composes internally. See `Modal/render.ts`'s own
 * `ModalHooks` doc for the full soundness reasoning (call-order-keying, not repeated here). */
export type ConsentModalHooks = ModalHooks

/**
 * The real implementation of `ConsentModal`, shared identically between the React and Preact
 * bindings — same `render.ts`-factory technique {@linkcode createNavDrawer} already uses to compose
 * another already-hook-injected factory (`createModal`) rather than a plain stateless one. Composes
 * the real `Modal`/`Button`/`Alert` (each via its own `render.ts` factory, bound to the same `h`) —
 * inherits their own `data-space-ui` hooks on every element they render, never a redundant one of
 * its own.
 *
 * A generic accept/decline confirmation dialog — extracted from real, near-identical duplication:
 * two separate consumers (a cookie-consent dialog in each) independently built the exact same
 * `Modal` + `Button` markup shape, diverging only in the network/form logic around it. This
 * component owns none of that logic — no `fetch`, no DOM `<form>` interception, no state beyond
 * what the composed `Modal` already manages internally (focus trap, `Escape`, stacking) — every
 * real decision (`open`, whether `declinedAcknowledgement` is showing, `error`) is a plain
 * controlled prop, the same seam every other stateful component in this package keeps. It has no
 * notion of "cookies" or "consent" as a domain concept; the same shape fits any binary accept/
 * decline confirmation.
 *
 * ## Accessible name comes from `heading` itself, not a separate `label`
 *
 * `heading` is rendered as a real `<h2>` and wired as this dialog's accessible name via
 * `ariaLabelledBy`, never a separate `label` string — unlike `Modal`'s own two-way
 * `label`/`ariaLabelledBy` contract, this component's `heading` always renders real visible content,
 * so deriving the accessible name from it (rather than asking for a redundant second string) is
 * strictly more correct. The `<h2>`'s own `id` comes from {@linkcode deriveStableCometId}, never the
 * renderer's bare `useId()`: this component ships from the root barrel (zero `@zanix/space`
 * dependency), so it can end up composed inside some Comet's own isolated hydration root just as
 * easily as `Avatar`/`Menu`/`DatePicker`/`RangeSlider` already can — see that function's own doc for
 * the full hydration-mismatch mechanism. `heading`/`body`/`error` are opaque (`unknown`) content,
 * not guaranteed serializable, so the seed is built only from the plain string/boolean props instead
 * — the same accepted, narrow residual (two instances sharing an identical seed collide on id)
 * `Avatar`/`DatePicker`/`RangeSlider`'s own docs already accept for the overwhelmingly common case of
 * distinct instances.
 *
 * ## `declinedAcknowledgement`'s own PRESENCE, this render, is what shows it — no internal toggle
 *
 * This component owns no `declined` state of its own to derive anything from — whether the
 * acknowledgement view is showing right now is entirely a function of whether the caller passed
 * `declinedAcknowledgement` on THIS render, exactly like every other controlled prop here. The real
 * "clicking Decline shows this view" behavior comes from composing the two: a caller's own
 * `onDecline` handler sets its own `declined` state, and only passes `declinedAcknowledgement` once
 * that state is true — so the swap visibly happens on the very next render, without this component
 * ever tracking "was Decline clicked" itself. The dialog itself stays exactly as open as its own
 * `open` prop says throughout; this component never closes anything on its own initiative. Omit the
 * prop entirely (always, never conditionally) for a consumer that wants Decline to behave exactly
 * like Accept (call `onDecline`, decide whether/when to close from the outside) — both real
 * consumers this component was extracted from use one shape each (one closes immediately either
 * way, the other shows an acknowledgement step), confirming both are genuinely needed, not just one
 * guessed ahead of a real case.
 *
 * ## `error` composes the real `Alert`, never a raw `<p role="alert">`
 *
 * Same composition `Field/render.ts` already uses for its own error message — inherits `Alert`'s own
 * `data-space-ui="alert"` hook, `role="alert"`/`aria-live="assertive"` for free, rather than a
 * component-local reimplementation of the same thing.
 */
export function createConsentModal<E>(
  h: CreateElement<E>,
  hooks: ConsentModalHooks,
  Fragment: unknown,
): (props: ConsentModalProps) => E | null {
  const { Modal } = createModal<E, E>(h, hooks, Fragment)
  const Button = createButton(h)
  const Alert = createAlert(h)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function ConsentModal(props: ConsentModalProps): E | null {
    const {
      open,
      onClose,
      heading,
      body,
      onAccept,
      onDecline,
      acceptLabel = 'Accept',
      declineLabel = 'Decline',
      declinedAcknowledgement,
      error,
      nonce,
      className,
      closeOnEscape,
    } = props

    // Derived purely from already-identical-both-sides props (never render order/a counter/
    // `Math.random()`) — see this function's own doc, and `stable-comet-id.ts`'s own doc, for why
    // this can't be the renderer's bare `useId()` here.
    const seed = JSON.stringify({
      acceptLabel,
      declineLabel,
      hasAcknowledgement: !!declinedAcknowledgement,
      continueLabel: declinedAcknowledgement?.continueLabel,
    })
    const headingId = deriveStableCometId(seed, 'consent-modal-heading')

    const headingEl = h('h2', { key: 'heading', id: headingId }, heading)
    const bodyEl = h(
      'p',
      { key: 'body' },
      declinedAcknowledgement ? declinedAcknowledgement.body : body,
    )
    const errorEl = error ? hAny(Fragment, { key: 'error' }, Alert({ children: error })) : null

    const actionEls = declinedAcknowledgement
      ? [
        hAny(
          Fragment,
          { key: 'continue' },
          Button({
            onClick: declinedAcknowledgement.onContinue ?? onClose,
            children: declinedAcknowledgement.continueLabel ?? 'Continue',
          }),
        ),
      ]
      : [
        hAny(Fragment, { key: 'accept' }, Button({ onClick: onAccept, children: acceptLabel })),
        hAny(Fragment, { key: 'decline' }, Button({ onClick: onDecline, children: declineLabel })),
      ]

    return Modal({
      open,
      onClose,
      ariaLabelledBy: headingId,
      closeOnEscape,
      className,
      nonce,
      children: hAny(Fragment, null, [headingEl, bodyEl, errorEl, ...actionEls]),
    })
  }
}
