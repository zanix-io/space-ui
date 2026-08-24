import type { CaptchaWidgetSize } from 'shared/captcha-types.ts'

/**
 * Props for {@linkcode Recaptcha}. See `index.ts`'s own doc for the full contract — checkbox
 * (`'normal'`/`'compact'`), invisible (`size: 'invisible'`), and score-based v3 (`action`) modes,
 * `verifyTrigger`/`resetTrigger`, and the CSP gotcha every `@zanix/space` consumer needs to know.
 */
export type RecaptchaProps = {
  /** Google reCAPTCHA site key (created in the reCAPTCHA admin console) — required. Not resolved,
   * translated, or otherwise processed by this component; pass the real value straight through, the
   * same "already-resolved data" seam every component in this package keeps. */
  siteKey: string
  /**
   * Fires with the real verification token once the challenge resolves — checkbox click, invisible
   * `verifyTrigger`-driven `execute()`, or v3's own `execute()`. A plain callback, the same
   * DOM-event-shaped idiom `IFrame.onLoad`/`Video.onError` already use — never a ref. What happens
   * to the token next (a fetch header, a hidden form field, anything else) is entirely the caller's
   * own decision; this component's own responsibility ends here. See `index.ts`'s own `@example`
   * for one real way to transport it to a `captchaGuard`-protected endpoint in `@zanix/auth`.
   */
  onVerify: (token: string) => void
  /**
   * Selects the v2 rendering mode — a visible checkbox (`'normal'`, the default, or `'compact'`) or
   * an invisible widget (`'invisible'`) driven entirely by {@linkcode verifyTrigger}. Ignored when
   * {@linkcode action} is given (v3 has no checkbox/visible-widget concept at all — see `action`'s
   * own doc).
   */
  size?: CaptchaWidgetSize
  /**
   * reCAPTCHA v3 action name (e.g. `'login'`, `'signup'`) — REQUIRED by Google to select v3 mode at
   * all, used for per-action risk scoring on the verification side. Presence of this prop is what
   * switches this component into v3 mode: no checkbox, no visible widget of any kind (Google renders
   * its own fixed badge instead — see `index.ts`'s own doc for why this component doesn't try to
   * suppress or reposition it), and {@linkcode size} is ignored entirely. `HCaptcha`/`Turnstile` have
   * no equivalent prop — neither provider has a v3-style pure-scoring mode, so it isn't offered on
   * either of those two components.
   */
  action?: string
  /**
   * Controlled prop: change this (e.g. increment a counter, or swap in a new string) to request an
   * explicit re-verification — the real `execute()` call this needs for `size: 'invisible'` or v3
   * (`action` given), where no checkbox exists for the user to click. Has no effect while the script
   * hasn't finished loading yet. See `index.ts`'s own `@example` for a real "verify right before
   * submit" usage.
   */
  verifyTrigger?: number | string
  /**
   * Controlled prop: change this to force the widget's own `.reset()` — the real way to let a user
   * retry after a server-side rejection (a v2 checkbox otherwise stays permanently "checked" even
   * after its token is rejected). No effect in v3 mode (`action` given): v3 has no persistent
   * widget/session to reset — every {@linkcode verifyTrigger} change already produces a fresh token.
   */
  resetTrigger?: number | string
  /** Fires when a previously-verified token expires (the real `expired-callback` every provider's
   * SDK exposes for this) — the caller's cue to prompt for re-verification, typically by bumping
   * {@linkcode verifyTrigger} or asking the user to re-check the box. */
  onExpire?: () => void
  /**
   * Fires for either of two genuinely separate error sources, both real, never one standing in for
   * the other: (1) the provider's own SDK `error-callback` (fires with no arguments per Google's own
   * documented contract — an `Error` with a generic message is constructed here since the SDK itself
   * gives no detail to forward), and (2) the `<script>` tag itself failing to load — a real network
   * failure, or a Content-Security-Policy blocking it, indistinguishable from each other at the
   * script-element level (see `index.ts`'s own CSP section) but always distinguishable from case (1)
   * by content: a load failure's message names the script `src` and points at `script-src`/
   * `frame-src`.
   */
  onError?: (error: unknown) => void
  /**
   * Overrides the default script URL this component computes from {@linkcode siteKey}/
   * {@linkcode action} (`https://www.google.com/recaptcha/api.js?render=explicit` for v2,
   * `?render=<siteKey>` for v3) — an escape hatch, not something most consumers need. Real reasons
   * to reach for it: a self-hosted/proxied mirror of Google's script (data-residency or
   * ad-blocker-robustness requirements some deployments have), reCAPTCHA ENTERPRISE's own real,
   * different endpoint (`https://www.google.com/recaptcha/enterprise.js` — a mode this component
   * doesn't otherwise support), or swapping in a test double during automated testing. Given
   * verbatim to the injected `<script src>` — this component does NOT append `?render=...` on top
   * of a custom value, so an override still needs to encode the same v2-explicit-vs-v3-sitekey
   * distinction itself if it wants both modes to keep working; get this wrong and the provider's
   * own SDK — not this component — is what breaks. Two different `siteKey`s that happen to share
   * one custom `scriptSrc` still share the same underlying `<script>` injection (dedup is keyed on
   * the resolved URL, same as the default — see `shared/script-loader-dom.ts`'s own doc).
   */
  scriptSrc?: string
  /** DOM `id` for the widget's own container element. */
  id?: string
  className?: string
}
