/**
 * Replaces the accept/decline choice once Decline has been chosen — see
 * {@linkcode ConsentModalProps.declinedAcknowledgement}'s own doc for the full contract.
 */
export type ConsentModalDeclinedAcknowledgement = {
  /** Replaces {@linkcode ConsentModalProps.body} while this acknowledgement is showing — typically
   * an explanation of what declining actually means. Opaque content, same `unknown` escape hatch
   * `Alert.children`/`Button.children` already use for arbitrary caller content — never
   * interpreted as markup or an i18n key by this component. */
  body: unknown
  /** @default 'Continue' */
  continueLabel?: string
  /** Called when the single action button in this view is pressed. Defaults to the modal's own
   * `onClose` when omitted — this view's own action is always dismissive, never a second
   * accept/decline choice. */
  onContinue?: () => void
}

/**
 * Props for {@linkcode ConsentModal}. See `render.ts`'s own doc for the full behavioral contract —
 * not repeated here.
 */
export type ConsentModalProps = {
  open: boolean
  /** Called by the close button, `Escape` (when `closeOnEscape`), or an outside click, exactly like
   * `Modal.onClose` — never called by this component for an Accept/Decline decision itself, only
   * for actually dismissing it. */
  onClose: () => void
  /** Rendered as this dialog's own visible `<h2>`, and used as its accessible name via
   * `aria-labelledby` — never a separate `label`/`ariaLabelledBy` prop, since this content already
   * is the accessible name. Opaque content (`unknown`), same escape hatch `Alert.children`/
   * `Button.children` already use. */
  heading: unknown
  /** Rendered as a `<p>` immediately below `heading` — replaced by
   * `declinedAcknowledgement.body` once Decline has been chosen (see that prop's own doc). */
  body: unknown
  onAccept: () => void
  onDecline: () => void
  /** @default 'Accept' */
  acceptLabel?: string
  /** @default 'Decline' */
  declineLabel?: string
  /**
   * Renders this acknowledgement view (in place of the accept/decline choice) whenever it's given
   * on the current render — `body` above is replaced by `declinedAcknowledgement.body`, and a
   * single `continueLabel` button (calling `onContinue`, default `onClose`) becomes the only
   * action. This component owns no `declined` state of its own: the "clicking Decline shows this
   * view" behavior comes from the caller's own `onDecline` handler setting its own state and only
   * passing this prop once that state says so — see `render.ts`'s own doc for the full contract.
   * Omit entirely (always, never conditionally) for a consumer that wants Decline to behave exactly
   * like Accept: this component always calls `onDecline` either way, and never decides on its own
   * whether/when declining actually closes the dialog — that stays the consumer's own `open` state,
   * same as every other controlled component here.
   */
  declinedAcknowledgement?: ConsentModalDeclinedAcknowledgement
  /** An optional inline alert row — composes the real `Alert` (`politeness: 'assertive'`), e.g. for
   * a network-failure message — rendered between `body`/`declinedAcknowledgement.body` and the
   * action buttons, only when present. */
  error?: unknown
  nonce?: string
  className?: string
  /** @default true */
  closeOnEscape?: boolean
}
